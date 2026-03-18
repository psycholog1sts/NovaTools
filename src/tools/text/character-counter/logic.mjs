/**
 * Character Counter Logic Module
 * Detailed character analysis with social media limits
 */

/**
 * Count all characters
 * @param {string} text - Input text
 * @returns {number} Total character count
 */
export function countAll(text) {
  return text?.length || 0;
}

/**
 * Count characters without spaces
 * @param {string} text - Input text
 * @returns {number} Character count without spaces
 */
export function countWithoutSpaces(text) {
  if (!text) return 0;
  return text.replace(/\s/g, '').length;
}

/**
 * Count words
 * @param {string} text - Input text
 * @returns {number} Word count
 */
export function countWords(text) {
  if (!text || !text.trim()) return 0;
  return text.trim().split(/\s+/).length;
}

/**
 * Count lines
 * @param {string} text - Input text
 * @returns {number} Line count
 */
export function countLines(text) {
  if (!text) return 0;
  return text.split('\n').length;
}

/**
 * Count paragraphs
 * @param {string} text - Input text
 * @returns {number} Paragraph count
 */
export function countParagraphs(text) {
  if (!text) return 0;
  return text.split(/\n\s*\n/).filter(p => p.trim()).length || (text.trim() ? 1 : 0);
}

/**
 * Analyze character types
 * @param {string} text - Input text
 * @returns {Object} Character type breakdown
 */
export function analyzeCharacterTypes(text) {
  if (!text) {
    return {
      letters: 0,
      numbers: 0,
      spaces: 0,
      punctuation: 0,
      special: 0,
      emojis: 0
    };
  }
  
  return {
    letters: (text.match(/[a-zA-Z]/g) || []).length,
    numbers: (text.match(/[0-9]/g) || []).length,
    spaces: (text.match(/\s/g) || []).length,
    punctuation: (text.match(/[.,;:!?()[\]{}"'-]/g) || []).length,
    special: (text.match(/[^a-zA-Z0-9\s.,;:!?()[\]{}"'-]/g) || []).length,
    emojis: (text.match(/[\u{1F600}-\u{1F64F}]/gu) || []).length
  };
}

/**
 * Social media character limits
 */
export const SOCIAL_LIMITS = {
  twitter: { limit: 280, name: 'Twitter/X' },
  twitterLegacy: { limit: 140, name: 'Twitter Legacy' },
  facebook: { limit: 63206, name: 'Facebook' },
  instagram: { limit: 2200, name: 'Instagram' },
  linkedin: { limit: 3000, name: 'LinkedIn' },
  sms: { limit: 160, name: 'SMS' },
  metaTitle: { limit: 60, name: 'Meta Title' },
  metaDescription: { limit: 160, name: 'Meta Description' }
};

/**
 * Check social media limits
 * @param {string} text - Input text
 * @returns {Array} Limit status for each platform
 */
export function checkSocialLimits(text) {
  const length = text?.length || 0;
  
  return Object.entries(SOCIAL_LIMITS).map(([, { limit, name }]) => ({
    platform: name,
    limit,
    current: length,
    remaining: limit - length,
    percentage: Math.min(100, ((length / limit) * 100).toFixed(1)),
    status: length > limit ? 'exceeded' : length > limit * 0.9 ? 'warning' : 'ok'
  }));
}

/**
 * Comprehensive character analysis
 * @param {string} text - Input text
 * @returns {Object} Complete analysis
 */
export function analyzeCharacters(text) {
  const charTypes = analyzeCharacterTypes(text);
  const total = text?.length || 0;
  
  return {
    total,
    withoutSpaces: countWithoutSpaces(text),
    words: countWords(text),
    lines: countLines(text),
    paragraphs: countParagraphs(text),
    types: charTypes,
    percentages: {
      letters: total ? ((charTypes.letters / total) * 100).toFixed(1) : 0,
      numbers: total ? ((charTypes.numbers / total) * 100).toFixed(1) : 0,
      spaces: total ? ((charTypes.spaces / total) * 100).toFixed(1) : 0,
      punctuation: total ? ((charTypes.punctuation / total) * 100).toFixed(1) : 0
    },
    socialLimits: checkSocialLimits(text)
  };
}

export default { analyzeCharacters, countAll, checkSocialLimits };
