import { readFileSync } from 'node:fs';
import { globSync } from 'glob';

const htmlFiles = globSync('src/tools/**/index.html', {
  ignore: ['**/demo-*/**', '**/experimental/**', '**/test/**']
}).sort();
const codeFiles = globSync('src/tools/**/*.{js,mjs}', {
  ignore: ['**/demo-*/**', '**/experimental/**', '**/test/**']
}).sort();

const noindex = (html) => /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html) ||
  /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html);

const findings = [];
const add = (file, rule, evidence) => findings.push({ file, rule, evidence: evidence.replace(/\s+/g, ' ').trim().slice(0, 180) });

const claimRules = [
  ['absolute-quality', /\b(?:without losing quality|lossless quality|no quality loss|professional-quality|professional quality|fastest|best-in-class|100% accurate|guaranteed)\b/i],
  ['live-or-realtime', /\b(?:real[- ]?time|live data|live prices?|live rates?|canlı veri|canlı fiyat|canlı kur)\b/i],
  ['trend-or-history', /\b(?:recent trend|historical data|price history|trend chart|7[- ]day|7 day|7 günlük|son 7 gün|recent movement)\b/i],
  ['ai-claim', /\b(?:AI[- ]powered|artificial intelligence|machine learning|yapay zek[âa])\b/i],
  ['blanket-local-privacy', /\b(?:100% private|never leaves your browser|no data leaves your browser|all processing happens locally|entirely in your browser|tüm işlemler tarayıcıda|verileriniz tarayıcınızdan çıkmaz)\b/i],
  ['engagement-or-trending', /\b(?:trending hashtags?|boost engagement|boost reach|increase engagement|viral hashtags?)\b/i]
];

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  if (noindex(html)) continue;
  const text = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ');
  for (const [rule, pattern] of claimRules) {
    const match = text.match(pattern);
    if (match) add(file, rule, match[0]);
  }
  if (/novalink\.co/i.test(html)) add(file, 'fake-short-domain', 'novalink.co');
  if (/Phase\s*\d+|workflow\s*phase/i.test(text)) add(file, 'internal-phase-copy', text.match(/Phase\s*\d+[^<.]{0,120}|workflow\s*phase[^<.]{0,120}/i)?.[0] || 'phase copy');
}

for (const file of codeFiles) {
  const code = readFileSync(file, 'utf8');
  if (/deterministicSeries\s*\(/.test(code) && /(?:trend|7 günlük|history|historical|price chart|fiyat çizgisi)/i.test(code)) {
    add(file, 'synthetic-series-presented-as-history', 'deterministicSeries + trend/history label');
  }
  if (/Math\.random\s*\(/.test(code) && /(?:live|real[- ]?time|trend|history|historical|forecast)/i.test(code)) {
    add(file, 'random-data-presented-as-real', 'Math.random + live/trend/history/forecast wording');
  }
  if (/novalink\.co/i.test(code)) add(file, 'fake-short-domain', 'novalink.co');
}

const deduped = [...new Map(findings.map((item) => [`${item.file}|${item.rule}`, item])).values()];
console.log(`Source-truth scan: ${htmlFiles.length} tool pages, ${codeFiles.length} tool code files.`);
if (!deduped.length) {
  console.log('Source-truth high-risk scanner: pass');
  process.exit(0);
}

console.error(`Source-truth high-risk scanner found ${deduped.length} candidate mismatch(es):`);
for (const item of deduped) console.error(`- [${item.rule}] ${item.file}: ${item.evidence}`);
console.error('\nEach candidate must be source-verified and then corrected, explicitly qualified, or fail-closed/noindexed before this gate may pass.');
process.exit(1);
