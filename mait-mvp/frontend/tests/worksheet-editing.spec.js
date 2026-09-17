import { test, expect } from '@playwright/test';

const briefName = 'Additional Brief / Custom Questions';
const brief = page => page.getByPlaceholder('Add specific textbook questions or teacher notes to include alongside the syllabus points (optional)...');

test.beforeEach(async ({ page }) => {
  // No account, feedback, provider or other external calls during acceptance.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'http://127.0.0.1:4173') return route.abort();
    if (/^\/(api|auth|visit|subscribe|query|context|history|reset|keystroke)/.test(url.pathname)) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    }
    return route.continue();
  });
  await page.goto('/worksheets');
  await page.getByRole('button', { name: 'Mathematics Advanced', exact: true }).click();
  await page.getByRole('button', { name: 'Topics', exact: true }).click();
  await expect(brief(page)).toBeVisible();
});

test('visible brief label focuses the editable field', async ({ page }) => {
  await page.getByText(briefName, { exact: true }).click();
  await expect(brief(page)).toBeFocused();
  await expect(brief(page)).toHaveAccessibleName(briefName);
});

for (const width of [1280, 390]) {
  test(`long brief remains selectable beside its lower-left edge at width ${width}`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const input = brief(page);
    await input.fill(Array.from({ length: 30 }, (_, i) => `Line ${i + 1}: alpha beta gamma delta epsilon.`).join('\n'));
    await input.scrollIntoViewIfNeeded();
    const box = await input.boundingBox();
    const math = await page.getByRole('button', { name: 'Math', exact: true }).boundingBox();
    const clear = await page.getByRole('button', { name: 'Clear', exact: true }).boundingBox();
    const intersections = [math, clear].map(b => Math.max(0, Math.min(box.x + box.width, b.x + b.width) - Math.max(box.x, b.x)) * Math.max(0, Math.min(box.y + box.height, b.y + b.height) - Math.max(box.y, b.y)));
    // Keep both overlap and actual gesture evidence when checking the old code.
    expect.soft(intersections).toEqual([0, 0]);
    for (const fraction of [0, 0.5, 1]) {
      await input.evaluate((el, f) => { el.scrollTop = (el.scrollHeight - el.clientHeight) * f; el.setSelectionRange(0, 0); }, fraction);
      const x = box.x + 30;
      const y = box.y + box.height - 18;
      await page.mouse.move(x, y);
      await page.mouse.down();
      await page.mouse.move(Math.min(x + 130, box.x + box.width - 20), y, { steps: 12 });
      await page.mouse.up();
      await expect.soft(input).toBeFocused();
      expect.soft(await input.evaluate(el => el.selectionEnd - el.selectionStart)).toBeGreaterThan(0);
    }
    await page.screenshot({ path: testInfo.outputPath('brief-layout.png') });
  });
}

test('typing, selecting, maths insertion and step return preserve the brief', async ({ page }) => {
  const input = brief(page);
  await input.fill('alpha beta gamma');
  // Set a deterministic insertion point; the Home key differs across platforms.
  await input.evaluate(el => el.setSelectionRange(0, 0));
  await input.pressSequentially('Notes: ');
  await expect(input).toBeFocused();
  await expect(input).toHaveValue('Notes: alpha beta gamma');
  await input.evaluate(el => el.setSelectionRange(13, 17));
  await page.getByRole('button', { name: 'Math', exact: true }).click();
  await page.getByRole('button', { name: 'frac', exact: true }).click();
  await expect(input).toHaveValue('Notes: alpha \\frac{}{} gamma');
  await expect(input).toBeFocused();
  expect(await input.evaluate(el => [el.selectionStart, el.selectionEnd])).toEqual([19, 19]);
  await page.getByRole('button', { name: 'Pedagogy', exact: true }).click();
  await page.getByRole('button', { name: 'Topics', exact: true }).click();
  await expect(input).toHaveValue('Notes: alpha \\frac{}{} gamma');
  await input.press('ControlOrMeta+a');
  expect(await input.evaluate(el => el.selectionEnd - el.selectionStart)).toBe('Notes: alpha \\frac{}{} gamma'.length);
});

for (const [mode, button] of [['Off', 'AI general knowledge'], ['Provide', "I'll upload the syllabus"], ['Search', 'Ask Gemini to search NESA']]) {
  test(`copied prompt includes the selected subject and ${mode} context`, async ({ page }) => {
    // Capture actual application clipboard output; never open or submit to Gemini.
    await page.evaluate(() => {
      window.__copiedPrompt = '';
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__copiedPrompt = text; } } });
      window.open = () => null;
    });
    await brief(page).fill('Create original questions about rates of change.');
    await page.getByRole('button', { name: 'Pedagogy', exact: true }).click();
    const contextButton = page.getByRole('button', { name: button, exact: true });
    await contextButton.click();
    await expect(contextButton).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: 'Generate Instructions & Launch Gemini', exact: true }).click();
    await expect.poll(() => page.evaluate(() => window.__copiedPrompt)).toContain(`Syllabus context: ${mode}`);
    const copied = await page.evaluate(() => window.__copiedPrompt);
    expect(copied).toContain('- **Subject:** Mathematics Advanced');
    expect(copied).toContain('- **Course:** Year 12');
    if (mode === 'Search') expect(copied).toContain('Consult official NESA sources for Year 12 Mathematics Advanced');
  });
}
