/**
 * Privacy-First Analytics
 * Self-hosted Umami - no cookies, no PII
 */

const ANALYTICS_ENDPOINT = 'https://analytics.novatools.dev/api/send';
const WEBSITE_ID = 'novatools';

// Queue for offline tracking
let eventQueue = [];
const MAX_QUEUE_SIZE = 100;

/**
 * Initialize analytics
 */
export function initAnalytics() {
  // Don't track in development
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
    return;
  }
  
  // Track page view
  trackPageView();
  
  // Setup visibility tracking for accurate engagement
  setupVisibilityTracking();
  
  // Flush queue on online
  window.addEventListener('online', flushQueue);
}

/**
 * Track page view
 */
function trackPageView() {
  trackEvent('pageview', {
    url: location.pathname + location.search,
    referrer: document.referrer || null
  });
}

/**
 * Track custom event
 * @param {string} eventName 
 * @param {Object} data 
 */
export function trackEvent(eventName, data = {}) {
  // Don't track in development
  if (location.hostname === 'localhost') return;
  
  const payload = {
    type: 'event',
    payload: {
      website: WEBSITE_ID,
      hostname: location.hostname,
      screen: `${screen.width}x${screen.height}`,
      language: navigator.language,
      title: document.title,
      url: location.pathname,
      referrer: document.referrer || null,
      name: eventName,
      data: sanitizeData(data)
    }
  };
  
  if (navigator.onLine) {
    sendEvent(payload);
  } else {
    queueEvent(payload);
  }
}

/**
 * Send event to analytics endpoint
 */
async function sendEvent(payload) {
  try {
    await fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      // Use keepalive for page unload scenarios
      keepalive: true
    });
  } catch (error) {
    // Silent fail - privacy first, no retries that could fingerprint
    queueEvent(payload);
  }
}

/**
 * Queue event for offline sending
 */
function queueEvent(payload) {
  if (eventQueue.length < MAX_QUEUE_SIZE) {
    eventQueue.push({
      ...payload,
      timestamp: Date.now()
    });
  }
}

/**
 * Flush queued events
 */
async function flushQueue() {
  if (eventQueue.length === 0) return;
  
  const queue = [...eventQueue];
  eventQueue = [];
  
  for (const payload of queue) {
    await sendEvent(payload);
  }
}

/**
 * Setup visibility tracking for accurate engagement time
 */
function setupVisibilityTracking() {
  let startTime = Date.now();
  let totalEngaged = 0;
  
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      totalEngaged += Date.now() - startTime;
    } else {
      startTime = Date.now();
    }
  });
  
  // Send engagement on page unload
  window.addEventListener('beforeunload', () => {
    if (!document.hidden) {
      totalEngaged += Date.now() - startTime;
    }
    
    // Only track if engaged > 5 seconds
    if (totalEngaged > 5000) {
      trackEvent('engagement', {
        timeMs: totalEngaged
      });
    }
  });
}

/**
 * Sanitize data to remove any PII
 * @param {Object} data 
 */
function sanitizeData(data) {
  const sensitiveKeys = ['email', 'phone', 'name', 'address', 'password', 'token'];
  const sanitized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeData(value);
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

// Expose global tracker
window.umami = {
  track: trackEvent
};
