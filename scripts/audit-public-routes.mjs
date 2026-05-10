import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

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

function auditHomeShell() {
  const html = readDist('index.html');
  for (const marker of ['id="popularTasks"', 'class="task-chip-grid"', 'id="categoriesGrid"', 'class="category-nav-grid"']) {
    if (!html.includes(marker)) fail(`Home shell missing ${marker}`);
  }
  for (const mixedWord of ['Günlük İşlerinizi', 'En Sık Yapılan İşlemler', 'Kategoriler</span>']) {
    if (html.includes(mixedWord)) fail(`Home shell still contains Turkish source copy: ${mixedWord}`);
  }
}

function auditBlogManifestRoutes() {
  const locales = ['en', 'tr', 'ar'];
  let checked = 0;
  for (const locale of locales) {
    const manifestFile = path.join(repoRoot, 'src', 'i18n', 'blog', `${locale}.json`);
    const posts = JSON.parse(readFileSync(manifestFile, 'utf8'));
    for (const post of posts) {
      const route = `blog/articles/${post.slug}.html`;
      if (!distExists(route)) fail(`Blog manifest route missing for ${locale}/${post.slug}: ${route}`);
      checked += 1;
    }
  }
  if (checked < 20) fail(`Expected at least 20 blog article routes, checked ${checked}`);
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
} else {
  auditStaticHrefs('index.html');
  auditStaticHrefs('blog/index.html');
  for (const file of walkHtml('categories')) auditStaticHrefs(file);
  auditHomeShell();
  auditBlogManifestRoutes();
  auditCategoryShells();
}

console.log('Public route audit summary');
console.log(`- HTML category routes: ${existsSync(distDir) ? walkHtml('categories').length : 0}`);
console.log(`- Blog article routes checked: ${existsSync(distDir) ? ['en', 'tr', 'ar'].reduce((sum, locale) => sum + JSON.parse(readFileSync(path.join(repoRoot, 'src', 'i18n', 'blog', `${locale}.json`), 'utf8')).length, 0) : 0}`);

for (const message of warnings) console.warn(`WARN: ${message}`);
for (const message of failures) console.error(`FAIL: ${message}`);

if (failures.length > 0) process.exit(1);
