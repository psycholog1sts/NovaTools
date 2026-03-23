/**
 * MC NovaTools - Main Application Script
 * Homepage rendering and interactions
 */

import categories from './data/categories.js';

// ============================================
// I18N HELPERS
// ============================================
function t(key, fallback) {
  if (window.i18n && typeof window.i18n.t === 'function') {
    return window.i18n.t(key, fallback);
  }
  return fallback;
}

function getCurrentLanguage() {
  if (window.i18n && typeof window.i18n.getCurrentLanguage === 'function') {
    return window.i18n.getCurrentLanguage();
  }
  return document.documentElement.lang || 'en';
}

function getCategoryLabel(categoryName) {
  const map = {
    'PDF Tools': t('nav.pdf', 'PDF Tools'),
    'Image Tools': t('nav.image', 'Image Tools'),
    'Finance Tools': t('nav.finance', 'Finance Tools'),
    'Developer Tools': t('nav.developer', 'Developer Tools'),
    'Text & Writing': t('nav.text', 'Text & Writing'),
    'Converters': t('nav.converters', 'Converters'),
    'Security Tools': t('nav.security', 'Security Tools'),
    'Productivity': t('home.productivity', 'Productivity'),
    'Data Tools': t('home.dataTools', 'Data Tools'),
    'Design Tools': t('home.designTools', 'Design Tools'),
    'Calculators': t('home.calculators', 'Calculators'),
    'Social Media': t('home.socialMedia', 'Social Media')
  };

  return map[categoryName] || categoryName;
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

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.getElementById('searchModal')?.classList.remove('active');
  }
});

// ============================================
// HOMEPAGE STATS
// ============================================
function updateHomepageStats() {
  const categoryStatLabel = document.querySelector('.stat-label[data-i18n="hero.categories"]');
  if (categoryStatLabel) {
    const stat = categoryStatLabel.closest('.stat');
    const value = stat?.querySelector('.stat-value');
    if (value) {
      value.textContent = String(categories.length);
    }
  }
}

// ============================================
// RENDER CATEGORIES
// ============================================
function renderCategories() {
  const container = document.getElementById('categoriesGrid');
  if (!container) return;

  container.innerHTML = categories.map(cat => `
    <a href="/categories/${cat.slug}" class="category-card">
      <div class="category-icon" style="background: linear-gradient(135deg, ${cat.color}20, ${cat.color}10); color: ${cat.color}">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${getIconPath(cat.icon)}
        </svg>
      </div>
      <h3 class="category-name">${getCategoryLabel(cat.name)}</h3>
      <p class="category-description">${cat.shortDescription}</p>
      <div class="category-meta">
        <span class="category-count">${t('home.toolsGeneric', 'Tools')}</span>
        <span>→</span>
      </div>
    </a>
  `).join('');
}

// ============================================
// POPULAR TOOLS DATA
// ============================================
function getPopularTools() {
  return [
    {
      slug: 'pdf/merge',
      nameKey: 'home.popularCards.pdfMerge.name',
      name: 'PDF Merge',
      descriptionKey: 'home.popularCards.pdfMerge.description',
      description: 'Combine multiple PDF files into one document quickly and easily.',
      category: 'PDF Tools',
      icon: 'file-text',
      popular: true
    },
    {
      slug: 'image/compress',
      nameKey: 'home.popularCards.imageCompress.name',
      name: 'Image Compressor',
      descriptionKey: 'home.popularCards.imageCompress.description',
      description: 'Reduce image file size without losing quality. WebP, PNG, JPG support.',
      category: 'Image Tools',
      icon: 'image',
      popular: true
    },
    {
      slug: 'finance/mortgage-refinance',
      nameKey: 'home.popularCards.mortgage.name',
      name: 'Mortgage Calculator',
      descriptionKey: 'home.popularCards.mortgage.description',
      description: 'Calculate mortgage payments, compare rates and estimate savings.',
      category: 'Finance Tools',
      icon: 'trending-up',
      popular: true
    },
    {
      slug: 'dev/json-formatter',
      nameKey: 'home.popularCards.json.name',
      name: 'JSON Formatter',
      descriptionKey: 'home.popularCards.json.description',
      description: 'Format, validate and beautify JSON data with syntax highlighting.',
      category: 'Developer Tools',
      icon: 'code',
      popular: true
    },
    {
      slug: 'text/word-counter',
      nameKey: 'home.popularCards.wordCounter.name',
      name: 'Word Counter',
      descriptionKey: 'home.popularCards.wordCounter.description',
      description: 'Count words, characters, sentences and paragraphs in your text.',
      category: 'Text & Writing',
      icon: 'type',
      popular: false
    },
    {
      slug: 'converters/unit-converter',
      nameKey: 'home.popularCards.unitConverter.name',
      name: 'Unit Converter',
      descriptionKey: 'home.popularCards.unitConverter.description',
      description: 'Convert between different units of measurement easily.',
      category: 'Converters',
      icon: 'repeat',
      popular: false
    },
    {
      slug: 'security/password-generator',
      nameKey: 'home.popularCards.password.name',
      name: 'Password Generator',
      descriptionKey: 'home.popularCards.password.description',
      description: 'Generate strong, secure passwords with customizable options.',
      category: 'Security Tools',
      icon: 'shield',
      popular: false
    },
    {
      slug: 'pdf/compress',
      nameKey: 'home.popularCards.pdfCompress.name',
      name: 'PDF Compressor',
      descriptionKey: 'home.popularCards.pdfCompress.description',
      description: 'Reduce PDF file size while maintaining document quality.',
      category: 'PDF Tools',
      icon: 'file-text',
      popular: false
    }
  ];
}

// ============================================
// RENDER POPULAR TOOLS
// ============================================
function renderPopularTools() {
  const container = document.getElementById('popularTools');
  if (!container) return;

  const popularTools = getPopularTools();

  container.innerHTML = popularTools.map(tool => `
    <div class="tool-card">
      <div class="tool-header">
        <div class="tool-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${getIconPath(tool.icon)}
          </svg>
        </div>
        <div class="tool-badges">
          ${tool.popular ? `<span class="tool-badge tool-badge-popular">${t('tools.popular', 'Popular')}</span>` : ''}
        </div>
      </div>
      <h3 class="tool-name">${t(tool.nameKey, tool.name)}</h3>
      <p class="tool-description">${t(tool.descriptionKey, tool.description)}</p>
      <div class="tool-footer">
        <span class="tool-category">${getCategoryLabel(tool.category)}</span>
        <a href="/tools/${tool.slug}" class="tool-link">
          ${t('home.openTool', 'Open Tool')}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </div>
    </div>
  `).join('');
}

// ============================================
// NEW TOOLS DATA
// ============================================
function getNewTools() {
  return [
    {
      slug: 'image/background-remover',
      nameKey: 'home.newCards.backgroundRemover.name',
      name: 'Background Remover',
      descriptionKey: 'home.newCards.backgroundRemover.description',
      description: 'Remove backgrounds from images automatically using AI.',
      category: 'Image Tools',
      icon: 'image',
      new: true
    },
    {
      slug: 'finance/crypto-tax',
      nameKey: 'home.newCards.cryptoTax.name',
      name: 'Crypto Tax Calculator',
      descriptionKey: 'home.newCards.cryptoTax.description',
      description: 'Calculate your cryptocurrency gains and tax obligations.',
      category: 'Finance Tools',
      icon: 'trending-up',
      new: true
    },
    {
      slug: 'text/text-diff',
      nameKey: 'home.newCards.textDiff.name',
      name: 'Text Diff Checker',
      descriptionKey: 'home.newCards.textDiff.description',
      description: 'Compare two texts and see the differences highlighted.',
      category: 'Text & Writing',
      icon: 'type',
      new: true
    },
    {
      slug: 'dev/regex-tester',
      nameKey: 'home.newCards.regex.name',
      name: 'Regex Tester',
      descriptionKey: 'home.newCards.regex.description',
      description: 'Test and debug regular expressions with real-time matching.',
      category: 'Developer Tools',
      icon: 'code',
      new: true
    }
  ];
}

// ============================================
// RENDER NEW TOOLS
// ============================================
function renderNewTools() {
  const container = document.getElementById('newTools');
  if (!container) return;

  const newTools = getNewTools();

  container.innerHTML = newTools.map(tool => `
    <div class="tool-card">
      <div class="tool-header">
        <div class="tool-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            ${getIconPath(tool.icon)}
          </svg>
        </div>
        <div class="tool-badges">
          ${tool.new ? `<span class="tool-badge tool-badge-new">${t('home.newBadge', 'New')}</span>` : ''}
        </div>
      </div>
      <h3 class="tool-name">${t(tool.nameKey, tool.name)}</h3>
      <p class="tool-description">${t(tool.descriptionKey, tool.description)}</p>
      <div class="tool-footer">
        <span class="tool-category">${getCategoryLabel(tool.category)}</span>
        <a href="/tools/${tool.slug}" class="tool-link">
          ${t('home.openTool', 'Open Tool')}
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </div>
    </div>
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

  const allTools = [
    { name: t('home.popularCards.pdfMerge.name', 'PDF Merge'), slug: 'pdf/merge', category: getCategoryLabel('PDF Tools') },
    { name: 'PDF Split', slug: 'pdf/split', category: getCategoryLabel('PDF Tools') },
    { name: t('home.popularCards.pdfCompress.name', 'PDF Compressor'), slug: 'pdf/compress', category: getCategoryLabel('PDF Tools') },
    { name: t('home.popularCards.imageCompress.name', 'Image Compressor'), slug: 'image/compress', category: getCategoryLabel('Image Tools') },
    { name: 'Image Converter', slug: 'image/convert', category: getCategoryLabel('Image Tools') },
    { name: t('home.popularCards.mortgage.name', 'Mortgage Calculator'), slug: 'finance/mortgage-refinance', category: getCategoryLabel('Finance Tools') },
    { name: 'Tax Estimator', slug: 'finance/tax', category: getCategoryLabel('Finance Tools') },
    { name: t('home.popularCards.json.name', 'JSON Formatter'), slug: 'dev/json-formatter', category: getCategoryLabel('Developer Tools') },
    { name: t('home.newCards.regex.name', 'Regex Tester'), slug: 'dev/regex-tester', category: getCategoryLabel('Developer Tools') },
    { name: t('home.popularCards.wordCounter.name', 'Word Counter'), slug: 'text/word-counter', category: getCategoryLabel('Text & Writing') }
  ];

  searchInput.oninput = (e) => {
    const query = e.target.value.toLowerCase();

    if (query.length < 2) {
      searchResults.innerHTML = '';
      return;
    }

    const results = allTools.filter(tool =>
      tool.name.toLowerCase().includes(query) ||
      tool.category.toLowerCase().includes(query)
    ).slice(0, 5);

    searchResults.innerHTML = results.map(tool => `
      <a href="/tools/${tool.slug}" class="search-result-item">
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
  renderCategories();
  renderPopularTools();
  renderNewTools();
  initSearch();
  updateHomepageStats();
}

window.addEventListener('languageChanged', () => {
  rerenderHomepageDynamicParts();
});

// ============================================
// INITIALIZE
// ============================================
document.addEventListener('DOMContentLoaded', () => {
  rerenderHomepageDynamicParts();
});