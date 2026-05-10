const SUPPORTED_LOCALES = ['en', 'tr', 'de', 'fr', 'es', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'it', 'pl', 'nl'];
const PATH_PREFIX_LOCALES = new Set(['tr', 'ar']);
const DEFAULT_LOCALE = 'en';
const RTL_LOCALES = new Set(['ar']);
const SITE_ORIGIN = 'https://mc-novatools.com';

export const contentAvailability = {
  categories: {},
  tools: {},
  blog: {
      "high-yield-savings-guide": [
          "en",
          "tr",
          "ar"
      ],
      "personal-loan-vs-credit-card": [
          "en",
          "tr",
          "ar"
      ],
      "auto-insurance-savings": [
          "en",
          "tr",
          "ar"
      ],
      "health-insurance-marketplace": [
          "en",
          "tr",
          "ar"
      ],
      "best-credit-cards-2026": [
          "en",
          "tr",
          "ar"
      ],
      "student-loan-repayment": [
          "en",
          "tr",
          "ar"
      ],
      "emergency-fund-guide": [
          "en",
          "tr",
          "ar"
      ],
      "credit-score-hacks": [
          "en",
          "tr",
          "ar"
      ],
      "401k-rollover-guide": [
          "en",
          "tr",
          "ar"
      ],
      "nft-tax-guide": [
          "en",
          "tr",
          "ar"
      ],
      "index-funds-vs-etfs": [
          "en",
          "tr",
          "ar"
      ],
      "term-vs-whole-life": [
          "en",
          "tr",
          "ar"
      ],
      "first-time-home-buyer": [
          "en",
          "tr",
          "ar"
      ],
      "tax-deductions-homeowners": [
          "en",
          "tr",
          "ar"
      ],
      "halal-mortgage-usa": [
          "en",
          "tr",
          "ar"
      ],
      "cloud-cost-comparison": [
          "en",
          "tr",
          "ar"
      ],
      "life-insurance-coverage-guide": [
          "en",
          "tr",
          "ar"
      ],
      "zakat-investments-guide": [
          "en",
          "tr",
          "ar"
      ],
      "pdf-financial-records": [
          "en",
          "tr",
          "ar"
      ],
      "mortgage-refinancing-guide": [
          "en",
          "tr",
          "ar"
      ],
      "islamic-finance-investing": [
          "en",
          "tr",
          "ar"
      ],
      "crypto-tax-guide": [
          "en",
          "tr",
          "ar"
      ],
      "retirement-planning-millennials": [
          "en",
          "tr",
          "ar"
      ],
      "pmi-removal-guide": [
          "en",
          "tr",
          "ar"
      ],
      "debt-consolidation-guide": [
          "en",
          "tr",
          "ar"
      ],
      "pdf-to-word-when-to-convert-and-when-not-to": [
          "en",
          "tr",
          "ar"
      ],
      "pdf-to-text-clean-extraction-workflow": [
          "en",
          "tr",
          "ar"
      ],
      "transparent-background-image-workflow": [
          "en",
          "tr",
          "ar"
      ],
      "compress-pdf-for-email-without-ruining-readability": [
          "en",
          "tr",
          "ar"
      ],
      "slug-generator-url-cleanup-guide": [
          "en",
          "tr",
          "ar"
      ]
  }
};

export function stripLocalePrefix(pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  const firstSegment = String(pathname || '/').split('/').filter(Boolean)[0];
  if (PATH_PREFIX_LOCALES.has(firstSegment)) {
    const stripped = String(pathname || '/').replace(new RegExp(`^/(${[...PATH_PREFIX_LOCALES].join('|')})(?=/|$)`), '') || '/';
    return stripped.startsWith('/') ? stripped : `/${stripped}`;
  }
  return String(pathname || '/').startsWith('/') ? String(pathname || '/') : `/${pathname}`;
}

export function localeFromPath(pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  const firstSegment = String(pathname || '').split('/').filter(Boolean)[0];
  return PATH_PREFIX_LOCALES.has(firstSegment) ? firstSegment : DEFAULT_LOCALE;
}

export function detectLocale() {
  const params = new URLSearchParams(window.location.search);
  const queryLocale = params.get('lang');
  if (SUPPORTED_LOCALES.includes(queryLocale)) return queryLocale;

  const pathLocale = localeFromPath(window.location.pathname);
  if (pathLocale !== DEFAULT_LOCALE) return pathLocale;

  try {
    const stored = localStorage.getItem('mc-novatools-language');
    if (SUPPORTED_LOCALES.includes(stored)) return stored;
  } catch {
    // localStorage can be unavailable in private or embedded contexts.
  }

  const browserLocale = String(navigator.language || DEFAULT_LOCALE).split('-')[0].toLowerCase();
  return SUPPORTED_LOCALES.includes(browserLocale) ? browserLocale : DEFAULT_LOCALE;
}

export function localizedPath(locale, pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  const basePath = stripLocalePrefix(pathname);
  return PATH_PREFIX_LOCALES.has(locale) ? `/${locale}${basePath === '/' ? '/' : basePath}` : basePath;
}

export function localizedSearch(locale, search = typeof window !== 'undefined' ? window.location.search : '') {
  const params = new URLSearchParams(search || '');
  params.delete('lang');
  if (locale !== DEFAULT_LOCALE && !PATH_PREFIX_LOCALES.has(locale)) params.set('lang', locale);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function localizedHref(locale, pathname = typeof window !== 'undefined' ? window.location.pathname : '/', search = typeof window !== 'undefined' ? window.location.search : '') {
  return `${localizedPath(locale, pathname)}${localizedSearch(locale, search)}`;
}

export function getCanonicalUrl(locale = detectLocale(), pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  return `${SITE_ORIGIN}${localizedHref(locale, pathname)}`;
}

export function getHreflangLinks(pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  return [
    ...SUPPORTED_LOCALES.map((locale) => ({ hreflang: locale, href: getCanonicalUrl(locale, pathname) })),
    { hreflang: 'x-default', href: getCanonicalUrl('en', pathname) }
  ];
}

export function setDocumentLocale(locale = detectLocale()) {
  document.documentElement.lang = locale;
  document.documentElement.dir = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
  return locale;
}

export function markNoindex(reason = 'localized-content-unavailable') {
  let robots = document.head.querySelector('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement('meta');
    robots.name = 'robots';
    document.head.appendChild(robots);
  }
  robots.content = 'noindex, follow';
  document.documentElement.dataset.noindexReason = reason;
}

export function applySeoLinks(locale = detectLocale(), pathname = typeof window !== 'undefined' ? window.location.pathname : '/') {
  document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((link) => link.remove());

  getHreflangLinks(pathname).forEach(({ hreflang, href }) => {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = hreflang;
    link.href = href;
    document.head.appendChild(link);
  });

  let canonical = document.head.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.appendChild(canonical);
  }
  canonical.href = getCanonicalUrl(locale, pathname);
}

export function isContentAvailable(kind, slug, locale = detectLocale()) {
  const availableLocales = contentAvailability[kind]?.[slug];
  if (!availableLocales) return true;
  return availableLocales.includes(locale);
}

export { DEFAULT_LOCALE, SUPPORTED_LOCALES };
