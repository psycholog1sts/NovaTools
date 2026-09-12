import { test, expect } from '@playwright/test';

const routes = [
  ['home', '/'],
  ['pricing', '/pricing/'],
  ['pdf', '/tools/pdf/compress/'],
  ['image', '/tools/image/compress/'],
  ['background remover', '/tools/image/background-remover/'],
  ['developer', '/tools/dev/json-formatter/'],
  ['finance', '/tools/finance/compound-interest/']
];

for (const [name, route] of routes) {
  test(`${name} public route renders in Chromium`, async ({ page }) => {
    const pageErrors = [];
    const failedInternalResponses = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
      if (response.status() < 400) return;
      try {
        const url = new URL(response.url());
        if (url.origin !== 'http://127.0.0.1:4173') return;
        if (url.pathname.startsWith('/api/')) return;
        failedInternalResponses.push(`${response.status()} ${url.pathname}`);
      } catch {
        // Ignore malformed or browser-internal URLs.
      }
    });

    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response, `${route} should return a response`).not.toBeNull();
    expect(response.ok(), `${route} should return a successful status`).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('h1').first()).toBeVisible();
    await expect.poll(() => page.title()).not.toBe('');
    await page.waitForTimeout(250);

    expect(pageErrors, `${route} should not throw runtime page errors`).toEqual([]);
    expect(failedInternalResponses, `${route} should not request broken same-origin resources`).toEqual([]);

    const canonical = page.locator('link[rel="canonical"]').first();
    if (await canonical.count()) {
      await expect(canonical).toHaveAttribute('href', /^https:\/\/mc-novatools\.com\//);
    }
  });
}

test('homepage search never exposes source-only tool routes', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();

  await page.waitForFunction(() => document.getElementById('homeSearchForm')?.dataset.searchReady === 'true');
  const input = page.locator('#homeSearchInput');
  await input.fill('image compressor');

  const result = page.locator('#homeSearchResults a').filter({ hasText: /Image Compressor|Görsel Sıkıştır/i }).first();
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute('href', '/tools/image/compress/');
  expect(await result.getAttribute('href')).not.toContain('/src/tools/');

  const navigation = await Promise.all([
    page.waitForURL(/\/tools\/image\/compress\/?$/),
    result.click()
  ]);
  void navigation;
  await expect(page.locator('h1').first()).toBeVisible();
  expect(page.url()).not.toContain('/src/tools/');
});

for (const [name, route] of [
  ['home', '/'],
  ['background remover', '/tools/image/background-remover/'],
  ['image compressor', '/tools/image/compress/'],
  ['json formatter', '/tools/dev/json-formatter/'],
  ['pdf compressor', '/tools/pdf/compress/']
]) {
  test(`${name} remains readable and visual in light mode`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('novatools-theme', 'light');
      localStorage.removeItem('theme');
    });

    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('h1').first()).toBeVisible();

    const textState = await page.locator('h1').first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        color: style.color,
        opacity: style.opacity,
        visibility: style.visibility,
        textFill: style.webkitTextFillColor
      };
    });
    expect(textState.visibility).toBe('visible');
    expect(Number(textState.opacity)).toBeGreaterThan(0.9);
    expect(textState.color).not.toBe('rgba(0, 0, 0, 0)');
    expect(textState.textFill).not.toBe('rgba(0, 0, 0, 0)');

    const images = page.locator('img:visible');
    if (await images.count()) {
      const firstImage = images.first();
      await expect(firstImage).toBeVisible();
      await expect.poll(() => firstImage.evaluate((img) => img.complete && img.naturalWidth > 0)).toBeTruthy();
    }

    const logoText = page.locator('.logo-text:visible').first();
    if (await logoText.count()) {
      const logoState = await logoText.evaluate((element) => {
        const style = getComputedStyle(element);
        return { color: style.color, textFill: style.webkitTextFillColor };
      });
      expect(logoState.color).not.toBe('rgba(0, 0, 0, 0)');
      expect(logoState.textFill).not.toBe('rgba(0, 0, 0, 0)');
    }
  });
}

test('uncertified background remover fails closed without active controls', async ({ page }) => {
  const response = await page.goto('/tools/image/background-remover/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  await expect(page.getByRole('heading', { name: 'This tool is currently unavailable' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
  await expect(page.locator('#removeBtn, #fileInput, canvas')).toHaveCount(0);
});

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

test('an empty category fails closed for search indexing', async ({ page }) => {
  // data-tools.html has zero certified tools as of this writing. developer-tools.html
  // used to be the fixture for this, but it stopped being empty once the GEO & Schema
  // Compliance Inspector shipped as the category's first certified tool — pick whichever
  // category is still genuinely empty rather than re-pointing this at another tool launch.
  await page.goto('/categories/data-tools.html');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
});
