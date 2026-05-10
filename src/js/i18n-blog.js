const blogModules = import.meta.glob('../i18n/blog/*.json', { eager: true, import: 'default' });

export const supportedBlogLocales = ['en', 'tr', 'de', 'fr', 'es', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'it', 'pl', 'nl'];
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

const additionalBlogUi = {
  de: { dir: 'ltr', heroBadge: 'Redaktionelle Workflow-Bibliothek', heroTitle: 'NovaTools Blog – Digitale Produktivität verbessern', heroDescription: 'Praktische Leitfäden für PDF, Bilder, Datenschutz, Finanzen, Entwicklerautomatisierung und produktive Browser-Workflows.', searchPlaceholder: 'Blogartikel suchen...', featured: 'Empfohlener Artikel', latest: 'Neueste Leitfäden', loadMore: 'Mehr laden', all: 'Alle', emptyTitle: 'Noch keine Artikel in dieser Kategorie', emptyText: 'Wählen Sie eine andere Kategorie oder zeigen Sie alle Artikel an.', emptyButton: 'Alle Artikel anzeigen', fallbackNotice: '', categories: {} },
  fr: { dir: 'ltr', heroBadge: 'Bibliothèque de workflows éditoriaux', heroTitle: 'Blog NovaTools – Améliorez votre productivité numérique', heroDescription: 'Guides pratiques pour PDF, images, confidentialité, finance, automatisation développeur et workflows dans le navigateur.', searchPlaceholder: 'Rechercher des articles...', featured: 'Article à la une', latest: 'Derniers guides', loadMore: 'Charger plus', all: 'Tous', emptyTitle: 'Aucun article dans cette catégorie', emptyText: 'Essayez une autre catégorie ou affichez tous les articles.', emptyButton: 'Voir tous les articles', fallbackNotice: '', categories: {} },
  es: { dir: 'ltr', heroBadge: 'Biblioteca editorial de flujos', heroTitle: 'Blog de NovaTools – Mejore su productividad digital', heroDescription: 'Guías prácticas para PDF, imágenes, privacidad, finanzas, automatización de desarrollo y flujos en el navegador.', searchPlaceholder: 'Buscar artículos...', featured: 'Artículo destacado', latest: 'Últimas guías', loadMore: 'Cargar más', all: 'Todos', emptyTitle: 'No hay artículos en esta categoría', emptyText: 'Pruebe otra categoría o vea todos los artículos.', emptyButton: 'Ver todos los artículos', fallbackNotice: '', categories: {} },
  pt: { dir: 'ltr', heroBadge: 'Biblioteca editorial de fluxos', heroTitle: 'Blog NovaTools – Melhore sua produtividade digital', heroDescription: 'Guias práticos para PDF, imagens, privacidade, finanças, automação de desenvolvimento e fluxos no navegador.', searchPlaceholder: 'Pesquisar artigos...', featured: 'Artigo em destaque', latest: 'Guias recentes', loadMore: 'Carregar mais', all: 'Todos', emptyTitle: 'Nenhum artigo nesta categoria', emptyText: 'Tente outra categoria ou veja todos os artigos.', emptyButton: 'Ver todos os artigos', fallbackNotice: '', categories: {} },
  ru: { dir: 'ltr', heroBadge: 'Библиотека редакционных процессов', heroTitle: 'Блог NovaTools — повысьте цифровую продуктивность', heroDescription: 'Практические руководства для PDF, изображений, приватности, финансов, разработки и браузерных процессов.', searchPlaceholder: 'Поиск статей...', featured: 'Избранная статья', latest: 'Новые руководства', loadMore: 'Показать ещё', all: 'Все', emptyTitle: 'В этой категории пока нет статей', emptyText: 'Попробуйте другую категорию или откройте все статьи.', emptyButton: 'Показать все статьи', fallbackNotice: '', categories: {} },
  zh: { dir: 'ltr', heroBadge: '编辑工作流资料库', heroTitle: 'NovaTools 博客 – 提升数字生产力', heroDescription: '面向 PDF、图像、隐私、金融、开发自动化和浏览器工作流的实用指南。', searchPlaceholder: '搜索博客文章...', featured: '精选文章', latest: '最新指南', loadMore: '加载更多', all: '全部', emptyTitle: '此类别暂无文章', emptyText: '尝试其他类别或查看全部文章。', emptyButton: '查看全部文章', fallbackNotice: '', categories: {} },
  ja: { dir: 'ltr', heroBadge: '編集ワークフローライブラリ', heroTitle: 'NovaTools ブログ – デジタル生産性を高める', heroDescription: 'PDF、画像、プライバシー、金融、開発自動化、ブラウザワークフローの実用ガイド。', searchPlaceholder: '記事を検索...', featured: '注目記事', latest: '最新ガイド', loadMore: 'さらに表示', all: 'すべて', emptyTitle: 'このカテゴリの記事はまだありません', emptyText: '別のカテゴリを試すか、すべての記事を表示してください。', emptyButton: 'すべての記事を見る', fallbackNotice: '', categories: {} },
  ko: { dir: 'ltr', heroBadge: '편집 워크플로 라이브러리', heroTitle: 'NovaTools 블로그 – 디지털 생산성 향상', heroDescription: 'PDF, 이미지, 개인정보, 금융, 개발 자동화 및 브라우저 워크플로를 위한 실용 가이드.', searchPlaceholder: '블로그 글 검색...', featured: '추천 글', latest: '최신 가이드', loadMore: '더 보기', all: '전체', emptyTitle: '이 카테고리에 아직 글이 없습니다', emptyText: '다른 카테고리를 시도하거나 모든 글을 보세요.', emptyButton: '모든 글 보기', fallbackNotice: '', categories: {} },
  hi: { dir: 'ltr', heroBadge: 'संपादकीय वर्कफ़्लो लाइब्रेरी', heroTitle: 'NovaTools ब्लॉग – डिजिटल उत्पादकता बढ़ाएँ', heroDescription: 'PDF, इमेज, गोपनीयता, वित्त, डेवलपर ऑटोमेशन और ब्राउज़र वर्कफ़्लो के लिए व्यावहारिक गाइड।', searchPlaceholder: 'ब्लॉग लेख खोजें...', featured: 'विशेष लेख', latest: 'नवीनतम गाइड', loadMore: 'और लोड करें', all: 'सभी', emptyTitle: 'इस श्रेणी में अभी लेख नहीं हैं', emptyText: 'दूसरी श्रेणी आज़माएँ या सभी लेख देखें।', emptyButton: 'सभी लेख देखें', fallbackNotice: '', categories: {} },
  it: { dir: 'ltr', heroBadge: 'Libreria di workflow editoriali', heroTitle: 'Blog NovaTools – Migliora la produttività digitale', heroDescription: 'Guide pratiche per PDF, immagini, privacy, finanza, automazione sviluppatore e workflow nel browser.', searchPlaceholder: 'Cerca articoli...', featured: 'Articolo in evidenza', latest: 'Ultime guide', loadMore: 'Carica altro', all: 'Tutti', emptyTitle: 'Nessun articolo in questa categoria', emptyText: 'Prova un’altra categoria o visualizza tutti gli articoli.', emptyButton: 'Vedi tutti gli articoli', fallbackNotice: '', categories: {} },
  pl: { dir: 'ltr', heroBadge: 'Biblioteka redakcyjnych przepływów pracy', heroTitle: 'Blog NovaTools – Popraw produktywność cyfrową', heroDescription: 'Praktyczne poradniki dla PDF, obrazów, prywatności, finansów, automatyzacji deweloperskiej i workflow w przeglądarce.', searchPlaceholder: 'Szukaj artykułów...', featured: 'Wyróżniony artykuł', latest: 'Najnowsze poradniki', loadMore: 'Załaduj więcej', all: 'Wszystkie', emptyTitle: 'Brak artykułów w tej kategorii', emptyText: 'Spróbuj innej kategorii albo zobacz wszystkie artykuły.', emptyButton: 'Zobacz wszystkie artykuły', fallbackNotice: '', categories: {} },
  nl: { dir: 'ltr', heroBadge: 'Bibliotheek voor redactionele workflows', heroTitle: 'NovaTools Blog – Verbeter uw digitale productiviteit', heroDescription: 'Praktische gidsen voor PDF, afbeeldingen, privacy, finance, ontwikkelautomatisering en browserworkflows.', searchPlaceholder: 'Blogartikelen zoeken...', featured: 'Uitgelicht artikel', latest: 'Nieuwste gidsen', loadMore: 'Meer laden', all: 'Alle', emptyTitle: 'Nog geen artikelen in deze categorie', emptyText: 'Probeer een andere categorie of bekijk alle artikelen.', emptyButton: 'Alle artikelen bekijken', fallbackNotice: '', categories: {} }
};

Object.entries(additionalBlogUi).forEach(([locale, ui]) => {
  blogUi[locale] = { ...blogUi.en, ...ui, categories: { ...blogUi.en.categories, ...ui.categories } };
});

const blogDataByLocale = Object.fromEntries(
  Object.entries(blogModules).map(([path, data]) => {
    const locale = path.match(/\/([a-z]{2})\.json$/)?.[1];
    return [locale, data];
  }).filter(([locale]) => supportedBlogLocales.includes(locale))
);

export function getActiveBlogLocale() {
  const documentLocale = document.documentElement.lang;
  return supportedBlogLocales.includes(documentLocale) ? documentLocale : fallbackBlogLocale;
}

export function getBlogUi(locale = getActiveBlogLocale()) {
  return blogUi[locale] || blogUi[fallbackBlogLocale];
}

export function getBlogPostsForLocale(locale = getActiveBlogLocale()) {
  return blogDataByLocale[locale] || blogDataByLocale[fallbackBlogLocale] || [];
}

export function getTranslatedBlogSlugs() {
  const [firstLocale, ...restLocales] = supportedBlogLocales;
  const baseSlugs = new Set((blogDataByLocale[firstLocale] || []).map((post) => post.slug));
  return [...baseSlugs].filter((slug) => restLocales.every((locale) => (blogDataByLocale[locale] || []).some((post) => post.slug === slug)));
}

export function getBlogPost(locale, slug) {
  const localized = (blogDataByLocale[locale] || []).find((post) => post.slug === slug);
  if (localized) return { post: localized, locale, isFallback: false, isUnavailable: false };
  const fallback = (blogDataByLocale[fallbackBlogLocale] || []).find((post) => post.slug === slug);
  if (fallback) return { post: fallback, locale, isFallback: locale !== fallbackBlogLocale, isUnavailable: false };
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
