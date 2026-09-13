const SITE_ORIGIN = 'https://mc-novatools.com';
const DEFAULT_LOCALE = 'en';
const QUERY_LOCALE = 'tr';

function attr(tag, name) {
  const match = String(tag || '').match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match ? match[1] : '';
}

function isNoindexHtml(html) {
  return /<meta\b(?=[^>]*\bname\s*=\s*["']robots["'])[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["'][^>]*>/i.test(html)
    || /<meta\b(?=[^>]*\bcontent\s*=\s*["'][^"']*\bnoindex\b[^"']*["'])[^>]*\bname\s*=\s*["']robots["'][^>]*>/i.test(html);
}

function canonicalHref(html) {
  const links = String(html || '').match(/<link\b[^>]*>/gi) || [];
  const canonical = links.find((tag) => attr(tag, 'rel').toLowerCase() === 'canonical');
  return canonical ? attr(canonical, 'href') : '';
}

function canonicalBaseUrl(href) {
  if (!href) return '';
  try {
    const url = new URL(href, SITE_ORIGIN);
    if (url.origin !== SITE_ORIGIN) return '';
    url.search = '';
    url.hash = '';
    return url.toString();
  } catch {
    return '';
  }
}

function stripGeneralAlternateLinks(html) {
  return String(html || '').replace(/[ \t]*<link\b[^>]*>[ \t]*\r?\n?/gi, (tag) => {
    if (attr(tag, 'rel').toLowerCase() !== 'alternate' || !attr(tag, 'hreflang')) return tag;
    if (/\bdata-blog-seo\s*=\s*["']hreflang["']/i.test(tag)) return tag;
    return '';
  });
}

function localeAlternates(baseUrl) {
  const tr = new URL(baseUrl);
  tr.searchParams.set('lang', QUERY_LOCALE);
  return [
    `<link rel="alternate" hreflang="en" href="${baseUrl}">`,
    `<link rel="alternate" hreflang="tr" href="${tr.toString()}">`,
    `<link rel="alternate" hreflang="x-default" href="${baseUrl}">`
  ].join('\n  ');
}

export function normalizeGeneralLocaleSeoHtml(html) {
  const source = String(html || '');
  if (!/(?:src\s*=\s*["']\/i18n\.js["']|src\s*=\s*["'][^"']*\/i18n\.js["'])/i.test(source)) return source;
  if (/\bdata-blog-seo\s*=\s*["']hreflang["']/i.test(source)) return source;

  const canonical = canonicalBaseUrl(canonicalHref(source));
  if (!canonical) return source;

  const next = stripGeneralAlternateLinks(source);
  if (isNoindexHtml(next)) return next;

  const canonicalTag = (next.match(/<link\b[^>]*>/gi) || []).find((tag) => attr(tag, 'rel').toLowerCase() === 'canonical');
  if (!canonicalTag) return next;
  return next.replace(canonicalTag, `${canonicalTag}\n  ${localeAlternates(canonical)}`);
}

export function normalizeI18nRuntimeSource(source) {
  let next = String(source || '').replace(/\r\n/g, '\n');
  const localizedHrefBlock = `  function localizedHref(lang, pathname = window.location.pathname, search = window.location.search) {\n    return \`${'${localizedPath(lang, pathname)}${localizedSearch(lang, search)}'}\`;\n  }\n`;
  const seoHelpers = `\n  function seoLocalizedSearch(lang) {\n    const params = new URLSearchParams();\n    const normalizedLang = normalizeLanguage(lang) || DEFAULT_LANGUAGE;\n    if (normalizedLang !== DEFAULT_LANGUAGE) {\n      params.set('lang', normalizedLang);\n    }\n    const query = params.toString();\n    return query ? \`?${'${query}'}\` : '';\n  }\n\n  function seoLocalizedHref(lang, pathname = window.location.pathname) {\n    return \`${'${localizedPath(lang, pathname)}${seoLocalizedSearch(lang)}'}\`;\n  }\n`;

  if (!next.includes('function seoLocalizedSearch(lang)')) {
    if (!next.includes(localizedHrefBlock)) {
      throw new Error('i18n runtime localizedHref contract changed; refusing to patch SEO query state silently');
    }
    next = next.replace(localizedHrefBlock, `${localizedHrefBlock}${seoHelpers}`);
  }

  const replacements = [
    [
      'SUPPORTED_LANGUAGES.map((code) => [code, localizedHref(code)])',
      'SUPPORTED_LANGUAGES.map((code) => [code, seoLocalizedHref(code)])'
    ],
    ["['x-default', localizedHref('en')]", "['x-default', seoLocalizedHref('en')]"],
    [
      'canonical.href = absoluteUrl(`${canonicalPath}${localizedSearch(lang)}`);',
      'canonical.href = absoluteUrl(`${canonicalPath}${seoLocalizedSearch(lang)}`);'
    ]
  ];

  for (const [legacy, normalized] of replacements) {
    if (next.includes(legacy)) next = next.split(legacy).join(normalized);
    if (!next.includes(normalized)) {
      throw new Error(`i18n runtime SEO contract changed; expected ${normalized}`);
    }
  }

  return next;
}

export const GENERAL_LOCALE_SEO = Object.freeze({
  defaultLocale: DEFAULT_LOCALE,
  queryLocale: QUERY_LOCALE,
  origin: SITE_ORIGIN
});
