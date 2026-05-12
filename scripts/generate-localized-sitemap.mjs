#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { fileURLToPath } from 'url';
import { blogArticlePath, blogHubPath, fallbackBlogLocale, supportedBlogLocales } from '../src/js/blog-routes.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://mc-novatools.com';
const lastmod = new Date().toISOString().slice(0, 10);
const locales = supportedBlogLocales;

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
}

function localizedUrl(route, locale) {
  const cleanRoute = route.startsWith('/') ? route : `/${route}`;
  return locale === 'en' ? `${origin}${cleanRoute}` : `${origin}/${locale}${cleanRoute}`;
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
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

const urls = [];
['/', '/about-us.html', '/contact.html', '/privacy-policy.html', '/terms-of-service.html', '/cookie-policy.html', '/security.html'].forEach((route) => {
  locales.forEach((locale) => urls.push(urlEntry(localizedUrl(route, locale), route === '/' ? '1.0' : '0.7', route === '/' ? 'weekly' : 'monthly')));
});
locales.forEach((locale) => urls.push(urlEntry(`${origin}${blogHubPath(locale)}`, '0.7', 'monthly')));

globSync('categories/**/*.html', { cwd: rootDir }).sort().forEach((file) => {
  const route = `/${file.replace(/\\/g, '/')}`;
  locales.forEach((locale) => urls.push(urlEntry(localizedUrl(route, locale), '0.8', 'weekly')));
});

globSync('src/tools/**/index.html', { cwd: rootDir, ignore: ['**/demo-*/**', '**/experimental/**', '**/test/**'] }).sort().forEach((file) => {
  const route = `/${file.replace(/^src\//, '').replace(/index\.html$/, '')}`;
  locales.forEach((locale) => urls.push(urlEntry(localizedUrl(route, locale), '0.8', 'weekly')));
});

const fallbackPosts = readJson(`src/i18n/blog/${fallbackBlogLocale}.json`);
locales.forEach((locale) => {
  const manifestPath = path.join(rootDir, `src/i18n/blog/${locale}.json`);
  const posts = fs.existsSync(manifestPath) ? readJson(`src/i18n/blog/${locale}.json`) : fallbackPosts;
  posts.forEach((post) => urls.push(urlEntry(`${origin}${blogArticlePath(post.slug, locale)}`, '0.6', 'monthly')));
});

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
fs.writeFileSync(path.join(rootDir, 'public', 'sitemap.xml'), sitemap);
fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), sitemap);
console.log(`✅ Generated localized sitemap with ${urls.length} URLs.`);
