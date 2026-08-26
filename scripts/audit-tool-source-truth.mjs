import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const ROOT = resolve('src/tools');

function walk(dir, predicate = () => true) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) out.push(...walk(path, predicate));
    else if (predicate(path)) out.push(path);
  }
  return out;
}

function rel(path) {
  return relative(process.cwd(), path).split(sep).join('/');
}

function visibleText(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const hardPatterns = [
  ['placeholder Formspree id', /YOUR_FORM_ID/i],
  ['fake NovaLink redirect domain', /novalink\.co\//i],
  ['legacy generic upload boilerplate', /upload (?:a |the )?supported file/i],
  ['legacy irrelevant inspection boilerplate', /page order,? dimensions,? row count/i],
  ['legacy proprietary-file boilerplate', /proprietary file (?:type|format)/i],
  ['legacy damaged-structure boilerplate', /damaged structure/i]
];

const claimPatterns = [
  ['absolute fastest claim', /\bfastest\b/i],
  ['absolute no-quality-loss claim', /without losing quality|no quality loss/i],
  ['absolute security claim', /\b100% secure\b|completely secure/i],
  ['instant professional-result claim', /professional (?:quality )?results? instantly/i],
  ['internal phase copy', /\bphase\s+\d+\b/i]
];

const htmlFiles = walk(ROOT, (path) => path.endsWith(`${sep}index.html`));
const sourceFiles = walk(ROOT, (path) => /\.(?:m?js|html)$/i.test(path));
const hard = [];
const warnings = [];
const inventory = [];

for (const path of htmlFiles) {
  const html = readFileSync(path, 'utf8');
  const text = visibleText(html);
  const file = rel(path);
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const lastUpdatedCount = (text.match(/\blast updated\s*:/gi) || []).length;
  const hasNoindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)
    || /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html);
  const hasGenericByline = /intended for a practitioner who understands/i.test(text);
  const hasNetworkHint = /\/api\/live-data|\bfetch\s*\(|https:\/\//i.test(html);
  const localOnlyClaim = /(?:stays|remain(?:s)?) (?:entirely )?(?:in|inside) (?:your )?browser|never leaves (?:your )?(?:device|browser)|processed (?:entirely )?locally/i.test(text);

  inventory.push({ file, h1Count, lastUpdatedCount, hasNoindex, hasNetworkHint, localOnlyClaim });

  if (h1Count !== 1) hard.push(`${file}: expected exactly one <h1>, found ${h1Count}`);
  for (const [label, pattern] of hardPatterns) {
    if (pattern.test(text) || pattern.test(html)) hard.push(`${file}: ${label}`);
  }
  for (const [label, pattern] of claimPatterns) {
    if (pattern.test(text)) warnings.push(`${file}: ${label}`);
  }
  if (lastUpdatedCount > 1) warnings.push(`${file}: duplicate visible Last updated (${lastUpdatedCount})`);
  if (hasGenericByline) warnings.push(`${file}: generic practitioner author boilerplate`);
  if (localOnlyClaim && /\/api\/live-data|fetch\s*\(/i.test(html)) {
    warnings.push(`${file}: local-only privacy claim coexists with a network-request marker; manual verification required`);
  }
}

for (const path of sourceFiles) {
  const source = readFileSync(path, 'utf8');
  const file = rel(path);
  if (/deterministicSeries\s*\(/.test(source)) hard.push(`${file}: deterministicSeries synthetic-history helper/call remains`);
  if (/mockNews\b/.test(source)) warnings.push(`${file}: mockNews marker requires fail-closed/manual review`);
  if (/Math\.random\s*\(/.test(source) && /(?:ssl|live|price|stock|news|lookup|check)/i.test(file)) {
    warnings.push(`${file}: Math.random in a truth-sensitive tool requires simulator labeling/manual review`);
  }
}

const uniqueHard = [...new Set(hard)].sort();
const uniqueWarnings = [...new Set(warnings)].sort();
console.log(`source-truth inventory: ${inventory.length} tool pages scanned`);
console.log(`source-truth hard blockers: ${uniqueHard.length}`);
for (const item of uniqueHard) console.log(`HARD ${item}`);
console.log(`source-truth review warnings: ${uniqueWarnings.length}`);
for (const item of uniqueWarnings) console.log(`WARN ${item}`);

if (uniqueHard.length) {
  process.exitCode = 1;
} else {
  console.log('source-truth hard-blocker audit: pass');
}
