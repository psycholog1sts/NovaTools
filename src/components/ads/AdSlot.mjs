/**
 * AdSlot Component - Professional AdSense Integration
 * Flexible ad sizes with Premium Dark Mode styling
 */

/**
 * Ad slot size configurations
 */
export const AdSizes = {
  BANNER: {
    name: 'banner',
    width: 728,
    height: 90,
    className: 'ad-banner',
    slotId: '2852963074'
  },
  RECTANGLE: {
    name: 'rectangle',
    width: 300,
    height: 250,
    className: 'ad-rectangle',
    slotId: '3963074185'
  },
  SIDEBAR: {
    name: 'sidebar',
    width: 300,
    height: 600,
    className: 'ad-sidebar',
    slotId: '7418529630'
  },
  MOBILE_ANCHOR: {
    name: 'mobile-anchor',
    width: 320,
    height: 50,
    className: 'ad-mobile-anchor',
    slotId: '4074185296'
  },
  SQUARE: {
    name: 'square',
    width: 250,
    height: 250,
    className: 'ad-square',
    slotId: '1741852963'
  }
};

/**
 * Create an AdSense ad slot
 * @param {Object} options - Configuration options
 * @param {string} options.size - Ad size key from AdSizes
 * @param {string} options.adClient - AdSense publisher ID
 * @param {string} options.adSlot - AdSense slot ID
 * @param {boolean} options.showLabel - Show "Sponsored" label
 * @param {string} options.labelText - Custom label text
 * @param {boolean} options.responsive - Enable responsive mode
 * @param {string} options.placement - Semantic placement name for audits
 * @returns {HTMLElement} Ad container element
 */
export function createAdSlot({
  size = 'RECTANGLE',
  adClient = 'ca-pub-5738022526587953',
  adSlot = null,
  showLabel = true,
  labelText = 'Sponsored',
  responsive = false,
  placement = null
} = {}) {
  const config = AdSizes[size] || AdSizes.RECTANGLE;
  const slotId = adSlot || config.slotId;
  const placementName = placement || config.name;
  
  // Container
  const container = document.createElement('div');
  container.className = `ad-slot-container revenue-card ${config.className}-container`;
  container.setAttribute('data-ad-placement', placementName);
  container.style.cssText = `
    margin: 0 auto;
    text-align: center;
    max-width: 100%;
  `;
  
  // Sponsored label
  if (showLabel) {
    const label = document.createElement('div');
    label.className = 'ad-label';
    label.textContent = labelText;
    label.style.cssText = `
      font-size: 0.6875rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--text-muted, #52525B);
      margin-bottom: 0.5rem;
      text-align: center;
    `;
    container.appendChild(label);
  }
  
  // Ad wrapper with Premium Dark styling
  const wrapper = document.createElement('div');
  wrapper.className = `ad-wrapper ad-wrapper--${config.name}`;
  wrapper.style.cssText = `
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 0.75rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: ${config.width}px;
    min-height: ${config.height}px;
    max-width: 100%;
    overflow: hidden;
    position: relative;
  `;
  
  // Premium Dark inner highlight
  const highlight = document.createElement('div');
  highlight.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
    pointer-events: none;
  `;
  wrapper.appendChild(highlight);
  
  // AdSense ins element
  const adIns = document.createElement('ins');
  adIns.className = 'adsbygoogle';
  adIns.style.cssText = `
    display: ${responsive ? 'block' : 'inline-block'};
    width: ${responsive ? '100%' : `${config.width}px`};
    height: ${responsive ? 'auto' : `${config.height}px`};
    max-width: 100%;
  `;
  
  // AdSense attributes
  adIns.setAttribute('data-ad-client', adClient);
  adIns.setAttribute('data-ad-slot', slotId);
  adIns.setAttribute('data-ad-format', responsive ? 'auto' : config.name);
  adIns.setAttribute('data-ad-placement', placementName);
  
  if (responsive) {
    adIns.setAttribute('data-full-width-responsive', 'true');
  }
  
  wrapper.appendChild(adIns);
  container.appendChild(wrapper);
  
  return container;
}

/**
 * Create non-sticky header ad (728x90)
 * @param {Object} options - Ad options
 * @returns {HTMLElement} Header ad container
 */
export function createHeaderAd(options = {}) {
  const container = createAdSlot({
    size: 'BANNER',
    showLabel: false,
    responsive: true,
    ...options
  });
  
  container.classList.add('ad-leaderboard-safe');
  container.style.cssText += `
    margin: 10rem auto;
  `;
  
  // Adjust wrapper for header
  const wrapper = container.querySelector('.ad-wrapper');
  if (wrapper) {
    wrapper.style.background = 'transparent';
    wrapper.style.border = 'none';
    wrapper.style.padding = '0';
    wrapper.style.minHeight = '90px';
  }
  
  return container;
}

/**
 * Create sidebar ad container (300x600)
 * @param {string} position - 'left' or 'right'
 * @param {Object} options - Ad options
 * @returns {HTMLElement} Sidebar container
 */
export function createSidebarAd(position = 'right', options = {}) {
  const container = createAdSlot({
    size: 'SIDEBAR',
    labelText: 'Advertisement',
    ...options
  });
  
  container.classList.add(`ad-sidebar-${position}`);
  container.style.cssText += `
    position: sticky;
    top: 7rem;
    ${position}: 1rem;
    z-index: 1;
    display: none;
  `;
  
  // Show on desktop only
  const mediaQuery = window.matchMedia('(min-width: 1400px)');
  const toggleVisibility = () => {
    container.style.display = mediaQuery.matches ? 'block' : 'none';
  };
  
  toggleVisibility();
  mediaQuery.addEventListener('change', toggleVisibility);
  
  return container;
}

/**
 * Create mobile anchor ad (320x50) - Fixed at bottom
 * @param {Object} options - Ad options
 * @returns {HTMLElement} Mobile anchor container
 */
export function createMobileAnchorAd(options = {}) {
  const container = createAdSlot({
    size: 'MOBILE_ANCHOR',
    showLabel: false,
    responsive: true,
    ...options
  });
  
  container.classList.add('ad-mobile-anchor-sticky');
  container.style.cssText += `
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: rgba(10, 10, 12, 0.98);
    backdrop-filter: blur(20px);
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding: 0.5rem;
    margin: 0;
    display: none;
  `;
  container.setAttribute('data-ad-format', 'sticky');

  const closeButton = document.createElement('button');
  closeButton.type = 'button';
  closeButton.className = 'ad-mobile-anchor__close';
  closeButton.setAttribute('data-ad-close', 'true');
  closeButton.setAttribute('aria-label', 'Close advertisement');
  closeButton.textContent = '×';
  container.prepend(closeButton);

  const mediaQuery = window.matchMedia('(max-width: 768px)');
  const toggleVisibility = () => {
    const scrolled = window.scrollY > 480;
    const dismissed = container.getAttribute('data-ad-dismissed') === 'true';
    container.style.display = mediaQuery.matches && scrolled && !dismissed ? 'block' : 'none';
  };

  closeButton.addEventListener('click', () => {
    container.setAttribute('data-ad-dismissed', 'true');
    toggleVisibility();
  });
  toggleVisibility();
  mediaQuery.addEventListener('change', toggleVisibility);
  window.addEventListener('scroll', toggleVisibility, { passive: true });

  return container;
}

/**
 * Create sponsored content disclosure card
 * @param {Object} options - Sponsored content options
 * @returns {HTMLElement} Sponsored content container
 */
export function createSponsoredContentCard({
  label = 'Sponsored',
  title = 'Partner resource',
  description = 'This clearly labeled placement is separate from editorial content.',
  href = null,
  linkText = 'Learn more'
} = {}) {
  const card = document.createElement('aside');
  card.className = 'sponsored-content-card revenue-card';
  card.setAttribute('aria-label', label);

  const badge = document.createElement('span');
  badge.className = 'sponsored-content-card__label';
  badge.textContent = label;
  const heading = document.createElement('h3');
  heading.textContent = title;
  const copy = document.createElement('p');
  copy.textContent = description;
  card.append(badge, heading, copy);

  if (href) {
    const link = document.createElement('a');
    link.className = 'btn btn-secondary nt-affiliate-link';
    link.rel = 'sponsored noopener';
    link.dataset.affiliate = 'true';
    link.href = href;
    link.textContent = linkText;
    card.appendChild(link);
  }

  return card;
}

/**
 * Create premium plan CTA separate from ad inventory
 * @param {Object} options - Premium plan options
 * @returns {HTMLElement} Premium plan container
 */
export function createPremiumPlanCta({
  title = 'Premium API plan',
  description = 'Future API access will be presented separately from advertising inventory.',
  href = '/contact.html',
  linkText = 'Contact us'
} = {}) {
  const cta = document.createElement('aside');
  cta.className = 'premium-plan-cta revenue-card';
  const heading = document.createElement('h3');
  heading.textContent = title;
  const copy = document.createElement('p');
  copy.textContent = description;
  const link = document.createElement('a');
  link.className = 'btn btn-primary';
  link.rel = 'noopener';
  link.href = href;
  link.textContent = linkText;
  cta.append(heading, copy, link);
  return cta;
}

/**
 * Create in-content rectangle ad
 * @param {Object} options - Ad options
 * @returns {HTMLElement} Rectangle ad container
 */
export function createInContentAd(options = {}) {
  return createAdSlot({
    size: 'RECTANGLE',
    labelText: 'Sponsored',
    responsive: true,
    ...options
  });
}

/**
 * Initialize all ads on page with lazy loading
 * @param {Object} config - Global ad configuration
 */
export function initializeAds(config = {}) {
  const defaultConfig = {
    adClient: 'ca-pub-5738022526587953',
    header: true,
    sidebars: true,
    mobileAnchor: false,
    lazyLoad: true,
    ...config
  };
  
  // Lazy load ads when they enter viewport
  if (defaultConfig.lazyLoad && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const ad = entry.target.querySelector('.adsbygoogle');
          if (ad && !ad.hasAttribute('data-ad-loaded')) {
            try {
              (window.adsbygoogle = window.adsbygoogle || []).push({});
              ad.setAttribute('data-ad-loaded', 'true');
            } catch (e) {
              console.warn('Ad load failed:', e);
            }
          }
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '100px 0px',
      threshold: 0.01
    });
    
    document.querySelectorAll('.ad-slot-container').forEach(slot => {
      observer.observe(slot);
    });
  } else {
    // Immediate load if lazy loading not supported
    document.querySelectorAll('.adsbygoogle').forEach(_ad => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (_e) {
        // Ad load failed — non-critical, fallback shown
        void _e;
      }
    });
  }
}

/**
 * Ad placeholder for development/fallback
 * @param {string} size - Size key from AdSizes
 * @returns {HTMLElement} Placeholder element
 */
export function createAdPlaceholder(size = 'RECTANGLE') {
  const config = AdSizes[size] || AdSizes.RECTANGLE;
  
  const placeholder = document.createElement('div');
  placeholder.className = `ad-placeholder ad-placeholder--${config.name}`;
  placeholder.style.cssText = `
    width: ${config.width}px;
    height: ${config.height}px;
    background: rgba(255, 255, 255, 0.03);
    border: 2px dashed rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: var(--text-muted, #52525B);
    font-size: 0.875rem;
  `;
  
  placeholder.innerHTML = `
    <div style="font-size: 1.5rem; margin-bottom: 0.5rem;">📢</div>
    <div>Ad ${config.width}x${config.height}</div>
    <div style="font-size: 0.75rem; margin-top: 0.25rem;">Placeholder</div>
  `;
  
  return placeholder;
}

// Export default
export default {
  AdSizes,
  createAdSlot,
  createHeaderAd,
  createSidebarAd,
  createMobileAnchorAd,
  createInContentAd,
  initializeAds,
  createAdPlaceholder,
  createSponsoredContentCard,
  createPremiumPlanCta
};
