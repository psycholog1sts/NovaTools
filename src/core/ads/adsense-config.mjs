/**
 * Google AdSense Configuration
 * Contextual-only ads (zero personalized tracking)
 * GDPR/CCPA exempt setup
 */

const ADSENSE_CONFIG = {
  publisherId: 'ca-pub-XXXXXXXXXXXXXXXX',
  
  adUnits: {
    sidebar: {
      slot: '1234567890',
      format: 'auto',
      responsive: true,
      style: { minHeight: '280px', minWidth: '300px' }
    },
    anchor: {
      slot: '0987654321',
      format: 'anchor',
      position: 'bottom',
      style: { minHeight: '50px', width: '100%' }
    }
  },
  
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
  if (shouldBlockAds()) {
    console.log('[Ads] Blocking ads - DNT enabled');
    return;
  }
  
  configureAdPrivacy();
  loadAdSenseScript();
  initializeAdSlots();
}

function shouldBlockAds() {
  if (navigator.doNotTrack === '1') return true;
  if (navigator.globalPrivacyControl) return true;
  try {
    if (localStorage.getItem('novatools_no_ads') === 'true') return true;
  } catch (e) {}
  return false;
}

function configureAdPrivacy() {
  window.adsbygoogle = window.adsbygoogle || [];
  window.adsbygoogle.requestNonPersonalizedAds = 1;
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
  initSidebarAd();
  initAnchorAd();
  setupLazyLoading();
}

function initSidebarAd() {
  const container = document.getElementById('ad-sidebar');
  if (!container || window.innerWidth < 1024) return;
  
  const adElement = createAdElement({
    slot: ADSENSE_CONFIG.adUnits.sidebar.slot,
    format: 'auto',
    responsive: true,
    style: ADSENSE_CONFIG.adUnits.sidebar.style
  });
  
  container.appendChild(adElement);
  
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
  } catch (e) {}
}

function initAnchorAd() {
  const container = document.getElementById('ad-anchor');
  if (!container || window.innerWidth >= 1024) return;
  
  const skeleton = container.querySelector('.skeleton');
  if (skeleton) skeleton.remove();
  
  const adElement = createAdElement({
    slot: ADSENSE_CONFIG.adUnits.anchor.slot,
    format: 'anchor',
    style: ADSENSE_CONFIG.adUnits.anchor.style
  });
  
  container.innerHTML = '';
  container.appendChild(adElement);
  
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({ overlays: { bottom: true } });
  } catch (e) {}
}

function createAdElement({ slot, format, responsive, style }) {
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.setAttribute('data-ad-client', ADSENSE_CONFIG.publisherId);
  ins.setAttribute('data-ad-slot', slot);
  ins.setAttribute('data-ad-format', format);
  ins.setAttribute('data-full-width-responsive', responsive ? 'true' : 'false');
  
  if (style) {
    ins.style.minHeight = style.minHeight || 'auto';
    ins.style.minWidth = style.minWidth || 'auto';
  }
  
  return ins;
}

function setupLazyLoading() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !entry.target.dataset.adLoaded) {
        entry.target.dataset.adLoaded = 'true';
        try {
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {}
      }
    });
  }, { rootMargin: '100%' });
  
  document.querySelectorAll('[id^="ad-"]').forEach(container => {
    observer.observe(container);
  });
}

function showAdFallbacks() {
  const container = document.getElementById('ad-sidebar');
  if (container) {
    container.innerHTML = '<div class="text-center text-gray-400 text-sm p-4">Premium Araçlar Yakında</div>';
  }
}

export function refreshAds() {
  document.querySelectorAll('.adsbygoogle').forEach(el => el.innerHTML = '');
  initializeAdSlots();
}

export function disableAds() {
  try {
    localStorage.setItem('novatools_no_ads', 'true');
    document.querySelectorAll('.adsbygoogle').forEach(el => el.style.display = 'none');
  } catch (e) {}
}

export { ADSENSE_CONFIG };

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAdSense);
} else {
  initAdSense();
}
