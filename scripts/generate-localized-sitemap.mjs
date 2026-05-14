#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { fileURLToPath } from 'url';
import { blogArticlePath, blogHubPath, fallbackBlogLocale, normalizeBlogSlug, normalizeBlogSlugList, supportedBlogLocales } from '../src/js/blog-routes.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://mc-novatools.com';
const lastmod = new Date().toISOString().slice(0, 10);
const locales = supportedBlogLocales;
const pathPrefixLocales = new Set();

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
}

function localizedUrl(route, locale) {
  const cleanRoute = route.startsWith('/') ? route : `/${route}`;
  if (locale === 'en') return `${origin}${cleanRoute}`;
  if (pathPrefixLocales.has(locale)) return `${origin}/${locale}${cleanRoute}`;
  const separator = cleanRoute.includes('?') ? '&' : '?';
  return `${origin}${cleanRoute}${separator}lang=${locale}`;
}

function localizedBlogUrl(path) {
  return `${origin}${path}`;
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc, priority = '0.7', changefreq = 'monthly') {
  return { loc, priority, changefreq };
}

function renderUrlEntry({ loc, priority, changefreq }) {
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function sourceBlogArticleSlugs() {
  return globSync('src/blog/articles/**/*.html', { cwd: rootDir })
    .map((file) => path.basename(file, '.html'))
    .filter((slug) => slug !== 'index')
    .map((slug) => normalizeBlogSlug(slug));
}

const urls = [];
['/', '/about-us.html', '/contact.html', '/privacy-policy.html', '/terms-of-service.html', '/cookie-policy.html', '/security.html'].forEach((route) => {
  locales.forEach((locale) => urls.push(urlEntry(localizedUrl(route, locale), route === '/' ? '1.0' : '0.7', route === '/' ? 'weekly' : 'monthly')));
});
['/gizlilik-politikasi.html', '/kvkk-aydinlatma-metni.html', '/kullanim-kosullari.html', '/iletisim.html'].forEach((route) => {
  urls.push(urlEntry(`${origin}${route}`, '0.7', 'monthly'));
});
locales.forEach((locale) => urls.push(urlEntry(localizedBlogUrl(blogHubPath(locale)), '0.7', 'monthly')));

globSync('categories/**/*.html', { cwd: rootDir }).sort().forEach((file) => {
  const route = `/${file.replace(/\\/g, '/')}`;
  locales.forEach((locale) => urls.push(urlEntry(localizedUrl(route, locale), '0.8', 'weekly')));
});

globSync('src/tools/**/index.html', { cwd: rootDir, ignore: ['**/demo-*/**', '**/experimental/**', '**/test/**'] }).sort().forEach((file) => {
  const route = `/${file.replace(/^src\//, '').replace(/index\.html$/, '')}`;
  locales.forEach((locale) => urls.push(urlEntry(localizedUrl(route, locale), '0.8', 'weekly')));
});

const fallbackPosts = readJson(`src/i18n/blog/${fallbackBlogLocale}.json`);
const fallbackPostSlugs = fallbackPosts.map((post) => post.slug).filter(Boolean);
locales.forEach((locale) => {
  const manifestPath = path.join(rootDir, `src/i18n/blog/${locale}.json`);
  const posts = fs.existsSync(manifestPath) ? readJson(`src/i18n/blog/${locale}.json`) : fallbackPosts;
  const slugs = normalizeBlogSlugList([...fallbackPostSlugs, ...posts.map((post) => post.slug).filter(Boolean), ...sourceBlogArticleSlugs()]);
  slugs.forEach((slug) => urls.push(urlEntry(localizedBlogUrl(blogArticlePath(slug, locale)), '0.6', 'monthly')));
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(renderUrlEntry).join('\n')}\n</urlset>\n`;
const siteLinks = `${urls.map(({ loc }) => loc).join('\n')}\n`;
fs.writeFileSync(path.join(rootDir, 'public', 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(rootDir, 'site-links.txt'), siteLinks);
console.log(`✅ Generated localized sitemap and site-links.txt with ${urls.length} URLs.`);
