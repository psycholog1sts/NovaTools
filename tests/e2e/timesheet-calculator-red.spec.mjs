import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * A timesheet calculator is only worth anything if you can check it. Most of
 * the ones on the web will not tell you whether they round, how they treat a
 * shift that crosses midnight, or whether overtime is counted daily or weekly —
 * and those three choices are the whole answer.
 *
 * These tests pin all three, in the browser and on the page.
 */

const ROUTE = '/tools/productivity/timesheet-calculator/';

async function fillDay(page, index, start, end, breakMinutes) {
  const row = page.locator('.day-row').nth(index);
  await row.locator('.day-start').fill(start);
  await row.locator('.day-end').fill(end);
  if (breakMinutes !== undefined) await row.locator('.day-break').fill(String(breakMinutes));
  await row.locator('.day-break').blur();
}

test.describe('Timesheet Calculator', () => {
  test.beforeEach(async ({ page }) => {
    const response = await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
  });

  test('the route serves the tool, not a verification notice', async ({ page }) => {
    await expect(page.locator('.day-row')).toHaveCount(7);
    await expect(page.locator('#weekTotal')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/verification in progress/i);
  });

  test('a plain day is hours minus the unpaid break', async ({ page }) => {
    await fillDay(page, 0, '09:00', '17:30', 30);
    await expect(page.locator('.day-row').nth(0).locator('.day-total')).toHaveText(/8:00|8\.00/);
  });

  test('a shift that crosses midnight is counted, not read as negative', async ({ page }) => {
    await fillDay(page, 0, '22:00', '06:00', 0);
    await expect(page.locator('.day-row').nth(0).locator('.day-total')).toHaveText(/8:00|8\.00/);
    // And the page has to say it makes that assumption.
    await expect(page.locator('body')).toContainText(/midnight/i);
  });

  test('a break longer than the shift is refused, not carried as negative time', async ({ page }) => {
    await fillDay(page, 0, '09:00', '10:00', 120);
    await expect(page.locator('.day-row').nth(0).locator('.day-total')).toHaveText(/0:00|0\.00/);
    await expect(page.locator('#timesheetStatus')).toContainText(/break/i);
  });

  test('overtime is weekly, over a threshold the visitor sets, and the page says so', async ({ page }) => {
    for (let day = 0; day < 5; day += 1) await fillDay(page, day, '09:00', '18:00', 0);
    await page.fill('#overtimeThreshold', '40');
    await page.locator('#overtimeThreshold').blur();

    await expect(page.locator('#weekTotal')).toHaveText(/45:00|45\.00/);
    await expect(page.locator('#regularHours')).toHaveText(/40:00|40\.00/);
    await expect(page.locator('#overtimeHours')).toHaveText(/5:00|5\.00/);
    await expect(page.locator('body')).toContainText(/weekly total|over the week/i);
  });

  test('pay follows the stated rate and multiplier', async ({ page }) => {
    for (let day = 0; day < 5; day += 1) await fillDay(page, day, '09:00', '18:00', 0);
    await page.fill('#overtimeThreshold', '40');
    await page.fill('#hourlyRate', '20');
    await page.fill('#overtimeMultiplier', '1.5');
    await page.locator('#overtimeMultiplier').blur();
    // 40 × 20 = 800, plus 5 × 20 × 1.5 = 150 → 950.
    await expect(page.locator('#totalPay')).toContainText('950');
  });

  test('the rounding rule is stated and applied', async ({ page }) => {
    await fillDay(page, 0, '09:00', '17:07', 0);
    await expect(page.locator('.day-row').nth(0).locator('.day-total')).toHaveText(/8:07|8\.12/);
    await page.selectOption('#roundingRule', '15');
    await expect(page.locator('.day-row').nth(0).locator('.day-total')).toHaveText(/8:00|8\.00/);
    await expect(page.locator('body')).toContainText(/nearest/i);
  });

  test('the week exports as a CSV that carries the totals', async ({ page }) => {
    await fillDay(page, 0, '09:00', '17:00', 30);
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 15000 }),
      page.click('#exportCsv')
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
    const fs = await import('node:fs');
    const text = fs.readFileSync(await download.path(), 'utf8');
    expect(text).toMatch(/Monday/i);
    expect(text).toMatch(/7\.5|7:30/);
  });

  test('the page stays accessible and states its limits', async ({ page }) => {
    await expect(page.locator('body')).toContainText(/browser/i);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
