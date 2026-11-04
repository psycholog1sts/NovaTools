#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { globSync } from 'glob';
import { fileURLToPath } from 'url';
import { blogArticlePath, blogHubPath, fallbackBlogLocale, normalizeBlogSlug, normalizeBlogSlugList } from '../src/js/blog-routes.js';
import { isPublishedBlogSlug } from '../src/js/blog-publication.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origin = 'https://mc-novatools.com';
// The sitemap index itself changes whenever a build runs.
const lastmod = new Date().toISOString().replace(/\.\d{3}Z$/, '+00:00');

// Per-URL <lastmod> is the last commit that touched the page's source file. Stamping every URL
// with the build time told crawlers that all pages changed on every deploy, which they did not.
// When no source file (or no git history) is found the field is omitted rather than guessed.
const sourceDateCache = new Map();
function gitLastModified(relativeFile) {
  if (sourceDateCache.has(relativeFile)) return sourceDateCache.get(relativeFile);
  let value = '';
  if (fs.existsSync(path.join(rootDir, relativeFile))) {
    try {
      value = execFileSync('git', ['log', '-1', '--format=%cI', '--', relativeFile], { cwd: rootDir, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      value = '';
    }
  }
  sourceDateCache.set(relativeFile, value);
  return value;
}

function sourceFilesForRoute(route) {
  const clean = route.replace(/^\//, '');
  if (!clean) return ['index.html'];
  const blogArticle = clean.match(/^blog\/articles\/([^/]+?)(?:\.html)?\/?$/);
  if (blogArticle) return [`src/blog/articles/${blogArticle[1]}.html`, `src/i18n/blog/${fallbackBlogLocale}.json`];
  if (clean.endsWith('.html')) return [clean];
  const dir = clean.replace(/\/$/, '');
  return [`src/${dir}/index.html`, `${dir}/index.html`, `${dir}.html`];
}

function routeLastModified(route) {
  for (const file of sourceFilesForRoute(route)) {
    const date = gitLastModified(file);
    if (date) return date;
  }
  return '';
}
const maxUrlsPerSitemap = 50000;

const staticPages = [
  ['/', '1.0', 'daily'],
  ['/pricing/', '0.7', 'weekly'],
  ['/about-us.html', '0.5', 'monthly'],
  ['/contact.html', '0.5', 'monthly'],
  ['/request-tool.html', '0.5', 'monthly'],
  ['/privacy-policy.html', '0.4', 'monthly'],
  ['/terms-of-service.html', '0.4', 'monthly'],
  ['/refund-policy.html', '0.4', 'monthly'],
  ['/disclaimer.html', '0.4', 'monthly'],
  ['/cookie-policy.html', '0.4', 'monthly'],
  ['/security.html', '0.4', 'monthly'],
  ['/gizlilik-politikasi.html', '0.4', 'monthly'],
  ['/kvkk-aydinlatma-metni.html', '0.4', 'monthly'],
  ['/kullanim-kosullari.html', '0.4', 'monthly'],
  ['/iletisim.html', '0.4', 'monthly'],
  [blogHubPath(fallbackBlogLocale), '0.7', 'weekly']
];

const blogCategoryPages = [
  '/blog/categories/pdf-document-management.html',
  '/blog/categories/image-processing-web-performance.html',
  '/blog/categories/developer-tools-coding.html',
  '/blog/categories/finance-calculators.html',
  '/blog/categories/productivity-tool-guides.html'
];

const categoryPages = [
  ['/categories/index.html', '0.8', 'weekly'],
  ['/categories/pdf-tools.html', '0.8', 'weekly', 'pdf'],
  ['/categories/image-tools.html', '0.8', 'weekly', 'image'],
  ['/categories/finance-tools.html', '0.8', 'weekly', 'finance'],
  ['/categories/developer-tools.html', '0.8', 'weekly', 'dev'],
  ['/categories/text-writing.html', '0.8', 'weekly', 'text'],
  ['/categories/converters.html', '0.8', 'weekly', 'converters'],
  ['/categories/calculator-tools.html', '0.8', 'weekly', 'calculators'],
  ['/categories/security-tools.html', '0.8', 'weekly', 'security'],
  ['/categories/social-media-tools.html', '0.8', 'weekly', 'social'],
  ['/categories/productivity-tools.html', '0.8', 'weekly', 'productivity'],
  ['/categories/data-tools.html', '0.8', 'weekly', 'data'],
  ['/categories/design-tools.html', '0.8', 'weekly', 'design']
  // /tools/{pdf,image,developer,finance}/ are copies of the hubs above that name the hub as
  // canonical (scripts/post-build-fix.mjs), so they are not listed separately.
];

const nonIndexableToolSources = [
  'src/tools/request/**',
  'src/tools/news/summarizer/**',
  'src/tools/religious/islamic-calendar/**',
  'src/tools/social/url-shortener/**'
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
}

const toolTruthBySource = new Map((readJson('tools-manifest.json').tools || []).map((tool) => [
  String(tool.entry || '').replace(/^\//, '').replace(/\/$/, '') + '/index.html', tool
]));
const certifiedCategoryCounts = [...toolTruthBySource.values()]
  .filter((tool) => tool.public === true && tool.indexable === true && tool.certificationStatus === 'CERTIFIED')
  .reduce((counts, tool) => counts.set(tool.category, (counts.get(tool.category) || 0) + 1), new Map());

function normalizeSourcePath(file) {
  return String(file).replace(/\\/g, '/');
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
  return { loc: `${origin}${cleanRoute}`, priority, changefreq, section, modified: routeLastModified(cleanRoute) };
}

function renderUrlEntry({ loc, priority, changefreq, modified }) {
  const lastmodLine = modified ? `\n    <lastmod>${modified}</lastmod>` : '';
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${lastmodLine}\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
}

function renderSection(name, entries) {
  return [`  <!-- ${name} -->`, ...entries.map(renderUrlEntry)].join('\n');
}

function toolSourceIsIndexable(file) {
  const normalizedFile = normalizeSourcePath(file);
  const truth = toolTruthBySource.get(normalizedFile);
  if (truth && (!truth.public || !truth.indexable || truth.certificationStatus !== 'CERTIFIED')) return false;
  const html = fs.readFileSync(path.join(rootDir, normalizedFile), 'utf8');
  const robotsMeta = html.match(/<meta[^>]+name=[\"']robots[\"'][^>]*>/i)?.[0]
    || html.match(/<meta[^>]+content=[\"'][^\"']*[\"'][^>]+name=[\"']robots[\"'][^>]*>/i)?.[0]
    || '';
  return !/content=[\"'][^\"']*noindex/i.test(robotsMeta);
}

function sourceBlogArticleSlugs() {
  return globSync('src/blog/articles/**/*.html', { cwd: rootDir })
    .map((file) => path.basename(file, '.html'))
    .filter((slug) => slug !== 'index')
    .filter((slug) => isPublishedBlogSlug(slug))
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
  if (!entries.length) return;
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
  ['Category pages', categoryPages
    .filter(([, , , category]) => !category || (certifiedCategoryCounts.get(category) || 0) > 0)
    .map(([route, priority, changefreq]) => urlEntry(route, priority, changefreq, 'Category pages'))],
  ['Individual tool pages', globSync('src/tools/**/index.html', {
    cwd: rootDir,
    ignore: ['**/demo-*/**', '**/experimental/**', '**/test/**', ...nonIndexableToolSources]
  })
    .filter(toolSourceIsIndexable)
    .sort()
    .map((file) => urlEntry(`/${normalizeSourcePath(file).replace(/^src\//, '').replace(/index\.html$/, '')}`, '0.8', 'weekly', 'Individual tool pages'))],
  ['Blog category archive pages', blogCategoryPages.map((route) => urlEntry(route, '0.55', 'weekly', 'Blog category archive pages'))],
  ['Blog posts', normalizeBlogSlugList([
    ...readJson(`src/i18n/blog/${fallbackBlogLocale}.json`).map((post) => post.slug).filter(Boolean).filter(isPublishedBlogSlug),
    ...sourceBlogArticleSlugs()
  ]).map((slug) => urlEntry(blogArticlePath(slug, fallbackBlogLocale), '0.6', 'weekly', 'Blog posts'))],
  // List the full profile each author's articles link to, not the short /author/<id>/ stub.
  ['Author pages', readJson('src/data/authors.json')
    .map((author) => author.profileUrl || (authorSlug(author) ? `/author/${authorSlug(author)}/` : ''))
    .filter(Boolean)
    .map((route) => urlEntry(route, '0.5', 'monthly', 'Author pages'))]
];

function dedupeEntries(entries) {
  const seen = new Set();
  return entries.filter(({ loc }) => {
    if (seen.has(loc)) return false;
    seen.add(loc);
    return true;
  });
}

const urls = sections.flatMap(([, entries]) => entries);
const deduped = dedupeEntries(urls);
const sitemapVariants = {
  'sitemap-tools.xml': dedupeEntries(sections
    .filter(([section]) => ['Category pages', 'Individual tool pages'].includes(section))
    .flatMap(([, entries]) => entries)),
  'sitemap-blog.xml': dedupeEntries(sections
    .filter(([section]) => ['Blog category archive pages', 'Blog posts', 'Author pages'].includes(section))
    .flatMap(([, entries]) => entries))
};

Object.entries(sitemapVariants).forEach(([fileName, entries]) => writeSitemap(fileName, entries));

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
console.log(`✅ Generated sitemap variants: ${Object.entries(sitemapVariants).map(([fileName, entries]) => `${fileName} (${entries.length} URLs)`).join(', ')}.`);
