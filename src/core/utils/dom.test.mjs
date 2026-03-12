import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * DOM Utility Tests
 * Tests for DOM manipulation helpers
 */

// Debounce utility
function debounce(fn, delay) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// Throttle utility
function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Local storage with fallback
const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },
  
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  }
};

// Element creator helper
function createElement(tag, options = {}) {
  const el = document.createElement(tag);
  const { className, text, html, attributes, events } = options;
  
  if (className) el.className = className;
  if (text) el.textContent = text;
  if (html) el.innerHTML = html;
  
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });
  }
  
  if (events) {
    Object.entries(events).forEach(([event, handler]) => {
      el.addEventListener(event, handler);
    });
  }
  
  return el;
}

describe('DOM Utilities', () => {
  describe('debounce', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    
    it('should delay function execution', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      
      debounced();
      debounced();
      debounced();
      
      expect(fn).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });
    
    it('should reset timer on consecutive calls', () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      
      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      
      expect(fn).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
  
  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    
    it('should limit function execution rate', () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);
      
      throttled();
      throttled();
      throttled();
      
      expect(fn).toHaveBeenCalledTimes(1);
      
      vi.advanceTimersByTime(100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });
  
  describe('storage', () => {
    const localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn()
    };
    
    beforeEach(() => {
      Object.defineProperty(global, 'localStorage', {
        value: localStorageMock,
        writable: true
      });
      vi.clearAllMocks();
    });
    
    it('should get item from storage', () => {
      localStorageMock.getItem.mockReturnValue('"test-value"');
      
      const result = storage.get('test-key');
      
      expect(result).toBe('test-value');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('test-key');
    });
    
    it('should return default value when key not found', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = storage.get('missing-key', 'default');
      
      expect(result).toBe('default');
    });
    
    it('should handle storage errors gracefully', () => {
      localStorageMock.getItem.mockImplementation(() => {
        throw new Error('Storage disabled');
      });
      
      const result = storage.get('key', 'fallback');
      
      expect(result).toBe('fallback');
    });
    
    it('should set item in storage', () => {
      storage.set('test-key', { foo: 'bar' });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-key',
        '{"foo":"bar"}'
      );
    });
  });
  
  describe('createElement', () => {
    it('should create element with tag', () => {
      const el = createElement('div');
      
      expect(el.tagName).toBe('DIV');
    });
    
    it('should set className', () => {
      const el = createElement('div', { className: 'test-class' });
      
      expect(el.className).toBe('test-class');
    });
    
    it('should set text content', () => {
      const el = createElement('p', { text: 'Hello World' });
      
      expect(el.textContent).toBe('Hello World');
    });
    
    it('should set attributes', () => {
      const el = createElement('a', {
        attributes: { href: '/test', 'data-id': '123' }
      });
      
      expect(el.getAttribute('href')).toBe('/test');
      expect(el.getAttribute('data-id')).toBe('123');
    });
  });
});

export { debounce, throttle, storage, createElement };
