import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { PDFDocument } from 'pdf-lib';
import AxeBuilder from '@axe-core/playwright';

/**
 * The Invoice Generator route shipped with a "Download PDF" button that opened a
 * print window. It produced no PDF, it was blocked by popup blockers, and it
 * wrote the preview with innerHTML straight from the visitor's own fields.
 *
 * These tests describe the tool the page claims to be: a real PDF out of the
 * browser, arithmetic that is stated rather than guessed at, and text that is
 * text even when it looks like markup.
 */


/**
 * pdf-lib deflates the content stream and writes every string as a hex literal,
 * so the drawn words are not in the raw bytes in any readable form. Inflate the
 * streams, then decode the hex operands back into the text the page shows.
 */
function pageText(bytes) {
  const raw = bytes.toString('latin1');
  let streams = '';
  const marker = /stream\r?\n/g;
  let match;
  while ((match = marker.exec(raw)) !== null) {
    const start = match.index + match[0].length;
    const end = raw.indexOf('endstream', start);
    if (end < 0) continue;
    const slice = Buffer.from(bytes.subarray(start, end));
    try {
      streams += zlib.inflateSync(slice).toString('latin1');
    } catch {
      streams += slice.toString('latin1');
    }
  }
  return (streams.match(/<([0-9A-Fa-f]+)>\s*Tj/g) || [])
    .map((operand) => Buffer.from(operand.replace(/[^0-9A-Fa-f]/g, ''), 'hex').toString('latin1'))
    .join('\n');
}

const ROUTE = '/tools/design/invoice-generator/';

async function setField(page, id, value) {
  await page.fill(`#${id}`, value);
}

test.describe('Invoice Generator', () => {
  test.beforeEach(async ({ page }) => {
    const response = await page.goto(ROUTE, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
  });

  test('the route serves the tool, not a verification notice', async ({ page }) => {
    await expect(page.locator('#invNumber')).toBeVisible();
    await expect(page.locator('#downloadPdf')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/verification in progress/i);
  });

  test('the download button produces a real PDF containing the invoice number', async ({ page }) => {
    await setField(page, 'invNumber', 'INV-2026-0042');
    await setField(page, 'invCompany', 'Northwind Studio');

    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      page.click('#downloadPdf')
    ]);

    expect(download.suggestedFilename()).toBe('INV-2026-0042.pdf');
    const bytes = fs.readFileSync(await download.path());
    expect(bytes.subarray(0, 5).toString('latin1')).toBe('%PDF-');

    // A real PDF, not a renamed print page: it has to parse, carry our metadata,
    // and have the invoice number and the client's name drawn on the page.
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(doc.getTitle()).toContain('INV-2026-0042');
    expect(doc.getCreator()).toMatch(/NovaTools/i);

    const drawn = pageText(bytes);
    expect(drawn).toContain('INV-2026-0042');
    expect(drawn).toContain('Northwind Studio');
  });

  test('a description that looks like markup stays text', async ({ page }) => {
    const hostile = '<img src=x onerror="window.__pwned=1">';
    await page.locator(".line-item .item-desc").first().fill(hostile);
    await page.locator(".line-item .item-desc").first().blur();
    await expect(page.locator('#invoicePreview')).toContainText(hostile);
    expect(await page.evaluate(() => window.__pwned)).toBeUndefined();
    expect(await page.locator('#invoicePreview img').count()).toBe(0);
  });

  test('the preview never carries translation keys over the visitor\'s own words', async ({ page }) => {
    await setField(page, 'invCompany', 'Northwind Studio');
    const tagged = await page.locator('#invoicePreview [data-i18n]').count();
    expect(tagged).toBe(0);
  });

  test('the arithmetic is stated and correct: discount first, then tax', async ({ page }) => {
    // One line only, so the arithmetic below is unambiguous.
    while (await page.locator('.line-item').count() > 1) {
      await page.locator('.line-item .remove-line').last().click();
    }
    await page.locator('.line-item .item-desc').first().fill('Design work');
    await page.locator('.line-item .item-qty').first().fill('10');
    await page.locator('.line-item .item-price').first().fill('100');
    await page.fill('#invDiscount', '10');
    await page.fill('#invTax', '20');
    await page.locator('#invTax').blur();

    // 1000 - 10% = 900; 900 + 20% = 1080.
    const preview = page.locator('#invoicePreview');
    await expect(preview).toContainText('1,000.00');
    await expect(preview).toContainText('900.00');
    await expect(preview).toContainText('1,080.00');

    // And the page has to say which order it uses, rather than leaving it to be guessed.
    await expect(page.locator('body')).toContainText(/discount .* before .* tax|tax .* after .* discount/i);
  });

  test('adding and removing line items keeps at least one line', async ({ page }) => {
    const start = await page.locator('.line-item').count();
    await page.click('#addLine');
    await page.click('#addLine');
    expect(await page.locator('.line-item').count()).toBe(start + 2);

    for (const _ of [0, 1, 2, 3]) {
      const remove = page.locator('.line-item .remove-line').last();
      if (await remove.isEnabled()) await remove.click();
    }
    expect(await page.locator('.line-item').count()).toBeGreaterThanOrEqual(1);
  });

  test('the result is announced, not silent', async ({ page }) => {
    const status = page.locator('#invoiceStatus');
    await expect(status).toHaveAttribute('aria-live', /polite|assertive/);
    await Promise.all([
      page.waitForEvent('download', { timeout: 20000 }),
      page.click('#downloadPdf')
    ]);
    await expect(status).not.toBeEmpty();
  });

  test('the page states its limits and stays accessible', async ({ page }) => {
    await expect(page.locator('body')).toContainText(/browser/i);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(results.violations).toEqual([]);
  });
});
