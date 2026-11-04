const SITE_ORIGIN = 'https://mc-novatools.com';

// Cloudflare Pages and Vercel (cleanUrls) serve pages at extensionless URLs and
// 308-redirect the `.html` form. SEO signals must name the served URL, never the
// redirect: `/x.html` -> `/x`, `/x/index.html` -> `/x/`.
export function cleanUrlPath(pathname) {
  return String(pathname || '/').replace(/\/index\.html$/i, '/').replace(/\.html$/i, '');
}

function cleanSiteUrl(value) {
  const raw = String(value || '');
  const isAbsolute = raw.startsWith(`${SITE_ORIGIN}/`);
  const isRootRelative = raw.startsWith('/') && !raw.startsWith('//');
  if (!isAbsolute && !isRootRelative) return raw;
  const [, head, tail] = raw.match(/^([^?#]*)(.*)$/s);
  if (!/\.html$/i.test(head)) return raw;
  if (isAbsolute) return `${SITE_ORIGIN}${cleanUrlPath(head.slice(SITE_ORIGIN.length))}${tail}`;
  return `${cleanUrlPath(head)}${tail}`;
}

function attr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? match[1] : '';
}

function rewriteAttr(tag, name) {
  return tag.replace(new RegExp(`(\\b${name}\\s*=\\s*)(["'])([^"']*)\\2`, 'i'), (_m, prefix, quote, value) => `${prefix}${quote}${cleanSiteUrl(value)}${quote}`);
}

function isSeoLink(tag) {
  const rel = attr(tag, 'rel').toLowerCase();
  return rel === 'canonical' || (rel === 'alternate' && Boolean(attr(tag, 'hreflang')));
}

function isUrlMeta(tag) {
  return attr(tag, 'property').toLowerCase() === 'og:url' || attr(tag, 'name').toLowerCase() === 'twitter:url';
}

export function normalizeCleanUrlSeoHtml(html) {
  return String(html || '')
    .replace(/<link\b[^>]*>/gi, (tag) => (isSeoLink(tag) ? rewriteAttr(tag, 'href') : tag))
    .replace(/<meta\b[^>]*>/gi, (tag) => (isUrlMeta(tag) ? rewriteAttr(tag, 'content') : tag))
    .replace(/<a\b[^>]*>/gi, (tag) => rewriteAttr(tag, 'href'))
    .replace(/(<script\b[^>]*type=["']application\/ld\+json["'][^>]*>)([\s\S]*?)(<\/script>)/gi, (_m, open, body, close) => (
      `${open}${body.replace(/"(https:\/\/mc-novatools\.com\/[^"]*)"/g, (_q, url) => `"${cleanSiteUrl(url)}"`)}${close}`
    ));
}

export function normalizeCleanUrlSitemapXml(xml) {
  return String(xml || '').replace(/<loc>([^<]*)<\/loc>/g, (_m, loc) => `<loc>${cleanSiteUrl(loc.trim())}</loc>`);
}

// Drops same-origin hreflang alternates whose target page was never built.
// `isServable(pathname)` reports whether a clean pathname maps to a built page.
export function pruneUnservableAlternates(html, isServable) {
  return String(html || '').replace(/[ \t]*<link\b[^>]*>[ \t]*\r?\n?/gi, (tag) => {
    if (attr(tag, 'rel').toLowerCase() !== 'alternate' || !attr(tag, 'hreflang')) return tag;
    const url = new URL(attr(tag, 'href'), SITE_ORIGIN);
    if (url.origin !== SITE_ORIGIN) return tag;
    return isServable(decodeURIComponent(url.pathname)) ? tag : '';
  });
}

// Absolute URLs of the signals Google uses to pick a canonical: canonical,
// og:url and hreflang alternates.
export function seoUrlsInHtml(html) {
  const source = String(html || '');
  const urls = [];
  for (const tag of source.match(/<link\b[^>]*>/gi) || []) {
    if (isSeoLink(tag) && attr(tag, 'href')) urls.push(new URL(attr(tag, 'href'), SITE_ORIGIN).toString());
  }
  for (const tag of source.match(/<meta\b[^>]*>/gi) || []) {
    if (isUrlMeta(tag) && attr(tag, 'content')) urls.push(new URL(attr(tag, 'content'), SITE_ORIGIN).toString());
  }
  return urls;
}
