/**
 * AdSlot Component
 * AdSense advertisement container with Premium Dark Mode styling
 */

/**
 * Create an AdSense ad slot
 * @param {Object} options - Configuration options
 * @param {string} options.slotId - AdSense slot ID
 * @param {string} options.format - Ad format (horizontal, vertical, rectangle)
 * @param {string} options.style - Container style (banner, sidebar, inline)
 * @param {boolean} options.responsive - Whether ad is responsive
 * @returns {HTMLElement} Ad container element
 */
export function createAdSlot({
  slotId = 'XXXXXXXXXX',
  format = 'auto',
  style = 'banner',
  responsive = true
} = {}) {
  const container = document.createElement('div');
  container.className = `ad-slot ad-slot--${style}`;
  
  // AdSense ins element
  const adIns = document.createElement('ins');
  adIns.className = 'adsbygoogle';
  adIns.style.display = 'block';
  
  if (responsive) {
    adIns.style.width = '100%';
  }
  
  // AdSense attributes
  adIns.setAttribute('data-ad-client', 'ca-pub-XXXXXXXXXXXXXXXX');
  adIns.setAttribute('data-ad-slot', slotId);
  adIns.setAttribute('data-ad-format', format);
  adIns.setAttribute('data-full-width-responsive', responsive ? 'true' : 'false');
  
  // Label
  const label = document.createElement('span');
  label.className = 'ad-slot__label';
  label.textContent = 'Advertisement';
  
  container.appendChild(label);
  container.appendChild(adIns);
  
  // Push ad to AdSense
  if (typeof window !== 'undefined' && window.adsbygoogle) {
    try {
      window.adsbygoogle.push({});
    } catch (e) {
      console.warn('AdSense push failed:', e);
    }
  }
  
  return container;
}

/**
 * Predefined ad slot configurations
 */
export const AdSlots = {
  /** Top banner ad (728x90 or responsive) */
  topBanner: {
    slotId: 'TOP_BANNER_SLOT',
    format: 'horizontal',
    style: 'banner',
    responsive: true
  },
  
  /** Sidebar ad (336x280 or 300x250) */
  sidebar: {
    slotId: 'SIDEBAR_SLOT',
    format: 'vertical',
    style: 'sidebar',
    responsive: false
  },
  
  /** Medium rectangle between content */
  inline: {
    slotId: 'INLINE_SLOT',
    format: 'rectangle',
    style: 'inline',
    responsive: true
  },
  
  /** Mobile anchor ad (320x50) */
  mobileAnchor: {
    slotId: 'ANCHOR_SLOT',
    format: 'horizontal',
    style: 'anchor',
    responsive: false
  }
};

/**
 * Initialize all ads on page
 */
export function initializeAds() {
  // Push all unfilled ad slots
  document.querySelectorAll('.adsbygoogle:not([data-ad-status])').forEach(ad => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (e) {
      console.warn('Ad initialization failed:', e);
    }
  });
}

/**
 * Lazy load ads when they enter viewport
 */
export function lazyLoadAds() {
  if (!('IntersectionObserver' in window)) {
    // Fallback: load all ads immediately
    initializeAds();
    return;
  }
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const ad = entry.target;
        if (!ad.hasAttribute('data-ad-loaded')) {
          try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
            ad.setAttribute('data-ad-loaded', 'true');
          } catch (e) {
            console.warn('Lazy ad load failed:', e);
          }
        }
        observer.unobserve(ad);
      }
    });
  }, {
    rootMargin: '100px 0px',
    threshold: 0.01
  });
  
  document.querySelectorAll('.adsbygoogle').forEach(ad => {
    observer.observe(ad);
  });
}

export default { createAdSlot, AdSlots, initializeAds, lazyLoadAds };
