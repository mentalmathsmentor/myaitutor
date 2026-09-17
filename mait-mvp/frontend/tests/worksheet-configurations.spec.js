import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { isolateWorksheet, chooseCourse, briefField, copyPrompt, contextNames } from './worksheet-support';

const stages = JSON.parse(readFileSync(new URL('../src/stage_subjects.json', import.meta.url), 'utf8'));
test.beforeEach(async ({ page }) => { await isolateWorksheet(page); });

for (const [stage, subjects] of Object.entries(stages)) {
  for (const subject of [...Object.keys(subjects), 'Other']) {
    test(`manual brief: ${stage} / ${subject}, all context modes and resources`, async ({ page }) => {
      await chooseCourse(page, stage, subject);
      await briefField(page).fill('Synthetic original question brief — α.\nKeep this second line.');
      await page.getByRole('button', { name: 'Pedagogy', exact: true }).click();
      for (const [mode, label] of Object.entries(contextNames)) {
        await page.getByRole('button', { name: label, exact: true }).click();
        for (const resources of [false, true]) {
          await page.getByRole('checkbox', { name: "I'll add textbooks or reference resources to the prompt context." }).setChecked(resources);
          const prompt = await copyPrompt(page);
          expect(prompt).toContain(`- **Course:** ${stage}`);
          expect(prompt).toContain(`- **Subject:** ${subject === 'Other' ? 'Custom test subject α' : subject}`);
          expect(prompt).toContain('Synthetic original question brief — α.\nKeep this second line.');
          expect(prompt.match(/Syllabus context: (Off|Provide|Search)\./g)).toEqual([`Syllabus context: ${mode}.`]);
          expect(prompt.includes('I will upload textbooks/resources.')).toBe(resources);
        }
      }
    });
  }
}

for (const from of Object.keys(contextNames)) for (const to of Object.keys(contextNames)) {
  if (from === to) continue;
  test(`context switching ${from} → ${to} replaces the copied instruction`, async ({ page }) => {
    await chooseCourse(page, 'Year 12', 'Mathematics Advanced');
    await briefField(page).fill('Synthetic brief');
    await page.getByRole('button', { name: 'Pedagogy', exact: true }).click();
    await page.getByRole('button', { name: contextNames[from], exact: true }).click();
    expect(await copyPrompt(page)).toContain(`Syllabus context: ${from}.`);
    await page.getByRole('button', { name: contextNames[to], exact: true }).click();
    const result = await copyPrompt(page);
    expect(result).toContain(`Syllabus context: ${to}.`);
    expect(result).not.toContain(`Syllabus context: ${from}.`);
  });
}

test('reload preserves the edited brief and resets non-persisted source declarations', async ({ page }) => {
  await chooseCourse(page, 'Year 12', 'Mathematics Advanced');
  await briefField(page).fill('Preserve this synthetic brief after reload.');
  await page.getByRole('button', { name: 'Pedagogy', exact: true }).click();
  await page.getByRole('button', { name: contextNames.Search, exact: true }).click();
  await page.getByRole('checkbox', { name: "I'll add textbooks or reference resources to the prompt context." }).check();
  await page.reload();
  await page.getByRole('button', { name: 'Topics', exact: true }).click();
  await expect(briefField(page)).toHaveValue('Preserve this synthetic brief after reload.');
  const prompt = await copyPrompt(page);
  expect(prompt).toContain('Syllabus context: Off.');
  expect(prompt).not.toContain('I will upload textbooks/resources.');
});
