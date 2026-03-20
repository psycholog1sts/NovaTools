/**
 * Text to Slug Converter Logic Module
 * URL-friendly slug generation
 */

/**
 * Convert text to slug
 * @param {string} text - Input text
 * @param {Object} options - Conversion options
 * @returns {string} URL-friendly slug
 */
export function toSlug(text, options = {}) {
  if (!text || typeof text !== 'string') return '';
  
  const {
    separator = '-',
    lowercase = true,
    strict = false,
    maxLength = 100,
    trim = true
  } = options;
  
  let slug = text
    // Normalize unicode characters
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Replace special characters
    .replace(/&/g, 'and')
    // Remove or replace unwanted characters
    .replace(/[^\w\s-]/g, strict ? '' : ' ')
    // Replace whitespace with separator
    .replace(/\s+/g, separator)
    // Replace multiple separators
    .replace(new RegExp(`${separator}+`, 'g'), separator)
    // Remove leading/trailing separators
    .replace(new RegExp(`^${separator}+|${separator}+$`, 'g'), '');
  
  if (lowercase) {
    slug = slug.toLowerCase();
  }
  
  if (trim && maxLength > 0 && slug.length > maxLength) {
    slug = slug.substring(0, maxLength);
    // Remove trailing separator if truncated
    slug = slug.replace(new RegExp(`${separator}+$`), '');
  }
  
  return slug;
}

/**
 * Convert to snake_case
 * @param {string} text - Input text
 * @returns {string} snake_case result
 */
export function toSnakeCase(text) {
  return toSlug(text, { separator: '_', lowercase: true });
}

/**
 * Convert to camelCase
 * @param {string} text - Input text
 * @returns {string} camelCase result
 */
export function toCamelCase(text) {
  const slug = toSlug(text, { separator: ' ', lowercase: true });
  return slug.replace(/\s+(.)/g, (_, char) => char.toUpperCase()).replace(/\s/g, '');
}

/**
 * Convert to PascalCase
 * @param {string} text - Input text
 * @returns {string} PascalCase result
 */
export function toPascalCase(text) {
  const camel = toCamelCase(text);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Convert to kebab-case
 * @param {string} text - Input text
 * @returns {string} kebab-case result
 */
export function toKebabCase(text) {
  return toSlug(text, { separator: '-', lowercase: true });
}

/**
 * Convert to dot.notation
 * @param {string} text - Input text
 * @returns {string} Dot notation result
 */
export function toDotNotation(text) {
  return toSlug(text, { separator: '.', lowercase: true });
}

/**
 * Convert to path/notation
 * @param {string} text - Input text
 * @returns {string} Path notation result
 */
export function toPathNotation(text) {
  return toSlug(text, { separator: '/', lowercase: true });
}

/**
 * Convert to CONSTANT_CASE
 * @param {string} text - Input text
 * @returns {string} CONSTANT_CASE result
 */
export function toConstantCase(text) {
  return toSlug(text, { separator: '_', lowercase: false }).toUpperCase();
}

/**
 * Create SEO-friendly slug
 * @param {string} text - Input text
 * @param {Object} options - SEO options
 * @returns {Object} SEO slug result
 */
export function createSEOSlug(text, options = {}) {
  const {
    includeDate = false,
    date = new Date(),
    stopWords = []
  } = options;
  
  const defaultStopWords = [
    'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during'
  ];
  
  const allStopWords = new Set([...defaultStopWords, ...stopWords]);
  
  // Remove stop words
  const processedText = text
    .split(/\s+/)
    .filter(word => !allStopWords.has(word.toLowerCase()))
    .join(' ');
  
  let slug = toSlug(processedText, { maxLength: 60 });
  
  if (includeDate) {
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '/');
    slug = `${dateStr}/${slug}`;
  }
  
  return {
    slug,
    original: text,
    wordCount: slug.split('-').length,
    charCount: slug.length,
    isValid: /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)
  };
}

/**
 * Validate slug
 * @param {string} slug - Slug to validate
 * @returns {Object} Validation result
 */
export function validateSlug(slug) {
  const issues = [];
  
  if (!slug) {
    issues.push('Slug is empty');
  } else {
    if (slug.length > 100) {
      issues.push('Slug exceeds 100 characters');
    }
    if (/[^a-z0-9-]/.test(slug)) {
      issues.push('Slug contains invalid characters');
    }
    if (slug.startsWith('-') || slug.endsWith('-')) {
      issues.push('Slug starts or ends with hyphen');
    }
    if (/--/.test(slug)) {
      issues.push('Slug contains consecutive hyphens');
    }
  }
  
  return {
    valid: issues.length === 0,
    issues
  };
}

/**
 * Batch convert multiple texts
 * @param {string[]} texts - Array of texts
 * @param {Object} options - Conversion options
 * @returns {Array} Converted slugs
 */
export function batchConvert(texts, options = {}) {
  return texts.map((text, index) => ({
    id: index,
    original: text,
    slug: toSlug(text, options),
    ...validateSlug(toSlug(text, options))
  }));
}

export default { toSlug, toKebabCase, toSnakeCase, createSEOSlug, validateSlug };
