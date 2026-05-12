export const SITE_ORIGIN = 'https://mc-novatools.com';
export const fallbackBlogLocale = 'en';
export const supportedBlogLocales = ['en', 'tr', 'de', 'fr', 'es', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'it', 'pl', 'nl'];

export function normalizeBlogLocale(locale) {
  const normalized = String(locale || '').toLowerCase().split('-')[0];
  return supportedBlogLocales.includes(normalized) ? normalized : fallbackBlogLocale;
}

export function blogLocaleFromPath(pathname = '/') {
  const [, candidate] = String(pathname).match(/^\/([a-z]{2})(?:\/|$)/) || [];
  return supportedBlogLocales.includes(candidate) ? candidate : null;
}

export function blogHubPath(locale = fallbackBlogLocale) {
  const normalized = normalizeBlogLocale(locale);
  return normalized === fallbackBlogLocale ? '/blog/index.html' : `/${normalized}/blog/index.html`;
}

export function blogArticlePath(slug, locale = fallbackBlogLocale) {
  const safeSlug = String(slug || '').trim();
  const normalized = normalizeBlogLocale(locale);
  const prefix = normalized === fallbackBlogLocale ? '' : `/${normalized}`;
  return `${prefix}/blog/articles/${safeSlug}.html`;
}

export function legacyBlogArticlePath(slug, locale = fallbackBlogLocale) {
  const safeSlug = String(slug || '').trim();
  const normalized = normalizeBlogLocale(locale);
  const prefix = normalized === fallbackBlogLocale ? '' : `/${normalized}`;
  return `${prefix}/blog/${safeSlug}.html`;
}

export function absoluteBlogUrl(pathOrSlug, locale = fallbackBlogLocale) {
  const path = String(pathOrSlug || '').startsWith('/') ? pathOrSlug : blogArticlePath(pathOrSlug, locale);
  return `${SITE_ORIGIN}${path}`;
}
