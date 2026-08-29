import { test, expect } from '@playwright/test';

const route = '/tools/converters/roman-numerals/';

test.describe('Roman Numerals Converter behaviour', () => {
  test.beforeEach(async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
  });

  test('the input has a programmatically associated label in both modes', async ({ page }) => {
    await expect(page.locator('#inputField')).toHaveAccessibleName(/number/i);
    await page.locator('#tabToNumber').click();
    await expect(page.locator('#inputField')).toHaveAccessibleName(/roman/i);
  });

  test('the validation message is announced', async ({ page }) => {
    await expect(page.locator('#validationMsg')).toHaveAttribute('aria-live', 'polite');
  });

  test('the mode tabs expose their pressed state', async ({ page }) => {
    await expect(page.locator('#tabToRoman')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#tabToNumber')).toHaveAttribute('aria-pressed', 'false');
    await page.locator('#tabToNumber').click();
    await expect(page.locator('#tabToRoman')).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#tabToNumber')).toHaveAttribute('aria-pressed', 'true');
  });

  test('numbers convert with standard subtractive notation', async ({ page }) => {
    for (const [input, expected] of [['1', 'I'], ['4', 'IV'], ['9', 'IX'], ['40', 'XL'], ['1990', 'MCMXC'], ['2024', 'MMXXIV'], ['3999', 'MMMCMXCIX']]) {
      await page.locator('#inputField').fill(input);
      await page.locator('#btnConvert').click();
      await expect(page.locator('#resultValue')).toHaveText(expected);
    }
  });

  test('roman numerals convert back to the same numbers', async ({ page }) => {
    await page.locator('#tabToNumber').click();
    for (const [input, expected] of [['I', '1'], ['IV', '4'], ['MCMXC', '1990'], ['MMMCMXCIX', '3999']]) {
      await page.locator('#inputField').fill(input);
      await page.locator('#btnConvert').click();
      await expect(page.locator('#resultValue')).toHaveText(expected);
    }
  });

  test('lowercase roman input is accepted', async ({ page }) => {
    await page.locator('#tabToNumber').click();
    await page.locator('#inputField').fill('mmxxiv');
    await page.locator('#btnConvert').click();
    await expect(page.locator('#resultValue')).toHaveText('2024');
  });

  test('non-canonical roman numerals are refused, not silently accepted', async ({ page }) => {
    await page.locator('#tabToNumber').click();
    for (const bad of ['IIII', 'VX', 'IC', 'MMMM', 'ABC', 'X I']) {
      await page.locator('#inputField').fill(bad);
      await page.locator('#btnConvert').click();
      await expect(page.locator('#resultValue')).not.toHaveText(/^\d+$/);
      await expect(page.locator('#validationMsg')).toContainText(/invalid|not a valid/i);
    }
  });

  test('trailing junk is rejected instead of being silently truncated', async ({ page }) => {
    for (const bad of ['2024abc', '12.9', '1e3', '0x10', ' 7 7', '+5']) {
      await page.locator('#inputField').fill(bad);
      await page.locator('#btnConvert').click();
      await expect(page.locator('#resultValue')).not.toHaveText(/^[IVXLCDM]+$/);
      await expect(page.locator('#validationMsg')).toContainText(/whole number|between 1 and 3999/i);
    }
  });

  test('out-of-range numbers are refused at both ends', async ({ page }) => {
    for (const bad of ['0', '4000', '-1']) {
      await page.locator('#inputField').fill(bad);
      await page.locator('#btnConvert').click();
      await expect(page.locator('#validationMsg')).toContainText(/between 1 and 3999/i);
    }
  });

  test('the worked examples actually fill in and convert', async ({ page }) => {
    const example = page.getByRole('button', { name: /2024/ });
    await example.click();
    await expect(page.locator('#inputField')).toHaveValue('2024');
    await expect(page.locator('#resultValue')).toHaveText('MMXXIV');
  });

  test('the worked examples are reachable from the keyboard', async ({ page }) => {
    const example = page.getByRole('button', { name: /1000/ });
    await example.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#resultValue')).toHaveText('M');
  });

  test('no symbol is advertised that the converter cannot produce or read', async ({ page }) => {
    const grid = page.locator('.rules-grid');
    await expect(grid).not.toContainText('5000');
    await expect(page.locator('body')).not.toContainText(/appears immediately|updates as you type/i);
  });
});
