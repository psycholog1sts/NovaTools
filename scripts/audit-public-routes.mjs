import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { blogArticleRoutes, blogHubPath, fallbackBlogLocale, supportedBlogLocales } from '../src/js/blog-routes.js';

const repoRoot = process.cwd();
const distDir = path.join(repoRoot, 'dist');
const failures = [];
const warnings = [];

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readDist(file) {
  return readFileSync(path.join(distDir, file), 'utf8');
}

function distExists(file) {
  return existsSync(path.join(distDir, file));
}

function resolveRoute(href) {
  const clean = href.split('#')[0].split('?')[0];
  if (!clean || clean.startsWith('mailto:') || clean.startsWith('tel:') || /^[a-z]+:/i.test(clean)) return null;
  if (!clean.startsWith('/')) return null;

  const withoutSlash = clean.replace(/^\//, '');
  const candidates = [];
  if (withoutSlash === '') candidates.push('index.html');
  else if (withoutSlash.endsWith('/')) candidates.push(`${withoutSlash}index.html`);
  else if (path.extname(withoutSlash)) candidates.push(withoutSlash);
  else candidates.push(`${withoutSlash}.html`, `${withoutSlash}/index.html`);

  return { href, candidates };
}

function extractHrefs(html) {
  return [...html.matchAll(/\bhref=["']([^"']+)["']/g)].map((match) => match[1]);
}


function extractSitemapLocs() {
  const sitemapFiles = ['sitemap.xml', 'public/sitemap.xml'];
  const locs = [];
  for (const file of sitemapFiles) {
    const fullPath = path.join(repoRoot, file);
    if (!existsSync(fullPath)) continue;
    const xml = readFileSync(fullPath, 'utf8');
    locs.push(...[...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/g)].map((match) => match[1]
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")));
  }
  return [...new Set(locs)];
}

function auditSitemapRoutes() {
  const locs = extractSitemapLocs();
  if (!locs.length) {
    warn('No sitemap <loc> entries found to audit');
    return;
  }

  for (const loc of locs) {
    let parsed;
    try {
      parsed = new URL(loc);
    } catch {
      fail(`Sitemap contains invalid URL: ${loc}`);
      continue;
    }

    if (parsed.hostname !== 'mc-novatools.com') continue;
    const resolved = resolveRoute(parsed.pathname);
    if (!resolved) continue;
    if (!resolved.candidates.some(distExists)) {
      fail(`Sitemap URL ${loc} points to missing build route (tried ${resolved.candidates.join(', ')})`);
    }
  }
}

function auditStaticHrefs(file) {
  if (!distExists(file)) {
    fail(`Missing public surface file: ${file}`);
    return;
  }
  const html = readDist(file);
  for (const href of extractHrefs(html)) {
    const resolved = resolveRoute(href);
    if (!resolved) continue;
    if (!resolved.candidates.some(distExists)) {
      fail(`${file} links to missing route ${href} (tried ${resolved.candidates.join(', ')})`);
    }
  }
}

function walkHtml(dir) {
  const absolute = path.join(distDir, dir);
  if (!existsSync(absolute)) return [];
  const out = [];
  for (const entry of readdirSync(absolute)) {
    const full = path.join(absolute, entry);
    const rel = path.relative(distDir, full).replace(/\\/g, '/');
    if (statSync(full).isDirectory()) out.push(...walkHtml(rel));
    else if (entry.endsWith('.html')) out.push(rel);
  }
  return out;
}

function verifyPostBuildBlogRoutes() {
  if (!distExists('blog/index.html')) {
    fail('Public route audit requires a completed build: missing blog/index.html. Run npm run build before npm run audit:public-routes.');
    return false;
  }

  const missingHubs = supportedBlogLocales
    .filter((locale) => locale !== fallbackBlogLocale)
    .map((locale) => blogHubPath(locale).replace(/^\//, ''))
    .filter((route) => !distExists(route));

  if (missingHubs.length > 0) {
    const preview = missingHubs.slice(0, 5).join(', ');
    const suffix = missingHubs.length > 5 ? ', ...' : '';
    fail(`Public route audit requires post-build localized blog routes. Missing ${missingHubs.length} hub route(s): ${preview}${suffix}. Run npm run build before npm run audit:public-routes.`);
    return false;
  }

  return true;
}

function auditHomeShell() {
  const html = readDist('index.html');
  for (const marker of ['id="popularTasks"', 'class="task-chip-grid"', 'id="categoriesGrid"', 'class="category-nav-grid"']) {
    if (!html.includes(marker)) fail(`Home shell missing ${marker}`);
  }
  for (const mixedWord of ['Günlük İşlerinizi', 'En Sık Yapılan İşlemler', 'Kategoriler</span>']) {
    if (html.includes(mixedWord)) fail(`Home shell still contains Turkish source copy: ${mixedWord}`);
  }
}

function readBlogPosts(locale) {
  const manifestFile = path.join(repoRoot, 'src', 'i18n', 'blog', `${locale}.json`);
  if (existsSync(manifestFile)) return JSON.parse(readFileSync(manifestFile, 'utf8'));
  return JSON.parse(readFileSync(path.join(repoRoot, 'src', 'i18n', 'blog', `${fallbackBlogLocale}.json`), 'utf8'));
}

function readSourceArticleSlugs() {
  const articleDir = path.join(repoRoot, 'src', 'blog', 'articles');
  if (!existsSync(articleDir)) return [];
  return readdirSync(articleDir)
    .filter((file) => file.endsWith('.html') && file !== 'index.html')
    .map((file) => file.replace(/\.html$/, ''));
}

function auditBlogManifestRoutes() {
  let checked = 0;
  for (const locale of supportedBlogLocales) {
    const hubRoute = blogHubPath(locale).replace(/^\//, '');
    if (!distExists(hubRoute)) fail(`Blog hub route missing for ${locale}: ${hubRoute}`);

    for (const post of readBlogPosts(locale)) {
      const routes = blogArticleRoutes(post.slug, locale);
      for (const [routeType, routePath] of Object.entries(routes)) {
        const route = routePath.replace(/^\//, '');
        if (!distExists(route)) fail(`Blog manifest ${routeType} missing for ${locale}/${post.slug}: ${route}`);
      }
      checked += 1;
    }
  }
  if (checked < 20) fail(`Expected at least 20 blog article routes, checked ${checked}`);
}


function auditGeneratedArticleRoutes() {
  const manifestSlugs = new Set(supportedBlogLocales.flatMap((locale) => readBlogPosts(locale).map((post) => post.slug)));
  const sourceSlugs = readSourceArticleSlugs();
  const routeSlugs = [...new Set([...manifestSlugs, ...sourceSlugs])].sort((a, b) => a.localeCompare(b));
  for (const locale of supportedBlogLocales) {
    for (const slug of routeSlugs) {
      for (const [routeType, routePath] of Object.entries(blogArticleRoutes(slug, locale))) {
        const route = routePath.replace(/^\//, '');
        if (!distExists(route)) fail(`Generated blog ${routeType} missing for ${locale}/${slug}: ${route}`);
      }
    }
  }
}

function auditCategoryShells() {
  const categories = walkHtml('categories').filter((file) => file !== 'categories/index.html');
  if (categories.length < 12) warn(`Expected 12+ category pages; found ${categories.length}`);
  for (const file of categories) {
    const html = readDist(file);
    if (!html.includes('guide-tools-grid') || !html.includes('guide-tool-card')) {
      fail(`${file} is missing normalized category tool card wrappers`);
    }
  }
}

if (!existsSync(distDir)) {
  fail('dist directory does not exist; run npm run build first');
} else if (verifyPostBuildBlogRoutes()) {
  auditStaticHrefs('index.html');
  auditStaticHrefs('blog/index.html');
  for (const file of walkHtml('blog')) auditStaticHrefs(file);
  for (const locale of supportedBlogLocales.filter((item) => item !== fallbackBlogLocale)) {
    for (const file of walkHtml(`${locale}/blog`)) auditStaticHrefs(file);
  }
  for (const file of walkHtml('categories')) auditStaticHrefs(file);
  auditSitemapRoutes();
  auditHomeShell();
  auditBlogManifestRoutes();
  auditGeneratedArticleRoutes();
  auditCategoryShells();
}

console.log('Public route audit summary');
console.log(`- HTML category routes: ${existsSync(distDir) ? walkHtml('categories').length : 0}`);
console.log(`- Blog article routes checked: ${existsSync(distDir) ? supportedBlogLocales.reduce((sum, locale) => sum + readBlogPosts(locale).length, 0) : 0}`);
console.log(`- Generated/source blog article slugs checked: ${existsSync(distDir) ? readSourceArticleSlugs().length : 0}`);

for (const message of warnings) console.warn(`WARN: ${message}`);
for (const message of failures) console.error(`FAIL: ${message}`);

if (failures.length > 0) process.exit(1);
