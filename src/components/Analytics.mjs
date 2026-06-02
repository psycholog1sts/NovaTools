const SITE_ORIGIN = 'https://mc-novatools.com';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.svg`;

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

  if (cleanRoute.startsWith('/src/tools/finance/')) cleanRoute = cleanRoute.replace(/^\/src\/tools\/finance\//, '/finance/');
  if (cleanRoute.startsWith('/tools/finance/')) cleanRoute = cleanRoute.replace(/^\/tools\/finance\//, '/finance/');
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
    .replace(/\n?\s*<meta\b(?=[^>]*\bname=["']google-adsense-account["'])[^>]*\/?>/gi, '')
    .replace(/\n?\s*<script\b(?=[^>]*\bsrc=["']https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=[^"']*["'])[^>]*>\s*<\/script>/gi, '')
    .replace(/\n?\s*<script\b(?=[^>]*\bsrc=["']https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=[^"']*["'])[^>]*\/?>/gi, '');
}

export function renderAdSenseHead(adsenseClient = DEFAULT_ADSENSE_CLIENT) {
  const client = String(adsenseClient || '').trim();
  if (!/^ca-pub-[0-9]{16}$/.test(client)) return '';

  const safeClient = escapeHtml(client);
  return `<meta name="google-adsense-account" content="${safeClient}">
<link rel="dns-prefetch" href="https://pagead2.googlesyndication.com">`;
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
  if (/^\/(?:ar\/)?(?:tools|finance)\//.test(normalized)) return 'tool';
  if (/^\/(?:ar\/)?categories\//.test(normalized)) return 'category';
  if (/^\/(?:[a-z]{2}\/)?blog(?:\/|$)/.test(normalized)) return 'blog';
  if (/\/(?:about|about-us)(?:\.html)?\/?$/.test(normalized)) return 'about';
  if (/\/contact(?:\.html)?\/?$|\/iletisim(?:\.html)?\/?$/.test(normalized)) return 'contact';
  return 'legal';
}

function routeCategory(route) {
  const normalized = normalizeRoute(route);
  const parts = normalized.replace(/^\//, '').split('/');
  const offset = parts[0] === 'ar' ? 1 : 0;
  if (parts[offset] === 'finance') return 'finance';
  if (parts[offset] === 'tools') return parts[offset + 1] || 'tools';
  return 'tools';
}

function organizationSchema() {
  return {
    '@type': 'Organization',
    name: 'MC NovaTools',
    url: SITE_ORIGIN,
    logo: `${SITE_ORIGIN}/logo-brand-260.webp`,
    sameAs: [
      'https://www.linkedin.com/company/mc-novatools',
      'https://twitter.com/mcnovatools',
      'https://github.com/mc-novatools'
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: '[CONTACT_EMAIL]',
      availableLanguage: ['English', 'Turkish']
    }
  };
}

function collectCategoryItems(html) {
  const items = [];
  const seen = new Set();
  const linkPattern = /<a\b[^>]*href=["']([^"']*(?:\/tools\/|\/finance\/)[^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkPattern.exec(html)) && items.length < 100) {
    const href = match[1].startsWith('http') ? match[1] : `${SITE_ORIGIN}${match[1].startsWith('/') ? match[1] : `/${match[1]}`}`;
    if (seen.has(href)) continue;
    seen.add(href);
    items.push({ '@type': 'ListItem', position: items.length + 1, url: href, name: stripTags(match[2]) || href });
  }
  return items;
}

export function generateSchemaJsonLd(pageType, pageData = {}, route = '/') {
  const canonical = canonicalUrlForRoute(route);
  const name = pageData.title || 'MC NovaTools';
  const description = pageData.description || 'MC NovaTools provides privacy-first browser-based utility tools.';
  const image = pageData.image || DEFAULT_OG_IMAGE;
  const organization = organizationSchema();
  let schema;

  if (pageType === 'home') {
    schema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'MC NovaTools',
      url: SITE_ORIGIN,
      potentialAction: {
        '@type': 'SearchAction',
        target: `${SITE_ORIGIN}/search?q={search_term_string}`,
        'query-input': 'required name=search_term_string'
      }
    };
  } else if (pageType === 'tool') {
    schema = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name,
      description,
      url: canonical,
      applicationCategory: pageData.category || 'Browser utility',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      aggregateRating: { '@type': 'AggregateRating', ratingValue: '5', reviewCount: '1' },
      author: organization
    };
  } else if (pageType === 'category') {
    schema = {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name,
      description,
      url: canonical,
      itemListElement: pageData.items || []
    };
  } else if (pageType === 'blog') {
    schema = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: name,
      description,
      url: canonical,
      image,
      author: { '@type': 'Organization', name: 'MC NovaTools', url: SITE_ORIGIN },
      datePublished: pageData.datePublished || '2026-06-02T00:00:00.000Z',
      dateModified: pageData.dateModified || '2026-06-02T00:00:00.000Z',
      publisher: organization
    };
  } else if (pageType === 'about') {
    schema = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'AboutPage', name, description, url: canonical, publisher: organization },
        organization
      ]
    };
  } else if (pageType === 'contact') {
    schema = {
      '@context': 'https://schema.org',
      '@type': 'ContactPage',
      name,
      description,
      url: canonical,
      publisher: organization,
      mainEntity: organization.contactPoint
    };
  } else {
    schema = {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name,
      description,
      url: canonical,
      publisher: organization
    };
  }

  return `<script type="application/ld+json">${jsonLdEscape(schema)}</script>`;
}

function removePhase5Schema(html) {
  return html.replace(/\n?\s*<script\b[^>]*data-schema-source=["']phase5["'][^>]*>[\s\S]*?<\/script>\s*/gi, '\n');
}

function schemaForHtml(html, route) {
  const title = readHeadValue(html, /<title\b[^>]*>([\s\S]*?)<\/title>/i, 'MC NovaTools');
  const description = readHeadValue(html, /<meta\b(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i, 'MC NovaTools privacy-first browser tools.');
  const pageType = routePageType(route);
  const schema = generateSchemaJsonLd(pageType, {
    title,
    description,
    category: routeCategory(route),
    items: pageType === 'category' ? collectCategoryItems(html) : undefined,
    image: DEFAULT_OG_IMAGE
  }, route);
  return schema.replace('<script ', '<script data-schema-source="phase5" ');
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

export function applySeoHead(html, route, { gaId = '', gscId = '', adsenseClient = DEFAULT_ADSENSE_CLIENT } = {}) {
  const canonical = canonicalUrlForRoute(route);
  let nextHtml = removeLegacyAdSenseHead(html);
  nextHtml = removeLegacyGaSnippets(nextHtml);
  nextHtml = removePhase5Schema(nextHtml);

  const title = readHeadValue(nextHtml, /<title\b[^>]*>([\s\S]*?)<\/title>/i, 'MC NovaTools');
  const description = readHeadValue(nextHtml, /<meta\b(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i, 'MC NovaTools privacy-first browser tools.');
  const escapedTitle = escapeHtml(title);
  const escapedDescription = escapeHtml(description.length > 200 ? `${description.slice(0, 197).replace(/\s+\S*$/, '')}...` : description);
  const ogType = routePageType(route) === 'blog' ? 'article' : 'website';
  const locale = localeForRoute(route);

  nextHtml = upsertTag(nextHtml, /<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapedDescription}">`);
  nextHtml = upsertTag(nextHtml, /<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}">`);
  nextHtml = upsertTag(nextHtml, /<meta property="og:title" content="[^"]*"\s*\/?>/i, `<meta property="og:title" content="${escapedTitle}">`);
  nextHtml = upsertTag(nextHtml, /<meta property="og:description" content="[^"]*"\s*\/?>/i, `<meta property="og:description" content="${escapedDescription}">`);
  nextHtml = upsertTag(nextHtml, /<meta property="og:type" content="[^"]*"\s*\/?>/i, `<meta property="og:type" content="${ogType}">`);
  nextHtml = upsertTag(nextHtml, /<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonical}">`);
  nextHtml = upsertTag(nextHtml, /<meta property="og:image" content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${DEFAULT_OG_IMAGE}">`);
  nextHtml = upsertTag(nextHtml, /<meta property="og:image:width" content="[^"]*"\s*\/?>/i, '<meta property="og:image:width" content="1200">');
  nextHtml = upsertTag(nextHtml, /<meta property="og:image:height" content="[^"]*"\s*\/?>/i, '<meta property="og:image:height" content="630">');
  nextHtml = upsertTag(nextHtml, /<meta property="og:site_name" content="[^"]*"\s*\/?>/i, '<meta property="og:site_name" content="MC NovaTools">');
  nextHtml = upsertTag(nextHtml, /<meta property="og:locale" content="[^"]*"\s*\/?>/i, `<meta property="og:locale" content="${locale}">`);
  nextHtml = upsertTag(nextHtml, /<meta name="twitter:card" content="[^"]*"\s*\/?>/i, '<meta name="twitter:card" content="summary_large_image">');
  nextHtml = upsertTag(nextHtml, /<meta name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta name="twitter:title" content="${escapedTitle}">`);
  nextHtml = upsertTag(nextHtml, /<meta name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta name="twitter:description" content="${escapedDescription}">`);
  nextHtml = upsertTag(nextHtml, /<meta name="twitter:image" content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${DEFAULT_OG_IMAGE}">`);

  nextHtml = optimizeImageTags(nextHtml);

  const schemaHead = schemaForHtml(nextHtml, route);
  if (schemaHead) nextHtml = nextHtml.replace(/<\/head>/i, `  ${schemaHead}\n</head>`);

  nextHtml = nextHtml.replace(/\s*<meta name="google-site-verification" content="[^"]*"\s*\/?>/i, '');
  const adSenseHead = renderAdSenseHead(adsenseClient);
  if (adSenseHead) nextHtml = nextHtml.replace(/<\/head>/i, `  ${adSenseHead}\n</head>`);

  const analyticsHead = renderAnalyticsHead({ gaId, gscId });
  if (analyticsHead) nextHtml = nextHtml.replace(/<\/head>/i, `  ${analyticsHead}\n</head>`);

  return nextHtml;
}
