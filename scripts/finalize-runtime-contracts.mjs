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
const DEFERRED_STYLE_RE = /<link rel="preload" href="([^"]+)" as="style" onload="this\.onload=null;this\.rel='stylesheet'"><noscript><link rel="stylesheet" href="\1"><\/noscript>/g;

function listHtmlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...listHtmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
  }
  return files;
}

let strippedAdSenseScripts = 0;
let restoredPdfStyles = 0;
const htmlFiles = listHtmlFiles(distDir);

for (const filePath of htmlFiles) {
  const before = fs.readFileSync(filePath, 'utf8');
  let after = before.replace(ADSENSE_SCRIPT_RE, () => {
    strippedAdSenseScripts += 1;
    return '\n';
  });
  after = after.replace(ADSENSE_DNS_RE, '\n');

  const relative = path.relative(distDir, filePath).replace(/\\/g, '/');
  if (/(^|\/)tools\/pdf\/compress\/index\.html$/.test(relative)) {
    after = after.replace(DEFERRED_STYLE_RE, (_match, href) => {
      restoredPdfStyles += 1;
      return `<link rel="stylesheet" href="${href}">`;
    });
  }

  if (after !== before) fs.writeFileSync(filePath, after);
}

const activeAdSense = htmlFiles.filter((filePath) => ADSENSE_SCRIPT_RE.test(fs.readFileSync(filePath, 'utf8')));
ADSENSE_SCRIPT_RE.lastIndex = 0;
if (activeAdSense.length) {
  throw new Error(`active pre-consent AdSense script remains in ${activeAdSense.length} built HTML file(s)`);
}

const pdfCompressor = path.join(distDir, 'tools', 'pdf', 'compress', 'index.html');
if (!fs.existsSync(pdfCompressor)) throw new Error('built PDF compressor route is missing');
const pdfHtml = fs.readFileSync(pdfCompressor, 'utf8');
if (DEFERRED_STYLE_RE.test(pdfHtml)) {
  throw new Error('PDF compressor still contains deferred layout styles after finalization');
}

console.log(`Runtime contracts finalized: removed ${strippedAdSenseScripts} pre-consent AdSense script(s); restored ${restoredPdfStyles} PDF compressor stylesheet link(s).`);
