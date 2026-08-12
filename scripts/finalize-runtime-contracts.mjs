import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

if (!fs.existsSync(distDir)) {
  throw new Error('dist directory is missing; runtime contracts cannot be finalized');
}

const ADSENSE_SCRIPT_RE = /\n?\s*<script\b(?=[^>]*\bsrc\s*=\s*["']https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-[0-9]{16}[^"']*["'])[^>]*>\s*<\/script>\s*/gi;
const ADSENSE_DNS_RE = /\n?\s*<link\b(?=[^>]*\brel\s*=\s*["']dns-prefetch["'])(?=[^>]*\bhref\s*=\s*["']https:\/\/pagead2\.googlesyndication\.com["'])[^>]*\/?\s*>\s*/gi;
const STALE_POPULAR_PREFETCH_RE = /\n?\s*<link\b(?=[^>]*\brel\s*=\s*["']prefetch["'])(?=[^>]*\bhref\s*=\s*["'](?:https:\/\/mc-novatools\.com)?\/tools\/popular(?:\/?)["'])[^>]*\/?\s*>\s*/gi;
const DEFERRED_STYLE_RE = /<link rel="preload" href="([^"]+)" as="style" onload="this\.onload=null;this\.rel='stylesheet'"><noscript><link rel="stylesheet" href="\1"><\/noscript>/g;
const GOOGLE_FONT_STYLESHEET_RE = /\n?\s*<link\b(?=[^>]*\brel\s*=\s*["']stylesheet["'])(?=[^>]*\bhref\s*=\s*["']https:\/\/fonts\.googleapis\.com\/[^"']+["'])[^>]*\/?\s*>\s*/gi;
const GOOGLE_FONT_PRECONNECT_RE = /\n?\s*<link\b(?=[^>]*\brel\s*=\s*["']preconnect["'])(?=[^>]*\bhref\s*=\s*["']https:\/\/fonts\.(?:googleapis|gstatic)\.com["'])[^>]*\/?\s*>\s*/gi;
const PDF_ENHANCER_SCRIPT_RE = /\n?\s*<script\b(?=[^>]*\bsrc\s*=\s*["'](?:https:\/\/mc-novatools\.com)?\/js\/tool-page-enhancer\.js["'])[^>]*>\s*<\/script>\s*/gi;
const PDF_WORKFLOW_STYLE_RE = /\n?\s*<link\b(?=[^>]*\brel\s*=\s*["']stylesheet["'])(?=[^>]*\bhref\s*=\s*["'](?:https:\/\/mc-novatools\.com)?\/(?:styles|src\/styles)\/tool-workflow\.css["'])[^>]*\/?\s*>\s*/gi;

function listHtmlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listHtmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

function publishToolMetaContracts() {
  const toolsRoot = path.join(root, 'src', 'tools');
  const outputRoot = path.join(distDir, 'meta');
  let published = 0;

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile() || entry.name !== 'meta.json') continue;

      const relativeToolDir = path.relative(toolsRoot, path.dirname(full));
      const target = path.join(outputRoot, `${relativeToolDir}.json`);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(full, target);
      published += 1;
    }
  }

  walk(toolsRoot);
  return published;
}

let strippedAdSenseScripts = 0;
let strippedStalePrefetches = 0;
let restoredPdfStyles = 0;
let strippedPdfWebFonts = 0;
let strippedPdfEnhancers = 0;
const htmlFiles = listHtmlFiles(distDir);

for (const filePath of htmlFiles) {
  const before = fs.readFileSync(filePath, 'utf8');
  let after = before.replace(ADSENSE_SCRIPT_RE, () => {
    strippedAdSenseScripts += 1;
    return '\n';
  });
  after = after.replace(ADSENSE_DNS_RE, '\n');
  after = after.replace(STALE_POPULAR_PREFETCH_RE, () => {
    strippedStalePrefetches += 1;
    return '\n';
  });

  const relative = path.relative(distDir, filePath).replace(/\\/g, '/');
  if (/(^|\/)tools\/pdf\/compress\/index\.html$/.test(relative)) {
    after = after.replace(DEFERRED_STYLE_RE, (_match, href) => {
      restoredPdfStyles += 1;
      return `<link rel="stylesheet" href="${href}">`;
    });
    after = after.replace(GOOGLE_FONT_STYLESHEET_RE, () => {
      strippedPdfWebFonts += 1;
      return '\n';
    });
    after = after.replace(GOOGLE_FONT_PRECONNECT_RE, '\n');
    after = after.replace(PDF_ENHANCER_SCRIPT_RE, () => {
      strippedPdfEnhancers += 1;
      return '\n';
    });
    after = after.replace(PDF_WORKFLOW_STYLE_RE, '\n');
  }

  if (after !== before) fs.writeFileSync(filePath, after);
}

const publishedMetaContracts = publishToolMetaContracts();

const activeAdSense = htmlFiles.filter((filePath) => ADSENSE_SCRIPT_RE.test(fs.readFileSync(filePath, 'utf8')));
ADSENSE_SCRIPT_RE.lastIndex = 0;
if (activeAdSense.length) {
  throw new Error(`active pre-consent AdSense script remains in ${activeAdSense.length} built HTML file(s)`);
}

const stalePrefetches = htmlFiles.filter((filePath) => /<link\b[^>]*\brel=["']prefetch["'][^>]*\bhref=["'](?:https:\/\/mc-novatools\.com)?\/tools\/popular\/?["']/i.test(fs.readFileSync(filePath, 'utf8')));
if (stalePrefetches.length) {
  throw new Error(`stale /tools/popular prefetch remains in ${stalePrefetches.length} built HTML file(s)`);
}

const pdfCompressor = path.join(distDir, 'tools', 'pdf', 'compress', 'index.html');
if (!fs.existsSync(pdfCompressor)) throw new Error('built PDF compressor route is missing');
const pdfHtml = fs.readFileSync(pdfCompressor, 'utf8');
if (DEFERRED_STYLE_RE.test(pdfHtml)) {
  throw new Error('PDF compressor still contains deferred layout styles after finalization');
}
if (/https:\/\/fonts\.(?:googleapis|gstatic)\.com/i.test(pdfHtml)) {
  throw new Error('PDF compressor still contains an external Google Fonts dependency after finalization');
}
if (/tool-page-enhancer\.js/i.test(pdfHtml) || /tool-workflow\.css/i.test(pdfHtml)) {
  throw new Error('PDF compressor still contains the generic tool-page enhancer after finalization');
}

const pdfMetaContract = path.join(distDir, 'meta', 'pdf', 'compress.json');
if (!fs.existsSync(pdfMetaContract)) {
  throw new Error('PDF compressor metadata contract was not published to /meta/pdf/compress.json');
}

// The shared i18n runtime adds a large generic workflow panel after DOMContentLoaded
// on legacy tool pages. PDF Compressor already ships its own complete workflow/help
// surface, so adding the generic panel is redundant and creates a large measurable CLS.
const i18nPath = path.join(distDir, 'i18n.js');
if (!fs.existsSync(i18nPath)) throw new Error('built i18n runtime is missing');
const qualityGuard = "    if (!/\\/tools\\//.test(window.location.pathname)) return;";
const pdfStableGuard = "    if (/\\/tools\\/pdf\\/compress\\/?$/.test(window.location.pathname)) return;";
let i18nSource = fs.readFileSync(i18nPath, 'utf8');
if (!i18nSource.includes(pdfStableGuard)) {
  if (!i18nSource.includes(qualityGuard)) {
    throw new Error('tool quality enhancement guard was not found in built i18n runtime');
  }
  i18nSource = i18nSource.replace(qualityGuard, `${qualityGuard}\n${pdfStableGuard}`);
  fs.writeFileSync(i18nPath, i18nSource);
}
if (!fs.readFileSync(i18nPath, 'utf8').includes(pdfStableGuard)) {
  throw new Error('PDF compressor CLS guard was not applied to built i18n runtime');
}

console.log(`Runtime contracts finalized: removed ${strippedAdSenseScripts} pre-consent AdSense script(s); removed ${strippedStalePrefetches} stale prefetch(es); restored ${restoredPdfStyles} PDF compressor stylesheet link(s); removed ${strippedPdfWebFonts} PDF web-font stylesheet(s); removed ${strippedPdfEnhancers} generic PDF enhancer script(s); published ${publishedMetaContracts} tool metadata contract(s); suppressed redundant PDF quality-panel injection.`);
