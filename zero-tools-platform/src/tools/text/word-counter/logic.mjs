/**
 * Word Counter Logic Module
 * Professional text analysis with comprehensive statistics
 */

/**
 * Count words in text
 * @param {string} text - Input text
 * @returns {number} Word count
 */
export function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const cleanText = text.trim().replace(/\s+/g, ' ');
  if (!cleanText) return 0;
  return cleanText.split(/\s+/).length;
}

/**
 * Count characters (with/without spaces)
 * @param {string} text - Input text
 * @param {boolean} includeSpaces - Whether to include spaces
 * @returns {number} Character count
 */
export function countCharacters(text, includeSpaces = true) {
  if (!text || typeof text !== 'string') return 0;
  if (includeSpaces) return text.length;
  return text.replace(/\s/g, '').length;
}

/**
 * Count sentences
 * @param {string} text - Input text
 * @returns {number} Sentence count
 */
export function countSentences(text) {
  if (!text || typeof text !== 'string') return 0;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  return sentences.length;
}

/**
 * Count paragraphs
 * @param {string} text - Input text
 * @returns {number} Paragraph count
 */
export function countParagraphs(text) {
  if (!text || typeof text !== 'string') return 0;
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
  return paragraphs.length || (text.trim() ? 1 : 0);
}

/**
 * Calculate reading time
 * @param {number} wordCount - Number of words
 * @param {number} wpm - Words per minute (default: 200)
 * @returns {Object} Reading time breakdown
 */
export function calculateReadingTime(wordCount, wpm = 200) {
  const minutes = wordCount / wpm;
  const minutesRounded = Math.ceil(minutes);
  
  return {
    minutes: minutesRounded,
    seconds: Math.round(minutes * 60),
    formatted: minutesRounded < 1 ? '< 1 min' : `${minutesRounded} min`
  };
}

/**
 * Calculate speaking time
 * @param {number} wordCount - Number of words
 * @param {number} wpm - Words per minute (default: 130)
 * @returns {Object} Speaking time breakdown
 */
export function calculateSpeakingTime(wordCount, wpm = 130) {
  return calculateReadingTime(wordCount, wpm);
}

/**
 * Analyze keyword density
 * @param {string} text - Input text
 * @param {number} topN - Number of top keywords to return
 * @returns {Array} Keyword density data
 */
export function analyzeKeywordDensity(text, topN = 10) {
  if (!text || typeof text !== 'string') return [];
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2);
  
  const stopWords = new Set([
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
    'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy',
    'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'with', 'have',
    'this', 'will', 'your', 'from', 'they', 'know', 'want', 'been', 'good',
    'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like',
    'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well',
    'were', 'what', 'would', 'there', 'their', 'where', 'being', 'every',
    'great', 'might', 'shall', 'still', 'those', 'these', 'think', 'which',
    'could', 'should', 'never', 'other', 'right', 'going', 'don', 'does'
  ]);
  
  const frequency = {};
  words.forEach(word => {
    if (!stopWords.has(word)) {
      frequency[word] = (frequency[word] || 0) + 1;
    }
  });
  
  return Object.entries(frequency)
    .map(([word, count]) => ({
      word,
      count,
      density: ((count / words.length) * 100).toFixed(1)
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, topN);
}

/**
 * Comprehensive text analysis
 * @param {string} text - Input text
 * @returns {Object} Complete analysis results
 */
export function analyzeText(text) {
  const wordCount = countWords(text);
  const charCount = countCharacters(text, true);
  const charCountNoSpaces = countCharacters(text, false);
  const sentenceCount = countSentences(text);
  const paragraphCount = countParagraphs(text);
  
  return {
    words: wordCount,
    characters: charCount,
    charactersNoSpaces: charCountNoSpaces,
    sentences: sentenceCount,
    paragraphs: paragraphCount,
    avgWordLength: wordCount > 0 ? (charCountNoSpaces / wordCount).toFixed(1) : 0,
    avgSentenceLength: sentenceCount > 0 ? (wordCount / sentenceCount).toFixed(1) : 0,
    readingTime: calculateReadingTime(wordCount),
    speakingTime: calculateSpeakingTime(wordCount),
    keywords: analyzeKeywordDensity(text),
    readability: calculateReadabilityScore(text, wordCount, sentenceCount)
  };
}

/**
 * Calculate readability score (Flesch Reading Ease)
 * @param {string} text - Input text
 * @param {number} wordCount - Word count
 * @param {number} sentenceCount - Sentence count
 * @returns {Object} Readability metrics
 */
function calculateReadabilityScore(text, wordCount, sentenceCount) {
  if (wordCount === 0 || sentenceCount === 0) {
    return { score: 0, level: 'N/A' };
  }
  
  // Count syllables (simplified)
  const syllables = text.toLowerCase()
    .replace(/[^a-z]/g, '')
    .replace(/[aeiouy]+/g, 'a')
    .replace(/[^a]/g, '').length;
  
  const score = 206.835 - (1.015 * (wordCount / sentenceCount)) - (84.6 * (syllables / wordCount));
  const normalizedScore = Math.max(0, Math.min(100, score));
  
  let level;
  if (score >= 90) level = 'Very Easy';
  else if (score >= 80) level = 'Easy';
  else if (score >= 70) level = 'Fairly Easy';
  else if (score >= 60) level = 'Standard';
  else if (score >= 50) level = 'Fairly Difficult';
  else if (score >= 30) level = 'Difficult';
  else level = 'Very Difficult';
  
  return {
    score: normalizedScore.toFixed(1),
    level
  };
}

export default { analyzeText, countWords, countCharacters, calculateReadingTime };
