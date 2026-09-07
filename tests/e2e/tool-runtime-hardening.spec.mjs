import { test, expect } from '@playwright/test';

function watchPageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test.describe('tool runtime hardening', () => {
  test('Todo List renders user task text as text, not HTML', async ({ page }) => {
    await page.goto('/tools/productivity/todo-list/');
    await page.evaluate(() => localStorage.removeItem('todo_tasks'));
    await page.reload();

    const payload = '<strong id="todo-html-injection">owned</strong>';
    await page.fill('#taskInput', payload);
    await page.click('#btnAddTask');

    await expect(page.locator('.task-text')).toHaveText(payload);
    await expect(page.locator('#todo-html-injection')).toHaveCount(0);
  });

  test('EXIF Viewer fails closed for truncated image data without a page error', async ({ page }) => {
    const pageErrors = watchPageErrors(page);
    await page.goto('/tools/image/exif-viewer/');

    await page.locator('#fileInput').setInputFiles({
      name: 'truncated.jpg',
      mimeType: 'image/jpeg',
      buffer: Buffer.from([0xff])
    });

    await expect(page.locator('#toolStatus')).toHaveAttribute('data-type', 'error');
    await expect(page.locator('#toolStatus')).toContainText('valid JPEG');
    expect(pageErrors).toEqual([]);
  });

  test('Audio Spectrum reports an invalid audio file instead of leaving an unhandled rejection', async ({ page }) => {
    const pageErrors = watchPageErrors(page);
    await page.goto('/tools/data/audio-spectrum/');

    await page.locator('#fileInput').setInputFiles({
      name: 'broken.mp3',
      mimeType: 'audio/mpeg',
      buffer: Buffer.from('not audio data')
    });

    await expect(page.locator('#toolStatus')).toHaveAttribute('data-type', 'error');
    await expect(page.locator('#toolStatus')).toContainText('decode');
    expect(pageErrors).toEqual([]);
  });

  test('Chart Builder rejects empty input instead of reporting a successful empty chart', async ({ page }) => {
    await page.goto('/tools/data/chart-builder/');
    await page.fill('#mainInput', '');
    await page.click('#runTool');

    await expect(page.locator('#toolStatus')).toHaveAttribute('data-type', 'error');
    await expect(page.locator('#toolStatus')).toContainText('label,value');
  });

  test('local-only Phase 10 tools do not claim unrelated live market or weather network behavior', async ({ page }) => {
    for (const route of [
      '/tools/text/text-summarizer/',
      '/tools/text/text-analysis/',
      '/tools/text/simple-translator/',
      '/tools/data/chart-builder/',
      '/tools/data/csv-json-summarizer/',
      '/tools/data/audio-spectrum/',
      '/tools/image/exif-viewer/'
    ]) {
      await page.goto(route);
      await expect(page.locator('body')).not.toContainText('Live market and weather data requests go through the NovaTools proxy');
    }
  });

  test('Simple Translator copy matches its English-Turkish phrasebook scope', async ({ page }) => {
    await page.goto('/tools/text/simple-translator/');
    await expect(page.locator('body')).not.toContainText('Aralıklı Tekrar, Ebbinghaus Unutma Eğrisi ve Almanca Kelime Hafızası');
    await expect(page.locator('body')).not.toContainText('Phase 10');
    await expect(page.locator('body')).toContainText('built-in English–Turkish dictionary');
  });
});
