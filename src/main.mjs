/**
 * ZeroTools Platform - Main Entry
 * Phase 6: Elite Performance & Experience Layer
 */

import { initAnalytics } from './core/analytics.mjs';
import { registerSW } from './core/pwa.mjs';
import { initAdSense } from './core/ads/index.mjs';
import { injectHreflangTags } from './i18n/config.mjs';
import { initCommonUI } from './components/layout/index.mjs';

// Phase 6: Native OS Integration
import { registerAsFileHandler, isFileSystemAccessSupported } from './core/native/file-system-api.mjs';
import { initWebShareTarget } from './core/native/web-share-target.mjs';
import { initOfflineQueue, isBackgroundSyncSupported } from './core/native/background-sync.mjs';
import { registerProtocolHandlers, handleProtocolUrl, isProtocolHandlerSupported } from './core/native/protocol-handlers.mjs';

// Phase 6: AI Intelligence
import { trackToolUsage } from './core/ai/recommendation-engine.mjs';

// Global error handlers
window.onerror = (message, source, lineno, colno, error) => {
  console.error('Global error:', { message, source, lineno, colno, error });
  return false;
};

window.onunhandledrejection = (event) => {
  console.error('Unhandled rejection:', event.reason);
  event.preventDefault();
};

/**
 * Initialize the application
 */
async function init() {
  // Core services
  if ('serviceWorker' in navigator) {
    registerSW();
  }
  
  initAnalytics();
  initAdSense();
  injectHreflangTags(window.location.pathname);
  
  // Phase 6: Initialize native features
  initNativeFeatures();
  
  // UI
  initCommonUI();
  initMobileMenu();
  initToolPreviews();
  handleLegacyRedirects();
  
  // Track for AI recommendations
  trackCurrentTool();
}

/**
 * Initialize Phase 6 native OS features
 */
async function initNativeFeatures() {
  // File System Access API
  if (isFileSystemAccessSupported()) {
    registerAsFileHandler();
    console.log('[Phase 6] File System Access API ready');
  }
  
  // Web Share Target
  initWebShareTarget();
  
  // Background Sync
  if (isBackgroundSyncSupported()) {
    await initOfflineQueue();
    console.log('[Phase 6] Background Sync ready');
  }
  
  // Protocol Handlers
  if (isProtocolHandlerSupported()) {
    registerProtocolHandlers();
    handleProtocolUrl();
    console.log('[Phase 6] Protocol Handlers registered');
  }
  
  // Listen for file system open events
  window.addEventListener('file-system-open', handleFileSystemOpen);
  window.addEventListener('web-share-received', handleWebShareReceived);
}

function handleFileSystemOpen(event) {
  const { file, type } = event.detail;
  console.log('[File System] Opened:', file.name, type);
  
  // Route to appropriate tool based on file type
  if (type === 'application/pdf') {
    // Auto-route to PDF tools
    const tool = detectBestPDFTool(file);
    console.log('[AI] Suggested tool:', tool);
  }
}

function handleWebShareReceived(event) {
  const { file, type } = event.detail;
  console.log('[Web Share] Received:', file.name);
  
  // Store in session for tool to pick up
  sessionStorage.setItem('shared-file', JSON.stringify({
    name: file.name,
    type: file.type,
    size: file.size
  }));
}

function detectBestPDFTool(file) {
  // Simple heuristic based on file size
  if (file.size > 5 * 1024 * 1024) {
    return 'pdf/compress'; // Large file, suggest compression
  }
  return 'pdf/merge';
}

function trackCurrentTool() {
  const path = window.location.pathname;
  const toolMatch = path.match(/\/src\/tools\/(.+)\//);
  if (toolMatch) {
    trackToolUsage(toolMatch[1]);
  }
}

function initMobileMenu() {
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  
  if (!btn || !menu) return;
  
  btn.addEventListener('click', () => {
    const isExpanded = btn.getAttribute('aria-expanded') === 'true';
    btn.setAttribute('aria-expanded', !isExpanded);
    menu.hidden = isExpanded;
    menu.classList.toggle('hidden', isExpanded);
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && btn.getAttribute('aria-expanded') === 'true') {
      btn.click();
    }
  });
}

function initToolPreviews() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadToolPreview(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { rootMargin: '100px' });
  
  document.querySelectorAll('[data-tool]').forEach(card => observer.observe(card));
}

async function loadToolPreview(card) {
  const toolId = card.dataset.tool;
  if (!toolId) return;
  
  try {
    const response = await fetch(`/meta/${toolId}.json`);
    if (!response.ok) return;
    
    const meta = await response.json();
    const descEl = card.querySelector('.tool-description');
    if (descEl && meta.description?.tr) {
      descEl.textContent = meta.description.tr;
    }
  } catch {}
}

function handleLegacyRedirects() {
  const redirects = {
    '/pdf-birlestirme': '/src/tools/pdf/merge/',
    '/kredi-hesaplama': '/src/tools/finance/mortgage-tr/',
    '/mortgage-calculator': '/src/tools/finance/mortgage-tr/'
  };
  
  const redirect = redirects[window.location.pathname];
  if (redirect) {
    window.location.replace(redirect);
  }
}

// Initialize
document.readyState === 'loading' 
  ? document.addEventListener('DOMContentLoaded', init)
  : init();

// Expose API for tools
window.ZeroTools = {
  version: __APP_VERSION__,
  native: {
    fileSystemSupported: isFileSystemAccessSupported(),
    backgroundSyncSupported: isBackgroundSyncSupported(),
    protocolHandlerSupported: isProtocolHandlerSupported()
  }
};
