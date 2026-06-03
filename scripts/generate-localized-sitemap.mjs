#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { fileURLToPath } from 'url';
import { blogArticlePath, blogHubPath, fallbackBlogLocale, normalizeBlogSlug, normalizeBlogSlugList } from '../src/js/blog-routes.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://mc-novatools.com';
const lastmod = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');
const maxUrlsPerSitemap = 50000;

const staticPages = [
  ['/', '1.0', 'daily'],
  ['/about-us.html', '0.5', 'monthly'],
  ['/contact.html', '0.5', 'monthly'],
  ['/privacy-policy.html', '0.4', 'monthly'],
  ['/terms-of-service.html', '0.4', 'monthly'],
  ['/disclaimer.html', '0.4', 'monthly'],
  [blogHubPath(fallbackBlogLocale), '0.7', 'weekly']
];

const categoryPages = [
  ['/tools/pdf/', '0.8', 'weekly'],
  ['/tools/image/', '0.8', 'weekly'],
  ['/tools/developer/', '0.8', 'weekly'],
  ['/tools/finance/', '0.8', 'weekly']
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(route, priority = '0.7', changefreq = 'monthly', section = 'Other') {
  const cleanRoute = route.startsWith('/') ? route : `/${route}`;
  return { loc: `${origin}${cleanRoute}`, priority, changefreq, section };
}

function renderUrlEntry({ loc, priority, changefreq }) {
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function renderSection(name, entries) {
  return [`  <!-- ${name} -->`, ...entries.map(renderUrlEntry)].join('\n');
}

function sourceBlogArticleSlugs() {
  return globSync('src/blog/articles/**/*.html', { cwd: rootDir })
    .map((file) => path.basename(file, '.html'))
    .filter((slug) => slug !== 'index')
    .map((slug) => normalizeBlogSlug(slug));
}

function authorSlug(author) {
  return String(author.id || author.name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function writeSitemap(fileName, entries) {
  const grouped = entries.reduce((acc, entry) => {
    acc[entry.section] ||= [];
    acc[entry.section].push(entry);
    return acc;
  }, {});
  const body = Object.entries(grouped).map(([section, sectionEntries]) => renderSection(section, sectionEntries)).join('\n');
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
  fs.writeFileSync(path.join(rootDir, 'public', fileName), sitemap);
  fs.writeFileSync(path.join(rootDir, fileName), sitemap);
}

function writeSitemapIndex(sitemapNames) {
  const body = sitemapNames.map((fileName) => `  <sitemap>\n    <loc>${origin}/${fileName}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>`).join('\n');
  const index = `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</sitemapindex>\n`;
  fs.writeFileSync(path.join(rootDir, 'public', 'sitemap.xml'), index);
  fs.writeFileSync(path.join(rootDir, 'sitemap.xml'), index);
}

const sections = [
  ['Static pages', staticPages.map(([route, priority, changefreq]) => urlEntry(route, priority, changefreq, 'Static pages'))],
  ['Category pages', categoryPages.map(([route, priority, changefreq]) => urlEntry(route, priority, changefreq, 'Category pages'))],
  ['Individual tool pages', globSync('src/tools/**/index.html', { cwd: rootDir, ignore: ['**/demo-*/**', '**/experimental/**', '**/test/**', 'src/tools/request/**'] })
    .sort()
    .map((file) => urlEntry(`/${file.replace(/^src\//, '').replace(/index\.html$/, '')}`, '0.8', 'weekly', 'Individual tool pages'))],
  ['Blog posts', normalizeBlogSlugList([
    ...readJson(`src/i18n/blog/${fallbackBlogLocale}.json`).map((post) => post.slug).filter(Boolean),
    ...sourceBlogArticleSlugs()
  ]).map((slug) => urlEntry(blogArticlePath(slug, fallbackBlogLocale), '0.6', 'weekly', 'Blog posts'))],
  ['Author pages', readJson('src/data/authors.json')
    .map(authorSlug)
    .filter(Boolean)
    .map((slug) => urlEntry(`/author/${slug}/`, '0.5', 'monthly', 'Author pages'))]
];

const urls = sections.flatMap(([, entries]) => entries);
const seen = new Set();
const deduped = urls.filter(({ loc }) => {
  if (seen.has(loc)) return false;
  seen.add(loc);
  return true;
});

if (deduped.length > maxUrlsPerSitemap) {
  const names = [];
  for (let index = 0; index < deduped.length; index += maxUrlsPerSitemap) {
    const fileName = `sitemap-${Math.floor(index / maxUrlsPerSitemap) + 1}.xml`;
    writeSitemap(fileName, deduped.slice(index, index + maxUrlsPerSitemap));
    names.push(fileName);
  }
  writeSitemapIndex(names);
} else {
  writeSitemap('sitemap.xml', deduped);
}

const siteLinks = `${deduped.map(({ loc }) => loc).join('\n')}\n`;
fs.writeFileSync(path.join(rootDir, 'site-links.txt'), siteLinks);
console.log(`✅ Generated sitemap architecture and site-links.txt with ${deduped.length} URLs.`);
