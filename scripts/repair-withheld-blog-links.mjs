#!/usr/bin/env node
/**
 * Repairs internal links that point at blog articles withheld by the
 * originality gate. Those URLs are no longer built, so every one of them would
 * be a 404.
 *
 * A withheld link is replaced by a destination that actually exists and is
 * genuinely relevant: a published article from the same subject area when one
 * is available, otherwise the category hub for the section the link lives in.
 * The anchor text is rewritten to the destination's real title, so no link
 * promises something the target does not deliver.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'glob';
import { isPublishedBlogSlug, withheldBlogSlugs } from '../src/js/blog-publication.js';

const withheld = new Set(withheldBlogSlugs());
const posts = JSON.parse(readFileSync('src/i18n/blog/en.json', 'utf8')).filter((post) => isPublishedBlogSlug(post.slug));
const postBySlug = new Map(posts.map((post) => [post.slug, post]));

// Tool/section key -> where a withheld link should go instead. The article is
// named explicitly rather than looked up by category, because the corpus's
// category field is not reliable across the older finance batch.
const SECTIONS = {
  pdf: { hub: '/categories/pdf-tools.html', hubLabel: 'PDF Tools', article: 'edit-pdf-without-adobe-acrobat-free-methods' },
  image: { hub: '/categories/image-tools.html', hubLabel: 'Image Tools', article: 'lazy-loading-images-implementation-guide-2026' },
  finance: { hub: '/categories/finance-tools.html', hubLabel: 'Finance Tools', article: 'rule-of-72-estimate-investment-doubling-time' },
  converters: { hub: '/categories/converters.html', hubLabel: 'Converters', article: 'rule-of-72-estimate-investment-doubling-time' },
  calculators: { hub: '/categories/calculator-tools.html', hubLabel: 'Calculator Tools', article: 'rule-of-72-estimate-investment-doubling-time' },
  dev: { hub: '/categories/developer-tools.html', hubLabel: 'Developer Tools', article: 'understanding-json-web-tokens-structure-security' },
  data: { hub: '/categories/data-tools.html', hubLabel: 'Data Tools', article: 'cloud-cost-comparison' },
  design: { hub: '/categories/design-tools.html', hubLabel: 'Design Tools', article: 'browser-based-tools-vs-desktop-software-privacy-comparison' },
  productivity: { hub: '/categories/productivity-tools.html', hubLabel: 'Productivity Tools', article: 'browser-based-tools-vs-desktop-software-privacy-comparison' },
  security: { hub: '/categories/security-tools.html', hubLabel: 'Security Tools', article: 'browser-based-tools-vs-desktop-software-privacy-comparison' },
  social: { hub: '/categories/social-media-tools.html', hubLabel: 'Social Media Tools', article: 'lazy-loading-images-implementation-guide-2026' },
  text: { hub: '/categories/text-writing.html', hubLabel: 'Text & Writing Tools', article: 'browser-based-tools-vs-desktop-software-privacy-comparison' },
  default: { hub: '/categories/index.html', hubLabel: 'All tool categories', article: 'browser-based-tools-vs-desktop-software-privacy-comparison' }
};

const CATEGORY_FILE_TO_KEY = {
  'pdf-tools': 'pdf',
  'image-tools': 'image',
  'finance-tools': 'finance',
  converters: 'converters',
  'calculator-tools': 'calculators',
  'developer-tools': 'dev',
  'data-tools': 'data',
  'design-tools': 'design',
  'productivity-tools': 'productivity',
  'security-tools': 'security',
  'social-media-tools': 'social',
  'text-writing': 'text'
};

function sectionForFile(file) {
  const normalized = file.replace(/\\/g, '/');
  const tool = normalized.match(/^src\/tools\/([a-z-]+)\//)?.[1];
  if (tool && SECTIONS[tool]) return SECTIONS[tool];
  const category = normalized.match(/(?:^|\/)categories\/([a-z-]+)\.html$/)?.[1]
    || normalized.match(/category-meta\/([a-z-]+)\//)?.[1];
  if (category && CATEGORY_FILE_TO_KEY[category]) return SECTIONS[CATEGORY_FILE_TO_KEY[category]];
  return SECTIONS.default;
}

function destinationFor(file) {
  const section = sectionForFile(file);
  const article = postBySlug.get(section.article);
  if (article) {
    return { url: `/blog/articles/${article.slug}.html`, label: article.title };
  }
  return { url: section.hub, label: section.hubLabel };
}

const files = globSync('{src,blog,categories,guides,public,site-map,author}/**/*.{html,js,mjs,json}', {
  ignore: ['**/node_modules/**', 'src/blog/articles/**', 'src/data/blog-publication.json']
}).concat(['index.html']);

let changedFiles = 0;
let changedLinks = 0;

for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  if (!text.includes('/blog/articles/')) continue;

  const destination = destinationFor(file);
  let touched = 0;

  // 1. Anchor with text: rewrite both the href and the promise it makes.
  let next = text.replace(
    /(<a\b[^>]*href=["'])((?:https?:\/\/[^"']*)?\/blog\/articles\/([a-z0-9-]+)\.html)(["'][^>]*>)([\s\S]{0,200}?)(<\/a>)/g,
    (match, open, url, slug, close, label, end) => {
      if (!withheld.has(slug)) return match;
      touched += 1;
      const cleanLabel = /<[a-z]/i.test(label) ? label : destination.label;
      return `${open}${destination.url}${close}${cleanLabel}${end}`;
    }
  );

  // 2. Bare URLs in data and script maps.
  next = next.replace(
    /(?:https?:\/\/[^"'\s]*)?\/blog\/articles\/([a-z0-9-]+)\.html/g,
    (match, slug) => {
      if (!withheld.has(slug)) return match;
      touched += 1;
      return destination.url;
    }
  );

  if (touched) {
    writeFileSync(file, next);
    changedFiles += 1;
    changedLinks += touched;
  }
}

console.log(`Repaired ${changedLinks} link(s) to withheld blog articles across ${changedFiles} file(s).`);
