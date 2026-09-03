import { test, expect } from '@playwright/test';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import JSZip from 'jszip';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const ROUTE = '/tools/pdf/split/';

async function makePdf(pageCount) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 1; i <= pageCount; i += 1) {
    doc.addPage([300, 400]).drawText(`Page ${i}`, { x: 40, y: 200, size: 18, font });
  }
  return Buffer.from(await doc.save());
}

async function fixture(pageCount, name = 'source.pdf') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nv-split-'));
  const file = path.join(dir, name);
  fs.writeFileSync(file, await makePdf(pageCount));
  return file;
}

async function claimDownload(page, trigger) {
  const download = page.waitForEvent('download', { timeout: 30000 });
  await trigger();
  const file = await download;
  const saved = path.join(os.tmpdir(), `${Date.now()}-${file.suggestedFilename()}`);
  await file.saveAs(saved);
  return saved;
}

test.describe('PDF Splitter behaviour', () => {
  test('the route is served with working controls, not a fail-closed notice', async ({ page }) => {
    await page.goto(ROUTE);
    await expect(page.locator('input[type="file"]')).toHaveCount(1);
    await expect(page.getByText('This tool is currently unavailable')).toHaveCount(0);
  });

  test('a page range extracts exactly those pages, in order', async ({ page }) => {
    const src = await fixture(5);
    await page.goto(ROUTE);
    await page.locator('input[type="file"]').setInputFiles(src);
    await page.locator('#pageRange').fill('2-3');
    await expect(page.locator('#splitBtn')).toBeEnabled();

    await page.locator('#splitBtn').click();
    await expect(page.locator('#resultSection')).toBeVisible({ timeout: 30000 });
    const saved = await claimDownload(page, () => page.locator('#downloadLink').click());

    const out = await PDFDocument.load(fs.readFileSync(saved));
    expect(out.getPageCount()).toBe(2);
  });

  test('an empty range splits every page into its own file inside one ZIP', async ({ page }) => {
    const src = await fixture(3);
    await page.goto(ROUTE);
    await page.locator('input[type="file"]').setInputFiles(src);
    await page.locator('#pageRange').fill('');

    await page.locator('#splitBtn').click();
    await expect(page.locator('#resultSection')).toBeVisible({ timeout: 30000 });
    const saved = await claimDownload(page, () => page.locator('#downloadLink').click());

    const zip = await JSZip.loadAsync(fs.readFileSync(saved));
    const names = Object.keys(zip.files).filter((n) => n.endsWith('.pdf')).sort();
    expect(names).toHaveLength(3);
    const first = await PDFDocument.load(await zip.file(names[0]).async('nodebuffer'));
    expect(first.getPageCount()).toBe(1);
  });

  test('a range outside the document is refused on the page, not in a browser dialog', async ({ page }) => {
    const src = await fixture(2);
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); });

    await page.goto(ROUTE);
    await page.locator('input[type="file"]').setInputFiles(src);
    await page.locator('#pageRange').fill('9-12');
    await page.locator('#splitBtn').click();

    await expect(page.locator('#splitStatus')).toContainText(/page/i, { timeout: 15000 });
    expect(dialogs).toHaveLength(0);
  });

  test('a non-PDF file is refused on the page, not in a browser dialog', async ({ page }) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nv-split-bad-'));
    const bad = path.join(dir, 'notes.txt');
    fs.writeFileSync(bad, 'not a pdf');
    const dialogs = [];
    page.on('dialog', (d) => { dialogs.push(d.message()); d.dismiss(); });

    await page.goto(ROUTE);
    await page.locator('input[type="file"]').setInputFiles(bad);
    await expect(page.locator('#splitStatus')).toContainText(/pdf/i, { timeout: 15000 });
    expect(dialogs).toHaveLength(0);
  });
});
