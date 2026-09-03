import { readFileSync, writeFileSync } from 'node:fs';

const WRITE = process.argv.includes('--write');
let changed = 0;

function edit(path, transform) {
  const original = readFileSync(path, 'utf8');
  const next = transform(original);
  if (next === original) return;
  changed += 1;
  if (WRITE) writeFileSync(path, next, 'utf8');
}

function mustReplace(text, search, replacement, label) {
  if (!text.includes(search)) throw new Error(`Indexability migration could not find: ${label}`);
  return text.replace(search, replacement);
}

edit('scripts/generate-localized-sitemap.mjs', (source) => {
  let next = source;
  const anchor = `function sourceBlogArticleSlugs() {`;
  const helper = `function toolSourceIsIndexable(file) {\n  const html = fs.readFileSync(path.join(rootDir, file), 'utf8');\n  const robotsMeta = html.match(/<meta[^>]+name=[\\"']robots[\\"'][^>]*>/i)?.[0]\n    || html.match(/<meta[^>]+content=[\\"'][^\\"']*[\\"'][^>]+name=[\\"']robots[\\"'][^>]*>/i)?.[0]\n    || '';\n  return !/content=[\\"'][^\\"']*noindex/i.test(robotsMeta);\n}\n\n`;
  if (!next.includes('function toolSourceIsIndexable(file)')) {
    next = mustReplace(next, anchor, helper + anchor, 'sitemap indexability helper anchor');
  }
  next = mustReplace(
    next,
    `  })\n    .sort()\n    .map((file) => urlEntry(\`/\${file.replace(/^src\\//, '').replace(/index\\.html$/, '')}\`, '0.8', 'weekly', 'Individual tool pages'))],`,
    `  })\n    .filter(toolSourceIsIndexable)\n    .sort()\n    .map((file) => urlEntry(\`/\${file.replace(/^src\\//, '').replace(/index\\.html$/, '')}\`, '0.8', 'weekly', 'Individual tool pages'))],`,
    'sitemap tool file pipeline'
  );
  return next;
});

edit('src/core/ads/adsense-config.mjs', (source) => {
  let next = source;
  const anchor = `function shouldBlockAds() {\n  if (!/(^|\\.)mc-novatools\\.com$/i.test(window.location.hostname)) return true;\n  if (isNonMonetizablePath()) return true;`;
  const replacement = `function shouldBlockAds() {\n  if (!/(^|\\.)mc-novatools\\.com$/i.test(window.location.hostname)) return true;\n  if (isNonMonetizablePath()) return true;\n  const robotsMeta = document.querySelector('meta[name=\"robots\" i]')?.getAttribute('content') || '';\n  if (/(^|[,\\s])noindex([,\\s]|$)/i.test(robotsMeta)) return true;`;
  next = mustReplace(next, anchor, replacement, 'AdSense noindex guard');
  return next;
});

edit('categories/finance-tools.html', (html) => {
  let next = html;
  const unavailable = ['cloud-cost', 'crypto-tax', 'life-insurance', 'tax'];
  for (const slug of unavailable) {
    next = next.replace(new RegExp(`<article class=\"guide-tool-card[\\s\\S]*?href=\"https://mc-novatools\\.com/tools/finance/${slug}/\"[\\s\\S]*?</article>`, 'g'), '');
    next = next.replace(new RegExp(`<li><div><strong>[^<]*</strong><p>[^<]*</p></div><a class=\"btn btn-primary\" href=\"https://mc-novatools\\.com/tools/finance/${slug}/\">Open tool</a></li>`, 'g'), '');
  }
  next = next.replace('<tr><td>Need infrastructure planning</td><td>Cloud Cost Comparison</td><td>Compares assumptions before purchase.</td></tr>', '');
  next = next.replace('Estimate rates, loans, savings, taxes and cloud costs with transparent calculator workflows.', 'Compare verified loan, savings, currency, market-data and return scenarios with explicit data sources and limitations.');
  next = next.replace('Estimate rates, loans, savings, taxes and cloud costs with transparent calculator workflows.', 'Compare verified loan, savings, currency, market-data and return scenarios with explicit data sources and limitations.');
  next = next.replace('Compare provider assumptions before procurement.', 'Use only source-verified utilities for planning.');
  // Remove unavailable routes from the compact JSON-LD ItemList and resequence later items.
  next = next.replace(/,?\{\"@type\":\"ListItem\",\"position\":3,\"url\":\"https:\/\/mc-novatools\.com\/tools\/finance\/cloud-cost\/\",\"name\":\"Cloud Cost Calculator\"\}/, '');
  next = next.replace(/\"position\":4,\"url\":\"https:\/\/mc-novatools\.com\/tools\/finance\/crypto-prices\//, '\"position\":3,\"url\":\"https://mc-novatools.com/tools/finance/crypto-prices/');
  next = next.replace(/\"position\":5,\"url\":\"https:\/\/mc-novatools\.com\/tools\/finance\/live-exchange\//, '\"position\":4,\"url\":\"https://mc-novatools.com/tools/finance/live-exchange/');
  next = next.replace(/\"position\":6,\"url\":\"https:\/\/mc-novatools\.com\/tools\/finance\/stock-lookup\//, '\"position\":5,\"url\":\"https://mc-novatools.com/tools/finance/stock-lookup/');
  next = next.replace(/\"position\":7,\"url\":\"https:\/\/mc-novatools\.com\/tools\/finance\/roi-calculator\//, '\"position\":6,\"url\":\"https://mc-novatools.com/tools/finance/roi-calculator/');
  return next;
});

console.log(`indexability migration: ${changed} file(s) ${WRITE ? 'updated' : 'would change'}`);
if (!WRITE && changed) process.exitCode = 1;
