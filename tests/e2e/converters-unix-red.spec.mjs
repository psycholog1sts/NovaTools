import { test, expect } from '@playwright/test';

const route = '/tools/converters/unix-timestamp/';

test.describe('Unix Timestamp Converter behaviour', () => {
  test.beforeEach(async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
  });

  test('both inputs have programmatically associated labels', async ({ page }) => {
    await expect(page.locator('#timestampInput')).toHaveAccessibleName(/timestamp/i);
    await page.locator('#tabToTimestamp').click();
    await expect(page.locator('#datetimeInput')).toHaveAccessibleName(/date/i);
  });

  test('the status is announced', async ({ page }) => {
    await expect(page.locator('#timestampStatus')).toHaveAttribute('aria-live', 'polite');
  });

  test('the mode tabs expose their pressed state', async ({ page }) => {
    await expect(page.locator('#tabToDate')).toHaveAttribute('aria-pressed', 'true');
    await page.locator('#tabToTimestamp').click();
    await expect(page.locator('#tabToTimestamp')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#tabToDate')).toHaveAttribute('aria-pressed', 'false');
  });

  test('a known epoch second converts to the documented UTC instant', async ({ page }) => {
    await page.locator('#timestampInput').fill('1704067200');
    await page.locator('#btnConvert').click();
    await expect(page.locator('#utcDateTime')).toHaveText('Mon, 01 Jan 2024 00:00:00 GMT');
    await expect(page.locator('#isoFormat')).toHaveText('2024-01-01T00:00:00.000Z');
  });

  test('the epoch itself and negative timestamps are supported', async ({ page }) => {
    await page.locator('#timestampInput').fill('0');
    await page.locator('#btnConvert').click();
    await expect(page.locator('#utcDateTime')).toHaveText('Thu, 01 Jan 1970 00:00:00 GMT');

    await page.locator('#timestampInput').fill('-86400');
    await page.locator('#btnConvert').click();
    await expect(page.locator('#utcDateTime')).toHaveText('Wed, 31 Dec 1969 00:00:00 GMT');
  });

  test('a millisecond value is disclosed as reinterpreted, not silently rescaled', async ({ page }) => {
    await page.locator('#timestampInput').fill('1704067200000');
    await page.locator('#btnConvert').click();
    await expect(page.locator('#utcDateTime')).toHaveText('Mon, 01 Jan 2024 00:00:00 GMT');
    await expect(page.locator('#timestampStatus')).toContainText(/millisecond/i);
  });

  test('an out-of-range timestamp is refused instead of crashing the page', async ({ page }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.locator('#timestampInput').fill('999999999999999999');
    await page.locator('#btnConvert').click();
    await expect(page.locator('#timestampStatus')).toContainText(/range|too large|outside/i);
    await expect(page.locator('#dateResult')).toBeHidden();
    expect(errors).toEqual([]);
  });

  test('non-integer timestamps are refused rather than truncated', async ({ page }) => {
    for (const bad of ['1.5', 'abc']) {
      await page.evaluate((value) => { document.getElementById('timestampInput').value = value; }, bad);
      await page.locator('#btnConvert').click();
      await expect(page.locator('#timestampStatus')).toContainText(/whole number|integer|required/i);
    }
  });

  test('an empty timestamp reports that it is required', async ({ page }) => {
    await page.locator('#timestampInput').fill('');
    await page.locator('#btnConvert').click();
    await expect(page.locator('#timestampStatus')).toContainText(/required|enter/i);
  });

  test('the relative time is labelled as an approximation', async ({ page }) => {
    await page.locator('#timestampInput').fill('1704067200');
    await page.locator('#btnConvert').click();
    await expect(page.locator('.result-item', { has: page.locator('#relativeTime') })).toContainText(/approx/i);
  });

  test('a local date round-trips back to the same timestamp', async ({ page }) => {
    await page.locator('#tabToTimestamp').click();
    await page.locator('#datetimeInput').fill('2024-01-01T00:00');
    await page.locator('#btnConvert').click();
    const seconds = Number(await page.locator('#timestampSeconds').textContent());
    const expected = await page.evaluate(() => Math.floor(new Date(2024, 0, 1, 0, 0, 0).getTime() / 1000));
    expect(seconds).toBe(expected);
  });

  test('an empty date reports rather than showing NaN', async ({ page }) => {
    await page.locator('#tabToTimestamp').click();
    await page.locator('#btnConvert').click();
    await expect(page.locator('#timestampStatus')).toContainText(/required|choose|select/i);
    await expect(page.locator('#timestampSeconds')).not.toContainText('NaN');
  });
});
