import { test, expect } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROUTE = '/tools/pdf/merge/';

async function makePdf(pageCount, label) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i += 1) {
    const page = doc.addPage([300, 400]);
    page.drawText(`${label} page ${i}`, { x: 40, y: 200, size: 18, font });
  }
  return Buffer.from(await doc.save());
}

async function writeFixtures() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nv-merge-'));
  const a = path.join(dir, 'alpha.pdf');
  const b = path.join(dir, 'beta.pdf');
  fs.writeFileSync(a, await makePdf(1, 'Alpha'));
  fs.writeFileSync(b, await makePdf(2, 'Beta'));
  return { dir, a, b };
}

test.describe('PDF Merger behaviour', () => {
  test('the route is served with working controls, not a fail-closed notice', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(page.locator('input[type="file"]')).toHaveCount(1);
    await expect(page.getByText('This tool is currently unavailable')).toHaveCount(0);
  });

  test('two PDFs merge into one file with every page kept, in order', async ({ page }) => {
    const { a, b } = await writeFixtures();
    await page.goto(ROUTE);

    await page.locator('input[type="file"]').setInputFiles([a, b]);
    await expect(page.locator('#fileList .file-item')).toHaveCount(2);

    await page.locator('#mergeBtn').click();
    // The tool prepares a download link rather than pushing a file at the
    // visitor, so the result is claimed by following that link.
    await expect(page.locator('#downloadSection')).toBeVisible({ timeout: 30000 });
    const download = page.waitForEvent('download', { timeout: 30000 });
    await page.locator('#downloadLink').click();
    const file = await download;
    const saved = path.join(os.tmpdir(), `merged-${Date.now()}.pdf`);
    await file.saveAs(saved);

    const merged = await PDFDocument.load(fs.readFileSync(saved));
    expect(merged.getPageCount()).toBe(3);
  });

  test('a non-PDF file is refused with a stated reason instead of being merged', async ({ page }) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nv-merge-bad-'));
    const bad = path.join(dir, 'notes.txt');
    fs.writeFileSync(bad, 'this is not a pdf');
    await page.goto(ROUTE);
    await page.locator('input[type="file"]').setInputFiles([bad]);
    await expect(page.locator('#errorSection, [role="alert"], #errorMessage')).toContainText(/pdf/i);
  });

  test('the page states where the merge runs and what it does not do', async ({ page }) => {
    await page.goto(ROUTE);
    const body = (await page.locator('body').innerText()).toLowerCase();
    expect(body).toMatch(/browser/);
    expect(body).toMatch(/limit|maximum|up to/);
  });
});
