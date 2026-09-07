import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');

const rootRobots = read('robots.txt');
const publicRobots = read('public/robots.txt');
const redirects = read('public/_redirects');
const blogRoutes = read('src/js/blog-routes.js');
const sitemapGenerator = read('scripts/generate-localized-sitemap.mjs');

for (const [name, robots] of [['robots.txt', rootRobots], ['public/robots.txt', publicRobots]]) {
  assert.match(robots, /^Allow: \/\*\?lang=tr\$$/m, `${name} must explicitly allow the canonical Turkish ?lang=tr URL shape`);
  assert.match(robots, /^Disallow: \/\*\?\*$/m, `${name} must keep non-canonical query crawl-space blocked`);
  assert.match(robots, /^Disallow: \/api\/$/m, `${name} must keep API routes out of crawl-space`);
  assert.match(robots, /^Disallow: \/admin\/$/m, `${name} must keep admin routes out of crawl-space`);
  assert.match(robots, /^Disallow: \/test\/$/m, `${name} must keep test routes out of crawl-space`);
}

assert.equal(rootRobots, publicRobots, 'root/public robots.txt copies must stay identical');

const unsupportedLegacyLocales = ['de', 'fr', 'es', 'pt', 'ru', 'zh', 'ja', 'ko', 'hi', 'it', 'pl', 'nl'];
for (const locale of unsupportedLegacyLocales) {
  assert.doesNotMatch(
    redirects,
    new RegExp(`^/${locale}(?:/\\*)?\\s+[^\\n]*\\?lang=${locale}(?:\\s|$)`, 'm'),
    `legacy /${locale} redirects must not create unsupported query-locale URLs`
  );
}

assert.doesNotMatch(
  redirects,
  /^\/ar(?:\/\*)?\s+[^\n]*\?lang=ar(?:\s|$)/m,
  'Arabic blog routes must not be intercepted and rewritten to an unsupported global ?lang=ar URL'
);

assert.doesNotMatch(
  redirects,
  /^\/\*\s+\/404\.html\s+404\s*$/m,
  'Cloudflare Pages _redirects must not declare an unsupported 404 status; native 404.html handling owns missing routes'
);

assert.match(
  blogRoutes,
  /export const supportedBlogLocales = \['en', 'tr', 'ar'\];/,
  'blog routes must only materialize locales that have dedicated content manifests'
);

assert.doesNotMatch(sitemapGenerator, /<loc>[^<]*\?lang=/, 'generated sitemap source must not publish query-locale URLs');

console.log('SEO indexability regression contract passed.');
