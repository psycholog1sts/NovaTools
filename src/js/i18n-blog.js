const blogModules = import.meta.glob('../i18n/blog/*.json', { eager: true, import: 'default' });

export const supportedBlogLocales = ['en', 'tr', 'ar'];
export const fallbackBlogLocale = 'en';

export const blogUi = {
  en: {
    dir: 'ltr',
    heroBadge: 'Editorial workflow library',
    heroTitle: 'NovaTools Blog – Improve Your Digital Productivity',
    heroDescription: 'In-depth guides on AI, data privacy, fintech, education technology, developer automation, and remote productivity.',
    searchPlaceholder: 'Search blog articles...',
    featured: 'Featured article',
    latest: 'Latest guides',
    loadMore: 'Load more',
    all: 'All',
    emptyTitle: 'No articles in this category yet',
    emptyText: 'Try another category or view every article.',
    emptyButton: 'View all articles',
    fallbackNotice: 'This article is currently available only in English.',
    categories: {
      'artificial-intelligence': 'Artificial Intelligence',
      'data-privacy': 'Data Privacy',
      'remote-productivity': 'Remote Productivity',
      'fintech-personal-finance': 'Fintech',
      'education-technology': 'Education Technology',
      'developer-automation': 'Developer Tools'
    }
  },
  tr: {
    dir: 'ltr',
    heroBadge: 'Editoryal iş akışı kütüphanesi',
    heroTitle: 'NovaTools Blog – Dijital Üretkenliğinizi Artırın',
    heroDescription: 'Yapay zeka, veri güvenliği, fintech, eğitim teknolojileri, geliştirici otomasyonu ve uzaktan üretkenlik konularında derinlemesine rehberler.',
    searchPlaceholder: 'Blog yazılarında ara...',
    featured: 'Öne çıkan yazı',
    latest: 'Son rehberler',
    loadMore: 'Daha Fazla Yükle',
    all: 'Tümü',
    emptyTitle: 'Bu kategoride henüz yazı yok',
    emptyText: 'Diğer kategorilere göz atın veya tüm yazıları görüntüleyin.',
    emptyButton: 'Tüm Yazıları Gör',
    fallbackNotice: 'Bu yazı şu anda yalnızca İngilizce olarak mevcuttur.',
    categories: {
      'artificial-intelligence': 'Yapay Zeka',
      'data-privacy': 'Veri Güvenliği',
      'remote-productivity': 'Üretkenlik',
      'fintech-personal-finance': 'Fintech',
      'education-technology': 'Eğitim Teknolojileri',
      'developer-automation': 'Geliştirici Araçları'
    }
  },
  ar: {
    dir: 'rtl',
    heroBadge: 'مكتبة تحريرية لمسارات العمل',
    heroTitle: 'مدونة NovaTools – عزز إنتاجيتك الرقمية',
    heroDescription: 'أدلة متعمقة حول الذكاء الاصطناعي وخصوصية البيانات والتقنيات المالية وتقنيات التعليم وأتمتة المطورين والعمل عن بعد.',
    searchPlaceholder: 'ابحث في مقالات المدونة...',
    featured: 'المقال المميز',
    latest: 'أحدث الأدلة',
    loadMore: 'تحميل المزيد',
    all: 'الكل',
    emptyTitle: 'لا توجد مقالات في هذه الفئة بعد',
    emptyText: 'جرّب فئة أخرى أو اعرض كل المقالات.',
    emptyButton: 'عرض كل المقالات',
    fallbackNotice: 'هذا المقال متاح حالياً باللغة الإنجليزية فقط.',
    categories: {
      'artificial-intelligence': 'الذكاء الاصطناعي',
      'data-privacy': 'خصوصية البيانات',
      'remote-productivity': 'إنتاجية العمل عن بعد',
      'fintech-personal-finance': 'التقنيات المالية',
      'education-technology': 'تقنيات التعليم',
      'developer-automation': 'أدوات المطورين'
    }
  }
};

const blogDataByLocale = Object.fromEntries(
  Object.entries(blogModules).map(([path, data]) => {
    const locale = path.match(/\/([a-z]{2})\.json$/)?.[1];
    return [locale, data];
  }).filter(([locale]) => supportedBlogLocales.includes(locale))
);

export function getActiveBlogLocale() {
  const pathLocale = window.location.pathname.match(/^\/(tr|ar)(?=\/|$)/)?.[1];
  if (supportedBlogLocales.includes(pathLocale)) return pathLocale;

  let stored = fallbackBlogLocale;
  try {
    stored = localStorage.getItem('mc-novatools-language') || localStorage.getItem('language') || document.documentElement.lang || fallbackBlogLocale;
  } catch {
    stored = document.documentElement.lang || fallbackBlogLocale;
  }
  return supportedBlogLocales.includes(stored) ? stored : fallbackBlogLocale;
}

export function getBlogUi(locale = getActiveBlogLocale()) {
  return blogUi[locale] || blogUi[fallbackBlogLocale];
}

export function getBlogPostsForLocale(locale = getActiveBlogLocale()) {
  return blogDataByLocale[locale] || [];
}

export function getTranslatedBlogSlugs() {
  const [firstLocale, ...restLocales] = supportedBlogLocales;
  const baseSlugs = new Set((blogDataByLocale[firstLocale] || []).map((post) => post.slug));
  return [...baseSlugs].filter((slug) => restLocales.every((locale) => (blogDataByLocale[locale] || []).some((post) => post.slug === slug)));
}

export function getBlogPost(locale, slug) {
  const localized = getBlogPostsForLocale(locale).find((post) => post.slug === slug);
  if (localized) return { post: localized, locale, isFallback: false, isUnavailable: false };
  return { post: null, locale, isFallback: false, isUnavailable: true };
}

export function applyBlogDocumentLocale(locale) {
  const ui = getBlogUi(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = ui.dir;
}

export function applyNoindexFallback(message = getBlogUi().fallbackNotice) {
  let robots = document.querySelector('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement('meta');
    robots.setAttribute('name', 'robots');
    document.head.appendChild(robots);
  }
  robots.setAttribute('content', 'noindex, follow');
  let notice = document.querySelector('[data-blog-fallback-notice]');
  if (!notice) {
    notice = document.createElement('aside');
    notice.setAttribute('data-blog-fallback-notice', '');
    notice.setAttribute('role', 'status');
    notice.style.cssText = 'margin:1rem auto;padding:1rem;max-width:720px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--surface-elevated);color:var(--text-secondary);';
    document.body.prepend(notice);
  }
  notice.textContent = message;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

export function renderBlogPicture(post, variant = 'card', options = {}) {
  const width = options.width || (variant === 'og' ? 1200 : variant === 'featured' ? 1200 : 800);
  const height = options.height || (variant === 'og' ? 630 : variant === 'featured' ? 675 : 450);
  const image = post.coverImage || {};
  const webp = image[variant] || image.card || image.og;
  const fallback = image[`${variant}Fallback`] || image.cardFallback || image.ogFallback || webp;
  const alt = options.alt || `${post.title} cover image`;
  const loading = options.loading || 'lazy';
  const className = options.className ? ` class="${options.className}"` : '';
  const sourceType = webp?.endsWith('.svg') ? 'image/svg+xml' : 'image/webp';
  return `<picture${className}><source srcset="${webp}" type="${sourceType}"><img src="${fallback}" alt="${escapeHtml(alt)}" loading="${loading}" width="${width}" height="${height}"></picture>`;
}

export function renderContentBlock(block) {
  if (block.type === 'table') return `<figure class="table-wrapper">${block.html}</figure>`;
  if (block.type === 'code') return `<div class="code-panel"><button class="copy-code" type="button">Copy</button><pre><code class="language-${block.language || 'text'}">${escapeHtml(block.code || '')}</code></pre></div>`;
  if (block.type === 'image') return `<figure class="article-figure"><img src="${block.src}" alt="${block.alt}" loading="lazy" width="1280" height="720"><figcaption>${block.caption || ''}</figcaption></figure>`;
  return block.html || '';
}
