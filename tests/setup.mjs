/**
 * Node test setup for legacy core tests.
 * Keeps the old Vitest-style imports through the local compatibility package.
 */

import { JSDOM } from 'jsdom';
import { vi } from 'vitest';

const dom = new JSDOM('<!doctype html><html><body></body></html>', {
  url: 'https://mc-novatools.com/'
});

Object.defineProperty(globalThis, 'window', {
  value: dom.window,
  configurable: true,
  writable: true
});
Object.defineProperty(globalThis, 'document', {
  value: dom.window.document,
  configurable: true,
  writable: true
});
Object.defineProperty(globalThis, 'navigator', {
  value: dom.window.navigator,
  configurable: true,
  writable: true
});

globalThis.Event = dom.window.Event;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.HTMLElement = dom.window.HTMLElement;

// Mock window.matchMedia
globalThis.matchMedia = globalThis.matchMedia || function() {
  return {
    matches: false,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  };
};

// Mock IntersectionObserver
globalThis.IntersectionObserver = class IntersectionObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
};

// Mock ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  constructor(callback) {
    this.callback = callback;
  }
  observe() { return null; }
  unobserve() { return null; }
  disconnect() { return null; }
};

// Mock URL.createObjectURL / revokeObjectURL
globalThis.URL.createObjectURL = vi.fn(() => 'blob:test-url');
globalThis.URL.revokeObjectURL = vi.fn();

// Mock fetch
globalThis.fetch = vi.fn();

Object.defineProperty(globalThis.navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve(''))
  },
  configurable: true
});

// Mock customElements if not available
if (!globalThis.customElements) {
  globalThis.customElements = {
    define: vi.fn(),
    get: vi.fn(),
    whenDefined: vi.fn(() => Promise.resolve())
  };
}

// Mock localStorage with in-memory storage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    })
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
  writable: true
});
