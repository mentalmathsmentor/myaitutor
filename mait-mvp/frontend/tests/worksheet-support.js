import { expect } from '@playwright/test';

export const contextNames = { Off: 'AI general knowledge', Provide: "I'll upload the syllabus", Search: 'Ask Gemini to search NESA' };
export const briefField = page => page.getByLabel('Additional Brief / Custom Questions', { exact: true });
export async function isolateWorksheet(page) {
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1:4173') return route.abort();
    if (/^\/(api|auth|visit|subscribe|query|context|history|reset|keystroke)/.test(url.pathname)) return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    return route.continue();
  });
  await page.addInitScript(() => {
    window.__worksheetCopies = [];
    window.__worksheetOpens = [];
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => window.__worksheetCopies.push(text) } });
    window.open = (...args) => { window.__worksheetOpens.push(args); return null; };
  });
  await page.goto('/worksheets');
}
export async function chooseCourse(page, stage, subject) {
  await page.getByRole('button', { name: 'Curriculum', exact: true }).click();
  await page.getByRole('button', { name: stage, exact: true }).click();
  await page.getByRole('button', { name: subject === 'Other' ? 'Other (Custom)' : subject, exact: true }).click();
  if (subject === 'Other') await page.getByPlaceholder('Enter custom subject name...').fill('  Custom test subject α  ');
  await page.getByRole('button', { name: 'Topics', exact: true }).click();
  await expect(briefField(page)).toBeVisible();
}
export async function copyPrompt(page) {
  const count = await page.evaluate(() => window.__worksheetCopies.length);
  await page.getByRole('button', { name: 'Generate Instructions & Preview Prompt', exact: true }).click();
  await page.getByRole('button', { name: 'Copy prompt', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__worksheetCopies.length)).toBe(count + 1);
  const prompt = await page.evaluate(() => window.__worksheetCopies.at(-1));
  await expect(page.getByRole('heading', { name: 'Instructions ready', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('heading', { name: 'Instructions ready', exact: true })).toBeHidden();
  return prompt;
}
