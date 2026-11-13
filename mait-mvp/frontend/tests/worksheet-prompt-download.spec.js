import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { isolateWorksheet, chooseCourse, briefField } from './worksheet-support';

test.beforeEach(async ({ page }) => { await isolateWorksheet(page); });

test('downloaded prompt matches the preview even when clipboard access is unavailable', async ({ page }) => {
  await chooseCourse(page, 'Year 12', 'Mathematics Advanced');
  await briefField(page).fill('Synthetic α brief\nKeep the second line.');
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    document.execCommand = () => false;
  });
  await page.getByRole('button', { name: 'Preview the prompt', exact: true }).click();
  const prompt = await page.getByLabel('Exact prompt').inputValue();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download prompt', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/^mait-worksheet-prompt\.txt$/);
  expect(await readFile(await download.path(), 'utf8')).toBe(prompt);
  expect(await page.evaluate(() => window.__worksheetOpens)).toEqual([]);
});
