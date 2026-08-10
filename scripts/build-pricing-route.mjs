import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const source = path.join(distDir, 'pricing.html');
const target = path.join(distDir, 'pricing', 'index.html');
const canonical = 'https://mc-novatools.com/pricing/';

if (!fs.existsSync(source)) {
  console.error('Missing dist/pricing.html. The pricing source must be part of the Vite MPA build.');
  process.exit(1);
}

let html = fs.readFileSync(source, 'utf8');
if (!/data-pricing-mode=["']interest-only["']/.test(html)) {
  console.error('Pricing page must remain explicitly interest-only until live billing is enabled.');
  process.exit(1);
}

function upsertCanonical(documentHtml) {
  if (/<link\b[^>]*rel=["']canonical["'][^>]*>/i.test(documentHtml)) {
    return documentHtml.replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/i, `<link rel="canonical" href="${canonical}">`);
  }
  return documentHtml.replace('</head>', `  <link rel="canonical" href="${canonical}">\n</head>`);
}

function normalizeSocialUrl(documentHtml) {
  return documentHtml.replace(
    /<meta\b([^>]*property=["']og:url["'][^>]*)>/i,
    (tag) => tag.replace(/content=["'][^"']*["']/i, `content="${canonical}"`)
  );
}

html = normalizeSocialUrl(upsertCanonical(html));
if (!html.includes(`<link rel="canonical" href="${canonical}">`)) {
  console.error('Pricing route canonical normalization failed.');
  process.exit(1);
}

fs.writeFileSync(source, html);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, html);
console.log('Pricing route: PASS (legacy and clean outputs canonicalize to /pricing/)');
