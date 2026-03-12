import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Analytics Utility Tests
 * Privacy-focused analytics testing
 */

// Consent manager
const consentManager = {
  _consent: null,
  
  get() {
    if (this._consent === null) {
      try {
        const stored = localStorage.getItem('analytics-consent');
        this._consent = stored === 'true';
      } catch {
        this._consent = false;
      }
    }
    return this._consent;
  },
  
  set(value) {
    this._consent = value;
    try {
      localStorage.setItem('analytics-consent', String(value));
    } catch {
      // Ignore
    }
  },
  
  hasConsented() {
    return this.get() === true;
  }
};

// Privacy-safe event tracking
const analytics = {
  events: [],
  
  track(eventName, properties = {}) {
    if (!consentManager.hasConsented()) {
      return false;
    }
    
    const event = {
      name: eventName,
      properties: this._sanitizeProperties(properties),
      timestamp: Date.now(),
      sessionId: this._getSessionId()
    };
    
    this.events.push(event);
    return true;
  },
  
  _sanitizeProperties(props) {
    // Remove PII
    const sensitiveKeys = ['email', 'phone', 'name', 'address', 'password'];
    const sanitized = { ...props };
    
    sensitiveKeys.forEach(key => {
      if (key in sanitized) {
        delete sanitized[key];
      }
    });
    
    return sanitized;
  },
  
  _getSessionId() {
    try {
      let sessionId = sessionStorage.getItem('session-id');
      if (!sessionId) {
        sessionId = Math.random().toString(36).substring(2);
        sessionStorage.setItem('session-id', sessionId);
      }
      return sessionId;
    } catch {
      return 'anonymous';
    }
  },
  
  clear() {
    this.events = [];
  }
};

// Page view tracking
const pageViewTracker = {
  startTime: null,
  
  start() {
    this.startTime = performance.now();
  },
  
  end() {
    if (!this.startTime) return 0;
    const duration = Math.round(performance.now() - this.startTime);
    this.startTime = null;
    return duration;
  },
  
  trackPageView(path) {
    return analytics.track('page_view', {
      path,
      referrer: document?.referrer || 'direct'
    });
  }
};

describe('Analytics & Privacy', () => {
  beforeEach(() => {
    analytics.clear();
    consentManager._consent = null;
    
    // Mock storage
    const storage = {};
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: (k) => storage[k] || null,
        setItem: (k, v) => { storage[k] = v; },
        removeItem: (k) => { delete storage[k]; }
      },
      writable: true
    });
    
    Object.defineProperty(global, 'sessionStorage', {
      value: {
        getItem: (k) => storage[`session-${k}`] || null,
        setItem: (k, v) => { storage[`session-${k}`] = v; }
      },
      writable: true
    });
  });
  
  describe('consentManager', () => {
    it('should return false by default', () => {
      expect(consentManager.hasConsented()).toBe(false);
    });
    
    it('should store and retrieve consent', () => {
      consentManager.set(true);
      expect(consentManager.hasConsented()).toBe(true);
    });
    
    it('should persist consent to localStorage', () => {
      consentManager.set(true);
      expect(localStorage.getItem('analytics-consent')).toBe('true');
    });
  });
  
  describe('analytics.track', () => {
    it('should not track without consent', () => {
      const result = analytics.track('test_event');
      
      expect(result).toBe(false);
      expect(analytics.events).toHaveLength(0);
    });
    
    it('should track with consent', () => {
      consentManager.set(true);
      const result = analytics.track('test_event', { foo: 'bar' });
      
      expect(result).toBe(true);
      expect(analytics.events).toHaveLength(1);
      expect(analytics.events[0].name).toBe('test_event');
    });
    
    it('should sanitize PII from properties', () => {
      consentManager.set(true);
      analytics.track('test', {
        foo: 'bar',
        email: 'test@example.com',
        name: 'John Doe'
      });
      
      const event = analytics.events[0];
      expect(event.properties.foo).toBe('bar');
      expect(event.properties.email).toBeUndefined();
      expect(event.properties.name).toBeUndefined();
    });
    
    it('should include timestamp and session ID', () => {
      consentManager.set(true);
      analytics.track('test');
      
      const event = analytics.events[0];
      expect(event.timestamp).toBeTypeOf('number');
      expect(event.sessionId).toBeTypeOf('string');
    });
  });
  
  describe('pageViewTracker', () => {
    it('should calculate time on page', () => {
      pageViewTracker.start();
      
      // Simulate time passing
      const duration = pageViewTracker.end();
      
      expect(duration).toBeGreaterThanOrEqual(0);
    });
    
    it('should track page views with consent', () => {
      consentManager.set(true);
      const result = pageViewTracker.trackPageView('/test-path');
      
      expect(result).toBe(true);
      expect(analytics.events[0].name).toBe('page_view');
      expect(analytics.events[0].properties.path).toBe('/test-path');
    });
  });
});

export { consentManager, analytics, pageViewTracker };
