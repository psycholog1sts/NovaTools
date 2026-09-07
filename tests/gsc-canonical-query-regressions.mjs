import assert from 'node:assert/strict';
import {
  normalizeGeneralLocaleSeoHtml,
  normalizeI18nRuntimeSource
} from '../src/js/locale-seo-normalizer.mjs';

const legacyRuntime = `
  function localizedPath(_lang, pathname = window.location.pathname) {
    return pathname;
  }

  function localizedSearch(lang, search = window.location.search) {
    const params = new URLSearchParams(search || '');
    params.delete('lang');
    const normalizedLang = normalizeLanguage(lang) || DEFAULT_LANGUAGE;
    if (normalizedLang !== DEFAULT_LANGUAGE) {
      params.set('lang', normalizedLang);
    }
    const query = params.toString();
    return query ? \`?\${query}\` : '';
  }

  function localizedHref(lang, pathname = window.location.pathname, search = window.location.search) {
    return \`\${localizedPath(lang, pathname)}\${localizedSearch(lang, search)}\`;
  }

  function applyLocaleSeo(lang) {
    const canonicalPath = localizedPath(lang);
    [...SUPPORTED_LANGUAGES.map((code) => [code, localizedHref(code)]), ['x-default', localizedHref('en')]].forEach(() => {});
    canonical.href = absoluteUrl(\`\${canonicalPath}\${localizedSearch(lang)}\`);
  }
`;

const normalizedRuntime = normalizeI18nRuntimeSource(legacyRuntime);
assert.match(normalizedRuntime, /function seoLocalizedSearch\(lang\)/);
assert.match(normalizedRuntime, /const params = new URLSearchParams\(\);/);
assert.match(normalizedRuntime, /SUPPORTED_LANGUAGES\.map\(\(code\) => \[code, seoLocalizedHref\(code\)\]\)/);
assert.match(normalizedRuntime, /\['x-default', seoLocalizedHref\('en'\)\]/);
assert.match(normalizedRuntime, /canonical\.href = absoluteUrl\(`\$\{canonicalPath\}\$\{seoLocalizedSearch\(lang\)\}`\);/);
assert.match(
  normalizedRuntime,
  /function localizedSearch\(lang, search = window\.location\.search\)/,
  'navigation-oriented locale switching must keep functional query state intact'
);
assert.equal(
  normalizeI18nRuntimeSource(normalizedRuntime),
  normalizedRuntime,
  'runtime normalization must be idempotent'
);

const legacyHtml = `<!doctype html>
<html><head>
<link rel="canonical" href="https://mc-novatools.com/tools/example/">
<link rel="alternate" hreflang="en" href="https://mc-novatools.com/tools/example/">
<link rel="alternate" hreflang="tr" href="https://mc-novatools.com/tr/tools/example/">
<link rel="alternate" hreflang="de" href="https://mc-novatools.com/de/tools/example/">
<link rel="alternate" hreflang="x-default" href="https://mc-novatools.com/tools/example/">
<script src="/i18n.js" defer></script>
</head><body></body></html>`;

const normalizedHtml = normalizeGeneralLocaleSeoHtml(legacyHtml);
assert.match(normalizedHtml, /hreflang="en" href="https:\/\/mc-novatools\.com\/tools\/example\/"/);
assert.match(normalizedHtml, /hreflang="tr" href="https:\/\/mc-novatools\.com\/tools\/example\/\?lang=tr"/);
assert.match(normalizedHtml, /hreflang="x-default" href="https:\/\/mc-novatools\.com\/tools\/example\/"/);
assert.doesNotMatch(normalizedHtml, /hreflang="de"/);
assert.doesNotMatch(normalizedHtml, /\/tr\/tools\/example/);
assert.equal((normalizedHtml.match(/hreflang=/g) || []).length, 3, 'general indexable pages must expose exactly en/tr/x-default locale alternates');
assert.equal(normalizeGeneralLocaleSeoHtml(normalizedHtml), normalizedHtml, 'HTML normalization must be idempotent');

const noindexHtml = legacyHtml.replace(
  '<link rel="canonical"',
  '<meta name="robots" content="noindex, follow">\n<link rel="canonical"'
);
const normalizedNoindex = normalizeGeneralLocaleSeoHtml(noindexHtml);
assert.doesNotMatch(normalizedNoindex, /hreflang=/, 'noindex pages must not advertise indexable locale alternates');

const blogHtml = `<!doctype html><head>
<link rel="canonical" href="https://mc-novatools.com/blog/articles/example.html">
<link rel="alternate" hreflang="en" href="https://mc-novatools.com/blog/articles/example.html" data-blog-seo="hreflang">
<link rel="alternate" hreflang="tr" href="https://mc-novatools.com/tr/blog/articles/example.html" data-blog-seo="hreflang">
<link rel="alternate" hreflang="ar" href="https://mc-novatools.com/ar/blog/articles/example.html" data-blog-seo="hreflang">
<script src="/i18n.js" defer></script>
</head>`;
assert.equal(
  normalizeGeneralLocaleSeoHtml(blogHtml),
  blogHtml,
  'manifest-backed blog path locales must remain owned by the dedicated blog SEO layer'
);

console.log('GSC canonical query normalization regression contract passed.');
