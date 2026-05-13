const SITE_ORIGIN = 'https://mc-novatools.com';
const DEFAULT_OG_IMAGE = `${SITE_ORIGIN}/og-image.svg`;

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

function upsertTag(html, pattern, tag) {
  if (pattern.test(html)) return html.replace(pattern, tag);
  return html.replace(/<\/head>/i, `  ${tag}\n</head>`);
}

export function applySeoHead(html, route, { gaId = '', gscId = '' } = {}) {
  const canonical = canonicalUrlForRoute(route);
  let nextHtml = removeLegacyGaSnippets(html);

  nextHtml = upsertTag(nextHtml, /<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}">`);
  nextHtml = upsertTag(nextHtml, /<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonical}">`);
  nextHtml = upsertTag(nextHtml, /<meta property="og:image" content="[^"]*"\s*\/?>/i, `<meta property="og:image" content="${DEFAULT_OG_IMAGE}">`);
  nextHtml = upsertTag(nextHtml, /<meta name="twitter:card" content="[^"]*"\s*\/?>/i, '<meta name="twitter:card" content="summary_large_image">');
  nextHtml = upsertTag(nextHtml, /<meta name="twitter:image" content="[^"]*"\s*\/?>/i, `<meta name="twitter:image" content="${DEFAULT_OG_IMAGE}">`);

  nextHtml = nextHtml.replace(/\s*<meta name="google-site-verification" content="[^"]*"\s*\/?>/i, '');
  const analyticsHead = renderAnalyticsHead({ gaId, gscId });
  if (analyticsHead) nextHtml = nextHtml.replace(/<\/head>/i, `  ${analyticsHead}\n</head>`);

  return nextHtml;
}
