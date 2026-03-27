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

  function getTranslationUrl(lang) {
    return '/locales/' + lang + '/translation.json';
  }

  /**
   * Load translations for a language
   */
  async function loadTranslations(lang) {
    if (translations[lang]) {
      console.warn('[i18n] Using cached translations for:', lang);
      return translations[lang];
    }

    try {
      var response = await fetch(getTranslationUrl(lang), {
        cache: 'no-cache',
        credentials: 'same-origin'
      });
      if (!response.ok) {
        throw new Error('HTTP ' + response.status + ' for ' + getTranslationUrl(lang));
      }
      var data = await response.json();
      translations[lang] = flattenTranslations(data);
      console.warn('[i18n] Translations loaded for "' + lang + '"');
      return translations[lang];
    } catch (error) {
      console.warn('[i18n] Translation load failed for "' + lang + '":', error.message);
    }

    console.error('[i18n] Translation fetch failed for language:', lang);
    translations[lang] = {};
    return translations[lang];
  }

  /**
   * Flatten nested translation objects
   */
  function flattenTranslations(obj, prefix) {
    prefix = prefix || '';
    var result = {};

    for (var key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        var nested = flattenTranslations(obj[key], prefix + key + '.');
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
  function t(key, fallback) {
    fallback = arguments.length > 1 ? fallback : null;
    var translation = translations[currentLanguage];
    if (translation && Object.prototype.hasOwnProperty.call(translation, key)) {
      return translation[key];
    }
    return fallback !== null ? fallback : key;
  }

  function storeOriginalContent(el, attrName, value) {
    var storageKey = 'data-i18n-original-' + attrName;
    if (!el.hasAttribute(storageKey)) {
      el.setAttribute(storageKey, value || '');
    }
    return el.getAttribute(storageKey) || '';
  }

  /**
   * Translate a single element based on its data-i18n attributes
   */
  function translateElement(el) {
    var translated = false;

    if (el.hasAttribute('data-i18n')) {
      var key = el.getAttribute('data-i18n');
      var originalText = storeOriginalContent(el, 'text', el.textContent);
      var val = t(key, originalText);
      if (typeof val === 'string') {
        el.textContent = val;
        translated = true;
      }
    }

    if (el.hasAttribute('data-i18n-placeholder')) {
      var pKey = el.getAttribute('data-i18n-placeholder');
      var originalPlaceholder = storeOriginalContent(el, 'placeholder', el.getAttribute('placeholder') || '');
      var pVal = t(pKey, originalPlaceholder);
      if (typeof pVal === 'string') {
        el.placeholder = pVal;
        translated = true;
      }
    }

    if (el.hasAttribute('data-i18n-title')) {
      var tKey = el.getAttribute('data-i18n-title');
      var originalTitle = storeOriginalContent(el, 'title', el.getAttribute('title') || '');
      var tVal = t(tKey, originalTitle);
      if (typeof tVal === 'string') {
        el.title = tVal;
        translated = true;
      }
    }

    if (el.hasAttribute('data-i18n-html')) {
      var hKey = el.getAttribute('data-i18n-html');
      var originalHtml = storeOriginalContent(el, 'html', el.innerHTML);
      var hVal = t(hKey, originalHtml);
      if (typeof hVal === 'string') {
        el.innerHTML = hVal;
        translated = true;
      }
    }

    return translated;
  }

  /**
   * Translate a set of elements within a root (used by both full-page update and MutationObserver)
   */
  function translateElements(root) {
    var totalFound = 0;
    var totalTranslated = 0;

    // Update elements with data-i18n attribute
    root.querySelectorAll('[data-i18n]').forEach(function(el) {
      totalFound++;
      var key = el.getAttribute('data-i18n');
      var originalText = storeOriginalContent(el, 'text', el.textContent);
      var val = t(key, originalText);
      if (typeof val === 'string') {
        el.textContent = val;
        totalTranslated++;
      }
    });

    // Update elements with data-i18n-placeholder attribute
    root.querySelectorAll('[data-i18n-placeholder]').forEach(function(el) {
      totalFound++;
      var key = el.getAttribute('data-i18n-placeholder');
      var originalPlaceholder = storeOriginalContent(el, 'placeholder', el.getAttribute('placeholder') || '');
      var val = t(key, originalPlaceholder);
      if (typeof val === 'string') {
        el.placeholder = val;
        totalTranslated++;
      }
    });

    // Update elements with data-i18n-title attribute
    root.querySelectorAll('[data-i18n-title]').forEach(function(el) {
      totalFound++;
      var key = el.getAttribute('data-i18n-title');
      var originalTitle = storeOriginalContent(el, 'title', el.getAttribute('title') || '');
      var val = t(key, originalTitle);
      if (typeof val === 'string') {
        el.title = val;
        totalTranslated++;
      }
    });

    // Update elements with data-i18n-html attribute
    root.querySelectorAll('[data-i18n-html]').forEach(function(el) {
      totalFound++;
      var key = el.getAttribute('data-i18n-html');
      var originalHtml = storeOriginalContent(el, 'html', el.innerHTML);
      var val = t(key, originalHtml);
      if (typeof val === 'string') {
        el.innerHTML = val;
        totalTranslated++;
      }
    });

    return { totalFound: totalFound, totalTranslated: totalTranslated };
  }

  /**
   * Update all elements with data-i18n attribute
   */
  function updatePageTranslations() {
    var result = translateElements(document);

    console.warn('[i18n] Page translations updated: ' + result.totalTranslated + '/' + result.totalFound + ' elements translated for "' + currentLanguage + '"');

    if (result.totalFound > 0 && result.totalTranslated === 0) {
      console.warn('[i18n] WARNING: Found ' + result.totalFound + ' data-i18n elements but 0 translations applied. Translations may not be loaded for "' + currentLanguage + '".');
    }
  }

  /**
   * Change language
   * @param {string} lang - Language code
   * @param {boolean} force - Force re-apply even if same language (default: false)
   */
  async function changeLanguage(lang, force) {
    force = force === true;

    if (!SUPPORTED_LANGUAGES.includes(lang)) {
      console.error('Unsupported language:', lang);
      return;
    }

    if (!force && lang === currentLanguage) {
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
    var selector = document.getElementById('language-selector');
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
    var container = document.createElement('div');
    container.className = 'language-selector-wrapper';

    var select = document.createElement('select');
    select.id = 'language-selector';
    select.className = 'language-selector';
    select.setAttribute('aria-label', 'Select Language');

    SUPPORTED_LANGUAGES.forEach(function(lang) {
      var option = document.createElement('option');
      option.value = lang;
      option.textContent = LANGUAGE_FLAGS[lang] + ' ' + LANGUAGE_NAMES[lang];
      select.appendChild(option);
    });

    // Use 'change' event for select element
    select.addEventListener('change', function(e) {
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
    var headerActions = document.querySelector('.header-actions');
    var headerInner = document.querySelector('.header-inner');
    var nav = document.querySelector('.main-nav, .nav-desktop, nav');
    var header = document.querySelector('header, .main-header, .app-header');

    var selector = createLanguageSelector();

    if (headerActions) {
      headerActions.insertBefore(selector, headerActions.firstChild);
    } else if (headerInner) {
      // Tool pages have .header-inner - insert before mobile menu button
      var mobileBtn = headerInner.querySelector('#mobileMenuBtn, .menu-btn');
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
      var floating = document.createElement('div');
      floating.className = 'language-selector-floating';
      floating.appendChild(selector);
      document.body.appendChild(floating);
    }
  }

  /**
   * Setup existing language selector
   */
  function setupExistingSelector() {
    var selector = document.getElementById('language-selector');
    if (!selector) return false;

    // Set current value
    selector.value = currentLanguage;

    // Remove old listeners by cloning
    var newSelector = selector.cloneNode(true);
    selector.parentNode.replaceChild(newSelector, selector);

    // Add change listener
    newSelector.addEventListener('change', function(e) {
      e.preventDefault();
      changeLanguage(e.target.value);
    });

    return true;
  }

  /**
   * Setup MutationObserver to auto-translate dynamically added DOM elements
   */
  function setupMutationObserver() {
    var observer = new MutationObserver(function(mutations) {
      for (var m = 0; m < mutations.length; m++) {
        var mutation = mutations[m];
        if (mutation.type !== 'childList' || mutation.addedNodes.length === 0) {
          continue;
        }
        for (var n = 0; n < mutation.addedNodes.length; n++) {
          var node = mutation.addedNodes[n];
          if (node.nodeType !== Node.ELEMENT_NODE) continue;

          // Translate the node itself if it has i18n attributes
          if (node.hasAttribute) {
            translateElement(node);
          }

          // Translate any children with i18n attributes
          if (node.querySelector) {
            var children = node.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-title], [data-i18n-html]');
            for (var c = 0; c < children.length; c++) {
              translateElement(children[c]);
            }
          }
        }
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    console.warn('[i18n] MutationObserver active for dynamic element translation');
    return observer;
  }

  /**
   * Initialize i18n system
   */
  async function init() {
    if (isInitialized) {
      console.warn('[i18n] Already initialized, skipping. Use window.i18n.init() or changeLanguage(lang, true) to force re-apply.');
      return;
    }

    // Set initial language
    currentLanguage = getInitialLanguage();
    console.warn('[i18n] Init started. Detected language: "' + currentLanguage + '"');

    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';

    // Load translations
    await loadTranslations(currentLanguage);

    // Setup language selector
    if (!setupExistingSelector()) {
      injectLanguageSelector();
    }

    // Update selector value
    var selector = document.getElementById('language-selector');
    if (selector) {
      selector.value = currentLanguage;
    }

    // Apply translations
    updatePageTranslations();

    // Setup MutationObserver for dynamic elements
    if (document.body) {
      setupMutationObserver();
    } else {
      // Body not ready yet, wait for load
      window.addEventListener('load', function() {
        setupMutationObserver();
      });
    }

    isInitialized = true;
    console.warn('[i18n] Init complete for language: "' + currentLanguage + '"');

    // i18n initialized — notify dynamic renderers so they re-render with translations
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: currentLanguage } }));
  }

  // Expose global functions
  window.i18n = {
    changeLanguage: changeLanguage,
    t: t,
    getCurrentLanguage: function() { return currentLanguage; },
    getSupportedLanguages: function() { return SUPPORTED_LANGUAGES; },
    SUPPORTED_LANGUAGES: SUPPORTED_LANGUAGES,
    LANGUAGE_NAMES: LANGUAGE_NAMES,
    LANGUAGE_FLAGS: LANGUAGE_FLAGS,
    refresh: updatePageTranslations,
    init: function() {
      // Allow re-initialization by resetting the flag
      isInitialized = false;
      return init();
    },
    loadTranslations: loadTranslations
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
  var styles = document.createElement('style');
  styles.textContent = '\
    .language-selector-wrapper {\
      display: inline-block;\
    }\
    \
    .language-selector {\
      background: rgba(255,255,255,0.1);\
      border: 1px solid rgba(255,255,255,0.2);\
      border-radius: 6px;\
      color: #fff;\
      padding: 6px 10px;\
      font-size: 13px;\
      cursor: pointer;\
      outline: none;\
      appearance: auto;\
    }\
    \
    .language-selector:hover {\
      background: rgba(255,255,255,0.15);\
      border-color: rgba(255,255,255,0.3);\
    }\
    \
    .language-selector option {\
      background: #1a1a2e;\
      color: #fff;\
      padding: 8px;\
    }\
    \
    .language-selector-floating {\
      position: fixed;\
      top: 20px;\
      right: 20px;\
      z-index: 9999;\
    }\
    \
    /* RTL Support */\
    [dir="rtl"] .language-selector-floating {\
      right: auto;\
      left: 20px;\
    }\
    \
    /* Mobile adjustments */\
    @media (max-width: 768px) {\
      .language-selector {\
        font-size: 12px;\
        padding: 4px 8px;\
      }\
    }\
  ';
  document.head.appendChild(styles);

})();
