/**
 * HTML Entity Encoder/Decoder Logic Module
 * HTML special character handling
 */

// HTML named entities map
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;'
};

// Reverse map for decoding
const REVERSE_ENTITIES = Object.fromEntries(
  Object.entries(HTML_ENTITIES).map(([k, v]) => [v, k])
);

// Extended entity map
const EXTENDED_ENTITIES = {
  ' ': '&nbsp;',
  '©': '&copy;',
  '®': '&reg;',
  '™': '&trade;',
  '€': '&euro;',
  '£': '&pound;',
  '¥': '&yen;',
  '¢': '&cent;',
  '§': '&sect;',
  '¶': '&para;',
  '•': '&bull;',
  '…': '&hellip;',
  '′': '&prime;',
  '″': '&Prime;',
  '–': '&ndash;',
  '—': '&mdash;',
  '‘': '&lsquo;',
  '’': '&rsquo;',
  '“': '&ldquo;',
  '”': '&rdquo;',
  '«': '&laquo;',
  '»': '&raquo;',
  '→': '&rarr;',
  '←': '&larr;',
  '↑': '&uarr;',
  '↓': '&darr;',
  '⇒': '&rArr;',
  '⇐': '&lArr;',
  '⇑': '&uArr;',
  '⇓': '&dArr;',
  '✓': '&check;',
  '✗': '&cross;',
  '∞': '&infin;',
  '≠': '&ne;',
  '≈': '&asymp;',
  '≤': '&le;',
  '≥': '&ge;',
  '±': '&plusmn;',
  '×': '&times;',
  '÷': '&divide;',
  '√': '&radic;',
  '∑': '&sum;',
  '∏': '&prod;',
  '∫': '&int;',
  'α': '&alpha;',
  'β': '&beta;',
  'γ': '&gamma;',
  'δ': '&delta;',
  'θ': '&theta;',
  'λ': '&lambda;',
  'μ': '&mu;',
  'π': '&pi;',
  'σ': '&sigma;',
  'τ': '&tau;',
  'φ': '&phi;',
  'ω': '&omega;',
  'Ω': '&Omega;',
  '∂': '&part;',
  '∇': '&nabla;',
  '∈': '&isin;',
  '∉': '&notin;',
  '∋': '&ni;',
  '∩': '&cap;',
  '∪': '&cup;',
  '⊂': '&sub;',
  '⊃': '&sup;',
  '⊆': '&sube;',
  '⊇': '&supe;',
  '∅': '&empty;',
  '∃': '&exist;',
  '∀': '&forall;',
  '∧': '&and;',
  '∨': '&or;',
  '¬': '&not;',
  '⊕': '&oplus;',
  '⊗': '&otimes;'
};

/**
 * Encode HTML entities (basic)
 * @param {string} text - Text to encode
 * @returns {string} Encoded HTML
 */
export function encode(text) {
  if (!text || typeof text !== 'string') return '';
  
  return text.replace(/[&<>"'`=/]/g, char => HTML_ENTITIES[char] || char);
}

/**
 * Encode all special characters including extended
 * @param {string} text - Text to encode
 * @returns {string} Fully encoded HTML
 */
export function encodeAll(text) {
  if (!text) return '';
  
  const allEntities = { ...HTML_ENTITIES, ...EXTENDED_ENTITIES };
  
  return text.split('').map(char => {
    const code = char.charCodeAt(0);
    // ASCII printable range
    if (code >= 32 && code <= 126) {
      return allEntities[char] || char;
    }
    // Extended ASCII and Unicode
    return `&#${code};`;
  }).join('');
}

/**
 * Decode HTML entities
 * @param {string} html - HTML to decode
 * @returns {string} Decoded text
 */
export function decode(html) {
  if (!html || typeof html !== 'string') return '';
  
  let decoded = html;
  
  // Decode named entities
  const allReverse = { ...REVERSE_ENTITIES, ...Object.fromEntries(
    Object.entries(EXTENDED_ENTITIES).map(([k, v]) => [v, k])
  )};
  
  decoded = decoded.replace(/&[a-zA-Z][a-zA-Z0-9]*;/g, entity => 
    allReverse[entity] || entity
  );
  
  // Decode numeric entities (decimal)
  decoded = decoded.replace(/&#(\d+);/g, (_, code) => 
    String.fromCharCode(parseInt(code, 10))
  );
  
  // Decode hex entities
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => 
    String.fromCharCode(parseInt(hex, 16))
  );
  
  return decoded;
}

/**
 * Escape for JavaScript string
 * @param {string} text - Text to escape
 * @returns {string} JS-escaped string
 */
export function escapeJS(text) {
  if (!text) return '';
  
  return text
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\f/g, '\\f')
    .replace(/\b/g, '\\b');
}

/**
 * Escape for CSS
 * @param {string} text - Text to escape
 * @returns {string} CSS-escaped string
 */
export function escapeCSS(text) {
  if (!text) return '';
  
  return text.replace(/[^\x20-\x7E]/g, char => 
    `\\${char.charCodeAt(0).toString(16).toUpperCase().padStart(6, '0')}`
  );
}

/**
 * Strip HTML tags
 * @param {string} html - HTML to strip
 * @returns {string} Plain text
 */
export function stripTags(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
}

/**
 * Convert newlines to <br> tags
 * @param {string} text - Text to convert
 * @returns {string} HTML with breaks
 */
export function nl2br(text) {
  if (!text) return '';
  return text.replace(/\n/g, '<br>');
}

/**
 * Comprehensive entity analysis
 * @param {string} text - Text to analyze
 * @returns {Object} Analysis results
 */
export function analyzeEntities(text) {
  if (!text) {
    return {
      totalChars: 0,
      entitiesNeeded: 0,
      specialChars: [],
      encoded: '',
      decoded: ''
    };
  }
  
  const specialChars = [...new Set(text.match(/[&<>"'`=/]|[^\x20-\x7E]/g) || [])];
  const encoded = encode(text);
  
  return {
    totalChars: text.length,
    entitiesNeeded: specialChars.length,
    specialChars,
    encoded,
    decoded: decode(encoded),
    bytes: new Blob([text]).size,
    encodedBytes: new Blob([encoded]).size
  };
}

export default { encode, decode, stripTags, nl2br, analyzeEntities };
