export const SITE_ORIGIN = 'https://mc-novatools.com';
export const SUPPORTED_LOCALES = Object.freeze(['en', 'tr']);
export const DEFAULT_LOCALE = 'en';
export const PRESERVED_QUERY_KEYS = Object.freeze(['utm_source', 'utm_medium', 'utm_campaign', 'ref']);

export function normalizeLocale(value) {
  const locale = String(value || '').trim().toLowerCase().replace('_', '-').split('-')[0];
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

export function normalizePath(pathname = '/') {
  const raw = pathname instanceof URL ? pathname.pathname : String(pathname || '/');
  const pathOnly = /^https?:\/\//i.test(raw)
    ? new URL(raw).pathname
    : raw.split('?')[0].split('#')[0];
  const clean = `/${pathOnly.replace(/^\/+|\/+$/g, '')}`;
  if (clean === '/') return '/';
  return /\.[a-z0-9]+$/i.test(clean) ? clean : `${clean}/`;
}

export function parseLocalizedPath(pathname = '/') {
  const path = normalizePath(pathname);
  const match = path.match(/^\/(en|tr)(?=\/|$)(.*)$/);
  if (!match) return { locale: DEFAULT_LOCALE, canonicalPath: path };
  return { locale: match[1], canonicalPath: normalizePath(match[2] || '/') };
}

export function localizedPath(pathname, locale) {
  const { canonicalPath } = parseLocalizedPath(pathname);
  return normalizeLocale(locale) === DEFAULT_LOCALE
    ? canonicalPath
    : canonicalPath === '/' ? '/tr/' : `/tr${canonicalPath}`;
}

export function canonicalUrl(pathname, locale = DEFAULT_LOCALE) {
  return new URL(localizedPath(pathname, locale), SITE_ORIGIN).href;
}

export function alternateUrls(pathname) {
  return {
    en: canonicalUrl(pathname, 'en'),
    tr: canonicalUrl(pathname, 'tr'),
    'x-default': canonicalUrl(pathname, 'en')
  };
}

export function languageSwitchUrl(input, locale) {
  const url = input instanceof URL ? input : new URL(input, SITE_ORIGIN);
  const params = new URLSearchParams();
  for (const key of PRESERVED_QUERY_KEYS) {
    for (const value of url.searchParams.getAll(key)) params.append(key, value);
  }
  const query = params.toString();
  return `${localizedPath(url.pathname, locale)}${query ? `?${query}` : ''}`;
}
