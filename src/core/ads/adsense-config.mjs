/**
 * Google AdSense Configuration
 * Contextual-only ads (zero personalized tracking)
 * GDPR/CCPA exempt setup
 */

const ADSENSE_CONFIG = {
  publisherId: 'ca-pub-5738022526587953',
  
  adUnits: {},
  
  privacy: {
    personalizedAds: false,
    restrictedDataProcessing: true,
    disableCookies: true,
    npa: true
  },
  
  lazyLoad: {
    fetchMarginPercent: 100,
    renderMarginPercent: 50,
    mobileScaling: 2.0
  }
};

export function initAdSense() {
  if (shouldBlockAds() || !hasValidAdSlots()) {
    reserveAdSlotSpace();
    return;
  }

  configureAdPrivacy();
  reserveAdSlotSpace();
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
    if (!/^\d{8,20}$/.test((el.getAttribute('data-ad-slot') || '').trim())) {
      el.setAttribute('data-ad-status', 'pending-valid-slot');
    }
  });
}

function setupLazyLoading() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.adLoaded) {
        entry.target.dataset.adLoaded = 'true';
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (_e) {
    // Storage/ad operation may fail in restricted environments
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
