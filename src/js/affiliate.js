/**
 * Affiliate link tracking helpers.
 * Tracks only aggregate click metadata and enforces disclosure-safe link attributes.
 */

const AFFILIATE_SELECTOR = 'a[data-affiliate], a.affiliate-link, a.nt-affiliate-link';
const SAFE_REL_TOKENS = ['sponsored', 'noopener'];

function sanitizeText(value) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 120);
}

function normalizeAffiliateLink(link) {
  const existing = new Set((link.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
  SAFE_REL_TOKENS.forEach((token) => existing.add(token));
  link.setAttribute('rel', Array.from(existing).join(' '));
  link.classList.add('nt-affiliate-link');
  if (!link.getAttribute('data-affiliate')) link.setAttribute('data-affiliate', 'true');
}

function trackAffiliateClick(link) {
  const payload = {
    hrefHost: link.hostname || '',
    campaign: sanitizeText(link.getAttribute('data-affiliate-campaign')),
    placement: sanitizeText(link.getAttribute('data-affiliate-placement')),
    path: window.location.pathname
  };

  if (window.umami && typeof window.umami.track === 'function') {
    window.umami.track('affiliate_click', payload);
    return;
  }

  window.dispatchEvent(new CustomEvent('novatools:affiliate-click', { detail: payload }));
}

export function initAffiliateTracking(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return;

  root.querySelectorAll(AFFILIATE_SELECTOR).forEach((link) => {
    normalizeAffiliateLink(link);
    if (link.dataset.affiliateTrackingBound === 'true') return;
    link.dataset.affiliateTrackingBound = 'true';
    link.addEventListener('click', () => trackAffiliateClick(link));
  });
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initAffiliateTracking(), { once: true });
  } else {
    initAffiliateTracking();
  }
}
