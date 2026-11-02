import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { isolateWorksheet, chooseCourse, briefField, copyPrompt } from './worksheet-support';

const preview = page => page.getByRole('button', { name: 'Generate Instructions & Preview Prompt', exact: true });
const syllabus = JSON.parse(readFileSync(new URL('../src/syllabus_data.json', import.meta.url), 'utf8'));
const firstTopic = tree => Array.isArray(tree) ? tree[0] : firstTopic(Object.values(tree)[0]);
test.beforeEach(async ({ page }) => { await isolateWorksheet(page); });

test('preview is selectable, equals copied text, traps focus and never launches on a timer or Enter', async ({ page }) => {
  await chooseCourse(page, 'Year 12', 'Mathematics Advanced');
  await briefField(page).fill('Synthetic α brief\nPreserve both lines.');
  await preview(page).click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('list', { name: 'Use your worksheet instructions' })).toContainText('Paste into its message box');
  await expect(dialog).toContainText('Opening it does not paste or send the instructions for you.');
  expect(await page.evaluate(() => window.__worksheetCopies)).toEqual([]);
  const field = page.getByLabel('Exact prompt'); const prompt = await field.inputValue();
  await field.click(); await field.press('ControlOrMeta+a');
  expect(await field.evaluate(el => el.selectionEnd - el.selectionStart)).toBe(prompt.length);
  await field.press('Enter');
  await page.waitForTimeout(3200);
  expect(await page.evaluate(() => window.__worksheetOpens)).toEqual([]);
  await page.getByRole('button', { name: 'Copy prompt', exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__worksheetCopies)).toEqual([prompt]);
  for (let i = 0; i < 8; i++) {
    await page.keyboard.press('Tab');
    expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true);
  }
  await page.getByRole('button', { name: 'Open worksheet Gem', exact: true }).click();
  expect(await page.evaluate(() => window.__worksheetOpens.length)).toBe(1);
  await page.keyboard.press('Escape'); await expect(dialog).toBeHidden();
  await expect(preview(page)).toBeFocused();
  await briefField(page).fill('Changed synthetic brief');
  expect(await copyPrompt(page)).toContain('Changed synthetic brief');
  expect(await page.evaluate(() => window.__worksheetOpens.length)).toBe(1);
});

for (const mode of ['denied', 'missing-success', 'missing-failure']) {
  test(`clipboard ${mode} preserves the exact preview without a popup`, async ({ page }) => {
    await chooseCourse(page, 'Year 12', 'English'); await briefField(page).fill('Synthetic reading task');
    await page.evaluate(mode => {
      if (mode === 'denied') Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Permission denied'); } } });
      else {
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
        document.execCommand = () => { window.__fallbackText = document.activeElement.value; return mode === 'missing-success'; };
      }
    }, mode);
    await preview(page).click(); const text = await page.getByLabel('Exact prompt').inputValue();
    await page.getByRole('button', { name: 'Copy prompt', exact: true }).click();
    if (mode === 'missing-success') {
      await expect(page.getByRole('dialog').getByRole('status')).toHaveText('Prompt copied. Next: open your Gem or GPT, paste into its message box, then send.');
      expect(await page.evaluate(() => window.__fallbackText)).toBe(text);
    } else await expect(page.getByRole('alert')).toContainText('Could not copy');
    await expect(page.getByLabel('Exact prompt')).toHaveValue(text);
    expect(await page.evaluate(() => window.__worksheetOpens)).toEqual([]);
    expect(await page.locator('textarea').evaluateAll(fields => fields.every(el => el.style.left !== '-9999px'))).toBe(true);
  });
}

for (const [stage, subject] of [['Stage 2 (Yr 3-4)', 'Science'], ['Stage 4 (Yr 7-8)', 'Science'], ['Year 12', 'Mathematics Standard']]) {
  test(`${stage} / ${subject} flat topic survives reload and reaches the prompt`, async ({ page }) => {
    await chooseCourse(page, stage, subject);
    const first = page.getByRole('checkbox').first(); const label = await first.evaluate(el => el.closest('label').textContent.trim());
    await first.check(); await page.reload(); await page.getByRole('button', { name: 'Topics', exact: true }).click();
    await expect(page.getByRole('checkbox').first()).toBeChecked();
    expect(await copyPrompt(page)).toContain(label);
  });
}

test('course switch clears hidden maths selections while custom subject and brief survive reload', async ({ page }) => {
  await chooseCourse(page, 'Year 11', 'Mathematics Advanced'); await page.getByRole('checkbox').first().check();
  await chooseCourse(page, 'Year 11', 'Physics'); await expect(page.getByRole('checkbox')).toHaveCount(0);
  await briefField(page).fill('Synthetic physics brief'); const prompt = await copyPrompt(page);
  expect(prompt).not.toContain('**Selected topics:**'); expect(prompt).toContain('**Subject:** Physics');
  await chooseCourse(page, 'Year 11', 'Other'); await page.reload();
  await expect(page.getByLabel('Custom subject name')).toHaveValue('  Custom test subject α  ');
  await page.getByRole('button', { name: 'Topics', exact: true }).click(); await expect(briefField(page)).toHaveValue('Synthetic physics brief');
});

for (const [stage, subject, source] of [
  ['Year 11', 'Mathematics Advanced', 'Year 11 Advanced'],
  ['Year 12', 'Mathematics Extension 2', 'Year 12 Extension 2'],
]) {
  test(`${stage} / ${subject} hierarchical topics survive reload and reach the copied prompt`, async ({ page }) => {
    await chooseCourse(page, stage, subject);
    await page.getByRole('checkbox').first().check();
    await page.reload();
    await page.getByRole('button', { name: 'Topics', exact: true }).click();
    await expect(page.getByRole('checkbox').first()).toBeChecked();
    const prompt = await copyPrompt(page);
    expect(prompt).toContain(`- **Subject:** ${subject}`);
    expect(prompt).toContain(firstTopic(syllabus[source]).label);
    expect(prompt).toContain('**Selected topics:**');
  });
}

test('denied browser storage leaves editing and handoff usable', async ({ page }) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('Read denied'); };
    Storage.prototype.setItem = () => { throw new Error('Write denied'); };
  });
  await page.reload(); await chooseCourse(page, 'Year 12', 'English'); await briefField(page).fill('Unsaved synthetic brief');
  await expect(page.getByRole('status')).toContainText('saving is paused');
  expect(await copyPrompt(page)).toContain('Unsaved synthetic brief');
});

test('narrow prompt preview remains readable and controls fit', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await chooseCourse(page, 'Year 12', 'English'); await briefField(page).fill('Synthetic reading questions'); await preview(page).click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.getByRole('button', { name: 'Copy prompt', exact: true }).scrollIntoViewIfNeeded();
  await expect(page.getByRole('button', { name: 'Open worksheet Gem', exact: true })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('prompt-preview-narrow.png') });
});

for (const malformed of ['field', 'course metadata']) {
test(`malformed new draft ${malformed} preserves the unread draft and allows copying recovered text`, async ({ page }) => {
  const unread = JSON.stringify({ version: 2, courseKey: malformed === 'course metadata' ? null : '["Year 12","English"]', values: { selectedStage: 'Year 12', selectedSubject: 'English', rawQuestions: malformed === 'field' ? { text: 'Unread synthetic draft' } : 'Unread synthetic brief' } });
  await page.addInitScript(unread => {
    localStorage.setItem('mait_ws_draft_v2', unread);
    localStorage.setItem('mait_ws_stage', 'Year 12');
    localStorage.setItem('mait_ws_subject', 'English');
    localStorage.setItem('mait_ws_rawQuestions', 'Recoverable synthetic brief');
  }, unread);
  await page.reload();
  await expect(page.getByRole('status')).toContainText('saving is paused');
  await page.getByRole('button', { name: 'Topics', exact: true }).click();
  await expect(briefField(page)).toHaveValue('Recoverable synthetic brief');
  await briefField(page).fill('Edited recovered synthetic brief');
  expect(await copyPrompt(page)).toContain('Edited recovered synthetic brief');
  expect(await page.evaluate(() => localStorage.getItem('mait_ws_draft_v2'))).toBe(unread);
});
}
