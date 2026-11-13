import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { chooseCourse, briefField } from './worksheet-support';

const preview = page => page.getByRole('button', { name: 'Generate Instructions & Preview Prompt', exact: true });

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

test('custom destination copies only the short request; any AI adds the instructions', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await chooseCourse(page, 'Year 12', 'English'); await briefField(page).fill('Synthetic reading task');
  await preview(page).click();
  const dialog = page.getByRole('dialog');
  const field = page.getByLabel('Exact prompt');
  const short = await field.inputValue();
  expect(short).toContain('Synthetic reading task');
  expect(short).not.toContain('## LaTeX rules');
  await page.getByRole('button', { name: 'Copy prompt', exact: true }).click();
  await expect(dialog.getByRole('status')).toContainText('Prompt copied');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(short);

  await page.getByRole('radio', { name: /Any other AI/ }).check();
  await expect(dialog.getByRole('status')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Open worksheet Gem', exact: true })).toHaveCount(0);
  const full = await field.inputValue();
  expect(full).toContain('## LaTeX rules');
  expect(full.endsWith(short)).toBe(true);
  await page.getByRole('button', { name: 'Copy prompt', exact: true }).click();
  await expect(dialog.getByRole('status')).toHaveText('Prompt copied. Next: paste it into your AI, then send.');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(full);

  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download instructions', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('SKILL.md');
  const skill = await readFile(await download.path(), 'utf8');
  expect(skill).toMatch(/^---\nname: mait-worksheet\n/);
  expect(full.startsWith(skill.replace(/^---\n[\s\S]*?\n---\n+/, '').trim())).toBe(true);

  await page.getByRole('radio', { name: /Worksheet Gem or custom GPT/ }).check();
  await expect(field).toHaveValue(short);
  await expect(page.getByRole('button', { name: 'Open worksheet Gem', exact: true })).toBeVisible();
});
