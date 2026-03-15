/**
 * Self-Healing & Autonomous Optimization
 * Automatic error recovery, performance monitoring, and adaptive optimization
 */

// Performance Budget Monitor
export class PerformanceMonitor {
  constructor() {
    this.metrics = new Map();
    this.budgets = {
      FCP: 1200,    // First Contentful Paint: 1.2s
      LCP: 2500,    // Largest Contentful Paint: 2.5s
      FID: 100,     // First Input Delay: 100ms
      CLS: 0.1,     // Cumulative Layout Shift: 0.1
      TTFB: 600,    // Time to First Byte: 600ms
      INP: 200      // Interaction to Next Paint: 200ms
    };
    this.listeners = new Map();
    this.violations = [];
  }

  /**
   * Initialize performance monitoring
   */
  init() {
    // Core Web Vitals
    this.observeFCP();
    this.observeLCP();
    this.observeCLS();
    this.observeINP();
    this.observeTTFB();

    // Long tasks
    this.observeLongTasks();

    // Resource timing
    this.observeResources();

    // Frame rate
    this.monitorFrameRate();
  }

  observeFCP() {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('FCP', entry.startTime);
      }
    }).observe({ entryTypes: ['paint'] });
  }

  observeLCP() {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('LCP', lastEntry.startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });
  }

  observeCLS() {
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      }
      this.recordMetric('CLS', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }

  observeINP() {
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      if (lastEntry.duration > 0) {
        this.recordMetric('INP', lastEntry.duration);
      }
    }).observe({ entryTypes: ['event'], buffered: true });
  }

  observeTTFB() {
    const navigation = performance.getEntriesByType('navigation')[0];
    if (navigation) {
      this.recordMetric('TTFB', navigation.responseStart - navigation.startTime);
    }
  }

  observeLongTasks() {
    if (!('PerformanceLongTaskTiming' in window)) return;

    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.recordMetric('LongTask', entry.duration);
        
        // Log for debugging
        console.warn('[SelfHealing] Long task detected:', entry.duration, 'ms');
        
        // Trigger optimization if too many long tasks
        if (entry.duration > 100) {
          this.emit('long-task', entry);
        }
      }
    }).observe({ entryTypes: ['longtask'] });
  }

  observeResources() {
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.responseStatus >= 400) {
          this.emit('resource-error', {
            url: entry.name,
            status: entry.responseStatus,
            type: entry.initiatorType
          });
        }

        // Large resources warning
        if (entry.transferSize > 1000000) { // 1MB
          console.warn('[SelfHealing] Large resource:', entry.name, 
            `${(entry.transferSize / 1024 / 1024).toFixed(2)  }MB`);
        }
      }
    }).observe({ entryTypes: ['resource'] });
  }

  monitorFrameRate() {
    let lastTime = performance.now();
    let frames = 0;
    let droppedFrames = 0;

    const measure = () => {
      const now = performance.now();
      frames++;

      if (now - lastTime >= 1000) {
        const fps = frames;
        this.recordMetric('FPS', fps);

        if (fps < 30) {
          droppedFrames++;
          if (droppedFrames > 3) {
            this.emit('low-fps', { fps });
            droppedFrames = 0;
          }
        }

        frames = 0;
        lastTime = now;
      }

      requestAnimationFrame(measure);
    };

    requestAnimationFrame(measure);
  }

  recordMetric(name, value) {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    
    const history = this.metrics.get(name);
    history.push({ value, timestamp: Date.now() });
    
    // Keep last 100 measurements
    if (history.length > 100) {
      history.shift();
    }

    // Check budget violation
    if (this.budgets[name] && value > this.budgets[name]) {
      this.violations.push({ metric: name, value, budget: this.budgets[name] });
      this.emit('budget-violation', { metric: name, value, budget: this.budgets[name] });
    }
  }

  getMetrics() {
    const result = {};
    for (const [name, history] of this.metrics) {
      if (history.length > 0) {
        const values = history.map(h => h.value);
        result[name] = {
          current: values[values.length - 1],
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          budget: this.budgets[name]
        };
      }
    }
    return result;
  }

  getViolations() {
    return this.violations;
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

// Self-Healing System
export class SelfHealingSystem {
  constructor() {
    this.monitor = new PerformanceMonitor();
    this.optimizations = new Map();
    this.errorCount = new Map();
    this.recoveryAttempts = new Map();
    this.maxRecoveryAttempts = 3;
  }

  init() {
    this.monitor.init();
    
    // Setup automatic recovery handlers
    this.setupErrorRecovery();
    this.setupPerformanceRecovery();
    this.setupResourceRecovery();

    // Global error handler
    window.addEventListener('error', (e) => this.handleError(e));
    window.addEventListener('unhandledrejection', (e) => this.handleRejection(e));
  }

  setupErrorRecovery() {
    // Monitor for common errors and auto-fix
    this.monitor.on('resource-error', (error) => {
      this.attemptResourceRecovery(error);
    });
  }

  setupPerformanceRecovery() {
    this.monitor.on('long-task', () => {
      this.optimizeForResponsiveness();
    });

    this.monitor.on('low-fps', () => {
      this.optimizeForFrameRate();
    });

    this.monitor.on('budget-violation', (violation) => {
      this.handleBudgetViolation(violation);
    });
  }

  setupResourceRecovery() {
    // Override fetch to add retry logic
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const url = args[0];
      const maxRetries = 3;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          const response = await originalFetch.apply(window, args);
          if (response.ok) return response;
          
          // Retry on server errors
          if (response.status >= 500 && i < maxRetries - 1) {
            await this.delay(Math.pow(2, i) * 1000);
            continue;
          }
          
          return response;
        } catch (error) {
          if (i === maxRetries - 1) throw error;
          await this.delay(Math.pow(2, i) * 1000);
        }
      }
    };
  }

  handleError(event) {
    const error = event.error || event.message;
    const stack = event.error?.stack;

    // Categorize error
    const category = this.categorizeError(error, stack);
    
    // Track error count
    this.errorCount.set(category, (this.errorCount.get(category) || 0) + 1);

    // Attempt recovery if threshold reached
    if (this.errorCount.get(category) >= 3) {
      this.attemptErrorRecovery(category, error);
    }
  }

  handleRejection(event) {
    console.warn('[SelfHealing] Unhandled promise rejection:', event.reason);
    
    // Attempt recovery for known patterns
    if (event.reason?.message?.includes('chunk')) {
      this.attemptChunkRecovery();
    }
  }

  categorizeError(error, stack) {
    const errorStr = String(error);
    
    if (errorStr.includes('ChunkLoadError') || errorStr.includes('Loading chunk')) {
      return 'chunk-load';
    }
    if (errorStr.includes('Memory')) {
      return 'memory';
    }
    if (errorStr.includes('Network') || errorStr.includes('fetch')) {
      return 'network';
    }
    if (stack?.includes('pdf')) {
      return 'pdf-processing';
    }
    
    return 'generic';
  }

  attemptChunkRecovery() {
    console.log('[SelfHealing] Attempting chunk recovery...');
    
    // Clear module cache and reload
    if (window.__vite_reload) {
      window.__vite_reload();
    } else {
      // Force reload without cache
      location.reload();
    }
  }

  attemptResourceRecovery(error) {
    console.log('[SelfHealing] Attempting resource recovery for:', error.url);
    
    // Try loading from alternative source
    if (error.url.includes('cdn')) {
      const fallbackUrl = error.url.replace('cdn.', 'backup.');
      
      // Preload fallback
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = fallbackUrl;
      document.head.appendChild(link);
    }
  }

  attemptErrorRecovery(category, error) {
    const attempts = this.recoveryAttempts.get(category) || 0;
    
    if (attempts >= this.maxRecoveryAttempts) {
      console.error('[SelfHealing] Max recovery attempts reached for:', category);
      return;
    }

    this.recoveryAttempts.set(category, attempts + 1);

    switch (category) {
      case 'memory':
        this.optimizeMemoryUsage();
        break;
      case 'pdf-processing':
        this.optimizePDFProcessing();
        break;
      case 'network':
        this.enableOfflineMode();
        break;
    }
  }

  optimizeForResponsiveness() {
    console.log('[SelfHealing] Optimizing for responsiveness...');
    
    // Reduce concurrent operations
    if (window.Worker) {
      // Limit worker pool
      if (window.__workerPool) {
        window.__workerPool.setMaxConcurrency(2);
      }
    }

    // Defer non-critical operations
    this.deferNonCritical();
  }

  optimizeForFrameRate() {
    console.log('[SelfHealing] Optimizing for frame rate...');
    
    // Disable animations
    document.documentElement.classList.add('reduce-motion');
    
    // Throttle heavy operations
    this.throttleHeavyOperations();
  }

  handleBudgetViolation(violation) {
    console.warn('[SelfHealing] Budget violation:', violation);
    
    switch (violation.metric) {
      case 'LCP':
        this.optimizeLCP();
        break;
      case 'CLS':
        this.optimizeCLS();
        break;
      case 'INP':
        this.optimizeINP();
        break;
    }
  }

  optimizeLCP() {
    // Lazy load below-fold images
    document.querySelectorAll('img:not([loading])').forEach(img => {
      if (!img.isConnected) return;
      const rect = img.getBoundingClientRect();
      if (rect.top > window.innerHeight) {
        img.loading = 'lazy';
      }
    });

    // Preload critical resources
    const criticalResources = [
      '/src/core/workers/pdf-worker.mjs'
    ];
    
    criticalResources.forEach(url => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      link.as = 'script';
      document.head.appendChild(link);
    });
  }

  optimizeCLS() {
    // Reserve space for dynamic content
    document.querySelectorAll('[data-dynamic]').forEach(el => {
      if (!el.style.minHeight) {
        el.style.minHeight = `${el.offsetHeight  }px`;
      }
    });

    // Disable font swapping
    document.fonts.ready.then(() => {
      document.documentElement.classList.add('fonts-loaded');
    });
  }

  optimizeINP() {
    // Add interaction feedback immediately
    document.querySelectorAll('button, a').forEach(el => {
      el.addEventListener('click', () => {
        el.style.transform = 'scale(0.98)';
        requestAnimationFrame(() => {
          el.style.transform = '';
        });
      }, { passive: true });
    });
  }

  optimizeMemoryUsage() {
    console.log('[SelfHealing] Optimizing memory usage...');
    
    // Clear object URLs
    if (window.__objectURLs) {
      window.__objectURLs.forEach(url => URL.revokeObjectURL(url));
      window.__objectURLs.clear();
    }

    // Release Web Workers
    if (window.__workerPool) {
      window.__workerPool.terminateIdle(5000);
    }

    // Trigger garbage collection hint
    if (window.gc) {
      window.gc();
    }
  }

  optimizePDFProcessing() {
    console.log('[SelfHealing] Optimizing PDF processing...');
    
    // Reduce chunk size
    window.__PDF_CHUNK_SIZE = 25; // Half the default
    
    // Enable streaming mode
    window.__PDF_STREAMING = true;
  }

  enableOfflineMode() {
    console.log('[SelfHealing] Enabling offline mode...');
    
    // Use cached assets only
    document.documentElement.classList.add('offline-mode');
  }

  deferNonCritical() {
    // Defer analytics
    if (window.umami) {
      window.umami.track = () => {}; // No-op
    }
  }

  throttleHeavyOperations() {
    // Throttle resize observers
    if (window.__resizeObservers) {
      window.__resizeObservers.forEach(ro => ro.disconnect());
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getHealthReport() {
    return {
      metrics: this.monitor.getMetrics(),
      violations: this.monitor.getViolations(),
      errorCounts: Object.fromEntries(this.errorCount),
      recoveryAttempts: Object.fromEntries(this.recoveryAttempts),
      optimizations: Array.from(this.optimizations.keys())
    };
  }
}

// Adaptive Quality Manager
export class AdaptiveQualityManager {
  constructor() {
    this.qualityLevel = 'high';
    this.deviceTier = this.detectDeviceTier();
    this.networkQuality = 'good';
  }

  detectDeviceTier() {
    const memory = navigator.deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 4;
    
    if (memory >= 8 && cores >= 8) return 'high';
    if (memory >= 4 && cores >= 4) return 'medium';
    return 'low';
  }

  async detectNetworkQuality() {
    if ('connection' in navigator) {
      const conn = navigator.connection;
      
      if (conn.effectiveType === '4g' && !conn.saveData) {
        this.networkQuality = 'good';
      } else if (conn.effectiveType === '3g') {
        this.networkQuality = 'medium';
      } else {
        this.networkQuality = 'poor';
      }
    }
    
    // Test actual speed
    const startTime = performance.now();
    try {
      await fetch(`/api/ping?t=${  Date.now()}`, { cache: 'no-store' });
      const latency = performance.now() - startTime;
      
      if (latency > 500) this.networkQuality = 'poor';
      else if (latency > 200) this.networkQuality = 'medium';
    } catch (e) {
      this.networkQuality = 'poor';
    }
  }

  getOptimalSettings() {
    const settings = {
      imageQuality: 0.85,
      enableAnimations: true,
      enableWebWorkers: true,
      chunkSize: 50,
      maxConcurrentWorkers: 4,
      enablePrefetch: true
    };

    // Adjust based on device tier
    if (this.deviceTier === 'low') {
      settings.imageQuality = 0.7;
      settings.enableAnimations = false;
      settings.maxConcurrentWorkers = 2;
      settings.chunkSize = 25;
    }

    // Adjust based on network
    if (this.networkQuality === 'poor') {
      settings.enablePrefetch = false;
      settings.imageQuality = 0.6;
    } else if (this.networkQuality === 'medium') {
      settings.imageQuality = 0.75;
    }

    return settings;
  }

  applySettings() {
    const settings = this.getOptimalSettings();
    
    // Apply CSS for animations
    if (!settings.enableAnimations) {
      document.documentElement.classList.add('reduce-motion');
    }

    // Store for other modules
    window.__adaptiveSettings = settings;

    return settings;
  }
}

// Singleton instances
let selfHealing = null;
let adaptiveQuality = null;

export function getSelfHealingSystem() {
  if (!selfHealing) {
    selfHealing = new SelfHealingSystem();
    selfHealing.init();
  }
  return selfHealing;
}

export function getAdaptiveQualityManager() {
  if (!adaptiveQuality) {
    adaptiveQuality = new AdaptiveQualityManager();
  }
  return adaptiveQuality;
}

// Utility exports
export function initSelfHealing() {
  return getSelfHealingSystem();
}

export async function optimizeForDevice() {
  const manager = getAdaptiveQualityManager();
  await manager.detectNetworkQuality();
  return manager.applySettings();
}

export function getHealthReport() {
  return getSelfHealingSystem().getHealthReport();
}

export function getOptimalSettings() {
  return getAdaptiveQualityManager().getOptimalSettings();
}
