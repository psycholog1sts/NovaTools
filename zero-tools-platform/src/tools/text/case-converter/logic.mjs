/**
 * Case Converter Logic Module
 * Text case transformation utilities
 */

/**
 * Convert to lowercase
 * @param {string} text - Input text
 * @returns {string} Lowercase text
 */
export function toLowerCase(text) {
  return text?.toLowerCase() || '';
}

/**
 * Convert to uppercase
 * @param {string} text - Input text
 * @returns {string} Uppercase text
 */
export function toUpperCase(text) {
  return text?.toUpperCase() || '';
}

/**
 * Convert to title case
 * @param {string} text - Input text
 * @returns {string} Title case text
 */
export function toTitleCase(text) {
  if (!text) return '';
  
  const minorWords = new Set([
    'a', 'an', 'the', 'and', 'but', 'or', 'for', 'nor', 'on', 'at', 
    'to', 'from', 'by', 'in', 'with', 'of', 'up', 'as', 'via'
  ]);
  
  return text.toLowerCase().split(' ').map((word, index) => {
    if (!word) return '';
    if (index > 0 && minorWords.has(word.toLowerCase())) {
      return word.toLowerCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

/**
 * Convert to sentence case
 * @param {string} text - Input text
 * @returns {string} Sentence case text
 */
export function toSentenceCase(text) {
  if (!text) return '';
  
  return text.toLowerCase().replace(/(^")|\.\s+./g, match => match.toUpperCase());
}

/**
 * Convert to camelCase
 * @param {string} text - Input text
 * @returns {string} camelCase text
 */
export function toCamelCase(text) {
  if (!text) return '';
  
  return text
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (match, char) => char.toUpperCase());
}

/**
 * Convert to PascalCase
 * @param {string} text - Input text
 * @returns {string} PascalCase text
 */
export function toPascalCase(text) {
  if (!text) return '';
  
  const camel = toCamelCase(text);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
}

/**
 * Convert to snake_case
 * @param {string} text - Input text
 * @returns {string} snake_case text
 */
export function toSnakeCase(text) {
  if (!text) return '';
  
  return text
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .filter(Boolean)
    .join('_');
}

/**
 * Convert to kebab-case
 * @param {string} text - Input text
 * @returns {string} kebab-case text
 */
export function toKebabCase(text) {
  if (!text) return '';
  
  return text
    .replace(/\W+/g, ' ')
    .split(/ |\B(?=[A-Z])/)
    .map(word => word.toLowerCase())
    .filter(Boolean)
    .join('-');
}

/**
 * Convert to CONSTANT_CASE
 * @param {string} text - Input text
 * @returns {string} CONSTANT_CASE text
 */
export function toConstantCase(text) {
  return toSnakeCase(text).toUpperCase();
}

/**
 * Convert to alternating case (SpOnGeBoB)
 * @param {string} text - Input text
 * @returns {string} Alternating case text
 */
export function toAlternatingCase(text) {
  if (!text) return '';
  
  return text.split('').map((char, i) => 
    i % 2 === 0 ? char.toLowerCase() : char.toUpperCase()
  ).join('');
}

/**
 * Convert to inverse case
 * @param {string} text - Input text
 * @returns {string} Inverse case text
 */
export function toInverseCase(text) {
  if (!text) return '';
  
  return text.split('').map(char => 
    char === char.toUpperCase() ? char.toLowerCase() : char.toUpperCase()
  ).join('');
}

/**
 * Apply all case conversions
 * @param {string} text - Input text
 * @returns {Object} All case variations
 */
export function convertAllCases(text) {
  return {
    original: text,
    lowerCase: toLowerCase(text),
    upperCase: toUpperCase(text),
    titleCase: toTitleCase(text),
    sentenceCase: toSentenceCase(text),
    camelCase: toCamelCase(text),
    pascalCase: toPascalCase(text),
    snakeCase: toSnakeCase(text),
    kebabCase: toKebabCase(text),
    constantCase: toConstantCase(text),
    alternatingCase: toAlternatingCase(text),
    inverseCase: toInverseCase(text)
  };
}

export default { convertAllCases, toCamelCase, toSnakeCase, toKebabCase };
