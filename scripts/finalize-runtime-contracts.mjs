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
const INTERNAL_ASSET_ORIGIN_RE = /https:\/\/mc-novatools\.com\/(?=(?:js|vendor|css|assets|wasm)\/)/gi;
const SOURCE_TOOL_HREF_RE = /(href\s*=\s*["'])(?:https:\/\/mc-novatools\.com)?\/src\/tools\//gi;
const LEGACY_THEME_GET_RE = /localStorage\.getItem\((["'])theme\1\)/g;
const LEGACY_THEME_SET_RE = /localStorage\.setItem\((["'])theme\1\s*,/g;
const PROFESSIONAL_THEME_HREF = '/styles/theme-professional.css';
const PROFESSIONAL_THEME_LINK = `<link rel="stylesheet" href="${PROFESSIONAL_THEME_HREF}">`;
const BACKGROUND_REMOVER_V2_HREF = '/js/background-remover-v2.js';
const BACKGROUND_REMOVER_V2_SCRIPT = `<script src="${BACKGROUND_REMOVER_V2_HREF}" defer></script>`;

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

function injectProfessionalTheme(html, relativePath) {
  if (html.includes(`href="${PROFESSIONAL_THEME_HREF}"`) || html.includes(`href='${PROFESSIONAL_THEME_HREF}'`)) return html;
  if (!/<\/head>/i.test(html)) {
    throw new Error(`cannot inject professional theme stylesheet: ${relativePath} has no </head>`);
  }
  return html.replace(/<\/head>/i, `  ${PROFESSIONAL_THEME_LINK}\n</head>`);
}

function injectBackgroundRemoverV2(html, relativePath) {
  if (html.includes(BACKGROUND_REMOVER_V2_HREF)) return html;
  if (!/<\/body>/i.test(html)) {
    throw new Error(`cannot inject Background Remover v2: ${relativePath} has no </body>`);
  }
  return html.replace(/<\/body>/i, `  ${BACKGROUND_REMOVER_V2_SCRIPT}\n</body>`);
}

function auditManifestToolRoutes() {
  const manifestPath = path.join(root, 'tools-manifest.json');
  if (!fs.existsSync(manifestPath)) throw new Error('tools-manifest.json is missing during runtime contract finalization');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const tools = Array.isArray(manifest.tools) ? manifest.tools : [];
  const missing = [];

  for (const tool of tools) {
    let publicEntry = String(tool?.entry || '').trim();
    if (publicEntry.startsWith('/src/tools/')) publicEntry = publicEntry.replace(/^\/src\//, '/');
    if (!publicEntry.startsWith('/tools/')) {
      const category = String(tool?.category || '').replace(/^\/+|\/+$/g, '');
      const id = String(tool?.id || '').replace(/^\/+|\/+$/g, '');
      publicEntry = category && id ? `/tools/${category}/${id}/` : '';
    }
    if (!publicEntry) {
      missing.push(`${tool?.id || 'unknown'} (no public route)`);
      continue;
    }
    const routePath = publicEntry.replace(/^\//, '').replace(/\/$/, '/index.html');
    if (!fs.existsSync(path.join(distDir, routePath))) missing.push(`${tool?.id || publicEntry} -> ${publicEntry}`);
  }

  if (missing.length) {
    throw new Error(`tool manifest contains ${missing.length} missing public build route(s): ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ', ...' : ''}`);
  }
  return tools.length;
}

let strippedAdSenseScripts = 0;
let strippedStalePrefetches = 0;
let restoredPdfStyles = 0;
let strippedPdfWebFonts = 0;
let strippedPdfEnhancers = 0;
let normalizedPdfAssetOrigins = 0;
let normalizedSourceToolLinks = 0;
let normalizedLegacyThemeReads = 0;
let normalizedLegacyThemeWrites = 0;
let injectedProfessionalThemes = 0;
let injectedBackgroundRemoverV2 = 0;
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
  after = after.replace(SOURCE_TOOL_HREF_RE, (_match, prefix) => {
    normalizedSourceToolLinks += 1;
    return `${prefix}/tools/`;
  });
  after = after.replace(LEGACY_THEME_GET_RE, () => {
    normalizedLegacyThemeReads += 1;
    return "localStorage.getItem('novatools-theme')";
  });
  after = after.replace(LEGACY_THEME_SET_RE, () => {
    normalizedLegacyThemeWrites += 1;
    return "localStorage.setItem('novatools-theme',";
  });

  const relative = path.relative(distDir, filePath).replace(/\\/g, '/');
  const hadProfessionalTheme = after.includes(`href="${PROFESSIONAL_THEME_HREF}"`) || after.includes(`href='${PROFESSIONAL_THEME_HREF}'`);
  after = injectProfessionalTheme(after, relative);
  if (!hadProfessionalTheme) injectedProfessionalThemes += 1;

  if (/(^|\/)tools\/image\/background-remover\/index\.html$/.test(relative)) {
    const hadV2 = after.includes(BACKGROUND_REMOVER_V2_HREF);
    after = injectBackgroundRemoverV2(after, relative);
    if (!hadV2) injectedBackgroundRemoverV2 += 1;
  }

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
    after = after.replace(INTERNAL_ASSET_ORIGIN_RE, () => {
      normalizedPdfAssetOrigins += 1;
      return '/';
    });
  }

  if (after !== before) fs.writeFileSync(filePath, after);
}

const publishedMetaContracts = publishToolMetaContracts();
const verifiedManifestToolRoutes = auditManifestToolRoutes();

const activeAdSense = htmlFiles.filter((filePath) => ADSENSE_SCRIPT_RE.test(fs.readFileSync(filePath, 'utf8')));
ADSENSE_SCRIPT_RE.lastIndex = 0;
if (activeAdSense.length) {
  throw new Error(`active pre-consent AdSense script remains in ${activeAdSense.length} built HTML file(s)`);
}

const stalePrefetches = htmlFiles.filter((filePath) => /<link\b[^>]*\brel=["']prefetch["'][^>]*\bhref=["'](?:https:\/\/mc-novatools\.com)?\/tools\/popular\/?["']/i.test(fs.readFileSync(filePath, 'utf8')));
if (stalePrefetches.length) {
  throw new Error(`stale /tools/popular prefetch remains in ${stalePrefetches.length} built HTML file(s)`);
}

const sourceToolLinks = htmlFiles.filter((filePath) => /href\s*=\s*["'](?:https:\/\/mc-novatools\.com)?\/src\/tools\//i.test(fs.readFileSync(filePath, 'utf8')));
if (sourceToolLinks.length) {
  throw new Error(`source-only /src/tools links remain in ${sourceToolLinks.length} built HTML file(s)`);
}

const missingProfessionalTheme = htmlFiles.filter((filePath) => !fs.readFileSync(filePath, 'utf8').includes(PROFESSIONAL_THEME_HREF));
if (missingProfessionalTheme.length) {
  throw new Error(`professional theme stylesheet is missing from ${missingProfessionalTheme.length} built HTML file(s)`);
}

const legacyThemeKeyFiles = htmlFiles.filter((filePath) => /localStorage\.(?:getItem|setItem)\((["'])theme\1/.test(fs.readFileSync(filePath, 'utf8')));
if (legacyThemeKeyFiles.length) {
  throw new Error(`legacy theme storage key remains in ${legacyThemeKeyFiles.length} built HTML file(s)`);
}

const themeAsset = path.join(distDir, 'styles', 'theme-professional.css');
if (!fs.existsSync(themeAsset)) {
  throw new Error('professional theme stylesheet was not copied to /styles/theme-professional.css');
}

const backgroundRemover = path.join(distDir, 'tools', 'image', 'background-remover', 'index.html');
if (!fs.existsSync(backgroundRemover)) throw new Error('built Background Remover route is missing');
if (!fs.readFileSync(backgroundRemover, 'utf8').includes(BACKGROUND_REMOVER_V2_HREF)) {
  throw new Error('Background Remover v2 runtime was not injected into the public tool page');
}
if (!fs.existsSync(path.join(distDir, 'js', 'background-remover-v2.js'))) {
  throw new Error('Background Remover v2 runtime asset is missing from /js/background-remover-v2.js');
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
if (INTERNAL_ASSET_ORIGIN_RE.test(pdfHtml)) {
  throw new Error('PDF compressor still contains a canonical-host internal asset URL after finalization');
}
INTERNAL_ASSET_ORIGIN_RE.lastIndex = 0;

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

console.log(`Runtime contracts finalized: removed ${strippedAdSenseScripts} pre-consent AdSense script(s); removed ${strippedStalePrefetches} stale prefetch(es); normalized ${normalizedSourceToolLinks} source-only tool link(s); normalized ${normalizedLegacyThemeReads} legacy theme read(s) and ${normalizedLegacyThemeWrites} write(s); injected professional theme into ${injectedProfessionalThemes} HTML file(s); injected Background Remover v2 into ${injectedBackgroundRemoverV2} public route(s); verified ${verifiedManifestToolRoutes} manifest tool route(s); restored ${restoredPdfStyles} PDF compressor stylesheet link(s); removed ${strippedPdfWebFonts} PDF web-font stylesheet(s); removed ${strippedPdfEnhancers} generic PDF enhancer script(s); normalized ${normalizedPdfAssetOrigins} PDF internal asset origin(s); published ${publishedMetaContracts} tool metadata contract(s); suppressed redundant PDF quality-panel injection.`);
