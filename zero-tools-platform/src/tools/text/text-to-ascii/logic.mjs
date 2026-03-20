/**
 * Text to ASCII Converter Logic Module
 * Multi-format text encoding/decoding
 */

/**
 * Convert text to binary
 * @param {string} text - Input text
 * @returns {string} Binary representation
 */
export function toBinary(text) {
  if (!text) return '';
  return text.split('')
    .map(char => char.charCodeAt(0).toString(2).padStart(8, '0'))
    .join(' ');
}

/**
 * Convert binary to text
 * @param {string} binary - Binary string
 * @returns {string} Decoded text
 */
export function fromBinary(binary) {
  if (!binary) return '';
  try {
    return binary.replace(/\s/g, '')
      .match(/.{1,8}/g)
      ?.map(byte => String.fromCharCode(parseInt(byte, 2)))
      .join('') || '';
  } catch {
    return 'Invalid binary input';
  }
}

/**
 * Convert text to hexadecimal
 * @param {string} text - Input text
 * @returns {string} Hex representation
 */
export function toHex(text) {
  if (!text) return '';
  return text.split('')
    .map(char => char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'))
    .join(' ');
}

/**
 * Convert hex to text
 * @param {string} hex - Hex string
 * @returns {string} Decoded text
 */
export function fromHex(hex) {
  if (!hex) return '';
  try {
    return hex.replace(/\s/g, '')
      .match(/.{1,2}/g)
      ?.map(byte => String.fromCharCode(parseInt(byte, 16)))
      .join('') || '';
  } catch {
    return 'Invalid hexadecimal input';
  }
}

/**
 * Convert text to octal
 * @param {string} text - Input text
 * @returns {string} Octal representation
 */
export function toOctal(text) {
  if (!text) return '';
  return text.split('')
    .map(char => char.charCodeAt(0).toString(8).padStart(3, '0'))
    .join(' ');
}

/**
 * Convert octal to text
 * @param {string} octal - Octal string
 * @returns {string} Decoded text
 */
export function fromOctal(octal) {
  if (!octal) return '';
  try {
    return octal.replace(/\s/g, '')
      .match(/.{1,3}/g)
      ?.map(byte => String.fromCharCode(parseInt(byte, 8)))
      .join('') || '';
  } catch {
    return 'Invalid octal input';
  }
}

/**
 * Convert text to decimal (ASCII codes)
 * @param {string} text - Input text
 * @returns {string} Decimal representation
 */
export function toDecimal(text) {
  if (!text) return '';
  return text.split('')
    .map(char => char.charCodeAt(0))
    .join(' ');
}

/**
 * Convert decimal to text
 * @param {string} decimal - Decimal string
 * @returns {string} Decoded text
 */
export function fromDecimal(decimal) {
  if (!decimal) return '';
  try {
    return decimal.split(/\s+/)
      .filter(n => n.trim())
      .map(n => String.fromCharCode(parseInt(n, 10)))
      .join('');
  } catch {
    return 'Invalid decimal input';
  }
}

/**
 * Convert to Base64
 * @param {string} text - Input text
 * @returns {string} Base64 encoded
 */
export function toBase64(text) {
  if (!text) return '';
  try {
    return btoa(unescape(encodeURIComponent(text)));
  } catch {
    return '';
  }
}

/**
 * Convert from Base64
 * @param {string} base64 - Base64 string
 * @returns {string} Decoded text
 */
export function fromBase64(base64) {
  if (!base64) return '';
  try {
    return decodeURIComponent(escape(atob(base64)));
  } catch {
    return 'Invalid Base64 input';
  }
}

/**
 * Convert to URL encoding
 * @param {string} text - Input text
 * @returns {string} URL encoded
 */
export function toURLEncoded(text) {
  if (!text) return '';
  return encodeURIComponent(text);
}

/**
 * Convert from URL encoding
 * @param {string} encoded - URL encoded string
 * @returns {string} Decoded text
 */
export function fromURLEncoded(encoded) {
  if (!encoded) return '';
  try {
    return decodeURIComponent(encoded);
  } catch {
    return 'Invalid URL encoded input';
  }
}

/**
 * Convert text to morse code
 * @param {string} text - Input text
 * @returns {string} Morse code
 */
export function toMorse(text) {
  if (!text) return '';
  
  const MORSE_CODE = {
    'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.',
    'G': '--.', 'H': '....', 'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..',
    'M': '--', 'N': '-.', 'O': '---', 'P': '.--.', 'Q': '--.-', 'R': '.-.',
    'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
    'Y': '-.--', 'Z': '--..', '1': '.----', '2': '..---', '3': '...--',
    '4': '....-', '5': '.....', '6': '-....', '7': '--...', '8': '---..',
    '9': '----.', '0': '-----', ' ': '/', '.': '.-.-.-', ',': '--..--',
    '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.', '(': '-.--.',
    ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-',
    '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-',
    '@': '.--.-.'
  };
  
  return text.toUpperCase()
    .split('')
    .map(char => MORSE_CODE[char] || char)
    .join(' ');
}

/**
 * Convert morse code to text
 * @param {string} morse - Morse code
 * @returns {string} Decoded text
 */
export function fromMorse(morse) {
  if (!morse) return '';
  
  const REVERSE_MORSE = {
    '.-': 'A', '-...': 'B', '-.-.': 'C', '-..': 'D', '.': 'E', '..-.': 'F',
    '--.': 'G', '....': 'H', '..': 'I', '.---': 'J', '-.-': 'K', '.-..': 'L',
    '--': 'M', '-.': 'N', '---': 'O', '.--.': 'P', '--.-': 'Q', '.-.': 'R',
    '...': 'S', '-': 'T', '..-': 'U', '...-': 'V', '.--': 'W', '-..-': 'X',
    '-.--': 'Y', '--..': 'Z', '.----': '1', '..---': '2', '...--': '3',
    '....-': '4', '.....': '5', '-....': '6', '--...': '7', '---..': '8',
    '----.': '9', '-----': '0', '/': ' ', '.-.-.-': '.', '--..--': ',',
    '..--..': '?', '.----.': "'", '-.-.--': '!', '-..-.': '/', '-.--.': '(',
    '-.--.-': ')', '.-...': '&', '---...': ':', '-.-.-.': ';', '-...-': '=',
    '.-.-.': '+', '-....-': '-', '..--.-': '_', '.-..-.': '"', '...-..-': '$',
    '.--.-.': '@'
  };
  
  return morse.split(' ')
    .map(code => REVERSE_MORSE[code] || code)
    .join('');
}

/**
 * Generate ASCII art
 * @param {string} text - Input text
 * @param {string} font - Font style
 * @returns {string} ASCII art
 */
export function toAsciiArt(text, _font = 'standard') {
  void _font;
  if (!text) return '';
  
  // Simple block letters
  const BLOCK_FONT = {
    'A': ['  ██  ', ' ████ ', '██  ██', '██████', '██  ██', '██  ██'],
    'B': ['██████', '██  ██', '██████', '██  ██', '██  ██', '██████'],
    'C': [' █████', '██   ', '██   ', '██   ', '██   ', ' █████'],
    ' ': ['      ', '      ', '      ', '      ', '      ', '      ']
  };
  
  const lines = ['', '', '', '', '', ''];
  
  for (const char of text.toUpperCase()) {
    const letter = BLOCK_FONT[char] || BLOCK_FONT[' '] || ['      '];
    for (let i = 0; i < 6; i++) {
      lines[i] = `${lines[i]}${letter[i] || '      '}  `;
    }
  }
  
  return lines.join('\n');
}

/**
 * Convert all formats
 * @param {string} text - Input text
 * @returns {Object} All format conversions
 */
export function convertAll(text) {
  return {
    original: text,
    binary: toBinary(text),
    hex: toHex(text),
    octal: toOctal(text),
    decimal: toDecimal(text),
    base64: toBase64(text),
    url: toURLEncoded(text),
    morse: toMorse(text)
  };
}

export default { convertAll, toBinary, toHex, toBase64, toMorse };
