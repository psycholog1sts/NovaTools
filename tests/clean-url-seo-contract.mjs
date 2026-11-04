import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  cleanUrlPath,
  normalizeCleanUrlSeoHtml,
  normalizeCleanUrlSitemapXml,
  pruneUnservableAlternates,
  seoUrlsInHtml
} from '../src/js/clean-url-seo.mjs';

// Cloudflare Pages (and Vercel with cleanUrls) 308-redirect `/x.html` to `/x`
// and `/x/index.html` to `/x/`. Any canonical, og:url, hreflang, JSON-LD URL
// or sitemap <loc> that still names the `.html` form therefore points Google
// at a redirect, which surfaces in Search Console as "Page with redirect" /
// "Alternate page with proper canonical tag".

assert.equal(cleanUrlPath('/contact.html'), '/contact');
assert.equal(cleanUrlPath('/categories/pdf-tools.html'), '/categories/pdf-tools');
assert.equal(cleanUrlPath('/blog/index.html'), '/blog/');
assert.equal(cleanUrlPath('/index.html'), '/');
assert.equal(cleanUrlPath('/tools/pdf/merge/'), '/tools/pdf/merge/');
assert.equal(cleanUrlPath('/'), '/');

const page = `<!DOCTYPE html><html><head>
  <link rel="canonical" href="https://mc-novatools.com/contact.html">
  <meta property="og:url" content="https://mc-novatools.com/contact.html">
  <link rel="alternate" hreflang="en" href="https://mc-novatools.com/contact.html">
  <link rel="alternate" hreflang="tr" href="https://mc-novatools.com/contact.html?lang=tr">
  <link rel="stylesheet" href="/assets/site.html.css">
  <script type="application/ld+json">{"url":"https://mc-novatools.com/blog/index.html","item":"https://mc-novatools.com/about-us.html#team"}</script>
</head><body>
  <a href="/categories/pdf-tools.html">PDF</a>
  <a href="https://mc-novatools.com/blog/articles/a-guide.html?ref=x">Guide</a>
  <a href="https://example.com/page.html">External</a>
  <a href="/downloads/sample.pdf">Sample</a>
</body></html>`;

const cleaned = normalizeCleanUrlSeoHtml(page);
assert.match(cleaned, /<link rel="canonical" href="https:\/\/mc-novatools\.com\/contact">/);
assert.match(cleaned, /<meta property="og:url" content="https:\/\/mc-novatools\.com\/contact">/);
assert.match(cleaned, /hreflang="en" href="https:\/\/mc-novatools\.com\/contact"/);
assert.match(cleaned, /hreflang="tr" href="https:\/\/mc-novatools\.com\/contact\?lang=tr"/);
assert.match(cleaned, /"url":"https:\/\/mc-novatools\.com\/blog\/"/);
assert.match(cleaned, /"item":"https:\/\/mc-novatools\.com\/about-us#team"/);
assert.match(cleaned, /<a href="\/categories\/pdf-tools">PDF<\/a>/);
assert.match(cleaned, /href="https:\/\/mc-novatools\.com\/blog\/articles\/a-guide\?ref=x"/);
assert.match(cleaned, /href="https:\/\/example\.com\/page\.html"/, 'external URLs must not be rewritten');
assert.match(cleaned, /href="\/assets\/site\.html\.css"/, 'non-page assets must not be rewritten');
assert.equal(normalizeCleanUrlSeoHtml(cleaned), cleaned, 'normalization must be idempotent');

const sitemap = '<urlset><url><loc>https://mc-novatools.com/contact.html</loc></url><url><loc>https://mc-novatools.com/blog/index.html</loc></url><url><loc>https://mc-novatools.com/tools/pdf/merge/</loc></url></urlset>';
assert.equal(
  normalizeCleanUrlSitemapXml(sitemap),
  '<urlset><url><loc>https://mc-novatools.com/contact</loc></url><url><loc>https://mc-novatools.com/blog/</loc></url><url><loc>https://mc-novatools.com/tools/pdf/merge/</loc></url></urlset>'
);

// hreflang alternates must point at pages that exist; a localized variant
// that was never built (e.g. `/en/about`, `/tr/about`) is a broken signal.
const withAlternates = `<head>
  <link rel="canonical" href="https://mc-novatools.com/about">
  <link rel="alternate" hreflang="en" href="https://mc-novatools.com/en/about">
  <link rel="alternate" hreflang="tr" href="https://mc-novatools.com/blog/articles/x?lang=tr">
  <link rel="alternate" hreflang="x-default" href="https://mc-novatools.com/about">
</head>`;
const servable = new Set(['/about', '/blog/articles/x']);
const pruned = pruneUnservableAlternates(withAlternates, (pathname) => servable.has(pathname));
assert.doesNotMatch(pruned, /\/en\/about/, 'unservable alternate must be removed');
assert.match(pruned, /hreflang="tr" href="https:\/\/mc-novatools\.com\/blog\/articles\/x\?lang=tr"/, 'servable query-locale alternate must be kept');
assert.match(pruned, /hreflang="x-default"/);
assert.match(pruned, /rel="canonical"/, 'canonical is never pruned');
assert.equal(pruneUnservableAlternates(pruned, (pathname) => servable.has(pathname)), pruned, 'pruning must be idempotent');

// Built-output contract: only enforced when a production build exists.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(repoRoot, 'dist');
if (existsSync(path.join(distDir, 'index.html'))) {
  const listFiles = (dir, ext) => readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return listFiles(full, ext);
    return entry.name.endsWith(ext) ? [full] : [];
  });

  // A clean URL is servable when Cloudflare Pages maps it to a built file
  // without a further redirect: `/x/` -> x/index.html, `/x` -> x.html.
  const resolves = (pathname) => {
    const decoded = decodeURIComponent(pathname);
    if (decoded.endsWith('/')) return existsSync(path.join(distDir, decoded, 'index.html'));
    return existsSync(path.join(distDir, `${decoded}.html`));
  };

  const htmlSuffix = [];
  const unresolved = [];
  const check = (url, source) => {
    const parsed = new URL(url);
    if (parsed.origin !== 'https://mc-novatools.com') return;
    if (parsed.pathname.endsWith('.html')) htmlSuffix.push(`${source}: ${url}`);
    else if (!resolves(parsed.pathname)) unresolved.push(`${source}: ${url}`);
  };

  for (const file of listFiles(distDir, '.html')) {
    const relative = path.relative(distDir, file).replace(/\\/g, '/');
    if (relative === '404.html') continue;
    const html = readFileSync(file, 'utf8');
    if (/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) continue;
    for (const url of seoUrlsInHtml(html)) check(url, relative);
  }
  for (const file of listFiles(distDir, '.xml').filter((f) => /sitemap[^/\\]*\.xml$/.test(f))) {
    const relative = path.relative(distDir, file).replace(/\\/g, '/');
    for (const [, loc] of readFileSync(file, 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) check(loc.trim(), relative);
  }

  assert.deepEqual(htmlSuffix.slice(0, 15), [], `${htmlSuffix.length} SEO URL(s) in dist still use the redirected .html form`);
  assert.deepEqual(unresolved.slice(0, 15), [], `${unresolved.length} SEO URL(s) in dist do not resolve to a built page`);
  console.log('clean URL SEO contract: dist verified');
} else {
  console.log('clean URL SEO contract: unit checks passed (no dist build present)');
}
