import { test, expect } from '@playwright/test';
import { isolateWorksheet, chooseCourse, briefField } from './worksheet-support';

test.beforeEach(async ({ page }) => { await isolateWorksheet(page); });

for (const subject of ['Mathematics Advanced', 'English']) for (const width of [320, 768, 1440]) {
  test(`${subject} textarea at ${width}px supports selection with keyboard open and after resizing`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await chooseCourse(page, 'Year 12', subject);
    const input = briefField(page);
    await input.fill(Array.from({ length: 50 }, () => 'alpha beta gamma — α 😀').join('\n'));
    await page.getByRole('button', { name: 'Math', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Math', exact: true })).toHaveAttribute('aria-expanded', 'true');
    await input.scrollIntoViewIfNeeded();
    await input.evaluate(el => { el.scrollTop = 0; el.setSelectionRange(0, 0); });
    const box = await input.boundingBox();
    await page.mouse.dblclick(box.x + 24, box.y + 25);
    await expect(input).toBeFocused();
    expect(await input.evaluate(el => el.value.slice(el.selectionStart, el.selectionEnd))).toBe('alpha');
    // Exercise a resized textarea rather than assuming fixed rows/height.
    await input.evaluate(el => { el.style.height = '240px'; el.style.minHeight = '120px'; });
    await input.scrollIntoViewIfNeeded();
    const resized = await input.boundingBox();
    for (const name of ['Math', 'Clear']) {
      const button = await page.getByRole('button', { name, exact: true }).boundingBox();
      expect(button.y).toBeGreaterThanOrEqual(resized.y + resized.height);
    }
    await input.click(); await input.press('ControlOrMeta+a');
    expect(await input.evaluate(el => el.selectionEnd - el.selectionStart)).toBe(await input.evaluate(el => el.value.length));
    await page.getByRole('button', { name: 'Clear', exact: true }).click();
    await expect(input).toHaveValue(''); await expect(input).toBeFocused();
    await input.pressSequentially('new brief');
    await expect(input).toHaveValue('new brief'); await expect(input).toBeFocused();
  });
}

test('real keyboard navigation enters the field and maths controls in order', async ({ page }) => {
  await chooseCourse(page, 'Year 12', 'Mathematics Advanced');
  const input = briefField(page);
  await input.click();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Math', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Math', exact: true })).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Clear', exact: true })).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab');
  await expect(input).toBeFocused();
});
