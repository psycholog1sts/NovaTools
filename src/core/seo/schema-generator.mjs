/**
 * Schema.org JSON-LD Generator
 * Dynamic schema generation for SEO optimization
 */

const BASE_URL = 'https://mc-novatools.com';

/**
 * Generate SoftwareApplication schema for tools
 * @param {Object} toolMeta - Tool metadata from meta.json
 * @returns {Object} JSON-LD schema object
 */
export function generateSoftwareApplicationSchema(toolMeta) {
  const categoryMap = {
    'finance': 'FinanceApplication',
    'pdf': 'DeveloperApplication',
    'image': 'DeveloperApplication',
    'dev': 'DeveloperApplication'
  };

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: toolMeta.name,
    applicationCategory: categoryMap[toolMeta.category] || 'DeveloperApplication',
    operatingSystem: 'Any',
    browserRequirements: 'Requires JavaScript. Requires HTML5.',
    softwareVersion: '1.0.0',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    featureList: Array.isArray(toolMeta.keywords?.tr) 
      ? toolMeta.keywords.tr.slice(0, 5)
      : [],
    author: {
      '@type': 'Organization',
      name: 'NovaTools',
      url: BASE_URL
    },
    inLanguage: toolMeta.locale || 'tr',
    isAccessibleForFree: true,
    url: `${BASE_URL}/tools/${toolMeta.category}/${toolMeta.id}/`,
    ...(toolMeta.description?.tr && { description: toolMeta.description.tr })
  };
}

/**
 * Generate BreadcrumbList schema
 * @param {Array} items - Array of {name, url} objects
 * @returns {Object} JSON-LD schema object
 */
export function generateBreadcrumbSchema(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${BASE_URL}${item.url}`
    }))
  };
}

/**
 * Generate BreadcrumbList for a tool page
 * @param {string} category - Category slug
 * @param {string} categoryName - Category display name
 * @param {string} toolName - Tool display name
 * @param {string} toolPath - Tool path
 * @returns {Object} JSON-LD schema object
 */
export function generateToolBreadcrumb(category, categoryName, toolName, toolPath) {
  return generateBreadcrumbSchema([
    { name: 'Ana Sayfa', url: '/' },
    { name: categoryName, url: `/#${category}` },
    { name: toolName, url: `/src/tools/${toolPath}/` }
  ]);
}

/**
 * Generate FAQPage schema
 * @param {Array} faqs - Array of {question, answer} objects
 * @returns {Object} JSON-LD schema object
 */
export function generateFAQSchema(faqs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

/**
 * Generate HowTo schema
 * @param {Object} data - HowTo data
 * @returns {Object} JSON-LD schema object
 */
export function generateHowToSchema(data) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: data.name,
    description: data.description,
    totalTime: data.totalTime || 'PT5M',
    estimatedCost: {
      '@type': 'MonetaryAmount',
      currency: 'TRY',
      value: '0'
    },
    step: data.steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      url: step.url
    }))
  };
}

/**
 * Generate WebSite schema
 * @returns {Object} JSON-LD schema object
 */
export function generateWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'NovaTools',
    url: BASE_URL,
    description: 'Privacy-conscious online tools platform for files, finance, text and developer workflows.',
    inLanguage: ['tr', 'en'],
    publisher: {
      '@type': 'Organization',
      name: 'NovaTools',
      logo: {
        '@type': 'ImageObject',
        url: `${BASE_URL}/logo-brand.png`,
        width: 512,
        height: 512
      }
    },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${BASE_URL}/?q={search_term_string}`
      },
      'query-input': 'required name=search_term_string'
    }
  };
}

/**
 * Generate Organization schema
 * @returns {Object} JSON-LD schema object
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'NovaTools',
    url: BASE_URL,
    logo: {
      '@type': 'ImageObject',
      url: `${BASE_URL}/logo-brand.png`,
      width: 512,
      height: 512
    },
    sameAs: [
      'https://github.com/psycholog1sts/NovaTools'
    ]
  };
}

/**
 * Inject schema into document head
 * @param {Object} schema - JSON-LD schema object
 * @param {string} id - Unique ID for the script element
 */
export function injectSchema(schema, id = 'dynamic-schema') {
  // Remove existing schema with same ID
  const existing = document.getElementById(id);
  if (existing) {
    existing.remove();
  }

  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.textContent = JSON.stringify(schema, null, 2);
  
  document.head.appendChild(script);
}

/**
 * Inject multiple schemas
 * @param {Array} schemas - Array of {id, schema} objects
 */
export function injectMultipleSchemas(schemas) {
  schemas.forEach(({ id, schema }) => {
    injectSchema(schema, id);
  });
}

/**
 * Generate complete schema set for a tool page
 * @param {Object} toolMeta - Tool metadata
 * @param {Array} breadcrumbs - Breadcrumb items
 * @param {Array} faqs - FAQ items (optional)
 * @param {Object} howTo - HowTo data (optional)
 * @returns {Array} Array of schema objects to inject
 */
export function generateToolPageSchemas(toolMeta, breadcrumbs, faqs = null, howTo = null) {
  const schemas = [
    {
      id: 'schema-software',
      schema: generateSoftwareApplicationSchema(toolMeta)
    },
    {
      id: 'schema-breadcrumb',
      schema: generateBreadcrumbSchema(breadcrumbs)
    }
  ];

  if (faqs && faqs.length > 0) {
    schemas.push({
      id: 'schema-faq',
      schema: generateFAQSchema(faqs)
    });
  }

  if (howTo) {
    schemas.push({
      id: 'schema-howto',
      schema: generateHowToSchema(howTo)
    });
  }

  return schemas;
}

// Export all for use in tool logic files
export default {
  generateSoftwareApplicationSchema,
  generateBreadcrumbSchema,
  generateToolBreadcrumb,
  generateFAQSchema,
  generateHowToSchema,
  generateWebSiteSchema,
  generateOrganizationSchema,
  injectSchema,
  injectMultipleSchemas,
  generateToolPageSchemas
};
