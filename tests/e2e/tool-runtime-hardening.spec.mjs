import { test, expect } from '@playwright/test';

const UNAVAILABLE_HARDENING_ROUTES = [
  '/tools/productivity/todo-list/',
  '/tools/text/text-summarizer/',
  '/tools/text/text-analysis/',
  '/tools/text/simple-translator/',
  '/tools/data/chart-builder/',
  '/tools/data/csv-json-summarizer/',
  '/tools/data/audio-spectrum/',
  '/tools/image/exif-viewer/'
];

function watchPageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test.describe('tool runtime hardening', () => {
  test('uncertified hardened tools remain fail-closed in the production build', async ({ page }) => {
    for (const route of UNAVAILABLE_HARDENING_ROUTES) {
      const pageErrors = watchPageErrors(page);
      await page.goto(route);

      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');
      await expect(page.locator('main')).toContainText('This tool is currently unavailable');
      await expect(page.locator('main')).toContainText('has not completed NovaTools production certification');
      await expect(page.locator('body')).not.toContainText('Live market and weather data requests go through the NovaTools proxy');
      expect(pageErrors, `${route} should not emit page errors while fail-closed`).toEqual([]);
    }
  });

  test('fail-closed translator surface does not publish internal roadmap or unrelated copy', async ({ page }) => {
    await page.goto('/tools/text/simple-translator/');
    await expect(page.locator('body')).not.toContainText('Phase 10');
    await expect(page.locator('body')).not.toContainText('production-grade translation');
    await expect(page.locator('body')).not.toContainText('Aralıklı Tekrar, Ebbinghaus Unutma Eğrisi ve Almanca Kelime Hafızası');
  });
});
