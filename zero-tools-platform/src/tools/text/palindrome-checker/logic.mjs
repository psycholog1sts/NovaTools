/**
 * Palindrome Checker Logic Module
 * Advanced palindrome detection and analysis
 */

/**
 * Check if text is a palindrome
 * @param {string} text - Text to check
 * @param {Object} options - Check options
 * @returns {Object} Palindrome check result
 */
export function isPalindrome(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return {
      isPalindrome: false,
      cleaned: '',
      reversed: '',
      length: 0,
      type: 'invalid'
    };
  }
  
  const { 
    ignoreCase = true, 
    ignoreSpaces = true, 
    ignorePunctuation = true,
    ignoreNumbers = false 
  } = options;
  
  let cleaned = text;
  
  if (ignoreCase) {
    cleaned = cleaned.toLowerCase();
  }
  
  if (ignoreSpaces) {
    cleaned = cleaned.replace(/\s/g, '');
  }
  
  if (ignorePunctuation) {
    cleaned = cleaned.replace(/[^\w\s]/g, '');
  }
  
  if (ignoreNumbers) {
    cleaned = cleaned.replace(/\d/g, '');
  }
  
  // Handle non-ASCII characters
  cleaned = cleaned.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  const reversed = cleaned.split('').reverse().join('');
  const isPalin = cleaned === reversed && cleaned.length > 0;
  
  // Determine type
  let type = 'none';
  if (isPalin) {
    if (cleaned.length === 1) {
      type = 'single';
    } else if (cleaned.length <= 3) {
      type = 'short';
    } else if (cleaned.length >= 10) {
      type = 'long';
    } else {
      type = 'standard';
    }
  }
  
  return {
    isPalindrome: isPalin,
    original: text,
    cleaned,
    reversed,
    length: cleaned.length,
    type,
    confidence: calculateConfidence(cleaned, isPalin)
  };
}

/**
 * Calculate confidence score
 * @param {string} text - Cleaned text
 * @param {boolean} isPalin - Is palindrome
 * @returns {number} Confidence score (0-1)
 */
function calculateConfidence(text, isPalin) {
  if (!isPalin) return 0;
  if (text.length < 3) return 0.5;
  if (text.length >= 5) return 1;
  return 0.7 + (text.length - 3) * 0.1;
}

/**
 * Find all palindromes in text
 * @param {string} text - Text to search
 * @param {number} minLength - Minimum palindrome length
 * @returns {Array} Found palindromes
 */
export function findPalindromes(text, minLength = 3) {
  if (!text) return [];
  
  const palindromes = [];
  const cleaned = text.toLowerCase().replace(/[^\w]/g, '');
  
  for (let i = 0; i < cleaned.length; i++) {
    // Odd length palindromes
    for (let j = minLength; j <= cleaned.length - i; j += 2) {
      const substr = cleaned.substring(i, i + j);
      if (substr === substr.split('').reverse().join('') && substr.length >= minLength) {
        palindromes.push({
          text: substr,
          start: i,
          end: i + j,
          length: j
        });
      }
    }
  }
  
  // Remove duplicates and overlapping
  return palindromes.filter((p, index, self) => 
    index === self.findIndex(t => t.text === p.text && t.start === p.start)
  );
}

/**
 * Generate palindrome from text
 * @param {string} text - Base text
 * @param {string} method - Generation method
 * @returns {string} Generated palindrome
 */
export function generatePalindrome(text, method = 'mirror') {
  if (!text) return '';
  
  const cleaned = text.toLowerCase().replace(/[^\w]/g, '');
  
  switch (method) {
    case 'mirror':
      // text + reversed(text)
      return cleaned + cleaned.split('').reverse().join('');
    
    case 'mirrorAll':
      // text + reversed(all except last char)
      return cleaned + cleaned.slice(0, -1).split('').reverse().join('');
    
    case 'center': {
      // Find center and mirror around it
      const mid = Math.floor(cleaned.length / 2);
      const first = cleaned.substring(0, mid);
      return first + cleaned[mid] + first.split('').reverse().join('');
    }
    
    default:
      return cleaned + cleaned.split('').reverse().join('');
  }
}

/**
 * Check if number is palindrome
 * @param {number} num - Number to check
 * @returns {Object} Check result
 */
export function isNumberPalindrome(num) {
  if (typeof num !== 'number' || isNaN(num)) {
    return { isPalindrome: false, reason: 'invalid' };
  }
  
  const str = Math.abs(Math.floor(num)).toString();
  const reversed = str.split('').reverse().join('');
  
  return {
    isPalindrome: str === reversed,
    original: num,
    asString: str,
    reversed,
    digitCount: str.length
  };
}

/**
 * Check phrase palindrome (word-level)
 * @param {string} text - Text to check
 * @returns {Object} Phrase check result
 */
export function isPhrasePalindrome(text) {
  if (!text) return { isPalindrome: false };
  
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 0);
  
  const reversed = [...words].reverse();
  const isPalin = JSON.stringify(words) === JSON.stringify(reversed);
  
  return {
    isPalindrome: isPalin,
    words,
    wordCount: words.length,
    reversed: reversed.join(' ')
  };
}

/**
 * Analyze palindrome properties
 * @param {string} text - Text to analyze
 * @returns {Object} Detailed analysis
 */
export function analyze(text) {
  const basic = isPalindrome(text);
  const phrase = isPhrasePalindrome(text);
  const embedded = findPalindromes(text, 3);
  
  // Check mathematical properties
  const isPerfectSquare = (n) => {
    const sqrt = Math.sqrt(n);
    return sqrt === Math.floor(sqrt);
  };
  
  return {
    basic,
    phrase,
    embedded: embedded.slice(0, 10), // Top 10
    properties: {
      length: basic.length,
      isEvenLength: basic.length % 2 === 0,
      uniqueChars: new Set(basic.cleaned).size,
      charFrequency: getCharFrequency(basic.cleaned),
      isPerfectSquareLength: isPerfectSquare(basic.length)
    }
  };
}

/**
 * Get character frequency
 * @param {string} text - Input text
 * @returns {Object} Character frequencies
 */
function getCharFrequency(text) {
  const freq = {};
  for (const char of text) {
    freq[char] = (freq[char] || 0) + 1;
  }
  return freq;
}

/**
 * Batch check multiple texts
 * @param {string[]} texts - Array of texts
 * @returns {Array} Results
 */
export function batchCheck(texts) {
  return texts.map((text, index) => ({
    id: index,
    text,
    ...isPalindrome(text)
  }));
}

export default { isPalindrome, findPalindromes, generatePalindrome, analyze };
