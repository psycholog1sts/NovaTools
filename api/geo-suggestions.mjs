/**
 * Edge Function: Geographic Tool Suggestions
 * Runs at Vercel Edge for <10ms latency
 */

export const config = {
  runtime: 'edge',
  regions: ['all'] // Deploy to all edge regions
};

// Tool popularity by country (normalized)
const TOOL_POPULARITY = {
  'TR': {
    'finance/mortgage-tr': 0.95,
    'finance/kkdf-bsmv': 0.88,
    'pdf/merge': 0.65,
    'image/compress': 0.72
  },
  'US': {
    'finance/mortgage': 0.78,
    'finance/retirement': 0.82,
    'pdf/merge': 0.71,
    'pdf/compress': 0.68
  },
  'DE': {
    'finance/mortgage': 0.75,
    'pdf/merge': 0.80,
    'unit-converter': 0.85 // Metric/imperial important
  },
  'JP': {
    'image/compress': 0.90, // Mobile-heavy usage
    'pdf/merge': 0.60,
    'unit-converter': 0.70
  }
};

// Seasonal tool recommendations
const SEASONAL_TOOLS = {
  // Tax seasons
  'US': [
    { start: '01-01', end: '04-15', tools: ['finance/tax-us', 'pdf/merge'] }, // Tax season
    { start: '11-01', end: '11-30', tools: ['finance/black-friday'] }
  ],
  'TR': [
    { start: '03-01', end: '03-31', tools: ['finance/kkdf-bsmv'] } // Tax adjustments
  ]
};

export default async function handler(request) {
  // Get geo info from headers (Vercel automatically adds these)
  const country = request.headers.get('x-vercel-ip-country') || 
                  request.headers.get('cf-ipcountry') || 
                  'US';
  const city = request.headers.get('x-vercel-ip-city') || 
               request.headers.get('cf-ipcity');
  const timezone = request.headers.get('x-vercel-ip-timezone') || 'UTC';
  
  // Get local time for seasonal recommendations
  const now = new Date();
  const localDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  
  // Build suggestions
  const suggestions = {
    country,
    city,
    popular: getPopularTools(country),
    seasonal: getSeasonalTools(country, localDate),
    nearby: await getNearbyTools(city, country),
    recommended: getRecommendedTool(country),
    trends: getTrendingTools(country)
  };
  
  // Return with aggressive edge caching
  return new Response(JSON.stringify(suggestions), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
      'CDN-Cache-Control': 'public, max-age=300',
      'Vercel-CDN-Cache-Control': 'public, max-age=300',
      'X-Country': country,
      'X-Edge-Region': process.env.VERCEL_REGION || 'unknown'
    }
  });
}

/**
 * Get popular tools for country
 */
function getPopularTools(country) {
  const popularity = TOOL_POPULARITY[country] || TOOL_POPULARITY['US'];
  
  return Object.entries(popularity)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tool, score]) => ({ tool, score }));
}

/**
 * Get seasonal tools based on current date
 */
function getSeasonalTools(country, date) {
  const mmdd = `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const seasonalData = SEASONAL_TOOLS[country] || [];
  
  return seasonalData
    .filter(({ start, end }) => mmdd >= start && mmdd <= end)
    .flatMap(s => s.tools);
}

/**
 * Get tools popular near a city
 * (Could integrate with actual analytics data)
 */
async function getNearbyTools(city, country) {
  // This would typically query a distributed cache or KV store
  // For now, return contextual suggestions
  const cityContext = {
    'Istanbul': ['finance/mortgage-tr', 'pdf/merge'],
    'New York': ['finance/mortgage', 'finance/retirement'],
    'Berlin': ['pdf/merge', 'unit-converter'],
    'London': ['finance/mortgage', 'pdf/merge']
  };
  
  return cityContext[city] || [];
}

/**
 * Get single recommended tool based on profile
 */
function getRecommendedTool(country) {
  const popular = getPopularTools(country);
  
  // Add some randomization for A/B testing
  const index = Math.floor(Math.random() * Math.min(3, popular.length));
  return popular[index]?.tool;
}

/**
 * Get trending tools (simulated based on time of day)
 */
function getTrendingTools(country) {
  const hour = new Date().getUTCHours();
  
  // Business hours favor productivity tools
  if (hour >= 9 && hour <= 17) {
    return ['pdf/merge', 'pdf/compress', 'image/compress'];
  }
  
  // Evening favors finance/personal tools
  return ['finance/mortgage', 'finance/retirement', 'unit-converter'];
}
