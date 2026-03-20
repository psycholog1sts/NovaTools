/**
 * URL Encoder/Decoder Logic Module
 * URL-safe encoding and decoding utilities
 */

/**
 * URL encode text
 * @param {string} text - Text to encode
 * @param {boolean} encodeAll - Whether to encode all characters
 * @returns {string} Encoded URL
 */
export function encode(text, encodeAll = false) {
  if (!text || typeof text !== 'string') return '';
  
  if (encodeAll) {
    // Encode all characters including alphanumeric
    return text.split('').map(char => 
      `%${char.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0')}`
    ).join('');
  }
  
  // Standard URL encoding
  return encodeURIComponent(text);
}

/**
 * URL decode text
 * @param {string} encoded - Encoded text
 * @returns {string} Decoded text
 */
export function decode(encoded) {
  if (!encoded || typeof encoded !== 'string') return '';
  
  try {
    return decodeURIComponent(encoded);
  } catch (error) {
    // If decoding fails, return original
    return encoded;
  }
}

/**
 * Encode for URL component (form data safe)
 * @param {string} text - Text to encode
 * @returns {string} Form-encoded text
 */
export function encodeForm(text) {
  if (!text) return '';
  return encodeURIComponent(text).replace(/%20/g, '+');
}

/**
 * Decode form-encoded text
 * @param {string} text - Form-encoded text
 * @returns {string} Decoded text
 */
export function decodeForm(text) {
  if (!text) return '';
  return decodeURIComponent(text.replace(/\+/g, ' '));
}

/**
 * Build query string from object
 * @param {Object} params - Query parameters
 * @returns {string} Query string
 */
export function buildQueryString(params) {
  if (!params || typeof params !== 'object') return '';
  
  const pairs = Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => {
      const encodedKey = encodeURIComponent(key);
      const encodedValue = encodeURIComponent(String(value));
      return `${encodedKey}=${encodedValue}`;
    });
  
  return pairs.join('&');
}

/**
 * Parse query string to object
 * @param {string} queryString - Query string
 * @returns {Object} Parsed parameters
 */
export function parseQueryString(queryString) {
  if (!queryString) return {};
  
  const query = queryString.replace(/^\?/, '');
  const params = {};
  
  query.split('&').forEach(pair => {
    const [key, value = ''] = pair.split('=').map(decodeURIComponent);
    if (key) {
      // Handle array notation (key[])
      if (key.endsWith('[]')) {
        const arrayKey = key.slice(0, -2);
        if (!params[arrayKey]) params[arrayKey] = [];
        params[arrayKey].push(value);
      } else if (params[key]) {
        // Convert to array if duplicate
        params[key] = Array.isArray(params[key]) 
          ? [...params[key], value]
          : [params[key], value];
      } else {
        params[key] = value;
      }
    }
  });
  
  return params;
}

/**
 * Encode URI (preserves : / ; ?)
 * @param {string} uri - URI to encode
 * @returns {string} Encoded URI
 */
export function encodeURI(uri) {
  if (!uri) return '';
  return window.encodeURI(uri);
}

/**
 * Validate URL
 * @param {string} url - URL to validate
 * @returns {Object} Validation result
 */
export function validateURL(url) {
  if (!url) {
    return { valid: false, error: 'URL is empty' };
  }
  
  try {
    const parsed = new URL(url);
    return {
      valid: true,
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port,
      pathname: parsed.pathname,
      search: parsed.search,
      hash: parsed.hash,
      params: parseQueryString(parsed.search)
    };
  } catch (error) {
    // Try with https:// prefix
    try {
      const parsed = new URL(`https://${url}`);
      return {
        valid: true,
        protocol: parsed.protocol,
        hostname: parsed.hostname,
        port: parsed.port,
        pathname: parsed.pathname,
        search: parsed.search,
        hash: parsed.hash,
        params: parseQueryString(parsed.search),
        assumedProtocol: true
      };
    } catch {
      return { valid: false, error: 'Invalid URL format' };
    }
  }
}

/**
 * Base64 encode
 * @param {string} text - Text to encode
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
 * Base64 decode
 * @param {string} encoded - Base64 text
 * @returns {string} Decoded text
 */
export function fromBase64(encoded) {
  if (!encoded) return '';
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return '';
  }
}

/**
 * Batch encode/decode operations
 * @param {Array} items - Array of {operation, text} objects
 * @returns {Array} Results
 */
export function batchProcess(items) {
  return items.map((item, index) => {
    const { operation, text } = item;
    let result;
    
    switch (operation) {
      case 'encode':
        result = encode(text);
        break;
      case 'decode':
        result = decode(text);
        break;
      case 'encodeAll':
        result = encode(text, true);
        break;
      case 'base64':
        result = toBase64(text);
        break;
      case 'base64decode':
        result = fromBase64(text);
        break;
      default:
        result = text;
    }
    
    return { id: index, operation, original: text, result };
  });
}

export default { encode, decode, buildQueryString, parseQueryString, validateURL };
