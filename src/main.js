/**
 * MC NovaTools - Main Application Script
 * Homepage rendering and interactions
 */

import categories from './data/categories.js';
import { setupThemeToggle } from './theme-toggle.mjs';
import { initConsentManager } from './core/consent-manager.mjs';
import { initAnalytics } from './js/analytics.js';
import { applySeo, buildHomeSchema, upsertJsonLd } from './js/seo.js';
import { initHomeSearch } from './js/home-search.js';
import { getPopularThisWeek } from './components/engagement-widgets.mjs';

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
  { key: 'mergePdf', label: 'Merge PDF', slug: 'pdf/merge', icon: 'file-text' },
  { key: 'compressPdf', label: 'Compress PDF', slug: 'pdf/compress', icon: 'file-text' },
  { key: 'compressImage', label: 'Compress Image', slug: 'image/compress', icon: 'image' },
  { key: 'jsonFormatter', label: 'JSON Formatter', slug: 'dev/json-formatter', icon: 'code' },
  { key: 'liveExchange', label: 'Live Exchange', slug: 'finance/live-exchange', icon: 'repeat' },
  { key: 'textAnalysis', label: 'Text Analysis', slug: 'text/text-analysis', icon: 'type' },
  { key: 'mortgageCalculator', label: 'Mortgage Calculator', slug: 'finance/mortgage-refinance', icon: 'trending-up' },
  { key: 'passwordGenerator', label: 'Password Generator', slug: 'security/password-generator', icon: 'shield' }
];

const featuredTools = [
  {
    key: 'pdfMerge',
    slug: 'pdf/merge',
    name: 'PDF Merge',
    description: 'Combine multiple PDF files into one organized document.',
    category: 'PDF Tools',
    icon: 'file-text'
  },
  {
    key: 'imageCompress',
    slug: 'image/compress',
    name: 'Image Compressor',
    description: 'Reduce image file sizes for web and email workflows.',
    category: 'Image Tools',
    icon: 'image'
  },
  {
    key: 'jsonFormatter',
    slug: 'dev/json-formatter',
    name: 'JSON Formatter',
    description: 'Format, read and validate JSON data before sharing.',
    category: 'Developer Tools',
    icon: 'code'
  },
  {
    key: 'liveExchange',
    slug: 'finance/live-exchange',
    name: 'Live Exchange Converter',
    description: 'Convert currency estimates with live-data and cached fallback handling.',
    category: 'Finance Tools',
    icon: 'trending-up'
  }
];

const categoryPopularTools = {
  'pdf-tools': [
    { key: 'pdfMerge', label: 'PDF Merge', slug: 'pdf/merge' },
    { key: 'pdfCompress', label: 'Compress PDF', slug: 'pdf/compress' },
    { key: 'pdfToJpg', label: 'PDF to JPG', slug: 'pdf/pdf-to-jpg' }
  ],
  'image-tools': [
    { key: 'imageCompress', label: 'Image Compress', slug: 'image/compress' },
    { key: 'imageResize', label: 'Image Resize', slug: 'image/image-resizer' },
    { key: 'imageToWebp', label: 'Image to WebP', slug: 'image/image-to-webp' }
  ],
  'finance-tools': [
    { key: 'liveExchange', label: 'Live Exchange', slug: 'finance/live-exchange' },
    { key: 'cryptoPrices', label: 'Crypto Prices', slug: 'finance/crypto-prices' },
    { key: 'stockLookup', label: 'Stock Lookup', slug: 'finance/stock-lookup' }
  ],
  'text-writing': [
    { key: 'textAnalysis', label: 'Text Analysis', slug: 'text/text-analysis' },
    { key: 'textSummarizer', label: 'Text Summarizer', slug: 'text/text-summarizer' },
    { key: 'simpleTranslator', label: 'Simple Translator', slug: 'text/simple-translator' }
  ],
  'developer-tools': [
    { key: 'jsonFormatter', label: 'JSON Formatter', slug: 'dev/json-formatter' },
    { key: 'regexTester', label: 'Regex Tester', slug: 'dev/regex-tester' },
    { key: 'base64Converter', label: 'Base64 Converter', slug: 'dev/base64-converter' }
  ],
  converters: [
    { key: 'unitConverter', label: 'Unit Converter', slug: 'converters/unit-converter' },
    { key: 'currencyConverter', label: 'Currency Converter', slug: 'converters/currency-converter' },
    { key: 'timezone', label: 'Time Zone', slug: 'converters/timezone-converter' }
  ],
  'calculator-tools': [
    { key: 'scientific', label: 'Scientific', slug: 'converters/scientific-calculator' },
    { key: 'bmi', label: 'BMI', slug: 'converters/bmi-calculator' },
    { key: 'percentage', label: 'Percentage', slug: 'converters/percentage-calculator' }
  ],
  'security-tools': [
    { key: 'passwordGenerator', label: 'Password Generator', slug: 'security/password-generator' },
    { key: 'hashGenerator', label: 'Hash Generator', slug: 'security/hash-generator' },
    { key: 'uuidGenerator', label: 'UUID Generator', slug: 'security/uuid-generator' }
  ],
  'social-media-tools': [
    { key: 'utmBuilder', label: 'UTM Builder', slug: 'social/utm-builder' },
    { key: 'hashtagGenerator', label: 'Hashtag Generator', slug: 'social/hashtag-generator' },
    { key: 'thumbnail', label: 'Thumbnail', slug: 'social/youtube-thumbnail' }
  ],
  'productivity-tools': [
    { key: 'pomodoro', label: 'Pomodoro', slug: 'productivity/pomodoro-timer' },
    { key: 'todoList', label: 'Todo List', slug: 'productivity/todo-list' },
    { key: 'notes', label: 'Notes', slug: 'productivity/notes' }
  ],
  'data-tools': [
    { key: 'csvJsonSummary', label: 'CSV/JSON Summary', slug: 'data/csv-json-summarizer' },
    { key: 'chartBuilder', label: 'Chart Builder', slug: 'data/chart-builder' },
    { key: 'weatherLookup', label: 'Weather Lookup', slug: 'data/weather-lookup' }
  ],
  'design-tools': [
    { key: 'logoMaker', label: 'Logo Maker', slug: 'design/logo-maker' },
    { key: 'invoice', label: 'Invoice', slug: 'design/invoice-generator' },
    { key: 'qrDesigner', label: 'QR Designer', slug: 'design/qr-code-designer' }
  ]
};

const blogPosts = [
  {
    key: 'toolSelection',
    title: 'Tool selection map for new users',
    excerpt: 'Choose the right category and tool quickly when you start a new task.',
    category: 'Workflow',
    href: '/blog/articles/tool-selection-map-for-new-users.html',
    image: '/images/blog-covers/workflow-planning.svg',
    minutes: '5 min'
  },
  {
    key: 'imageQuality',
    title: 'Compress images for web quality checklist',
    excerpt: 'Keep quality, format and page speed checks in view while reducing image size.',
    category: 'Image',
    href: '/blog/articles/compress-images-for-web-quality-checklist.html',
    image: '/images/blog-covers/image-workflow.svg',
    minutes: '6 min'
  },
  {
    key: 'base64Uses',
    title: 'Base64 converter common use cases',
    excerpt: 'Encoding, decoding and pre-share checks for developer workflows.',
    category: 'Developer',
    href: '/blog/articles/base64-converter-common-use-cases.html',
    image: '/images/blog-covers/developer-utilities.svg',
    minutes: '4 min'
  }
];

const workflowCards = [
  {
    key: 'pdfEmail',
    title: 'Prepare a PDF for email',
    description: 'Compress the file, confirm readability, then use the PDF checklist before sending.',
    tool: ['Compress PDF', 'pdf/compress'],
    guide: ['PDF email checklist', '/blog/articles/compress-pdf-for-email-without-ruining-readability.html'],
    category: ['PDF tools', '/categories/pdf-tools.html']
  },
  {
    key: 'developerData',
    title: 'Clean developer data',
    description: 'Format JSON, compare text changes and keep shareable snippets readable.',
    tool: ['JSON Formatter', 'dev/json-formatter'],
    guide: ['Debugging tool chain', '/blog/articles/developer-debugging-tool-chain.html'],
    category: ['Developer tools', '/categories/developer-tools.html']
  },
  {
    key: 'lighterImages',
    title: 'Publish lighter images',
    description: 'Resize, compress and review file names before uploading images to a site or email.',
    tool: ['Image Compressor', 'image/compress'],
    guide: ['Image quality checklist', '/blog/articles/compress-images-for-web-quality-checklist.html'],
    category: ['Image tools', '/categories/image-tools.html']
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
      <span>${t(`home.toolLabels.${task.key}`, task.label)}</span>
    </a>
  `).join('');
}


function renderPopularThisWeek() {
  const container = document.getElementById('popularThisWeek');
  if (!container) return;

  container.innerHTML = getPopularThisWeek(6).map((tool) => `
    <a class="home-popular-week__card" href="${tool.href}">
      <strong>${tool.name}</strong>
      <span>${tool.category}</span>
      <small>${tool.count
        ? (tool.count === 1
          ? t('home.privateStarter.localUse', '1 use on this device this week')
          : t('home.privateStarter.localUses', '{count} uses on this device this week').replace('{count}', String(tool.count)))
        : t('home.privateStarter.starterTool', 'Suggested starter tool')}</small>
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
      <h3>${t(`home.featuredCards.${tool.key}.name`, tool.name)}</h3>
      <p>${t(`home.featuredCards.${tool.key}.description`, tool.description)}</p>
      <a href="${getToolHref(tool.slug)}">${t('home.featured.open', 'Open →')}</a>
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
          ${popularLinks.map((tool) => `<a href="${getToolHref(tool.slug)}">${t(`home.categoryPopularTools.${tool.key}`, tool.label)}</a>`).join('')}
        </div>
      </article>
    `;
  }).join('');
}

function renderBlogCards() {
  const container = document.getElementById('homeBlogCards');
  if (!container) return;

  container.innerHTML = blogPosts.map((post) => {
    const baseKey = `home.blogCards.${post.key}`;
    const title = t(`${baseKey}.title`, post.title);
    const excerpt = t(`${baseKey}.excerpt`, post.excerpt);
    const category = t(`${baseKey}.category`, post.category);
    const readSuffix = t('home.blogCards.readSuffix', 'read');

    return `
      <article class="home-blog-card">
        <a href="${post.href}" class="home-blog-card__image" aria-label="${title}">
          <img src="${post.image}" alt="" width="640" height="360" loading="lazy" decoding="async">
        </a>
        <div class="home-blog-card__body">
          <div class="home-blog-card__meta">
            <span>${category}</span>
            <span>${post.minutes} ${readSuffix}</span>
          </div>
          <h3><a href="${post.href}">${title}</a></h3>
          <p>${excerpt}</p>
        </div>
      </article>
    `;
  }).join('');
}

function renderWorkflowCards() {
  const container = document.getElementById('workflowCards');
  if (!container) return;

  container.innerHTML = workflowCards.map((workflow) => {
    const baseKey = `home.workflows.cards.${workflow.key}`;
    const title = t(`${baseKey}.title`, workflow.title);
    const description = t(`${baseKey}.description`, workflow.description);
    const toolLabel = t(`${baseKey}.tool`, workflow.tool[0]);
    const guideLabel = t(`${baseKey}.guide`, workflow.guide[0]);
    const categoryLabel = t(`${baseKey}.category`, workflow.category[0]);

    return `
      <article class="workflow-card">
        <span class="workflow-card__label">${t('home.workflows.label', 'Guided workflow')}</span>
        <h3>${title}</h3>
        <p>${description}</p>
        <div class="workflow-card__steps">
          <a href="${getToolHref(workflow.tool[1])}"><strong>${t('home.workflows.steps.tool', 'Tool')}</strong>${toolLabel}</a>
          <a href="${workflow.guide[1]}"><strong>${t('home.workflows.steps.guide', 'Guide')}</strong>${guideLabel}</a>
          <a href="${workflow.category[1]}"><strong>${t('home.workflows.steps.browse', 'Browse')}</strong>${categoryLabel}</a>
        </div>
      </article>
    `;
  }).join('');
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
  renderPopularThisWeek();
  renderCategories();
  renderBlogCards();
  renderWorkflowCards();
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
  applySeo({ type: 'home', path: '/' });
  upsertJsonLd('homepage-seo-jsonld', buildHomeSchema());
  initConsentManager();
  initAnalytics();
  initDesignSystemInteractions();
  rerenderHomepageDynamicParts();
});
