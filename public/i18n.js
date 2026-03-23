/**
 * MC NovaTools - Internationalization (i18n) System
 * Multi-language support for all pages
 */

(function() {
  'use strict';

  // Supported languages
  const SUPPORTED_LANGUAGES = ['en', 'tr', 'de', 'fr', 'es', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'it', 'pl', 'nl'];
  
  // Default language
  const DEFAULT_LANGUAGE = 'en';
  
  // Current language
  let currentLanguage = DEFAULT_LANGUAGE;
  
  // Translations cache
  let translations = {};
  
  // Initialization state
  let isInitialized = false;
  
  // Language names for display
  const LANGUAGE_NAMES = {
    en: 'English',
    tr: 'Türkçe',
    de: 'Deutsch',
    fr: 'Français',
    es: 'Español',
    pt: 'Português',
    ru: 'Русский',
    zh: '中文',
    ja: '日本語',
    ko: '한국어',
    ar: 'العربية',
    hi: 'हिंदी',
    it: 'Italiano',
    pl: 'Polski',
    nl: 'Nederlands'
  };

  // Language flags
  const LANGUAGE_FLAGS = {
    en: '🇬🇧',
    tr: '🇹🇷',
    de: '🇩🇪',
    fr: '🇫🇷',
    es: '🇪🇸',
    pt: '🇵🇹',
    ru: '🇷🇺',
    zh: '🇨🇳',
    ja: '🇯🇵',
    ko: '🇰🇷',
    ar: '🇸🇦',
    hi: '🇮🇳',
    it: '🇮🇹',
    pl: '🇵🇱',
    nl: '🇳🇱'
  };

  /**
   * Get saved language from localStorage or detect browser language
   */
  function getInitialLanguage() {
    try {
      const saved = localStorage.getItem('mc-novatools-language');
      if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.warn('localStorage not available');
    }
    
    // Detect browser language
    const browserLang = navigator.language || navigator.userLanguage;
    const langCode = browserLang.split('-')[0];
    
    if (SUPPORTED_LANGUAGES.includes(langCode)) {
      return langCode;
    }
    
    return DEFAULT_LANGUAGE;
  }

  /**
   * Load translations for a language
   */
  async function loadTranslations(lang) {
    if (translations[lang]) {
      return translations[lang];
    }
    
    try {
      const response = await fetch(`/locales/${lang}/translation.json`);
      if (!response.ok) {
        throw new Error(`Failed to load translations for ${lang}`);
      }
      const data = await response.json();
      translations[lang] = flattenTranslations(data);
      return translations[lang];
    } catch (error) {
      console.error('Error loading translations:', error);
      // Return empty object, will fall back to default text
      return {};
    }
  }

  /**
   * Flatten nested translation objects
   */
  function flattenTranslations(obj, prefix = '') {
    let result = {};
    
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        const nested = flattenTranslations(obj[key], prefix + key + '.');
        Object.assign(result, nested);
      } else {
        result[prefix + key] = obj[key];
      }
    }
    
    return result;
  }

  /**
   * Get translation for a key
   */
  function t(key, fallback = null) {
    const translation = translations[currentLanguage];
    if (translation && translation[key]) {
      return translation[key];
    }
    return fallback !== null ? fallback : key;
  }

  /**
   * Update all elements with data-i18n attribute
   */
  function updatePageTranslations() {
    // Update elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const translation = t(key);
      if (translation !== key) {
        el.textContent = translation;
      }
    });
    
    // Update elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const translation = t(key);
      if (translation !== key) {
        el.placeholder = translation;
      }
    });
    
    // Update elements with data-i18n-title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const translation = t(key);
      if (translation !== key) {
        el.title = translation;
      }
    });
    
    // Update elements with data-i18n-html attribute
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      const translation = t(key);
      if (translation !== key) {
        el.innerHTML = translation;
      }
    });
  }

  /**
   * Change language
   */
  async function changeLanguage(lang) {
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
      console.error('Unsupported language:', lang);
      return;
    }
    
    if (lang === currentLanguage) {
      return; // No change needed
    }
    
    currentLanguage = lang;
    
    // Save to localStorage
    try {
      localStorage.setItem('mc-novatools-language', lang);
    } catch (e) {
      console.warn('Could not save language preference');
    }
    
    // Update HTML attributes
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    
    // Update language selector without triggering event
    const selector = document.getElementById('language-selector');
    if (selector) {
      selector.value = lang;
    }
    
    // Load translations and update page
    await loadTranslations(lang);
    updatePageTranslations();
    
    // Dispatch event for other scripts
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    
    // Language changed successfully
  }

  /**
   * Create language selector dropdown
   */
  function createLanguageSelector() {
    const container = document.createElement('div');
    container.className = 'language-selector-wrapper';
    
    const select = document.createElement('select');
    select.id = 'language-selector';
    select.className = 'language-selector';
    select.setAttribute('aria-label', 'Select Language');
    
    SUPPORTED_LANGUAGES.forEach(lang => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = `${LANGUAGE_FLAGS[lang]} ${LANGUAGE_NAMES[lang]}`;
      select.appendChild(option);
    });
    
    // Use 'change' event for select element
    select.addEventListener('change', (e) => {
      e.preventDefault();
      e.stopPropagation();
      changeLanguage(e.target.value);
    });
    
    container.appendChild(select);
    return container;
  }

  /**
   * Inject language selector into header
   */
  function injectLanguageSelector() {
    // Check if already exists
    if (document.getElementById('language-selector')) {
      return;
    }
    
    // Try to find header actions or similar container
    const headerActions = document.querySelector('.header-actions');
    const headerInner = document.querySelector('.header-inner');
    const nav = document.querySelector('.main-nav, .nav-desktop, nav');
    const header = document.querySelector('header, .main-header, .app-header');
    
    const selector = createLanguageSelector();
    
    if (headerActions) {
      headerActions.insertBefore(selector, headerActions.firstChild);
    } else if (headerInner) {
      // Tool pages have .header-inner - insert before mobile menu button
      const mobileBtn = headerInner.querySelector('#mobileMenuBtn, .menu-btn');
      if (mobileBtn) {
        headerInner.insertBefore(selector, mobileBtn);
      } else {
        headerInner.appendChild(selector);
      }
    } else if (nav) {
      nav.parentNode.insertBefore(selector, nav.nextSibling);
    } else if (header) {
      header.appendChild(selector);
    } else {
      // Add to body as floating element
      const floating = document.createElement('div');
      floating.className = 'language-selector-floating';
      floating.appendChild(selector);
      document.body.appendChild(floating);
    }
  }

  /**
   * Setup existing language selector
   */
  function setupExistingSelector() {
    const selector = document.getElementById('language-selector');
    if (!selector) return false;
    
    // Set current value
    selector.value = currentLanguage;
    
    // Remove old listeners by cloning
    const newSelector = selector.cloneNode(true);
    selector.parentNode.replaceChild(newSelector, selector);
    
    // Add change listener
    newSelector.addEventListener('change', (e) => {
      e.preventDefault();
      changeLanguage(e.target.value);
    });
    
    return true;
  }

  /**
   * Initialize i18n system
   */
  async function init() {
    if (isInitialized) {
      return;
    }
    
    // Set initial language
    currentLanguage = getInitialLanguage();
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';
    
    // Load translations
    await loadTranslations(currentLanguage);
    
    // Setup language selector
    if (!setupExistingSelector()) {
      injectLanguageSelector();
    }
    
    // Update selector value
    const selector = document.getElementById('language-selector');
    if (selector) {
      selector.value = currentLanguage;
    }
    
    // Apply translations
    updatePageTranslations();

    isInitialized = true;
    // i18n initialized — notify dynamic renderers so they re-render with translations
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: currentLanguage } }));
  }

  // Expose global functions
  window.i18n = {
    changeLanguage,
    t,
    getCurrentLanguage: () => currentLanguage,
    getSupportedLanguages: () => SUPPORTED_LANGUAGES,
    SUPPORTED_LANGUAGES,
    LANGUAGE_NAMES,
    LANGUAGE_FLAGS,
    refresh: updatePageTranslations
  };

  // Global changeLanguage function for onclick handlers
  window.changeLanguage = changeLanguage;

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Add default styles
  const styles = document.createElement('style');
  styles.textContent = `
    .language-selector-wrapper {
      display: inline-block;
    }
    
    .language-selector {
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.2);
      border-radius: 6px;
      color: #fff;
      padding: 6px 10px;
      font-size: 13px;
      cursor: pointer;
      outline: none;
      appearance: auto;
    }
    
    .language-selector:hover {
      background: rgba(255,255,255,0.15);
      border-color: rgba(255,255,255,0.3);
    }
    
    .language-selector option {
      background: #1a1a2e;
      color: #fff;
      padding: 8px;
    }
    
    .language-selector-floating {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
    }
    
    /* RTL Support */
    [dir="rtl"] .language-selector-floating {
      right: auto;
      left: 20px;
    }
    
    /* Mobile adjustments */
    @media (max-width: 768px) {
      .language-selector {
        font-size: 12px;
        padding: 4px 8px;
      }
    }
  `;
  document.head.appendChild(styles);

})();
