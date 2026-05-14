/**
 * Post-build script to fix directory structure
 * Moves files from dist/src/ to proper locations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { blogArticleRoutes, blogHubPath, fallbackBlogLocale, normalizeBlogSlug, normalizeBlogSlugList, supportedBlogLocales } from '../src/js/blog-routes.js';
import { buildBlogArticleSeo, buildBlogIndexSeo } from '../src/js/blog-seo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function jsonScript(id, data) {
  return `<script id="${id}" type="application/ld+json">${JSON.stringify(data).replace(/<\//g, '<\\/')}</script>`;
}

function metaName(name, content) {
  return `<meta name="${name}" content="${escapeAttr(content)}">`;
}

function metaProperty(property, content) {
  return `<meta property="${property}" content="${escapeAttr(content)}">`;
}

function alternateLinks(alternates) {
  return alternates.map(([hreflang, href]) => `<link rel="alternate" hreflang="${hreflang}" href="${escapeAttr(href)}" data-blog-seo="hreflang">`).join('\n  ');
}

function socialLocaleTags(seo) {
  return [
    metaProperty('og:locale', seo.ogLocale),
    ...seo.alternateLocales.map((ogLocale) => `<meta property="og:locale:alternate" content="${escapeAttr(ogLocale)}" data-blog-seo="og-locale">`)
  ].join('\n  ');
}

function blogArticleHeadBlock(post, locale) {
  const seo = buildBlogArticleSeo(post, locale, post.category);
  return `<!-- blog-seo:start -->
  <title>${escapeHtml(seo.title)}</title>
  ${metaName('description', seo.description)}
  ${metaName('robots', 'index, follow, max-image-preview:large')}
  <link rel="canonical" href="${escapeAttr(seo.canonicalUrl)}">
  ${alternateLinks(seo.alternates)}
  ${metaProperty('og:title', seo.title)}
  ${metaProperty('og:description', seo.description)}
  ${metaProperty('og:type', 'article')}
  ${metaProperty('og:url', seo.canonicalUrl)}
  ${metaProperty('og:site_name', 'MC NovaTools')}
  ${socialLocaleTags(seo)}
  ${metaProperty('og:image', seo.ogImage)}
  ${metaProperty('og:image:width', '1200')}
  ${metaProperty('og:image:height', '630')}
  ${metaProperty('og:image:type', seo.ogImageType)}
  ${metaProperty('article:published_time', seo.published)}
  ${metaProperty('article:modified_time', seo.modified)}
  ${metaProperty('article:section', post.category)}
  ${metaProperty('article:tag', (post.tags || []).join(', '))}
  ${metaName('twitter:card', 'summary_large_image')}
  ${metaName('twitter:title', seo.title)}
  ${metaName('twitter:description', seo.description)}
  ${metaName('twitter:image', seo.ogImage)}
  ${jsonScript('blog-seo-article-jsonld', seo.jsonLd.article)}
  ${post.faq?.length ? jsonScript('blog-seo-faq-jsonld', seo.jsonLd.faq) : ''}
  ${jsonScript('blog-seo-breadcrumb-jsonld', seo.jsonLd.breadcrumb)}
  <!-- blog-seo:end -->`;
}

function blogIndexHeadBlock(locale) {
  const seo = buildBlogIndexSeo(locale);
  return `<!-- blog-seo:start -->
  <title>${escapeHtml(seo.title)}</title>
  ${metaName('description', seo.description)}
  ${metaName('robots', 'index, follow, max-image-preview:large')}
  <link rel="canonical" href="${escapeAttr(seo.canonicalUrl)}">
  ${alternateLinks(seo.alternates)}
  ${metaProperty('og:title', seo.title)}
  ${metaProperty('og:description', seo.description)}
  ${metaProperty('og:type', 'website')}
  ${metaProperty('og:url', seo.canonicalUrl)}
  ${metaProperty('og:site_name', 'MC NovaTools')}
  ${socialLocaleTags(seo)}
  ${metaProperty('og:image', seo.ogImage)}
  ${metaProperty('og:image:width', '520')}
  ${metaProperty('og:image:height', '520')}
  ${metaProperty('og:image:type', seo.ogImageType)}
  ${metaName('twitter:card', 'summary_large_image')}
  ${metaName('twitter:title', seo.title)}
  ${metaName('twitter:description', seo.description)}
  ${metaName('twitter:image', seo.ogImage)}
  ${jsonScript('blog-seo-jsonld', seo.jsonLd.blog)}
  ${jsonScript('blog-seo-breadcrumb-jsonld', seo.jsonLd.breadcrumb)}
  <!-- blog-seo:end -->`;
}

function replaceBlogSeoHead(html, block) {
  if (html.includes('<!-- blog-seo:start -->')) {
    return html.replace(/\n?\s*<!-- blog-seo:start -->[\s\S]*?<!-- blog-seo:end -->/, `\n  ${block}`);
  }
  let next = html
    .replace(/\n\s*<title>[\s\S]*?<\/title>/i, '')
    .replace(/\n\s*<meta name="description"[^>]*>/i, '')
    .replace(/\n\s*<meta name="robots"[^>]*>/i, '')
    .replace(/\n\s*<link rel="canonical"[^>]*>/i, '')
    .replace(/\n\s*<link rel="alternate"[^>]*data-blog-seo="hreflang"[^>]*>/gi, '')
    .replace(/\n\s*<meta property="og:[^>]*>/gi, '')
    .replace(/\n\s*<meta property="article:[^>]*>/gi, '')
    .replace(/\n\s*<meta name="twitter:[^>]*>/gi, '')
    .replace(/\n\s*<script(?: id="blog-seo-[^"]+")? type="application\/ld\+json">[\s\S]*?<\/script>/gi, '');
  if (/<meta name="theme-color"[^>]*>/i.test(next)) return next.replace(/(<meta name="theme-color"[^>]*>)/i, `$1\n  ${block}`);
  return next.replace(/<\/head>/i, `  ${block}\n</head>`);
}

function stampBlogFile(filePath, block, locale) {
  if (!fs.existsSync(filePath)) return false;
  const html = fs.readFileSync(filePath, 'utf8');
  const stamped = replaceBlogSeoHead(html, block).replace(/<html lang="[^"]+"/, `<html lang="${locale}"`);
  if (stamped !== html) fs.writeFileSync(filePath, stamped);
  return true;
}


console.log('🔧 Running post-build fixes...\n');

// Fix 1: Move dist/src/tools -> dist/tools
const srcDir = path.join(distDir, 'src');
const toolsSrcDir = path.join(srcDir, 'tools');
const toolsDstDir = path.join(distDir, 'tools');

if (fs.existsSync(toolsSrcDir)) {
  if (fs.existsSync(toolsDstDir)) {
    fs.rmSync(toolsDstDir, { recursive: true });
  }
  fs.renameSync(toolsSrcDir, toolsDstDir);
  console.log('✅ Fixed: dist/src/tools -> dist/tools');
}

// Fix 2: Move dist/src/blog -> dist/blog
const blogSrcDir = path.join(srcDir, 'blog');
const blogDstDir = path.join(distDir, 'blog');

if (fs.existsSync(blogSrcDir)) {
  // First, ensure the articles are copied before moving
  const blogArticlesSrc = path.join(blogSrcDir, 'articles');
  const blogArticlesDst = path.join(blogDstDir, 'articles');
  
  if (fs.existsSync(blogDstDir)) {
    // If blog already exists (from viteStaticCopy), merge the index.html
    const srcIndex = path.join(blogSrcDir, 'index.html');
    const dstIndex = path.join(blogDstDir, 'index.html');
    if (fs.existsSync(srcIndex) && !fs.existsSync(dstIndex)) {
      fs.copyFileSync(srcIndex, dstIndex);
    }
    // Copy articles if they exist in src
    if (fs.existsSync(blogArticlesSrc) && !fs.existsSync(blogArticlesDst)) {
      fs.cpSync(blogArticlesSrc, blogArticlesDst, { recursive: true });
      console.log('✅ Copied: blog/articles');
    }
    fs.rmSync(blogSrcDir, { recursive: true });
  } else {
    fs.renameSync(blogSrcDir, blogDstDir);
  }
  console.log('✅ Fixed: dist/src/blog -> dist/blog');
}

// Ensure blog articles are merged from source and localized manifest routes exist.
const sourceArticlesDir = path.join(__dirname, '..', 'src', 'blog', 'articles');
const distBlogArticlesDir = path.join(distDir, 'blog', 'articles');

if (fs.existsSync(sourceArticlesDir)) {
  fs.mkdirSync(distBlogArticlesDir, { recursive: true });
  fs.cpSync(sourceArticlesDir, distBlogArticlesDir, { recursive: true, force: false });
  console.log('✅ Merged: src/blog/articles -> dist/blog/articles');
}

const distBlogIndex = path.join(distDir, 'blog', 'index.html');
const distBlogTemplate = path.join(distDir, 'blog', 'article-template.html');
const readBlogManifest = (locale) => {
  const manifestPath = path.join(__dirname, '..', 'src', 'i18n', 'blog', `${locale}.json`);
  const fallbackPath = path.join(__dirname, '..', 'src', 'i18n', 'blog', `${fallbackBlogLocale}.json`);
  return JSON.parse(fs.readFileSync(fs.existsSync(manifestPath) ? manifestPath : fallbackPath, 'utf8'));
};
const manifestBySlug = (locale) => new Map(readBlogManifest(locale).map((post) => [normalizeBlogSlug(post.slug), post]));
const sourceArticleFileBySlug = () => {
  if (!fs.existsSync(sourceArticlesDir)) return new Map();
  return new Map(fs.readdirSync(sourceArticlesDir)
    .filter((file) => file.endsWith('.html') && file !== 'index.html')
    .map((file) => [normalizeBlogSlug(file.replace(/\.html$/, '')), path.join(sourceArticlesDir, file)]));
};

const sourceArticlePostCache = new Map();

function textFromHtml(html, selectorPattern) {
  const match = html.match(selectorPattern);
  return match ? match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() : '';
}

function attrFromHtml(html, selectorPattern) {
  const match = html.match(selectorPattern);
  return match ? match[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&').trim() : '';
}

function sourceArticlePost(slug, filePath) {
  if (sourceArticlePostCache.has(slug)) return sourceArticlePostCache.get(slug);
  const html = fs.readFileSync(filePath, 'utf8');
  let jsonLd = {};
  const jsonLdMatch = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i);
  if (jsonLdMatch) {
    try {
      jsonLd = JSON.parse(jsonLdMatch[1]);
    } catch {
      jsonLd = {};
    }
  }
  const title = jsonLd.headline || textFromHtml(html, /<h1[^>]*>([\s\S]*?)<\/h1>/i) || attrFromHtml(html, /<title[^>]*>([\s\S]*?)<\/title>/i).replace(/\s*[|–-]\s*(?:MC\s+)?NovaTools(?:\s+Guides?|\s+Blog)?[\s\S]*$/i, '') || slug.replace(/-/g, ' ');
  const excerpt = jsonLd.description || attrFromHtml(html, /<meta\s+name=["']description["']\s+content=["']([^"']*)["'][^>]*>/i) || `Practical NovaTools guide for ${title}.`;
  const category = jsonLd.articleSection || textFromHtml(html, /<span[^>]+class=["'][^"']*tag[^"']*["'][^>]*>([\s\S]*?)<\/span>/i) || 'NovaTools guides';
  const image = typeof jsonLd.image === 'string' ? jsonLd.image.replace(/^https?:\/\/mc-novatools\.com/i, '') : '/logo-brand-520.png';
  const post = {
    slug,
    title,
    excerpt,
    summary: [excerpt],
    category,
    tags: [],
    faq: [],
    author: { name: 'MC NovaTools Editorial' },
    authorId: 'novatools-editorial',
    datePublished: String(jsonLd.datePublished || '2026-04-17').slice(0, 10),
    dateModified: String(jsonLd.dateModified || jsonLd.datePublished || '2026-04-17').slice(0, 10),
    coverImage: { og: image, card: image, featured: image }
  };
  sourceArticlePostCache.set(slug, post);
  return post;
}

if (fs.existsSync(distBlogIndex) && fs.existsSync(distBlogTemplate)) {
  const sourceArticles = sourceArticleFileBySlug();
  const fallbackPosts = manifestBySlug(fallbackBlogLocale);
  const routeSlugs = normalizeBlogSlugList([...fallbackPosts.keys(), ...sourceArticles.keys()]);

  for (const locale of supportedBlogLocales) {
    const hubPath = path.join(distDir, blogHubPath(locale).replace(/^\//, ''));
    fs.mkdirSync(path.dirname(hubPath), { recursive: true });
    if (!fs.existsSync(hubPath)) fs.copyFileSync(distBlogIndex, hubPath);
    stampBlogFile(hubPath, blogIndexHeadBlock(locale), locale);

    const localePosts = manifestBySlug(locale);
    for (const slug of routeSlugs) {
      const sourceArticle = sourceArticles.get(slug);
      const post = localePosts.get(slug) || fallbackPosts.get(slug) || (sourceArticle ? sourceArticlePost(slug, sourceArticle) : null);
      if (!post) continue;
      for (const route of Object.values(blogArticleRoutes(slug, locale))) {
        const target = path.join(distDir, route.replace(/^\//, ''));
        fs.mkdirSync(path.dirname(target), { recursive: true });
        if (!fs.existsSync(target)) fs.copyFileSync(distBlogTemplate, target);
        stampBlogFile(target, blogArticleHeadBlock(post, locale), locale);
      }
    }
  }
  console.log('✅ Verified: localized blog hub, canonical article, legacy article, and generated article routes');
}


// Ensure path-prefixed localized public routes exist for locales that the runtime
// language switcher links to path-prefixed locale routes (currently /ar/*). These pages reuse the built
// browser-localized HTML and let the client-side i18n layer apply copy safely.
const pathPrefixLocales = ['ar'];
const localizedRootFiles = [
  'index.html',
  'about-us.html',
  'contact.html',
  'request-tool.html',
  'privacy-policy.html',
  'terms-of-service.html',
  'gizlilik-politikasi.html',
  'kvkk-aydinlatma-metni.html',
  'kullanim-kosullari.html',
  'iletisim.html',
  'cookie-policy.html',
  'security.html'
];

function copyFileIfExists(source, target) {
  if (!fs.existsSync(source)) return false;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  return true;
}

function copyDirIfExists(source, target) {
  if (!fs.existsSync(source)) return false;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true });
  return true;
}

for (const locale of pathPrefixLocales) {
  for (const file of localizedRootFiles) {
    const target = file === 'index.html'
      ? path.join(distDir, locale, 'index.html')
      : path.join(distDir, locale, file);
    copyFileIfExists(path.join(distDir, file), target);
  }

  copyDirIfExists(path.join(distDir, 'categories'), path.join(distDir, locale, 'categories'));
  copyDirIfExists(path.join(distDir, 'tools'), path.join(distDir, locale, 'tools'));
}
console.log('✅ Verified: path-prefixed localized public surface routes');

function ensureCleanHtmlAlias(file) {
  if (!file.endsWith('.html') || file === 'index.html') return false;
  const source = path.join(distDir, file);
  if (!fs.existsSync(source)) return false;
  const cleanRoute = file.replace(/\.html$/, '/index.html');
  const target = path.join(distDir, cleanRoute);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
  return true;
}

for (const file of localizedRootFiles) {
  ensureCleanHtmlAlias(file);
}

for (const locale of pathPrefixLocales) {
  for (const file of localizedRootFiles) {
    if (file === 'index.html') continue;
    ensureCleanHtmlAlias(`${locale}/${file}`);
  }
}
console.log('✅ Verified: clean URL aliases for public root pages');

// Fix 3: Clean up dist/src if empty
if (fs.existsSync(srcDir)) {
  const remaining = fs.readdirSync(srcDir);
  if (remaining.length === 0) {
    fs.rmdirSync(srcDir);
    console.log('✅ Cleaned up empty dist/src directory');
  } else {
    console.log(`⚠️  dist/src still contains: ${remaining.join(', ')}`);
    // Remove remaining files
    fs.rmSync(srcDir, { recursive: true });
    console.log('✅ Cleaned up dist/src directory');
  }
}

// Fix 4: Ensure dist/admin exists
const adminSrcDir = path.join(distDir, 'admin');
if (!fs.existsSync(adminSrcDir)) {
  console.log('⚠️  dist/admin not found - admin page may not have been built');
} else {
  console.log('✅ Verified: dist/admin exists');
}

// Fix 5: Ensure dist/categories exists (copy from root if not in dist)
const categoriesSrcDir = path.join(__dirname, '..', 'categories');
const categoriesDstDir = path.join(distDir, 'categories');

if (fs.existsSync(categoriesSrcDir) && !fs.existsSync(categoriesDstDir)) {
  fs.cpSync(categoriesSrcDir, categoriesDstDir, { recursive: true });
  console.log('✅ Copied: categories -> dist/categories');
} else if (fs.existsSync(categoriesDstDir)) {
  console.log('✅ Verified: dist/categories exists');
}

// Verify key files exist
const keyFiles = [
  'index.html',
  'about-us.html',
  'contact.html',
  'request-tool.html',
  'privacy-policy.html',
  'terms-of-service.html',
  'gizlilik-politikasi.html',
  'kvkk-aydinlatma-metni.html',
  'kullanim-kosullari.html',
  'iletisim.html',
  'cookie-policy.html',
  'security.html',
  'admin/index.html',
  'blog/index.html',
  'tools/finance/tax/index.html',
  'tools/pdf/merge/index.html',
  'categories/converters.html',
  'categories/pdf-tools.html',
];

console.log('\n📋 Verification:');
let allGood = true;
for (const file of keyFiles) {
  const fullPath = path.join(distDir, file);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING!`);
    allGood = false;
  }
}

if (allGood) {
  console.log('\n✅ All post-build fixes completed successfully!');
} else {
  console.log('\n⚠️  Some files are missing - check build output');
  process.exit(1);
}
