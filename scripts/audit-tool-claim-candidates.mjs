import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

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

function stripEmbeddedCode(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--([\s\S]*?)-->/g, ' ');
}

function visibleText(html) {
  return stripEmbeddedCode(html)
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

const claimPatterns = new Map([
  ['live', /\blive\b|\bcanlı\b/gi],
  ['real-time', /real[- ]?time|gerçek zamanlı/gi],
  ['instant', /\binstant(?:ly)?\b|\banında\b/gi],
  ['accurate', /\baccurate(?:ly)?\b|\bdoğru(?:lukla)?\b/gi],
  ['exact', /\bexact(?:ly)?\b|\bkesin\b/gi],
  ['secure', /\bsecure(?:ly)?\b|\bgüvenli(?:ce)?\b/gi],
  ['private', /\bprivate\b|\bprivacy\b|\bgizli(?:lik)?\b/gi],
  ['local', /browser[- ]only|client[- ]side|\blocal(?:ly)?\b|tarayıcıda|cihazınızda/gi],
  ['never-uploaded', /never (?:gets? )?upload(?:ed|s)|never leaves (?:your )?(?:device|browser)|no (?:file )?upload|dosya(?:lar)? (?:asla )?(?:yüklenmez|sunucuya gönderilmez)/gi],
  ['lossless', /\blossless\b|kayıpsız/gi],
  ['no-quality-loss', /without losing quality|no quality loss|kalite kaybı olmadan/gi],
  ['unlimited', /\bunlimited\b|sınırsız/gi],
  ['fastest', /\bfastest\b|en hızlı/gi],
  ['best', /\bbest\b|en iyi/gi],
  ['professional', /\bprofessional\b|profesyonel/gi],
  ['ai', /\bAI\b|artificial intelligence|yapay zek[âa]/gi],
  ['automatic', /\bautomatic(?:ally)?\b|otomatik/gi],
  ['guaranteed', /\bguaranteed?\b|garanti(?:li)?/gi],
  ['free', /\bfree\b|ücretsiz/gi],
  ['no-limits', /no limits?|limit yok|limitsiz/gi],
  ['100-percent', /\b100\s*%/gi],
  ['up-to-percent', /up to\s+\d{1,3}\s*%|%\s*\d{1,3}['’']?e kadar/gi],
  ['encryption', /\bencrypt(?:ed|ion)?\b|şifreleme|şifreli/gi],
  ['anonymous', /\banonymous(?:ly)?\b|anonim/gi],
  ['no-tracking', /no tracking|not track(?:ed|ing)?|takip edilmez|izlenmez/gi]
]);

function snippets(text, pattern) {
  const matches = [];
  pattern.lastIndex = 0;
  let match;
  while ((match = pattern.exec(text)) && matches.length < 4) {
    const start = Math.max(0, match.index - 80);
    const end = Math.min(text.length, match.index + match[0].length + 120);
    matches.push(text.slice(start, end).trim());
    if (!pattern.global) break;
  }
  pattern.lastIndex = 0;
  return matches;
}

function localScriptSources(html, pageFile) {
  const sources = [];
  const regex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html))) {
    const src = match[1].split(/[?#]/)[0];
    if (!src || /^https?:\/\//i.test(src) || src.startsWith('//')) continue;
    let path;
    if (src.startsWith('/src/')) path = resolve(src.slice(1));
    else if (src.startsWith('/')) continue;
    else path = resolve(dirname(pageFile), src);
    if (existsSync(path) && statSync(path).isFile()) sources.push(path);
  }
  return [...new Set(sources)];
}

function networkSignals(source) {
  const signals = [];
  if (/\bfetch\s*\(/.test(source)) signals.push('fetch');
  if (/XMLHttpRequest/.test(source)) signals.push('XMLHttpRequest');
  if (/\bWebSocket\s*\(/.test(source)) signals.push('WebSocket');
  if (/\/api\//.test(source)) signals.push('first-party-api');
  if (/https?:\/\//.test(source)) signals.push('absolute-url');
  if (/<form[^>]+action=["']https?:\/\//i.test(source)) signals.push('external-form');
  return signals;
}

function syntheticSignals(source) {
  const signals = [];
  if (/\bmock[A-Z_]|\bmock(?:Data|Results?|News|Prices?|Response)\b/i.test(source)) signals.push('mock-data');
  if (/deterministicSeries\s*\(/.test(source)) signals.push('deterministic-series');
  if (/Math\.random\s*\(/.test(source)) signals.push('Math.random');
  if (/placeholder(?:Api|Data|Result|Response)|YOUR_[A-Z0-9_]+/i.test(source)) signals.push('placeholder');
  return signals;
}

const pages = walk(ROOT, (path) => path.endsWith(`${sep}index.html`));
const candidates = [];
let indexableCount = 0;
let noindexCount = 0;
let pagesWithNetworkSignals = 0;
let pagesWithSyntheticSignals = 0;

for (const pageFile of pages) {
  const html = readFileSync(pageFile, 'utf8');
  const text = visibleText(html);
  const route = `/${rel(pageFile).replace(/^src\//, '').replace(/index\.html$/, '')}`;
  const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)
    || /<meta[^>]+content=["'][^"']*noindex[^"']*["'][^>]+name=["']robots["']/i.test(html);
  if (noindex) noindexCount += 1; else indexableCount += 1;

  const claims = {};
  for (const [id, pattern] of claimPatterns) {
    const found = snippets(text, pattern);
    if (found.length) claims[id] = found;
  }

  const sources = localScriptSources(html, pageFile);
  const sourceEvidence = sources.map((sourceFile) => {
    const source = readFileSync(sourceFile, 'utf8');
    return {
      file: rel(sourceFile),
      network: networkSignals(source),
      synthetic: syntheticSignals(source)
    };
  });
  const pageNetwork = networkSignals(html);
  const pageSynthetic = syntheticSignals(html);
  if (pageNetwork.length || sourceEvidence.some((item) => item.network.length)) pagesWithNetworkSignals += 1;
  if (pageSynthetic.length || sourceEvidence.some((item) => item.synthetic.length)) pagesWithSyntheticSignals += 1;

  if (Object.keys(claims).length || pageNetwork.length || pageSynthetic.length || sourceEvidence.some((item) => item.network.length || item.synthetic.length)) {
    candidates.push({
      route,
      file: rel(pageFile),
      noindex,
      claims,
      pageNetwork,
      pageSynthetic,
      sources: sourceEvidence
    });
  }
}

console.log(`claim candidate inventory: ${pages.length} tool pages`);
console.log(`claim candidate indexability: ${indexableCount} indexable, ${noindexCount} noindex`);
console.log(`claim candidate pages with network signals: ${pagesWithNetworkSignals}`);
console.log(`claim candidate pages with synthetic signals: ${pagesWithSyntheticSignals}`);
console.log(`claim candidate pages requiring source review: ${candidates.length}`);
for (const item of candidates) {
  const claimIds = Object.keys(item.claims);
  const network = [...new Set([...item.pageNetwork, ...item.sources.flatMap((source) => source.network)])];
  const synthetic = [...new Set([...item.pageSynthetic, ...item.sources.flatMap((source) => source.synthetic)])];
  console.log(`CANDIDATE ${item.route} claims=[${claimIds.join(',') || '-'}] network=[${network.join(',') || '-'}] synthetic=[${synthetic.join(',') || '-'}]`);
}

// Candidate terms are intentionally not release blockers. They require source review
// and explicit certification. Deterministic contradictions remain enforced by
// audit-tool-source-truth.mjs and the certification gate introduced per category.
