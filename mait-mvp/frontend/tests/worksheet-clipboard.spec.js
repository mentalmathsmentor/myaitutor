import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { chooseCourse, briefField } from './worksheet-support';

const preview = page => page.getByRole('button', { name: 'Preview the prompt', exact: true });

// Uses the browser's real clipboard, so this spec must not load the fake one in isolateWorksheet.
test.beforeEach(async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1:4173') return route.abort();
    if (/^\/(api|auth|visit|subscribe|query|context|history|reset|keystroke)/.test(url.pathname)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    return route.continue();
  });
  await page.goto('/worksheets');
});

test('full instructions are the default; saved-instructions mode copies only the short request', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await chooseCourse(page, 'Year 12', 'English'); await briefField(page).fill('Synthetic reading task');
  await preview(page).click();
  const dialog = page.getByRole('dialog');
  const field = page.getByLabel('Exact prompt');
  const full = await field.inputValue();
  expect(full).toContain('Synthetic reading task');
  expect(full).toContain('## LaTeX rules');
  await page.getByRole('button', { name: 'Copy prompt', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Prompt copied. Next: paste it into your AI, then send.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(full);

  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download SKILL.md', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('SKILL.md');
  const skill = await readFile(await download.path(), 'utf8');
  expect(skill).toMatch(/^---\nname: mait-worksheet\n/);
  expect(full.startsWith(skill.replace(/^---\n[\s\S]*?\n---\n+/, '').trim())).toBe(true);

  await page.getByRole('radio', { name: /Saved instructions installed/ }).check();
  await expect(dialog.getByRole('status')).toHaveCount(0);
  const short = await field.inputValue();
  expect(short).toContain('Synthetic reading task');
  expect(short).not.toContain('## LaTeX rules');
  expect(full.endsWith(short)).toBe(true);
  await page.getByRole('button', { name: 'Copy prompt', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Prompt copied. Next: open the destination with saved instructions, paste into its message box, then send.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(short);

  await page.getByRole('radio', { name: /Full instructions for any AI/ }).check();
  await expect(field).toHaveValue(full);
  await expect(page.getByRole('button', { name: 'Download SKILL.md', exact: true })).toBeVisible();
});
