const SITE_ORIGIN = 'https://mc-novatools.com';
const SITE_NAME = 'NovaTools';
const SUPPORTED_LOCALES = ['en', 'tr'];
const DEFAULT_LOCALE = 'en';
const DESCRIPTION_LIMIT = 160;
const TITLE_LIMIT = 60;

const HOME_COPY = {
  en: {
    title: 'NovaTools – Free Online Tools for PDF, Image, Text & More',
    description: '110+ free online tools for PDF editing, image processing, text analysis, and finance calculations. Your data stays in your browser; no signup required.'
  },
  tr: {
    title: 'NovaTools – Ücretsiz Araçlar | PDF, Görüntü ve Metin',
    description: '110+ ücretsiz online araç; PDF düzenleme, görüntü işleme, metin analizi ve finans hesaplamaları. Verileriniz tarayıcınızda kalır, kayıt gerekmez.'
  },
  ar: {
    title: 'NovaTools – أدوات مجانية للملفات والصور والنصوص',
    description: 'أكثر من 110 أدوات مجانية عبر الإنترنت لملفات PDF والصور والنصوص والحسابات المالية. تبقى بياناتك في متصفحك ولا يلزم التسجيل.'
  }
};

const LEGAL_TITLES = {
  'about-us': 'About Us',
  contact: 'Contact',
  'privacy-policy': 'Privacy Policy',
  'terms-of-service': 'Terms of Service',
  'cookie-policy': 'Cookie Policy',
  security: 'Security',
  'request-tool': 'Request a Tool'
};

function normalizeLocale(locale = DEFAULT_LOCALE) {
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

function compactText(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

export function truncateText(value, maxLength = DESCRIPTION_LIMIT) {
  const text = compactText(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function trimTitle(value) {
  return truncateText(value, TITLE_LIMIT);
}

export function getSiteOrigin() {
  return SITE_ORIGIN;
}

export function getCurrentLocale() {
  const lang = document.documentElement.lang || DEFAULT_LOCALE;
  return normalizeLocale(lang.split('-')[0]);
}

export function cleanPath(pathname = window.location.pathname) {
  let path = pathname || '/';
  path = path.replace(/^\/(en)\//, '/');
  path = path.replace(/^\/(tr|ar)\//, '/');
  if (path === '/en') return '/';
  if (path === '/tr' || path === '/ar') return '/';
  return path || '/';
}

export function absoluteUrl(path = '/') {
  if (/^https?:\/\//i.test(path)) {
    const url = new URL(path);
    return `${SITE_ORIGIN}${url.pathname}`;
  }
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_ORIGIN}${clean}`;
}

export function localizedUrl(path = '/', locale = DEFAULT_LOCALE) {
  const clean = cleanPath(path);
  const lang = normalizeLocale(locale);
  if (clean === '/') return `${SITE_ORIGIN}/${lang}/`;
  return `${SITE_ORIGIN}/${lang}${clean}`;
}

function ensureMeta(selector, attrs) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function ensureLink(selector, attrs) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('link');
    document.head.appendChild(element);
  }
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

export function setCanonical(url = window.location.href) {
  const canonical = absoluteUrl(new URL(url, SITE_ORIGIN).pathname);
  ensureLink('link[rel="canonical"]', { rel: 'canonical', href: canonical });
  return canonical;
}

export function setHreflang(alternates = []) {
  document.head.querySelectorAll('link[rel="alternate"][data-seo="hreflang"]').forEach((item) => item.remove());
  alternates.forEach(({ hreflang, href }) => {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = hreflang;
    link.href = href;
    link.dataset.seo = 'hreflang';
    document.head.appendChild(link);
  });
}

export function buildHreflang(path = window.location.pathname) {
  const clean = cleanPath(path);
  return [
    ...SUPPORTED_LOCALES.map((locale) => ({ hreflang: locale, href: localizedUrl(clean, locale) })),
    { hreflang: 'x-default', href: absoluteUrl(clean) }
  ];
}

export function upsertJsonLd(id, data) {
  if (!data) return null;
  let element = document.getElementById(id);
  if (!element) {
    element = document.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(data);
  return element;
}

export function buildMeta({ type, locale = getCurrentLocale(), title, description, category, toolName, action, advantages = [], pageName, summary } = {}) {
  const lang = normalizeLocale(locale);
  if (type === 'home') return HOME_COPY[lang] || HOME_COPY.en;
  if (type === 'category') {
    const categoryName = category || 'Online';
    return {
      title: trimTitle(`${categoryName} Tools – Free Online | NovaTools`),
      description: truncateText(`Free online tools for ${categoryName}. Edit, convert, and analyze your ${categoryName.toLowerCase()} files quickly. No signup required.`)
    };
  }
  if (type === 'tool') {
    const categoryName = category || 'Online';
    const safeToolName = toolName || 'Online Tool';
    const benefitText = advantages.filter(Boolean).slice(0, 2).join(', ') || 'fast browser-based workflow, practical guidance';
    return {
      title: trimTitle(`${safeToolName} – Free Online ${categoryName} Tool | NovaTools`),
      description: truncateText(`${safeToolName} lets you ${action || 'complete this task'} free online. ${benefitText}. Try it now; no signup required.`)
    };
  }
  if (type === 'blog') {
    return {
      title: trimTitle(`${title || 'Article'} | NovaTools Blog`),
      description: truncateText(summary || description || '', DESCRIPTION_LIMIT)
    };
  }
  if (type === 'legal') {
    const name = pageName || LEGAL_TITLES[cleanPath().replace(/^\//, '').replace(/\.html$/, '')] || 'Page';
    return {
      title: trimTitle(`${name} | NovaTools`),
      description: truncateText(description || `${name} information for NovaTools users.`)
    };
  }
  return { title: trimTitle(title || document.title), description: truncateText(description || '') };
}

export function applySeo(options = {}) {
  const meta = buildMeta(options);
  if (meta.title) document.title = meta.title;
  if (meta.description) ensureMeta('meta[name="description"]', { name: 'description', content: meta.description });

  const canonicalUrl = setCanonical(options.path || window.location.pathname);
  setHreflang(options.alternates || buildHreflang(options.path || window.location.pathname));

  ensureMeta('meta[property="og:title"]', { property: 'og:title', content: meta.title });
  ensureMeta('meta[property="og:description"]', { property: 'og:description', content: meta.description });
  ensureMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
  ensureMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
  ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: meta.title });
  ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: meta.description });

  return { ...meta, canonicalUrl };
}

export function buildHomeSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        name: 'NovaTools',
        url: `${SITE_ORIGIN}/`,
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE_ORIGIN}/?q={search_term_string}`,
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'Organization',
        name: 'NovaTools',
        url: `${SITE_ORIGIN}/`,
        logo: `${SITE_ORIGIN}/logo-brand.png`
      }
    ]
  };
}

export function buildBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.url)
    }))
  };
}

export function buildItemListSchema(name, items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.url)
    }))
  };
}

export function buildSoftwareApplicationSchema({ name, description, category, url, features = [], rating } = {}) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    applicationCategory: category || 'UtilityApplication',
    operatingSystem: 'Any',
    url: absoluteUrl(url || window.location.pathname),
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    isAccessibleForFree: true
  };
  if (features.length) schema.featureList = features;
  if (rating?.ratingValue && rating?.ratingCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: String(rating.ratingValue),
      ratingCount: String(rating.ratingCount)
    };
  }
  return schema;
}

export function buildFAQSchema(faqs = []) {
  if (!faqs.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer }
    }))
  };
}
