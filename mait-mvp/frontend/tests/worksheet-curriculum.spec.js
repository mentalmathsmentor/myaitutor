import { test, expect } from '@playwright/test';
import { isolateWorksheet, chooseCourse, copyPrompt } from './worksheet-support';

test.beforeEach(async ({ page }) => { await isolateWorksheet(page); });
const cases = [
  ['Stage 1 (Yr 1-2)', 'Talking about possible and likely events — Part B', 'MA1-CHAN-01', 'fa8fa9fb8a'],
  ['Stage 2 (Yr 3-4)', 'Addition, subtraction and missing values — Part A', 'MA2-AR-01', 'fa361e2379'],
  ['Stage 3 (Yr 5-6)', 'Mass conversions and elapsed-time problems — Part B', 'MA3-NSM-02', 'faebab48ca'],
  ['Stage 4 (Yr 7-8)', 'Working with positive and negative integers', 'MA4-INT-C-01', 'fa783c951a'],
  ['Stage 5 (Yr 9-10)', 'Conditional chance with tables and Venn diagrams — Path', 'MA5-PRO-P-01', 'fa45bd1262'],
];
for (const [stage, label, code, focusId] of cases) {
  test(`${stage}: original topic and source reference survive selection, reload and copy`, async ({ page }) => {
    await chooseCourse(page, stage, 'Mathematics');
    await expect(page.getByText('These are broad topic choices', { exact: false })).toBeVisible();
    await page.getByRole('textbox', { name: 'Find a topic or syllabus point' }).fill(label);
    await page.getByRole('checkbox', { name: label, exact: true }).first().check();
    await page.reload();
    await page.getByRole('button', { name: 'Topics', exact: true }).click();
    const prompt = await copyPrompt(page);
    expect(prompt).toContain(`- **Course:** ${stage}`);
    expect(prompt).toContain('- **Subject:** Mathematics');
    expect(prompt).toContain(label);
    expect(prompt).toContain(code);
    expect(prompt).toContain(`/content/stage-${stage[6]}/${focusId}`);
    expect(prompt).toContain('original topic summaries');
    if (stage.startsWith('Stage 4')) expect(prompt).not.toContain('MA5-');
    if (stage.startsWith('Stage 5')) expect(prompt).toContain('do not treat them as required Core content');
  });

  test(`${stage}: Search preserves the subject, selected outcome and source reference`, async ({ page }) => {
    await chooseCourse(page, stage, 'Mathematics');
    await page.getByRole('textbox', { name: 'Find a topic or syllabus point' }).fill(label);
    await page.getByRole('checkbox', { name: label, exact: true }).first().check();
    await page.getByRole('button', { name: 'Pedagogy', exact: true }).click();
    await page.getByRole('button', { name: 'Ask Gemini to search NESA', exact: true }).click();
    const prompt = await copyPrompt(page);
    expect(prompt).toContain(`- **Course:** ${stage}`);
    expect(prompt).toContain('- **Subject:** Mathematics');
    expect(prompt).toContain(`Consult official NESA sources for ${stage} Mathematics`);
    expect(prompt).toContain(label);
    expect(prompt).toContain(code);
    expect(prompt).toContain(`/content/stage-${stage[6]}/${focusId}`);
  });
}

test('primary A and B are separate selections; clearing one removes only its source', async ({ page }) => {
  await chooseCourse(page, 'Stage 1 (Yr 1-2)', 'Mathematics');
  await page.getByRole('textbox', { name: 'Find a topic or syllabus point' }).fill('Talking about possible');
  const a = page.getByRole('checkbox', { name: 'Talking about possible and likely events — Part A', exact: true }).first();
  const b = page.getByRole('checkbox', { name: 'Talking about possible and likely events — Part B', exact: true }).first();
  await a.check(); await b.check();
  let prompt = await copyPrompt(page);
  expect(prompt).toContain('fa2008eee7'); expect(prompt).toContain('fa8fa9fb8a');
  await a.uncheck(); prompt = await copyPrompt(page);
  expect(prompt).not.toContain('fa2008eee7'); expect(prompt).toContain('fa8fa9fb8a');
});
