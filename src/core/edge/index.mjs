/**
 * Edge Compute Module
 * Client-side utilities for edge personalization
 */

/**
 * Get geo information from edge headers
 */
export function getEdgeGeoData() {
  // Headers set by Vercel Edge Middleware
  return {
    country: document.documentElement.getAttribute('data-country') || 
             navigator.language.split('-')[1] || 'US',
    locale: document.documentElement.getAttribute('data-locale') || 
            navigator.language,
    currency: document.documentElement.getAttribute('data-currency') || 'USD'
  };
}

/**
 * Get feature flags from edge
 */
export function getEdgeFeatureFlags() {
  try {
    const flags = document.documentElement.getAttribute('data-feature-flags');
    return flags ? JSON.parse(flags) : {};
  } catch {
    return {};
  }
}

/**
 * Get regional disclaimer
 */
export function getRegionalDisclaimer() {
  return document.querySelector('.geo-disclaimer')?.textContent || '';
}

/**
 * Check if tool is available in current region
 */
export async function checkToolAvailability(toolId) {
  const geo = getEdgeGeoData();
  
  try {
    const response = await fetch(`/api/geo-suggestions?tool=${toolId}`);
    const data = await response.json();
    
    return {
      available: true,
      popular: data.popular.some(p => p.tool === toolId),
      recommended: data.recommended === toolId
    };
  } catch {
    // Fallback: assume available
    return { available: true };
  }
}

/**
 * Fetch ESI fragment from edge
 */
export async function fetchESIFragment(fragment, context = {}) {
  const params = new URLSearchParams({ fragment, ...context });
  
  try {
    const response = await fetch(`/api/esi-render?${params}`);
    return await response.text();
  } catch (error) {
    console.warn('ESI fetch failed:', error);
    return '';
  }
}

/**
 * Inject ESI fragments into page
 */
export async function injectESIFragments() {
  const fragments = document.querySelectorAll('esi-include');
  
  for (const el of fragments) {
    const src = el.getAttribute('src');
    if (!src) continue;
    
    const html = await fetchESIFragment(src, {
      tool: el.getAttribute('data-tool'),
      country: getEdgeGeoData().country
    });
    
    if (html) {
      el.outerHTML = html;
    }
  }
}

/**
 * Apply geo-specific formatting
 */
export function formatForLocale(value, type = 'number') {
  const geo = getEdgeGeoData();
  const locale = geo.locale;
  
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: geo.currency
      }).format(value);
      
    case 'number':
      return new Intl.NumberFormat(locale).format(value);
      
    case 'date':
      return new Intl.DateTimeFormat(locale).format(new Date(value));
      
    case 'percent':
      return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 2
      }).format(value);
      
    default:
      return value;
  }
}

/**
 * Get localized string
 */
export function getLocalizedString(key, fallback = '') {
  const translations = window.__I18N__ || {};
  return translations[key] || fallback;
}

/**
 * Track edge personalization for analytics
 */
export function trackEdgePersonalization(data) {
  if (window.umami) {
    window.umami.track('edge-personalization', {
      country: getEdgeGeoData().country,
      ...data
    });
  }
}
