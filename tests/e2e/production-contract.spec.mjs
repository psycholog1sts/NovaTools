import { test, expect } from '@playwright/test';

async function clearThemePreference(page) {
  await page.addInitScript(() => {
    localStorage.removeItem('novatools-theme');
    localStorage.removeItem('theme');
  });
}

test('first homepage visit defaults to the light corporate theme', async ({ page }) => {
  await clearThemePreference(page);
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect.poll(() => page.evaluate(() => localStorage.getItem('novatools-theme'))).toBe('light');
});

test('direct tool first visit also defaults to light', async ({ page }) => {
  await clearThemePreference(page);
  const response = await page.goto('/tools/image/background-remover/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('h1').first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('novatools-theme'))).toBe('light');
});

test('broad image search exposes only canonical public routes', async ({ page }) => {
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  await page.waitForFunction(() => document.getElementById('homeSearchForm')?.dataset.searchReady === 'true');

  await page.locator('#homeSearchInput').fill('image');
  const resultLinks = page.locator('#homeSearchResults a');
  await expect(resultLinks.first()).toBeVisible();

  const hrefs = await resultLinks.evaluateAll((links) => links.map((link) => link.getAttribute('href') || ''));
  expect(hrefs.length).toBeGreaterThan(0);
  expect(hrefs.some((href) => href.startsWith('/tools/image/'))).toBeTruthy();
  for (const href of hrefs) {
    expect(href).not.toContain('/src/tools/');
  }
});
