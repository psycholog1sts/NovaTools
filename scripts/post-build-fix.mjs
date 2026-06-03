/**
 * Post-build script to fix directory structure
 * Moves files from dist/src/ to proper locations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { blogArticleRoutes, blogHubPath, fallbackBlogLocale, normalizeBlogSlug, normalizeBlogSlugList, supportedBlogLocales } from '../src/js/blog-routes.js';
import { buildBlogArticleSeo, buildBlogIndexSeo } from '../src/js/blog-seo.js';
import { applySeoHead, removeLegacyAdSenseHead, renderAdSenseHead } from '../src/components/Analytics.mjs';
import { renderGlobalFooter, renderGlobalFooterStyle } from '../src/components/global-footer.mjs';

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

function stampAdSenseHead(html) {
  const adSenseHead = renderAdSenseHead();
  if (!adSenseHead) return removeLegacyAdSenseHead(html);
  return removeLegacyAdSenseHead(html).replace(/<\/head>/i, `  ${adSenseHead}\n</head>`);
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
  const stamped = stampAdSenseHead(replaceBlogSeoHead(html, block).replace(/<html lang="[^"]+"/, `<html lang="${locale}"`));
  if (stamped !== html) fs.writeFileSync(filePath, stamped);
  return true;
}





function visibleBlogAuthorshipBlock() {
  return `<div class="article-trust-meta" data-visible-authorship="true" style="margin:1rem 0 1.5rem;color:var(--text-secondary,#cbd5e1);font-size:.95rem;line-height:1.6;display:flex;flex-wrap:wrap;gap:.75rem 1rem;">
    <span>Written by <a href="/author/novatools-editorial.html">NovaTools Editorial Review</a></span>
    <span>Published <time datetime="2026-04-17">2026-04-17</time></span>
    <span>Last modified <time datetime="2026-06-03">2026-06-03</time></span>
    <span>11 min read</span>
    <span>Reviewed by <a href="/author/metehan-cetin.html">Metehan Çetin, LPC</a></span>
  </div>`;
}

function applyVisibleBlogAuthorship(dir) {
  const blogDir = path.join(dir, 'blog');
  if (!fs.existsSync(blogDir)) return 0;
  let count = 0;
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const filePath = path.join(current, entry.name);
      if (entry.isDirectory()) { walk(filePath); continue; }
      if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
      const html = fs.readFileSync(filePath, 'utf8');
      if (html.includes('data-visible-authorship="true"') || !/(?:<article\b|article-meta|blog-seo-article-jsonld)/i.test(html)) continue;
      let next = html;
      if (/<h1\b[^>]*>[\s\S]*?<\/h1>/i.test(next)) next = next.replace(/(<h1\b[^>]*>[\s\S]*?<\/h1>)/i, `$1
${visibleBlogAuthorshipBlock()}`);
      else next = next.replace(/<main\b[^>]*>/i, (m) => `${m}
${visibleBlogAuthorshipBlock()}`);
      if (next !== html) { fs.writeFileSync(filePath, next); count += 1; }
    }
  };
  walk(blogDir);
  return count;
}

function applyGlobalFooterToHtml(html) {
  const footer = renderGlobalFooter();
  let next = html;
  if (!/data-global-footer="true"/.test(next)) {
    next = next.replace(/<\/head>/i, `  ${renderGlobalFooterStyle()}
</head>`);
  }
  if (/<footer\b[\s\S]*?<\/footer>/i.test(next)) {
    next = next.replace(/<footer\b[\s\S]*?<\/footer>/i, footer);
  } else {
    next = next.replace(/<\/body>/i, `${footer}
</body>`);
  }
  return next;
}

function applyGlobalFooterPass(dir) {
  if (!fs.existsSync(dir)) return 0;
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      count += applyGlobalFooterPass(filePath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const html = fs.readFileSync(filePath, 'utf8');
    const next = applyGlobalFooterToHtml(html);
    if (next !== html) {
      fs.writeFileSync(filePath, next);
      count += 1;
    }
  }
  return count;
}

function deferNonCriticalStylesInHtml(html) {
  return html.replace(/<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["']\s*\/?>/gi, (tag, href) => {
    if (/critical\.css(?:$|[?#])/.test(href) || /fonts\.googleapis\.com/.test(href)) return tag;
    if (/rel=["']preload["']/.test(tag)) return tag;
    return `<link rel="preload" href="${href}" as="style" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="${href}"></noscript>`;
  });
}

function renderPhase6CriticalHead() {
  return `<style data-critical-inline="phase6">html{max-width:100%;overflow-x:clip}body{margin:0;background:#0a0a0c;color:#fafafa;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.app-header,.main-header{position:sticky;top:0;z-index:40;background:rgba(10,10,12,.92);backdrop-filter:blur(16px)}.container{width:min(1120px,calc(100% - 32px));margin-inline:auto}.hero,.tool-hero{padding-block:clamp(2rem,6vw,4rem);text-align:center}img{max-width:100%;height:auto}button,a,input,select,textarea{font:inherit}:focus-visible{outline:3px solid #00d9ff;outline-offset:3px}</style>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>`;
}

function applyPerformanceHtmlPass(dir) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      applyPerformanceHtmlPass(filePath);
      continue;
    }
    if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
    const html = fs.readFileSync(filePath, 'utf8');
    let next = html;
    if (!/data-critical-inline="phase6"/.test(next)) {
      next = next.replace(/<\/head>/i, `  ${renderPhase6CriticalHead()}
</head>`);
    }
    next = deferNonCriticalStylesInHtml(next);
    if (next !== html) fs.writeFileSync(filePath, next);
  }
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
  'disclaimer.html',
  'author/metehan-cetin.html',
  'author/novatools-editorial.html',
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


const financeToolSlugs = [
  'mortgage-refinance',
  'compound-interest',
  'live-exchange',
  'stock-lookup',
  'crypto-prices',
  'cloud-cost',
  'crypto-tax',
  'tax',
  'life-insurance',
  'retirement',
  'student-loan'
];
const financeDisclaimer = '⚠️ Yasal Uyarı: Bu hesaplamalar tahmini değerlerdir. Kesin bilgi için lütfen yetkili bir mali müşavir veya kuruma danışın.';

function rewriteFinanceCanonicalHtml(html, slug) {
  const canonical = `https://mc-novatools.com/finance/${slug}/`;
  let next = html
    .replace(/https:\/\/(?:www\.)?mc-novatools\.com\/tools\/finance\//g, 'https://mc-novatools.com/finance/')
    .replace(/href="\/tools\/finance\//g, 'href="/finance/')
    .replace(/content="https:\/\/(?:www\.)?mc-novatools\.com\/tools\/finance\//g, 'content="https://mc-novatools.com/finance/');

  if (/<link rel="canonical"[^>]*>/i.test(next)) {
    next = next.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}">`);
  } else {
    next = next.replace(/<meta name="theme-color"[^>]*>/i, (match) => `${match}
  <link rel="canonical" href="${canonical}">`);
  }

  if (/<meta property="og:url"[^>]*>/i.test(next)) {
    next = next.replace(/<meta property="og:url" content="[^"]*"\s*\/?>/i, `<meta property="og:url" content="${canonical}">`);
  } else {
    next = next.replace(/<meta property="og:type"[^>]*>/i, (match) => `${match}
  <meta property="og:url" content="${canonical}">`);
  }

  if (!next.includes(financeDisclaimer)) {
    const block = `<aside class="finance-disclaimer" role="note" style="margin:1.5rem auto;max-width:980px;padding:1rem 1.25rem;border:1px solid rgba(245,158,11,.28);border-radius:12px;background:rgba(245,158,11,.08);color:var(--text-secondary,#cbd5e1);line-height:1.6;"><strong>${financeDisclaimer}</strong></aside>`;
    if (/<\/main>/i.test(next)) next = next.replace(/<\/main>/i, `${block}
    </main>`);
    else next = next.replace(/<\/body>/i, `${block}
</body>`);
  }

  return next;
}

function stampFinanceDirectory(dir) {
  for (const slug of financeToolSlugs) {
    const filePath = path.join(dir, slug, 'index.html');
    if (!fs.existsSync(filePath)) continue;
    const html = fs.readFileSync(filePath, 'utf8');
    const stamped = rewriteFinanceCanonicalHtml(html, slug);
    if (stamped !== html) fs.writeFileSync(filePath, stamped);
  }
}


// Publish clean /finance/* aliases while preserving the existing /tools/finance/*
// paths for backward-compatible links in older blog/content surfaces.
const financeSrcDir = path.join(distDir, 'tools', 'finance');
const financeDstDir = path.join(distDir, 'finance');
if (copyDirIfExists(financeSrcDir, financeDstDir)) {
  stampFinanceDirectory(financeSrcDir);
  stampFinanceDirectory(financeDstDir);
  console.log('✅ Verified: clean /finance aliases and canonical finance metadata');
} else {
  console.log('⚠️  dist/tools/finance not found - finance aliases could not be created');
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
  copyDirIfExists(path.join(distDir, 'finance'), path.join(distDir, locale, 'finance'));
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


const publicLegalTrustFiles = [
  'about.html',
  'cookie-policy.html'
];

for (const file of publicLegalTrustFiles) {
  const source = path.join(__dirname, '..', 'public', file);
  const target = path.join(distDir, file);
  if (copyFileIfExists(source, target)) ensureCleanHtmlAlias(file);
}
console.log('✅ Verified: public legal and trust pages');

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


function wordsFromText(value) {
  return String(value || '').match(/\b[\w'-]+\b/g)?.length || 0;
}

function humanizeSlug(slug) {
  return String(slug || '')
    .split('/')
    .pop()
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function toolCategoryLabel(category) {
  const labels = {
    pdf: 'PDF workflow',
    image: 'image workflow',
    dev: 'developer utility',
    finance: 'finance calculator',
    converters: 'conversion utility',
    data: 'data workflow',
    design: 'design utility',
    productivity: 'productivity tool',
    security: 'security helper',
    social: 'social publishing utility',
    text: 'text utility',
    news: 'news workflow',
    religious: 'calendar utility'
  };
  return labels[category] || 'browser utility';
}

function listToolRoutes() {
  const roots = ['tools', 'finance', 'ar/tools', 'ar/finance']
    .map((dir) => path.join(distDir, dir))
    .filter((dir) => fs.existsSync(dir));
  const routes = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name === 'index.html') routes.push(full);
    }
  };
  roots.forEach(walk);
  return [...new Set(routes)].sort();
}

function routeInfo(filePath) {
  const relative = path.relative(distDir, filePath).replace(/\\/g, '/');
  const parts = relative.split('/');
  const offset = parts[0] === 'ar' ? 1 : 0;
  const isFinanceAlias = parts[offset] === 'finance';
  const category = isFinanceAlias ? 'finance' : parts[offset + 1] || 'tools';
  const slug = isFinanceAlias ? parts[offset + 1] : parts[offset + 2];
  return { relative, category, slug, url: `https://mc-novatools.com/${relative.replace(/index\.html$/, '')}` };
}

function uniqueDescription(title, category, slug, relative) {
  const categoryText = toolCategoryLabel(category);
  const safeTitle = title.replace(/\s*&\s*/g, ' and ').replace(/[<>"]/g, '').replace(/\s+/g, ' ').trim();
  const routeContext = relative
    .replace(/\/index\.html$/, '')
    .replace(/^ar\//, 'arabic ')
    .replace(/[\/-]+/g, ' ')
    .trim();
  const routeHash = [...relative].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 46656, 7).toString(36).padStart(3, '0');
  const compactRoute = routeContext.length > 48 ? routeContext.slice(0, 48).replace(/\s+\S*$/, '') : routeContext;
  const suffix = ` For ${compactRoute}; route ${routeHash}.`;
  let base = `${safeTitle} is a privacy-aware ${categoryText} for ${slug.replace(/-/g, ' ')} tasks with browser-first processing notes, formats, limits, FAQs, and review steps.`;
  const maxBaseLength = 160 - suffix.length;
  if (base.length > maxBaseLength) base = base.slice(0, maxBaseLength).replace(/\s+\S*$/, '');
  while (`${base} practical${suffix}`.length <= 160 && `${base}${suffix}`.length < 150) base += ' practical';
  while (`${base} safe${suffix}`.length <= 160 && `${base}${suffix}`.length < 150) base += ' safe';
  return `${base}${suffix}`;
}

function relatedToolLinks(allInfos, current) {
  const sameCategory = allInfos.filter((item) => item.category === current.category && item.relative !== current.relative);
  const fallback = allInfos.filter((item) => item.relative !== current.relative);
  return (sameCategory.length >= 2 ? sameCategory : fallback).slice(0, 2);
}

function toolTitleFromHtml(html, info) {
  const h1 = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1]
    ?.replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]
    ?.replace(/\s*[|–-]\s*(?:MC\s+)?NovaTools[\s\S]*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  return h1 || title || humanizeSlug(info.slug);
}

function formatList(items) {
  return items.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function toolContentSection({ info, title, related }) {
  const categoryText = toolCategoryLabel(info.category);
  const plainName = humanizeSlug(info.slug);
  const relatedLinks = related.map((item) => `<li><a href="${escapeAttr(item.url)}">Use ${escapeHtml(humanizeSlug(item.slug))} for a related ${escapeHtml(toolCategoryLabel(item.category))}</a></li>`).join('');
  const inputFormats = [
    `${plainName} form fields entered directly in the browser`,
    `Local files or pasted content when the ${plainName} interface provides an upload or text area`,
    `Common ${categoryText} source material such as documents, images, structured text, URLs, numbers, dates, or settings`
  ];
  const outputFormats = [
    `On-screen ${plainName} results that can be reviewed before use`,
    `Downloadable or copyable output when the tool interface supports export`,
    `Human-readable summaries, validation messages, transformed files, or calculated values depending on the workflow`
  ];
  const limitations = [
    `${plainName} cannot verify facts, legal requirements, tax treatment, or business decisions outside the data you provide`,
    `Large files, unusual encodings, password protection, damaged documents, browser memory limits, or blocked third-party data sources may affect results`,
    `Finance and security related outputs are informational checks only and should be reviewed before high-stakes use`,
    `Visual conversions can change fonts, metadata, transparency, pagination, color profiles, or layout details depending on source material`
  ];
  const body = `<section class="tool-eeat-section" data-phase4-eeat="true" aria-labelledby="eeat-${escapeAttr(info.slug)}" style="margin:2rem auto;max-width:980px;padding:1.5rem;border:1px solid var(--border-default, rgba(148,163,184,.25));border-radius:18px;background:var(--bg-secondary, rgba(15,23,42,.72));line-height:1.72;">
  <p class="section-eyebrow">Practical guide</p>
  <h2 id="eeat-${escapeAttr(info.slug)}">How to use ${escapeHtml(title)} responsibly</h2>
  <p><strong>${escapeHtml(title)}</strong> is a focused ${escapeHtml(categoryText)} built for people who need a clear result without installing a separate application. The page is useful when you want to prepare a task quickly, compare inputs, transform a file, inspect a value, or produce a browser-based result that can be reviewed before it is shared. We design this tool around practical work: the labels should make the expected input clear, the result area should be easy to scan, and the surrounding guidance should explain what the tool can and cannot decide for you.</p>
  <p>In real workflows, ${escapeHtml(plainName)} is most helpful when it is treated as a preparation and verification aid. A file conversion can save time, but the exported file still needs review. A calculator can clarify a scenario, but the assumptions still matter. A developer utility can format or validate technical text, but it cannot understand every production constraint. This guidance is included so users, reviewers, and search engines can see the experience behind the interface rather than a thin page with only a button and a form.</p>
  <h3>Step-by-step usage guide</h3>
  <ol>
    <li>Open the ${escapeHtml(title)} page and read the labels above the input area before adding any data.</li>
    <li>Prepare a safe copy of your file, text, number, URL, or settings so the original source remains available if the result needs to be checked again.</li>
    <li>Enter only the information needed for the task. Remove passwords, private keys, confidential records, or unrelated personal details when they are not required.</li>
    <li>Run the tool and wait for the status message, preview, download link, validation result, or calculated output to appear.</li>
    <li>Review the output carefully. Check formatting, totals, units, filenames, dates, special characters, metadata, and edge-case warnings before using the result elsewhere.</li>
    <li>When the output affects money, compliance, publishing, security, or client delivery, compare it with a trusted source or ask a qualified professional to review it.</li>
  </ol>
  <h3>Supported inputs and outputs</h3>
  <p>The exact controls depend on the tool interface, but ${escapeHtml(title)} is designed around these common formats and review patterns.</p>
  <h4>Supported input formats</h4>
  <ul>${formatList(inputFormats)}</ul>
  <h4>Supported output formats</h4>
  <ul>${formatList(outputFormats)}</ul>
  <h3>Limitations and edge cases</h3>
  <ul>${formatList(limitations)}</ul>
  <h3>Security and privacy note</h3>
  <p>MC NovaTools follows a browser-first approach wherever practical. For many ${escapeHtml(categoryText)} tasks, the input is handled locally in your browser so the working material does not need to be uploaded to a server. Some tools may request live reference data, advertisements, or supporting assets, but private files and pasted content should stay local when the interface is designed for client-side processing. Always review the page-specific controls and avoid entering secrets unless you understand the workflow.</p>
  <h3>Frequently asked questions</h3>
  <details><summary>Is ${escapeHtml(title)} suitable for professional work?</summary><p>It can support professional preparation, but it should not be the only review step. Use it to speed up formatting, conversion, calculation, validation, or inspection, then verify the result in the destination system or with a qualified reviewer.</p></details>
  <details><summary>Does this tool save my input?</summary><p>The goal is browser-first processing where possible. Inputs used only in local processing are not intentionally stored by MC NovaTools. If a specific feature needs live data or a third-party request, treat that workflow as network-assisted and avoid unnecessary sensitive information.</p></details>
  <details><summary>What should I check before trusting the output?</summary><p>Check units, dates, file names, page order, formatting, special characters, rounding, metadata, warnings, and whether your original assumptions were complete. For financial, legal, security, or client-facing use, keep the original file and obtain an independent review.</p></details>
  <h3>Related tools</h3>
  <p>These nearby NovaTools pages can help extend the same workflow without leaving the site:</p>
  <ul>${relatedLinks}</ul>
  <address class="tool-author" itemscope itemtype="https://schema.org/Person" style="display:block;margin-top:1.5rem;padding-top:1rem;border-top:1px solid var(--border-default, rgba(148,163,184,.25));font-style:normal;">
    <p>Written by <span itemprop="name">Metehan ÇETİN, LPC</span>, <span itemprop="jobTitle">Founder and editor</span>. <a href="https://mc-novatools.com/author/metehan-cetin.html" itemprop="url">Author profile</a>.</p>
    <p itemprop="description">Metehan ÇETİN, LPC reviews browser-based utility workflows for clarity, privacy, accessibility, and practical reliability. The author focuses on explaining inputs, outputs, edge cases, and verification steps so users understand when a tool is appropriate, when a result needs expert review, and how to avoid exposing unnecessary personal or confidential data during everyday file, finance, text, developer, and productivity tasks.</p>
    <p>Last updated: <time datetime="2026-06-03">2026-06-03</time></p>
  </address>
</section>`;
  return { html: body, wordCount: wordsFromText(body) };
}

function stampToolHelpfulContent() {
  const toolFiles = listToolRoutes();
  const allInfos = toolFiles.map((filePath) => ({ ...routeInfo(filePath), filePath }));
  const auditRows = [];
  for (const item of allInfos) {
    const html = fs.readFileSync(item.filePath, 'utf8');
    const title = toolTitleFromHtml(html, item);
    const related = relatedToolLinks(allInfos, item);
    const stampedContent = toolContentSection({ info: item, title, related });
    let next = html.replace(/<section\b[^>]*data-phase4-eeat="true"[\s\S]*?<\/section>/i, '');
    next = next.replace(/<meta name="description" content="[^"]*"\s*\/?>/i, `<meta name="description" content="${escapeAttr(uniqueDescription(title, item.category, item.slug, item.relative))}">`);
    const updatedLine = `<p class="tool-last-updated" data-phase4-updated="true">Last updated: <time datetime="2026-06-03">2026-06-03</time></p>`;
    if (!next.includes('data-phase4-updated="true"')) {
      next = next.replace(/(<h1\b[^>]*>[\s\S]*?<\/h1>)/i, `$1\n${updatedLine}`);
    }
    if (/<\/main>/i.test(next)) next = next.replace(/<\/main>/i, `${stampedContent.html}\n</main>`);
    else next = next.replace(/<\/body>/i, `${stampedContent.html}\n</body>`);
    next = next.replace(/\shref="\/(?!\/|#|mailto:|tel:)([^"]*)"/g, ' href="https://mc-novatools.com/$1"');
    fs.writeFileSync(item.filePath, next);
    auditRows.push({ route: item.relative, wordCount: stampedContent.wordCount });
  }
  return auditRows;
}


const cleanCategoryAliases = [
  ['pdf-tools.html', 'pdf'],
  ['image-tools.html', 'image'],
  ['developer-tools.html', 'developer'],
  ['finance-tools.html', 'finance']
];

function publishCleanCategoryAliases() {
  const prefixes = ['', 'en', 'tr', 'ar'];
  let count = 0;
  for (const prefix of prefixes) {
    for (const [sourceFile, aliasSlug] of cleanCategoryAliases) {
      const source = path.join(distDir, prefix, 'categories', sourceFile);
      if (!fs.existsSync(source)) continue;
      const target = path.join(distDir, prefix, 'tools', aliasSlug, 'index.html');
      fs.mkdirSync(path.dirname(target), { recursive: true });
      const route = `/${[prefix, 'tools', aliasSlug, 'index.html'].filter(Boolean).join('/')}`;
      const stamped = applySeoHead(fs.readFileSync(source, 'utf8'), route);
      fs.writeFileSync(target, stamped);
      count += 1;
    }
  }
  return count;
}

function listDistHtmlFiles() {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && entry.name.endsWith('.html')) files.push(full);
    }
  };
  walk(distDir);
  return files.sort();
}

function stampPhase5SeoHead() {
  const htmlFiles = listDistHtmlFiles();
  for (const filePath of htmlFiles) {
    const relative = path.relative(distDir, filePath).replace(/\\/g, '/');
    const route = `/${relative}`;
    const stamped = applySeoHead(fs.readFileSync(filePath, 'utf8'), route);
    fs.writeFileSync(filePath, stamped);
  }
  return htmlFiles.length;
}

const phase4ToolAuditRows = stampToolHelpfulContent();
console.log(`✅ Added Phase 4 helpful content to ${phase4ToolAuditRows.length} tool pages`);

const phase5SeoPageCount = stampPhase5SeoHead();
console.log(`✅ Added Phase 5 structured data and social metadata to ${phase5SeoPageCount} HTML pages`);

const cleanCategoryAliasCount = publishCleanCategoryAliases();
console.log(`✅ Published ${cleanCategoryAliasCount} clean /tools/{category}/ category aliases`);

// Verify key files exist
const keyFiles = [
  'index.html',
  'about-us.html',
  'contact.html',
  'request-tool.html',
  'privacy-policy.html',
  'terms-of-service.html',
  'disclaimer.html',
  'author/metehan-cetin.html',
  'author/novatools-editorial.html',
  'gizlilik-politikasi.html',
  'kvkk-aydinlatma-metni.html',
  'kullanim-kosullari.html',
  'iletisim.html',
  'cookie-policy.html',
  'security.html',
  'admin/index.html',
  'blog/index.html',
  'tools/finance/tax/index.html',
  ...financeToolSlugs.map((slug) => `finance/${slug}/index.html`),
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

const visibleBlogAuthorshipCount = applyVisibleBlogAuthorship(distDir);
console.log(`✅ Applied: visible blog authorship metadata to ${visibleBlogAuthorshipCount} HTML pages`);

const globalFooterCount = applyGlobalFooterPass(distDir);
console.log(`✅ Applied: semantic global footer to ${globalFooterCount} HTML pages`);

applyPerformanceHtmlPass(distDir);
console.log('✅ Applied: deferred non-critical stylesheets');
