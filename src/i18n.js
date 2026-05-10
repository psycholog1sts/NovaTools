/**
 * MC NovaTools - Internationalization (i18n) System
 * Multi-language support for all pages
 */

(function () {
  'use strict';

  const SUPPORTED_LANGUAGES = ['en', 'tr', 'ar'];
  const DEFAULT_LANGUAGE = 'en';

  let currentLanguage = DEFAULT_LANGUAGE;
  const translations = {};
  let isInitialized = false;

  const LANGUAGE_NAMES = {
    en: 'English',
    tr: 'Türkçe',
    ar: 'العربية'
  };

  const LANGUAGE_FLAGS = {
    en: '🇬🇧',
    tr: '🇹🇷',
    ar: '🇸🇦'
  };

  const SITE_ORIGIN = 'https://mc-novatools.com';
  const CONTENT_FALLBACK_NOTICE = {
    en: 'This content is currently available only in English.',
    tr: 'Bu içerik şu anda yalnızca İngilizce olarak mevcuttur.',
    ar: 'هذا المحتوى متاح حالياً باللغة الإنجليزية فقط.'
  };
  const contentAvailability = {
    categories: {},
    tools: {},
    blog: {
        "high-yield-savings-guide": [
            "en",
            "tr",
            "ar"
        ],
        "personal-loan-vs-credit-card": [
            "en",
            "tr",
            "ar"
        ],
        "auto-insurance-savings": [
            "en",
            "tr",
            "ar"
        ],
        "health-insurance-marketplace": [
            "en",
            "tr",
            "ar"
        ],
        "best-credit-cards-2026": [
            "en",
            "tr",
            "ar"
        ],
        "student-loan-repayment": [
            "en",
            "tr",
            "ar"
        ],
        "emergency-fund-guide": [
            "en",
            "tr",
            "ar"
        ],
        "credit-score-hacks": [
            "en",
            "tr",
            "ar"
        ],
        "401k-rollover-guide": [
            "en",
            "tr",
            "ar"
        ],
        "nft-tax-guide": [
            "en",
            "tr",
            "ar"
        ],
        "index-funds-vs-etfs": [
            "en",
            "tr",
            "ar"
        ],
        "term-vs-whole-life": [
            "en",
            "tr",
            "ar"
        ],
        "first-time-home-buyer": [
            "en",
            "tr",
            "ar"
        ],
        "tax-deductions-homeowners": [
            "en",
            "tr",
            "ar"
        ],
        "halal-mortgage-usa": [
            "en",
            "tr",
            "ar"
        ],
        "cloud-cost-comparison": [
            "en",
            "tr",
            "ar"
        ],
        "life-insurance-coverage-guide": [
            "en",
            "tr",
            "ar"
        ],
        "zakat-investments-guide": [
            "en",
            "tr",
            "ar"
        ],
        "pdf-financial-records": [
            "en",
            "tr",
            "ar"
        ],
        "mortgage-refinancing-guide": [
            "en",
            "tr",
            "ar"
        ],
        "islamic-finance-investing": [
            "en",
            "tr",
            "ar"
        ],
        "crypto-tax-guide": [
            "en",
            "tr",
            "ar"
        ],
        "retirement-planning-millennials": [
            "en",
            "tr",
            "ar"
        ],
        "pmi-removal-guide": [
            "en",
            "tr",
            "ar"
        ],
        "debt-consolidation-guide": [
            "en",
            "tr",
            "ar"
        ],
        "pdf-to-word-when-to-convert-and-when-not-to": [
            "en",
            "tr",
            "ar"
        ],
        "pdf-to-text-clean-extraction-workflow": [
            "en",
            "tr",
            "ar"
        ],
        "transparent-background-image-workflow": [
            "en",
            "tr",
            "ar"
        ],
        "compress-pdf-for-email-without-ruining-readability": [
            "en",
            "tr",
            "ar"
        ],
        "slug-generator-url-cleanup-guide": [
            "en",
            "tr",
            "ar"
        ]
    }
  };

  function localeFromPath(pathname) {
    const match = String(pathname || '').match(/^\/(tr|ar)(?=\/|$)/);
    return match ? match[1] : DEFAULT_LANGUAGE;
  }

  function stripLocalePrefix(pathname) {
    const stripped = String(pathname || '/').replace(/^\/(tr|ar)(?=\/|$)/, '') || '/';
    return stripped.startsWith('/') ? stripped : `/${stripped}`;
  }

  function getRequestedLanguage() {
    const params = new URLSearchParams(window.location.search);
    const queryLang = params.get('lang');
    if (SUPPORTED_LANGUAGES.includes(queryLang)) return queryLang;
    const pathLang = localeFromPath(window.location.pathname);
    if (pathLang !== DEFAULT_LANGUAGE) return pathLang;
    return null;
  }

  function localizedPath(lang, pathname = window.location.pathname) {
    const basePath = stripLocalePrefix(pathname);
    return lang === DEFAULT_LANGUAGE ? basePath : `/${lang}${basePath === '/' ? '/' : basePath}`;
  }

  function absoluteUrl(pathname) {
    return `${SITE_ORIGIN}${pathname}`;
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

  function ensureNoindex(message) {
    ensureMeta('meta[name="robots"]', { name: 'robots', content: 'noindex, follow' });
    if (!message || document.querySelector('[data-i18n-availability-notice]')) return;
    const notice = document.createElement('aside');
    notice.setAttribute('data-i18n-availability-notice', '');
    notice.setAttribute('role', 'status');
    notice.textContent = message;
    notice.style.cssText = 'max-width:960px;margin:1rem auto;padding:1rem;border:1px solid rgba(148,163,184,.28);border-radius:12px;background:rgba(15,23,42,.82);color:#e2e8f0;';
    document.body.prepend(notice);
  }

  function pageContentAvailability() {
    const path = stripLocalePrefix(window.location.pathname).replace(/\/$/, '');
    const blogMatch = path.match(/^\/blog\/([^/.]+)(?:\.html)?$/);
    if (blogMatch) return contentAvailability.blog[blogMatch[1]] || ['en'];
    if (/^\/blog(?:\/index\.html)?$/.test(path)) return ['en', 'tr', 'ar'];
    const categoryMatch = path.match(/^\/categories\/([^/.]+)(?:\.html)?$/);
    if (categoryMatch) return contentAvailability.categories[categoryMatch[1]] || ['en', 'tr', 'ar'];
    const toolMatch = path.match(/^\/tools\/(.+)$/);
    if (toolMatch) return contentAvailability.tools[toolMatch[1].replace(/\/$/, '')] || ['en', 'tr', 'ar'];
    return ['en', 'tr', 'ar'];
  }

  function applyLocaleSeo(lang) {
    const canonicalPath = localizedPath(lang);
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
    [['en', localizedPath('en')], ['tr', localizedPath('tr')], ['ar', localizedPath('ar')], ['x-default', localizedPath('en')]].forEach(([hreflang, href]) => {
      const link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = hreflang;
      link.href = absoluteUrl(href);
      document.head.appendChild(link);
    });
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = absoluteUrl(canonicalPath);

    const available = pageContentAvailability();
    if (!available.includes(lang)) ensureNoindex(CONTENT_FALLBACK_NOTICE[lang] || CONTENT_FALLBACK_NOTICE.en);
  }

  function getInitialLanguage() {
    const requested = getRequestedLanguage();
    if (requested) return requested;

    try {
      const saved = localStorage.getItem('mc-novatools-language');
      if (saved && SUPPORTED_LANGUAGES.includes(saved)) {
        return saved;
      }
    } catch {
      console.warn('localStorage not available');
    }

    const browserLang = navigator.language || navigator.userLanguage || DEFAULT_LANGUAGE;
    const langCode = String(browserLang).split('-')[0].toLowerCase();
    return SUPPORTED_LANGUAGES.includes(langCode) ? langCode : DEFAULT_LANGUAGE;
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
    } catch {
      console.warn('Could not save language preference');
    }

    const targetPath = localizedPath(lang);
    if (window.location.pathname !== targetPath && !window.location.pathname.startsWith('/blog/article-template')) {
      window.location.assign(targetPath + window.location.search + window.location.hash);
      return;
    }

    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.body?.classList.toggle('is-rtl', lang === 'ar');
    applyLocaleSeo(lang);

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

    selector.innerHTML = '';
    SUPPORTED_LANGUAGES.forEach((lang) => {
      const option = document.createElement('option');
      option.value = lang;
      option.textContent = `${LANGUAGE_FLAGS[lang]} ${LANGUAGE_NAMES[lang]}`;
      selector.appendChild(option);
    });

    const newSelector = selector.cloneNode(true);
    selector.parentNode.replaceChild(newSelector, selector);

    newSelector.value = currentLanguage;
    newSelector.querySelectorAll('option').forEach((option) => {
      option.toggleAttribute('selected', option.value === currentLanguage);
    });
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


  function getStoredConsent() {
    try {
      const raw = localStorage.getItem('cookie_consent') || localStorage.getItem('novatools_cookie_consent') || localStorage.getItem('mc_novatools_cookie_consent');
      return raw ? JSON.parse(raw) : null;
    } catch (_e) {
      void _e;
      return null;
    }
  }

  function hasConsentCategory(category) {
    const consent = window.NovaToolsConsent || getStoredConsent();
    return consent?.[category] === true || (category === 'advertising' && consent?.categories?.advertising === true);
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
    if (!hasConsentCategory('advertising')) return;
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
    LANGUAGE_FLAGS,
    localizedPath,
    contentAvailability
  };

  window.changeLanguage = changeLanguage;

  function boot() {
    init();
    initQualityEnhancements();
    import('/consent-manager.mjs').then((module) => {
      module.initConsentManager();
      ensureAdSenseBootstrap();
    });
    window.addEventListener('novatools:consent-updated', ensureAdSenseBootstrap);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  const styles = document.createElement('style');
  styles.textContent = `
    html[dir="rtl"] body {
      font-family: 'Tajawal', 'Cairo', Inter, system-ui, sans-serif;
    }

    html[dir="rtl"] .main-nav,
    html[dir="rtl"] .header-inner,
    html[dir="rtl"] .tool-quality-panel {
      direction: rtl;
    }

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
