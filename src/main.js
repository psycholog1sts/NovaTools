/**
 * MC NovaTools - Main Application Script
 * Homepage rendering and interactions
 */

import categories from './data/categories.js';
import { setupThemeToggle } from './theme-toggle.mjs';
import { initHomeSearch } from './js/home-search.js';

// ============================================
// I18N HELPERS
// ============================================
function t(key, fallback) {
  if (window.i18n && typeof window.i18n.t === 'function') {
    return window.i18n.t(key, fallback);
  }
  return fallback;
}

function getCategoryLabel(categoryName) {
  const map = {
    'PDF Tools': t('nav.pdf', 'PDF Tools'),
    'Image Tools': t('nav.image', 'Image Tools'),
    'Finance Tools': t('nav.finance', 'Finance Tools'),
    'Developer Tools': t('nav.developer', 'Developer Tools'),
    'Text & Writing': t('nav.text', 'Text & Writing'),
    Converters: t('nav.converters', 'Converters'),
    'Security Tools': t('nav.security', 'Security Tools'),
    Productivity: t('home.productivity', 'Productivity'),
    'Data Tools': t('home.dataTools', 'Data Tools'),
    'Design Tools': t('home.designTools', 'Design Tools'),
    Calculators: t('home.calculators', 'Calculators'),
    'Social Media': t('home.socialMedia', 'Social Media')
  };

  return map[categoryName] || categoryName;
}

function getCategoryName(category) {
  return t(`home.categories.${category.slug}.name`, getCategoryLabel(category.name));
}

function getCategoryDescription(category) {
  return t(
    `home.categories.${category.slug}.description`,
    category.shortDescription || category.description || ''
  );
}

function getCategoryHref(category) {
  return `/categories/${category.slug}.html`;
}

function getToolHref(slug) {
  return `/tools/${slug}/`;
}

// ============================================
// DESIGN SYSTEM INTERACTIONS
// ============================================
function initDesignSystemInteractions() {
  setupThemeToggle('themeToggle');

  const header = document.querySelector('.app-header');
  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    if (!header) return;
    const currentScrollY = window.scrollY;
    const shouldHide = currentScrollY > lastScrollY && currentScrollY > 96;
    header.classList.toggle('is-hidden', shouldHide);
    lastScrollY = currentScrollY;
  }, { passive: true });
}

// ============================================
// MOBILE MENU
// ============================================
function toggleMobileMenu() {
  const menu = document.getElementById('mobileMenu');
  menu?.classList.toggle('active');
}

window.toggleMobileMenu = toggleMobileMenu;

// ============================================
// SEARCH MODAL
// ============================================
function toggleSearch() {
  const modal = document.getElementById('searchModal');
  modal?.classList.toggle('active');

  if (modal?.classList.contains('active')) {
    document.getElementById('globalSearch')?.focus();
  }
}

window.toggleSearch = toggleSearch;

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    document.getElementById('searchModal')?.classList.remove('active');
  }
});

const popularTasks = [
  { label: 'PDF Birleştir', slug: 'pdf/merge', icon: 'file-text' },
  { label: 'PDF Sıkıştır', slug: 'pdf/compress', icon: 'file-text' },
  { label: 'Resim Sıkıştır', slug: 'image/compress', icon: 'image' },
  { label: 'JSON Formatter', slug: 'dev/json-formatter', icon: 'code' },
  { label: 'Para Birimi Çevir', slug: 'converters/currency-converter', icon: 'repeat' },
  { label: 'Kelime Sayacı', slug: 'text/word-counter', icon: 'type' },
  { label: 'Mortgage Hesapla', slug: 'finance/mortgage-refinance', icon: 'trending-up' },
  { label: 'Şifre Oluştur', slug: 'security/password-generator', icon: 'shield' }
];

const featuredTools = [
  {
    slug: 'pdf/merge',
    name: 'PDF Merge',
    description: 'Birden fazla PDF dosyasını tek belgede düzenli şekilde birleştirin.',
    category: 'PDF Tools',
    icon: 'file-text'
  },
  {
    slug: 'image/compress',
    name: 'Image Compressor',
    description: 'Web ve e-posta için görsellerin dosya boyutunu hızlıca azaltın.',
    category: 'Image Tools',
    icon: 'image'
  },
  {
    slug: 'dev/json-formatter',
    name: 'JSON Formatter',
    description: 'JSON verisini okunabilir hale getirin, biçimlendirin ve kontrol edin.',
    category: 'Developer Tools',
    icon: 'code'
  },
  {
    slug: 'finance/mortgage-refinance',
    name: 'Mortgage Refinance',
    description: 'Yeniden finansman senaryolarını planlama amaçlı karşılaştırın.',
    category: 'Finance Tools',
    icon: 'trending-up'
  }
];

const categoryPopularTools = {
  'pdf-tools': [
    ['PDF Merge', 'pdf/merge'],
    ['Compress PDF', 'pdf/compress'],
    ['PDF to JPG', 'pdf/pdf-to-jpg']
  ],
  'image-tools': [
    ['Image Compress', 'image/compress'],
    ['Image Resize', 'image/image-resizer'],
    ['Image to WebP', 'image/image-to-webp']
  ],
  'finance-tools': [
    ['Mortgage', 'finance/mortgage-refinance'],
    ['Tax Estimator', 'finance/tax'],
    ['Compound Interest', 'finance/compound-interest']
  ],
  'text-writing': [
    ['Word Counter', 'text/word-counter'],
    ['Case Converter', 'text/case-converter'],
    ['Text Diff', 'text/text-diff']
  ],
  'developer-tools': [
    ['JSON Formatter', 'dev/json-formatter'],
    ['Regex Tester', 'dev/regex-tester'],
    ['Base64 Converter', 'dev/base64-converter']
  ],
  converters: [
    ['Unit Converter', 'converters/unit-converter'],
    ['Currency Converter', 'converters/currency-converter'],
    ['Time Zone', 'converters/timezone-converter']
  ],
  'calculator-tools': [
    ['Scientific', 'converters/scientific-calculator'],
    ['BMI', 'converters/bmi-calculator'],
    ['Percentage', 'converters/percentage-calculator']
  ],
  'security-tools': [
    ['Password Generator', 'security/password-generator'],
    ['Hash Generator', 'security/hash-generator'],
    ['UUID Generator', 'security/uuid-generator']
  ],
  'social-media-tools': [
    ['UTM Builder', 'social/utm-builder'],
    ['Hashtag Generator', 'social/hashtag-generator'],
    ['Thumbnail', 'social/youtube-thumbnail']
  ],
  'productivity-tools': [
    ['Pomodoro', 'productivity/pomodoro-timer'],
    ['Todo List', 'productivity/todo-list'],
    ['Notes', 'productivity/notes']
  ],
  'data-tools': [
    ['CSV to JSON', 'data/csv-to-json'],
    ['JSON to CSV', 'data/json-to-csv'],
    ['SQL Formatter', 'data/sql-formatter']
  ],
  'design-tools': [
    ['Logo Maker', 'design/logo-maker'],
    ['Invoice', 'design/invoice-generator'],
    ['QR Designer', 'design/qr-code-designer']
  ]
};

const blogPosts = [
  {
    title: 'Tool selection map for new users',
    excerpt: 'Yeni bir işe başlarken hangi kategoriye ve araca gitmeniz gerektiğini hızlıca seçin.',
    category: 'Workflow',
    href: '/blog/articles/tool-selection-map-for-new-users.html',
    image: '/logo-brand-520.webp',
    minutes: '5 dk'
  },
  {
    title: 'Compress images for web quality checklist',
    excerpt: 'Görsel boyutunu düşürürken okunabilirlik, format ve sayfa hızı kontrollerini atlamayın.',
    category: 'Image',
    href: '/blog/articles/compress-images-for-web-quality-checklist.html',
    image: '/logo-brand-520.webp',
    minutes: '6 dk'
  },
  {
    title: 'Base64 converter common use cases',
    excerpt: 'Geliştirici akışlarında kodlama, çözme ve paylaşım öncesi kontrol adımları.',
    category: 'Developer',
    href: '/blog/articles/base64-converter-common-use-cases.html',
    image: '/logo-brand-520.webp',
    minutes: '4 dk'
  }
];

// ============================================
// RENDER HOMEPAGE SECTIONS
// ============================================
function renderPopularTasks() {
  const container = document.getElementById('popularTasks');
  if (!container) return;

  container.innerHTML = popularTasks.map((task) => `
    <a class="task-chip" href="${getToolHref(task.slug)}">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        ${getIconPath(task.icon)}
      </svg>
      <span>${task.label}</span>
    </a>
  `).join('');
}

function renderFeaturedTools() {
  const container = document.getElementById('featuredTools');
  if (!container) return;

  container.innerHTML = featuredTools.map((tool) => `
    <article class="featured-tool-card">
      <div class="featured-tool-card__icon">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          ${getIconPath(tool.icon)}
        </svg>
      </div>
      <span class="featured-tool-card__category">${getCategoryLabel(tool.category)}</span>
      <h3>${tool.name}</h3>
      <p>${tool.description}</p>
      <a href="${getToolHref(tool.slug)}">Kullan →</a>
    </article>
  `).join('');
}

function renderCategories() {
  const container = document.getElementById('categoriesGrid');
  if (!container) return;

  container.innerHTML = categories.map((category) => {
    const popularLinks = categoryPopularTools[category.slug] || [];

    return `
      <article class="category-nav-card">
        <div
          class="category-nav-card__icon"
          style="background: linear-gradient(135deg, ${category.color}22, ${category.color}0f); color: ${category.color}"
          aria-hidden="true"
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${getIconPath(category.icon)}
          </svg>
        </div>
        <h3><a href="${getCategoryHref(category)}">${getCategoryName(category)}</a></h3>
        <p>${getCategoryDescription(category)}</p>
        <div class="category-nav-card__links" aria-label="${getCategoryName(category)} popular tools">
          ${popularLinks.map(([label, slug]) => `<a href="${getToolHref(slug)}">${label}</a>`).join('')}
        </div>
      </article>
    `;
  }).join('');
}

function renderBlogCards() {
  const container = document.getElementById('homeBlogCards');
  if (!container) return;

  container.innerHTML = blogPosts.map((post) => `
    <article class="home-blog-card">
      <a href="${post.href}" class="home-blog-card__image" aria-label="${post.title}">
        <picture>
          <source srcset="${post.image}" type="image/webp">
          <img src="/logo-brand-520.png" alt="" width="520" height="292" loading="lazy" decoding="async">
        </picture>
      </a>
      <div class="home-blog-card__body">
        <div class="home-blog-card__meta">
          <span>${post.category}</span>
          <span>${post.minutes} okuma</span>
        </div>
        <h3><a href="${post.href}">${post.title}</a></h3>
        <p>${post.excerpt}</p>
      </div>
    </article>
  `).join('');
}

// ============================================
// ICON HELPER
// ============================================
function getIconPath(name) {
  const icons = {
    'file-text': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>',
    'trending-up': '<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>',
    type: '<polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>',
    code: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    repeat: '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    calculator: '<rect x="4" y="2" width="16" height="20" rx="2"/><line x1="8" y1="6" x2="16" y2="6"/><line x1="16" y1="14" x2="16" y2="14"/><line x1="12" y1="14" x2="12" y2="14"/><line x1="8" y1="14" x2="8" y2="14"/><line x1="12" y1="18" x2="12" y2="18"/><line x1="8" y1="18" x2="8" y2="18"/><line x1="16" y1="18" x2="16" y2="18"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    'share-2': '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>',
    zap: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    palette: '<circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.01 17.461 2 12 2z"/>'
  };

  return icons[name] || icons['file-text'];
}

// ============================================
// SEARCH FUNCTIONALITY
// ============================================
function initSearch() {
  const searchInput = document.getElementById('globalSearch');
  const searchResults = document.getElementById('searchResults');

  if (!searchInput || !searchResults) return;

  const allTools = popularTasks.concat(featuredTools).map((tool) => ({
    name: tool.label || tool.name,
    slug: tool.slug,
    category: tool.category || 'Popular'
  }));

  searchInput.oninput = (event) => {
    const query = event.target.value.toLowerCase().trim();

    if (query.length < 2) {
      searchResults.innerHTML = '';
      return;
    }

    const results = allTools.filter((tool) =>
      tool.name.toLowerCase().includes(query) ||
      tool.category.toLowerCase().includes(query)
    ).slice(0, 5);

    searchResults.innerHTML = results.map((tool) => `
      <a href="${getToolHref(tool.slug)}" class="search-result-item">
        <span class="search-result-name">${tool.name}</span>
        <span class="search-result-category">${tool.category}</span>
      </a>
    `).join('') || `<div class="search-no-results">${t('home.noResults', 'No tools found')}</div>`;
  };
}

// ============================================
// RERENDER ON LANGUAGE CHANGE
// ============================================
function rerenderHomepageDynamicParts() {
  renderPopularTasks();
  renderFeaturedTools();
  renderCategories();
  renderBlogCards();
  initSearch();
  initHomeSearch({ getToolHref });
}

window.addEventListener('languageChanged', () => {
  rerenderHomepageDynamicParts();
});

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  initDesignSystemInteractions();
  rerenderHomepageDynamicParts();
});
