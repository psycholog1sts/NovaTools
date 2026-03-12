/**
 * API Client Module
 * Unified HTTP client with caching, retries, and error handling
 */

import { getConfig } from './config.mjs';
import { errorHandler } from './error-handler.mjs';

class APIClient {
  constructor() {
    this.cache = new Map();
    this.pendingRequests = new Map();
    this.defaultOptions = {
      timeout: 10000,
      retries: 3,
      retryDelay: 1000,
      cacheDuration: 5 * 60 * 1000 // 5 minutes
    };
  }

  /**
   * Make an HTTP request
   * @param {string} url - Request URL
   * @param {Object} options - Request options
   * @returns {Promise} Response data
   */
  async request(url, options = {}) {
    const config = { ...this.defaultOptions, ...options };
    const cacheKey = `${url}:${JSON.stringify(config.body)}`;

    // Check cache
    if (config.method === 'GET' && config.cache !== false) {
      const cached = this.getCached(cacheKey, config.cacheDuration);
      if (cached) return cached;
    }

    // Check for pending request (deduplication)
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Create request promise
    const requestPromise = this.executeRequest(url, config, cacheKey);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.pendingRequests.delete(cacheKey);
      return result;
    } catch (error) {
      this.pendingRequests.delete(cacheKey);
      throw error;
    }
  }

  /**
   * Execute HTTP request with retries
   * @param {string} url - Request URL
   * @param {Object} config - Request config
   * @param {string} cacheKey - Cache key
   * @returns {Promise} Response data
   */
  async executeRequest(url, config, cacheKey) {
    let lastError;

    for (let attempt = 0; attempt < config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);

        const response = await fetch(url, {
          method: config.method || 'GET',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...config.headers
          },
          body: config.body ? JSON.stringify(config.body) : undefined,
          signal: controller.signal,
          ...config.fetchOptions
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Cache successful GET requests
        if (config.method === 'GET' || !config.method) {
          this.setCached(cacheKey, data, config.cacheDuration);
        }

        return data;
      } catch (error) {
        lastError = error;

        // Don't retry on client errors (4xx)
        if (error.message?.includes('HTTP 4')) {
          break;
        }

        // Wait before retry
        if (attempt < config.retries - 1) {
          await this.delay(config.retryDelay * (attempt + 1));
        }
      }
    }

    // All retries failed
    errorHandler.handle(lastError, { type: 'api', url });
    throw lastError;
  }

  /**
   * Get cached data
   * @param {string} key - Cache key
   * @param {number} duration - Cache duration
   * @returns {*} Cached data or null
   */
  getCached(key, duration) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > duration) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  /**
   * Set cached data
   * @param {string} key - Cache key
   * @param {*} data - Data to cache
   * @param {number} duration - Cache duration
   */
  setCached(key, data, duration) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expires: Date.now() + duration
    });
  }

  /**
   * Clear all cache or specific key
   * @param {string} key - Specific key to clear (optional)
   */
  clearCache(key) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Delay utility
   * @param {number} ms - Milliseconds
   * @returns {Promise}
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // HTTP method shortcuts
  get(url, options = {}) {
    return this.request(url, { ...options, method: 'GET' });
  }

  post(url, body, options = {}) {
    return this.request(url, { ...options, method: 'POST', body });
  }

  put(url, body, options = {}) {
    return this.request(url, { ...options, method: 'PUT', body });
  }

  delete(url, options = {}) {
    return this.request(url, { ...options, method: 'DELETE' });
  }
}

// Singleton instance
export const apiClient = new APIClient();

export default apiClient;
