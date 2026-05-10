import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { globSync } from 'glob';

const ARTICLE_GLOB = 'src/blog/articles/**/*.html';
const OUTPUT = 'content/rewrite-queue.json';

const stopWords = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'you', 'are', 'into', 'before', 'after', 'when', 'what', 'how', 'why', 'can', 'use', 'tool', 'tools', 'guide', 'workflow', 'about']);

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function textBetween(html, tag) {
  const matches = [...html.matchAll(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi'))];
  return matches.map((match) => stripHtml(match[1])).filter(Boolean);
}

function words(text) {
  return text.toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [];
}

function countSyllables(word) {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!cleaned) return 0;
  const groups = cleaned.replace(/(?:e|ed|es)$/u, '').match(/[aeiouy]+/g);
  return Math.max(1, groups ? groups.length : 1);
}

function flesch(text) {
  const wordList = words(text);
  const sentenceCount = Math.max(1, (text.match(/[.!?]+/g) || []).length);
  const syllables = wordList.reduce((sum, word) => sum + countSyllables(word), 0);
  if (!wordList.length) return 0;
  return Math.round((206.835 - 1.015 * (wordList.length / sentenceCount) - 84.6 * (syllables / wordList.length)) * 10) / 10;
}

function normalizedParagraph(value) {
  return value.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim().slice(0, 180);
}

function titleFrom(html, file) {
  const title = html.match(/<title>([\s\S]*?)<\/title>/i)?.[1];
  return stripHtml(title || file.split('/').pop()?.replace(/\.html$/, '') || file);
}

const articles = await Promise.all(globSync(ARTICLE_GLOB).sort().map(async (file) => {
  const html = await readFile(file, 'utf8');
  const paragraphs = textBetween(html, 'p');
  const text = stripHtml(html);
  const wordList = words(text);
  const frequencies = new Map();
  for (const word of wordList) {
    if (!stopWords.has(word)) frequencies.set(word, (frequencies.get(word) || 0) + 1);
  }
  const top = [...frequencies.entries()].sort((a, b) => b[1] - a[1])[0] || ['', 0];
  return {
    file,
    slug: file.split('/').pop().replace(/\.html$/, ''),
    title: titleFrom(html, file),
    wordCount: wordList.length,
    h2Count: (html.match(/<h2\b/gi) || []).length,
    h3Count: (html.match(/<h3\b/gi) || []).length,
    internalLinkCount: (html.match(/href="\/(?:tools|blog|categories)\//gi) || []).length,
    fleschReadingEase: flesch(text),
    topKeyword: top[0],
    topKeywordDensity: wordList.length ? Math.round((top[1] / wordList.length) * 1000) / 10 : 0,
    introFingerprint: normalizedParagraph(paragraphs[0] || ''),
    outroFingerprint: normalizedParagraph(paragraphs[paragraphs.length - 1] || '')
  };
}));

const introCounts = new Map();
const outroCounts = new Map();
for (const article of articles) {
  if (article.introFingerprint) introCounts.set(article.introFingerprint, (introCounts.get(article.introFingerprint) || 0) + 1);
  if (article.outroFingerprint) outroCounts.set(article.outroFingerprint, (outroCounts.get(article.outroFingerprint) || 0) + 1);
}

const scored = articles.map((article) => {
  const issues = [];
  let score = 100;
  if (article.wordCount < 400) { score -= 25; issues.push('word-count-under-400'); }
  if ((introCounts.get(article.introFingerprint) || 0) > 1) { score -= 15; issues.push('repeated-introduction'); }
  if ((outroCounts.get(article.outroFingerprint) || 0) > 1) { score -= 15; issues.push('repeated-conclusion'); }
  if (article.topKeywordDensity > 4.5) { score -= 15; issues.push('possible-keyword-stuffing'); }
  if (article.h2Count < 3) { score -= 15; issues.push('weak-h2-structure'); }
  if (article.h3Count < 2) { score -= 10; issues.push('weak-h3-structure'); }
  if (article.internalLinkCount < 3) { score -= 15; issues.push('insufficient-internal-links'); }
  if (article.fleschReadingEase < 35) { score -= 10; issues.push('low-readability'); }
  return {
    slug: article.slug,
    file: article.file,
    title: article.title,
    score: Math.max(0, score),
    metrics: {
      wordCount: article.wordCount,
      h2Count: article.h2Count,
      h3Count: article.h3Count,
      internalLinkCount: article.internalLinkCount,
      fleschReadingEase: article.fleschReadingEase,
      topKeyword: article.topKeyword,
      topKeywordDensityPercent: article.topKeywordDensity
    },
    issues
  };
}).sort((a, b) => a.score - b.score || a.metrics.wordCount - b.metrics.wordCount || a.slug.localeCompare(b.slug));

const queue = {
  generatedAt: new Date().toISOString(),
  methodology: {
    corpusGlob: ARTICLE_GLOB,
    totalArticlesAnalyzed: articles.length,
    selectedForRewrite: 30,
    scoring: [
      'word-count-under-400: -25',
      'repeated-introduction: -15',
      'repeated-conclusion: -15',
      'possible-keyword-stuffing above 4.5% top non-stopword density: -15',
      'weak-h2-structure fewer than 3 H2 headings: -15',
      'weak-h3-structure fewer than 2 H3 headings: -10',
      'insufficient-internal-links fewer than 3 internal links: -15',
      'low-readability Flesch Reading Ease below 35: -10'
    ]
  },
  rewriteQueue: scored.slice(0, 30),
  analyzedArticles: scored
};

await mkdir(dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, `${JSON.stringify(queue, null, 2)}\n`);
console.log(`Analyzed ${articles.length} articles; wrote weakest 30 to ${OUTPUT}`);
