/**
 * Router and Tool Loader
 * Dynamic tool discovery and vendor preloading
 */

// Tool metadata cache
const metaCache = new Map();

// Vendor chunk preloading state
const preloadState = {
  'pdf-vendor': false,
  'finance-vendor': false,
  'image-vendor': false,
  'ui-vendor': false
};

/**
 * Load tool metadata from meta.json
 * @param {string} toolId - Tool identifier (e.g., 'pdf/merge')
 * @returns {Promise<Object|null>}
 */
export async function loadToolMeta(toolId) {
  // Check cache first
  if (metaCache.has(toolId)) {
    return metaCache.get(toolId);
  }
  
  try {
    const response = await fetch(`/meta/${toolId}.json`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const meta = await response.json();
    metaCache.set(toolId, meta);
    return meta;
  } catch (error) {
    console.warn(`Failed to load metadata for ${toolId}:`, error);
    return null;
  }
}

/**
 * Preload vendor chunk
 * @param {string} vendor - Vendor name (pdf-vendor, finance-vendor, etc.)
 */
export function preloadVendor(vendor) {
  if (preloadState[vendor]) return;
  
  const chunkUrl = `/assets/vendor/${vendor}.js`;
  
  // Create link rel=preload
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'script';
  link.href = chunkUrl;
  link.crossOrigin = 'anonymous';
  
  document.head.appendChild(link);
  preloadState[vendor] = true;
  
  // Also prefetch next navigation
  const prefetch = document.createElement('link');
  prefetch.rel = 'prefetch';
  prefetch.href = chunkUrl;
  document.head.appendChild(prefetch);
}

/**
 * Get vendor for tool category
 * @param {string} category - Tool category
 * @returns {string|null}
 */
export function getVendorForCategory(category) {
  const vendorMap = {
    'pdf': 'pdf-vendor',
    'finance': 'finance-vendor',
    'image': 'image-vendor'
  };
  return vendorMap[category] || null;
}

/**
 * Initialize tool page
 * Loads metadata, sets up SEO, preloads required vendors
 * @param {string} toolId 
 */
export async function initToolPage(toolId) {
  const [category, name] = toolId.split('/');
  
  // Load metadata
  const meta = await loadToolMeta(toolId);
  if (meta) {
    updatePageSEO(meta);
  }
  
  // Preload vendor for this category
  const vendor = getVendorForCategory(category);
  if (vendor) {
    preloadVendor(vendor);
  }
  
  // Track page view (privacy-friendly)
  if (window.umami) {
    window.umami.track('tool-page-view', { tool: toolId });
  }
  
  return meta;
}

/**
 * Update page SEO metadata from tool meta
 * @param {Object} meta 
 */
function updatePageSEO(meta) {
  if (!meta) return;
  
  const lang = document.documentElement.lang || 'tr';
  const suffix = lang === 'tr' ? '' : 'En';
  
  // Update title
  const name = meta[`name${suffix}`] || meta.name;
  if (name) {
    document.title = `${name} | ZeroTools`;
  }
  
  // Update description
  const description = meta[`description${suffix}`] || meta.description;
  if (description) {
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.content = description;
    }
  }
  
  // Update keywords
  const keywords = meta[`keywords${suffix}`] || meta.keywords;
  if (keywords && Array.isArray(keywords)) {
    const metaKeywords = document.querySelector('meta[name="keywords"]');
    if (metaKeywords) {
      metaKeywords.content = keywords.join(', ');
    }
  }
  
  // Inject Schema.org JSON-LD
  if (meta.schema) {
    injectSchemaLD(meta.schema, meta);
  }
}

/**
 * Inject Schema.org structured data
 * @param {Object} schema 
 * @param {Object} meta 
 */
function injectSchemaLD(schema, meta) {
  // Remove existing
  const existing = document.getElementById('tool-schema');
  if (existing) existing.remove();
  
  const schemaData = {
    '@context': 'https://schema.org',
    '@type': schema['@type'] || 'WebApplication',
    name: meta.name,
    description: meta.description?.tr || meta.description,
    applicationCategory: schema.applicationCategory || 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    featureList: meta.keywords?.tr?.slice(0, 5).join(', ') || '',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'TRY'
    },
    author: {
      '@type': 'Organization',
      name: 'ZeroTools Platform'
    },
    inLanguage: 'tr',
    isAccessibleForFree: true,
    ...schema
  };
  
  const script = document.createElement('script');
  script.id = 'tool-schema';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify(schemaData);
  document.head.appendChild(script);
}

/**
 * Discover all available tools
 * @returns {Promise<Array>}
 */
export async function discoverTools() {
  try {
    const response = await fetch('/tools-manifest.json');
    if (!response.ok) throw new Error('Failed to load tools manifest');
    return await response.json();
  } catch (error) {
    console.warn('Tool discovery failed:', error);
    return [];
  }
}

/**
 * Generate breadcrumb for tool page
 * @param {string} category 
 * @param {string} toolName 
 */
export function generateBreadcrumb(category, toolName) {
  const categories = {
    'pdf': 'PDF Araçları',
    'finance': 'Finans Araçları',
    'image': 'Görsel Araçları',
    'dev': 'Geliştirici Araçları'
  };
  
  const container = document.getElementById('breadcrumb');
  if (!container) return;
  
  container.innerHTML = `
    <nav aria-label="Breadcrumb">
      <ol class="flex items-center gap-2 text-sm">
        <li><a href="/" class="text-secondary-500 hover:text-primary-600">Ana Sayfa</a></li>
        <li aria-hidden="true" class="text-secondary-400">/</li>
        <li><a href="/#${category}" class="text-secondary-500 hover:text-primary-600">${categories[category] || category}</a></li>
        <li aria-hidden="true" class="text-secondary-400">/</li>
        <li aria-current="page" class="text-gray-900 font-medium">${toolName}</li>
      </ol>
    </nav>
  `;
}
