#!/usr/bin/env node
/**
 * Blog originality gate.
 *
 * The article corpus was partly produced from a template: the same paragraphs
 * appear verbatim in dozens of posts with only the topic phrase substituted.
 * Pages like that are scaled, near-duplicate content — they are the reason a
 * site gets flagged for low-value content, and no amount of word count fixes
 * them.
 *
 * This script measures, for every article, the share of its sentences that
 * also appear verbatim in other articles, and enforces the result against
 * src/data/blog-publication.json:
 *
 *   --check (default) fails when a PUBLISHED article is above the threshold,
 *                     when an article is missing from the record, or when the
 *                     record names an article that no longer exists.
 *   --report          prints the measurement without failing.
 *   --write           rewrites the record from the current measurement.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { globSync } from 'glob';
import path from 'node:path';

const ARTICLE_GLOB = 'src/blog/articles/**/*.html';
const MANIFEST = 'src/i18n/blog/en.json';
const RECORD = 'src/data/blog-publication.js';

// A sentence shared with this fraction of the corpus is template text, not
// coincidence. Two independent authors do not write the same 8+ word sentence.
const CORPUS_SHARE = 0.2;
// An article may lean on shared phrasing, but most of it must be its own.
const MAX_SHARED_SENTENCE_RATIO = 0.15;
const MIN_SENTENCE_WORDS = 8;

function articleText(file) {
  const raw = readFileSync(file, 'utf8');
  const scoped = raw.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1]
    || raw.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1]
    || raw;
  return scoped
    .replace(/<(script|style|nav|header|footer)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length >= MIN_SENTENCE_WORDS);
}

function manifestPosts() {
  if (!existsSync(MANIFEST)) return [];
  return JSON.parse(readFileSync(MANIFEST, 'utf8'))
    .filter((post) => post && post.slug)
    .map((post) => ({
      slug: post.slug,
      text: JSON.stringify(post.contentBlocks || [])
        .replace(/<[^>]+>/g, ' ')
        .replace(/\\[a-z"]/g, ' ')
        .replace(/["{}\[\],:]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    }));
}

export function measureCorpus(files) {
  const bySlug = new Map();
  const corpusCount = new Map();

  const add = (slug, source, text) => {
    if (bySlug.has(slug)) return;
    const list = sentences(text);
    bySlug.set(slug, { file: source, sentences: list });
    for (const sentence of new Set(list)) {
      corpusCount.set(sentence, (corpusCount.get(sentence) || 0) + 1);
    }
  };

  for (const file of files) {
    const slug = path.basename(file, '.html');
    if (slug === 'index') continue;
    add(slug, file.replace(/\\/g, '/'), articleText(file));
  }

  // Posts that exist only in the locale manifest are rendered through the
  // article template route, so they are part of the same public corpus.
  for (const post of manifestPosts()) add(post.slug, MANIFEST, post.text);

  const total = bySlug.size;
  const threshold = Math.max(2, Math.ceil(total * CORPUS_SHARE));
  const results = [];

  for (const [slug, { file, sentences: list }] of bySlug) {
    const shared = list.filter((sentence) => (corpusCount.get(sentence) || 0) >= threshold);
    const ratio = list.length ? shared.length / list.length : 0;
    results.push({
      slug,
      file,
      sentences: list.length,
      sharedSentences: shared.length,
      sharedRatio: Number(ratio.toFixed(4)),
      source: file,
      sampleSharedSentence: shared[0] ? `${shared[0].slice(0, 160)}` : null
    });
  }

  results.sort((a, b) => a.slug.localeCompare(b.slug));
  return { results, total, threshold };
}

function loadRecord() {
  if (!existsSync(RECORD)) return null;
  // The record is a JS module so that both Vite and plain Node can import it
  // without a JSON import attribute; read the literal back for checking.
  const source = readFileSync(RECORD, 'utf8');
  const json = source.slice(source.indexOf('{'), source.lastIndexOf('}') + 1);
  return JSON.parse(json);
}

function buildRecord({ results, total, threshold }) {
  return {
    schemaVersion: 1,
    measurement: {
      description: 'Share of an article\'s sentences (8+ words) that appear verbatim in other articles.',
      corpusSize: total,
      sharedSentenceAppearsInAtLeast: threshold,
      maxSharedSentenceRatioForPublication: MAX_SHARED_SENTENCE_RATIO
    },
    articles: results.map((result) => ({
      slug: result.slug,
      source: result.source,
      sentences: result.sentences,
      sharedSentences: result.sharedSentences,
      sharedRatio: result.sharedRatio,
      status: result.sharedRatio <= MAX_SHARED_SENTENCE_RATIO ? 'PUBLISHED' : 'UNPUBLISHED_TEMPLATE_DUPLICATION',
      reason: result.sharedRatio <= MAX_SHARED_SENTENCE_RATIO
        ? null
        : `${Math.round(result.sharedRatio * 100)}% of this article's sentences appear verbatim in at least ${threshold} other articles.`
    }))
  };
}

const mode = process.argv.includes('--write') ? 'write'
  : process.argv.includes('--report') ? 'report'
    : 'check';

const files = globSync(ARTICLE_GLOB).sort();
const measurement = measureCorpus(files);

if (mode === 'write') {
  const header = [
    '/**',
    ' * Generated by scripts/audit-blog-originality.mjs — do not edit by hand.',
    ' *',
    ' * Records, for every blog article, the share of its sentences that also',
    ' * appear verbatim in other articles, and the publication decision that',
    ' * follows. Written as a module rather than JSON so the browser bundle and',
    ' * the build scripts can both import it without a JSON import attribute.',
    ' */',
    ''
  ].join('\n');
  writeFileSync(RECORD, `${header}export default ${JSON.stringify(buildRecord(measurement), null, 2)};\n`);
  const record = buildRecord(measurement);
  const published = record.articles.filter((a) => a.status === 'PUBLISHED').length;
  console.log(`Wrote ${RECORD}: ${published} published, ${record.articles.length - published} unpublished of ${record.articles.length}.`);
  process.exit(0);
}

if (mode === 'report') {
  for (const result of measurement.results) {
    console.log(`${String(Math.round(result.sharedRatio * 100)).padStart(3)}%  ${result.slug}`);
  }
  process.exit(0);
}

const record = loadRecord();
if (!record) {
  console.error(`❌ ${RECORD} is missing. Run: node scripts/audit-blog-originality.mjs --write`);
  process.exit(1);
}

const recorded = new Map(record.articles.map((article) => [article.slug, article]));
const failures = [];

for (const result of measurement.results) {
  const entry = recorded.get(result.slug);
  if (!entry) {
    failures.push(`${result.slug} is not in ${RECORD}; every article must carry an explicit publication decision.`);
    continue;
  }
  if (entry.status === 'PUBLISHED' && result.sharedRatio > MAX_SHARED_SENTENCE_RATIO) {
    failures.push(
      `${result.slug} is marked PUBLISHED but ${Math.round(result.sharedRatio * 100)}% of its sentences are template text `
      + `shared with other articles (limit ${Math.round(MAX_SHARED_SENTENCE_RATIO * 100)}%). Example: "${result.sampleSharedSentence}"`
    );
  }
}

for (const slug of recorded.keys()) {
  if (!measurement.results.some((result) => result.slug === slug)) {
    failures.push(`${RECORD} lists ${slug}, which no longer exists in ${ARTICLE_GLOB} or ${MANIFEST}.`);
  }
}

if (failures.length) {
  console.error('❌ blog originality gate failed:');
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const published = record.articles.filter((article) => article.status === 'PUBLISHED').length;
console.log(`blog originality gate: pass (${published} publishable, ${record.articles.length - published} withheld of ${record.articles.length})`);
