/**
 * Protocol Handlers
 * Custom URL schemes for deep linking
 */

const PROTOCOLS = {
  PDF_MERGE: 'web+pdfmerge',
  PDF_COMPRESS: 'web+pdfcompress',
  MORTGAGE_CALC: 'web+mortgage',
  COMPOUND_INTEREST: 'web+compound'
};

/**
 * Register protocol handlers
 */
export function registerProtocolHandlers() {
  if (!navigator.registerProtocolHandler) {
    console.warn('Protocol Handler API not supported');
    return;
  }

  try {
    // Register PDF merge handler
    navigator.registerProtocolHandler(
      PROTOCOLS.PDF_MERGE,
      '/src/tools/pdf/merge/?source=%s',
      'NovaTools PDF Merge'
    );

    // Register PDF compress handler
    navigator.registerProtocolHandler(
      PROTOCOLS.PDF_COMPRESS,
      '/src/tools/pdf/compress/?source=%s',
      'NovaTools PDF Compress'
    );

    // Register mortgage calculator handler
    navigator.registerProtocolHandler(
      PROTOCOLS.MORTGAGE_CALC,
      '/src/tools/finance/mortgage-tr/?source=%s',
      'NovaTools Mortgage Calculator'
    );
  } catch (err) {
    console.error('Protocol registration error:', err);
  }
}

/**
 * Parse protocol URL
 */
export function parseProtocolUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // Check if it's our protocol
    const protocol = Object.entries(PROTOCOLS).find(([_, value]) => 
      urlObj.protocol === `${value}:`
    );
    
    if (!protocol) return null;

    return {
      protocol: protocol[0],
      protocolValue: protocol[1],
      path: urlObj.pathname,
      params: Object.fromEntries(urlObj.searchParams)
    };
  } catch {
    return null;
  }
}

/**
 * Generate protocol URL for tool
 */
export function generateProtocolUrl(tool, params = {}) {
  let protocol;
  
  switch (tool) {
    case 'pdf-merge': protocol = PROTOCOLS.PDF_MERGE; break;
    case 'pdf-compress': protocol = PROTOCOLS.PDF_COMPRESS; break;
    case 'mortgage': protocol = PROTOCOLS.MORTGAGE_CALC; break;
    case 'compound-interest': protocol = PROTOCOLS.COMPOUND_INTEREST; break;
    default: return null;
  }

  const url = new URL(`${protocol}://open`);
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  
  return url.toString();
}

/**
 * Handle incoming protocol URL
 */
export function handleProtocolUrl() {
  const source = new URLSearchParams(window.location.search).get('source');
  if (!source) return null;

  const parsed = parseProtocolUrl(source);
  if (!parsed) return null;

  // Dispatch event with parsed data
  window.dispatchEvent(new CustomEvent('protocol-url-received', {
    detail: parsed
  }));

  return parsed;
}

/**
 * Check if protocol handlers are supported
 */
export function isProtocolHandlerSupported() {
  return 'registerProtocolHandler' in navigator;
}

/**
 * Request permission to register handlers
 */
export async function requestProtocolPermission() {
  if (!isProtocolHandlerSupported()) {
    return { supported: false, granted: false };
  }

  // Permission is implicitly granted for same-origin registrations
  // but we can check if user has blocked it
  return { supported: true, granted: true };
}

export { PROTOCOLS };
