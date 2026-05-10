const SITE_ORIGIN = 'https://mc-novatools.com';
const TITLE_SUFFIX = ' | NovaTools Blog';
const MAX_TITLE = 60;
const MAX_DESCRIPTION = 160;
const DESCRIPTION_TARGET = 155;

function truncate(value, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function titleFor(post) {
  const full = `${post.title}${TITLE_SUFFIX}`;
  if (full.length <= MAX_TITLE) return full;
  return `${truncate(post.title, MAX_TITLE - TITLE_SUFFIX.length)}${TITLE_SUFFIX}`;
}

function descriptionFor(post) {
  const source = post.excerpt || (post.summary || []).slice(0, 2).join(' ');
  return truncate(source, DESCRIPTION_TARGET);
}

function cleanBlogUrl(slug, _locale = 'en') {
  return `${SITE_ORIGIN}/blog/articles/${slug}.html`;
}

function absolute(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_ORIGIN}${path}`;
}

function ensureMeta(selector, attrs) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('meta');
    document.head.appendChild(element);
  }
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function ensureLink(selector, attrs) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement('link');
    document.head.appendChild(element);
  }
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

function upsertJsonLd(id, data) {
  let element = document.getElementById(id);
  if (!element) {
    element = document.createElement('script');
    element.id = id;
    element.type = 'application/ld+json';
    document.head.appendChild(element);
  }
  element.textContent = JSON.stringify(data);
}

function authorSlug(post) {
  return (post.authorId || post.author?.name || 'novatools-editorial')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function isoDate(date) {
  return `${date}T08:00:00+00:00`;
}

export function getCleanBlogUrl(slug, locale = 'en') {
  return cleanBlogUrl(slug, locale);
}

export function getSeoImage(post, variant = 'og') {
  const image = post.coverImage || {};
  return absolute(image[variant] || image.og || image.card || image.ogFallback || image.cardFallback);
}

export function injectBlogSeo(post, locale, categoryLabel) {
  const title = titleFor(post);
  const description = descriptionFor(post);
  const canonicalUrl = cleanBlogUrl(post.slug, locale);
  const defaultUrl = cleanBlogUrl(post.slug, 'en');
  const ogImage = getSeoImage(post, 'og');
  const authorUrl = `${SITE_ORIGIN}/authors/${authorSlug(post)}`;
  const published = isoDate(post.datePublished);
  const modified = isoDate(post.dateModified || post.datePublished);

  document.title = title;
  ensureMeta('meta[name="description"]', { name: 'description', content: description });
  ensureLink('link[rel="canonical"]', { rel: 'canonical', href: canonicalUrl });

  document.head.querySelectorAll('link[rel="alternate"][data-blog-seo="hreflang"]').forEach((item) => item.remove());
  [
    ['en', defaultUrl],
    ['tr', cleanBlogUrl(post.slug, 'tr')],
    ['ar', cleanBlogUrl(post.slug, 'ar')],
    ['x-default', defaultUrl]
  ].forEach(([hreflang, href]) => {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = hreflang;
    link.href = href;
    link.dataset.blogSeo = 'hreflang';
    document.head.appendChild(link);
  });

  ensureMeta('meta[property="og:title"]', { property: 'og:title', content: title });
  ensureMeta('meta[property="og:description"]', { property: 'og:description', content: description });
  ensureMeta('meta[property="og:image"]', { property: 'og:image', content: ogImage });
  ensureMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: '1200' });
  ensureMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: '630' });
  ensureMeta('meta[property="og:image:type"]', { property: 'og:image:type', content: ogImage.endsWith('.svg') ? 'image/svg+xml' : 'image/webp' });
  ensureMeta('meta[property="og:url"]', { property: 'og:url', content: canonicalUrl });
  ensureMeta('meta[property="og:type"]', { property: 'og:type', content: 'article' });
  ensureMeta('meta[property="article:published_time"]', { property: 'article:published_time', content: published });
  ensureMeta('meta[property="article:modified_time"]', { property: 'article:modified_time', content: modified });
  ensureMeta('meta[property="article:section"]', { property: 'article:section', content: categoryLabel });
  ensureMeta('meta[property="article:tag"]', { property: 'article:tag', content: (post.tags || []).join(', ') });

  ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: title });
  ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: description });
  ensureMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: ogImage });

  upsertJsonLd('blog-seo-article-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    image: [ogImage],
    datePublished: published,
    dateModified: modified,
    author: {
      '@type': 'Person',
      name: post.author.name,
      url: authorUrl
    },
    publisher: {
      '@type': 'Organization',
      name: 'NovaTools',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_ORIGIN}/logo-brand.png`
      }
    },
    description,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl
    }
  });

  upsertJsonLd('blog-seo-faq-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: (post.faq || []).map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer
      }
    }))
  });

  upsertJsonLd('blog-seo-breadcrumb-jsonld', {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: locale === 'tr' ? 'Ana Sayfa' : locale === 'ar' ? 'الرئيسية' : 'Home', item: `${SITE_ORIGIN}/` },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: `${SITE_ORIGIN}/blog/` },
      { '@type': 'ListItem', position: 3, name: categoryLabel, item: `${SITE_ORIGIN}/blog/?category=${encodeURIComponent(post.category)}` },
      { '@type': 'ListItem', position: 4, name: post.title, item: canonicalUrl }
    ]
  });

  return { title, description, canonicalUrl, ogImage };
}

export const BLOG_SEO_LIMITS = { MAX_TITLE, MAX_DESCRIPTION };
