/**
 * Edge Function: ESI (Edge-Side Include) Renderer
 * Replaces <esi:include> tags with dynamic edge content
 * Enables personalization without origin round-trips
 */

export const config = {
  runtime: 'edge',
  regions: ['all']
};

// ESI fragment handlers
const ESI_FRAGMENTS = {
  // Personalized tool recommendations
  async 'recommendations'(ctx) {
    const { country, recentTools } = ctx;
    const recommendations = await getRecommendations(country, recentTools);
    
    return `
      <section class="esi-recommendations" data-country="${country}">
        <h3>${getLocalizedString('recommended_for_you', country)}</h3>
        <div class="recommendation-grid">
          ${recommendations.map(r => `
            <a href="/src/tools/${r.tool}/" class="recommendation-card">
              <span class="tool-icon">${r.icon}</span>
              <span class="tool-name">${r.name}</span>
              <span class="match-score">${Math.round(r.score * 100)}% match</span>
            </a>
          `).join('')}
        </div>
      </section>
    `;
  },
  
  // Geo-specific pricing/legal notices
  async 'pricing-notice'(ctx) {
    const { country } = ctx;
    const notices = {
      'TR': {
        currency: 'TRY',
        disclaimer: 'Fiyatlar tahminidir. Güncel oranlar için bankanıza danışın.',
        vat: 'KDV dahil'
      },
      'EU': {
        currency: 'EUR',
        disclaimer: 'Prices are estimates. VAT included.',
        vat: 'VAT incl.'
      },
      'US': {
        currency: 'USD',
        disclaimer: 'Prices are estimates only.',
        vat: 'Plus applicable tax'
      }
    };
    
    const notice = notices[country === 'TR' ? 'TR' : ['DE', 'FR', 'NL', 'ES', 'IT'].includes(country) ? 'EU' : 'US'];
    
    return `
      <div class="esi-pricing-notice" data-currency="${notice.currency}">
        <span class="vat-badge">${notice.vat}</span>
        <small class="disclaimer">${notice.disclaimer}</small>
      </div>
    `;
  },
  
  // Language switcher with detected language
  async 'language-switcher'(ctx) {
    const { country, acceptLanguage } = ctx;
    const detectedLang = detectLanguage(acceptLanguage);
    const availableLangs = ['en', 'tr', 'de', 'fr', 'es'];
    
    return `
      <div class="esi-language-switcher">
        ${availableLangs.map(lang => `
          <a href="?lang=${lang}" 
             class="lang-option ${lang === detectedLang ? 'active' : ''}"
             data-lang="${lang}">
            ${getLanguageName(lang)}
          </a>
        `).join('')}
      </div>
    `;
  },
  
  // Dynamic feature flag banner
  async 'feature-banner'(ctx) {
    const { country, features } = ctx;
    
    if (features.experimental) {
      return `
        <div class="esi-feature-banner experimental">
          <span class="badge">Beta</span>
          <span>You're trying our experimental ${getLocalizedString('features', country)}</span>
        </div>
      `;
    }
    
    return '';
  },
  
  // Real-time currency rates (cached)
  async 'currency-rates'(ctx) {
    const { country } = ctx;
    const rates = await getCachedRates(country);
    
    return `
      <div class="esi-currency-rates" data-updated="${rates.timestamp}">
        <small>1 USD = ${rates.local} ${getCurrencyForCountry(country)}</small>
      </div>
    `;
  },
  
  // Social proof for tool
  async 'social-proof'(ctx) {
    const { tool, country } = ctx;
    const stats = await getToolStats(tool, country);
    
    return `
      <div class="esi-social-proof">
        <span class="users-count">${formatNumber(stats.users)}+ users</span>
        <span class="rating">★ ${stats.rating}</span>
        ${stats.trending ? '<span class="trending-badge">🔥 Trending</span>' : ''}
      </div>
    `;
  }
};

export default async function handler(request) {
  const url = new URL(request.url);
  
  // Get context from headers
  const ctx = {
    country: request.headers.get('x-vercel-ip-country') || 'US',
    city: request.headers.get('x-vercel-ip-city'),
    acceptLanguage: request.headers.get('accept-language'),
    tool: url.searchParams.get('tool'),
    recentTools: url.searchParams.get('recent')?.split(',') || [],
    features: {
      experimental: url.searchParams.get('experimental') === 'true'
    }
  };
  
  // Get requested fragment
  const fragment = url.searchParams.get('fragment');
  
  if (!fragment || !ESI_FRAGMENTS[fragment]) {
    return new Response(JSON.stringify({ error: 'Unknown fragment' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Render fragment
  const html = await ESI_FRAGMENTS[fragment](ctx);
  
  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      'Vary': 'Accept-Language, X-Vercel-IP-Country'
    }
  });
}

// Helper functions
async function getRecommendations(country, recentTools) {
  // Simplified recommendation logic
  const tools = [
    { tool: 'pdf/merge', name: 'PDF Merger', icon: '📄', score: 0.92 },
    { tool: 'pdf/compress', name: 'PDF Compressor', icon: '🗜️', score: 0.87 },
    { tool: 'image/compress', name: 'Image Optimizer', icon: '🖼️', score: 0.83 },
    { tool: 'finance/mortgage-tr', name: 'Mortgage Calc', icon: '🏠', score: 0.78 }
  ];
  
  return tools.filter(t => !recentTools.includes(t.tool)).slice(0, 3);
}

function getLocalizedString(key, country) {
  const strings = {
    recommended_for_you: {
      'TR': 'Sizin için Önerilenler',
      'DE': 'Empfohlen für Sie',
      'FR': 'Recommandé pour vous'
    },
    features: {
      'TR': 'özellikler',
      'DE': 'Funktionen',
      'FR': 'fonctionnalités'
    }
  };
  
  return strings[key]?.[country] || strings[key]?.['US'] || key;
}

function detectLanguage(acceptLanguage) {
  if (!acceptLanguage) return 'en';
  const lang = acceptLanguage.split(',')[0].split('-')[0];
  return ['en', 'tr', 'de', 'fr', 'es'].includes(lang) ? lang : 'en';
}

function getLanguageName(lang) {
  const names = {
    en: 'English',
    tr: 'Türkçe',
    de: 'Deutsch',
    fr: 'Français',
    es: 'Español'
  };
  return names[lang] || lang;
}

async function getCachedRates(country) {
  // Would fetch from KV or cache
  return {
    local: country === 'TR' ? 32.5 : country === 'EU' ? 0.92 : 1,
    timestamp: Date.now()
  };
}

function getCurrencyForCountry(country) {
  const map = { TR: 'TRY', US: 'USD', DE: 'EUR', GB: 'GBP', JP: 'JPY' };
  return map[country] || 'USD';
}

async function getToolStats(tool, country) {
  // Would fetch from analytics
  return {
    users: 15000 + Math.floor(Math.random() * 5000),
    rating: (4.5 + Math.random() * 0.5).toFixed(1),
    trending: Math.random() > 0.7
  };
}

function formatNumber(n) {
  return n > 1000 ? (n / 1000).toFixed(1) + 'k' : n;
}
