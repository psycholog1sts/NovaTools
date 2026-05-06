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

  function boot() {
    init();
    initQualityEnhancements();
    removeRadioPlayers();
    enhanceToolQualityPanel();
    enhancePublicSurfaces();
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
