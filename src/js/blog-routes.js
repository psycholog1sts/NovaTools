export const SITE_ORIGIN = 'https://mc-novatools.com';
export const fallbackBlogLocale = 'en';
export const supportedBlogLocales = ['en', 'tr', 'de', 'fr', 'es', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'it', 'pl', 'nl'];
export const BLOG_ARTICLE_SEGMENT = 'articles';

const BLOG_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeBlogLocale(locale) {
  const normalized = String(locale || '').toLowerCase().split('-')[0];
  return supportedBlogLocales.includes(normalized) ? normalized : fallbackBlogLocale;
}

export function normalizeBlogSlug(slug) {
  const normalized = String(slug || '').trim().toLowerCase();
  if (!BLOG_SLUG_PATTERN.test(normalized)) {
    throw new Error(`Invalid blog article slug: ${slug || '(empty)'}`);
  }
  return normalized;
}

export function blogLocaleFromPath(pathname = '/') {
  const [, candidate] = String(pathname).match(/^\/([a-z]{2})(?:\/|$)/) || [];
  return supportedBlogLocales.includes(candidate) ? candidate : null;
}

export function blogHubPath(locale = fallbackBlogLocale) {
  const normalized = normalizeBlogLocale(locale);
  return normalized === fallbackBlogLocale ? '/blog/index.html' : `/${normalized}/blog/index.html`;
}

function blogRoutePrefix(locale = fallbackBlogLocale) {
  const normalized = normalizeBlogLocale(locale);
  return normalized === fallbackBlogLocale ? '' : `/${normalized}`;
}

export function blogArticlePath(slug, locale = fallbackBlogLocale) {
  const safeSlug = normalizeBlogSlug(slug);
  return `${blogRoutePrefix(locale)}/blog/${BLOG_ARTICLE_SEGMENT}/${safeSlug}.html`;
}

export function legacyBlogArticlePath(slug, locale = fallbackBlogLocale) {
  const safeSlug = normalizeBlogSlug(slug);
  return `${blogRoutePrefix(locale)}/blog/${safeSlug}.html`;
}

export function blogArticleRoutes(slug, locale = fallbackBlogLocale) {
  return {
    canonicalPath: blogArticlePath(slug, locale),
    legacyPath: legacyBlogArticlePath(slug, locale)
  };
}

export function normalizeBlogSlugList(slugs = []) {
  return [...new Set(slugs.map((slug) => normalizeBlogSlug(slug)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

export function buildBlogSlugsByLocale(slugsByLocale = {}, extraSlugs = []) {
  const fallbackSlugs = normalizeBlogSlugList([...(slugsByLocale[fallbackBlogLocale] || []), ...extraSlugs]);
  return supportedBlogLocales.reduce((acc, locale) => {
    acc[locale] = normalizeBlogSlugList([...fallbackSlugs, ...(slugsByLocale[locale] || [])]);
    return acc;
  }, {});
}

export function blogRouteKeyFromPath(routePath) {
  return String(routePath || '').replace(/^\//, '').replace(/\.html$/, '');
}

export function blogRoutePathFromKey(routeKey) {
  const cleanKey = String(routeKey || '').replace(/^\//, '').replace(/\.html$/, '');
  return `/${cleanKey}.html`;
}

export function blogArticleRouteKeys(slug, locale = fallbackBlogLocale) {
  const routes = blogArticleRoutes(slug, locale);
  return {
    canonicalKey: blogRouteKeyFromPath(routes.canonicalPath),
    legacyKey: blogRouteKeyFromPath(routes.legacyPath)
  };
}

export function resolveBlogRoute(pathname = '/') {
  const path = String(pathname || '/').split(/[?#]/)[0] || '/';
  const locale = blogLocaleFromPath(path) || fallbackBlogLocale;
  const unprefixedPath = locale === fallbackBlogLocale ? path : path.replace(new RegExp(`^/${locale}(?=/|$)`), '') || '/';

  if (/^\/blog\/?(?:index\.html)?$/.test(unprefixedPath)) {
    return {
      type: 'hub',
      locale,
      path,
      canonicalPath: blogHubPath(locale)
    };
  }

  const articleMatch = unprefixedPath.match(/^\/blog\/(?:articles\/)?([^/.]+)(?:\.html)?\/?$/);
  if (!articleMatch) {
    return {
      type: 'unknown',
      locale,
      path,
      canonicalPath: null
    };
  }

  let slug;
  try {
    slug = normalizeBlogSlug(articleMatch[1]);
  } catch {
    return {
      type: 'unknown',
      locale,
      path,
      canonicalPath: null
    };
  }
  const isLegacy = !unprefixedPath.includes(`/${BLOG_ARTICLE_SEGMENT}/`);
  return {
    type: 'article',
    locale,
    slug,
    isLegacy,
    path,
    canonicalPath: blogArticlePath(slug, locale),
    legacyPath: legacyBlogArticlePath(slug, locale)
  };
}

export function buildBlogArticleRouteEntries(slugsByLocale, resolveHtmlEntry) {
  return Object.entries(slugsByLocale).reduce((acc, [locale, slugs]) => {
    slugs.forEach((slug) => {
      const { canonicalKey, legacyKey } = blogArticleRouteKeys(slug, locale);
      acc[canonicalKey] = resolveHtmlEntry('src/blog/article-template.html');
      acc[legacyKey] = resolveHtmlEntry('src/blog/article-template.html');
    });
    return acc;
  }, {});
}

export function absoluteBlogUrl(pathOrSlug, locale = fallbackBlogLocale) {
  const path = String(pathOrSlug || '').startsWith('/') ? pathOrSlug : blogArticlePath(pathOrSlug, locale);
  return `${SITE_ORIGIN}${path}`;
}
