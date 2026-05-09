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

  const ADSENSE_CLIENT = 'ca-pub-5738022526587953';

  function isProductionHost() {
    return /(^|\.)mc-novatools\.com$/i.test(window.location.hostname);
  }

  function hasValidAdSlot() {
    return Array.from(document.querySelectorAll('ins.adsbygoogle')).some(function(el) {
      var slot = el.getAttribute('data-ad-slot') || '';
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
    script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + ADSENSE_CLIENT;
    script.setAttribute('data-adsense-bootstrap', 'true');
    document.head.appendChild(script);
    window.__mcAdSenseLoaded = true;
  }

  function initQualityEnhancements() {
    document.querySelectorAll('ins.adsbygoogle').forEach(function(el) {
      el.classList.add('ad-slot-reserved');
      if (!/^\d{8,20}$/.test((el.getAttribute('data-ad-slot') || '').trim())) {
        el.setAttribute('data-ad-status', 'pending-valid-slot');
      }
    });

    if (!/\/tools\//.test(window.location.pathname)) return;

    var main = document.querySelector('main, .main-content, .tool-wrapper');
    var hero = document.querySelector('.tool-hero, .hero, h1');
    if (!main || !hero || document.querySelector('.tool-quality-panel')) return;

    var panel = document.createElement('section');
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
  function isSafeInlineHtml(value) {
    return typeof value === 'string' && /<\/?(strong|em|b|i|br|code|span)(\s[^>]*)?>/i.test(value) && !/<\s*(script|style|iframe|object|embed|form|input|button|img|svg|math|link|meta)/i.test(value);
  }

  function setTranslatedContent(el, value) {
    if (typeof value !== 'string') return false;
    if (isSafeInlineHtml(value)) {
      var template = document.createElement('template');
      template.innerHTML = value;
      var allowed = ['STRONG', 'EM', 'B', 'I', 'BR', 'CODE', 'SPAN'];
      var nodes = template.content.querySelectorAll('*');
      for (var i = 0; i < nodes.length; i++) {
        if (allowed.indexOf(nodes[i].tagName) === -1) {
          el.textContent = value;
          return true;
        }
        Array.from(nodes[i].attributes).forEach(function(attr) {
          if (attr.name !== 'class') nodes[i].removeAttribute(attr.name);
        });
      }
      el.replaceChildren(template.content.cloneNode(true));
      return true;
    }
    el.textContent = value;
    return true;
  }

  function translateElement(el) {
    var translated = false;

    if (el.hasAttribute('data-i18n')) {
      var key = el.getAttribute('data-i18n');
      var originalText = storeOriginalContent(el, 'text', el.textContent);
      var val = t(key, originalText);
      if (setTranslatedContent(el, val)) {
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
      if (setTranslatedContent(el, val)) {
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
    removeRadioPlayers();
    enhanceToolQualityPanel();
    enhancePublicSurfaces();
    phase1LocalizeGeneratedBlogArticle();

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


  function removeRadioPlayers() {
    document.querySelectorAll('#radio-player, #deep-focus-radio, .radio-player').forEach(function(el) {
      el.remove();
    });
    ['toggleRadio', 'setVolume', 'toggleMute'].forEach(function(name) {
      try { delete window[name]; } catch (e) { window[name] = undefined; }
    });
  }

  var TRUST_COPY = {
    en: {
      workflow: 'Workflow',
      workflowText: 'Add your input, review settings, run the tool, then verify the result before download or copy.',
      privacy: 'Privacy',
      privacyText: 'Tools are designed for browser-side processing where practical. Pages that need external data should state that context clearly.',
      support: 'Support',
      supportText: 'For sensitive workflows, review Privacy, Security, and Contact before using production files.'
    },
    tr: {
      workflow: 'İş akışı',
      workflowText: 'Girdinizi ekleyin, ayarları kontrol edin, aracı çalıştırın ve indirmeden ya da kopyalamadan önce sonucu doğrulayın.',
      privacy: 'Gizlilik',
      privacyText: 'Araçlar mümkün olduğunda tarayıcı tarafında işlem yapacak şekilde tasarlanır. Harici veri gereken sayfalar bu durumu açıkça belirtmelidir.',
      support: 'Destek',
      supportText: 'Hassas dosyalarla çalışmadan önce Gizlilik, Güvenlik ve İletişim sayfalarını inceleyin.'
    },
    ar: {
      workflow: 'سير العمل',
      workflowText: 'أضف المدخلات، راجع الإعدادات، شغّل الأداة، ثم تحقق من النتيجة قبل التنزيل أو النسخ.',
      privacy: 'الخصوصية',
      privacyText: 'تُصمَّم الأدوات للمعالجة داخل المتصفح حيثما أمكن. الصفحات التي تحتاج إلى بيانات خارجية يجب أن توضّح ذلك.',
      support: 'الدعم',
      supportText: 'للملفات الحساسة، راجع صفحات الخصوصية والأمان والتواصل قبل استخدام ملفات الإنتاج.'
    }
  };

  function enhanceToolQualityPanel() {
    if (!/\/tools\//.test(window.location.pathname)) return;
    var copy = TRUST_COPY[currentLanguage] || TRUST_COPY.en;
    var panel = document.querySelector('.tool-quality-panel');
    if (!panel) return;
    panel.setAttribute('aria-label', copy.workflow + ', ' + copy.privacy + ', ' + copy.support);
    panel.replaceChildren();
    [
      [copy.workflow, copy.workflowText],
      [copy.privacy, copy.privacyText],
      [copy.support, copy.supportText]
    ].forEach(function(item) {
      var div = document.createElement('div');
      var strong = document.createElement('strong');
      strong.textContent = item[0] + ': ';
      div.appendChild(strong);
      div.appendChild(document.createTextNode(item[1]));
      panel.appendChild(div);
    });
  }

  var PUBLIC_COPY = {
    en: {
      pageLabel: 'Trust and support',
      legalIntro: 'This page explains how MC NovaTools handles responsibility, privacy, support, and user expectations for public tools.',
      cards: ['Clear ownership and contact paths', 'Privacy-aware browser-first workflows', 'Plain-language expectations for safe use'],
      categorySummary: 'Choose the tool that matches your task, review the short benefit summary, and open the exact workflow without extra navigation.',
      footerNote: 'MC NovaTools keeps public pages consistent, privacy-aware, and easy to verify.'
    },
    tr: {
      pageLabel: 'Güven ve destek',
      legalIntro: 'Bu sayfa MC NovaTools’un herkese açık araçlarda sorumluluk, gizlilik, destek ve kullanıcı beklentilerini nasıl ele aldığını açıklar.',
      cards: ['Açık sahiplik ve iletişim yolları', 'Gizliliğe duyarlı tarayıcı öncelikli iş akışları', 'Güvenli kullanım için sade beklentiler'],
      categorySummary: 'Görevinize uygun aracı seçin, kısa fayda özetini okuyun ve gereksiz gezinme olmadan doğru iş akışını açın.',
      footerNote: 'MC NovaTools herkese açık sayfaları tutarlı, gizliliğe duyarlı ve kolay doğrulanabilir tutar.'
    },
    ar: {
      pageLabel: 'الثقة والدعم',
      legalIntro: 'توضح هذه الصفحة كيفية تعامل MC NovaTools مع المسؤولية والخصوصية والدعم وتوقعات المستخدم في الأدوات العامة.',
      cards: ['ملكية واضحة وقنوات تواصل مباشرة', 'سير عمل يراعي الخصوصية داخل المتصفح', 'توقعات بسيطة للاستخدام الآمن'],
      categorySummary: 'اختر الأداة المناسبة لمهمتك، راجع ملخص الفائدة القصير، وافتح سير العمل المطلوب دون تنقل زائد.',
      footerNote: 'يحافظ MC NovaTools على صفحات عامة متسقة وتراعي الخصوصية وسهلة التحقق.'
    },
    de: { pageLabel: 'Vertrauen und Support', legalIntro: 'Diese Seite erklärt, wie MC NovaTools Verantwortung, Datenschutz, Support und Erwartungen für öffentliche Werkzeuge behandelt.', cards: ['Klare Eigentümerschaft und Kontaktwege', 'Datenschutzbewusste Workflows im Browser', 'Einfache Erwartungen für sichere Nutzung'], categorySummary: 'Wählen Sie das passende Werkzeug, prüfen Sie die kurze Nutzenübersicht und öffnen Sie den richtigen Workflow ohne Umwege.', footerNote: 'MC NovaTools hält öffentliche Seiten konsistent, datenschutzbewusst und leicht überprüfbar.' },
    fr: { pageLabel: 'Confiance et assistance', legalIntro: 'Cette page explique comment MC NovaTools traite la responsabilité, la confidentialité, l’assistance et les attentes des utilisateurs.', cards: ['Propriété et contacts clairement indiqués', 'Flux de travail axés sur la confidentialité dans le navigateur', 'Attentes simples pour une utilisation sûre'], categorySummary: 'Choisissez l’outil adapté, consultez le bref résumé des avantages et ouvrez le bon flux de travail sans navigation inutile.', footerNote: 'MC NovaTools garde les pages publiques cohérentes, respectueuses de la confidentialité et faciles à vérifier.' },
    es: { pageLabel: 'Confianza y soporte', legalIntro: 'Esta página explica cómo MC NovaTools aborda la responsabilidad, la privacidad, el soporte y las expectativas de uso.', cards: ['Propiedad y vías de contacto claras', 'Flujos en el navegador con enfoque de privacidad', 'Expectativas sencillas para un uso seguro'], categorySummary: 'Elija la herramienta adecuada, revise el resumen breve de beneficios y abra el flujo correcto sin navegación extra.', footerNote: 'MC NovaTools mantiene las páginas públicas coherentes, respetuosas con la privacidad y fáciles de verificar.' },
    pt: { pageLabel: 'Confiança e suporte', legalIntro: 'Esta página explica como o MC NovaTools trata responsabilidade, privacidade, suporte e expectativas de uso público.', cards: ['Propriedade e canais de contato claros', 'Fluxos no navegador com foco em privacidade', 'Expectativas simples para uso seguro'], categorySummary: 'Escolha a ferramenta certa, leia o breve resumo de benefício e abra o fluxo adequado sem navegação extra.', footerNote: 'O MC NovaTools mantém páginas públicas consistentes, conscientes de privacidade e fáceis de verificar.' },
    ru: { pageLabel: 'Доверие и поддержка', legalIntro: 'Эта страница объясняет, как MC NovaTools описывает ответственность, конфиденциальность, поддержку и ожидания пользователей.', cards: ['Понятный владелец и способы связи', 'Рабочие процессы в браузере с учетом приватности', 'Простые ожидания для безопасного использования'], categorySummary: 'Выберите подходящий инструмент, прочитайте краткую пользу и откройте нужный рабочий процесс без лишней навигации.', footerNote: 'MC NovaTools поддерживает публичные страницы согласованными, приватными и проверяемыми.' },
    zh: { pageLabel: '信任与支持', legalIntro: '本页说明 MC NovaTools 如何处理公共工具的责任、隐私、支持和用户预期。', cards: ['清晰的所有权和联系渠道', '重视隐私的浏览器端流程', '安全使用的清晰预期'], categorySummary: '选择适合任务的工具，查看简短收益说明，并直接打开所需流程。', footerNote: 'MC NovaTools 保持公共页面一致、重视隐私且便于核验。' },
    ja: { pageLabel: '信頼とサポート', legalIntro: 'このページでは、MC NovaTools が公開ツールの責任、プライバシー、サポート、利用上の期待をどのように扱うかを説明します。', cards: ['明確な運営者情報と連絡手段', 'プライバシーを意識したブラウザー中心の流れ', '安全な利用のための分かりやすい前提'], categorySummary: '目的に合うツールを選び、短い利点を確認して、必要なワークフローを直接開けます。', footerNote: 'MC NovaTools は公開ページを一貫性があり、プライバシーに配慮し、確認しやすい状態に保ちます。' },
    ko: { pageLabel: '신뢰와 지원', legalIntro: '이 페이지는 MC NovaTools가 공개 도구의 책임, 개인정보, 지원, 사용자 기대를 어떻게 다루는지 설명합니다.', cards: ['명확한 소유자와 연락 경로', '개인정보를 고려한 브라우저 중심 작업 흐름', '안전한 사용을 위한 쉬운 기준'], categorySummary: '작업에 맞는 도구를 선택하고 짧은 이점 요약을 확인한 뒤 필요한 흐름을 바로 여세요.', footerNote: 'MC NovaTools는 공개 페이지를 일관되고 개인정보 친화적이며 확인하기 쉽게 유지합니다.' },
    hi: { pageLabel: 'विश्वास और सहायता', legalIntro: 'यह पृष्ठ बताता है कि MC NovaTools सार्वजनिक टूल के लिए जिम्मेदारी, गोपनीयता, सहायता और उपयोगकर्ता अपेक्षाओं को कैसे संभालता है।', cards: ['स्पष्ट स्वामित्व और संपर्क मार्ग', 'गोपनीयता-सचेत ब्राउज़र-आधारित कार्यप्रवाह', 'सुरक्षित उपयोग के लिए सरल अपेक्षाएँ'], categorySummary: 'अपने कार्य के लिए सही टूल चुनें, संक्षिप्त लाभ सार देखें और सही कार्यप्रवाह सीधे खोलें।', footerNote: 'MC NovaTools सार्वजनिक पृष्ठों को सुसंगत, गोपनीयता-सचेत और सत्यापित करने योग्य रखता है।' },
    it: { pageLabel: 'Fiducia e supporto', legalIntro: 'Questa pagina spiega come MC NovaTools gestisce responsabilità, privacy, supporto e aspettative degli utenti per gli strumenti pubblici.', cards: ['Proprietà e contatti chiari', 'Flussi nel browser attenti alla privacy', 'Aspettative semplici per un uso sicuro'], categorySummary: 'Scegli lo strumento adatto, leggi il breve riepilogo dei vantaggi e apri il flusso corretto senza passaggi extra.', footerNote: 'MC NovaTools mantiene le pagine pubbliche coerenti, attente alla privacy e facili da verificare.' },
    pl: { pageLabel: 'Zaufanie i wsparcie', legalIntro: 'Ta strona wyjaśnia, jak MC NovaTools opisuje odpowiedzialność, prywatność, wsparcie i oczekiwania użytkowników.', cards: ['Jasna własność i ścieżki kontaktu', 'Przepływy w przeglądarce z poszanowaniem prywatności', 'Proste oczekiwania dotyczące bezpiecznego użycia'], categorySummary: 'Wybierz właściwe narzędzie, sprawdź krótkie podsumowanie korzyści i otwórz odpowiedni przepływ bez zbędnej nawigacji.', footerNote: 'MC NovaTools utrzymuje publiczne strony spójne, prywatne i łatwe do sprawdzenia.' },
    nl: { pageLabel: 'Vertrouwen en ondersteuning', legalIntro: 'Deze pagina legt uit hoe MC NovaTools verantwoordelijkheid, privacy, ondersteuning en gebruikersverwachtingen voor openbare tools behandelt.', cards: ['Duidelijke eigenaar en contactroutes', 'Privacybewuste workflows in de browser', 'Eenvoudige verwachtingen voor veilig gebruik'], categorySummary: 'Kies de juiste tool, bekijk de korte voordelen en open de juiste workflow zonder extra navigatie.', footerNote: 'MC NovaTools houdt openbare pagina’s consistent, privacybewust en eenvoudig te controleren.' }
  };

  function enhancePublicSurfaces() {
    var copy = PUBLIC_COPY[currentLanguage] || PUBLIC_COPY.en;
    var path = window.location.pathname;
    var isTrustPage = /\/(about-us|contact|privacy-policy|terms-of-service|cookie-policy|security|request-tool)\.html$/.test(path);
    var isCategoryPage = /\/categories\//.test(path);

    if (isTrustPage) {
      var existingPanel = document.querySelector('.public-trust-upgrade');
      var hero = document.querySelector('.hero-card, .page-hero .container, main article, main section');
      var panel = existingPanel || document.createElement('section');
      panel.className = 'public-trust-upgrade';
      panel.setAttribute('aria-label', copy.pageLabel);
      panel.replaceChildren();
      var badge = document.createElement('div');
      badge.className = 'public-trust-badge';
      badge.textContent = copy.pageLabel;
      var intro = document.createElement('p');
      intro.textContent = copy.legalIntro;
      var list = document.createElement('div');
      list.className = 'public-trust-cards';
      copy.cards.forEach(function(text) {
        var card = document.createElement('div');
        card.textContent = text;
        list.appendChild(card);
      });
      panel.appendChild(badge);
      panel.appendChild(intro);
      panel.appendChild(list);
      if (!existingPanel && hero) hero.insertAdjacentElement('afterend', panel);

      var main = document.querySelector('main');
      if (main && currentLanguage !== 'en') {
        var names = {
          'about-us.html': { tr: 'Hakkımızda', ar: 'من نحن' },
          'contact.html': { tr: 'İletişim', ar: 'التواصل' },
          'privacy-policy.html': { tr: 'Gizlilik Politikası', ar: 'سياسة الخصوصية' },
          'terms-of-service.html': { tr: 'Hizmet Şartları', ar: 'شروط الخدمة' },
          'cookie-policy.html': { tr: 'Çerez Politikası', ar: 'سياسة ملفات تعريف الارتباط' },
          'security.html': { tr: 'Güvenlik', ar: 'الأمان' },
          'request-tool.html': { tr: 'Araç İsteği', ar: 'طلب أداة' }
        };
        var file = path.split('/').pop();
        var pageName = (names[file] && names[file][currentLanguage]) || copy.pageLabel;
        var localized = main.querySelector('.public-localized-content') || document.createElement('section');
        localized.className = 'public-localized-content';
        localized.replaceChildren();
        var h = document.createElement('h1');
        h.textContent = pageName;
        var p1 = document.createElement('p');
        p1.textContent = copy.legalIntro;
        var p2 = document.createElement('p');
        p2.textContent = copy.footerNote;
        localized.appendChild(h);
        localized.appendChild(p1);
        localized.appendChild(p2);
        if (!localized.parentElement) main.insertAdjacentElement('afterbegin', localized);
        main.classList.add('public-localized-mode');
      }
    }

    if (isCategoryPage) {
      document.querySelectorAll('.tool-card, .category-card, article.card, .card').forEach(function(card) {
        if (card.querySelector('.category-benefit-summary')) return;
        var p = document.createElement('p');
        p.className = 'category-benefit-summary';
        p.textContent = copy.categorySummary;
        card.appendChild(p);
      });
      document.querySelectorAll('footer .footer-grid + .footer-grid, footer .tool-footer + .tool-footer').forEach(function(el) { el.remove(); });
    }

    var footer = document.querySelector('footer');
    if (footer) {
      var note = footer.querySelector('.public-footer-note') || document.createElement('p');
      note.className = 'public-footer-note';
      note.textContent = copy.footerNote;
      if (!note.parentElement) footer.appendChild(note);
    }
  }



  var PHASE1_BLOG_SLUGS = {
    'compress-pdf-for-email-without-ruining-readability': 'compress',
    'merge-pdf-files-client-documents-checklist': 'merge',
    'split-pdf-pages-before-sharing-sensitive-sections': 'split',
    'pdf-to-word-when-to-convert-and-when-not-to': 'word',
    'pdf-to-text-clean-extraction-workflow': 'text',
    'pdf-watermark-before-client-review': 'watermark',
    'pdf-page-numbers-for-long-reports': 'numbers',
    'ocr-scanned-pdf-troubleshooting-guide': 'ocr',
    'pdf-to-jpg-vs-pdf-to-png': 'images',
    'prepare-pdf-records-for-tax-season': 'tax'
  };

  var PHASE1_TOPIC_TITLES = {
    en: {
      compress: 'How to Compress a PDF for Email Without Ruining Readability',
      merge: 'Merge PDF Files for Client Documents: A Practical Checklist',
      split: 'Split PDF Pages Before Sharing Only the Sections Someone Needs',
      word: 'PDF to Word: When to Convert and When Not To',
      text: 'PDF to Text: A Clean Extraction Workflow for Reusable Copy',
      watermark: 'PDF Watermarks Before Client Review: What to Add and What to Avoid',
      numbers: 'Add Page Numbers to Long PDFs Without Creating Confusion',
      ocr: 'OCR for Scanned PDFs: Troubleshooting Poor Text Recognition',
      images: 'PDF to JPG vs PDF to PNG: Which Export Should You Use?',
      tax: 'Prepare PDF Records for Tax Season Without a Last-Minute Mess'
    },
    tr: {
      compress: 'Okunabilirliği Bozmadan E-posta İçin PDF Sıkıştırma', merge: 'Müşteri Belgeleri İçin PDF Birleştirme: Pratik Kontrol Listesi', split: 'Yalnızca Gerekli Bölümleri Paylaşmak İçin PDF Sayfalarını Ayırma', word: 'PDF’den Word’e: Ne Zaman Dönüştürmeli, Ne Zaman Dönüştürmemeli', text: 'PDF’den Metne: Yeniden Kullanılabilir Kopya İçin Temiz Çıkarma Akışı', watermark: 'Müşteri İncelemesi Öncesi PDF Filigranı: Ne Eklenmeli, Nelerden Kaçınılmalı', numbers: 'Uzun PDF’lere Karışıklık Yaratmadan Sayfa Numarası Ekleme', ocr: 'Taranmış PDF’lerde OCR: Zayıf Metin Tanımayı Giderme', images: 'PDF’den JPG’ye mi PNG’ye mi: Hangi Dışa Aktarma Seçilmeli?', tax: 'Vergi Sezonu İçin PDF Kayıtlarını Son Dakika Karmaşası Olmadan Hazırlama'
    },
    de: {
      compress: 'PDF für E-Mail komprimieren, ohne die Lesbarkeit zu ruinieren', merge: 'PDF-Dateien für Kundendokumente zusammenführen: praktische Checkliste', split: 'PDF-Seiten teilen, bevor nur benötigte Abschnitte geteilt werden', word: 'PDF zu Word: wann konvertieren und wann nicht', text: 'PDF zu Text: sauberer Extraktionsworkflow für wiederverwendbare Inhalte', watermark: 'PDF-Wasserzeichen vor der Kundenprüfung: was hinzufügen und was vermeiden', numbers: 'Seitenzahlen zu langen PDFs hinzufügen, ohne Verwirrung zu schaffen', ocr: 'OCR für gescannte PDFs: schlechte Texterkennung beheben', images: 'PDF zu JPG oder PDF zu PNG: welchen Export sollten Sie nutzen?', tax: 'PDF-Unterlagen für die Steuersaison ohne Last-Minute-Chaos vorbereiten'
    },
    fr: {
      compress: 'Compresser un PDF pour l’e-mail sans nuire à la lisibilité', merge: 'Fusionner des PDF pour des documents client : liste de contrôle pratique', split: 'Diviser des pages PDF avant de partager seulement les sections nécessaires', word: 'PDF vers Word : quand convertir et quand éviter', text: 'PDF vers texte : workflow d’extraction propre pour le contenu réutilisable', watermark: 'Filigranes PDF avant revue client : quoi ajouter et éviter', numbers: 'Ajouter des numéros de page aux longs PDF sans créer de confusion', ocr: 'OCR pour PDF numérisés : résoudre une mauvaise reconnaissance du texte', images: 'PDF vers JPG ou PNG : quel export choisir ?', tax: 'Préparer les dossiers PDF pour la saison fiscale sans urgence de dernière minute'
    },
    es: {
      compress: 'Comprimir un PDF para correo sin arruinar la legibilidad', merge: 'Unir archivos PDF para documentos de clientes: lista práctica', split: 'Dividir páginas PDF antes de compartir solo las secciones necesarias', word: 'PDF a Word: cuándo convertir y cuándo no', text: 'PDF a texto: flujo limpio para extraer contenido reutilizable', watermark: 'Marcas de agua en PDF antes de revisión del cliente: qué añadir y evitar', numbers: 'Añadir números de página a PDF largos sin crear confusión', ocr: 'OCR para PDF escaneados: solución de reconocimiento deficiente', images: 'PDF a JPG o PDF a PNG: qué exportación usar', tax: 'Preparar registros PDF para la temporada de impuestos sin caos de último minuto'
    },
    pt: {
      compress: 'Comprimir um PDF para e-mail sem prejudicar a legibilidade', merge: 'Mesclar PDFs para documentos de clientes: checklist prático', split: 'Dividir páginas PDF antes de compartilhar apenas as seções necessárias', word: 'PDF para Word: quando converter e quando não converter', text: 'PDF para texto: fluxo limpo de extração para conteúdo reutilizável', watermark: 'Marca d’água em PDF antes da revisão do cliente: o que adicionar e evitar', numbers: 'Adicionar números de página a PDFs longos sem gerar confusão', ocr: 'OCR em PDFs digitalizados: corrigindo reconhecimento de texto ruim', images: 'PDF para JPG ou PNG: qual exportação usar?', tax: 'Preparar registros em PDF para a temporada de impostos sem correria final'
    },
    ru: {
      compress: 'Как сжать PDF для письма без потери читаемости', merge: 'Объединение PDF для клиентских документов: практический чек-лист', split: 'Разделение страниц PDF перед отправкой только нужных разделов', word: 'PDF в Word: когда конвертировать, а когда нет', text: 'PDF в текст: чистый процесс извлечения для повторного использования', watermark: 'Водяные знаки PDF перед проверкой клиентом: что добавить и чего избегать', numbers: 'Как добавить номера страниц в длинные PDF без путаницы', ocr: 'OCR для сканированных PDF: устранение плохого распознавания текста', images: 'PDF в JPG или PNG: какой экспорт выбрать', tax: 'Подготовка PDF-записей к налоговому сезону без спешки'
    },
    zh: {
      compress: '在不影响可读性的情况下压缩电子邮件用 PDF', merge: '为客户文件合并 PDF：实用检查清单', split: '只分享所需部分前拆分 PDF 页面', word: 'PDF 转 Word：何时转换，何时不要转换', text: 'PDF 转文本：可复用内容的清洁提取流程', watermark: '客户审阅前的 PDF 水印：该添加什么、避免什么', numbers: '为长 PDF 添加页码且不造成混乱', ocr: '扫描 PDF 的 OCR：排查文本识别不佳', images: 'PDF 转 JPG 还是 PNG：应选择哪种导出', tax: '为报税季准备 PDF 记录，避免最后一刻混乱'
    },
    ja: {
      compress: '読みやすさを損なわずにメール用PDFを圧縮する方法', merge: 'クライアント文書向けPDF結合の実用チェックリスト', split: '必要な部分だけ共有する前にPDFページを分割する', word: 'PDFからWordへ：変換すべき時と避けるべき時', text: 'PDFからテキストへ：再利用しやすいコピーの抽出手順', watermark: 'クライアント確認前のPDF透かし：追加するものと避けるもの', numbers: '長いPDFに混乱なくページ番号を追加する', ocr: 'スキャンPDFのOCR：認識精度が低い時の確認', images: 'PDFをJPGにするかPNGにするか：選ぶべき書き出し', tax: '税務シーズンのPDF記録を直前に慌てず準備する'
    },
    ko: {
      compress: '가독성을 해치지 않고 이메일용 PDF 압축하기', merge: '고객 문서용 PDF 병합: 실용 체크리스트', split: '필요한 섹션만 공유하기 전에 PDF 페이지 나누기', word: 'PDF를 Word로: 변환할 때와 피해야 할 때', text: 'PDF를 텍스트로: 재사용 가능한 복사를 위한 깔끔한 추출 흐름', watermark: '고객 검토 전 PDF 워터마크: 추가할 것과 피할 것', numbers: '긴 PDF에 혼란 없이 페이지 번호 추가하기', ocr: '스캔 PDF OCR: 낮은 텍스트 인식 문제 해결', images: 'PDF를 JPG로 또는 PNG로: 어떤 내보내기를 선택할까', tax: '세금 시즌용 PDF 기록을 막판 혼란 없이 준비하기'
    },
    ar: {
      compress: 'ضغط PDF للبريد الإلكتروني دون إفساد قابلية القراءة', merge: 'دمج ملفات PDF لمستندات العملاء: قائمة تحقق عملية', split: 'تقسيم صفحات PDF قبل مشاركة الأقسام المطلوبة فقط', word: 'PDF إلى Word: متى تحوّل ومتى لا تفعل', text: 'PDF إلى نص: سير استخراج نظيف لنسخة قابلة لإعادة الاستخدام', watermark: 'علامات PDF المائية قبل مراجعة العميل: ما الذي تضيفه وما الذي تتجنبه', numbers: 'إضافة أرقام صفحات إلى ملفات PDF طويلة دون إرباك', ocr: 'OCR للملفات الممسوحة: معالجة ضعف التعرف على النص', images: 'PDF إلى JPG أم PNG: أي تصدير تستخدم؟', tax: 'تحضير سجلات PDF لموسم الضرائب دون فوضى اللحظة الأخيرة'
    },
    hi: {
      compress: 'पढ़ने योग्य रखकर ईमेल के लिए PDF संपीड़ित करें', merge: 'क्लाइंट दस्तावेज़ों के लिए PDF मिलाना: व्यावहारिक चेकलिस्ट', split: 'केवल ज़रूरी हिस्से साझा करने से पहले PDF पृष्ठ अलग करें', word: 'PDF से Word: कब बदलें और कब नहीं', text: 'PDF से टेक्स्ट: दोबारा उपयोग योग्य कॉपी के लिए साफ़ निष्कर्षण', watermark: 'क्लाइंट समीक्षा से पहले PDF वॉटरमार्क: क्या जोड़ें और क्या बचें', numbers: 'लंबे PDF में भ्रम के बिना पृष्ठ संख्या जोड़ें', ocr: 'स्कैन PDF के लिए OCR: खराब टेक्स्ट पहचान की जाँच', images: 'PDF से JPG या PNG: कौन सा निर्यात चुनें', tax: 'कर सीज़न के लिए PDF रिकॉर्ड अंतिम समय की अव्यवस्था के बिना तैयार करें'
    },
    it: {
      compress: 'Comprimere un PDF per e-mail senza rovinare la leggibilità', merge: 'Unire PDF per documenti cliente: checklist pratica', split: 'Dividere pagine PDF prima di condividere solo le sezioni necessarie', word: 'Da PDF a Word: quando convertire e quando no', text: 'Da PDF a testo: flusso pulito per contenuti riutilizzabili', watermark: 'Filigrane PDF prima della revisione cliente: cosa aggiungere ed evitare', numbers: 'Aggiungere numeri di pagina a PDF lunghi senza creare confusione', ocr: 'OCR per PDF scansionati: risolvere un riconoscimento scarso', images: 'PDF in JPG o PNG: quale esportazione usare?', tax: 'Preparare i record PDF per la stagione fiscale senza caos finale'
    },
    pl: {
      compress: 'Kompresja PDF do e-maila bez psucia czytelności', merge: 'Łączenie PDF dla dokumentów klienta: praktyczna lista kontrolna', split: 'Dzielenie stron PDF przed udostępnieniem tylko potrzebnych sekcji', word: 'PDF do Worda: kiedy konwertować, a kiedy nie', text: 'PDF do tekstu: czysty przepływ ekstrakcji do ponownego użycia', watermark: 'Znaki wodne PDF przed recenzją klienta: co dodać i czego unikać', numbers: 'Dodawanie numerów stron do długich PDF bez zamieszania', ocr: 'OCR dla skanowanych PDF: rozwiązywanie słabego rozpoznawania tekstu', images: 'PDF do JPG czy PNG: który eksport wybrać?', tax: 'Przygotowanie zapisów PDF na sezon podatkowy bez chaosu na końcu'
    },
    nl: {
      compress: 'Een PDF voor e-mail comprimeren zonder leesbaarheid te verpesten', merge: 'PDF’s samenvoegen voor klantdocumenten: praktische checklist', split: 'PDF-pagina’s splitsen voordat u alleen noodzakelijke delen deelt', word: 'PDF naar Word: wanneer converteren en wanneer niet', text: 'PDF naar tekst: schone extractieworkflow voor herbruikbare tekst', watermark: 'PDF-watermerken vóór klantreview: wat toevoegen en vermijden', numbers: 'Paginanummers toevoegen aan lange PDF’s zonder verwarring', ocr: 'OCR voor gescande PDF’s: slechte tekstherkenning oplossen', images: 'PDF naar JPG of PNG: welke export gebruikt u?', tax: 'PDF-administratie voorbereiden op belastingseizoen zonder last-minute chaos'
    }
  };

  var PHASE1_COPY = {
    en: null,
    tr: { nav: ['Kategoriler', 'PDF', 'Görsel', 'Geliştirici', 'Blog'], pdf: 'PDF iş akışları', cover: 'PDF iş akışı', read: '10 dk okuma', lede: '{topic} rehberi; kaynağı, hedefi ve alıcının gerçekten neye ihtiyaç duyduğunu netleştirerek güvenilir bir PDF çıktısı hazırlamanıza yardımcı olur.', summary: 'Kısa özet:', summaryText: '{topic} için orijinali koruyun, tek bir geri alınabilir değişiklik yapın, sonucu kontrol edin ve sonraki paylaşım adımını netleştirin.', openTool: 'PDF aracını aç', viewTools: 'PDF araçlarını görüntüle', headings: ['Kaynağı ve hedefi netleştirin','Orijinali koruyun','Tek değişiklik yapın','Kırılabilecek noktaları kontrol edin','Dosyayı anlaşılır adlandırın','Bağlam ekleyin','Sonucu alıcı gibi inceleyin','Tarayıcı aracının yeterli olduğu yeri bilin','Bunu tekrar edilebilir alışkanlığa çevirin','Son paylaşım kontrolünü yapın'], body: '{topic} için hızlı ama güvenli ilerleyin: dosyanın amacını not edin, sayfa sırasını ve okunabilirliği gözden geçirin, çıktı hazır olmadan orijinali silmeyin.', detail: 'Sonucu indirdikten sonra e-posta, klasör, müşteri paketi veya arşiv gibi gerçek kullanım yerinde açıp kontrol edin.', relatedHeading: 'İlgili araçlar ve okuma yolları', relatedParagraph: 'Sonraki adım, oluşturduğunuz PDF çıktısına bağlıdır. Gerekirse kategori merkezini açın veya benzer rehberlerle karşılaştırın.', openToolLabel: 'Araç aç', openCategory: 'Kategori aç', relatedGuide: 'İlgili rehber', faqHeading: 'Sık sorulan sorular', faqQ1: 'Bu işlem her PDF için gerekli mi?', faqA1: 'Hayır. Yalnızca hedef, boyut, düzen veya paylaşım ihtiyacı bunu gerektiriyorsa uygulayın ve sonucu mutlaka kontrol edin.', faqQ2: 'En güvenli çalışma şekli nedir?', faqA2: 'Orijinali saklamak, tek ayarı değiştirmek, çıktıyı açıp kontrol etmek ve dosyayı açık bir adla kaydetmektir.', conclusionHeading: 'Sonuç', conclusion: '{topic} en iyi görünür bir iş akışıyla yönetilir: kaynağı koruyun, amacı belirleyin, çıktıyı kontrol edin ve paylaşmadan önce alıcının kullanabileceğinden emin olun.', footer: '© 2026 MC NovaTools. Pratik çevrimiçi araçlar ve rehberler.', footerLinks: ['Gizlilik','Şartlar','İletişim'] },
    de: { nav: ['Kategorien','PDF','Bild','Entwickler','Blog'], pdf: 'PDF-Workflows', cover: 'PDF-Workflow', read: '10 Min. Lesezeit', lede: 'Dieser Leitfaden zu {topic} hilft, Quelle, Ziel und Empfängerbedarf zu klären, damit die PDF-Ausgabe verlässlich bleibt.', summary: 'Kurzzusammenfassung:', summaryText: 'Für {topic}: Original behalten, eine umkehrbare Änderung vornehmen, Ergebnis prüfen und den nächsten Übergabeschritt klären.', openTool: 'PDF-Tool öffnen', viewTools: 'PDF-Tools anzeigen', headings: ['Quelle und Ziel klären','Original behalten','Nur eine Änderung vornehmen','Bruchstellen prüfen','Datei klar benennen','Kontext hinzufügen','Ausgabe wie der Empfänger prüfen','Grenzen des Browser-Tools kennen','Als wiederholbare Routine nutzen','Letzte Freigabe prüfen'], body: 'Gehen Sie bei {topic} schnell, aber kontrolliert vor: Zweck notieren, Seitenfolge und Lesbarkeit prüfen und das Original nicht löschen.', detail: 'Öffnen Sie die Ausgabe nach dem Download dort, wo sie wirklich verwendet wird: E-Mail, Ordner, Kundenpaket oder Archiv.', relatedHeading: 'Verwandte Tools und Lesepfade', relatedParagraph: 'Der nächste Schritt hängt von der erstellten PDF-Ausgabe ab. Öffnen Sie bei Bedarf den Kategorie-Hub oder vergleichen Sie ähnliche Leitfäden.', openToolLabel: 'Tool öffnen', openCategory: 'Kategorie öffnen', relatedGuide: 'Verwandter Leitfaden', faqHeading: 'Häufig gestellte Fragen', faqQ1: 'Ist dieser Schritt für jede PDF nötig?', faqA1: 'Nein. Nutzen Sie ihn nur, wenn Ziel, Größe, Layout oder Freigabe es erfordern, und prüfen Sie das Ergebnis.', faqQ2: 'Was ist der sicherste Ablauf?', faqA2: 'Original behalten, nur eine Einstellung ändern, Ausgabe öffnen und prüfen, dann klar benennen.', conclusionHeading: 'Fazit', conclusion: '{topic} funktioniert am besten mit einem sichtbaren Workflow: Quelle schützen, Zweck festlegen, Ausgabe prüfen und erst dann teilen.', footer: '© 2026 MC NovaTools. Praktische Online-Tools und Leitfäden.', footerLinks: ['Datenschutz','Bedingungen','Kontakt'] },
    fr: { nav: ['Catégories','PDF','Image','Développeur','Blog'], pdf: 'Flux PDF', cover: 'Workflow PDF', read: '10 min de lecture', lede: 'Ce guide sur {topic} aide à clarifier la source, la destination et le besoin du destinataire pour produire un PDF fiable.', summary: 'Résumé rapide :', summaryText: 'Pour {topic}, gardez l’original, faites une modification réversible, vérifiez le résultat et clarifiez l’étape suivante.', openTool: 'Ouvrir l’outil PDF', viewTools: 'Voir les outils PDF', headings: ['Clarifier la source et la destination','Conserver l’original','Faire une seule modification','Vérifier les points fragiles','Nommer le fichier clairement','Ajouter le contexte','Relire comme le destinataire','Connaître les limites du navigateur','Créer une routine répétable','Faire le contrôle final'], body: 'Pour {topic}, avancez vite mais avec contrôle : notez l’objectif, vérifiez l’ordre des pages et la lisibilité, puis gardez l’original.', detail: 'Après téléchargement, ouvrez le résultat dans son vrai contexte : e-mail, dossier, paquet client ou archive.', relatedHeading: 'Outils liés et parcours de lecture', relatedParagraph: 'La suite dépend du PDF obtenu. Ouvrez le hub de catégorie si nécessaire ou comparez des guides similaires.', openToolLabel: 'Ouvrir un outil', openCategory: 'Ouvrir une catégorie', relatedGuide: 'Guide lié', faqHeading: 'Questions fréquentes', faqQ1: 'Cette étape est-elle nécessaire pour chaque PDF ?', faqA1: 'Non. Utilisez-la seulement si la destination, la taille, la mise en page ou le partage l’exige, puis vérifiez le résultat.', faqQ2: 'Quel est le flux le plus sûr ?', faqA2: 'Conserver l’original, changer un seul réglage, ouvrir et vérifier la sortie, puis nommer clairement le fichier.', conclusionHeading: 'Conclusion', conclusion: '{topic} se gère mieux avec un workflow visible : protéger la source, définir l’objectif, vérifier la sortie et partager seulement après contrôle.', footer: '© 2026 MC NovaTools. Outils et guides en ligne pratiques.', footerLinks: ['Confidentialité','Conditions','Contact'] },
    es: { nav: ['Categorías','PDF','Imagen','Desarrollador','Blog'], pdf: 'Flujos PDF', cover: 'Flujo PDF', read: '10 min de lectura', lede: 'Esta guía sobre {topic} ayuda a aclarar la fuente, el destino y lo que necesita el destinatario para crear un PDF confiable.', summary: 'Resumen rápido:', summaryText: 'Para {topic}, conserve el original, haga un cambio reversible, revise el resultado y defina el siguiente paso.', openTool: 'Abrir herramienta PDF', viewTools: 'Ver herramientas PDF', headings: ['Aclare fuente y destino','Conserve el original','Haga un solo cambio','Revise las partes frágiles','Nombre el archivo con claridad','Añada contexto','Revise como destinatario','Sepa cuándo basta el navegador','Conviértalo en rutina','Haga la revisión final'], body: 'Para {topic}, avance rápido pero con control: anote el propósito, revise orden de páginas y legibilidad, y no borre el original.', detail: 'Después de descargar, abra el resultado donde se usará realmente: correo, carpeta, paquete de cliente o archivo.', relatedHeading: 'Herramientas relacionadas y rutas de lectura', relatedParagraph: 'El siguiente paso depende del PDF creado. Abra la categoría si hace falta o compare guías similares.', openToolLabel: 'Abrir herramienta', openCategory: 'Abrir categoría', relatedGuide: 'Guía relacionada', faqHeading: 'Preguntas frecuentes', faqQ1: '¿Es necesario para todos los PDF?', faqA1: 'No. Úselo solo si el destino, tamaño, diseño o forma de compartir lo requiere, y revise el resultado.', faqQ2: '¿Cuál es el flujo más seguro?', faqA2: 'Guardar el original, cambiar una sola opción, abrir y revisar la salida, y nombrar el archivo claramente.', conclusionHeading: 'Conclusión', conclusion: '{topic} funciona mejor con un flujo visible: proteja la fuente, defina el objetivo, revise la salida y comparta solo cuando sea usable.', footer: '© 2026 MC NovaTools. Herramientas y guías en línea prácticas.', footerLinks: ['Privacidad','Términos','Contacto'] },
    pt: { nav: ['Categorias','PDF','Imagem','Desenvolvedor','Blog'], pdf: 'Fluxos PDF', cover: 'Fluxo PDF', read: '10 min de leitura', lede: 'Este guia sobre {topic} ajuda a alinhar origem, destino e necessidade do destinatário para gerar um PDF confiável.', summary: 'Resumo rápido:', summaryText: 'Para {topic}, guarde o original, faça uma alteração reversível, revise o resultado e defina o próximo passo.', openTool: 'Abrir ferramenta PDF', viewTools: 'Ver ferramentas PDF', headings: ['Esclareça origem e destino','Guarde o original','Faça uma mudança por vez','Revise pontos frágeis','Nomeie claramente','Adicione contexto','Revise como destinatário','Saiba quando o navegador basta','Transforme em rotina','Faça a revisão final'], body: 'Para {topic}, avance com rapidez e controle: anote o objetivo, confira ordem das páginas e legibilidade, e preserve o original.', detail: 'Depois de baixar, abra o resultado no local real de uso: e-mail, pasta, pacote de cliente ou arquivo.', relatedHeading: 'Ferramentas relacionadas e caminhos de leitura', relatedParagraph: 'O próximo passo depende do PDF criado. Abra a categoria se necessário ou compare guias semelhantes.', openToolLabel: 'Abrir ferramenta', openCategory: 'Abrir categoria', relatedGuide: 'Guia relacionado', faqHeading: 'Perguntas frequentes', faqQ1: 'Isso é necessário para todo PDF?', faqA1: 'Não. Use apenas se destino, tamanho, layout ou compartilhamento exigirem, e revise o resultado.', faqQ2: 'Qual é o fluxo mais seguro?', faqA2: 'Manter o original, alterar uma configuração, abrir e conferir a saída, e salvar com nome claro.', conclusionHeading: 'Conclusão', conclusion: '{topic} funciona melhor com um fluxo visível: proteja a fonte, defina o objetivo, revise a saída e compartilhe apenas quando estiver utilizável.', footer: '© 2026 MC NovaTools. Ferramentas e guias online práticos.', footerLinks: ['Privacidade','Termos','Contato'] },
    ru: { nav: ['Категории','PDF','Изображения','Разработчику','Блог'], pdf: 'PDF-процессы', cover: 'PDF-процесс', read: '10 мин чтения', lede: 'Руководство по теме «{topic}» помогает уточнить источник, цель и потребности получателя, чтобы PDF оставался надежным.', summary: 'Краткое резюме:', summaryText: 'Для «{topic}» сохраните оригинал, сделайте одно обратимое изменение, проверьте результат и определите следующий шаг.', openTool: 'Открыть PDF-инструмент', viewTools: 'Смотреть PDF-инструменты', headings: ['Уточните источник и цель','Сохраните оригинал','Меняйте по одному параметру','Проверьте слабые места','Назовите файл понятно','Добавьте контекст','Проверьте как получатель','Знайте пределы браузерного инструмента','Сделайте это привычкой','Проведите финальную проверку'], body: 'Для «{topic}» действуйте быстро, но контролируемо: зафиксируйте цель, проверьте порядок страниц и читаемость, не удаляйте оригинал.', detail: 'После загрузки откройте результат там, где он будет использован: в письме, папке, клиентском пакете или архиве.', relatedHeading: 'Связанные инструменты и маршруты чтения', relatedParagraph: 'Следующий шаг зависит от созданного PDF. При необходимости откройте категорию или сравните похожие руководства.', openToolLabel: 'Открыть инструмент', openCategory: 'Открыть категорию', relatedGuide: 'Связанное руководство', faqHeading: 'Частые вопросы', faqQ1: 'Нужно ли это для каждого PDF?', faqA1: 'Нет. Используйте только если цель, размер, макет или передача этого требуют, и обязательно проверьте результат.', faqQ2: 'Какой процесс самый безопасный?', faqA2: 'Сохранить оригинал, изменить один параметр, открыть и проверить результат, затем дать понятное имя.', conclusionHeading: 'Итог', conclusion: '«{topic}» лучше всего работает с видимым процессом: защитите источник, задайте цель, проверьте вывод и только потом делитесь.', footer: '© 2026 MC NovaTools. Практичные онлайн-инструменты и руководства.', footerLinks: ['Конфиденциальность','Условия','Контакты'] },
    zh: { nav: ['分类','PDF','图片','开发者','博客'], pdf: 'PDF 工作流', cover: 'PDF 工作流', read: '10 分钟阅读', lede: '本指南围绕“{topic}”，帮助你明确来源、目标和接收者需求，得到更可靠的 PDF 输出。', summary: '快速摘要：', summaryText: '处理“{topic}”时，请保留原件，只做一个可撤销更改，检查结果，并明确下一步交付。', openTool: '打开 PDF 工具', viewTools: '查看 PDF 工具', headings: ['明确来源和目标','保留原始文件','一次只改一项','检查易出错部分','清楚命名文件','补充上下文','像接收者一样检查','了解浏览器工具边界','形成可重复习惯','完成最终检查'], body: '处理“{topic}”要快速但受控：记录用途，检查页序和可读性，并在确认前不要删除原始文件。', detail: '下载后，请在实际使用场景中打开结果，例如邮件、文件夹、客户包或归档位置。', relatedHeading: '相关工具和阅读路径', relatedParagraph: '下一步取决于你创建的 PDF。需要时打开分类中心，或与相似指南对照。', openToolLabel: '打开工具', openCategory: '打开分类', relatedGuide: '相关指南', faqHeading: '常见问题', faqQ1: '每个 PDF 都需要这样处理吗？', faqA1: '不需要。只有目标、大小、版式或共享方式需要时才使用，并务必检查结果。', faqQ2: '最安全的流程是什么？', faqA2: '保留原件，只改一个设置，打开并检查输出，然后用清楚的名称保存。', conclusionHeading: '结论', conclusion: '“{topic}”最适合用可见流程处理：保护来源，确定目标，检查输出，确认可用后再分享。', footer: '© 2026 MC NovaTools。实用在线工具和指南。', footerLinks: ['隐私','条款','联系'] },
    ja: { nav: ['カテゴリー','PDF','画像','開発者','ブログ'], pdf: 'PDFワークフロー', cover: 'PDFワークフロー', read: '10分で読めます', lede: 'この「{topic}」ガイドは、元ファイル、利用先、受け手の必要事項を整理し、信頼できるPDF出力を作るためのものです。', summary: 'クイック要約:', summaryText: '{topic}では、元ファイルを残し、戻せる変更を一つだけ行い、結果を確認して次の受け渡しを明確にします。', openTool: 'PDFツールを開く', viewTools: 'PDFツールを見る', headings: ['元ファイルと目的を確認する','元ファイルを残す','変更は一つずつ行う','壊れやすい部分を確認する','分かりやすく命名する','文脈を添える','受け手の目線で確認する','ブラウザツールの限界を知る','繰り返せる習慣にする','最後の共有確認を行う'], body: '{topic}では、目的を記録し、ページ順と読みやすさを確認し、確定前に元ファイルを削除しないことが大切です。', detail: 'ダウンロード後は、メール、フォルダー、クライアント資料、アーカイブなど実際の利用場所で開いて確認します。', relatedHeading: '関連ツールと読む順序', relatedParagraph: '次の手順は作成したPDFによって変わります。必要ならカテゴリーを開き、似たガイドと比較してください。', openToolLabel: 'ツールを開く', openCategory: 'カテゴリーを開く', relatedGuide: '関連ガイド', faqHeading: 'よくある質問', faqQ1: 'すべてのPDFで必要ですか？', faqA1: 'いいえ。目的、サイズ、レイアウト、共有方法が必要とする場合だけ行い、結果を確認してください。', faqQ2: '最も安全な流れは何ですか？', faqA2: '元ファイルを保存し、一つの設定だけ変更し、出力を開いて確認し、分かりやすい名前で保存することです。', conclusionHeading: 'まとめ', conclusion: '{topic}は、元ファイルを守り、目的を決め、出力を確認してから共有する見えるワークフローで扱うのが安全です。', footer: '© 2026 MC NovaTools。実用的なオンラインツールとガイド。', footerLinks: ['プライバシー','利用規約','連絡先'] },
    ko: { nav: ['카테고리','PDF','이미지','개발자','블로그'], pdf: 'PDF 워크플로', cover: 'PDF 워크플로', read: '10분 읽기', lede: '{topic} 가이드는 원본, 목적지, 받는 사람의 필요를 분명히 하여 신뢰할 수 있는 PDF 결과를 만드는 데 도움을 줍니다.', summary: '빠른 요약:', summaryText: '{topic}에서는 원본을 보관하고, 되돌릴 수 있는 변경을 하나만 적용한 뒤 결과와 다음 전달 단계를 확인하세요.', openTool: 'PDF 도구 열기', viewTools: 'PDF 도구 보기', headings: ['원본과 목적 확인','원본 보관','한 번에 하나만 변경','깨지기 쉬운 부분 확인','파일 이름 명확히 지정','맥락 추가','수신자 관점에서 검토','브라우저 도구의 한계 이해','반복 가능한 습관 만들기','최종 공유 확인'], body: '{topic}에서는 빠르지만 통제된 방식이 필요합니다. 목적을 적고, 페이지 순서와 가독성을 확인하며, 확정 전 원본을 삭제하지 마세요.', detail: '다운로드 후 이메일, 폴더, 고객 패키지 또는 보관 위치처럼 실제 사용될 곳에서 결과를 열어 확인하세요.', relatedHeading: '관련 도구와 읽기 경로', relatedParagraph: '다음 단계는 만든 PDF 결과에 따라 달라집니다. 필요하면 카테고리를 열거나 비슷한 가이드와 비교하세요.', openToolLabel: '도구 열기', openCategory: '카테고리 열기', relatedGuide: '관련 가이드', faqHeading: '자주 묻는 질문', faqQ1: '모든 PDF에 필요한가요?', faqA1: '아니요. 목적, 크기, 레이아웃 또는 공유 방식이 필요할 때만 사용하고 결과를 확인하세요.', faqQ2: '가장 안전한 흐름은 무엇인가요?', faqA2: '원본 보관, 설정 하나 변경, 출력 열람과 확인, 명확한 파일명 저장입니다.', conclusionHeading: '결론', conclusion: '{topic}은 원본 보호, 목적 정의, 출력 확인, 공유 전 사용 가능성 확인이라는 보이는 흐름에서 가장 안전합니다.', footer: '© 2026 MC NovaTools. 실용적인 온라인 도구와 가이드.', footerLinks: ['개인정보','약관','문의'] },
    ar: { nav: ['الفئات','PDF','الصور','المطور','المدونة'], pdf: 'سير عمل PDF', cover: 'سير عمل PDF', read: 'قراءة 10 دقائق', lede: 'يساعدك دليل {topic} على توضيح المصدر والوجهة واحتياج المستلم حتى يبقى ناتج PDF موثوقًا.', summary: 'ملخص سريع:', summaryText: 'في {topic} احتفظ بالأصل، أجرِ تغييرًا واحدًا قابلًا للتراجع، راجع النتيجة، وحدد خطوة التسليم التالية.', openTool: 'افتح أداة PDF', viewTools: 'عرض أدوات PDF', headings: ['وضّح المصدر والوجهة','احتفظ بالأصل','غيّر خطوة واحدة فقط','راجع الأجزاء المعرضة للمشكلة','سمِّ الملف بوضوح','أضف السياق','راجع كأنك المستلم','اعرف حدود أداة المتصفح','حوّلها إلى عادة قابلة للتكرار','نفّذ مراجعة المشاركة النهائية'], body: 'في {topic} تقدّم بسرعة لكن بحذر: اكتب الغرض، راجع ترتيب الصفحات وقابلية القراءة، ولا تحذف الأصل قبل التأكد.', detail: 'بعد التنزيل افتح الناتج في مكان استخدامه الفعلي، مثل البريد أو المجلد أو حزمة العميل أو الأرشيف.', relatedHeading: 'أدوات ومسارات قراءة ذات صلة', relatedParagraph: 'تعتمد الخطوة التالية على ملف PDF الذي أنشأته. افتح مركز الفئة عند الحاجة أو قارن مع أدلة مشابهة.', openToolLabel: 'افتح أداة', openCategory: 'افتح فئة', relatedGuide: 'دليل مرتبط', faqHeading: 'الأسئلة الشائعة', faqQ1: 'هل يلزم ذلك لكل ملف PDF؟', faqA1: 'لا. استخدمه فقط عندما تتطلب الوجهة أو الحجم أو التخطيط أو المشاركة ذلك، ثم راجع النتيجة.', faqQ2: 'ما سير العمل الأكثر أمانًا؟', faqA2: 'الاحتفاظ بالأصل، تغيير إعداد واحد، فتح الناتج ومراجعته، ثم حفظه باسم واضح.', conclusionHeading: 'الخلاصة', conclusion: 'يُدار {topic} بشكل أفضل عبر سير عمل واضح: احمِ المصدر، حدد الغرض، راجع الناتج، ولا تشاركه إلا بعد التأكد من صلاحيته.', footer: '© 2026 MC NovaTools. أدوات وأدلة عملية عبر الإنترنت.', footerLinks: ['الخصوصية','الشروط','التواصل'] },
    hi: { nav: ['श्रेणियाँ','PDF','छवि','डेवलपर','ब्लॉग'], pdf: 'PDF वर्कफ़्लो', cover: 'PDF वर्कफ़्लो', read: '10 मिनट पढ़ें', lede: '{topic} गाइड स्रोत, लक्ष्य और प्राप्तकर्ता की ज़रूरत स्पष्ट करके भरोसेमंद PDF आउटपुट बनाने में मदद करता है।', summary: 'त्वरित सारांश:', summaryText: '{topic} में मूल फ़ाइल रखें, एक उलटने योग्य बदलाव करें, परिणाम जाँचें और अगला साझा कदम स्पष्ट करें।', openTool: 'PDF टूल खोलें', viewTools: 'PDF टूल देखें', headings: ['स्रोत और लक्ष्य स्पष्ट करें','मूल फ़ाइल सुरक्षित रखें','एक बार में एक बदलाव करें','कमज़ोर हिस्से जाँचें','फ़ाइल को स्पष्ट नाम दें','संदर्भ जोड़ें','प्राप्तकर्ता की तरह समीक्षा करें','ब्राउज़र टूल की सीमा जानें','दोहराने योग्य आदत बनाएँ','अंतिम साझा जाँच करें'], body: '{topic} में तेज़ लेकिन नियंत्रित रहें: उद्देश्य लिखें, पृष्ठ क्रम और पठनीयता जाँचें, और पुष्टि से पहले मूल फ़ाइल न हटाएँ।', detail: 'डाउनलोड के बाद परिणाम को ईमेल, फ़ोल्डर, क्लाइंट पैकेट या आर्काइव जैसे वास्तविक उपयोग स्थान में खोलकर जाँचें।', relatedHeading: 'संबंधित टूल और पढ़ने के रास्ते', relatedParagraph: 'अगला कदम बनाए गए PDF पर निर्भर करता है। ज़रूरत हो तो श्रेणी केंद्र खोलें या मिलते-जुलते गाइड देखें।', openToolLabel: 'टूल खोलें', openCategory: 'श्रेणी खोलें', relatedGuide: 'संबंधित गाइड', faqHeading: 'अक्सर पूछे जाने वाले प्रश्न', faqQ1: 'क्या यह हर PDF के लिए ज़रूरी है?', faqA1: 'नहीं। इसे तभी उपयोग करें जब लक्ष्य, आकार, लेआउट या साझा करने का तरीका इसकी माँग करे, और परिणाम जाँचें।', faqQ2: 'सबसे सुरक्षित प्रक्रिया क्या है?', faqA2: 'मूल फ़ाइल रखना, एक सेटिंग बदलना, आउटपुट खोलकर जाँचना और स्पष्ट नाम से सहेजना।', conclusionHeading: 'निष्कर्ष', conclusion: '{topic} सबसे अच्छा तब संभलता है जब प्रक्रिया दिखाई दे: स्रोत सुरक्षित रखें, उद्देश्य तय करें, आउटपुट जाँचें और उपयोग योग्य होने पर ही साझा करें।', footer: '© 2026 MC NovaTools. व्यावहारिक ऑनलाइन टूल और गाइड।', footerLinks: ['गोपनीयता','शर्तें','संपर्क'] },
    it: { nav: ['Categorie','PDF','Immagini','Sviluppatore','Blog'], pdf: 'Workflow PDF', cover: 'Workflow PDF', read: '10 min di lettura', lede: 'Questa guida su {topic} chiarisce sorgente, destinazione e necessità del destinatario per creare un PDF affidabile.', summary: 'Riepilogo rapido:', summaryText: 'Per {topic}, conserva l’originale, fai una modifica reversibile, controlla il risultato e chiarisci il passaggio successivo.', openTool: 'Apri strumento PDF', viewTools: 'Vedi strumenti PDF', headings: ['Chiarisci origine e destinazione','Conserva l’originale','Fai una modifica alla volta','Controlla le parti fragili','Nomina il file chiaramente','Aggiungi contesto','Rivedi come destinatario','Conosci i limiti del browser','Rendilo un’abitudine','Fai il controllo finale'], body: 'Per {topic}, procedi rapidamente ma con controllo: annota lo scopo, verifica ordine pagine e leggibilità, e non eliminare l’originale.', detail: 'Dopo il download, apri il risultato dove sarà usato davvero: e-mail, cartella, pacchetto cliente o archivio.', relatedHeading: 'Strumenti correlati e percorsi di lettura', relatedParagraph: 'Il passo successivo dipende dal PDF creato. Apri la categoria se serve o confronta guide simili.', openToolLabel: 'Apri strumento', openCategory: 'Apri categoria', relatedGuide: 'Guida correlata', faqHeading: 'Domande frequenti', faqQ1: 'Serve per ogni PDF?', faqA1: 'No. Usalo solo se destinazione, dimensione, layout o condivisione lo richiedono, poi controlla il risultato.', faqQ2: 'Qual è il flusso più sicuro?', faqA2: 'Conservare l’originale, cambiare una sola impostazione, aprire e controllare l’output, quindi salvarlo con nome chiaro.', conclusionHeading: 'Conclusione', conclusion: '{topic} funziona meglio con un workflow visibile: proteggi la sorgente, definisci lo scopo, controlla l’output e condividi solo quando è utilizzabile.', footer: '© 2026 MC NovaTools. Strumenti e guide online pratici.', footerLinks: ['Privacy','Termini','Contatto'] },
    pl: { nav: ['Kategorie','PDF','Obrazy','Deweloper','Blog'], pdf: 'Przepływy PDF', cover: 'Przepływ PDF', read: '10 min czytania', lede: 'Ten poradnik o {topic} pomaga ustalić źródło, cel i potrzeby odbiorcy, aby wynik PDF był wiarygodny.', summary: 'Krótkie podsumowanie:', summaryText: 'Dla {topic}: zachowaj oryginał, wykonaj jedną odwracalną zmianę, sprawdź wynik i określ następny krok.', openTool: 'Otwórz narzędzie PDF', viewTools: 'Zobacz narzędzia PDF', headings: ['Wyjaśnij źródło i cel','Zachowaj oryginał','Zmieniaj jedną rzecz naraz','Sprawdź wrażliwe miejsca','Nazwij plik jasno','Dodaj kontekst','Sprawdź jak odbiorca','Poznaj granice narzędzia w przeglądarce','Zrób z tego rutynę','Wykonaj końcową kontrolę'], body: 'Przy {topic} działaj szybko, ale kontrolowanie: zapisz cel, sprawdź kolejność stron i czytelność, nie usuwaj oryginału.', detail: 'Po pobraniu otwórz wynik tam, gdzie będzie użyty: w e-mailu, folderze, pakiecie klienta lub archiwum.', relatedHeading: 'Powiązane narzędzia i ścieżki czytania', relatedParagraph: 'Następny krok zależy od utworzonego PDF. W razie potrzeby otwórz kategorię lub porównaj podobne poradniki.', openToolLabel: 'Otwórz narzędzie', openCategory: 'Otwórz kategorię', relatedGuide: 'Powiązany poradnik', faqHeading: 'Często zadawane pytania', faqQ1: 'Czy jest to potrzebne dla każdego PDF?', faqA1: 'Nie. Używaj tylko wtedy, gdy wymaga tego cel, rozmiar, układ lub sposób udostępnienia, i sprawdź wynik.', faqQ2: 'Jaki przebieg jest najbezpieczniejszy?', faqA2: 'Zachować oryginał, zmienić jedno ustawienie, otworzyć i sprawdzić wynik, a potem jasno nazwać plik.', conclusionHeading: 'Wniosek', conclusion: '{topic} najlepiej działa w widocznym procesie: chroń źródło, określ cel, sprawdź wynik i udostępnij dopiero po kontroli.', footer: '© 2026 MC NovaTools. Praktyczne narzędzia i poradniki online.', footerLinks: ['Prywatność','Warunki','Kontakt'] },
    nl: { nav: ['Categorieën','PDF','Afbeelding','Ontwikkelaar','Blog'], pdf: 'PDF-workflows', cover: 'PDF-workflow', read: '10 min lezen', lede: 'Deze gids over {topic} helpt bron, bestemming en behoefte van de ontvanger duidelijk te maken voor een betrouwbare PDF-uitvoer.', summary: 'Korte samenvatting:', summaryText: 'Voor {topic}: bewaar het origineel, doe één omkeerbare wijziging, controleer het resultaat en bepaal de volgende stap.', openTool: 'PDF-tool openen', viewTools: 'PDF-tools bekijken', headings: ['Maak bron en doel duidelijk','Bewaar het origineel','Wijzig één ding tegelijk','Controleer kwetsbare delen','Geef de file een duidelijke naam','Voeg context toe','Controleer als ontvanger','Ken de grenzen van de browsertool','Maak er een routine van','Doe de laatste deelcontrole'], body: 'Werk bij {topic} snel maar gecontroleerd: noteer het doel, controleer paginavolgorde en leesbaarheid, en verwijder het origineel niet.', detail: 'Open het resultaat na downloaden op de echte gebruiksplek: e-mail, map, klantpakket of archief.', relatedHeading: 'Gerelateerde tools en leesroutes', relatedParagraph: 'De volgende stap hangt af van de gemaakte PDF. Open zo nodig de categorie of vergelijk soortgelijke gidsen.', openToolLabel: 'Tool openen', openCategory: 'Categorie openen', relatedGuide: 'Gerelateerde gids', faqHeading: 'Veelgestelde vragen', faqQ1: 'Is dit nodig voor elke PDF?', faqA1: 'Nee. Gebruik het alleen wanneer doel, grootte, indeling of delen dit vereist, en controleer het resultaat.', faqQ2: 'Wat is de veiligste workflow?', faqA2: 'Het origineel bewaren, één instelling wijzigen, de uitvoer openen en controleren, en duidelijk opslaan.', conclusionHeading: 'Conclusie', conclusion: '{topic} werkt het best met een zichtbare workflow: bescherm de bron, bepaal het doel, controleer de uitvoer en deel pas als die bruikbaar is.', footer: '© 2026 MC NovaTools. Praktische online tools en gidsen.', footerLinks: ['Privacy','Voorwaarden','Contact'] }
  };

  var PHASE2_BLOG_SLUGS = {
    'compress-images-for-web-quality-checklist': 'imgCompress',
    'resize-images-for-social-platforms': 'imgResizeSocial',
    'convert-png-to-jpg-when-file-size-matters': 'pngToJpg',
    'jpg-vs-webp-for-small-websites': 'jpgWebp',
    'image-metadata-before-sharing-guide': 'metadata',
    'batch-image-resize-workflow': 'batchResize',
    'reduce-screenshot-size-for-support-tickets': 'screenshotSize',
    'optimize-images-for-email-newsletters': 'emailImages',
    'transparent-background-image-workflow': 'transparentBg',
    'image-alt-text-and-file-names-workflow': 'altNames'
  };

  var PHASE2_TOPIC_TITLES = {
    en: {
      imgCompress: 'Compress Images for the Web: A Quality Checklist That Works',
      imgResizeSocial: 'Resize Images for Social Platforms Without Cropping Important Details',
      pngToJpg: 'Convert PNG to JPG When File Size Matters: Practical Rules',
      jpgWebp: 'JPG vs WebP for Small Websites: A Practical Decision Guide',
      metadata: 'Image Metadata Before Sharing: What to Check in a Browser-First Workflow',
      batchResize: 'Batch Image Resize Workflow for Product Pages and Blog Posts',
      screenshotSize: 'Reduce Screenshot Size for Support Tickets Without Losing the Problem',
      emailImages: 'Optimize Images for Email Newsletters: Size, Clarity, and Layout',
      transparentBg: 'Transparent Background Images: When PNG Still Makes Sense',
      altNames: 'Image File Names and Alt Text: A Practical Publishing Workflow'
    },
    tr: {
      imgCompress: 'Web İçin Görselleri Sıkıştırma: İşe Yarayan Kalite Kontrol Listesi', imgResizeSocial: 'Önemli Ayrıntıları Kırpmadan Sosyal Platformlar İçin Görsel Boyutlandırma', pngToJpg: 'Dosya Boyutu Önemliyken PNG’yi JPG’ye Dönüştürme: Pratik Kurallar', jpgWebp: 'Küçük Web Siteleri İçin JPG ve WebP: Pratik Karar Rehberi', metadata: 'Paylaşmadan Önce Görsel Meta Verileri: Tarayıcı Öncelikli Akışta Neleri Kontrol Etmeli', batchResize: 'Ürün Sayfaları ve Blog Yazıları İçin Toplu Görsel Boyutlandırma Akışı', screenshotSize: 'Sorunu Kaybetmeden Destek Talepleri İçin Ekran Görüntüsü Boyutunu Azaltma', emailImages: 'E-posta Bültenleri İçin Görselleri Optimize Etme: Boyut, Netlik ve Düzen', transparentBg: 'Şeffaf Arka Planlı Görseller: PNG Ne Zaman Hâlâ Mantıklı?', altNames: 'Görsel Dosya Adları ve Alt Metin: Pratik Yayınlama Akışı'
    },
    de: {
      imgCompress: 'Bilder fürs Web komprimieren: eine Qualitätscheckliste, die funktioniert', imgResizeSocial: 'Bilder für soziale Plattformen skalieren, ohne wichtige Details abzuschneiden', pngToJpg: 'PNG in JPG umwandeln, wenn Dateigröße zählt: praktische Regeln', jpgWebp: 'JPG vs. WebP für kleine Websites: ein praktischer Entscheidungsleitfaden', metadata: 'Bildmetadaten vor dem Teilen: was im browserbasierten Workflow zu prüfen ist', batchResize: 'Batch-Bildgrößenänderung für Produktseiten und Blogbeiträge', screenshotSize: 'Screenshot-Größe für Supporttickets reduzieren, ohne das Problem zu verlieren', emailImages: 'Bilder für E-Mail-Newsletter optimieren: Größe, Klarheit und Layout', transparentBg: 'Bilder mit transparentem Hintergrund: wann PNG weiterhin sinnvoll ist', altNames: 'Bilddateinamen und Alt-Text: ein praktischer Veröffentlichungsworkflow'
    },
    fr: {
      imgCompress: 'Compresser des images pour le web : une liste qualité efficace', imgResizeSocial: 'Redimensionner des images pour les réseaux sociaux sans couper les détails importants', pngToJpg: 'Convertir PNG en JPG quand la taille compte : règles pratiques', jpgWebp: 'JPG ou WebP pour petits sites : guide de décision pratique', metadata: 'Métadonnées d’image avant partage : quoi vérifier dans un flux navigateur', batchResize: 'Redimensionnement d’images par lot pour pages produit et articles de blog', screenshotSize: 'Réduire la taille des captures pour le support sans perdre le problème', emailImages: 'Optimiser les images pour newsletters : taille, netteté et mise en page', transparentBg: 'Images à fond transparent : quand PNG reste pertinent', altNames: 'Noms de fichiers image et texte alt : workflow de publication pratique'
    },
    es: {
      imgCompress: 'Comprimir imágenes para la web: una lista de calidad que funciona', imgResizeSocial: 'Redimensionar imágenes para redes sociales sin recortar detalles importantes', pngToJpg: 'Convertir PNG a JPG cuando importa el tamaño: reglas prácticas', jpgWebp: 'JPG vs WebP para sitios pequeños: guía práctica de decisión', metadata: 'Metadatos de imagen antes de compartir: qué revisar en un flujo de navegador', batchResize: 'Flujo de cambio de tamaño por lotes para páginas de producto y blogs', screenshotSize: 'Reducir capturas para tickets de soporte sin perder el problema', emailImages: 'Optimizar imágenes para newsletters: tamaño, claridad y diseño', transparentBg: 'Imágenes con fondo transparente: cuándo PNG sigue teniendo sentido', altNames: 'Nombres de archivo y texto alt de imágenes: flujo práctico de publicación'
    },
    pt: {
      imgCompress: 'Comprimir imagens para a web: checklist de qualidade que funciona', imgResizeSocial: 'Redimensionar imagens para redes sociais sem cortar detalhes importantes', pngToJpg: 'Converter PNG para JPG quando o tamanho importa: regras práticas', jpgWebp: 'JPG vs WebP para sites pequenos: guia prático de decisão', metadata: 'Metadados de imagem antes de compartilhar: o que verificar no navegador', batchResize: 'Redimensionamento em lote para páginas de produto e posts de blog', screenshotSize: 'Reduzir capturas para suporte sem perder o problema', emailImages: 'Otimizar imagens para newsletters: tamanho, clareza e layout', transparentBg: 'Imagens com fundo transparente: quando PNG ainda faz sentido', altNames: 'Nomes de arquivos de imagem e texto alt: fluxo prático de publicação'
    },
    ru: {
      imgCompress: 'Сжатие изображений для веба: рабочий чек-лист качества', imgResizeSocial: 'Изменение размера изображений для соцсетей без обрезки важных деталей', pngToJpg: 'PNG в JPG, когда важен размер файла: практические правила', jpgWebp: 'JPG или WebP для небольших сайтов: практическое руководство выбора', metadata: 'Метаданные изображений перед отправкой: что проверить в браузерном процессе', batchResize: 'Пакетное изменение размера изображений для страниц товаров и блогов', screenshotSize: 'Уменьшение скриншотов для поддержки без потери сути проблемы', emailImages: 'Оптимизация изображений для рассылок: размер, четкость и макет', transparentBg: 'Изображения с прозрачным фоном: когда PNG всё еще уместен', altNames: 'Имена файлов изображений и alt-текст: практический процесс публикации'
    },
    zh: {
      imgCompress: '网页图片压缩：有效的质量检查清单', imgResizeSocial: '为社交平台调整图片大小且不裁掉重要细节', pngToJpg: '文件大小重要时将 PNG 转为 JPG：实用规则', jpgWebp: '小型网站的 JPG 与 WebP：实用决策指南', metadata: '分享前的图片元数据：浏览器优先流程中要检查什么', batchResize: '产品页和博客文章的批量图片调整流程', screenshotSize: '为支持工单减小截图体积且不丢失问题', emailImages: '优化邮件通讯图片：大小、清晰度和版式', transparentBg: '透明背景图片：PNG 何时仍然有意义', altNames: '图片文件名和替代文本：实用发布流程'
    },
    ja: {
      imgCompress: 'Web向け画像圧縮：実用的な品質チェックリスト', imgResizeSocial: '重要な詳細を切らずにSNS向け画像サイズを変更する', pngToJpg: 'ファイルサイズが重要なときのPNGからJPG変換：実用ルール', jpgWebp: '小規模サイトのJPGとWebP：実用的な判断ガイド', metadata: '共有前の画像メタデータ：ブラウザ中心の流れで確認すること', batchResize: '商品ページとブログ記事向けの一括画像リサイズ手順', screenshotSize: '問題を失わずにサポートチケット用スクリーンショットを小さくする', emailImages: 'メールニュースレター画像の最適化：サイズ、明瞭さ、レイアウト', transparentBg: '透明背景画像：PNGがまだ適している場面', altNames: '画像ファイル名と代替テキスト：実用的な公開ワークフロー'
    },
    ko: {
      imgCompress: '웹용 이미지 압축: 효과적인 품질 체크리스트', imgResizeSocial: '중요한 세부를 자르지 않고 소셜 플랫폼용 이미지 크기 조정', pngToJpg: '파일 크기가 중요할 때 PNG를 JPG로 변환하기: 실용 규칙', jpgWebp: '소규모 웹사이트를 위한 JPG와 WebP: 실용 결정 가이드', metadata: '공유 전 이미지 메타데이터: 브라우저 우선 흐름에서 확인할 것', batchResize: '제품 페이지와 블로그 글을 위한 일괄 이미지 크기 조정 흐름', screenshotSize: '문제를 잃지 않고 지원 티켓용 스크린샷 크기 줄이기', emailImages: '이메일 뉴스레터 이미지 최적화: 크기, 선명도, 레이아웃', transparentBg: '투명 배경 이미지: PNG가 여전히 적합한 경우', altNames: '이미지 파일명과 대체 텍스트: 실용 게시 워크플로'
    },
    ar: {
      imgCompress: 'ضغط الصور للويب: قائمة تحقق للجودة تعمل فعلاً', imgResizeSocial: 'تغيير حجم الصور للمنصات الاجتماعية دون قص التفاصيل المهمة', pngToJpg: 'تحويل PNG إلى JPG عندما يكون حجم الملف مهمًا: قواعد عملية', jpgWebp: 'JPG أم WebP للمواقع الصغيرة: دليل قرار عملي', metadata: 'بيانات الصورة الوصفية قبل المشاركة: ما الذي تفحصه في سير عمل المتصفح', batchResize: 'سير تغيير حجم الصور دفعة واحدة لصفحات المنتجات والتدوينات', screenshotSize: 'تقليل حجم لقطة الشاشة لتذاكر الدعم دون فقدان المشكلة', emailImages: 'تحسين صور نشرات البريد: الحجم والوضوح والتخطيط', transparentBg: 'صور الخلفية الشفافة: متى يبقى PNG مناسبًا', altNames: 'أسماء ملفات الصور والنص البديل: سير نشر عملي'
    },
    hi: {
      imgCompress: 'वेब के लिए छवियाँ संपीड़ित करें: काम करने वाली गुणवत्ता चेकलिस्ट', imgResizeSocial: 'महत्वपूर्ण विवरण काटे बिना सोशल प्लेटफ़ॉर्म के लिए छवियाँ आकार दें', pngToJpg: 'फ़ाइल आकार मायने रखे तो PNG को JPG में बदलें: व्यावहारिक नियम', jpgWebp: 'छोटी वेबसाइटों के लिए JPG बनाम WebP: व्यावहारिक निर्णय गाइड', metadata: 'साझा करने से पहले छवि मेटाडेटा: ब्राउज़र-आधारित वर्कफ़्लो में क्या जाँचें', batchResize: 'उत्पाद पृष्ठों और ब्लॉग पोस्ट के लिए बैच छवि आकार वर्कफ़्लो', screenshotSize: 'समस्या खोए बिना सपोर्ट टिकट के लिए स्क्रीनशॉट आकार घटाएँ', emailImages: 'ईमेल न्यूज़लेटर के लिए छवियाँ अनुकूलित करें: आकार, स्पष्टता और लेआउट', transparentBg: 'पारदर्शी पृष्ठभूमि छवियाँ: PNG कब अब भी सही है', altNames: 'छवि फ़ाइल नाम और alt टेक्स्ट: व्यावहारिक प्रकाशन वर्कफ़्लो'
    },
    it: {
      imgCompress: 'Comprimere immagini per il web: checklist qualità che funziona', imgResizeSocial: 'Ridimensionare immagini per social senza tagliare dettagli importanti', pngToJpg: 'Convertire PNG in JPG quando conta il peso: regole pratiche', jpgWebp: 'JPG vs WebP per piccoli siti: guida pratica alla scelta', metadata: 'Metadati immagine prima della condivisione: cosa controllare nel browser', batchResize: 'Ridimensionamento immagini in batch per pagine prodotto e blog', screenshotSize: 'Ridurre screenshot per ticket di supporto senza perdere il problema', emailImages: 'Ottimizzare immagini per newsletter: peso, chiarezza e layout', transparentBg: 'Immagini con sfondo trasparente: quando PNG ha ancora senso', altNames: 'Nomi file immagine e testo alt: workflow pratico di pubblicazione'
    },
    pl: {
      imgCompress: 'Kompresja obrazów do internetu: skuteczna lista kontroli jakości', imgResizeSocial: 'Zmiana rozmiaru obrazów na social media bez ucinania ważnych szczegółów', pngToJpg: 'Konwersja PNG do JPG, gdy liczy się rozmiar pliku: praktyczne zasady', jpgWebp: 'JPG kontra WebP dla małych stron: praktyczny przewodnik wyboru', metadata: 'Metadane obrazu przed udostępnieniem: co sprawdzić w przeglądarce', batchResize: 'Wsadowa zmiana rozmiaru obrazów dla stron produktów i blogów', screenshotSize: 'Zmniejszanie zrzutów ekranu do zgłoszeń bez utraty problemu', emailImages: 'Optymalizacja obrazów do newsletterów: rozmiar, czytelność i układ', transparentBg: 'Obrazy z przezroczystym tłem: kiedy PNG nadal ma sens', altNames: 'Nazwy plików obrazów i tekst alt: praktyczny proces publikacji'
    },
    nl: {
      imgCompress: 'Afbeeldingen voor het web comprimeren: een kwaliteitschecklist die werkt', imgResizeSocial: 'Afbeeldingen voor sociale platforms schalen zonder belangrijke details weg te snijden', pngToJpg: 'PNG naar JPG converteren wanneer bestandsgrootte telt: praktische regels', jpgWebp: 'JPG versus WebP voor kleine websites: praktische keuzehulp', metadata: 'Afbeeldingsmetadata vóór delen: wat controleren in een browsergerichte workflow', batchResize: 'Batchgewijs afbeeldingen schalen voor productpagina’s en blogposts', screenshotSize: 'Screenshots voor supporttickets verkleinen zonder het probleem te verliezen', emailImages: 'Afbeeldingen voor e-mailnieuwsbrieven optimaliseren: grootte, helderheid en layout', transparentBg: 'Afbeeldingen met transparante achtergrond: wanneer PNG nog logisch is', altNames: 'Afbeeldingsbestandsnamen en alt-tekst: praktische publicatieworkflow'
    }
  };

  var PHASE2_IMAGE_COPY = {
    tr: { category: 'Görsel optimizasyonu', cover: 'Görsel iş akışı', read: '10 dk okuma', lede: '{topic} rehberi; kaynak görseli, hedef platformu ve izleyicinin gerçekten görmesi gereken ayrıntıları netleştirerek güvenilir bir görsel çıktısı hazırlamanıza yardımcı olur.', summaryText: '{topic} için orijinali koruyun, tek bir geri alınabilir değişiklik yapın, görüntü kalitesini kontrol edin ve sonraki yayın ya da paylaşım adımını netleştirin.', openTool: 'Görsel aracını aç', viewTools: 'Görsel araçlarını görüntüle', body: '{topic} için hızlı ama güvenli ilerleyin: görselin amacını not edin, kırpma, netlik, dosya boyutu ve platform gereksinimlerini kontrol edin.', detail: 'Sonucu indirdikten sonra web sayfası, sosyal gönderi, e-posta taslağı, destek bileti veya arşiv gibi gerçek kullanım yerinde açıp kontrol edin.', relatedParagraph: 'Sonraki adım, oluşturduğunuz görsel çıktısına bağlıdır. Gerekirse kategori merkezini açın veya benzer rehberlerle karşılaştırın.', conclusion: '{topic} en iyi görünür bir görsel iş akışıyla yönetilir: kaynağı koruyun, amacı belirleyin, çıktıyı kontrol edin ve paylaşmadan önce hedef yerde çalıştığından emin olun.' },
    de: { category: 'Bildoptimierung', cover: 'Bild-Workflow', read: '10 Min. Lesezeit', lede: 'Dieser Leitfaden zu {topic} klärt Quellbild, Zielplattform und sichtbare Details, damit die Bildausgabe verlässlich bleibt.', summaryText: 'Für {topic}: Original behalten, eine umkehrbare Änderung vornehmen, Bildqualität prüfen und den nächsten Veröffentlichungs- oder Teilenschritt klären.', openTool: 'Bildtool öffnen', viewTools: 'Bildtools anzeigen', body: 'Gehen Sie bei {topic} schnell, aber kontrolliert vor: Zweck notieren und Zuschnitt, Schärfe, Dateigröße sowie Plattformanforderungen prüfen.', detail: 'Öffnen Sie die Ausgabe nach dem Download dort, wo sie wirklich verwendet wird: Webseite, Social-Post, E-Mail-Entwurf, Supportticket oder Archiv.', relatedParagraph: 'Der nächste Schritt hängt von der erstellten Bildausgabe ab. Öffnen Sie bei Bedarf den Kategorie-Hub oder vergleichen Sie ähnliche Leitfäden.', conclusion: '{topic} funktioniert am besten mit einem sichtbaren Bild-Workflow: Quelle schützen, Zweck festlegen, Ausgabe prüfen und erst teilen, wenn sie am Zielort funktioniert.' },
    fr: { category: 'Optimisation d’images', cover: 'Workflow image', read: '10 min de lecture', lede: 'Ce guide sur {topic} clarifie l’image source, la plateforme cible et les détails à préserver pour produire une sortie fiable.', summaryText: 'Pour {topic}, gardez l’original, faites une modification réversible, vérifiez la qualité visuelle et clarifiez l’étape de publication ou de partage.', openTool: 'Ouvrir l’outil image', viewTools: 'Voir les outils image', body: 'Pour {topic}, avancez vite mais avec contrôle : notez l’objectif, vérifiez le cadrage, la netteté, le poids et les exigences de plateforme.', detail: 'Après téléchargement, ouvrez le résultat dans son vrai contexte : page web, publication sociale, brouillon d’e-mail, ticket support ou archive.', relatedParagraph: 'La suite dépend de l’image obtenue. Ouvrez le hub de catégorie si nécessaire ou comparez des guides similaires.', conclusion: '{topic} se gère mieux avec un workflow image visible : protéger la source, définir l’objectif, vérifier la sortie et partager seulement si elle fonctionne dans sa destination.' },
    es: { category: 'Optimización de imágenes', cover: 'Flujo de imagen', read: '10 min de lectura', lede: 'Esta guía sobre {topic} aclara la imagen fuente, la plataforma destino y los detalles visibles para crear una salida confiable.', summaryText: 'Para {topic}, conserve el original, haga un cambio reversible, revise la calidad visual y defina el siguiente paso de publicación o envío.', openTool: 'Abrir herramienta de imagen', viewTools: 'Ver herramientas de imagen', body: 'Para {topic}, avance rápido pero con control: anote el propósito y revise recorte, nitidez, tamaño de archivo y requisitos de plataforma.', detail: 'Después de descargar, abra el resultado en su contexto real: página web, publicación social, borrador de correo, ticket de soporte o archivo.', relatedParagraph: 'El siguiente paso depende de la imagen creada. Abra la categoría si hace falta o compare guías similares.', conclusion: '{topic} funciona mejor con un flujo visual claro: proteja la fuente, defina el objetivo, revise la salida y comparta solo cuando funcione en destino.' },
    pt: { category: 'Otimização de imagens', cover: 'Fluxo de imagem', read: '10 min de leitura', lede: 'Este guia sobre {topic} alinha imagem de origem, plataforma de destino e detalhes visíveis para gerar uma saída confiável.', summaryText: 'Para {topic}, guarde o original, faça uma alteração reversível, revise a qualidade visual e defina o próximo passo de publicação ou compartilhamento.', openTool: 'Abrir ferramenta de imagem', viewTools: 'Ver ferramentas de imagem', body: 'Para {topic}, avance com rapidez e controle: anote o objetivo e confira corte, nitidez, tamanho do arquivo e exigências da plataforma.', detail: 'Depois de baixar, abra o resultado no uso real: página web, post social, rascunho de e-mail, ticket de suporte ou arquivo.', relatedParagraph: 'O próximo passo depende da imagem criada. Abra a categoria se necessário ou compare guias semelhantes.', conclusion: '{topic} funciona melhor com um fluxo visual claro: proteja a origem, defina o objetivo, revise a saída e compartilhe apenas quando funcionar no destino.' },
    ru: { category: 'Оптимизация изображений', cover: 'Процесс изображения', read: '10 мин чтения', lede: 'Руководство по теме «{topic}» помогает уточнить исходное изображение, целевую площадку и важные видимые детали.', summaryText: 'Для «{topic}» сохраните оригинал, сделайте одно обратимое изменение, проверьте визуальное качество и определите следующий шаг публикации или передачи.', openTool: 'Открыть инструмент изображений', viewTools: 'Смотреть инструменты изображений', body: 'Для «{topic}» действуйте быстро, но контролируемо: зафиксируйте цель и проверьте кадрирование, четкость, размер файла и требования площадки.', detail: 'После загрузки откройте результат там, где он будет использован: на странице, в соцпосте, письме, заявке поддержки или архиве.', relatedParagraph: 'Следующий шаг зависит от созданного изображения. При необходимости откройте категорию или сравните похожие руководства.', conclusion: '«{topic}» лучше всего работает с видимым процессом для изображений: защитите источник, задайте цель, проверьте вывод и делитесь только после проверки.' },
    zh: { category: '图片优化', cover: '图片工作流', read: '10 分钟阅读', lede: '本指南围绕“{topic}”，帮助你明确源图片、目标平台和必须保留的可见细节。', summaryText: '处理“{topic}”时，请保留原图，只做一个可撤销更改，检查视觉质量，并明确发布或分享的下一步。', openTool: '打开图片工具', viewTools: '查看图片工具', body: '处理“{topic}”要快速但受控：记录用途，检查裁剪、清晰度、文件大小和平台要求。', detail: '下载后，请在实际使用场景中打开结果，例如网页、社交帖子、邮件草稿、支持工单或归档位置。', relatedParagraph: '下一步取决于你创建的图片。需要时打开分类中心，或与相似指南对照。', conclusion: '“{topic}”最适合用可见的图片流程处理：保护来源，确定目标，检查输出，并在目标位置可用后再分享。' },
    ja: { category: '画像最適化', cover: '画像ワークフロー', read: '10分で読めます', lede: 'この「{topic}」ガイドは、元画像、利用先、残すべき見た目の詳細を整理し、信頼できる画像出力を作るためのものです。', summaryText: '{topic}では、元画像を残し、戻せる変更を一つだけ行い、見た目の品質を確認して公開または共有の次手順を明確にします。', openTool: '画像ツールを開く', viewTools: '画像ツールを見る', body: '{topic}では、目的を記録し、トリミング、鮮明さ、ファイルサイズ、プラットフォーム要件を確認します。', detail: 'ダウンロード後は、Webページ、SNS投稿、メール下書き、サポートチケット、アーカイブなど実際の利用場所で開いて確認します。', relatedParagraph: '次の手順は作成した画像によって変わります。必要ならカテゴリーを開き、似たガイドと比較してください。', conclusion: '{topic}は、元画像を守り、目的を決め、出力を確認し、利用先で問題ないと分かってから共有する流れが安全です。' },
    ko: { category: '이미지 최적화', cover: '이미지 워크플로', read: '10분 읽기', lede: '{topic} 가이드는 원본 이미지, 대상 플랫폼, 반드시 보여야 할 세부를 분명히 하여 신뢰할 수 있는 이미지 결과를 만드는 데 도움을 줍니다.', summaryText: '{topic}에서는 원본을 보관하고, 되돌릴 수 있는 변경을 하나만 적용한 뒤 시각 품질과 게시 또는 공유의 다음 단계를 확인하세요.', openTool: '이미지 도구 열기', viewTools: '이미지 도구 보기', body: '{topic}에서는 빠르지만 통제된 방식이 필요합니다. 목적을 적고, 자르기, 선명도, 파일 크기, 플랫폼 요구사항을 확인하세요.', detail: '다운로드 후 웹페이지, 소셜 게시물, 이메일 초안, 지원 티켓 또는 보관 위치처럼 실제 사용될 곳에서 결과를 열어 확인하세요.', relatedParagraph: '다음 단계는 만든 이미지 결과에 따라 달라집니다. 필요하면 카테고리를 열거나 비슷한 가이드와 비교하세요.', conclusion: '{topic}은 원본 보호, 목적 정의, 출력 확인, 대상 위치에서의 사용 가능성 확인이라는 보이는 이미지 흐름에서 가장 안전합니다.' },
    ar: { category: 'تحسين الصور', cover: 'سير عمل الصور', read: 'قراءة 10 دقائق', lede: 'يساعدك دليل {topic} على توضيح الصورة الأصلية والمنصة المستهدفة والتفاصيل التي يجب أن تبقى واضحة.', summaryText: 'في {topic} احتفظ بالأصل، أجرِ تغييرًا واحدًا قابلًا للتراجع، راجع الجودة البصرية، وحدد خطوة النشر أو المشاركة التالية.', openTool: 'افتح أداة الصور', viewTools: 'عرض أدوات الصور', body: 'في {topic} تقدّم بسرعة لكن بحذر: اكتب الغرض وراجع القص والوضوح وحجم الملف ومتطلبات المنصة.', detail: 'بعد التنزيل افتح الناتج في مكان استخدامه الفعلي، مثل صفحة ويب أو منشور اجتماعي أو مسودة بريد أو تذكرة دعم أو أرشيف.', relatedParagraph: 'تعتمد الخطوة التالية على الصورة التي أنشأتها. افتح مركز الفئة عند الحاجة أو قارن مع أدلة مشابهة.', conclusion: 'يُدار {topic} بشكل أفضل عبر سير صور واضح: احمِ المصدر، حدد الغرض، راجع الناتج، ولا تشاركه إلا بعد التأكد من عمله في وجهته.' },
    hi: { category: 'छवि अनुकूलन', cover: 'छवि वर्कफ़्लो', read: '10 मिनट पढ़ें', lede: '{topic} गाइड स्रोत छवि, लक्ष्य प्लेटफ़ॉर्म और दिखने वाले ज़रूरी विवरण स्पष्ट करके भरोसेमंद छवि आउटपुट बनाने में मदद करता है।', summaryText: '{topic} में मूल छवि रखें, एक उलटने योग्य बदलाव करें, दृश्य गुणवत्ता जाँचें और प्रकाशन या साझा करने का अगला कदम स्पष्ट करें।', openTool: 'छवि टूल खोलें', viewTools: 'छवि टूल देखें', body: '{topic} में तेज़ लेकिन नियंत्रित रहें: उद्देश्य लिखें और क्रॉप, स्पष्टता, फ़ाइल आकार तथा प्लेटफ़ॉर्म आवश्यकताएँ जाँचें।', detail: 'डाउनलोड के बाद परिणाम को वेब पृष्ठ, सोशल पोस्ट, ईमेल ड्राफ्ट, सपोर्ट टिकट या आर्काइव जैसे वास्तविक स्थान में खोलकर जाँचें।', relatedParagraph: 'अगला कदम बनाई गई छवि पर निर्भर करता है। ज़रूरत हो तो श्रेणी केंद्र खोलें या मिलते-जुलते गाइड देखें।', conclusion: '{topic} सबसे अच्छा तब संभलता है जब छवि प्रक्रिया दिखाई दे: स्रोत सुरक्षित रखें, उद्देश्य तय करें, आउटपुट जाँचें और लक्ष्य स्थान में ठीक होने पर ही साझा करें।' },
    it: { category: 'Ottimizzazione immagini', cover: 'Workflow immagini', read: '10 min di lettura', lede: 'Questa guida su {topic} chiarisce immagine sorgente, piattaforma di destinazione e dettagli visibili da preservare per creare un output affidabile.', summaryText: 'Per {topic}, conserva l’originale, fai una modifica reversibile, controlla la qualità visiva e chiarisci il prossimo passaggio di pubblicazione o condivisione.', openTool: 'Apri strumento immagini', viewTools: 'Vedi strumenti immagini', body: 'Per {topic}, procedi rapidamente ma con controllo: annota lo scopo e verifica ritaglio, nitidezza, peso del file e requisiti della piattaforma.', detail: 'Dopo il download, apri il risultato dove sarà usato davvero: pagina web, post social, bozza e-mail, ticket di supporto o archivio.', relatedParagraph: 'Il passo successivo dipende dall’immagine creata. Apri la categoria se serve o confronta guide simili.', conclusion: '{topic} funziona meglio con un workflow immagini visibile: proteggi la sorgente, definisci lo scopo, controlla l’output e condividi solo quando funziona nella destinazione.' },
    pl: { category: 'Optymalizacja obrazów', cover: 'Przepływ obrazu', read: '10 min czytania', lede: 'Ten poradnik o {topic} pomaga ustalić obraz źródłowy, platformę docelową i szczegóły, które muszą pozostać widoczne.', summaryText: 'Dla {topic}: zachowaj oryginał, wykonaj jedną odwracalną zmianę, sprawdź jakość wizualną i określ kolejny krok publikacji lub udostępnienia.', openTool: 'Otwórz narzędzie obrazów', viewTools: 'Zobacz narzędzia obrazów', body: 'Przy {topic} działaj szybko, ale kontrolowanie: zapisz cel i sprawdź kadrowanie, ostrość, rozmiar pliku oraz wymagania platformy.', detail: 'Po pobraniu otwórz wynik tam, gdzie będzie użyty: na stronie, w poście, szkicu e-maila, zgłoszeniu lub archiwum.', relatedParagraph: 'Następny krok zależy od utworzonego obrazu. W razie potrzeby otwórz kategorię lub porównaj podobne poradniki.', conclusion: '{topic} najlepiej działa w widocznym procesie obrazu: chroń źródło, określ cel, sprawdź wynik i udostępnij dopiero, gdy działa w miejscu docelowym.' },
    nl: { category: 'Beeldoptimalisatie', cover: 'Afbeeldingsworkflow', read: '10 min lezen', lede: 'Deze gids over {topic} helpt bronafbeelding, doelplatform en zichtbare details duidelijk te maken voor een betrouwbare uitvoer.', summaryText: 'Voor {topic}: bewaar het origineel, doe één omkeerbare wijziging, controleer de beeldkwaliteit en bepaal de volgende publicatie- of deelstap.', openTool: 'Afbeeldingstool openen', viewTools: 'Afbeeldingstools bekijken', body: 'Werk bij {topic} snel maar gecontroleerd: noteer het doel en controleer uitsnede, scherpte, bestandsgrootte en platformeisen.', detail: 'Open het resultaat na downloaden op de echte gebruiksplek: webpagina, social post, e-mailconcept, supportticket of archief.', relatedParagraph: 'De volgende stap hangt af van de gemaakte afbeelding. Open zo nodig de categorie of vergelijk soortgelijke gidsen.', conclusion: '{topic} werkt het best met een zichtbare afbeeldingsworkflow: bescherm de bron, bepaal het doel, controleer de uitvoer en deel pas als die op de bestemming werkt.' }
  };

  var PHASE3_BLOG_SLUGS = {
    'word-counter-for-editing-client-copy': 'wordCounter',
    'case-converter-cleanup-workflow': 'caseConverter',
    'slug-generator-url-cleanup-guide': 'slugGenerator',
    'text-diff-for-reviewing-edits': 'textDiff',
    'html-entity-encoder-publishing-guide': 'htmlEntities',
    'lorem-ipsum-with-real-layout-checks': 'loremLayout',
    'character-counter-for-meta-descriptions': 'characterCounter',
    'palindrome-checker-teaching-string-logic': 'palindrome',
    'clean-text-before-spreadsheet-import': 'cleanText',
    'writing-tool-stack-for-small-teams': 'writingStack'
  };

  var PHASE3_TOPIC_TITLES = {
    en: {
      wordCounter: 'Use a Word Counter to Edit Client Copy Without Guesswork',
      caseConverter: 'Case Converter Cleanup Workflow for Titles, Labels, and Data',
      slugGenerator: 'Slug Generator Guide: Clean URLs for Tools, Blogs, and Landing Pages',
      textDiff: 'Text Diff for Reviewing Edits: A Practical Non-Developer Guide',
      htmlEntities: 'HTML Entity Encoding for Publishing: When It Solves Broken Characters',
      loremLayout: 'Lorem Ipsum With Real Layout Checks: How to Use Placeholder Text Wisely',
      characterCounter: 'Character Counter for Meta Descriptions, Headlines, and Snippets',
      palindrome: 'Palindrome Checker as a Simple Way to Teach String Logic',
      cleanText: 'Clean Text Before Spreadsheet Import: A Practical Checklist',
      writingStack: 'A Practical Writing Tool Stack for Small Teams'
    },
    tr: {
      wordCounter: 'Müşteri Metnini Tahminsiz Düzenlemek İçin Kelime Sayacı Kullanma', caseConverter: 'Başlıklar, Etiketler ve Veriler İçin Büyük/Küçük Harf Temizleme Akışı', slugGenerator: 'Slug Oluşturucu Rehberi: Araçlar, Bloglar ve Açılış Sayfaları İçin Temiz URL’ler', textDiff: 'Düzenlemeleri İncelemek İçin Metin Farkı: Geliştirici Olmayanlar İçin Pratik Rehber', htmlEntities: 'Yayınlama İçin HTML Entity Kodlama: Bozuk Karakterleri Ne Zaman Çözer?', loremLayout: 'Gerçek Yerleşim Kontrolleriyle Lorem Ipsum: Yer Tutucu Metni Akıllıca Kullanma', characterCounter: 'Meta Açıklamaları, Başlıklar ve Snippet’lar İçin Karakter Sayacı', palindrome: 'Dize Mantığını Öğretmenin Basit Yolu Olarak Palindrom Denetleyici', cleanText: 'Elektronik Tablo İçe Aktarmadan Önce Metin Temizleme: Pratik Kontrol Listesi', writingStack: 'Küçük Ekipler İçin Pratik Yazım Araç Seti'
    },
    de: {
      wordCounter: 'Mit einem Wortzähler Kundentexte ohne Rätselraten bearbeiten', caseConverter: 'Case-Converter-Workflow für Titel, Labels und Daten', slugGenerator: 'Slug-Generator-Leitfaden: saubere URLs für Tools, Blogs und Landingpages', textDiff: 'Text-Diff zur Prüfung von Änderungen: praktischer Leitfaden ohne Entwicklerwissen', htmlEntities: 'HTML-Entity-Codierung fürs Publishing: wann sie kaputte Zeichen behebt', loremLayout: 'Lorem Ipsum mit echten Layoutprüfungen: Platzhaltertext sinnvoll nutzen', characterCounter: 'Zeichenzähler für Meta-Beschreibungen, Überschriften und Snippets', palindrome: 'Palindrom-Checker als einfache Einführung in String-Logik', cleanText: 'Text vor dem Tabellenimport bereinigen: praktische Checkliste', writingStack: 'Ein praktischer Schreibwerkzeug-Stack für kleine Teams'
    },
    fr: {
      wordCounter: 'Utiliser un compteur de mots pour réviser une copie client sans deviner', caseConverter: 'Workflow de casse pour titres, libellés et données', slugGenerator: 'Guide du générateur de slug : URL propres pour outils, blogs et pages', textDiff: 'Diff de texte pour relire les modifications : guide pratique non-développeur', htmlEntities: 'Encodage des entités HTML pour publier : quand il corrige les caractères cassés', loremLayout: 'Lorem Ipsum avec vrais contrôles de mise en page : utiliser le texte fictif avec soin', characterCounter: 'Compteur de caractères pour descriptions meta, titres et extraits', palindrome: 'Vérificateur de palindrome pour enseigner simplement la logique des chaînes', cleanText: 'Nettoyer le texte avant import tableur : liste de contrôle pratique', writingStack: 'Une pile d’outils d’écriture pratique pour petites équipes'
    },
    es: {
      wordCounter: 'Usar un contador de palabras para editar textos de clientes sin adivinar', caseConverter: 'Flujo de limpieza de mayúsculas para títulos, etiquetas y datos', slugGenerator: 'Guía del generador de slugs: URL limpias para herramientas, blogs y páginas', textDiff: 'Diferencias de texto para revisar cambios: guía práctica para no desarrolladores', htmlEntities: 'Codificación de entidades HTML al publicar: cuándo arregla caracteres rotos', loremLayout: 'Lorem Ipsum con revisiones reales de diseño: usar texto de relleno con criterio', characterCounter: 'Contador de caracteres para metadescripciones, titulares y fragmentos', palindrome: 'Comprobador de palíndromos para enseñar lógica de cadenas de forma simple', cleanText: 'Limpiar texto antes de importar a hojas de cálculo: lista práctica', writingStack: 'Un conjunto práctico de herramientas de escritura para equipos pequeños'
    },
    pt: {
      wordCounter: 'Usar contador de palavras para editar texto de cliente sem adivinhação', caseConverter: 'Fluxo de limpeza de maiúsculas para títulos, rótulos e dados', slugGenerator: 'Guia do gerador de slugs: URLs limpas para ferramentas, blogs e páginas', textDiff: 'Diff de texto para revisar edições: guia prático para não desenvolvedores', htmlEntities: 'Codificação de entidades HTML para publicação: quando resolve caracteres quebrados', loremLayout: 'Lorem Ipsum com verificações reais de layout: como usar texto placeholder', characterCounter: 'Contador de caracteres para meta descrições, títulos e snippets', palindrome: 'Verificador de palíndromos como forma simples de ensinar lógica de strings', cleanText: 'Limpar texto antes de importar para planilhas: checklist prático', writingStack: 'Um conjunto prático de ferramentas de escrita para equipes pequenas'
    },
    ru: {
      wordCounter: 'Как использовать счетчик слов для редактирования клиентского текста без догадок', caseConverter: 'Процесс очистки регистра для заголовков, меток и данных', slugGenerator: 'Гид по генератору slug: чистые URL для инструментов, блогов и страниц', textDiff: 'Text Diff для проверки правок: практический гид без навыков разработчика', htmlEntities: 'HTML-сущности при публикации: когда они исправляют сломанные символы', loremLayout: 'Lorem Ipsum с реальными проверками макета: как разумно использовать текст-заполнитель', characterCounter: 'Счетчик символов для meta-описаний, заголовков и сниппетов', palindrome: 'Проверка палиндромов как простой способ объяснить логику строк', cleanText: 'Очистка текста перед импортом в таблицу: практический чек-лист', writingStack: 'Практичный набор письменных инструментов для небольших команд'
    },
    zh: {
      wordCounter: '用字数统计器编辑客户文案，避免凭感觉修改', caseConverter: '标题、标签和数据的大小写清理流程', slugGenerator: 'Slug 生成器指南：为工具、博客和落地页创建干净 URL', textDiff: '用于审阅修改的文本差异：非开发者实用指南', htmlEntities: '发布时的 HTML 实体编码：何时能修复乱码字符', loremLayout: '结合真实版式检查使用 Lorem Ipsum：明智使用占位文本', characterCounter: '用于元描述、标题和摘要的字符计数器', palindrome: '用回文检查器简单讲解字符串逻辑', cleanText: '电子表格导入前清理文本：实用检查清单', writingStack: '适合小团队的实用写作工具组合'
    },
    ja: {
      wordCounter: '推測に頼らずクライアントコピーを編集するためのワードカウンター活用', caseConverter: 'タイトル、ラベル、データ向けケース変換クリーンアップ手順', slugGenerator: 'スラッグ生成ガイド：ツール、ブログ、LP向けのきれいなURL', textDiff: '編集確認のためのテキスト差分：非開発者向け実用ガイド', htmlEntities: '公開向けHTMLエンティティエンコード：文字化けを直せる場面', loremLayout: '実レイアウト確認付きLorem Ipsum：プレースホルダーテキストを賢く使う', characterCounter: 'メタ説明、見出し、スニペット向け文字数カウンター', palindrome: '文字列ロジックを教える簡単な方法としての回文チェッカー', cleanText: 'スプレッドシート取り込み前のテキスト整理：実用チェックリスト', writingStack: '小規模チーム向けの実用的な文章作成ツールセット'
    },
    ko: {
      wordCounter: '추측 없이 고객 문구를 편집하기 위한 단어 카운터 활용', caseConverter: '제목, 레이블, 데이터를 위한 대소문자 변환 정리 흐름', slugGenerator: '슬러그 생성기 가이드: 도구, 블로그, 랜딩 페이지를 위한 깔끔한 URL', textDiff: '수정 검토를 위한 텍스트 비교: 비개발자를 위한 실용 가이드', htmlEntities: '게시를 위한 HTML 엔티티 인코딩: 깨진 문자를 해결하는 경우', loremLayout: '실제 레이아웃 확인과 Lorem Ipsum: 플레이스홀더 텍스트를 현명하게 쓰기', characterCounter: '메타 설명, 제목, 스니펫을 위한 문자 카운터', palindrome: '문자열 논리를 쉽게 가르치는 팰린드롬 검사기', cleanText: '스프레드시트 가져오기 전 텍스트 정리: 실용 체크리스트', writingStack: '소규모 팀을 위한 실용 글쓰기 도구 세트'
    },
    ar: {
      wordCounter: 'استخدام عدّاد الكلمات لتحرير نصوص العملاء دون تخمين', caseConverter: 'سير تنظيف حالة الأحرف للعناوين والتسميات والبيانات', slugGenerator: 'دليل مولّد Slug: روابط نظيفة للأدوات والمدونات وصفحات الهبوط', textDiff: 'مقارنة النصوص لمراجعة التعديلات: دليل عملي لغير المطورين', htmlEntities: 'ترميز كيانات HTML للنشر: متى يصلح الأحرف المعطلة', loremLayout: 'Lorem Ipsum مع فحوص تخطيط حقيقية: استخدام النص الوهمي بحكمة', characterCounter: 'عدّاد الأحرف للوصف التعريفي والعناوين والمقتطفات', palindrome: 'مدقق الكلمات المتناظرة كطريقة بسيطة لتعليم منطق السلاسل', cleanText: 'تنظيف النص قبل استيراده إلى جدول: قائمة تحقق عملية', writingStack: 'حزمة أدوات كتابة عملية للفرق الصغيرة'
    },
    hi: {
      wordCounter: 'अनुमान के बिना क्लाइंट कॉपी संपादित करने के लिए वर्ड काउंटर', caseConverter: 'शीर्षक, लेबल और डेटा के लिए केस कन्वर्टर सफाई वर्कफ़्लो', slugGenerator: 'स्लग जनरेटर गाइड: टूल, ब्लॉग और लैंडिंग पेजों के लिए साफ़ URL', textDiff: 'संपादन समीक्षा के लिए टेक्स्ट डिफ: गैर-डेवलपर के लिए व्यावहारिक गाइड', htmlEntities: 'प्रकाशन के लिए HTML Entity Encoding: टूटे अक्षर कब ठीक होते हैं', loremLayout: 'वास्तविक लेआउट जाँचों के साथ Lorem Ipsum: placeholder टेक्स्ट समझदारी से उपयोग करें', characterCounter: 'मेटा विवरण, शीर्षक और स्निपेट के लिए कैरेक्टर काउंटर', palindrome: 'स्ट्रिंग लॉजिक सिखाने का सरल तरीका: पैलिंड्रोम चेकर', cleanText: 'स्प्रेडशीट आयात से पहले टेक्स्ट साफ़ करें: व्यावहारिक चेकलिस्ट', writingStack: 'छोटी टीमों के लिए व्यावहारिक लेखन टूल स्टैक'
    },
    it: {
      wordCounter: 'Usare un contatore parole per modificare testi cliente senza supposizioni', caseConverter: 'Workflow di pulizia maiuscole/minuscole per titoli, etichette e dati', slugGenerator: 'Guida al generatore di slug: URL puliti per strumenti, blog e landing page', textDiff: 'Diff testo per rivedere modifiche: guida pratica per non sviluppatori', htmlEntities: 'Codifica entità HTML per pubblicare: quando risolve caratteri rotti', loremLayout: 'Lorem Ipsum con controlli di layout reali: usare bene il testo segnaposto', characterCounter: 'Contatore caratteri per meta description, titoli e snippet', palindrome: 'Controllo palindromi come modo semplice per insegnare logica delle stringhe', cleanText: 'Pulire il testo prima dell’importazione in fogli di calcolo: checklist pratica', writingStack: 'Uno stack pratico di strumenti di scrittura per piccoli team'
    },
    pl: {
      wordCounter: 'Użycie licznika słów do edycji tekstu klienta bez zgadywania', caseConverter: 'Przepływ czyszczenia wielkości liter dla tytułów, etykiet i danych', slugGenerator: 'Przewodnik po generatorze slugów: czyste URL dla narzędzi, blogów i landing page’y', textDiff: 'Różnice tekstu do przeglądu edycji: praktyczny poradnik dla nietechnicznych', htmlEntities: 'Kodowanie encji HTML w publikacji: kiedy naprawia uszkodzone znaki', loremLayout: 'Lorem Ipsum z realną kontrolą układu: rozsądne użycie tekstu zastępczego', characterCounter: 'Licznik znaków dla opisów meta, nagłówków i snippetów', palindrome: 'Sprawdzanie palindromów jako prosty sposób nauki logiki ciągów', cleanText: 'Czyszczenie tekstu przed importem do arkusza: praktyczna lista kontrolna', writingStack: 'Praktyczny zestaw narzędzi pisarskich dla małych zespołów'
    },
    nl: {
      wordCounter: 'Een woordenteller gebruiken om klanttekst zonder giswerk te bewerken', caseConverter: 'Case-converter opruimworkflow voor titels, labels en data', slugGenerator: 'Slug-generatorgids: schone URL’s voor tools, blogs en landingspagina’s', textDiff: 'Tekstverschil voor het beoordelen van edits: praktische gids voor niet-ontwikkelaars', htmlEntities: 'HTML-entiteiten coderen voor publicatie: wanneer het kapotte tekens oplost', loremLayout: 'Lorem Ipsum met echte layoutchecks: placeholdertekst verstandig gebruiken', characterCounter: 'Tekenteller voor metabeschrijvingen, koppen en snippets', palindrome: 'Palindroomchecker als eenvoudige manier om stringlogica te leren', cleanText: 'Tekst opschonen vóór spreadsheetimport: praktische checklist', writingStack: 'Een praktische schrijftoolstack voor kleine teams'
    }
  };

  var PHASE3_TEXT_COPY = {
    tr: { category: 'Metin ve yazım', cover: 'Metin iş akışı', read: '10 dk okuma', lede: '{topic} rehberi; kaynak metni, hedef formatı ve okuyucunun gerçekten ihtiyaç duyduğu sonucu netleştirerek güvenilir bir metin çıktısı hazırlamanıza yardımcı olur.', summaryText: '{topic} için orijinal metni koruyun, tek bir geri alınabilir düzenleme yapın, biçim ve anlamı kontrol edin ve sonraki yayın ya da teslim adımını netleştirin.', openTool: 'Metin aracını aç', viewTools: 'Metin araçlarını görüntüle', body: '{topic} için hızlı ama kontrollü ilerleyin: amacı not edin, başlıkları, karakterleri, satır kırılımlarını, bağlantıları ve hedef formatı kontrol edin.', detail: 'Sonucu kopyalamadan veya paylaşmadan önce belge, CMS, e-posta, tablo ya da müşteri notu gibi gerçek kullanım yerinde yeniden okuyun.', relatedParagraph: 'Sonraki adım, oluşturduğunuz metin çıktısına bağlıdır. Gerekirse kategori merkezini açın veya benzer rehberlerle karşılaştırın.', conclusion: '{topic} en iyi görünür bir metin iş akışıyla yönetilir: kaynağı koruyun, amacı belirleyin, çıktıyı okuyun ve paylaşmadan önce hedef bağlamda çalıştığını doğrulayın.' },
    de: { category: 'Text und Schreiben', cover: 'Text-Workflow', read: '10 Min. Lesezeit', lede: 'Dieser Leitfaden zu {topic} klärt Quelltext, Zielformat und Leserbedarf, damit die Textausgabe verlässlich bleibt.', summaryText: 'Für {topic}: Originaltext behalten, eine umkehrbare Bearbeitung vornehmen, Format und Bedeutung prüfen und den nächsten Veröffentlichungs- oder Übergabeschritt klären.', openTool: 'Texttool öffnen', viewTools: 'Texttools anzeigen', body: 'Gehen Sie bei {topic} schnell, aber kontrolliert vor: Zweck notieren und Überschriften, Zeichen, Zeilenumbrüche, Links sowie Zielformat prüfen.', detail: 'Lesen Sie das Ergebnis vor dem Kopieren oder Teilen dort erneut, wo es wirklich verwendet wird: Dokument, CMS, E-Mail, Tabelle oder Kundennotiz.', relatedParagraph: 'Der nächste Schritt hängt von der erstellten Textausgabe ab. Öffnen Sie bei Bedarf den Kategorie-Hub oder vergleichen Sie ähnliche Leitfäden.', conclusion: '{topic} funktioniert am besten mit einem sichtbaren Text-Workflow: Quelle schützen, Zweck festlegen, Ausgabe lesen und vor dem Teilen im Zielkontext prüfen.' },
    fr: { category: 'Texte et rédaction', cover: 'Workflow texte', read: '10 min de lecture', lede: 'Ce guide sur {topic} clarifie le texte source, le format cible et le besoin du lecteur pour produire une sortie fiable.', summaryText: 'Pour {topic}, gardez l’original, faites une modification réversible, vérifiez forme et sens, puis clarifiez l’étape de publication ou de livraison.', openTool: 'Ouvrir l’outil texte', viewTools: 'Voir les outils texte', body: 'Pour {topic}, avancez vite mais avec contrôle : notez l’objectif, vérifiez titres, caractères, retours ligne, liens et format cible.', detail: 'Avant de copier ou partager, relisez le résultat dans son vrai contexte : document, CMS, e-mail, tableur ou note client.', relatedParagraph: 'La suite dépend du texte obtenu. Ouvrez le hub de catégorie si nécessaire ou comparez des guides similaires.', conclusion: '{topic} se gère mieux avec un workflow texte visible : protéger la source, définir l’objectif, relire la sortie et vérifier son contexte avant partage.' },
    es: { category: 'Texto y escritura', cover: 'Flujo de texto', read: '10 min de lectura', lede: 'Esta guía sobre {topic} aclara el texto fuente, el formato destino y lo que necesita el lector para crear una salida confiable.', summaryText: 'Para {topic}, conserve el original, haga una edición reversible, revise formato y significado, y defina el siguiente paso de publicación o entrega.', openTool: 'Abrir herramienta de texto', viewTools: 'Ver herramientas de texto', body: 'Para {topic}, avance rápido pero con control: anote el propósito y revise títulos, caracteres, saltos de línea, enlaces y formato destino.', detail: 'Antes de copiar o compartir, relea el resultado en su contexto real: documento, CMS, correo, hoja de cálculo o nota de cliente.', relatedParagraph: 'El siguiente paso depende del texto creado. Abra la categoría si hace falta o compare guías similares.', conclusion: '{topic} funciona mejor con un flujo de texto visible: proteja la fuente, defina el objetivo, lea la salida y verifique el contexto antes de compartir.' },
    pt: { category: 'Texto e escrita', cover: 'Fluxo de texto', read: '10 min de leitura', lede: 'Este guia sobre {topic} alinha texto de origem, formato de destino e necessidade do leitor para gerar uma saída confiável.', summaryText: 'Para {topic}, guarde o original, faça uma edição reversível, revise formato e sentido e defina o próximo passo de publicação ou entrega.', openTool: 'Abrir ferramenta de texto', viewTools: 'Ver ferramentas de texto', body: 'Para {topic}, avance com rapidez e controle: anote o objetivo e confira títulos, caracteres, quebras de linha, links e formato de destino.', detail: 'Antes de copiar ou compartilhar, releia o resultado no uso real: documento, CMS, e-mail, planilha ou nota para cliente.', relatedParagraph: 'O próximo passo depende do texto criado. Abra a categoria se necessário ou compare guias semelhantes.', conclusion: '{topic} funciona melhor com um fluxo de texto visível: proteja a origem, defina o objetivo, leia a saída e confirme o contexto antes de compartilhar.' },
    ru: { category: 'Текст и письмо', cover: 'Текстовый процесс', read: '10 мин чтения', lede: 'Руководство по теме «{topic}» помогает уточнить исходный текст, целевой формат и потребности читателя.', summaryText: 'Для «{topic}» сохраните оригинал, сделайте одно обратимое редактирование, проверьте формат и смысл и определите следующий шаг публикации или передачи.', openTool: 'Открыть текстовый инструмент', viewTools: 'Смотреть текстовые инструменты', body: 'Для «{topic}» действуйте быстро, но контролируемо: зафиксируйте цель и проверьте заголовки, символы, переносы строк, ссылки и целевой формат.', detail: 'Перед копированием или отправкой перечитайте результат там, где он будет использован: документ, CMS, письмо, таблица или заметка клиенту.', relatedParagraph: 'Следующий шаг зависит от созданного текста. При необходимости откройте категорию или сравните похожие руководства.', conclusion: '«{topic}» лучше всего работает с видимым текстовым процессом: защитите источник, задайте цель, прочитайте вывод и проверьте контекст перед отправкой.' },
    zh: { category: '文本与写作', cover: '文本工作流', read: '10 分钟阅读', lede: '本指南围绕“{topic}”，帮助你明确源文本、目标格式和读者真正需要的结果。', summaryText: '处理“{topic}”时，请保留原文，只做一个可撤销编辑，检查格式和含义，并明确发布或交付的下一步。', openTool: '打开文本工具', viewTools: '查看文本工具', body: '处理“{topic}”要快速但受控：记录用途，检查标题、字符、换行、链接和目标格式。', detail: '复制或分享前，请在实际使用场景中重读结果，例如文档、CMS、邮件、表格或客户备注。', relatedParagraph: '下一步取决于你创建的文本。需要时打开分类中心，或与相似指南对照。', conclusion: '“{topic}”最适合用可见的文本流程处理：保护来源，确定目标，阅读输出，并在分享前确认它适合目标语境。' },
    ja: { category: 'テキストと文章', cover: 'テキストワークフロー', read: '10分で読めます', lede: 'この「{topic}」ガイドは、元テキスト、出力形式、読者に必要な結果を整理し、信頼できるテキスト出力を作るためのものです。', summaryText: '{topic}では、元テキストを残し、戻せる編集を一つだけ行い、形式と意味を確認して公開または受け渡しの次手順を明確にします。', openTool: 'テキストツールを開く', viewTools: 'テキストツールを見る', body: '{topic}では、目的を記録し、見出し、文字、改行、リンク、出力形式を確認しながら進めます。', detail: 'コピーや共有の前に、文書、CMS、メール、表、クライアントメモなど実際の利用場所で読み直します。', relatedParagraph: '次の手順は作成したテキストによって変わります。必要ならカテゴリーを開き、似たガイドと比較してください。', conclusion: '{topic}は、元テキストを守り、目的を決め、出力を読み、共有前に利用先の文脈で確認する流れが安全です。' },
    ko: { category: '텍스트와 글쓰기', cover: '텍스트 워크플로', read: '10분 읽기', lede: '{topic} 가이드는 원본 텍스트, 대상 형식, 독자가 실제로 필요한 결과를 분명히 하여 신뢰할 수 있는 텍스트 출력을 만드는 데 도움을 줍니다.', summaryText: '{topic}에서는 원문을 보관하고, 되돌릴 수 있는 편집을 하나만 적용한 뒤 형식과 의미, 다음 게시 또는 전달 단계를 확인하세요.', openTool: '텍스트 도구 열기', viewTools: '텍스트 도구 보기', body: '{topic}에서는 빠르지만 통제된 방식이 필요합니다. 목적을 적고 제목, 문자, 줄바꿈, 링크, 대상 형식을 확인하세요.', detail: '복사하거나 공유하기 전에 문서, CMS, 이메일, 스프레드시트 또는 고객 메모처럼 실제 사용될 곳에서 다시 읽어보세요.', relatedParagraph: '다음 단계는 만든 텍스트 결과에 따라 달라집니다. 필요하면 카테고리를 열거나 비슷한 가이드와 비교하세요.', conclusion: '{topic}은 원본 보호, 목적 정의, 출력 읽기, 공유 전 대상 맥락 확인이라는 보이는 텍스트 흐름에서 가장 안전합니다.' },
    ar: { category: 'النص والكتابة', cover: 'سير عمل النص', read: 'قراءة 10 دقائق', lede: 'يساعدك دليل {topic} على توضيح النص الأصلي والتنسيق المستهدف وما يحتاجه القارئ فعلاً.', summaryText: 'في {topic} احتفظ بالنص الأصلي، أجرِ تعديلًا واحدًا قابلًا للتراجع، راجع الشكل والمعنى، وحدد خطوة النشر أو التسليم التالية.', openTool: 'افتح أداة النص', viewTools: 'عرض أدوات النص', body: 'في {topic} تقدّم بسرعة لكن بحذر: اكتب الغرض وراجع العناوين والأحرف وفواصل الأسطر والروابط والتنسيق المستهدف.', detail: 'قبل النسخ أو المشاركة، أعد قراءة الناتج في مكان استخدامه الفعلي مثل مستند أو CMS أو بريد أو جدول أو ملاحظة عميل.', relatedParagraph: 'تعتمد الخطوة التالية على النص الذي أنشأته. افتح مركز الفئة عند الحاجة أو قارن مع أدلة مشابهة.', conclusion: 'يُدار {topic} بشكل أفضل عبر سير نص واضح: احمِ المصدر، حدد الغرض، اقرأ الناتج، وتحقق من سياقه قبل المشاركة.' },
    hi: { category: 'टेक्स्ट और लेखन', cover: 'टेक्स्ट वर्कफ़्लो', read: '10 मिनट पढ़ें', lede: '{topic} गाइड स्रोत टेक्स्ट, लक्ष्य फ़ॉर्मैट और पाठक की वास्तविक ज़रूरत स्पष्ट करके भरोसेमंद टेक्स्ट आउटपुट बनाने में मदद करता है।', summaryText: '{topic} में मूल टेक्स्ट रखें, एक उलटने योग्य संपादन करें, रूप और अर्थ जाँचें और प्रकाशन या डिलीवरी का अगला कदम स्पष्ट करें।', openTool: 'टेक्स्ट टूल खोलें', viewTools: 'टेक्स्ट टूल देखें', body: '{topic} में तेज़ लेकिन नियंत्रित रहें: उद्देश्य लिखें और शीर्षक, अक्षर, लाइन ब्रेक, लिंक तथा लक्ष्य फ़ॉर्मैट जाँचें।', detail: 'कॉपी या साझा करने से पहले परिणाम को दस्तावेज़, CMS, ईमेल, शीट या क्लाइंट नोट जैसे वास्तविक उपयोग स्थान में दोबारा पढ़ें।', relatedParagraph: 'अगला कदम बनाए गए टेक्स्ट पर निर्भर करता है। ज़रूरत हो तो श्रेणी केंद्र खोलें या मिलते-जुलते गाइड देखें।', conclusion: '{topic} सबसे अच्छा तब संभलता है जब टेक्स्ट प्रक्रिया दिखाई दे: स्रोत सुरक्षित रखें, उद्देश्य तय करें, आउटपुट पढ़ें और साझा करने से पहले लक्ष्य संदर्भ जाँचें।' },
    it: { category: 'Testo e scrittura', cover: 'Workflow testo', read: '10 min di lettura', lede: 'Questa guida su {topic} chiarisce testo sorgente, formato di destinazione e bisogno del lettore per creare un output affidabile.', summaryText: 'Per {topic}, conserva l’originale, fai una modifica reversibile, controlla forma e significato e chiarisci il prossimo passaggio di pubblicazione o consegna.', openTool: 'Apri strumento testo', viewTools: 'Vedi strumenti testo', body: 'Per {topic}, procedi rapidamente ma con controllo: annota lo scopo e verifica titoli, caratteri, interruzioni di riga, link e formato di destinazione.', detail: 'Prima di copiare o condividere, rileggi il risultato nel contesto reale: documento, CMS, e-mail, foglio di calcolo o nota cliente.', relatedParagraph: 'Il passo successivo dipende dal testo creato. Apri la categoria se serve o confronta guide simili.', conclusion: '{topic} funziona meglio con un workflow testo visibile: proteggi la sorgente, definisci lo scopo, leggi l’output e verifica il contesto prima di condividere.' },
    pl: { category: 'Tekst i pisanie', cover: 'Przepływ tekstu', read: '10 min czytania', lede: 'Ten poradnik o {topic} pomaga ustalić tekst źródłowy, format docelowy i rzeczywistą potrzebę czytelnika.', summaryText: 'Dla {topic}: zachowaj oryginał, wykonaj jedną odwracalną edycję, sprawdź formę i znaczenie oraz określ kolejny krok publikacji lub przekazania.', openTool: 'Otwórz narzędzie tekstowe', viewTools: 'Zobacz narzędzia tekstowe', body: 'Przy {topic} działaj szybko, ale kontrolowanie: zapisz cel i sprawdź nagłówki, znaki, łamania wierszy, linki oraz format docelowy.', detail: 'Przed skopiowaniem lub udostępnieniem przeczytaj wynik w realnym miejscu użycia: dokumencie, CMS, e-mailu, arkuszu lub notatce klienta.', relatedParagraph: 'Następny krok zależy od utworzonego tekstu. W razie potrzeby otwórz kategorię lub porównaj podobne poradniki.', conclusion: '{topic} najlepiej działa w widocznym procesie tekstowym: chroń źródło, określ cel, przeczytaj wynik i sprawdź kontekst przed udostępnieniem.' },
    nl: { category: 'Tekst en schrijven', cover: 'Tekstworkflow', read: '10 min lezen', lede: 'Deze gids over {topic} helpt brontekst, doelformaat en lezersbehoefte duidelijk te maken voor betrouwbare tekstuitvoer.', summaryText: 'Voor {topic}: bewaar het origineel, doe één omkeerbare bewerking, controleer vorm en betekenis en bepaal de volgende publicatie- of overdrachtsstap.', openTool: 'Teksttool openen', viewTools: 'Teksttools bekijken', body: 'Werk bij {topic} snel maar gecontroleerd: noteer het doel en controleer koppen, tekens, regelafbrekingen, links en doelformaat.', detail: 'Lees het resultaat vóór kopiëren of delen opnieuw in de echte gebruiksplek: document, CMS, e-mail, spreadsheet of klantnotitie.', relatedParagraph: 'De volgende stap hangt af van de gemaakte tekst. Open zo nodig de categorie of vergelijk soortgelijke gidsen.', conclusion: '{topic} werkt het best met een zichtbare tekstworkflow: bescherm de bron, bepaal het doel, lees de uitvoer en controleer de context vóór delen.' }
  };

  function phase1Format(template, topic) {
    return String(template || '').replaceAll('{topic}', topic);
  }

  function phase1Store(el, key, value) {
    var attr = 'data-phase1-original-' + key;
    if (!el.hasAttribute(attr)) el.setAttribute(attr, value || '');
    return el.getAttribute(attr) || '';
  }

  function phase1Text(el, value) {
    if (!el) return;
    phase1Store(el, 'text', el.textContent);
    el.textContent = value;
  }

  function phase1RestoreText(el) {
    if (el && el.hasAttribute('data-phase1-original-text')) el.textContent = el.getAttribute('data-phase1-original-text') || '';
  }

  function phase1LocalizeGeneratedBlogArticle() {
    var match = window.location.pathname.match(/\/blog\/articles\/([^/]+)\.html$/);
    if (!match) return;
    var isPhase2Blog = Object.prototype.hasOwnProperty.call(PHASE2_BLOG_SLUGS, match[1]);
    var isPhase3Blog = Object.prototype.hasOwnProperty.call(PHASE3_BLOG_SLUGS, match[1]);
    var topicKey = PHASE1_BLOG_SLUGS[match[1]] || PHASE2_BLOG_SLUGS[match[1]] || PHASE3_BLOG_SLUGS[match[1]];
    if (!topicKey) return;

    var originals = document.querySelectorAll('[data-phase1-original-text]');
    var description = document.querySelector('meta[name="description"]');
    if (description && !description.hasAttribute('data-phase1-original-content')) {
      description.setAttribute('data-phase1-original-content', description.getAttribute('content') || '');
    }
    if (!document.documentElement.hasAttribute('data-phase1-original-title')) {
      document.documentElement.setAttribute('data-phase1-original-title', document.title || '');
    }
    if (currentLanguage === 'en') {
      originals.forEach(phase1RestoreText);
      var englishTitles = isPhase2Blog ? PHASE2_TOPIC_TITLES.en : (isPhase3Blog ? PHASE3_TOPIC_TITLES.en : PHASE1_TOPIC_TITLES.en);
      document.title = document.documentElement.getAttribute('data-phase1-original-title') || englishTitles[topicKey] + ' | MC NovaTools Guides';
      if (description) description.setAttribute('content', description.getAttribute('data-phase1-original-content') || '');
      document.documentElement.dir = 'ltr';
      return;
    }

    var copy = PHASE1_COPY[currentLanguage];
    var titlesByLanguage = isPhase2Blog ? PHASE2_TOPIC_TITLES : (isPhase3Blog ? PHASE3_TOPIC_TITLES : PHASE1_TOPIC_TITLES);
    var titles = titlesByLanguage[currentLanguage] || titlesByLanguage.en;
    if (!copy || !titles) return;
    if (isPhase2Blog && PHASE2_IMAGE_COPY[currentLanguage]) {
      copy = Object.assign({}, copy, PHASE2_IMAGE_COPY[currentLanguage]);
    }
    if (isPhase3Blog && PHASE3_TEXT_COPY[currentLanguage]) {
      copy = Object.assign({}, copy, PHASE3_TEXT_COPY[currentLanguage]);
    }
    var topic = titles[topicKey] || titlesByLanguage.en[topicKey];

    document.title = topic + ' | MC NovaTools Guides';
    if (description) description.setAttribute('content', phase1Format(copy.summaryText, topic));

    document.querySelectorAll('.nav-desktop .nav-link').forEach(function(el, index) { if (copy.nav[index]) phase1Text(el, copy.nav[index]); });
    phase1Text(document.querySelector('[data-locale-field="title"]'), topic);
    phase1Text(document.querySelector('[data-locale-field="excerpt"]'), phase1Format(copy.lede, topic));
    phase1Text(document.querySelector('.summary-box strong'), copy.summary);
    phase1Text(document.querySelector('[data-locale-field="summary"]'), phase1Format(copy.summaryText, topic));
    phase1Text(document.querySelector('[data-locale-field="cta.primary"]'), copy.openTool);
    phase1Text(document.querySelector('[data-locale-field="cta.secondary"]'), copy.viewTools);
    phase1Text(document.querySelector('.article-back'), (articleUiLocalesForCurrent() || {}).back || copy.nav[4]);
    phase1Text(document.querySelector('.article-meta .tag'), copy.category || copy.pdf);
    phase1Text(document.querySelector('.article-meta span:nth-of-type(2)'), copy.cover);
    phase1Text(document.querySelector('.article-meta span:nth-of-type(3)'), copy.read);
    phase1Text(document.querySelector('.article-visual figcaption'), copy.cover);

    document.querySelectorAll('[data-locale-section]').forEach(function(heading) {
      var index = Number(heading.getAttribute('data-locale-section'));
      phase1Text(heading, copy.headings[index] || copy.headings[0]);
      var section = heading.closest('section');
      if (!section) return;
      var paragraphs = section.querySelectorAll(':scope > p');
      if (paragraphs[0]) phase1Text(paragraphs[0], phase1Format(copy.body, topic));
      if (paragraphs[1]) phase1Text(paragraphs[1], phase1Format(copy.detail, topic));
    });

    phase1Text(document.querySelector('[data-article-ui="relatedHeading"]'), copy.relatedHeading);
    phase1Text(document.querySelector('[data-article-ui="relatedParagraph"]'), copy.relatedParagraph);
    phase1Text(document.querySelector('[data-article-ui="openTool"]'), copy.openToolLabel);
    phase1Text(document.querySelector('[data-article-ui="openCategory"]'), copy.openCategory);
    document.querySelectorAll('.related-post-list a').forEach(function(el, index) { phase1Text(el, copy.relatedGuide + ' ' + (index + 1)); });

    phase1Text(document.querySelector('[data-article-ui="faqHeading"]'), copy.faqHeading);
    var faqs = document.querySelectorAll('.article-faq');
    if (faqs[0]) { phase1Text(faqs[0].querySelector('summary'), copy.faqQ1); phase1Text(faqs[0].querySelector('p'), copy.faqA1); }
    if (faqs[1]) { phase1Text(faqs[1].querySelector('summary'), copy.faqQ2); phase1Text(faqs[1].querySelector('p'), copy.faqA2); }

    phase1Text(document.querySelector('[data-article-ui="conclusionHeading"]'), copy.conclusionHeading);
    var conclusion = document.querySelector('[data-article-ui="conclusionHeading"]');
    if (conclusion && conclusion.nextElementSibling) phase1Text(conclusion.nextElementSibling, phase1Format(copy.conclusion, topic));

    var footer = document.querySelector('.footer-bottom');
    if (footer) {
      phase1Text(footer.querySelector('p'), copy.footer);
      footer.querySelectorAll('a').forEach(function(el, index) { if (copy.footerLinks[index]) phase1Text(el, copy.footerLinks[index]); });
    }
  }

  function articleUiLocalesForCurrent() {
    var map = {
      tr: { back: '← Blog merkezi' }, de: { back: '← Blog-Zentrale' }, fr: { back: '← Centre du blog' }, es: { back: '← Centro del blog' }, pt: { back: '← Central do blog' }, ru: { back: '← Центр блога' }, zh: { back: '← 博客中心' }, ja: { back: '← ブログハブ' }, ko: { back: '← 블로그 허브' }, ar: { back: '← مركز المدونة' }, hi: { back: '← ब्लॉग केंद्र' }, it: { back: '← Hub del blog' }, pl: { back: '← Centrum bloga' }, nl: { back: '← Bloghub' }
    };
    return map[currentLanguage];
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

  window.addEventListener('languageChanged', function() {
    setTimeout(phase1LocalizeGeneratedBlogArticle, 0);
  });

  function boot() {
    init();
    initQualityEnhancements();
    removeRadioPlayers();
    enhanceToolQualityPanel();
    enhancePublicSurfaces();
    phase1LocalizeGeneratedBlogArticle();
    ensureAdSenseBootstrap();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
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
    .public-localized-mode > :not(.public-localized-content):not(.public-trust-upgrade) { display: none !important; }    .public-localized-content {      width: min(1040px, calc(100% - 32px));      margin: 2rem auto 1rem;      padding: clamp(1.5rem, 3vw, 2.5rem);      border-radius: 26px;      border: 1px solid rgba(148, 163, 184, 0.24);      background: linear-gradient(180deg, rgba(15,23,42,.9), rgba(15,23,42,.72));      color: #f8fafc;    }    .public-localized-content h1 { margin: 0 0 1rem; font-size: clamp(2.4rem, 5vw, 4rem); }    .public-localized-content p { font-size: 1.12rem; line-height: 1.82; color: #cbd5e1; }    .public-trust-upgrade {      width: min(1040px, calc(100% - 32px));      margin: 1.5rem auto;      padding: clamp(1.25rem, 2vw, 2rem);      border-radius: 22px;      border: 1px solid rgba(148, 163, 184, 0.22);      background: rgba(15, 23, 42, 0.76);      color: #dbeafe;      font-size: 1.05rem;      line-height: 1.75;    }    .public-trust-badge {      display: inline-flex;      margin-bottom: .75rem;      padding: .35rem .8rem;      border-radius: 999px;      background: rgba(34,211,238,.12);      color: #a5f3fc;      font-weight: 700;      font-size: .9rem;    }    .public-trust-cards {      display: grid;      grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));      gap: .75rem;      margin-top: 1rem;    }    .public-trust-cards div, .category-benefit-summary {      border: 1px solid rgba(148, 163, 184, 0.18);      background: rgba(255,255,255,.035);      border-radius: 14px;      padding: .85rem;      color: #cbd5e1;      line-height: 1.55;    }    .category-benefit-summary {      margin: .8rem 0 0;      font-size: .92rem;    }    .public-footer-note {      width: min(1040px, calc(100% - 32px));      margin: 1rem auto;      color: #94a3b8;      text-align: center;      font-size: .95rem;    }    body:has(.public-trust-upgrade) main p, body:has(.public-trust-upgrade) main li {      font-size: 1.04rem;      line-height: 1.78;    }    body:has(.public-trust-upgrade) main h1 {      font-size: clamp(2.25rem, 4vw, 3.6rem);    }    .radio-player, #radio-player, #deep-focus-radio { display: none !important; }    .ad-slot-reserved {      min-height: 250px;      background: rgba(15, 23, 42, 0.38);      border-radius: 12px;    }    .tool-quality-panel {      width: min(960px, calc(100% - 32px));      margin: 1rem auto 2rem;      padding: 1rem;      display: grid;      gap: 0.75rem;      color: #cbd5e1;      background: rgba(15, 23, 42, 0.72);      border: 1px solid rgba(148, 163, 184, 0.22);      border-radius: 16px;      line-height: 1.65;    }    .tool-quality-panel strong { color: #f8fafc; }    .tool-quality-panel a { color: #22d3ee; }        /* Mobile adjustments */\
    @media (max-width: 768px) {\
      .language-selector {\
        font-size: 12px;\
        padding: 4px 8px;\
      }\
    }\
  ';
  document.head.appendChild(styles);

})();
