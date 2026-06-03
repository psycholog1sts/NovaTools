import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import {
  buildAuthorPageSchema,
  buildBlogPostSchema,
  buildCategoryPageSchema,
  buildEditorialAuthorPageSchema,
  buildHomeSchema,
  buildToolPageSchema,
  inferCategoryLabel,
  makeDefaultHowToSteps,
  makeDefaultToolFaqs,
  structuredDataConstants,
  toAbsoluteUrl,
  toCanonicalUrl,
  toPlainText
} from '../src/seo/structured-data-templates.mjs';

const distDir = resolve('dist');
const sourceToolsDir = resolve('src/tools');
const buildDate = (process.env.NOVATOOLS_SCHEMA_DATE || new Date().toISOString().slice(0, 10)).trim();

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

const walkHtml = (dir) => {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) entries.push(...walkHtml(fullPath));
    else if (name.endsWith('.html')) entries.push(fullPath);
  }
  return entries;
};

const getMetaContent = (html, name) => {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const metaPattern = new RegExp(`<meta\\b(?=[^>]*(?:name|property)=["']${escaped}["'])(?=[^>]*content=["']([^"']*)["'])[^>]*>`, 'i');
  return decodeHtml(metaPattern.exec(html)?.[1] || '');
};

const getCanonical = (html, fallbackPath) => {
  const match = /<link\b(?=[^>]*rel=["']canonical["'])(?=[^>]*href=["']([^"']+)["'])[^>]*>/i.exec(html);
  if (match?.[1]) return toCanonicalUrl(decodeHtml(match[1]));
  const path = fallbackPath.endsWith('/index.html') ? fallbackPath.slice(0, -'index.html'.length) : fallbackPath.replace(/\.html$/, '.html');
  return toCanonicalUrl(`/${path}`);
};

const getTitle = (html) => decodeHtml(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || '').replace(/\s*\|\s*MC NovaTools.*$/i, '').replace(/\s*—\s*Free Online.*$/i, '').trim();

const getH1 = (html) => decodeHtml(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1] || '').replace(/<[^>]+>/g, '').trim();

const decodeHtml = (value = '') => String(value)
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&nbsp;/g, ' ')
  .trim();

const removeStructuredDataScripts = (html) => html.replace(/\n?\s*<script\b[^>]*type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>\s*/gi, '\n');

const injectSchema = (html, schema) => {
  const script = `  <script type="application/ld+json">${JSON.stringify(schema)}</script>\n`;
  const withoutExisting = removeStructuredDataScripts(html);
  if (withoutExisting.includes('</head>')) return withoutExisting.replace(/\s*<\/head>/i, `\n${script}</head>`);
  return `${script}${withoutExisting}`;
};

const distRelativePath = (file) => relative(distDir, file).split(sep).join('/');

const sourceToolMetaPathForDist = (relativePath) => {
  const withoutLocale = relativePath.replace(/^(?:en|tr|ar)\//, '');
  if (!withoutLocale.startsWith('tools/') || !withoutLocale.endsWith('/index.html')) return null;
  return resolve('src', withoutLocale.replace(/\/index\.html$/, '/meta.json'));
};

const inferCategoryFromPath = (relativePath) => relativePath.replace(/^(?:en|tr|ar)\//, '').split('/')[1] || '';

const buildToolSchemaForFile = (html, file, relativePath) => {
  const metaPath = sourceToolMetaPathForDist(relativePath);
  if (!metaPath || !existsSync(metaPath)) return null;
  const meta = readJson(metaPath);
  const canonical = getCanonical(html, relativePath);
  const name = meta.name || getH1(html) || getTitle(html);
  const description = getMetaContent(html, 'description') || meta.description;
  const category = meta.category || inferCategoryFromPath(relativePath);
  const clientSide = Boolean(meta.hasClientSideProcessing) || /client-side|browser|never leaves your device/i.test(html);

  return buildToolPageSchema({
    url: canonical,
    name,
    description,
    category,
    version: meta.version,
    created: meta.created || '2026-01-01',
    updated: meta.updated,
    keywords: Array.isArray(meta.keywords) ? meta.keywords : [],
    clientSide,
    faqs: makeDefaultToolFaqs(name, clientSide),
    howToSteps: makeDefaultHowToSteps(name),
    dateModified: buildDate
  });
};

const extractCategoryItems = (html) => {
  const items = [];
  const seen = new Set();
  const linkPattern = /<a\b[^>]*href=["']([^"']*\/tools\/[^"']*\/)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = linkPattern.exec(html))) {
    const url = toAbsoluteUrl(match[1]);
    if (seen.has(url)) continue;
    const name = toPlainText(match[2]);
    if (!name || /^use tool$/i.test(name) || name.length > 90) continue;
    seen.add(url);
    items.push({ name, url });
  }
  return items;
};

const buildCategorySchemaForFile = (html, relativePath) => {
  if (!relativePath.replace(/^(?:en|tr|ar)\//, '').startsWith('categories/') || relativePath.endsWith('/index.html')) return null;
  const canonical = getCanonical(html, relativePath);
  const name = getH1(html) || getTitle(html) || inferCategoryLabel('');
  const description = getMetaContent(html, 'description') || `${name} from MC NovaTools.`;
  return buildCategoryPageSchema({
    url: canonical,
    name,
    description,
    items: extractCategoryItems(html),
    dateModified: buildDate
  });
};

const extractArticleSection = (html) => {
  const tag = toPlainText(/<span\b[^>]*class=["'][^"']*tag[^"']*["'][^>]*>([\s\S]*?)<\/span>/i.exec(html)?.[1] || '');
  return tag || 'Browser Tools';
};

const extractArticleImage = (html) => getMetaContent(html, 'og:image') || /<img\b[^>]*src=["']([^"']+)["'][^>]*>/i.exec(html)?.[1] || '';

const extractPublishedDate = (html) => /<time\b[^>]*datetime=["']([0-9]{4}-[0-9]{2}-[0-9]{2})["'][^>]*>/i.exec(html)?.[1] || '2026-01-01';

const countWords = (html) => {
  const article = /<article\b[\s\S]*?<\/article>/i.exec(html)?.[0] || html;
  const text = toPlainText(article);
  return text ? text.split(/\s+/).filter(Boolean).length : undefined;
};

const buildBlogSchemaForFile = (html, relativePath) => {
  const normalized = relativePath.replace(/^(?:[a-z]{2})\//, '');
  if (!normalized.startsWith('blog/articles/') || !normalized.endsWith('.html')) return null;
  const canonical = getCanonical(html, relativePath);
  const headline = getH1(html) || getTitle(html);
  const description = getMetaContent(html, 'description') || headline;
  return buildBlogPostSchema({
    url: canonical,
    headline,
    description,
    image: extractArticleImage(html),
    datePublished: extractPublishedDate(html),
    dateModified: buildDate,
    section: extractArticleSection(html),
    wordCount: countWords(html)
  });
};

const buildAuthorSchemaForFile = (html, relativePath) => {
  const normalized = relativePath.replace(/^(?:en|tr)\//, '');
  if (!normalized.startsWith('author/')) return null;
  const canonical = getCanonical(html, relativePath);
  const name = getH1(html) || getTitle(html);
  const description = getMetaContent(html, 'description') || `${name} author profile for MC NovaTools.`;
  if (/editorial/i.test(normalized) || /editorial/i.test(name)) {
    return buildEditorialAuthorPageSchema({ url: canonical, name, description, dateModified: buildDate });
  }
  return buildAuthorPageSchema({
    url: canonical,
    name,
    description,
    image: getMetaContent(html, 'og:image'),
    dateModified: buildDate
  });
};

const buildHomeSchemaForFile = (html, relativePath) => {
  if (!['index.html', 'en/index.html', 'tr/index.html', 'ar/index.html'].includes(relativePath)) return null;
  const canonical = getCanonical(html, relativePath);
  return buildHomeSchema({
    url: canonical,
    name: getTitle(html) || 'MC NovaTools',
    description: getMetaContent(html, 'description') || undefined,
    dateModified: buildDate
  });
};

const buildSchemaForFile = (html, file) => {
  const relativePath = distRelativePath(file);
  return buildToolSchemaForFile(html, file, relativePath)
    || buildBlogSchemaForFile(html, relativePath)
    || buildCategorySchemaForFile(html, relativePath)
    || buildAuthorSchemaForFile(html, relativePath)
    || buildHomeSchemaForFile(html, relativePath);
};

if (!existsSync(distDir)) {
  throw new Error('dist directory does not exist. Run the Vite build before structured data injection.');
}

const files = walkHtml(distDir);
const updated = [];
const stripped = [];

for (const file of files) {
  const html = readFileSync(file, 'utf8');
  const schema = buildSchemaForFile(html, file);
  if (schema) {
    writeFileSync(file, injectSchema(html, schema));
    updated.push(distRelativePath(file));
    continue;
  }

  const sanitized = removeStructuredDataScripts(html);
  if (sanitized !== html) {
    writeFileSync(file, sanitized);
    stripped.push(distRelativePath(file));
  }
}

console.log(`Injected Schema.org JSON-LD into ${updated.length} built HTML page(s).`);
console.log(`Removed legacy JSON-LD from ${stripped.length} built HTML page(s) without a Task 3 template.`);
console.log(`Shared graph IDs: ${structuredDataConstants.WEBSITE_ID}, ${structuredDataConstants.ORGANIZATION_ID}`);
