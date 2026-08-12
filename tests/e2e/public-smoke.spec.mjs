import { test, expect } from '@playwright/test';

const routes = [
  ['home', '/'],
  ['pricing', '/pricing/'],
  ['pdf', '/tools/pdf/compress/'],
  ['image', '/tools/image/compress/'],
  ['developer', '/tools/dev/json-formatter/'],
  ['finance', '/tools/finance/compound-interest/']
];

for (const [name, route] of routes) {
  test(`${name} public route renders in Chromium`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response, `${route} should return a response`).not.toBeNull();
    expect(response.ok(), `${route} should return a successful status`).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible();
    await expect.poll(() => page.title()).not.toBe('');

    const canonical = page.locator('link[rel="canonical"]').first();
    if (await canonical.count()) {
      await expect(canonical).toHaveAttribute('href', /^https:\/\/mc-novatools\.com\//);
    }
  });
}

test('homepage exposes a keyboard-focusable primary control', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  let focused = '';
  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.keyboard.press('Tab');
    focused = await page.evaluate(() => document.activeElement?.tagName || '');
    if (['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(focused)) break;
  }
  expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focused);
});
