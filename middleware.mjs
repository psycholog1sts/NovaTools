/**
 * Vercel Edge Middleware
 * Zero-latency personalization at the edge
 */

import { next } from '@vercel/edge';

// Edge Config for feature flags
const EDGE_CONFIG = {
  // Tool availability by country (legal compliance)
  toolAvailability: {
    'finance/mortgage-tr': ['TR', 'AZ', 'DE'], // Turkish mortgage for Turkish speakers
    'finance/cloud-cost': ['*'], // Global
    'pdf/merge': ['*'] // Global
  },
  
  // Regional disclaimers
  disclaimers: {
    'TR': {
      finance: 'Bu hesaplama tahmini değerler sunar. KKDF ve BSMV oranları değişebilir.',
      banking: 'Türkiye Cumhuriyeti Merkez Bankası düzenlemelerine tabidir.'
    },
    'US': {
      finance: 'This calculator provides estimates only. Consult a financial advisor.',
      banking: 'Not affiliated with any financial institution. CFPB disclosure applies.'
    },
    'EU': {
      finance: 'Estimates only. Subject to GDPR Article 22 (automated decision-making) considerations.'
    }
  },
  
  // Feature flags by region
  features: {
    'experimental-tools': ['US', 'CA', 'GB'],
    'advanced-ai': ['*'],
    'webgpu-acceleration': ['US', 'CA', 'GB', 'DE', 'FR', 'JP']
  }
};

/**
 * Main edge middleware handler
 */
export default async function middleware(request) {
  const url = new URL(request.url);
  const country = request.headers.get('cf-ipcountry') || 
                  request.headers.get('x-vercel-ip-country') || 
                  'US';
  
  // Get geo info
  const geo = {
    country,
    city: request.headers.get('cf-ipcity') || request.headers.get('x-vercel-ip-city'),
    region: request.headers.get('cf-region') || request.headers.get('x-vercel-ip-region'),
    latitude: request.headers.get('cf-iplatitude'),
    longitude: request.headers.get('cf-iplongitude')
  };
  
  // Determine locale based on country
  const locale = getLocaleFromCountry(country);
  
  // Check tool availability
  const toolPath = extractToolPath(url.pathname);
  const isToolAvailable = checkToolAvailability(toolPath, country);
  
  if (!isToolAvailable && toolPath) {
    // Redirect to unavailable page
    url.pathname = '/tool-unavailable';
    url.searchParams.set('country', country);
    url.searchParams.set('tool', toolPath);
    return Response.redirect(url, 302);
  }
  
  // Get personalized content
  const personalizedContent = generatePersonalizedContent(toolPath, country, locale);
  
  // Create response with edge-personalized headers
  const response = await next({
    headers: {
      'x-country': country,
      'x-locale': locale,
      'x-geo-lat': geo.latitude || '',
      'x-geo-lon': geo.longitude || '',
      'x-disclaimer': personalizedContent.disclaimer || '',
      'x-feature-flags': JSON.stringify(getFeatureFlags(country)),
      'cache-control': 'public, s-maxage=60, stale-while-revalidate=300'
    }
  });
  
  // Inject ESI (Edge-Side Includes) for dynamic content
  const body = await response.text();
  const modifiedBody = injectESI(body, personalizedContent);
  
  return new Response(modifiedBody, {
    status: response.status,
    headers: response.headers
  });
}

/**
 * Get locale from country code
 */
function getLocaleFromCountry(country) {
  const localeMap = {
    'TR': 'tr-TR',
    'US': 'en-US',
    'GB': 'en-GB',
    'DE': 'de-DE',
    'FR': 'fr-FR',
    'NL': 'nl-NL',
    'ES': 'es-ES',
    'IT': 'it-IT',
    'JP': 'ja-JP'
  };
  
  return localeMap[country] || 'en-US';
}

/**
 * Extract tool path from URL
 */
function extractToolPath(pathname) {
  const match = pathname.match(/\/src\/tools\/(.+?)\/?$/);
  return match ? match[1] : null;
}

/**
 * Check if tool is available in country
 */
function checkToolAvailability(toolPath, country) {
  if (!toolPath) return true;
  
  const allowedCountries = EDGE_CONFIG.toolAvailability[toolPath];
  if (!allowedCountries) return true; // No restrictions
  if (allowedCountries.includes('*')) return true; // Global
  
  return allowedCountries.includes(country);
}

/**
 * Generate personalized content based on geo
 */
function generatePersonalizedContent(toolPath, country, locale) {
  const content = {
    disclaimer: '',
    currency: getCurrencyForCountry(country),
    numberFormat: getNumberFormat(locale),
    dateFormat: getDateFormat(locale)
  };
  
  // Add finance disclaimers for finance tools
  if (toolPath && toolPath.startsWith('finance/')) {
    content.disclaimer = EDGE_CONFIG.disclaimers[country]?.finance || 
                        EDGE_CONFIG.disclaimers['US'].finance;
    
    if (country === 'TR') {
      content.disclaimer += ' ' + EDGE_CONFIG.disclaimers['TR'].banking;
    }
  }
  
  return content;
}

/**
 * Get currency for country
 */
function getCurrencyForCountry(country) {
  const currencies = {
    'TR': 'TRY',
    'US': 'USD',
    'GB': 'GBP',
    'DE': 'EUR',
    'FR': 'EUR',
    'NL': 'EUR',
    'ES': 'EUR',
    'IT': 'EUR',
    'JP': 'JPY'
  };
  
  return currencies[country] || 'USD';
}

/**
 * Get number format for locale
 */
function getNumberFormat(locale) {
  const formats = {
    'tr-TR': { decimal: ',', thousands: '.', currency: '₺' },
    'en-US': { decimal: '.', thousands: ',', currency: '$' },
    'de-DE': { decimal: ',', thousands: '.', currency: '€' },
    'en-GB': { decimal: '.', thousands: ',', currency: '£' }
  };
  
  return formats[locale] || formats['en-US'];
}

/**
 * Get date format for locale
 */
function getDateFormat(locale) {
  const formats = {
    'tr-TR': 'DD.MM.YYYY',
    'en-US': 'MM/DD/YYYY',
    'de-DE': 'DD.MM.YYYY',
    'en-GB': 'DD/MM/YYYY'
  };
  
  return formats[locale] || 'YYYY-MM-DD';
}

/**
 * Get feature flags for country
 */
function getFeatureFlags(country) {
  const flags = {};
  
  Object.entries(EDGE_CONFIG.features).forEach(([feature, countries]) => {
    flags[feature] = countries.includes('*') || countries.includes(country);
  });
  
  return flags;
}

/**
 * Inject ESI (Edge-Side Includes) placeholders
 * These are replaced by the CDN with dynamic content
 */
function injectESI(html, content) {
  // Replace ESI include tags with actual content
  return html
    .replace(/<esi:include src="disclaimer" \/>/g, 
      content.disclaimer ? `<div class="geo-disclaimer">${content.disclaimer}</div>` : '')
    .replace(/<esi:include src="currency" \/>/g, content.currency)
    .replace(/<esi:include src="locale" \/>/g, content.numberFormat.currency);
}

// Middleware config
export const config = {
  matcher: [
    '/',
    '/src/tools/:path*',
    '/((?!api|_next|static|favicon.ico|robots.txt).*)'
  ]
};
