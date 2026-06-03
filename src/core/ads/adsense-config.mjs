/**
 * Google AdSense Configuration
 * Contextual-only ads (zero personalized tracking)
 * GDPR/ePrivacy consent-gated setup
 */

const ADSENSE_CONFIG = {
  publisherId: 'ca-pub-5738022526587953',

  adUnits: {},

  privacy: {
    personalizedAds: false,
    restrictedDataProcessing: true,
    disableCookies: true,
    npa: true,
    requiresAdvertisingConsent: true
  },

  lazyLoad: {
    fetchMarginPercent: 100,
    renderMarginPercent: 50,
    mobileScaling: 2.0
  }
};

const CONSENT_EVENT_NAMES = ['novatools:consent-updated', 'mc-novatools:consent-updated', 'cookieConsentChanged'];

export function initAdSense() {
  reserveAdSlotSpace();
  observeAdStatus();
  setupMobileAnchorControls();

  if (shouldBlockAds() || !hasValidAdSlots()) return;
  if (!hasAdvertisingConsent()) {
    markAdsPendingConsent();
    waitForAdvertisingConsent();
    return;
  }

  configureAdPrivacy();
  deferAdSenseLoad();
}

function shouldBlockAds() {
  if (!/(^|\.)mc-novatools\.com$/i.test(window.location.hostname)) return true;
  if (navigator.doNotTrack === '1') return true;
  if (navigator.globalPrivacyControl) return true;
  try {
    if (localStorage.getItem('novatools_no_ads') === 'true') return true;
  } catch (_e) {
    // Storage/ad operation may fail in restricted environments
    void _e;
  }
  return false;
}

function hasAdvertisingConsent() {
  if (window.NovaToolsConsent?.advertising === true) return true;
  if (window.NovaToolsConsent?.ads === true) return true;

  try {
    const rawConsent = localStorage.getItem('novatools_cookie_consent') || localStorage.getItem('mc_novatools_cookie_consent');
    if (!rawConsent) return false;
    const consent = JSON.parse(rawConsent);
    return consent?.advertising === true || consent?.ads === true || consent?.categories?.advertising === true;
  } catch (_e) {
    void _e;
    return false;
  }
}

function waitForAdvertisingConsent() {
  if (window.__mcAdSenseConsentListener) return;
  window.__mcAdSenseConsentListener = true;

  const onConsentChanged = () => {
    if (!hasAdvertisingConsent() || shouldBlockAds() || !hasValidAdSlots()) return;
    configureAdPrivacy();
    deferAdSenseLoad();
  };

  CONSENT_EVENT_NAMES.forEach((eventName) => window.addEventListener(eventName, onConsentChanged));
}

function markAdsPendingConsent() {
  document.querySelectorAll('ins.adsbygoogle').forEach((el) => {
    if (!el.getAttribute('data-ad-status')) {
      el.setAttribute('data-ad-status', 'pending-consent');
    }
  });
}

function configureAdPrivacy() {
  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.requestNonPersonalizedAds = 1;
}

function deferAdSenseLoad() {
  const start = () => {
    const schedule = window.requestIdleCallback || ((callback) => window.setTimeout(callback, 1));
    schedule(() => {
      loadAdSenseScript();
      initializeAdSlots();
    });
  };

  if (document.readyState === 'complete') {
    start();
  } else {
    window.addEventListener('load', start, { once: true });
  }
}

function loadAdSenseScript() {
  if (document.querySelector('script[data-adsense]')) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CONFIG.publisherId}`;
  script.crossOrigin = 'anonymous';
  script.setAttribute('data-adsense', 'true');
  script.onerror = () => showAdFallbacks();

  document.head.appendChild(script);
}

function initializeAdSlots() {
  setupLazyLoading();
}

function hasValidAdSlots() {
  return Array.from(document.querySelectorAll('ins.adsbygoogle')).some((el) => {
    const slot = el.getAttribute('data-ad-slot') || '';
    return /^\d{8,20}$/.test(slot.trim());
  });
}

function reserveAdSlotSpace() {
  document.querySelectorAll('ins.adsbygoogle').forEach((el) => {
    el.classList.add('ad-slot-reserved');
    reserveSingleAdSlot(el);
    ensureAdLabel(el);
    if (!/^\d{8,20}$/.test((el.getAttribute('data-ad-slot') || '').trim())) {
      el.setAttribute('data-ad-status', 'pending-valid-slot');
    }
  });
}

function reserveSingleAdSlot(el) {
  const format = el.getAttribute('data-ad-format') || '';
  const width = format === 'leaderboard' || el.classList.contains('ad-slot-leaderboard') ? 728 : format === 'sticky' ? 320 : 300;
  const height = format === 'leaderboard' || el.classList.contains('ad-slot-leaderboard') ? 90 : format === 'sticky' ? 50 : format === 'sidebar' ? 600 : 250;
  if (!el.getAttribute('width')) el.setAttribute('width', String(width));
  if (!el.getAttribute('height')) el.setAttribute('height', String(height));
  el.style.minWidth = el.style.minWidth || `min(100%, ${width}px)`;
  el.style.minHeight = el.style.minHeight || `${height}px`;
  el.style.maxHeight = el.style.maxHeight || `${height}px`;
  el.style.aspectRatio = el.style.aspectRatio || `${width} / ${height}`;
  const container = el.closest('.ad-slot-container, .ad-in-tool, .ad-frame, .ad-wrapper, aside, div');
  if (container) {
    container.style.overflow = container.style.overflow || 'hidden';
    container.style.maxHeight = container.style.maxHeight || `calc(${height}px + 4rem)`;
  }
}

function ensureAdLabel(el) {
  const container = el.closest('.ad-slot-container, .ad-in-tool, .ad-frame, .ad-wrapper, aside, div');
  if (!container || container.querySelector('.ad-label')) return;
  const label = document.createElement('span');
  label.className = 'ad-label';
  label.textContent = document.documentElement.lang?.toLowerCase().startsWith('tr') ? 'Reklam' : 'Advertisement';
  container.insertBefore(label, container.firstChild);
}

function setupLazyLoading() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.adLoaded) {
        entry.target.dataset.adLoaded = 'true';
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (_e) {
          // Ad operation may fail in restricted environments
          void _e;
        }
      }
    });
  }, { rootMargin: '100%' });

  document.querySelectorAll('ins.adsbygoogle').forEach((container) => {
    if (/^\d{8,20}$/.test((container.getAttribute('data-ad-slot') || '').trim())) {
      observer.observe(container);
    }
  });
}

function observeAdStatus() {
  if (window.__mcAdStatusObserver) return;
  const updateContainer = (el) => {
    const status = el.getAttribute('data-ad-status');
    const container = el.closest('.ad-slot-container, .ad-frame, .ad-wrapper, .revenue-card');
    if (!container) return;
    container.setAttribute('data-ad-status', status || 'reserved');
  };

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'data-ad-status') {
        updateContainer(mutation.target);
      }
    });
  });

  document.querySelectorAll('ins.adsbygoogle').forEach((el) => {
    observer.observe(el, { attributes: true, attributeFilter: ['data-ad-status'] });
    updateContainer(el);
  });
  window.__mcAdStatusObserver = observer;
}

function setupMobileAnchorControls() {
  document.querySelectorAll('[data-ad-format="sticky"], .ad-mobile-anchor').forEach((container) => {
    const close = container.querySelector('[data-ad-close]');
    if (close) {
      close.addEventListener('click', () => container.setAttribute('data-ad-dismissed', 'true'));
    }
  });
}

function showAdFallbacks() {
  document.querySelectorAll('ins.adsbygoogle').forEach((el) => {
    el.setAttribute('data-ad-status', 'fallback');
  });
}

export function refreshAds() {
  document.querySelectorAll('.adsbygoogle').forEach(el => el.innerHTML = '');
  initializeAdSlots();
}

export function disableAds() {
  try {
    localStorage.setItem('novatools_no_ads', 'true');
    document.querySelectorAll('.adsbygoogle').forEach(el => el.style.display = 'none');
  } catch (_e) {
    // Storage/ad operation may fail in restricted environments
    void _e;
  }
}

export { ADSENSE_CONFIG };
