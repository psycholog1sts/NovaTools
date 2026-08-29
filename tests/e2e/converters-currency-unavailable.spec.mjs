import { test, expect } from '@playwright/test';

/**
 * Proves the recorded UNAVAILABLE reason for the Currency Converter:
 * the page's invented rate table is contained by the fail-closed build and
 * never reaches a visitor, and the route is not offered as a working tool.
 */
test('Currency Converter is held closed and ships none of its invented rates', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto('/tools/converters/currency-converter/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();

  const robots = await page.locator('meta[name="robots"]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('content') || '')
  );
  expect(robots.some((content) => /noindex/i.test(content))).toBe(true);

  // The fail-closed surface is served instead of the converter.
  await expect(page.locator('body')).toContainText(/unavailable/i);
  await expect(page.locator('#amountInput')).toHaveCount(0);
  await expect(page.locator('#exchangeRate')).toHaveCount(0);

  // None of the hard-coded rates are present in the shipped page.
  const html = await page.content();
  expect(html).not.toContain('exchangeRates');
  for (const invented of ['1330.50', '150.25', '34.50', '0.0067']) {
    expect(html).not.toContain(invented);
  }

  // No live rate claim survives on the closed route.
  await expect(page.locator('body')).not.toContainText(/real-time exchange rates|150\+ currencies/i);

  expect(errors).toEqual([]);
});
