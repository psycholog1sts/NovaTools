import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeGeneralLocaleSeoHtml, normalizeI18nRuntimeSource } from '../src/js/locale-seo-normalizer.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const canonicalOrigin = 'https://mc-novatools.com';
const legacyWwwOrigin = 'https://www.mc-novatools.com';
const marker = 'data-novatools-first-visit-light';
const bootstrap = `<script ${marker}>(function(){try{var saved=localStorage.getItem('novatools-theme');var theme=saved==='light'||saved==='dark'?saved:'light';if(!saved)localStorage.setItem('novatools-theme',theme);document.documentElement.setAttribute('data-theme',theme);document.documentElement.style.colorScheme=theme;}catch(_error){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}})();</script>`;

if (!fs.existsSync(distDir)) {
  throw new Error('dist directory is missing; production output contract cannot be enforced');
}

function listHtmlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listHtmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function normalizeHtmlDefaultTheme(html) {
  return html.replace(/<html\b([^>]*?)\bdata-theme=(['"])dark\2([^>]*)>/i, '<html$1data-theme="light"$3>');
}

function injectBootstrap(html, relativePath) {
  if (html.includes(marker)) return html;
  if (!/<\/head>/i.test(html)) {
    throw new Error(`${relativePath} has no </head>; cannot enforce first-visit theme`);
  }
  return html.replace(/<\/head>/i, `  ${bootstrap}\n</head>`);
}

const htmlFiles = listHtmlFiles(distDir);
if (!htmlFiles.length) throw new Error('no built HTML files were found in dist');

let changedFiles = 0;
let normalizedWwwOrigins = 0;
let normalizedDefaultThemes = 0;
let injectedBootstraps = 0;
let normalizedLocaleSeoFiles = 0;

for (const filePath of htmlFiles) {
  const relative = path.relative(distDir, filePath).replace(/\\/g, '/');
  const before = fs.readFileSync(filePath, 'utf8');
  let after = before;

  const wwwMatches = after.match(/https:\/\/www\.mc-novatools\.com/g) || [];
  if (wwwMatches.length) {
    normalizedWwwOrigins += wwwMatches.length;
    after = after.split(legacyWwwOrigin).join(canonicalOrigin);
  }

  const themeBefore = after;
  after = normalizeHtmlDefaultTheme(after);
  if (after !== themeBefore) normalizedDefaultThemes += 1;

  const localeSeoBefore = after;
  after = normalizeGeneralLocaleSeoHtml(after);
  if (after !== localeSeoBefore) normalizedLocaleSeoFiles += 1;

  if (!after.includes(marker)) {
    after = injectBootstrap(after, relative);
    injectedBootstraps += 1;
  }

  if (after !== before) {
    fs.writeFileSync(filePath, after);
    changedFiles += 1;
  }
}

const runtimeI18nPath = path.join(distDir, 'i18n.js');
if (!fs.existsSync(runtimeI18nPath)) {
  throw new Error('dist/i18n.js is missing; locale SEO runtime contract cannot be enforced');
}
const runtimeI18nBefore = fs.readFileSync(runtimeI18nPath, 'utf8');
const runtimeI18nAfter = normalizeI18nRuntimeSource(runtimeI18nBefore);
const normalizedRuntimeI18n = runtimeI18nAfter !== runtimeI18nBefore;
if (normalizedRuntimeI18n) fs.writeFileSync(runtimeI18nPath, runtimeI18nAfter);

const missingBootstrap = [];
const staleWwwOrigins = [];
const darkHtmlDefaults = [];
const crossOriginInternalAssets = [];
const blockedGoogleFontStyles = [];
const staleLocaleSeoHtml = [];

for (const filePath of htmlFiles) {
  const relative = path.relative(distDir, filePath).replace(/\\/g, '/');
  const html = fs.readFileSync(filePath, 'utf8');
  if (!html.includes(marker)) missingBootstrap.push(relative);
  if (html.includes(legacyWwwOrigin)) staleWwwOrigins.push(relative);
  if (/<html\b[^>]*\bdata-theme=(['"])dark\1[^>]*>/i.test(html)) darkHtmlDefaults.push(relative);
  if (/<(?:link|script)\b[^>]*(?:href|src)=["']https:\/\/mc-novatools\.com\/(?:css|styles|js|assets|vendor|wasm)\//i.test(html)) crossOriginInternalAssets.push(relative);
  if (/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']https:\/\/fonts\.googleapis\.com\//i.test(html)) blockedGoogleFontStyles.push(relative);
  if (normalizeGeneralLocaleSeoHtml(html) !== html) staleLocaleSeoHtml.push(relative);
}

const finalRuntimeI18n = fs.readFileSync(runtimeI18nPath, 'utf8');
if (normalizeI18nRuntimeSource(finalRuntimeI18n) !== finalRuntimeI18n) {
  throw new Error('dist/i18n.js still contains non-deterministic canonical/hreflang query state after normalization');
}

if (missingBootstrap.length) {
  throw new Error(`first-visit light bootstrap missing from ${missingBootstrap.length} built HTML file(s): ${missingBootstrap.slice(0, 8).join(', ')}`);
}
if (staleWwwOrigins.length) {
  throw new Error(`stale www canonical origin remains in ${staleWwwOrigins.length} built HTML file(s): ${staleWwwOrigins.slice(0, 8).join(', ')}`);
}
if (darkHtmlDefaults.length) {
  throw new Error(`dark default remains on <html> in ${darkHtmlDefaults.length} built HTML file(s): ${darkHtmlDefaults.slice(0, 8).join(', ')}`);
}
if (crossOriginInternalAssets.length) {
  throw new Error(`canonical-origin internal assets remain in ${crossOriginInternalAssets.length} built HTML file(s): ${crossOriginInternalAssets.slice(0, 8).join(', ')}`);
}
if (blockedGoogleFontStyles.length) {
  throw new Error(`Google Font styles blocked by the production CSP remain in ${blockedGoogleFontStyles.length} built HTML file(s): ${blockedGoogleFontStyles.slice(0, 8).join(', ')}`);
}
if (staleLocaleSeoHtml.length) {
  throw new Error(`locale SEO normalization is not idempotent for ${staleLocaleSeoHtml.length} built HTML file(s): ${staleLocaleSeoHtml.slice(0, 8).join(', ')}`);
}

console.log(JSON.stringify({
  html_files: htmlFiles.length,
  changed_files: changedFiles,
  normalized_www_origins: normalizedWwwOrigins,
  normalized_default_themes: normalizedDefaultThemes,
  normalized_locale_seo_files: normalizedLocaleSeoFiles,
  normalized_runtime_i18n: normalizedRuntimeI18n,
  injected_first_visit_bootstraps: injectedBootstraps,
  canonical_origin: canonicalOrigin,
  default_theme: 'light'
}));
