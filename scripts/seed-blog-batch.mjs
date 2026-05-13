#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fallbackBlogLocale, normalizeBlogSlug, supportedBlogLocales } from '../src/js/blog-routes.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const mode = args.includes('--write') ? 'write' : 'check';
const allowUpdate = args.includes('--update');
const skipGeneratedAssets = args.includes('--skip-generated-assets');
const batchArg = args.find((arg) => arg.startsWith('--batch='));
const batchPath = batchArg ? batchArg.split('=').slice(1).join('=') : args.find((arg) => !arg.startsWith('--'));
const blogDir = path.join(repoRoot, 'src', 'i18n', 'blog');
const translationMemoryPath = path.join(repoRoot, 'content', 'blog-seeding', 'translation-memory.json');
const terminologyBasePath = path.join(repoRoot, 'content', 'blog-seeding', 'terminology-base.json');
const defaultAuthor = {
  name: 'Metehan Çetin',
  title: 'Founder & Editor',
  bio: 'Metehan Çetin leads MC NovaTools content strategy with a focus on useful, transparent workflows for browser-based productivity and file preparation.',
  avatar: '/logo-bird-88.webp'
};

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function option(name) {
  const item = args.find((arg) => arg.startsWith(`--${name}=`));
  return item ? item.split('=').slice(1).join('=') : null;
}

function today() {
  return option('date') || new Date().toISOString().slice(0, 10);
}

function validateLocalizationInfra() {
  for (const [label, filePath, schemaVersion] of [
    ['translation memory', translationMemoryPath, 'blog-translation-memory-v1'],
    ['terminology base', terminologyBasePath, 'blog-terminology-base-v1']
  ]) {
    if (!fs.existsSync(filePath)) {
      fail(`Missing ${label}: ${path.relative(repoRoot, filePath)}`);
      continue;
    }
    const data = readJson(filePath);
    if (data.schemaVersion !== schemaVersion) fail(`${label} has invalid schemaVersion: ${data.schemaVersion}`);
  }
}

function validateText(value, label, min = 1) {
  if (typeof value !== 'string' || value.trim().length < min) fail(`${label} must be a string with at least ${min} characters.`);
}

function validateStringArray(value, label, minItems = 0) {
  if (!Array.isArray(value) || value.length < minItems || value.some((item) => typeof item !== 'string' || !item.trim())) {
    fail(`${label} must be an array with at least ${minItems} non-empty string item(s).`);
  }
}

function validateFaq(value, label) {
  if (!Array.isArray(value) || value.length < 2) {
    fail(`${label} must contain at least 2 FAQ items.`);
    return;
  }
  value.forEach((item, index) => {
    validateText(item?.question, `${label}[${index}].question`, 12);
    validateText(item?.answer, `${label}[${index}].answer`, 20);
  });
}

function validateCta(value, label) {
  validateText(value?.label, `${label}.label`, 2);
  validateText(value?.text, `${label}.text`, 20);
  if (typeof value?.href !== 'string' || !value.href.startsWith('/')) fail(`${label}.href must be a root-relative path.`);
}

function validateArticle(article, index, knownSlugs) {
  let slug = '';
  try {
    slug = normalizeBlogSlug(article?.slug);
  } catch (error) {
    fail(`articles[${index}].slug is invalid: ${error.message}`);
    return null;
  }

  validateText(article.title, `${slug}.title`, 20);
  validateText(article.excerpt, `${slug}.excerpt`, 90);
  validateStringArray(article.summary, `${slug}.summary`, 3);
  validateText(article.category, `${slug}.category`, 2);
  validateFaq(article.faq, `${slug}.faq`);
  validateCta(article.cta, `${slug}.cta`);
  validateStringArray(article.relatedToolLinks, `${slug}.relatedToolLinks`, 1);
  (article.relatedToolLinks || []).forEach((href, hrefIndex) => {
    if (!href.startsWith('/')) fail(`${slug}.relatedToolLinks[${hrefIndex}] must be root-relative.`);
  });
  validateStringArray(article.relatedArticleLinks, `${slug}.relatedArticleLinks`, 1);
  (article.relatedArticleLinks || []).forEach((relatedSlug) => {
    try {
      const normalized = normalizeBlogSlug(relatedSlug);
      if (!knownSlugs.has(normalized)) warn(`${slug}.relatedArticleLinks includes ${normalized}, which is not in existing manifests or this batch yet.`);
    } catch (error) {
      fail(`${slug}.relatedArticleLinks contains invalid slug ${relatedSlug}: ${error.message}`);
    }
  });

  Object.entries(article.localizations || {}).forEach(([locale, localization]) => {
    if (!supportedBlogLocales.includes(locale)) fail(`${slug}.localizations contains unsupported locale: ${locale}`);
    if (localization.title) validateText(localization.title, `${slug}.localizations.${locale}.title`, 10);
    if (localization.excerpt) validateText(localization.excerpt, `${slug}.localizations.${locale}.excerpt`, 40);
    if (localization.summary) validateStringArray(localization.summary, `${slug}.localizations.${locale}.summary`, 1);
    if (localization.faq) validateFaq(localization.faq, `${slug}.localizations.${locale}.faq`);
    if (localization.cta) validateCta(localization.cta, `${slug}.localizations.${locale}.cta`);
  });

  return slug;
}

function coverImageFor(slug) {
  return {
    og: `/images/blog/og-${slug}.svg`,
    ogFallback: `/images/blog/og-${slug}.svg`,
    card: `/images/blog/card-${slug}.svg`,
    cardFallback: `/images/blog/card-${slug}.svg`,
    featured: `/images/blog/featured-${slug}.svg`,
    featuredFallback: `/images/blog/featured-${slug}.svg`
  };
}

function headingId(value, index) {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  return slug || `section-${index + 1}`;
}

function normalizedHeadings(article) {
  if (Array.isArray(article.headings) && article.headings.length) return article.headings;
  if (Array.isArray(article.contentBlocks)) {
    return article.contentBlocks
      .flatMap((block) => [...String(block.html || '').matchAll(/<h([23])\s+id=["']([^"']+)["'][^>]*>(.*?)<\/h\1>/g)].map((match) => ({ id: match[2], text: match[3].replace(/<[^>]+>/g, ''), level: Number(match[1]) })))
      .slice(0, 8);
  }
  return (article.summary || []).slice(0, 4).map((item, index) => ({ id: headingId(item, index), text: item.slice(0, 72), level: 2 }));
}

function contentBlocksFor(article, localized) {
  if (Array.isArray(localized.contentBlocks)) return localized.contentBlocks;
  if (Array.isArray(article.contentBlocks)) return article.contentBlocks;
  return [{
    type: 'paragraph',
    html: `<section><h2 id="overview">Overview</h2><p>${escapeHtml(localized.excerpt || article.excerpt)}</p></section>`
  }];
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function mergeLocalizedArticle(article, locale, date) {
  const localized = locale === (article.defaultLocale || fallbackBlogLocale) ? {} : (article.localizations?.[locale] || {});
  const usesSourceCopy = locale !== (article.defaultLocale || fallbackBlogLocale) && !article.localizations?.[locale];
  const cta = localized.cta || article.cta;
  const relatedToolLinks = localized.relatedToolLinks || article.relatedToolLinks || [cta.href];
  return {
    slug: normalizeBlogSlug(article.slug),
    title: localized.title || article.title,
    excerpt: localized.excerpt || article.excerpt,
    summary: localized.summary || article.summary,
    headings: localized.headings || normalizedHeadings(article),
    contentBlocks: contentBlocksFor(article, localized),
    faq: localized.faq || article.faq,
    cta,
    author: localized.author || article.author || defaultAuthor,
    authorId: article.authorId || 'metehan-cetin',
    category: article.category,
    tags: localized.tags || article.tags || [],
    relatedTools: localized.relatedTools || article.relatedTools || relatedToolLinks.map((href) => href.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Tool'),
    relatedToolLinks,
    relatedArticleLinks: article.relatedArticleLinks || [],
    datePublished: article.datePublished || date,
    dateModified: article.dateModified || date,
    readTime: article.readTime || Math.max(4, Math.ceil((article.targetWordCount || 900) / 220)),
    coverImage: article.coverImage || coverImageFor(normalizeBlogSlug(article.slug)),
    visualBrief: article.visualBrief || {
      style: 'editorial blog cover generated from batch metadata',
      iconography: [article.category, ...(article.tags || []).slice(0, 2)],
      avoid: ['fake ratings', 'unverifiable claims', 'private data']
    },
    localizationStatus: {
      locale,
      sourceLocale: article.defaultLocale || fallbackBlogLocale,
      status: usesSourceCopy ? 'needs-human-localization' : 'human-reviewed-or-source',
      machineTranslated: false
    }
  };
}

function readManifest(locale) {
  const filePath = path.join(blogDir, `${locale}.json`);
  if (!fs.existsSync(filePath)) return [];
  return readJson(filePath);
}

function sourceArticleSlugs() {
  const articleDir = path.join(repoRoot, 'src', 'blog', 'articles');
  if (!fs.existsSync(articleDir)) return [];
  return fs.readdirSync(articleDir)
    .filter((file) => file.endsWith('.html') && file !== 'index.html')
    .map((file) => normalizeBlogSlug(file.replace(/\.html$/, '')));
}

function existingSlugs() {
  const slugs = new Set(sourceArticleSlugs());
  supportedBlogLocales.forEach((locale) => readManifest(locale).forEach((post) => slugs.add(post.slug)));
  return slugs;
}

function upsertBySlug(posts, nextPost) {
  const index = posts.findIndex((post) => post.slug === nextPost.slug);
  if (index >= 0) {
    posts[index] = { ...posts[index], ...nextPost };
  } else {
    posts.push(nextPost);
  }
  return posts.sort((a, b) => new Date(`${b.datePublished}T00:00:00`) - new Date(`${a.datePublished}T00:00:00`) || a.slug.localeCompare(b.slug));
}

function run(command, argsForCommand) {
  const result = spawnSync(command, argsForCommand, { cwd: repoRoot, stdio: 'inherit', shell: process.platform === 'win32' });
  if (result.status !== 0) process.exit(result.status || 1);
}

validateLocalizationInfra();

if (!batchPath) {
  if (mode === 'write') fail('Missing --batch=path/to/batch.json for write mode.');
  if (errors.length === 0) console.log('✅ Blog seed infrastructure is present. No batch file supplied for check mode.');
} else {
  const absoluteBatchPath = path.resolve(repoRoot, batchPath);
  if (!fs.existsSync(absoluteBatchPath)) fail(`Batch file not found: ${batchPath}`);
  if (errors.length === 0) {
    const batch = readJson(absoluteBatchPath);
    if (batch.schemaVersion !== 'blog-seed-batch-v1') fail(`Invalid batch schemaVersion: ${batch.schemaVersion}`);
    if (!Array.isArray(batch.articles) || batch.articles.length === 0) fail('Batch must include at least one article.');
    const batchSlugs = new Set((batch.articles || []).map((article) => article?.slug).filter(Boolean));
    const knownSlugs = new Set([...existingSlugs(), ...batchSlugs]);
    const seen = new Set();
    for (const [index, article] of (batch.articles || []).entries()) {
      const slug = validateArticle({ ...article, defaultLocale: batch.defaultLocale || fallbackBlogLocale }, index, knownSlugs);
      if (!slug) continue;
      if (seen.has(slug)) fail(`Duplicate slug in batch: ${slug}`);
      seen.add(slug);
      if (!allowUpdate && existingSlugs().has(slug)) fail(`Slug already exists: ${slug}. Re-run with --update to replace manifest metadata.`);
    }

    if (errors.length === 0 && mode === 'write') {
      const date = today();
      supportedBlogLocales.forEach((locale) => {
        const posts = readManifest(locale);
        (batch.articles || []).forEach((article) => {
          upsertBySlug(posts, mergeLocalizedArticle({ ...article, defaultLocale: batch.defaultLocale || fallbackBlogLocale }, locale, date));
        });
        writeJson(path.join(blogDir, `${locale}.json`), posts);
      });
      console.log(`✅ Seeded ${batch.articles.length} article(s) into ${supportedBlogLocales.length} locale manifests.`);
      if (!skipGeneratedAssets) {
        run('npm', ['run', 'build:blog-images']);
        run('npm', ['run', 'build:sitemap']);
      }
    } else if (errors.length === 0) {
      console.log(`✅ Blog seed batch is valid (${batch.articles.length} article(s)).`);
    }
  }
}

warnings.forEach((message) => console.warn(`WARN: ${message}`));
if (errors.length > 0) {
  errors.forEach((message) => console.error(`FAIL: ${message}`));
  process.exit(1);
}
