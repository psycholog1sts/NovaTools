/**
 * MC NovaTools - Internationalization (i18n) System
 * Multi-language support for all pages
 */

(function () {
  'use strict';

  const SUPPORTED_LANGUAGES = ['en', 'tr', 'de', 'fr', 'es', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'it', 'pl', 'nl'];
  const DEFAULT_LANGUAGE = 'en';

  let currentLanguage = DEFAULT_LANGUAGE;
  const translations = {};
  let isInitialized = false;

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

  function getInitialLanguage() {
    try {
      const saved = localStorage.getItem('mc-novatools-language');
      if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
        return saved;
      }
    } catch (e) {
      console.warn('localStorage not available');
    }

    const browserLang = navigator.language || navigator.userLanguage || DEFAULT_LANGUAGE;
    const langCode = String(browserLang).split('-')[0].toLowerCase();

    if (SUPPORTED_LANGUAGES.includes(langCode)) {
      return langCode;
    }

    return DEFAULT_LANGUAGE;
  }

  function getTranslationUrl(lang) {
    return `/locales/${lang}/translation.json`;
  }

  async function loadTranslations(lang) {
    if (translations[lang]) {
      return translations[lang];
    }

    try {
      const response = await fetch(getTranslationUrl(lang), {
        cache: 'no-cache',
        credentials: 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`Failed to load translations for ${lang}`);
      }

      const data = await response.json();
      translations[lang] = flattenTranslations(data);
      return translations[lang];
    } catch (error) {
      console.error('Error loading translations:', error);
      translations[lang] = {};
      return translations[lang];
    }
  }

  function flattenTranslations(obj, prefix = '') {
    const result = {};

    for (const key in obj) {
      if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

      if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
        Object.assign(result, flattenTranslations(obj[key], `${prefix}${key}.`));
      } else {
        result[`${prefix}${key}`] = obj[key];
      }
    }

    return result;
  }

  function t(key, fallback = null) {
    const translation = translations[currentLanguage];
    if (translation && Object.prototype.hasOwnProperty.call(translation, key)) {
      return translation[key];
    }
    return fallback !== null ? fallback : key;
  }

  function storeOriginalContent(el, attrName, value) {
    const storageKey = `data-i18n-original-${attrName}`;
    if (!el.hasAttribute(storageKey)) {
      el.setAttribute(storageKey, value ?? '');
    }
    return el.getAttribute(storageKey) || '';
  }

  function updatePageTranslations() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const original = storeOriginalContent(el, 'text', el.textContent);
      const translation = t(key, original);

      if (typeof translation === 'string') {
        el.textContent = translation;
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const original = storeOriginalContent(el, 'placeholder', el.getAttribute('placeholder') || '');
      const translation = t(key, original);

      if (typeof translation === 'string') {
        el.setAttribute('placeholder', translation);
      }
    });

    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const original = storeOriginalContent(el, 'title', el.getAttribute('title') || '');
      const translation = t(key, original);

      if (typeof translation === 'string') {
        el.setAttribute('title', translation);
      }
    });

    document.querySelectorAll('[data-i18n-html]').forEach((el) => {
      const key = el.getAttribute('data-i18n-html');
      const original = storeOriginalContent(el, 'html', el.innerHTML);
      const translation = t(key, original);

      if (typeof translation === 'string') {
        el.innerHTML = translation;
      }
    });

    const docTitleEl = document.querySelector('[data-i18n-document-title]');
    if (docTitleEl) {
      const key = docTitleEl.getAttribute('data-i18n-document-title');
      const original = document.title;
      document.title = t(key, original);
    }
  }

  async function changeLanguage(lang) {
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
      console.error('Unsupported language:', lang);
      return;
    }

    currentLanguage = lang;

    try {
      localStorage.setItem('mc-novatools-language', lang);
    } catch (e) {
      console.warn('Could not save language preference');
    }

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

    const selector = document.getElementById('language-selector');
    if (selector && selector.value !== lang) {
      selector.value = lang;
    }

    await loadTranslations(lang);
    updatePageTranslations();

    window.dispatchEvent(
      new CustomEvent('languageChanged', {
        detail: { language: lang }
      })
    );
  }

  function createLanguageSelector() {
    const container = document.createElement('div');
    container.className = 'language-selector-wrapper';

    const select = document.createElement('select');
    select.id = 'language-selector';
    select.className = 'language-selector';
    select.setAttribute('aria-label', 'Select Language');

    SUPPORTED_LANGUAGES.forEach((lang) => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = `${LANGUAGE_FLAGS[lang]} ${LANGUAGE_NAMES[lang]}`;
      select.appendChild(option);
    });

    select.addEventListener('change', (e) => {
      e.preventDefault();
      e.stopPropagation();
      changeLanguage(e.target.value);
    });

    container.appendChild(select);
    return container;
  }

  function injectLanguageSelector() {
    if (document.getElementById('language-selector')) {
      return;
    }

    const headerActions = document.querySelector('.header-actions');
    const headerInner = document.querySelector('.header-inner');
    const nav = document.querySelector('.main-nav, .nav-desktop, nav');
    const header = document.querySelector('header, .main-header, .app-header');

    const selector = createLanguageSelector();

    if (headerActions) {
      headerActions.insertBefore(selector, headerActions.firstChild);
    } else if (headerInner) {
      const mobileBtn = headerInner.querySelector('#mobileMenuBtn, .menu-btn, .mobile-menu-toggle');
      if (mobileBtn) {
        headerInner.insertBefore(selector, mobileBtn);
      } else {
        headerInner.appendChild(selector);
      }
    } else if (nav && nav.parentNode) {
      nav.parentNode.insertBefore(selector, nav.nextSibling);
    } else if (header) {
      header.appendChild(selector);
    } else {
      const floating = document.createElement('div');
      floating.className = 'language-selector-floating';
      floating.appendChild(selector);
      document.body.appendChild(floating);
    }
  }

  function setupExistingSelector() {
    const selector = document.getElementById('language-selector');
    if (!selector) return false;

    const newSelector = selector.cloneNode(true);
    selector.parentNode.replaceChild(newSelector, selector);

    newSelector.value = currentLanguage;
    newSelector.addEventListener('change', (e) => {
      e.preventDefault();
      e.stopPropagation();
      changeLanguage(e.target.value);
    });

    return true;
  }

  async function init() {
    if (isInitialized) {
      return;
    }

    currentLanguage = getInitialLanguage();
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = currentLanguage === 'ar' ? 'rtl' : 'ltr';

    await loadTranslations(currentLanguage);

    if (!setupExistingSelector()) {
      injectLanguageSelector();
    }

    const selector = document.getElementById('language-selector');
    if (selector) {
      selector.value = currentLanguage;
    }

    updatePageTranslations();
    isInitialized = true;
  }


  function isProductionHost() {
    return /(^|\.)mc-novatools\.com$/i.test(window.location.hostname);
  }

  function hasValidAdSlot() {
    return Array.from(document.querySelectorAll('ins.adsbygoogle')).some((el) => {
      const slot = el.getAttribute('data-ad-slot') || '';
      return /^\d{8,20}$/.test(slot.trim());
    });
  }

  function ensureAdSenseBootstrap() {
    if (window.__mcAdSenseLoaded) return;
    if (!document.head || !isProductionHost() || !hasValidAdSlot()) return;
    if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
    if (document.querySelector('script[data-adsense-bootstrap="true"], script[data-adsense="true"]')) {
      window.__mcAdSenseLoaded = true;
      return;
    }

    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5738022526587953';
    script.setAttribute('data-adsense-bootstrap', 'true');
    document.head.appendChild(script);
    window.__mcAdSenseLoaded = true;
  }

  function initQualityEnhancements() {
    document.querySelectorAll('ins.adsbygoogle').forEach((el) => {
      el.classList.add('ad-slot-reserved');
      if (!/^\d{8,20}$/.test((el.getAttribute('data-ad-slot') || '').trim())) {
        el.setAttribute('data-ad-status', 'pending-valid-slot');
      }
    });

    if (!/\/tools\//.test(window.location.pathname)) return;

    const main = document.querySelector('main, .main-content, .tool-wrapper');
    const hero = document.querySelector('.tool-hero, .hero, h1');
    if (!main || !hero || document.querySelector('.tool-quality-panel')) return;

    const panel = document.createElement('section');
    panel.className = 'tool-quality-panel';
    panel.setAttribute('aria-label', 'Tool workflow and privacy notes');
    panel.innerHTML = '<div><strong>Workflow:</strong> add input, review settings, run the tool, then check the result before download or copy.</div>' +
      '<div><strong>Privacy:</strong> tools are designed to process in the browser where practical; pages that rely on external data or third-party services should state that in context.</div>' +
      '<div><strong>Support:</strong> review the <a href="/privacy-policy.html">Privacy Policy</a>, <a href="/security.html">Security</a>, or <a href="/contact.html">Contact</a> pages if a workflow handles sensitive files.</div>';

    if (hero.parentElement) {
      hero.parentElement.insertAdjacentElement('afterend', panel);
    } else {
      main.insertAdjacentElement('afterbegin', panel);
    }
  }

  window.i18n = {
    changeLanguage,
    t,
    getCurrentLanguage: () => currentLanguage,
    getSupportedLanguages: () => SUPPORTED_LANGUAGES,
    refresh: updatePageTranslations,
    SUPPORTED_LANGUAGES,
    LANGUAGE_NAMES,
    LANGUAGE_FLAGS
  };

  window.changeLanguage = changeLanguage;

  function boot() {
    init();
    initQualityEnhancements();
    ensureAdSenseBootstrap();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

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

    [dir="rtl"] .language-selector-floating {
      right: auto;
      left: 20px;
    }


    .ad-slot-reserved {
      min-height: 250px;
      background: rgba(15, 23, 42, 0.38);
      border-radius: 12px;
    }

    .tool-quality-panel {
      width: min(960px, calc(100% - 32px));
      margin: 1rem auto 2rem;
      padding: 1rem;
      display: grid;
      gap: 0.75rem;
      color: #cbd5e1;
      background: rgba(15, 23, 42, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 16px;
      line-height: 1.65;
    }

    .tool-quality-panel strong { color: #f8fafc; }
    .tool-quality-panel a { color: #22d3ee; }

    @media (max-width: 768px) {
      .language-selector {
        font-size: 12px;
        padding: 4px 8px;
      }
    }
  `;
  document.head.appendChild(styles);
})();
