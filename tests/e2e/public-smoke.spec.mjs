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

test('homepage search never exposes source-only tool routes', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();

  await page.waitForFunction(() => document.getElementById('homeSearchForm')?.dataset.searchReady === 'true');
  const input = page.locator('#homeSearchInput');
  await input.fill('background remover');

  const result = page.locator('#homeSearchResults a').filter({ hasText: /Background Remover|Arka Plan Kaldırma/i }).first();
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute('href', '/tools/image/background-remover/');
  expect(await result.getAttribute('href')).not.toContain('/src/tools/');

  const navigation = await Promise.all([
    page.waitForURL(/\/tools\/image\/background-remover\/?$/),
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

test('background remover v2 removes connected background without deleting enclosed foreground color', async ({ page }) => {
  const response = await page.goto('/tools/image/background-remover/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();

  const button = page.locator('#removeBtn');
  await expect(button).toHaveAttribute('data-engine-version', '2');

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
      <rect width="100" height="100" fill="#ffffff"/>
      <rect x="20" y="20" width="60" height="60" fill="#2563eb"/>
      <rect x="40" y="40" width="20" height="20" fill="#ffffff"/>
    </svg>`;

  await page.locator('#fileInput').setInputFiles({
    name: 'background-remover-regression.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(svg)
  });

  await expect(page.locator('#editorSection')).toHaveClass(/visible/);
  await expect.poll(() => page.locator('#originalPreview').evaluate((img) => img.complete && img.naturalWidth === 100)).toBeTruthy();
  await button.click();
  await expect(page.locator('#resultSection')).toHaveClass(/visible/, { timeout: 15_000 });
  await expect(page.locator('#downloadLink')).toHaveAttribute('href', /^blob:/);
  await expect(page.locator('#downloadLink')).toHaveAttribute('data-engine-version', '2');

  const pixels = await page.locator('#resultCanvas').evaluate((canvas) => {
    const ctx = canvas.getContext('2d');
    const alphaAt = (x, y) => ctx.getImageData(x, y, 1, 1).data[3];
    return {
      outside: alphaAt(5, 5),
      blueRing: alphaAt(25, 25),
      enclosedWhite: alphaAt(50, 50)
    };
  });

  expect(pixels.outside).toBeLessThan(24);
  expect(pixels.blueRing).toBeGreaterThan(220);
  expect(pixels.enclosedWhite).toBeGreaterThan(220);
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
