import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import {
  buildPageText,
  findPii,
  isValidCard,
  isValidIban,
  isValidTckn,
  maskValue,
  rectsForRange
} from '../src/tools/pdf/redact/pii-detect.mjs';

// Checksums: a valid number is found, a one-digit change is not.
assert.equal(isValidTckn('10000000146'), true);
assert.equal(isValidTckn('10000000145'), false);
assert.equal(isValidTckn('01234567890'), false, 'TC Kimlik never starts with 0');
assert.equal(isValidIban('TR33 0006 1005 1978 6457 8413 26'), true);
assert.equal(isValidIban('TR33 0006 1005 1978 6457 8413 27'), false);
assert.equal(isValidIban('TR33000610051978645784132'), false, 'TR IBANs are 26 characters');
assert.equal(isValidIban('DE89370400440532013000'), true);
assert.equal(isValidCard('4111 1111 1111 1111'), true);
assert.equal(isValidCard('4111 1111 1111 1112'), false);
assert.equal(isValidCard('0000000000000000'), false);

{
  const text = 'Ad: Ayşe Yılmaz TCKN 10000000146 IBAN TR33 0006 1005 1978 6457 8413 26 Tel: 0532 123 45 67 '
    + 'mail ayse.yilmaz@example.com kart 4111-1111-1111-1111 fatura no 12345678901 tutar 1500';
  const found = findPii(text);
  const byType = Object.fromEntries(found.map((f) => [f.type, f.value]));
  assert.equal(byType.tckn, '10000000146');
  assert.equal(byType.iban, 'TR33 0006 1005 1978 6457 8413 26', 'IBAN match must stop before the next word');
  assert.equal(byType.phone, '0532 123 45 67');
  assert.equal(byType.email, 'ayse.yilmaz@example.com');
  assert.equal(byType.card, '4111-1111-1111-1111');
  assert.equal(found.some((f) => f.value === '12345678901'), false, 'an 11-digit number failing the TCKN checksum is not reported');
  for (const f of found) assert.equal(text.slice(f.start, f.end), f.value, 'offsets must point at the matched text');
  for (let i = 1; i < found.length; i += 1) assert.ok(found[i].start >= found[i - 1].end, 'results must not overlap');
}

{
  const found = findPii('İSTANBUL şubesi, müşteri istanbul', { types: [], terms: ['istanbul'] });
  assert.equal(found.length, 2, 'Turkish dotted/dotless I must match case-insensitively');
  assert.equal(findPii('x', { types: [], terms: [' '] }).length, 0, 'blank terms are ignored');
  assert.equal(findPii('a+b (c)', { types: [], terms: ['(c)'] }).length, 1, 'terms are matched literally, not as regex');
}

assert.equal(maskValue('10000000146'), '10•••••••46');
assert.equal(maskValue('abc'), '•••');

{
  // Two items on one line far apart get a space; adjacent ones join, line ends become newlines.
  const items = [
    { str: 'TCKN', transform: [10, 0, 0, 10, 50, 700], width: 25, height: 10, hasEOL: false },
    { str: '1000000', transform: [10, 0, 0, 10, 90, 700], width: 40, height: 10, hasEOL: false },
    { str: '0146', transform: [10, 0, 0, 10, 130, 700], width: 22, height: 10, hasEOL: true },
    { str: 'next', transform: [10, 0, 0, 10, 50, 680], width: 20, height: 10, hasEOL: false }
  ];
  const { text, segments } = buildPageText(items);
  assert.equal(text, 'TCKN 10000000146\nnext');
  const [hit] = findPii(text);
  assert.equal(hit.type, 'tckn');
  const rects = rectsForRange(items, segments, hit.start, hit.end);
  assert.equal(rects.length, 2, 'a match split over two items yields one box per item');
  assert.ok(rects[0].x <= 90 && rects[1].x + rects[1].width >= 152, 'boxes cover the whole number');
  for (const r of rects) assert.ok(r.y < 700 && r.y + r.height > 710, 'boxes cover the glyph height');
}

{
  // End to end on a real PDF: pdf.js extracts what pdf-lib wrote, and the detector finds it.
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  page.drawText('Customer ID 10000000146', { x: 72, y: 760, size: 12, font });
  page.drawText('IBAN TR33 0006 1005 1978 6457 8413 26', { x: 72, y: 740, size: 12, font });
  // Narrow label glyphs (i, l, space) before wide digits: an equal-width guess starts the box
  // after the first digit, which left "1" visible in a real redaction during manual QA.
  const label = 'TC Kimlik No: ';
  page.drawText(`${label}10000000146`, { x: 72, y: 720, size: 12, font });
  const bytes = await doc.save();

  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const fontDir = fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts', import.meta.url));
  const standardFontDataUrl = `${fontDir.split('\\').join('/')}/`;
  const loadingTask = pdfjs.getDocument({ data: bytes, isEvalSupported: false, disableFontFace: true, standardFontDataUrl });
  const pdf = await loadingTask.promise;
  const content = await (await pdf.getPage(1)).getTextContent();
  const { text, segments } = buildPageText(content.items);
  const found = findPii(text);
  assert.deepEqual(found.map((f) => f.type).sort(), ['iban', 'tckn', 'tckn']);
  const [tckn, labelled] = found.filter((f) => f.type === 'tckn');
  const [box] = rectsForRange(content.items, segments, tckn.start, tckn.end);
  assert.ok(box.x > 72 && box.x < 160, `TCKN box starts after the label (x=${box.x})`);
  assert.ok(box.y < 760 && box.y + box.height > 768, 'TCKN box covers the line');

  // Measured like the page module does: real glyph widths for the run's font.
  const measure = (item, value) => font.widthOfTextAtSize(value, 12);
  const valueStart = 72 + font.widthOfTextAtSize(label, 12);
  const valueEnd = 72 + font.widthOfTextAtSize(`${label}10000000146`, 12);
  const [measured] = rectsForRange(content.items, segments, labelled.start, labelled.end, measure);
  assert.ok(measured.x <= valueStart - 1, `box must start before the first digit (box ${measured.x}, digit ${valueStart})`);
  assert.ok(measured.x + measured.width >= valueEnd + 1, 'box must end after the last digit');
  assert.ok(measured.x > 72 + font.widthOfTextAtSize('TC Kimlik', 12), 'box must not swallow the whole label');
  // Even without a measurer, the padding must still reach the first digit in this case.
  const [guessed] = rectsForRange(content.items, segments, labelled.start, labelled.end);
  assert.ok(guessed.x <= valueStart, `unmeasured box must still cover the first digit (box ${guessed.x}, digit ${valueStart})`);
  await loadingTask.destroy();
}

console.log('pdf redact pii contract: pass');
