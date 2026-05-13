#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  blogArticleRouteKeys,
  blogArticleRoutes,
  blogHubPath,
  fallbackBlogLocale,
  normalizeBlogSlug,
  normalizeBlogSlugList,
  supportedBlogLocales
} from '../src/js/blog-routes.js';

const repoRoot = process.cwd();
const failures = [];
const routeKeys = new Map();

function fail(message) {
  failures.push(message);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, file), 'utf8'));
}

function readPosts(locale) {
  const manifest = `src/i18n/blog/${locale}.json`;
  if (fs.existsSync(path.join(repoRoot, manifest))) return readJson(manifest);
  return readJson(`src/i18n/blog/${fallbackBlogLocale}.json`);
}

function addRouteKey(key, owner) {
  const existing = routeKeys.get(key);
  if (existing) fail(`Duplicate blog route key ${key} for ${existing} and ${owner}`);
  routeKeys.set(key, owner);
}

function readSourceArticleSlugs() {
  const articleDir = path.join(repoRoot, 'src', 'blog', 'articles');
  if (!fs.existsSync(articleDir)) return [];
  return fs.readdirSync(articleDir)
    .filter((file) => file.endsWith('.html') && file !== 'index.html')
    .map((file) => normalizeBlogSlug(file.replace(/\.html$/, '')));
}

if (supportedBlogLocales.length !== 15) {
  fail(`Expected 15 supported blog locales, found ${supportedBlogLocales.length}`);
}

if (!fs.existsSync(path.join(repoRoot, 'src/blog/article-template.html'))) {
  fail('Missing shared blog article template: src/blog/article-template.html');
}

const fallbackPosts = readPosts(fallbackBlogLocale);
const sourceArticleSlugs = readSourceArticleSlugs();
const fallbackSlugs = new Set(fallbackPosts.map((post) => post.slug));
const contractSlugs = normalizeBlogSlugList([...fallbackSlugs, ...sourceArticleSlugs]);

for (const locale of supportedBlogLocales) {
  const hub = blogHubPath(locale);
  if (locale === fallbackBlogLocale && hub !== '/blog/index.html') fail(`Fallback blog hub must be /blog/index.html, got ${hub}`);
  if (locale !== fallbackBlogLocale && hub !== `/${locale}/blog/index.html`) fail(`Locale blog hub mismatch for ${locale}: ${hub}`);

  const posts = readPosts(locale);
  const seen = new Set();
  for (const post of posts) {
    let slug;
    try {
      slug = normalizeBlogSlug(post.slug);
    } catch (error) {
      fail(`${locale} manifest has invalid slug ${post.slug}: ${error.message}`);
      continue;
    }

    if (seen.has(slug)) fail(`${locale} manifest has duplicate slug: ${slug}`);
    seen.add(slug);

    if (!fallbackSlugs.has(slug)) fail(`${locale} manifest slug is not present in fallback manifest: ${slug}`);
  }

  for (const slug of contractSlugs) {
    const routes = blogArticleRoutes(slug, locale);
    const expectedPrefix = locale === fallbackBlogLocale ? '/blog/' : `/${locale}/blog/`;
    if (!routes.canonicalPath.startsWith(`${expectedPrefix}articles/`)) fail(`${locale}/${slug} canonical route is not locale-prefixed articles route: ${routes.canonicalPath}`);
    if (!routes.legacyPath.startsWith(expectedPrefix) || routes.legacyPath.includes('/articles/')) fail(`${locale}/${slug} legacy route mismatch: ${routes.legacyPath}`);

    const keys = blogArticleRouteKeys(slug, locale);
    addRouteKey(keys.canonicalKey, `${locale}/${slug} canonical`);
    addRouteKey(keys.legacyKey, `${locale}/${slug} legacy`);
  }
}

const expectedMinimum = supportedBlogLocales.length * contractSlugs.length * 2;
if (routeKeys.size < expectedMinimum) {
  fail(`Expected at least ${expectedMinimum} canonical+legacy route keys, found ${routeKeys.size}`);
}

if (failures.length > 0) {
  console.error('Blog route contract audit failed:');
  failures.forEach((message) => console.error(`- ${message}`));
  process.exit(1);
}

console.log(`✅ Blog route contract verified for ${supportedBlogLocales.length} locales, ${contractSlugs.length} article slugs, and ${routeKeys.size} article route keys.`);
