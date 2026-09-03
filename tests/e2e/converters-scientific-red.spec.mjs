import { test, expect } from '@playwright/test';

const route = '/tools/converters/scientific-calculator/';

async function press(page, label) {
  await page.getByRole('button', { name: label, exact: true }).click();
}

async function display(page) {
  return (await page.locator('#calcInput').textContent())?.trim();
}

test.describe('Scientific Calculator behaviour', () => {
  test.beforeEach(async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
  });

  test('every control has an accessible name', async ({ page }) => {
    for (const name of ['Divide', 'Multiply', 'Subtract', 'Add', 'Equals', 'Square root', 'Backspace', 'Pi', 'Percent', 'Parenthesis', 'Power', 'All clear']) {
      await expect(page.getByRole('button', { name, exact: true })).toHaveCount(1);
    }
  });

  test('the display is announced as it changes', async ({ page }) => {
    await expect(page.locator('#calcInput')).toHaveAttribute('aria-live', 'polite');
  });

  test('a zero result reads as 0, not as scientific notation', async ({ page }) => {
    await press(page, '5');
    await press(page, 'Subtract');
    await press(page, '5');
    await press(page, 'Equals');
    expect(await display(page)).toBe('0');
  });

  test('pi is inserted at full double precision and multiplies rather than concatenates', async ({ page }) => {
    await press(page, '2');
    await press(page, 'Pi');
    await press(page, 'Equals');
    expect(Number(await display(page))).toBeCloseTo(2 * Math.PI, 6);
  });

  test("Euler's number is the constant, not a truncated literal", async ({ page }) => {
    // The display is documented as rounded to 10 decimal places, so the
    // constant's exactness is proven through the evaluator, not the display.
    await press(page, 'Euler number');
    await press(page, 'Equals');
    expect(Number(await display(page))).toBeCloseTo(Math.E, 9);

    await press(page, 'All clear');
    await press(page, 'Euler number');
    await press(page, 'ln');
    await press(page, 'Equals');
    expect(await display(page)).toBe('1');
  });

  test('tan(90) in degrees is reported as undefined instead of a huge finite number', async ({ page }) => {
    await press(page, '9');
    await press(page, '0');
    await press(page, 'tan');
    await press(page, 'Equals');
    expect(await display(page)).toMatch(/undefined/i);
  });

  test('division by zero explains itself', async ({ page }) => {
    await press(page, '1');
    await press(page, 'Divide');
    await press(page, '0');
    await press(page, 'Equals');
    expect(await display(page)).toMatch(/zero|undefined/i);
  });

  test('the square root of a negative number explains itself', async ({ page }) => {
    await press(page, '9');
    await press(page, 'Subtract');
    await press(page, '1');
    await press(page, '0');
    await press(page, 'Square root');
    await press(page, 'Equals');
    expect(await display(page)).toMatch(/negative|real/i);
  });

  test('percent applies to the whole expression, not just its first number', async ({ page }) => {
    await press(page, '2');
    await press(page, '0');
    await press(page, '0');
    await press(page, 'Add');
    await press(page, '5');
    await press(page, '0');
    await press(page, 'Percent');
    expect(Number(await display(page))).toBeCloseTo(2.5, 6);
  });

  test('the degree/radian toggle exposes and reflects its state', async ({ page }) => {
    const toggle = page.getByRole('button', { name: /degrees|radians/i });
    await expect(toggle).toHaveAttribute('aria-pressed', /true|false/);
    const before = await page.locator('#modeDeg').textContent();
    await toggle.click();
    await expect(page.locator('#modeDeg')).not.toHaveText(String(before));
  });

  test('history shows the calculation, not an unexpanded template literal', async ({ page }) => {
    await press(page, '7');
    await press(page, 'Add');
    await press(page, '1');
    await press(page, 'Equals');
    const list = page.locator('#historyList');
    await expect(list).toContainText('7+1');
    await expect(list).toContainText('8');
    await expect(list).not.toContainText('${');
  });

  test('an unbalanced expression says what is wrong', async ({ page }) => {
    await press(page, 'Parenthesis');
    await press(page, '1');
    await press(page, 'Add');
    await press(page, 'Equals');
    expect(await display(page)).toMatch(/parenthes|incomplete|check/i);
  });
});
