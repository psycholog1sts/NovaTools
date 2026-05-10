/**
 * NovaTools MC - Main Entry Point
 * Production-grade modular architecture with Vercel Speed Insights
 */

/* global __APP_VERSION__ */

import { injectSpeedInsights } from '@vercel/speed-insights';
import { initAnalytics } from './js/analytics.js';
import { registerSW } from './core/pwa.mjs';
import { initAdSense } from './core/ads/index.mjs';
import { initConsentManager, hasConsent } from './core/consent-manager.mjs';
import { injectHreflangTags } from './i18n/config.mjs';
import { initCommonUI } from './components/layout/index.mjs';

// Initialize Vercel Speed Insights immediately
injectSpeedInsights();

// Configuration
const PDF_TOOL_THRESHOLDS = {
  COMPRESS: 5 * 1024 * 1024 // 5MB
};

// Global error handling
function setupErrorHandlers() {
  window.onerror = (message, source, lineno, colno, error) => {
    console.error('[NovaTools] Global error:', { message, source, lineno, colno, error });
    return false;
  };

  window.onunhandledrejection = (event) => {
    console.error('[NovaTools] Unhandled rejection:', event.reason);
    event.preventDefault();
  };
}

/**
 * Detect best PDF tool based on file characteristics
 * @param {File} file - PDF file
 * @returns {string} Tool path
 */
export function detectBestPDFTool(file) {
  if (file?.size > PDF_TOOL_THRESHOLDS.COMPRESS) {
    return 'pdf/compress';
  }
  return 'pdf/merge';
}

/**
 * Extract tool ID from current path
 * @returns {string|null}
 */
export function getCurrentToolId() {
  const match = window.location.pathname.match(/\/(?:src\/)?tools\/(.+?)\/?$/);
  return match?.[1] || null;
}

function isToolPage() {
  return getCurrentToolId() !== null;
}

/**
 * Track current tool usage for AI recommendations
 */
async function trackCurrentTool() {
  const toolId = getCurrentToolId();
  if (!toolId) return;

  const { trackToolUsage } = await import('./core/ai/recommendation-engine.mjs');
  trackToolUsage(toolId);
}

/**
 * File system event handlers
 */
const fileSystemHandlers = {
  open(event) {
    const { file, type } = event.detail;
    // File system opened: file?.name, type
    
    if (type === 'application/pdf') {
      const _tool = detectBestPDFTool(file);
      void _tool; // Suggested tool for AI processing
    }
  },

  shareReceived(event) {
    const { file } = event.detail;
    // Web share received: file?.name
    
    sessionStorage.setItem('shared-file', JSON.stringify({
      name: file?.name,
      type: file?.type,
      size: file?.size
    }));
  }
};

/**
 * Initialize native OS features
 */
async function initNativeFeatures() {
  const [fileSystemApi, webShareTarget, backgroundSync, protocolHandlers] = await Promise.all([
    import('./core/native/file-system-api.mjs'),
    import('./core/native/web-share-target.mjs'),
    import('./core/native/background-sync.mjs'),
    import('./core/native/protocol-handlers.mjs')
  ]);

  const features = [
    {
      name: 'File System Access',
      supported: fileSystemApi.isFileSystemAccessSupported(),
      init: fileSystemApi.registerAsFileHandler
    },
    {
      name: 'Web Share Target',
      supported: true,
      init: webShareTarget.initWebShareTarget
    },
    {
      name: 'Background Sync',
      supported: backgroundSync.isBackgroundSyncSupported(),
      init: backgroundSync.initOfflineQueue
    },
    {
      name: 'Protocol Handlers',
      supported: protocolHandlers.isProtocolHandlerSupported(),
      init: () => {
        protocolHandlers.registerProtocolHandlers();
        protocolHandlers.handleProtocolUrl();
      }
    }
  ];

  for (const feature of features) {
    if (feature.supported) {
      try {
        await feature.init();
        // Native feature ready: feature.name
      } catch (err) {
        console.warn(`[Native] ${feature.name} failed:`, err);
      }
    }
  }

  // Event listeners
  window.addEventListener('file-system-open', fileSystemHandlers.open);
  window.addEventListener('web-share-received', fileSystemHandlers.shareReceived);
}

/**
 * Mobile menu toggle functionality
 */
function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  
  if (!btn || !menu) return;

  const toggle = () => {
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', String(!isExpanded));
    menu.hidden = isExpanded;
    menu.classList.toggle('hidden', isExpanded);
  };

  const closeOnEscape = (e) => {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
      toggle();
    }
  };

  btn.addEventListener('click', toggle);
  document.addEventListener('keydown', closeOnEscape);
}

/**
 * Lazy load tool previews
 */
function initToolPreviews() {
  const cards = document.querySelectorAll('[data-tool]');
  if (cards.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadToolPreview(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '100px' });

  cards.forEach(card => observer.observe(card));
}

/**
 * Load preview data for a tool card
 * @param {HTMLElement} card 
 */
async function loadToolPreview(card) {
  const toolId = card.dataset.tool;
  if (!toolId) return;

  try {
    const response = await fetch(`/meta/${toolId}.json`);
    if (!response.ok) return;

    const meta = await response.json();
    const descEl = card.querySelector('.tool-description');
    if (descEl && meta.description?.en) {
      descEl.textContent = meta.description.en;
    }
  } catch {
    // Silently fail - preview is non-critical
  }
}

/**
 * Main initialization
 */
async function init() {
  setupErrorHandlers();
  let analyticsStarted = false;
  const startAnalyticsAfterConsent = () => {
    if (analyticsStarted || !hasConsent('analytics')) return;
    analyticsStarted = true;
    initAnalytics();
  };
  window.addEventListener('novatools:consent-updated', startAnalyticsAfterConsent);
  
  initConsentManager();

  // Core services
  if ('serviceWorker' in navigator) {
    registerSW();
  }

  // Initialize features in parallel
  await Promise.all([
    hasConsent('analytics') ? (analyticsStarted = true, initAnalytics()) : Promise.resolve(),
    initAdSense(),
    isToolPage() ? initNativeFeatures() : Promise.resolve()
  ]);

  injectHreflangTags(window.location.pathname);
  initCommonUI();
  initMobileMenu();
  initToolPreviews();
  await trackCurrentTool();
  
  // NovaTools initialization complete
}

// Initialize on DOM ready
document.readyState === 'loading' 
  ? document.addEventListener('DOMContentLoaded', init)
  : init();

// Public API
window.NovaTools = {
  version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '2.0.0',
  native: {
    fileSystemSupported: 'showOpenFilePicker' in window,
    backgroundSyncSupported: 'serviceWorker' in navigator && 'SyncManager' in window,
    protocolHandlerSupported: 'registerProtocolHandler' in navigator
  },
  utils: {
    detectBestPDFTool,
    getCurrentToolId
  }
};
