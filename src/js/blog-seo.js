import { SITE_ORIGIN, absoluteBlogUrl, blogArticlePath, blogHubPath, supportedBlogLocales } from './blog-routes.js';

const SITE_NAME = 'MC NovaTools';
const BLOG_NAME = 'MC NovaTools Blog';
const TITLE_SUFFIX = ' | NovaTools Blog';
const MAX_TITLE = 60;
const MAX_DESCRIPTION = 160;
const DESCRIPTION_TARGET = 155;
const OG_IMAGE_WIDTH = 1200;
const OG_IMAGE_HEIGHT = 630;

const localeMeta = {
  en: { home: 'Home', blog: 'Blog', titleSuffix: TITLE_SUFFIX, blogTitle: 'NovaTools Blog – Practical Browser Tools Guides', blogDescription: 'Practical NovaTools guides for PDF, image, privacy, finance, developer, data, and browser-first workflows.', ogLocale: 'en_US' },
  tr: { home: 'Ana Sayfa', blog: 'Blog', titleSuffix: ' | NovaTools Blog', blogTitle: 'NovaTools Blog – Pratik Tarayıcı Araç Rehberleri', blogDescription: 'PDF, görsel, gizlilik, finans, geliştirici, veri ve tarayıcı öncelikli iş akışları için pratik NovaTools rehberleri.', ogLocale: 'tr_TR' },
  de: { home: 'Startseite', blog: 'Blog', titleSuffix: ' | NovaTools Blog', blogTitle: 'NovaTools Blog – Praxisleitfäden für Browser-Tools', blogDescription: 'Praktische NovaTools-Leitfäden für PDF-, Bild-, Datenschutz-, Finanz-, Entwickler-, Daten- und Browser-Workflows.', ogLocale: 'de_DE' },
  fr: { home: 'Accueil', blog: 'Blog', titleSuffix: ' | NovaTools Blog', blogTitle: 'Blog NovaTools – Guides pratiques pour outils web', blogDescription: 'Guides NovaTools pratiques pour les PDF, images, confidentialité, finance, développeurs, données et workflows navigateur.', ogLocale: 'fr_FR' },
  es: { home: 'Inicio', blog: 'Blog', titleSuffix: ' | NovaTools Blog', blogTitle: 'Blog NovaTools – Guías prácticas para herramientas web', blogDescription: 'Guías NovaTools para PDF, imágenes, privacidad, finanzas, desarrollo, datos y flujos de trabajo en el navegador.', ogLocale: 'es_ES' },
  pt: { home: 'Início', blog: 'Blog', titleSuffix: ' | NovaTools Blog', blogTitle: 'Blog NovaTools – Guias práticos para ferramentas web', blogDescription: 'Guias NovaTools para PDF, imagens, privacidade, finanças, desenvolvimento, dados e fluxos no navegador.', ogLocale: 'pt_BR' },
  ru: { home: 'Главная', blog: 'Блог', titleSuffix: ' | NovaTools Blog', blogTitle: 'Блог NovaTools – практические руководства', blogDescription: 'Практические руководства NovaTools для PDF, изображений, приватности, финансов, разработки, данных и браузерных процессов.', ogLocale: 'ru_RU' },
  zh: { home: '首页', blog: '博客', titleSuffix: ' | NovaTools Blog', blogTitle: 'NovaTools 博客 – 实用浏览器工具指南', blogDescription: '面向 PDF、图像、隐私、财务、开发者、数据和浏览器优先工作流的实用 NovaTools 指南。', ogLocale: 'zh_CN' },
  ja: { home: 'ホーム', blog: 'ブログ', titleSuffix: ' | NovaTools Blog', blogTitle: 'NovaTools ブログ – 実用的なブラウザツールガイド', blogDescription: 'PDF、画像、プライバシー、金融、開発、データ、ブラウザ中心ワークフロー向けの実用的な NovaTools ガイド。', ogLocale: 'ja_JP' },
  ko: { home: '홈', blog: '블로그', titleSuffix: ' | NovaTools Blog', blogTitle: 'NovaTools 블로그 – 실용적인 브라우저 도구 가이드', blogDescription: 'PDF, 이미지, 개인정보, 금융, 개발자, 데이터, 브라우저 우선 워크플로를 위한 실용적인 NovaTools 가이드.', ogLocale: 'ko_KR' },
  ar: { home: 'الرئيسية', blog: 'المدونة', titleSuffix: ' | NovaTools Blog', blogTitle: 'مدونة NovaTools – أدلة عملية لأدوات المتصفح', blogDescription: 'أدلة NovaTools عملية لملفات PDF والصور والخصوصية والمال والمطورين والبيانات ومسارات العمل داخل المتصفح.', ogLocale: 'ar_AR' },
  hi: { home: 'होम', blog: 'ब्लॉग', titleSuffix: ' | NovaTools Blog', blogTitle: 'NovaTools ब्लॉग – व्यावहारिक ब्राउज़र टूल गाइड', blogDescription: 'PDF, छवि, गोपनीयता, वित्त, डेवलपर, डेटा और ब्राउज़र-प्रथम वर्कफ़्लो के लिए व्यावहारिक NovaTools गाइड।', ogLocale: 'hi_IN' },
  it: { home: 'Home', blog: 'Blog', titleSuffix: ' | NovaTools Blog', blogTitle: 'Blog NovaTools – Guide pratiche per strumenti web', blogDescription: 'Guide NovaTools pratiche per PDF, immagini, privacy, finanza, sviluppo, dati e workflow nel browser.', ogLocale: 'it_IT' },
  pl: { home: 'Strona główna', blog: 'Blog', titleSuffix: ' | NovaTools Blog', blogTitle: 'Blog NovaTools – praktyczne poradniki narzędzi web', blogDescription: 'Praktyczne poradniki NovaTools dla PDF, obrazów, prywatności, finansów, developerów, danych i pracy w przeglądarce.', ogLocale: 'pl_PL' },
  nl: { home: 'Home', blog: 'Blog', titleSuffix: ' | NovaTools Blog', blogTitle: 'NovaTools Blog – Praktische gidsen voor browsertools', blogDescription: 'Praktische NovaTools-gidsen voor PDF, afbeeldingen, privacy, finance, development, data en browser-first workflows.', ogLocale: 'nl_NL' }
};

function metaFor(locale = 'en') {
  return localeMeta[locale] || localeMeta.en;
}

function truncate(value, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function titleFor(post, locale = 'en') {
  const suffix = metaFor(locale).titleSuffix;
  const full = `${post.title}${suffix}`;
  if (full.length <= MAX_TITLE) return full;
  return `${truncate(post.title, MAX_TITLE - suffix.length)}${suffix}`;
}

function descriptionFor(post) {
  const source = post.excerpt || (post.summary || []).slice(0, 2).join(' ');
  return truncate(source, DESCRIPTION_TARGET);
}

function cleanBlogUrl(slug, locale = 'en') {
  return absoluteBlogUrl(blogArticlePath(slug, locale));
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

function hreflangEntries(pathBuilder) {
  return [
    ...supportedBlogLocales.map((supportedLocale) => [supportedLocale, pathBuilder(supportedLocale)]),
    ['x-default', pathBuilder('en')]
  ];
}

export function getCleanBlogUrl(slug, locale = 'en') {
  return cleanBlogUrl(slug, locale);
}

export function getSeoImage(post, variant = 'og') {
  const image = post.coverImage || {};
  return absolute(image[variant] || image.og || image.card || image.ogFallback || image.cardFallback || '/logo-brand-520.png');
}

export function getBlogSeoText(post, locale = 'en') {
  return {
    title: titleFor(post, locale),
    description: descriptionFor(post),
    limits: { maxTitle: MAX_TITLE, maxDescription: MAX_DESCRIPTION }
  };
}

export function buildBlogArticleSeo(post, locale = 'en', categoryLabel = post.category) {
  const { title, description } = getBlogSeoText(post, locale);
  const canonicalUrl = cleanBlogUrl(post.slug, locale);
  const defaultUrl = cleanBlogUrl(post.slug, 'en');
  const ogImage = getSeoImage(post, 'og');
  const authorUrl = post.author?.profileUrl ? `${SITE_ORIGIN}${post.author.profileUrl}` : `${SITE_ORIGIN}/author/${authorSlug(post)}.html`;
  const published = isoDate(post.datePublished);
  const modified = isoDate(post.dateModified || post.datePublished);
  const labels = metaFor(locale);
  const alternateLocales = supportedBlogLocales
    .filter((supportedLocale) => supportedLocale !== locale)
    .map((supportedLocale) => metaFor(supportedLocale).ogLocale);
  const alternates = hreflangEntries((supportedLocale) => cleanBlogUrl(post.slug, supportedLocale));

  return {
    title,
    description,
    canonicalUrl,
    defaultUrl,
    ogImage,
    ogImageType: ogImage.endsWith('.svg') ? 'image/svg+xml' : 'image/webp',
    ogLocale: labels.ogLocale,
    alternateLocales,
    alternates,
    published,
    modified,
    jsonLd: {
      article: {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        image: [ogImage],
        datePublished: published,
        dateModified: modified,
        author: {
          '@type': 'Person',
          name: post.author?.name || 'NovaTools Editorial Review',
          url: authorUrl
        },
        publisher: {
          '@type': 'Organization',
          '@id': `${SITE_ORIGIN}/#organization`,
          name: SITE_NAME,
          logo: {
            '@type': 'ImageObject',
            url: `${SITE_ORIGIN}/logo-brand-520.png`,
            width: 512,
            height: 512
          }
        },
        description,
        articleSection: categoryLabel,
        inLanguage: locale,
        mainEntityOfPage: {
          '@type': 'WebPage',
          '@id': canonicalUrl
        }
      },
      faq: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        inLanguage: locale,
        mainEntity: (post.faq || []).map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer
          }
        }))
      },
      breadcrumb: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: labels.home, item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: labels.blog, item: `${SITE_ORIGIN}${blogHubPath(locale)}` },
          { '@type': 'ListItem', position: 3, name: categoryLabel, item: `${SITE_ORIGIN}${blogHubPath(locale)}?category=${encodeURIComponent(post.category)}` },
          { '@type': 'ListItem', position: 4, name: post.title, item: canonicalUrl }
        ]
      }
    }
  };
}

export function buildBlogIndexSeo(locale = 'en', posts = []) {
  const labels = metaFor(locale);
  const canonicalUrl = `${SITE_ORIGIN}${blogHubPath(locale)}`;
  const ogImage = `${SITE_ORIGIN}/logo-brand-520.png`;
  const siteSuffix = ` | ${SITE_NAME}`;
  const title = `${truncate(labels.blogTitle, MAX_TITLE - siteSuffix.length)}${siteSuffix}`;
  return {
    title,
    description: truncate(labels.blogDescription, DESCRIPTION_TARGET),
    canonicalUrl,
    ogImage,
    ogImageType: 'image/png',
    ogLocale: labels.ogLocale,
    alternateLocales: supportedBlogLocales.filter((supportedLocale) => supportedLocale !== locale).map((supportedLocale) => metaFor(supportedLocale).ogLocale),
    alternates: hreflangEntries((supportedLocale) => `${SITE_ORIGIN}${blogHubPath(supportedLocale)}`),
    jsonLd: {
      blog: {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: BLOG_NAME,
        url: canonicalUrl,
        description: truncate(labels.blogDescription, DESCRIPTION_TARGET),
        inLanguage: locale,
        publisher: {
          '@type': 'Organization',
          '@id': `${SITE_ORIGIN}/#organization`,
          name: SITE_NAME,
          logo: {
            '@type': 'ImageObject',
            url: `${SITE_ORIGIN}/logo-brand-520.png`,
            width: 512,
            height: 512
          }
        }
      },
      articleList: {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: `${BLOG_NAME} latest articles`,
        itemListElement: posts.slice(0, 12).map((post, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Article',
            headline: post.title,
            url: cleanBlogUrl(post.slug, locale),
            image: getSeoImage(post, 'card'),
            datePublished: isoDate(post.datePublished),
            dateModified: isoDate(post.dateModified || post.datePublished),
            author: {
              '@type': 'Person',
              name: post.author?.name || 'NovaTools Editorial Review'
            }
          }
        }))
      },
      breadcrumb: {
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: labels.home, item: `${SITE_ORIGIN}/` },
          { '@type': 'ListItem', position: 2, name: labels.blog, item: canonicalUrl }
        ]
      }
    }
  };
}

function applyAlternates(alternates) {
  document.head.querySelectorAll('link[rel="alternate"][data-blog-seo="hreflang"]').forEach((item) => item.remove());
  alternates.forEach(([hreflang, href]) => {
    const link = document.createElement('link');
    link.rel = 'alternate';
    link.hreflang = hreflang;
    link.href = href;
    link.dataset.blogSeo = 'hreflang';
    document.head.appendChild(link);
  });
}

export function injectBlogIndexSeo(locale = 'en', posts = []) {
  const seo = buildBlogIndexSeo(locale, posts);
  document.title = seo.title;
  ensureMeta('meta[name="description"]', { name: 'description', content: seo.description });
  ensureLink('link[rel="canonical"]', { rel: 'canonical', href: seo.canonicalUrl });
  applyAlternates(seo.alternates);
  ensureMeta('meta[property="og:title"]', { property: 'og:title', content: seo.title });
  ensureMeta('meta[property="og:description"]', { property: 'og:description', content: seo.description });
  ensureMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' });
  ensureMeta('meta[property="og:url"]', { property: 'og:url', content: seo.canonicalUrl });
  ensureMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
  ensureMeta('meta[property="og:locale"]', { property: 'og:locale', content: seo.ogLocale });
  document.head.querySelectorAll('meta[property="og:locale:alternate"][data-blog-seo="og-locale"]').forEach((item) => item.remove());
  seo.alternateLocales.forEach((ogLocale) => {
    const meta = document.createElement('meta');
    meta.setAttribute('property', 'og:locale:alternate');
    meta.setAttribute('content', ogLocale);
    meta.dataset.blogSeo = 'og-locale';
    document.head.appendChild(meta);
  });
  ensureMeta('meta[property="og:image"]', { property: 'og:image', content: seo.ogImage });
  ensureMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: '520' });
  ensureMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: '520' });
  ensureMeta('meta[property="og:image:type"]', { property: 'og:image:type', content: seo.ogImageType });
  ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: seo.title });
  ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: seo.description });
  ensureMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: seo.ogImage });
  upsertJsonLd('blog-seo-jsonld', seo.jsonLd.blog);
  if (seo.jsonLd.articleList.itemListElement.length) upsertJsonLd('blog-seo-article-list-jsonld', seo.jsonLd.articleList);
  upsertJsonLd('blog-seo-breadcrumb-jsonld', seo.jsonLd.breadcrumb);
  return { title: seo.title, description: seo.description, canonicalUrl: seo.canonicalUrl, ogImage: seo.ogImage };
}

export function injectBlogSeo(post, locale, categoryLabel) {
  const seo = buildBlogArticleSeo(post, locale, categoryLabel);

  document.title = seo.title;
  ensureMeta('meta[name="description"]', { name: 'description', content: seo.description });
  ensureLink('link[rel="canonical"]', { rel: 'canonical', href: seo.canonicalUrl });
  applyAlternates(seo.alternates);

  ensureMeta('meta[property="og:title"]', { property: 'og:title', content: seo.title });
  ensureMeta('meta[property="og:description"]', { property: 'og:description', content: seo.description });
  ensureMeta('meta[property="og:image"]', { property: 'og:image', content: seo.ogImage });
  ensureMeta('meta[property="og:image:width"]', { property: 'og:image:width', content: String(OG_IMAGE_WIDTH) });
  ensureMeta('meta[property="og:image:height"]', { property: 'og:image:height', content: String(OG_IMAGE_HEIGHT) });
  ensureMeta('meta[property="og:image:type"]', { property: 'og:image:type', content: seo.ogImageType });
  ensureMeta('meta[property="og:url"]', { property: 'og:url', content: seo.canonicalUrl });
  ensureMeta('meta[property="og:type"]', { property: 'og:type', content: 'article' });
  ensureMeta('meta[property="og:site_name"]', { property: 'og:site_name', content: SITE_NAME });
  ensureMeta('meta[property="og:locale"]', { property: 'og:locale', content: seo.ogLocale });
  document.head.querySelectorAll('meta[property="og:locale:alternate"][data-blog-seo="og-locale"]').forEach((item) => item.remove());
  seo.alternateLocales.forEach((ogLocale) => {
    const meta = document.createElement('meta');
    meta.setAttribute('property', 'og:locale:alternate');
    meta.setAttribute('content', ogLocale);
    meta.dataset.blogSeo = 'og-locale';
    document.head.appendChild(meta);
  });
  ensureMeta('meta[property="article:published_time"]', { property: 'article:published_time', content: seo.published });
  ensureMeta('meta[property="article:modified_time"]', { property: 'article:modified_time', content: seo.modified });
  ensureMeta('meta[property="article:section"]', { property: 'article:section', content: categoryLabel });
  ensureMeta('meta[property="article:tag"]', { property: 'article:tag', content: (post.tags || []).join(', ') });

  ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary_large_image' });
  ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: seo.title });
  ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: seo.description });
  ensureMeta('meta[name="twitter:image"]', { name: 'twitter:image', content: seo.ogImage });

  upsertJsonLd('blog-seo-article-jsonld', seo.jsonLd.article);
  if (post.faq?.length) upsertJsonLd('blog-seo-faq-jsonld', seo.jsonLd.faq);
  upsertJsonLd('blog-seo-breadcrumb-jsonld', seo.jsonLd.breadcrumb);

  return { title: seo.title, description: seo.description, canonicalUrl: seo.canonicalUrl, ogImage: seo.ogImage };
}

export const BLOG_SEO_LIMITS = { MAX_TITLE, MAX_DESCRIPTION };
