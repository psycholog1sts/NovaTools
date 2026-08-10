export const localeRouteManifest = Object.freeze({
  alwaysLocalized: [
    '/',
    '/about-us/',
    '/contact/',
    '/privacy-policy/',
    '/terms-of-service/',
    '/cookie-policy/',
    '/security/'
  ],
  generatedFamilies: ['/categories/', '/tools/'],
  approvedTurkishArticles: []
});

export function routeSupportsLocale(pathname, locale) {
  if (locale === 'en') return true;
  if (locale !== 'tr') return false;

  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (localeRouteManifest.alwaysLocalized.includes(path)) return true;
  if (localeRouteManifest.generatedFamilies.some((prefix) => path.startsWith(prefix))) return true;
  return localeRouteManifest.approvedTurkishArticles.some(
    (article) => path === `/blog/articles/${article}/`
  );
}
