const SITE_ORIGIN = 'https://mc-novatools.com';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.svg`;
const HREFLANG_LOCALES = ['en', 'tr'];

const DEFAULT_ADSENSE_CLIENT = 'ca-pub-5738022526587953';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function normalizeRoute(route) {
  let cleanRoute = String(route || '/').split('?')[0].split('#')[0] || '/';
  cleanRoute = cleanRoute.replace(/\\/g, '/');

  if (cleanRoute.startsWith('/src/tools/')) cleanRoute = cleanRoute.replace(/^\/src\//, '/');
  if (cleanRoute.startsWith('/src/blog/')) cleanRoute = cleanRoute.replace(/^\/src\//, '/');
  if (cleanRoute === '/index.html' || cleanRoute === '/src/index.html') return '/';
  if (cleanRoute.endsWith('/index.html')) return cleanRoute.replace(/index\.html$/, '');
  return cleanRoute.startsWith('/') ? cleanRoute : `/${cleanRoute}`;
}

export function canonicalUrlForRoute(route) {
  return `${SITE_ORIGIN}${normalizeRoute(route)}`;
}

export function removeLegacyGaSnippets(html) {
  return html
    .replace(/\n?\s*<!-- Google Analytics: loaded only after analytics consent -->\s*\n\s*<script type="text\/plain" data-consent-category="analytics" async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]+"><\/script>\s*\n\s*<script type="text\/plain" data-consent-category="analytics">[\s\S]*?gtag\('config',[\s\S]*?<\/script>\s*/g, '\n')
    .replace(/\n?\s*<script type="text\/plain" data-consent-category="analytics" async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]+"><\/script>\s*\n\s*<script type="text\/plain" data-consent-category="analytics">[\s\S]*?gtag\('config',[\s\S]*?<\/script>\s*/g, '\n');
}

export function removeLegacyAdSenseHead(html) {
  return html
    .replace(/\n?\s*<meta\b(?=[^>]*\bname\s*=\s*["']google-adsense-account["'])(?=[^>]*\bcontent\s*=\s*["']ca-pub-[0-9]{16}["'])[^>]*\/?\s*>/gi, '')
    .replace(/\n?\s*<link\b(?=[^>]*\brel\s*=\s*["']dns-prefetch["'])(?=[^>]*\bhref\s*=\s*["']https:\/\/pagead2\.googlesyndication\.com["'])[^>]*\/?\s*>/gi, '')
    .replace(/\n?\s*<script\b(?=[^>]*\bsrc\s*=\s*["']https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-[0-9]{16}[^"']*["'])(?=[^>]*(?:\basync\b|>))(?=[^>]*(?:\bcrossorigin\s*=\s*["']anonymous["']|>))[^>]*>\s*<\/script>/gi, '');
}

export function renderAdSenseHead(adsenseClient = DEFAULT_ADSENSE_CLIENT) {
  const client = String(adsenseClient || '').trim();
  if (!/^ca-pub-[0-9]{16}$/.test(client)) return '';

  const safeClient = escapeHtml(client);
  return `<meta name="google-adsense-account" content="${safeClient}">
<link rel="dns-prefetch" href="https://pagead2.googlesyndication.com">
<script async crossorigin="anonymous" data-adsense="true" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${safeClient}"></script>`;
}

export function renderAnalyticsHead({ gaId = '', gscId = '' } = {}) {
  const safeGaId = escapeHtml(gaId.trim());
  const safeGscId = escapeHtml(gscId.trim());
  const tags = [];

  if (safeGscId) tags.push(`<meta name="google-site-verification" content="${safeGscId}">`);
  if (safeGaId) {
    tags.push(`<!-- Google Analytics: loaded only after analytics consent -->\n<script type="text/plain" data-consent-category="analytics" async src="https://www.googletagmanager.com/gtag/js?id=${safeGaId}"></script>\n<script type="text/plain" data-consent-category="analytics">\n  window.NOVATOOLS_GA_ID = '${safeGaId}';\n</script>`);
  }

  return tags.join('\n');
}


function optimizeImageTags(html) {
  let heroImageSeen = false;
  return html.replace(/<img\b([^>]*)>/gi, (tag, attrs) => {
    let nextTag = tag;
    const src = attrs.match(/\ssrc=["']([^"']+)["']/i)?.[1] || '';
    const isLogo = /logo|favicon|icon/i.test(src);
    const isHero = /class=["'][^"']*(article-visual|hero|featured)[^"']*["']/i.test(attrs) || /loading=["']eager["']/i.test(attrs);
    if (!/\sdecoding=/i.test(nextTag)) nextTag = nextTag.replace(/>$/, ' decoding="async">');
    if (!isLogo && !isHero && !/\sloading=/i.test(nextTag)) nextTag = nextTag.replace(/>$/, ' loading="lazy">');
    if (isHero && !heroImageSeen) {
      heroImageSeen = true;
      nextTag = nextTag.replace(/\sloading=["']lazy["']/i, ' loading="eager"');
      if (!/\sfetchpriority=/i.test(nextTag)) nextTag = nextTag.replace(/>$/, ' fetchpriority="high">');
    } else {
      nextTag = nextTag.replace(/\sfetchpriority=["']high["']/i, '');
    }
    return nextTag;
  });
}

function jsonLdEscape(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function decodeHtmlEntities(value) {
  return String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function stripTags(value) {
  return decodeHtmlEntities(String(value || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function readHeadValue(html, pattern, fallback = '') {
  return stripTags(html.match(pattern)?.[1] || fallback);
}

function routePageType(route) {
  const normalized = normalizeRoute(route);
  if (normalized === '/' || /^\/[a-z]{2}\/?$/.test(normalized)) return 'home';
  if (/^\/(?:[a-z]{2}\/)?(?:tools|finance)\//.test(normalized)) return 'tool';
  if (/^\/(?:[a-z]{2}\/)?categories\//.test(normalized)) return 'category';
  if (/^\/(?:[a-z]{2}\/)?blog(?:\/|$)/.test(normalized)) return 'blog';
  if (/^\/(?:[a-z]{2}\/)?author\//.test(normalized)) return 'author';
  if (/\/(?:about|about-us)(?:\.html)?\/?$/.test(normalized)) return 'about';
  if (/\/contact(?:\.html)?\/?$|\/iletisim(?:\.html)?\/?$/.test(normalized)) return 'contact';
  return 'legal';
}

function routeCategory(route) {
  const normalized = normalizeRoute(route);
  const parts = normalized.replace(/^\//, '').split('/');
  const offset = /^[a-z]{2}$/.test(parts[0] || '') ? 1 : 0;
  if (parts[offset] === 'finance') return 'FinanceApplication';
  if (parts[offset] === 'tools') return categoryApplicationName(parts[offset + 1] || 'tools');
  return 'UtilitiesApplication';
}

function categoryApplicationName(category) {
  const normalized = String(category || '').toLowerCase();
  if (normalized.includes('finance')) return 'FinanceApplication';
  if (normalized.includes('business') || normalized.includes('productivity')) return 'BusinessApplication';
  if (normalized.includes('developer') || normalized.includes('dev') || normalized.includes('security') || normalized.includes('data')) return 'DeveloperApplication';
  if (normalized.includes('design') || normalized.includes('image') || normalized.includes('social')) return 'MultimediaApplication';
  if (normalized.includes('calculator') || normalized.includes('converter') || normalized.includes('pdf') || normalized.includes('text')) return 'UtilitiesApplication';
  return 'UtilitiesApplication';
}

function localizedRoute(route, locale) {
  const normalized = normalizeRoute(route).replace(/^\/(?:en|tr)(?=\/|$)/, '') || '/';
  if (normalized === '/') return `${SITE_ORIGIN}/${locale}/`;
  return `${SITE_ORIGIN}/${locale}${normalized}`;
}

function renderHreflangTags(route) {
  const normalized = normalizeRoute(route).replace(/^\/(?:en|tr)(?=\/|$)/, '') || '/';
  const tags = HREFLANG_LOCALES.map((locale) => `<link rel="alternate" hreflang="${locale}" href="${localizedRoute(normalized, locale)}">`);
  tags.push(`<link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}${normalized}">`);
  return tags.join('\n');
}

function breadcrumbLabel(segment) {
  if (!segment) return 'Home';
  const labels = {
    pdf: 'PDF Tools',
    image: 'Image Tools',
    dev: 'Developer Tools',
    developer: 'Developer Tools',
    finance: 'Finance Tools',
    blog: 'Blog',
    author: 'Author',
    categories: 'Categories'
  };
  return labels[segment] || segment.replace(/\.html$/, '').split('-').filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function breadcrumbItemsForRoute(route, pageTitle) {
  const normalized = normalizeRoute(route).replace(/^\/(?:en|tr)(?=\/|$)/, '') || '/';
  if (normalized === '/') return [];
  const parts = normalized.replace(/^\//, '').replace(/\/$/, '').split('/').filter(Boolean);
  const visibleParts = parts[0] === 'blog' && parts[1] === 'articles' ? [parts[0], ...parts.slice(2)] : parts;
  const items = [{ '@type': 'ListItem', position: 1, name: 'Home', item: SITE_ORIGIN }];
  let current = '';
  visibleParts.forEach((part, index) => {
    current += `/${part}`;
    const isLast = index === visibleParts.length - 1;
    const name = isLast ? stripTags(pageTitle || breadcrumbLabel(part)) : breadcrumbLabel(part);
    const item = isLast ? canonicalUrlForRoute(route) : `${SITE_ORIGIN}${current}${part.endsWith('.html') ? '' : '/'}`;
    items.push({ '@type': 'ListItem', position: items.length + 1, name, item });
  });
  return items;
}

function absoluteUrl(value, fallback = SITE_ORIGIN) {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `${SITE_ORIGIN}${raw.startsWith('/') ? raw : `/${raw}`}`;
}

function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${SITE_ORIGIN}/#organization`,
    name: 'MC NovaTools',
    url: SITE_ORIGIN,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE_ORIGIN}/logo-brand-520.png`,
      width: 512,
      height: 512
    },
    sameAs: [
      'https://github.com/mc-novatools',
      'https://twitter.com/mcnovatools',
      'https://linkedin.com/company/mc-novatools'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: 'support@mc-novatools.com',
      availableLanguage: ['English', 'Turkish', 'German']
    }
  };
}

export function graphRootSchema() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      organizationSchema(),
      {
        '@type': 'WebSite',
        '@id': `${SITE_ORIGIN}/#website`,
        url: SITE_ORIGIN,
        name: 'MC NovaTools — All-in-One Browser Utilities',
        publisher: { '@id': `${SITE_ORIGIN}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${SITE_ORIGIN}/search?q={search_term_string}`
          },
          'query-input': 'required name=search_term_string'
        }
      }
    ]
  };
}

function renderGraphRootSchema() {
  return `<script type="application/ld+json">${jsonLdEscape(graphRootSchema())}</script>`;
}

function softwareDescription(pageData) {
  const base = stripTags(pageData.description || '');
  if (base.length >= 150) return base;
  const name = stripTags(pageData.name || pageData.title || 'This browser tool');
  const extension = `${name} runs in a web browser for practical utility workflows, with clear steps, no required signup, and privacy-first processing designed to keep user inputs local whenever possible.`;
  return `${base ? `${base} ` : ''}${extension}`.slice(0, 500).trim();
}

function toIsoDateTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '2026-06-02T00:00:00+00:00';
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return '2026-06-02T00:00:00+00:00';
  return parsed.toISOString().replace(/\.\d{3}Z$/, '+00:00');
}

function collectCategoryItems(html) {
  const items = [];
  const seen = new Set();
  const linkPattern = /<a\b[^>]*href=["']([^"']*(?:\/tools\/|\/finance\/)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkPattern.exec(html)) && items.length < 100) {
    const href = absoluteUrl(match[1]);
    if (seen.has(href)) continue;
    seen.add(href);
    items.push({ '@type': 'ListItem', position: items.length + 1, name: stripTags(match[2]) || href, url: href });
  }
  return items;
}

export function generateSchemaJsonLd(pageType, pageData = {}, route = '/') {
  const canonical = canonicalUrlForRoute(route);
  const name = stripTags(pageData.name || pageData.title || 'MC NovaTools');
  const description = stripTags(pageData.description || 'MC NovaTools provides privacy-first browser-based utility tools.');
  const image = absoluteUrl(pageData.image || DEFAULT_OG_IMAGE, DEFAULT_OG_IMAGE);
  const organization = organizationSchema();
  let schemas;

  if (pageType === 'home') {
    schemas = [{
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'MC NovaTools',
      url: SITE_ORIGIN,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_ORIGIN}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    }];
  } else if (pageType === 'tool') {
    schemas = [{
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name,
      description: softwareDescription({ ...pageData, name }),
      applicationCategory: categoryApplicationName(pageData.category),
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
      author: { '@type': 'Organization', name: 'MC NovaTools' },
      publisher: { '@type': 'Organization', name: 'MC NovaTools' }
    }];
  } else if (pageType === 'category') {
    schemas = [{
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: pageData.items || []
    }];
  } else if (pageType === 'blog') {
    schemas = [{
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: name,
      author: { '@type': 'Person', name: stripTags(pageData.authorName || 'NovaTools Editorial Review'), url: `${SITE_ORIGIN}/author/novatools-editorial.html` },
      publisher: { '@type': 'Organization', '@id': `${SITE_ORIGIN}/#organization`, name: 'MC NovaTools' },
      datePublished: toIsoDateTime(pageData.datePublished),
      dateModified: toIsoDateTime(pageData.dateModified || pageData.datePublished),
      image
    }];
  } else if (pageType === 'about') {
    schemas = [
      { '@context': 'https://schema.org', '@type': 'AboutPage', name: 'About MC NovaTools', url: canonical },
      { '@context': 'https://schema.org', ...organization }
    ];
  } else if (pageType === 'contact') {
    schemas = [{
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name: 'Contact Us',
      url: canonical,
      mainContentOfPage: { '@type': 'WebPageElement', name: 'Contact form', cssSelector: 'form, #contact-form, [data-contact-form]' }
    }];
  } else if (pageType === 'author') {
    const isMetehan = /metehan-cetin/i.test(route);
    schemas = [{
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': `${canonical}#person`,
      name: isMetehan ? 'Metehan Çetin, LPC' : 'NovaTools Editorial Review',
      jobTitle: isMetehan ? 'Founder, Editor and Browser Workflow Reviewer' : 'Editorial Quality Reviewer',
      url: canonical,
      image: `${SITE_ORIGIN}/assets/authors/${isMetehan ? 'metehan-cetin' : 'novatools-editorial'}.svg`,
      worksFor: { '@id': `${SITE_ORIGIN}/#organization` },
      alumniOf: { '@type': 'EducationalOrganization', name: isMetehan ? 'Professional counseling and applied web-product training' : 'MC NovaTools editorial workflow training' },
      knowsAbout: ['PDF Processing', 'Image Optimization', 'Web Development'],
      sameAs: ['https://linkedin.com/company/mc-novatools', 'https://github.com/mc-novatools', 'https://twitter.com/mcnovatools']
    }];
  } else if (pageType === 'legal') {
    schemas = [{
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name,
      description
    }];
  } else {
    return '';
  }

  return schemas.map((schema) => `<script type="application/ld+json">${jsonLdEscape(schema)}</script>`).join('\n');
}

function breadcrumbSchemaForRoute(route, pageTitle) {
  const itemListElement = breadcrumbItemsForRoute(route, pageTitle);
  if (itemListElement.length < 2) return '';
  return `<script type="application/ld+json">${jsonLdEscape({ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement })}</script>`;
}


function removePhase5Schema(html) {
  return html.replace(/\n?\s*<script\b(?=[^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>\s*/gi, '\n');
}

function readFirstH1(html, fallback = '') {
  return stripTags(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || fallback);
}

function readMetaContent(html, key, fallback = '') {
  const pattern = new RegExp(`<meta\\b(?=[^>]*(?:name|property)=["']${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'])(?=[^>]*\\bcontent=["']([^"']*)["'])[^>]*>`, 'i');
  return stripTags(html.match(pattern)?.[1] || fallback);
}

function readArticleDate(html, property, fallback = '') {
  return readMetaContent(html, property, '')
    || stripTags(html.match(new RegExp(`"${property === 'article:modified_time' ? 'dateModified' : 'datePublished'}"\\s*:\\s*"([^"]+)"`, 'i'))?.[1] || '')
    || stripTags(html.match(/<time\b[^>]*datetime=["']([^"']+)["'][^>]*>/i)?.[1] || '')
    || fallback;
}

function schemaForHtml(html, route, pageTitle, description, image) {
  const pageType = routePageType(route);
  const schema = generateSchemaJsonLd(pageType, {
    name: pageTitle,
    title: pageTitle,
    description,
    category: routeCategory(route),
    items: pageType === 'category' ? collectCategoryItems(html) : undefined,
    authorName: readMetaContent(html, 'author', 'NovaTools Editorial Review'),
    datePublished: readArticleDate(html, 'article:published_time', '2026-06-02T00:00:00+00:00'),
    dateModified: readArticleDate(html, 'article:modified_time', readArticleDate(html, 'article:published_time', '2026-06-02T00:00:00+00:00')),
    image
  }, route);
  return schema;
}

function localeForRoute(route) {
  const normalized = normalizeRoute(route);
  if (normalized.startsWith('/tr/') || normalized.includes('lang=tr')) return 'tr_TR';
  return 'en_US';
}

function upsertTag(html, pattern, tag) {
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace(/<\/head>/i, `  ${tag}\n</head>`);
}


function renderVisibleBreadcrumb(route, pageTitle) {
  const items = breadcrumbItemsForRoute(route, pageTitle);
  if (items.length < 2) return '';
  const links = items.map((item, index) => {
    const isLast = index === items.length - 1;
    const label = escapeHtml(item.name);
    if (isLast) return `<span aria-current="page">${label}</span>`;
    const href = item.item === SITE_ORIGIN ? '/' : item.item.replace(SITE_ORIGIN, '') || '/';
    return `<a href="${escapeHtml(href)}">${label}</a>`;
  }).join('<span class="breadcrumb-sep" aria-hidden="true">›</span>');
  return `<nav class="breadcrumb seo-breadcrumb" aria-label="Breadcrumb">${links}</nav>`;
}

function injectVisibleBreadcrumb(html, route, pageTitle) {
  if (normalizeRoute(route) === '/' || /aria-label=["']Breadcrumb["']/i.test(html)) return html;
  const breadcrumb = renderVisibleBreadcrumb(route, pageTitle);
  if (!breadcrumb) return html;
  if (/<main\b[^>]*>/i.test(html)) return html.replace(/<main\b([^>]*)>/i, `<main$1>\n  ${breadcrumb}`);
  return html.replace(/<body\b([^>]*)>/i, `<body$1>\n  ${breadcrumb}`);
}

export function applySeoHead(html, route, { gaId = '', gscId = '', adsenseClient = DEFAULT_ADSENSE_CLIENT } = {}) {
  const canonical = canonicalUrlForRoute(route);
  let nextHtml = removeLegacyAdSenseHead(html);
  nextHtml = removeLegacyGaSnippets(nextHtml);
  nextHtml = removePhase5Schema(nextHtml);

  const existingTitle = readHeadValue(nextHtml, /<title\b[^>]*>([\s\S]*?)<\/title>/i, 'MC NovaTools');
  const title = readFirstH1(nextHtml, existingTitle) || existingTitle;
  const description = readHeadValue(nextHtml, /<meta\b(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i, `${title} from MC NovaTools, a privacy-first browser utility collection.`);
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description.length > 200 ? `${description.slice(0, 197).replace(/\s+\S*$/, '')}...` : description);
  const ogType = routePageType(route) === 'blog' ? 'article' : 'website';
  const locale = localeForRoute(route);

  nextHtml = upsertTag(nextHtml, /<title\b[^>]*>[\s\S]*?<\/title>/i, `<title>${escapedTitle}</title>`);
  nextHtml = upsertTag(nextHtml, /<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapedDescription}">`);
  nextHtml = upsertTag(nextHtml, /<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}">`);
  nextHtml = nextHtml.replace(/\n?\s*<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=)[^>]*>\s*/gi, '\n');
  nextHtml = nextHtml.replace(/<\/head>/i, `${renderHreflangTags(route)}\n</head>`);
  nextHtml = upsertTag(nextHtml, /<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${escapedTitle}">`);
  nextHtml = upsertTag(nextHtml, /<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${escapedDescription}">`);
  nextHtml = upsertTag(nextHtml, /<meta property="og:type" content="[^"]*"\s*\/?>/i, `<meta property="og:type" content="${ogType}">`);
  nextHtml = upsertTag(nextHtml, /<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonical}">`);
  const socialImage = DEFAULT_OG_IMAGE;
  nextHtml = upsertTag(nextHtml, /<meta property="og:image" content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${socialImage}">`);
  nextHtml = upsertTag(nextHtml, /<meta property="og:image:width" content="[^"]*"\s*\/?>/i, '<meta property="og:image:width" content="1200">');
  nextHtml = upsertTag(nextHtml, /<meta property="og:image:height" content="[^"]*"\s*\/?>/i, '<meta property="og:image:height" content="630">');
  nextHtml = upsertTag(nextHtml, /<meta property="og:site_name" content="[^"]*"\s*\/?>/i, '<meta property="og:site_name" content="MC NovaTools">');
  nextHtml = upsertTag(nextHtml, /<meta property="og:locale" content="[^"]*"\s*\/?>/i, `<meta property="og:locale" content="${locale}">`);
  nextHtml = upsertTag(nextHtml, /<meta name="twitter:card" content="[^"]*"\s*\/?>/i, '<meta name="twitter:card" content="summary_large_image">');
  nextHtml = upsertTag(nextHtml, /<meta name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${escapedTitle}">`);
  nextHtml = upsertTag(nextHtml, /<meta name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${escapedDescription}">`);
  nextHtml = upsertTag(nextHtml, /<meta name="twitter:image" content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${socialImage}">`);

  nextHtml = injectVisibleBreadcrumb(nextHtml, route, title);

  nextHtml = optimizeImageTags(nextHtml);

  const schemaHead = [renderGraphRootSchema(), schemaForHtml(nextHtml, route, title, description, socialImage)].filter(Boolean).join('\n');
  if (schemaHead) nextHtml = nextHtml.replace(/<\/head>/i, `  ${schemaHead}\n</head>`);

  nextHtml = nextHtml.replace(/\s*<meta name="google-site-verification" content="[^"]*"\s*\/?>/i, '');
  const adSenseHead = renderAdSenseHead(adsenseClient);
  if (adSenseHead) nextHtml = nextHtml.replace(/<\/head>/i, `${adSenseHead}\n</head>`);

  const analyticsHead = renderAnalyticsHead({ gaId, gscId });
  if (analyticsHead) nextHtml = nextHtml.replace(/<\/head>/i, `${analyticsHead}\n</head>`);

  return nextHtml;
}
