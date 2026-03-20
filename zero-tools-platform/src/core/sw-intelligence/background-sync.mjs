/**
 * Autonomous Service Worker Intelligence
 * Background Periodic Sync, Background Fetch, and Predictive Prefetching
 */

// Background Periodic Sync Manager
export class BackgroundSyncManager {
  constructor() {
    this.syncTags = new Set();
    this.listeners = new Map();
  }

  /**
   * Check if Periodic Background Sync is supported
   */
  isPeriodicSyncSupported() {
    return 'serviceWorker' in navigator && 
           'periodicSync' in navigator.serviceWorker;
  }

  /**
   * Check if Background Sync is supported
   */
  isBackgroundSyncSupported() {
    return 'serviceWorker' in navigator && 
           'sync' in navigator.serviceWorker;
  }

  /**
   * Register periodic sync
   */
  async registerPeriodicSync(tag, minInterval = 24 * 60 * 60 * 1000) {
    if (!this.isPeriodicSyncSupported()) {
      console.warn('Periodic Background Sync not supported');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    
    try {
      // Check permission
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync'
      });

      if (status.state !== 'granted') {
        console.warn('Periodic Background Sync permission denied');
        return false;
      }

      await registration.periodicSync.register(tag, {
        minInterval
      });

      this.syncTags.add(tag);
      this.emit('registered', { tag, type: 'periodic' });
      
      return true;
    } catch (error) {
      console.error('Failed to register periodic sync:', error);
      return false;
    }
  }

  /**
   * Register one-time background sync
   */
  async registerOneTimeSync(tag) {
    if (!this.isBackgroundSyncSupported()) {
      console.warn('Background Sync not supported');
      return false;
    }

    const registration = await navigator.serviceWorker.ready;
    
    try {
      await registration.sync.register(tag);
      this.syncTags.add(tag);
      this.emit('registered', { tag, type: 'one-time' });
      return true;
    } catch (error) {
      console.error('Failed to register sync:', error);
      return false;
    }
  }

  /**
   * Unregister sync
   */
  async unregisterSync(tag) {
    if (!this.isPeriodicSyncSupported()) return false;

    const registration = await navigator.serviceWorker.ready;
    
    try {
      await registration.periodicSync.unregister(tag);
      this.syncTags.delete(tag);
      this.emit('unregistered', { tag });
      return true;
    } catch (error) {
      console.error('Failed to unregister sync:', error);
      return false;
    }
  }

  /**
   * Get registered sync tags
   */
  async getTags() {
    if (!this.isPeriodicSyncSupported()) return [];

    const registration = await navigator.serviceWorker.ready;
    
    try {
      return await registration.periodicSync.getTags();
    } catch (error) {
      return [];
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

// Background Fetch Manager for large downloads/uploads
export class BackgroundFetchManager {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Check if Background Fetch is supported
   */
  isSupported() {
    return 'serviceWorker' in navigator && 
           'backgroundFetch' in navigator.serviceWorker;
  }

  /**
   * Fetch in background
   */
  async fetch(id, requests, options = {}) {
    if (!this.isSupported()) {
      throw new Error('Background Fetch not supported');
    }

    const registration = await navigator.serviceWorker.ready;
    
    // Convert single request to array
    const requestArray = Array.isArray(requests) ? requests : [requests];
    
    // Convert to Request objects if needed
    const fetchRequests = requestArray.map(req => {
      if (req instanceof Request) return req;
      return new Request(req.url || req, {
        method: req.method || 'GET',
        headers: req.headers,
        body: req.body
      });
    });

    const fetchOptions = {
      title: options.title || 'Downloading...',
      icons: options.icons || [],
      downloadTotal: options.downloadTotal,
      ...options
    };

    try {
      const fetch = await registration.backgroundFetch.fetch(
        id,
        fetchRequests,
        fetchOptions
      );

      this.setupFetchListeners(fetch);
      this.emit('started', { id, fetch });
      
      return fetch;
    } catch (error) {
      console.error('Background fetch failed:', error);
      throw error;
    }
  }

  /**
   * Get existing background fetch
   */
  async get(id) {
    if (!this.isSupported()) return null;

    const registration = await navigator.serviceWorker.ready;
    return registration.backgroundFetch.get(id);
  }

  /**
   * Get all background fetches
   */
  async getAll() {
    if (!this.isSupported()) return [];

    const registration = await navigator.serviceWorker.ready;
    return registration.backgroundFetch.getIds();
  }

  /**
   * Abort background fetch
   */
  async abort(id) {
    const fetch = await this.get(id);
    if (fetch) {
      await fetch.abort();
      this.emit('aborted', { id });
    }
  }

  setupFetchListeners(fetch) {
    fetch.addEventListener('progress', () => {
      this.emit('progress', {
        id: fetch.id,
        downloaded: fetch.downloaded,
        total: fetch.downloadTotal,
        percent: fetch.downloadTotal ? 
          (fetch.downloaded / fetch.downloadTotal * 100) : 0
      });
    });

    fetch.addEventListener('abort', () => {
      this.emit('abort', { id: fetch.id });
    });

    // Success/failure handled in service worker
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

// Predictive Prefetching based on user behavior
export class PredictivePrefetcher {
  constructor() {
    this.history = [];
    this.patterns = new Map();
    this.maxHistory = 50;
    this.listeners = new Map();
  }

  /**
   * Record tool usage for pattern analysis
   */
  recordToolUsage(toolId, metadata = {}) {
    const entry = {
      toolId,
      timestamp: Date.now(),
      ...metadata
    };

    this.history.push(entry);
    
    // Keep only recent history
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Analyze patterns
    this.analyzePatterns();
    
    // Trigger prefetch if pattern detected
    this.prefetchBasedOnPattern(toolId);
  }

  /**
   * Analyze usage patterns
   */
  analyzePatterns() {
    // Simple pattern: tool A → tool B
    for (let i = 1; i < this.history.length; i++) {
      const prev = this.history[i - 1].toolId;
      const curr = this.history[i].toolId;
      
      const key = `${prev}->${curr}`;
      this.patterns.set(key, (this.patterns.get(key) || 0) + 1);
    }
  }

  /**
   * Get likely next tools based on current tool
   */
  getLikelyNextTools(currentToolId, topN = 3) {
    const candidates = [];
    
    for (const [pattern, count] of this.patterns) {
      if (pattern.startsWith(`${currentToolId}->`)) {
        const nextTool = pattern.split('->')[1];
        candidates.push({ toolId: nextTool, confidence: count });
      }
    }

    // Sort by confidence
    candidates.sort((a, b) => b.confidence - a.confidence);
    
    // Normalize confidence
    const total = candidates.reduce((sum, c) => sum + c.confidence, 0);
    return candidates.slice(0, topN).map(c => ({
      ...c,
      confidence: c.confidence / total
    }));
  }

  /**
   * Prefetch based on detected patterns
   */
  async prefetchBasedOnPattern(currentToolId) {
    const likely = this.getLikelyNextTools(currentToolId);
    
    for (const { toolId, confidence } of likely) {
      if (confidence > 0.3) {
        await this.prefetchTool(toolId);
      }
    }
  }

  /**
   * Prefetch tool resources
   */
  async prefetchTool(toolId) {
    const toolUrl = `/src/tools/${toolId}/`;
    
    // Check if already cached
    const cache = await caches.open('predictive-prefetch');
    const cached = await cache.match(toolUrl);
    
    if (cached) return;

    // Prefetch in background
    try {
      const response = await fetch(toolUrl, {
        credentials: 'same-origin',
        priority: 'low'
      });
      
      if (response.ok) {
        await cache.put(toolUrl, response.clone());
        this.emit('prefetched', { toolId, url: toolUrl });
      }
    } catch (error) {
      console.warn('Prefetch failed:', error);
    }
  }

  /**
   * Prefetch based on time patterns
   */
  scheduleTimeBasedPrefetch() {
    const hour = new Date().getHours();
    
    // Business hours: prefetch productivity tools
    if (hour >= 9 && hour <= 17) {
      this.prefetchTool('pdf/merge');
      this.prefetchTool('pdf/compress');
    }
    
    // Evening: prefetch personal finance tools
    if (hour >= 18 && hour <= 22) {
      this.prefetchTool('finance/mortgage');
      this.prefetchTool('finance/retirement');
    }
  }

  /**
   * Clear prefetch cache
   */
  async clearCache() {
    await caches.delete('predictive-prefetch');
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

// Offline Queue for actions performed while offline
export class OfflineQueue {
  constructor() {
    this.queue = [];
    this.listeners = new Map();
    this.maxRetries = 3;
    this.retryDelay = 5000;
    
    this.init();
  }

  async init() {
    // Load queue from IndexedDB
    await this.loadQueue();
    
    // Setup sync listener
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data.type === 'sync-complete') {
          this.handleSyncComplete(e.data);
        }
      });
    }
  }

  /**
   * Add action to queue
   */
  async enqueue(action) {
    const item = {
      id: `${Date.now()}-${Math.random()}`,
      action,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    };

    this.queue.push(item);
    await this.saveQueue();
    
    // Request background sync
    if ('sync' in navigator.serviceWorker) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(`process-${item.id}`);
    }

    this.emit('enqueued', item);
    return item.id;
  }

  /**
   * Process queue when online
   */
  async processQueue(processor) {
    if (!navigator.onLine) return;

    const pending = this.queue.filter(i => i.status === 'pending');
    
    for (const item of pending) {
      try {
        item.status = 'processing';
        await processor(item.action);
        item.status = 'completed';
        this.emit('completed', item);
      } catch (error) {
        item.retries++;
        
        if (item.retries >= this.maxRetries) {
          item.status = 'failed';
          this.emit('failed', { item, error });
        } else {
          item.status = 'pending';
          // Exponential backoff
          await new Promise(r => setTimeout(r, this.retryDelay * Math.pow(2, item.retries)));
        }
      }
    }

    // Remove completed items
    this.queue = this.queue.filter(i => i.status !== 'completed');
    await this.saveQueue();
  }

  async saveQueue() {
    return new Promise((resolve) => {
      const request = indexedDB.open('OfflineQueue', 1);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = (e) => {
        const db = e.target.result;
        const transaction = db.transaction(['queue'], 'readwrite');
        const store = transaction.objectStore('queue');
        
        // Clear and re-add all items
        store.clear();
        this.queue.forEach(item => store.put(item));
        
        transaction.oncomplete = resolve;
      };
      
      request.onerror = () => resolve();
    });
  }

  async loadQueue() {
    return new Promise((resolve) => {
      const request = indexedDB.open('OfflineQueue', 1);
      
      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('queue')) {
          db.createObjectStore('queue', { keyPath: 'id' });
        }
      };
      
      request.onsuccess = (e) => {
        const db = e.target.result;
        const transaction = db.transaction(['queue'], 'readonly');
        const store = transaction.objectStore('queue');
        const getAll = store.getAll();
        
        getAll.onsuccess = () => {
          this.queue = getAll.result || [];
          resolve();
        };
        
        getAll.onerror = () => resolve();
      };
      
      request.onerror = () => resolve();
    });
  }

  handleSyncComplete(data) {
    const item = this.queue.find(i => i.id === data.id);
    if (item) {
      item.status = 'completed';
      this.emit('completed', item);
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    this.listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}

// Singleton instances
let syncManager = null;
let fetchManager = null;
let prefetcher = null;
let offlineQueue = null;

export function getBackgroundSyncManager() {
  if (!syncManager) syncManager = new BackgroundSyncManager();
  return syncManager;
}

export function getBackgroundFetchManager() {
  if (!fetchManager) fetchManager = new BackgroundFetchManager();
  return fetchManager;
}

export function getPredictivePrefetcher() {
  if (!prefetcher) prefetcher = new PredictivePrefetcher();
  return prefetcher;
}

export function getOfflineQueue() {
  if (!offlineQueue) offlineQueue = new OfflineQueue();
  return offlineQueue;
}

// Utility exports
export async function schedulePeriodicSync(tag, interval) {
  return getBackgroundSyncManager().registerPeriodicSync(tag, interval);
}

export async function queueOfflineAction(action) {
  return getOfflineQueue().enqueue(action);
}

export async function prefetchTools(toolIds) {
  const prefetcher = getPredictivePrefetcher();
  for (const toolId of toolIds) {
    await prefetcher.prefetchTool(toolId);
  }
}

export function recordToolUsage(toolId, metadata) {
  getPredictivePrefetcher().recordToolUsage(toolId, metadata);
}
