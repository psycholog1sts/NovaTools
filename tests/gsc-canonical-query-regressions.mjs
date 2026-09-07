import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

for (const file of ['src/i18n.js', 'public/i18n.js']) {
  const source = read(file);

  assert.match(
    source,
    /function seoLocalizedSearch\(lang\)[\s\S]*?new URLSearchParams\(\)[\s\S]*?params\.set\('lang', normalizedLang\)/,
    `${file} must build SEO locale query state from an empty parameter set instead of inheriting tracking/functional query params`
  );

  assert.match(
    source,
    /function seoLocalizedHref\(lang, pathname = window\.location\.pathname\)[\s\S]*?seoLocalizedSearch\(lang\)/,
    `${file} must expose a query-clean locale href for canonical/hreflang generation`
  );

  assert.match(
    source,
    /SUPPORTED_LANGUAGES\.map\(\(code\) => \[code, seoLocalizedHref\(code\)\]\)/,
    `${file} hreflang links must use query-clean locale URLs`
  );

  assert.match(
    source,
    /\['x-default', seoLocalizedHref\('en'\)\]/,
    `${file} x-default hreflang must use a query-clean English URL`
  );

  assert.match(
    source,
    /canonical\.href = absoluteUrl\(`\$\{canonicalPath\}\$\{seoLocalizedSearch\(lang\)\}`\)/,
    `${file} canonical must contain only the canonical locale query parameter`
  );

  assert.match(
    source,
    /function localizedSearch\(lang, search = window\.location\.search\)/,
    `${file} must preserve the navigation-oriented localizedSearch helper for functional query state`
  );
}

console.log('GSC canonical query normalization regression contract passed.');
