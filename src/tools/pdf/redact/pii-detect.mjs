/**
 * Personal-data detection for the PDF redaction tool. Pure functions, no DOM:
 * the page module feeds them pdf.js text items and turns the results into
 * boxes. Every numeric identifier is checksum-validated so a random run of
 * digits is not reported as an ID number.
 */

export const PII_TYPES = {
  tckn: 'Turkish ID number (TC Kimlik No)',
  iban: 'IBAN',
  card: 'Payment card number',
  email: 'Email address',
  phone: 'Phone number',
  custom: 'Your search term'
};

/** TC Kimlik No: 11 digits, no leading zero, two check digits. */
export function isValidTckn(value) {
  const digits = String(value).replace(/\D/g, '');
  if (!/^[1-9]\d{10}$/.test(digits)) return false;
  const d = [...digits].map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const tenth = (((odd * 7 - even) % 10) + 10) % 10;
  const eleventh = d.slice(0, 10).reduce((sum, n) => sum + n, 0) % 10;
  return d[9] === tenth && d[10] === eleventh;
}

const IBAN_LENGTHS = {
  TR: 26, DE: 22, GB: 22, FR: 27, NL: 18, BE: 16, ES: 24, IT: 27, AT: 20, CH: 21,
  PL: 28, SE: 24, DK: 18, NO: 15, FI: 18, IE: 22, PT: 25, GR: 27, LU: 20, AZ: 28, CY: 28
};

/** ISO 13616 IBAN with the mod-97 check; known countries also get a length check. */
export function isValidIban(value) {
  const iban = String(value).replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const expected = IBAN_LENGTHS[iban.slice(0, 2)];
  if (expected && iban.length !== expected) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const ch of rearranged) {
    const chunk = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const digit of chunk) remainder = (remainder * 10 + Number(digit)) % 97;
  }
  return remainder === 1;
}

/** Luhn check for 13-19 digit payment card numbers. */
export function isValidCard(value) {
  const digits = String(value).replace(/\D/g, '');
  if (digits.length < 13 || digits.length > 19 || /^(\d)\1+$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    let n = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
}

const DETECTORS = [
  {
    type: 'iban',
    pattern: /\b[A-Z]{2}\d{2}(?:[ ]?[A-Z0-9]){11,30}\b/gi,
    // A greedy match can swallow the next word; shrink from the right until it validates.
    accept(match) {
      let candidate = match;
      while (candidate.replace(/\s/g, '').length >= 15) {
        if (isValidIban(candidate)) return candidate;
        candidate = candidate.slice(0, -1).trimEnd();
      }
      return null;
    }
  },
  { type: 'card', pattern: /(?<![\d])\d(?:[ -]?\d){12,18}(?![\d])/g, accept: (m) => (isValidCard(m) ? m : null) },
  { type: 'tckn', pattern: /(?<![\d])[1-9]\d{10}(?![\d])/g, accept: (m) => (isValidTckn(m) ? m : null) },
  { type: 'email', pattern: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,24}/gi, accept: (m) => m },
  {
    type: 'phone',
    // Turkish numbers: with a +90 / 0 prefix any area code, without one only mobile (5xx).
    pattern: /(?<![\d+])(?:(?:\+90|0090|0)[\s.-]?\(?[2-5]\d{2}\)?|\(?5\d{2}\)?)[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}(?![\d])/g,
    accept: (m) => m
  }
];

const TURKISH_FOLD = { i: '[iİ]', 'İ': '[iİ]', ı: '[ıI]', I: '[ıI]' };

function termPattern(term) {
  const source = [...term.trim()]
    .map((ch) => TURKISH_FOLD[ch] || ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('')
    .replace(/\s+/g, '\\s+');
  return new RegExp(source, 'giu');
}

/**
 * Find personal data in a string.
 * @param {string} text
 * @param {{ terms?: string[], types?: string[] }} [options]
 * @returns {{ type: string, start: number, end: number, value: string }[]} sorted, non-overlapping
 */
export function findPii(text, options = {}) {
  const enabled = new Set(options.types || Object.keys(PII_TYPES));
  const found = [];
  for (const detector of DETECTORS) {
    if (!enabled.has(detector.type)) continue;
    for (const match of text.matchAll(detector.pattern)) {
      const value = detector.accept(match[0]);
      if (value) found.push({ type: detector.type, start: match.index, end: match.index + value.length, value });
    }
  }
  for (const term of options.terms || []) {
    if (!term || term.trim().length < 2) continue;
    for (const match of text.matchAll(termPattern(term))) {
      found.push({ type: 'custom', start: match.index, end: match.index + match[0].length, value: match[0] });
    }
  }
  // Longest match wins where two detectors overlap (a card number contains digit runs).
  found.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start));
  const result = [];
  for (const item of found) {
    const last = result[result.length - 1];
    if (last && item.start < last.end) {
      if (item.end > last.end) {
        last.end = item.end;
        last.value = text.slice(last.start, item.end);
      }
      continue;
    }
    result.push({ ...item });
  }
  return result;
}

/** Show enough of a value to recognise it without re-exposing it on screen. */
export function maskValue(value) {
  const compact = String(value);
  if (compact.length <= 4) return '•'.repeat(compact.length);
  return compact.slice(0, 2) + '•'.repeat(Math.min(compact.length - 4, 12)) + compact.slice(-2);
}

// Rough proportional widths (em) for when the font cannot be measured: narrow glyphs such
// as i, l and spaces are what make an equal-width guess drift.
function approximateWidth(text) {
  let width = 0;
  for (const ch of text) {
    if (/[ilIjtf.,:;'|!()[\]\s]/.test(ch)) width += 0.28;
    else if (/[mwMW@]/.test(ch)) width += 0.85;
    else if (/[A-Z]/.test(ch)) width += 0.67;
    else width += 0.55;
  }
  return width;
}

function itemBox(item) {
  const [a, b, c, d, e, f] = item.transform;
  const scaleX = Math.hypot(a, b) || 1;
  const height = item.height || Math.hypot(c, d) || scaleX;
  return { dirX: a / scaleX, dirY: b / scaleX, normX: -b / scaleX, normY: a / scaleX, originX: e, originY: f, height };
}

/**
 * Join pdf.js text items into one searchable string per page, remembering
 * which characters came from which item.
 * @param {{ str: string, transform: number[], width: number, height: number, hasEOL?: boolean }[]} items
 */
export function buildPageText(items) {
  let text = '';
  const segments = [];
  items.forEach((item, index) => {
    if (!item || typeof item.str !== 'string') return;
    const prev = items[index - 1];
    if (text && prev) {
      if (prev.hasEOL) text += '\n';
      else if (!/\s$/.test(text) && item.str && !/^\s/.test(item.str)) {
        const gap = item.transform[4] - (prev.transform[4] + (prev.width || 0));
        const sameLine = Math.abs(item.transform[5] - prev.transform[5]) < (item.height || 10) * 0.5;
        if (!sameLine || gap > (item.height || 10) * 0.15) text += ' ';
      }
    }
    segments.push({ index, start: text.length, end: text.length + item.str.length });
    text += item.str;
  });
  return { text, segments };
}

/**
 * Boxes in PDF user space that cover characters [start, end) of buildPageText's string.
 *
 * pdf.js gives one width per text run, not per glyph, so a value's position inside a run
 * ("TC Kimlik No: 10000000146") has to be estimated. `measure(item, text)` should return the
 * rendered width of `text` in the run's font (the page module uses canvas measureText);
 * without it, characters are assumed equally wide. Narrow label letters (i, l, space) make
 * that assumption place the value too far right, so boxes are also padded generously:
 * covering a neighbouring character is acceptable, uncovering part of the value is not.
 * @param {(item: object, text: string) => number} [measure]
 * @returns {{ x: number, y: number, width: number, height: number }[]}
 */
export function rectsForRange(items, segments, start, end, measure) {
  const rects = [];
  for (const segment of segments) {
    if (segment.end <= start || segment.start >= end) continue;
    const item = items[segment.index];
    const length = Math.max(item.str.length, 1);
    const from = Math.max(start, segment.start) - segment.start;
    const to = Math.min(end, segment.end) - segment.start;
    const box = itemBox(item);
    const width = item.width || 0;
    let widthOf = measure ? (text) => measure(item, text) : approximateWidth;
    if (!(widthOf(item.str) > 0)) widthOf = approximateWidth;
    const total = widthOf(item.str) || length;
    const fromFrac = widthOf(item.str.slice(0, from)) / total;
    const toFrac = widthOf(item.str.slice(0, to)) / total;
    const pad = box.height * 0.3;
    const u0 = width * fromFrac - pad;
    const u1 = width * toFrac + pad;
    const v0 = -box.height * 0.3;
    const v1 = box.height * 1.1;
    const corners = [[u0, v0], [u1, v0], [u0, v1], [u1, v1]].map(([u, v]) => [
      box.originX + box.dirX * u + box.normX * v,
      box.originY + box.dirY * u + box.normY * v
    ]);
    const xs = corners.map((p) => p[0]);
    const ys = corners.map((p) => p[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    rects.push({ x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y });
  }
  return rects;
}
