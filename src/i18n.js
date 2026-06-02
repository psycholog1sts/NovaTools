/**
 * MC NovaTools - Internationalization (i18n) System
 * Multi-language support for all pages
 */

(function () {
  'use strict';

  const SUPPORTED_LANGUAGES = ['en', 'tr', 'de', 'fr', 'es', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'it', 'pl', 'nl'];
  const RTL_LANGUAGES = ['ar'];
  const DEFAULT_LANGUAGE = 'en';
  const FALLBACK_LOCALES = {
    'tr-TR': ['tr', 'en'],
    'en-US': ['en', 'tr'],
    default: ['en']
  };
  const LANGUAGE_ALIASES = {
    'tr-tr': 'tr',
    'tr_tr': 'tr',
    'en-us': 'en',
    'en_us': 'en',
    'en-gb': 'en',
    'en_gb': 'en',
    'pt-br': 'pt',
    'pt_br': 'pt',
    'zh-cn': 'zh',
    'zh_cn': 'zh',
    'zh-tw': 'zh',
    'zh_tw': 'zh'
  };

  let currentLanguage = DEFAULT_LANGUAGE;
  const translations = {};
  const originalTextNodes = new WeakMap();
  let originalDocumentTitle = null;
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
    hi: 'हिन्दी',
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

  const SITE_ORIGIN = 'https://mc-novatools.com';
  const CONTENT_FALLBACK_NOTICE = {
    en: 'This content is currently available only in English.',
    tr: 'Bu yüzey tam çevrilmediği için İngilizce gösteriliyor.',
    ar: 'تُعرض هذه الصفحة بالإنجليزية لأن ترجمتها الكاملة غير جاهزة بعد.'
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

  function pathSegments(pathname = window.location.pathname) {
    return String(pathname || '/').split('/').filter(Boolean);
  }

  function legacyLocaleFromPath(pathname = window.location.pathname) {
    const firstSegment = pathSegments(pathname)[0];
    return SUPPORTED_LANGUAGES.includes(firstSegment) && firstSegment !== DEFAULT_LANGUAGE ? firstSegment : null;
  }

  function stripLocalePrefix(pathname = window.location.pathname) {
    const firstSegment = pathSegments(pathname)[0];
    if (SUPPORTED_LANGUAGES.includes(firstSegment)) {
      const stripped = String(pathname || '/').replace(new RegExp(`^/${firstSegment}(?=/|$)`), '') || '/';
      return stripped.startsWith('/') ? stripped : `/${stripped}`;
    }
    return String(pathname || '/').startsWith('/') ? String(pathname || '/') : `/${pathname}`;
  }

  function normalizeLanguage(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const normalized = raw.replace(/^\/+|\/+$/g, '').replace('_', '-').toLowerCase();
    const alias = LANGUAGE_ALIASES[normalized] || LANGUAGE_ALIASES[normalized.replace('-', '_')];
    if (alias && SUPPORTED_LANGUAGES.includes(alias)) return alias;
    const base = normalized.split('-')[0];
    return SUPPORTED_LANGUAGES.includes(base) ? base : null;
  }

  function getFallbackChain(lang) {
    const normalized = normalizeLanguage(lang) || DEFAULT_LANGUAGE;
    const chain = FALLBACK_LOCALES[lang] || FALLBACK_LOCALES[normalized] || FALLBACK_LOCALES.default;
    return [...new Set([normalized, ...chain.map((candidate) => normalizeLanguage(candidate)).filter(Boolean), DEFAULT_LANGUAGE])];
  }

  function getRequestedLanguage() {
    const params = new URLSearchParams(window.location.search);
    return normalizeLanguage(params.get('lang'));
  }

  function localizedPath(_lang, pathname = window.location.pathname) {
    return stripLocalePrefix(pathname);
  }

  function localizedSearch(lang, search = window.location.search) {
    const params = new URLSearchParams(search || '');
    params.delete('lang');
    const normalizedLang = normalizeLanguage(lang) || DEFAULT_LANGUAGE;
    if (normalizedLang !== DEFAULT_LANGUAGE) {
      params.set('lang', normalizedLang);
    }
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  function localizedHref(lang, pathname = window.location.pathname, search = window.location.search) {
    return `${localizedPath(lang, pathname)}${localizedSearch(lang, search)}`;
  }

  function redirectLegacyLocalePathToQuery() {
    const legacyLang = legacyLocaleFromPath(window.location.pathname);
    if (!legacyLang) return false;
    const targetPath = localizedPath(legacyLang, window.location.pathname);
    const targetSearch = localizedSearch(legacyLang, window.location.search);
    window.location.replace(`${targetPath}${targetSearch}${window.location.hash}`);
    return true;
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
    const blogMatch = path.match(/^\/blog\/(?:articles\/)?([^/.]+)(?:\.html)?$/);
    if (blogMatch) return contentAvailability.blog[blogMatch[1]] || ['en'];
    if (/^\/blog(?:\/index\.html)?$/.test(path)) return ['en', 'tr', 'ar'];
    const categoryMatch = path.match(/^\/categories\/([^/.]+)(?:\.html)?$/);
    if (categoryMatch) return contentAvailability.categories[categoryMatch[1]] || SUPPORTED_LANGUAGES;
    const financeMatch = path.match(/^\/finance\/(.+)$/);
    if (financeMatch) return contentAvailability.tools[`finance/${financeMatch[1].replace(/\/$/, '')}`] || SUPPORTED_LANGUAGES;
    const toolMatch = path.match(/^\/tools\/(.+)$/);
    if (toolMatch) return contentAvailability.tools[toolMatch[1].replace(/\/$/, '')] || SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES;
  }

  function applyLocaleSeo(lang) {
    const canonicalPath = localizedPath(lang);
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
    [...SUPPORTED_LANGUAGES.map((code) => [code, localizedHref(code)]), ['x-default', localizedHref('en')]].forEach(([hreflang, href]) => {
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
    canonical.href = absoluteUrl(`${canonicalPath}${localizedSearch(lang)}`);

    const available = pageContentAvailability();
    if (!available.includes(lang)) ensureNoindex(CONTENT_FALLBACK_NOTICE[lang] || CONTENT_FALLBACK_NOTICE.en);
  }

  function getInitialLanguage() {
    const requested = getRequestedLanguage();
    if (requested) return requested;

    try {
      const saved = normalizeLanguage(localStorage.getItem('mc-novatools-language'));
      if (saved) {
        return saved;
      }
    } catch {
      console.warn('localStorage not available');
    }

    return normalizeLanguage(navigator.language || navigator.userLanguage || DEFAULT_LANGUAGE) || DEFAULT_LANGUAGE;
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
      console.warn('i18n translation load failed; falling back safely:', error);
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
    for (const lang of getFallbackChain(currentLanguage)) {
      const translation = translations[lang];
      if (translation && Object.prototype.hasOwnProperty.call(translation, key)) {
        return translation[key];
      }
    }
    return fallback !== null ? fallback : key;
  }

  function normalizeTranslatableText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function preserveOuterWhitespace(original, translated) {
    const leading = String(original).match(/^\s*/)?.[0] || '';
    const trailing = String(original).match(/\s*$/)?.[0] || '';
    return `${leading}${translated}${trailing}`;
  }

  function buildReverseTranslationIndex() {
    const reverse = new Map();
    ['en', 'tr', 'ar'].forEach((sourceLang) => {
      const source = translations[sourceLang];
      if (!source) return;
      Object.entries(source).forEach(([key, value]) => {
        if (typeof value !== 'string') return;
        const normalized = normalizeTranslatableText(value);
        if (normalized.length > 1 && normalized.length < 260 && !reverse.has(normalized)) {
          reverse.set(normalized, key);
        }
      });
    });
    return reverse;
  }

  function translateOriginalValue(original, reverseIndex) {
    const normalized = normalizeTranslatableText(original);
    if (!normalized) return null;
    const key = reverseIndex.get(normalized);
    if (!key) return null;
    const translated = t(key, normalized);
    if (!translated || translated === key) return null;
    return preserveOuterWhitespace(original, translated);
  }

  function shouldSkipTextNode(node) {
    const parent = node.parentElement;
    if (!parent) return true;
    return Boolean(parent.closest('script, style, code, pre, textarea, select, option, noscript, svg, canvas, [data-i18n-skip]'));
  }

  function updateStaticTextTranslations() {
    if (!document.body) return;
    const reverseIndex = buildReverseTranslationIndex();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (shouldSkipTextNode(node)) return NodeFilter.FILTER_REJECT;
        return normalizeTranslatableText(node.nodeValue).length > 1 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });

    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach((node) => {
      if (!originalTextNodes.has(node)) originalTextNodes.set(node, node.nodeValue);
      const original = originalTextNodes.get(node);
      const translated = translateOriginalValue(original, reverseIndex);
      if (translated) node.nodeValue = translated;
    });

    document.querySelectorAll('[aria-label], [title], [placeholder], [alt]').forEach((element) => {
      ['aria-label', 'title', 'placeholder', 'alt'].forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        const storageKey = `data-i18n-original-attr-${attribute}`;
        if (!element.hasAttribute(storageKey)) element.setAttribute(storageKey, element.getAttribute(attribute) || '');
        const translated = translateOriginalValue(element.getAttribute(storageKey) || '', reverseIndex);
        if (translated) element.setAttribute(attribute, translated.trim());
      });
    });

    if (originalDocumentTitle === null) originalDocumentTitle = document.title;
    const translatedTitle = translateOriginalValue(originalDocumentTitle, reverseIndex);
    if (translatedTitle) document.title = translatedTitle.trim();

    document.querySelectorAll('meta[name="description"], meta[property="og:title"], meta[property="og:description"], meta[name="twitter:title"], meta[name="twitter:description"]').forEach((meta) => {
      const storageKey = 'data-i18n-original-content';
      if (!meta.hasAttribute(storageKey)) meta.setAttribute(storageKey, meta.getAttribute('content') || '');
      const translated = translateOriginalValue(meta.getAttribute(storageKey) || '', reverseIndex);
      if (translated) meta.setAttribute('content', translated.trim());
    });
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

    updateStaticTextTranslations();
  }

  function normalizeSelectedLanguage(value) {
    return normalizeLanguage(String(value || '').replace(/^\/+|\/+$/g, '').split('/')[0]) || '';
  }

  function languageSwitchUrl(lang) {
    const params = new URLSearchParams(window.location.search || '');
    params.delete('lang');
    const normalizedLang = normalizeLanguage(lang) || DEFAULT_LANGUAGE;
    if (normalizedLang !== DEFAULT_LANGUAGE) {
      params.set('lang', normalizedLang);
    }
    const query = params.toString();
    return `${stripLocalePrefix(window.location.pathname)}${query ? `?${query}` : ''}${window.location.hash || ''}`;
  }

  async function changeLanguage(selectedLang) {
    const lang = normalizeSelectedLanguage(selectedLang);
    if (!SUPPORTED_LANGUAGES.includes(lang)) {
      console.error('Unsupported language:', selectedLang);
      return;
    }

    currentLanguage = lang;

    try {
      localStorage.setItem('mc-novatools-language', lang);
    } catch {
      console.warn('Could not save language preference');
    }

    const targetHref = languageSwitchUrl(lang);
    if (`${window.location.pathname}${window.location.search}` !== targetHref) {
      window.location.href = targetHref;
      return;
    }

    document.documentElement.lang = lang;
    const isRtl = RTL_LANGUAGES.includes(lang);
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.body?.classList.toggle('is-rtl', isRtl);
    applyLocaleSeo(lang);

    const selector = document.getElementById('language-selector');
    if (selector && selector.value !== lang) {
      selector.value = lang;
    }

    await Promise.all(getFallbackChain(lang).map((candidate) => loadTranslations(candidate)));
    updatePageTranslations();
    refreshSiteGuide();

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

    if (redirectLegacyLocalePathToQuery()) {
      return;
    }

    currentLanguage = getInitialLanguage();
    document.documentElement.lang = currentLanguage;
    document.documentElement.dir = RTL_LANGUAGES.includes(currentLanguage) ? 'rtl' : 'ltr';
    document.body?.classList.toggle('is-rtl', RTL_LANGUAGES.includes(currentLanguage));
    applyLocaleSeo(currentLanguage);

    await Promise.all(getFallbackChain(currentLanguage).map((candidate) => loadTranslations(candidate)));

    if (!setupExistingSelector()) {
      injectLanguageSelector();
    }

    const selector = document.getElementById('language-selector');
    if (selector) {
      selector.value = currentLanguage;
    }

    updatePageTranslations();
    initSiteGuide();
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

  function reserveInlineAdSlot(el) {
    const format = el.getAttribute('data-ad-format') || '';
    const width = format === 'leaderboard' || el.classList.contains('ad-slot-leaderboard') ? 728 : format === 'sticky' ? 320 : 300;
    const height = format === 'leaderboard' || el.classList.contains('ad-slot-leaderboard') ? 90 : format === 'sticky' ? 50 : format === 'sidebar' ? 600 : 250;
    if (!el.getAttribute('width')) el.setAttribute('width', String(width));
    if (!el.getAttribute('height')) el.setAttribute('height', String(height));
    el.style.minWidth = el.style.minWidth || `min(100%, ${width}px)`;
    el.style.minHeight = el.style.minHeight || `${height}px`;
    el.style.aspectRatio = el.style.aspectRatio || `${width} / ${height}`;
    const container = el.closest('.ad-slot-container, .ad-in-tool, .ad-frame, .ad-wrapper, aside, div');
    if (container && !container.querySelector('.ad-label')) {
      const label = document.createElement('span');
      label.className = 'ad-label';
      label.textContent = (document.documentElement.lang || '').toLowerCase().startsWith('tr') ? 'Reklam' : 'Advertisement';
      container.insertBefore(label, container.firstChild);
    }
  }

  function ensureAdSenseBootstrap() {
    if (window.__mcAdSenseLoaded) return;
    if (!document.head || !isProductionHost() || !hasValidAdSlot()) return;
    if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl) return;
    if (!hasConsentCategory('advertising')) return;
    if (document.querySelector('script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="]')) {
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


  function initSiteGuide() {
    if (document.getElementById('novatools-site-guide')) return;
    const guide = document.createElement('aside');
    guide.id = 'novatools-site-guide';
    guide.className = 'site-guide-chatbot';
    guide.setAttribute('aria-label', t('surface.chatbot.title', 'NovaTools guide'));
    const recommendations = [
      { match: 'pdf,merge,compress,split,file', title: 'PDF workflow', href: '/categories/pdf-tools.html', guide: '/blog/articles/five-minute-pdf-cleanup-workflow.html' },
      { match: 'image,png,jpg,webp,photo,resize', title: 'Image workflow', href: '/categories/image-tools.html', guide: '/blog/articles/compress-images-for-web-quality-checklist.html' },
      { match: 'json,regex,code,developer,api', title: 'Developer workflow', href: '/categories/developer-tools.html', guide: '/blog/articles/developer-debugging-tool-chain.html' },
      { match: 'money,finance,tax,loan,mortgage,currency', title: 'Finance workflow', href: '/categories/finance-tools.html', guide: '/blog/articles/monthly-finance-document-routine.html' }
    ];
    guide.innerHTML = `
      <button type="button" class="site-guide-chatbot__toggle" aria-expanded="false" aria-controls="site-guide-chatbot-panel">${t('surface.chatbot.open', 'Open site guide')}</button>
      <div id="site-guide-chatbot-panel" class="site-guide-chatbot__panel" hidden>
        <div class="site-guide-chatbot__header"><strong>${t('surface.chatbot.title', 'NovaTools guide')}</strong><button type="button" class="site-guide-chatbot__close" aria-label="${t('surface.chatbot.close', 'Close site guide')}">×</button></div>
        <p>${t('surface.chatbot.placeholder', 'Ask which tool or guide fits your task…')}</p>
        <form class="site-guide-chatbot__form">
          <label class="sr-only" for="site-guide-query">${t('surface.chatbot.placeholder', 'Ask which tool or guide fits your task…')}</label>
          <input id="site-guide-query" type="search" placeholder="PDF, image, JSON, finance…">
          <button type="submit">Find</button>
        </form>
        <div class="site-guide-chatbot__result" role="status"></div>
        <div class="site-guide-chatbot__links">
          <a href="/categories/index.html">${t('tools.categories', 'Categories')}</a>
          <a href="/blog/index.html">${t('nav.blog', 'Blog')}</a>
          <a href="/iletisim.html">${t('nav.contact', 'Contact')}</a>
        </div>
      </div>`;
    document.body.appendChild(guide);
    const toggle = guide.querySelector('.site-guide-chatbot__toggle');
    const panel = guide.querySelector('.site-guide-chatbot__panel');
    const close = guide.querySelector('.site-guide-chatbot__close');
    const form = guide.querySelector('.site-guide-chatbot__form');
    const input = guide.querySelector('#site-guide-query');
    const result = guide.querySelector('.site-guide-chatbot__result');
    const setOpen = (open) => {
      panel.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      if (open) window.setTimeout(() => input?.focus(), 0);
    };
    const renderRecommendation = (query = '') => {
      const normalized = query.toLowerCase();
      const selected = recommendations.find((item) => item.match.split(',').some((term) => normalized.includes(term))) || recommendations[0];
      result.innerHTML = `<strong>${selected.title}</strong><span>Open the category first, then use the linked guide as a checklist.</span><div><a href="${selected.href}">Open category</a><a href="${selected.guide}">Read guide</a></div>`;
    };
    toggle.addEventListener('click', () => setOpen(panel.hidden));
    close.addEventListener('click', () => setOpen(false));
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      renderRecommendation(input.value);
    });
    renderRecommendation();
  }

  function refreshSiteGuide() {
    const guide = document.getElementById('novatools-site-guide');
    if (!guide) return;
    guide.remove();
    initSiteGuide();
  }

  function initQualityEnhancements() {
    document.querySelectorAll('ins.adsbygoogle').forEach((el) => {
      el.classList.add('ad-slot-reserved');
      reserveInlineAdSlot(el);
      if (!/^\d{8,20}$/.test((el.getAttribute('data-ad-slot') || '').trim())) {
        el.setAttribute('data-ad-status', 'pending-valid-slot');
      }
    });

    if (!/\/tools\//.test(window.location.pathname)) return;

    const main = document.querySelector('main, .main-content, .tool-wrapper');
    const hero = document.querySelector('.tool-hero, .hero, h1');
    if (!main || !hero || document.querySelector('.tool-professional-layer')) return;

    const pathMatch = window.location.pathname.match(/\/tools\/([^/]+)\/([^/]+)\/?/);
    const category = pathMatch?.[1] || 'tools';
    const categoryRoutes = {
      pdf: 'pdf-tools', image: 'image-tools', finance: 'finance-tools', dev: 'developer-tools', text: 'text-writing',
      converters: 'converters', data: 'data-tools', design: 'design-tools', productivity: 'productivity-tools', security: 'security-tools', social: 'social-media-tools'
    };
    const guideByCategory = {
      pdf: '/blog/articles/five-minute-pdf-cleanup-workflow.html', image: '/blog/articles/compress-images-for-web-quality-checklist.html',
      finance: '/blog/articles/monthly-finance-document-routine.html', dev: '/blog/articles/developer-debugging-tool-chain.html',
      text: '/blog/articles/content-review-before-client-delivery.html', converters: '/blog/articles/unit-converter-for-project-planning.html',
      data: '/blog/articles/data-cleanup-before-dashboard-import.html', design: '/blog/articles/image-alt-text-and-file-names-workflow.html',
      productivity: '/blog/articles/tool-selection-map-for-new-users.html', security: '/blog/articles/local-processing-vs-upload-tools-comparison.html',
      social: '/blog/articles/resize-images-for-social-platforms.html'
    };
    const categoryRoute = `/categories/${categoryRoutes[category] || 'index'}.html`;
    const guideRoute = guideByCategory[category] || '/blog/articles/tool-selection-map-for-new-users.html';

    main.classList.add('tool-ux-standard');
    document.querySelectorAll('input, textarea, select, button, [tabindex]').forEach((el) => {
      if (el.matches('button, a, input, textarea, select') || Number(el.getAttribute('tabindex')) >= 0) {
        el.classList.add('tool-focusable');
      }
    });
    document.querySelectorAll('.dropzone, [data-dropzone], .upload-area, .file-upload').forEach((el) => {
      el.classList.add('tool-dropzone-standard');
    });
    document.querySelectorAll('.result, .results, .result-panel, .results-panel, .output, .output-area').forEach((el) => {
      el.classList.add('tool-result-standard');
    });

    const panel = document.createElement('section');
    panel.className = 'tool-professional-layer';
    panel.setAttribute('aria-label', 'Tool workflow, privacy and help notes');
    panel.innerHTML = `
      <div class="tool-professional-card">
        <strong>Workflow</strong>
        <p>Add your input, review available settings, run the tool with its primary action, then inspect the result before download, copy or sharing.</p>
      </div>
      <div class="tool-professional-card">
        <strong>Privacy & limits</strong>
        <p>NovaTools favors browser-first processing where practical. Large files can depend on device memory, and tools that need live data or external services should be reviewed in context.</p>
      </div>
      <div class="tool-professional-card">
        <strong>Result states</strong>
        <p>Empty means input is still needed; loading means the browser is working; success should be reviewed; errors usually mean format, size or required-field issues.</p>
      </div>
      <div class="tool-professional-actions">
        <a href="${categoryRoute}">Related tools</a>
        <a href="${guideRoute}">Related guide</a>
        <a href="/security.html">Safety notes</a>
      </div>`;

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
    localizedSearch,
    localizedHref,
    contentAvailability,
    normalizeLanguage
  };

  window.changeLanguage = changeLanguage;

  function boot() {
    init();
    initQualityEnhancements();
    import('/analytics.js').then((module) => module.initAnalytics?.());
    import('/consent-manager.mjs').then((module) => {
      module.initConsentManager();
      ensureAdSenseBootstrap();
    });
    window.addEventListener('novatools:consent-updated', ensureAdSenseBootstrap);
    if (document.body && !window.__novatoolsI18nObserver) {
      let pendingRefresh = false;
      window.__novatoolsI18nObserver = new MutationObserver(() => {
        if (pendingRefresh) return;
        pendingRefresh = true;
        window.requestAnimationFrame(() => {
          pendingRefresh = false;
          updateStaticTextTranslations();
        });
      });
      window.__novatoolsI18nObserver.observe(document.body, { childList: true, subtree: true });
    }
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
    html[dir="rtl"] .header-inner {
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
      aspect-ratio: 300 / 250;
      background: rgba(15, 23, 42, 0.38);
      border: 1px solid rgba(148, 163, 184, 0.32);
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

    .tool-professional-layer {
      width: min(1120px, calc(100% - 32px));
      margin: 1rem auto 2rem;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
      gap: 0.9rem;
      color: #cbd5e1;
    }

    .tool-professional-card,
    .tool-professional-actions {
      padding: 1rem;
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 16px;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.52));
      box-shadow: 0 12px 36px rgba(2, 6, 23, 0.22);
    }

    .tool-professional-card strong {
      display: block;
      margin-bottom: 0.35rem;
      color: #f8fafc;
      font-size: 0.95rem;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }

    .tool-professional-card p {
      margin: 0;
      line-height: 1.65;
    }

    .tool-professional-actions {
      display: grid;
      gap: 0.55rem;
      align-content: center;
    }

    .tool-professional-actions a {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 0.75rem 0.85rem;
      border: 1px solid rgba(34, 211, 238, 0.18);
      border-radius: 12px;
      background: rgba(34, 211, 238, 0.08);
      color: #67e8f9;
      font-weight: 800;
      text-decoration: none;
    }

    .tool-ux-standard input:not([type="checkbox"]):not([type="radio"]),
    .tool-ux-standard textarea,
    .tool-ux-standard select {
      min-height: 44px;
    }

    .tool-focusable:focus-visible,
    .tool-professional-actions a:focus-visible {
      outline: 3px solid rgba(34, 211, 238, 0.65);
      outline-offset: 3px;
    }

    .tool-dropzone-standard {
      border-color: rgba(34, 211, 238, 0.34) !important;
      box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.12);
    }

    .tool-result-standard {
      border-radius: 14px;
    }

    .site-guide-chatbot {
      position: fixed;
      right: 1rem;
      bottom: 1rem;
      z-index: 9998;
      width: min(340px, calc(100vw - 2rem));
      font-family: Inter, system-ui, sans-serif;
    }

    .site-guide-chatbot__toggle,
    .site-guide-chatbot__panel {
      border: 1px solid rgba(148, 163, 184, 0.26);
      box-shadow: 0 18px 60px rgba(2, 6, 23, 0.38);
    }

    .site-guide-chatbot__toggle {
      float: right;
      border-radius: 999px;
      padding: 0.8rem 1rem;
      background: linear-gradient(135deg, #22d3ee, #8b5cf6);
      color: #020617;
      font-weight: 800;
      cursor: pointer;
    }

    .site-guide-chatbot__panel {
      clear: both;
      margin-top: 0.75rem;
      padding: 1rem;
      border-radius: 18px;
      background: rgba(8, 17, 31, 0.96);
      color: #f8fafc;
    }

    .site-guide-chatbot__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
    }

    .site-guide-chatbot__close {
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font-size: 1.4rem;
    }

    .site-guide-chatbot__form {
      display: grid;
      grid-template-columns: 1fr auto;
      gap: 0.5rem;
      margin-top: 0.85rem;
    }

    .site-guide-chatbot__form input,
    .site-guide-chatbot__form button {
      min-width: 0;
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 12px;
      padding: 0.72rem 0.8rem;
      font: inherit;
    }

    .site-guide-chatbot__form input {
      background: rgba(255, 255, 255, 0.08);
      color: #f8fafc;
    }

    .site-guide-chatbot__form button {
      background: #22d3ee;
      color: #020617;
      font-weight: 800;
      cursor: pointer;
    }

    .site-guide-chatbot__result {
      display: grid;
      gap: 0.45rem;
      margin-top: 0.85rem;
      padding: 0.85rem;
      border: 1px solid rgba(34, 211, 238, 0.22);
      border-radius: 14px;
      background: rgba(34, 211, 238, 0.08);
    }

    .site-guide-chatbot__result span {
      color: #cbd5e1;
      line-height: 1.45;
    }

    .site-guide-chatbot__result div {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .site-guide-chatbot__result a {
      color: #67e8f9;
      font-weight: 800;
      text-decoration: none;
    }

    .site-guide-chatbot__links {
      display: grid;
      gap: 0.5rem;
      margin-top: 0.85rem;
    }

    .site-guide-chatbot__links a {
      border-radius: 12px;
      padding: 0.7rem 0.85rem;
      background: rgba(255, 255, 255, 0.07);
      color: #e2e8f0;
      text-decoration: none;
      font-weight: 700;
    }

    [dir="rtl"] .site-guide-chatbot {
      right: auto;
      left: 1rem;
      direction: rtl;
    }

    [dir="rtl"] .site-guide-chatbot__toggle {
      float: left;
    }


    @media (max-width: 768px) {
      .language-selector {
        font-size: 12px;
        padding: 4px 8px;
      }
    }
  `;
  document.head.appendChild(styles);
})();
