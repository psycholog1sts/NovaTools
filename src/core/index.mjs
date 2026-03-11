/**
 * Zero Tools Platform - Core Module Exports
 * All advanced features from Phase 7: The Singularity Tier
 */

// Edge Compute & Personalization
export {
  // Edge middleware handled by Vercel
  // Geo-suggestions and ESI available via API routes
} from './edge/index.mjs';

// WebGPU Acceleration
export {
  getWebGPUEngine,
  computeHistogram,
  monteCarlo,
  batchProcess,
  resetWebGPUEngine
} from './compute/webgpu-engine.mjs';

// CRDT Multi-Device Sync
export {
  SyncManager,
  getSyncManager,
  syncField,
  getSyncedField,
  subscribeToTool,
  exportToolState,
  importToolState
} from './sync/crdt-engine.mjs';

// WebRTC P2P Collaboration
export {
  CollaborationSession,
  PresenceCursors,
  MSG_TYPES,
  createCollaborationSession,
  getCurrentSession,
  joinCollaboration
} from './p2p/collaboration.mjs';

// Federated Learning
export {
  FederatedLearning,
  ToolRecommender,
  AnomalyDetector,
  getToolRecommender,
  getAnomalyDetector,
  recommendTools,
  checkAnomaly,
  recordToolUsage
} from './ai/federated/learning-engine.mjs';

// Advanced Compression
export {
  FastCompressor,
  WebCodecsOptimizer,
  PDFCompressor,
  StreamingCompressor,
  getStreamingCompressor,
  optimizeImage,
  compressPDF,
  compressStream,
  isWebCodecsSupported
} from './codec/compression.mjs';

// Post-Quantum Cryptography
export {
  SimpleKEM,
  SimpleHashSignature,
  ZKRangeProof,
  SecureFileEncryption,
  CodeSigner,
  ZKAgeVerification,
  generateEncryptionKeypair,
  encryptFile,
  decryptFile,
  proveAge,
  verifyAgeProof
} from './crypto/pq-crypto.mjs';

// Hardware Integration
export {
  HIDManager,
  SerialManager,
  OrientationManager,
  Haptics,
  getHIDManager,
  getSerialManager,
  getOrientationManager,
  getHaptics,
  scanBarcode,
  connectArduino,
  vibrate,
  startGestureTracking
} from './hardware/device-integration.mjs';

// Service Worker Intelligence
export {
  BackgroundSyncManager,
  BackgroundFetchManager,
  PredictivePrefetcher,
  OfflineQueue,
  getBackgroundSyncManager,
  getBackgroundFetchManager,
  getPredictivePrefetcher,
  getOfflineQueue,
  schedulePeriodicSync,
  queueOfflineAction,
  prefetchTools,
  recordToolUsage as recordPrefetchUsage
} from './sw-intelligence/background-sync.mjs';

// WebAuthn / Passwordless Auth
export {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  registerCredential,
  authenticate,
  WebAuthnManager,
  PasswordlessAuth,
  getWebAuthnManager,
  getPasswordlessAuth,
  setupBiometricAuth,
  loginWithBiometric,
  checkBiometricSupport,
  setupConditionalUI
} from './auth/webauthn.mjs';

// Monetization
export {
  HeaderBiddingAuction,
  AdRefreshManager,
  LazyAdLoader,
  getHeaderBiddingAuction,
  getAdRefreshManager,
  getLazyAdLoader,
  runAdAuction,
  startAdRefresh,
  initLazyAds,
  getAdMetrics
} from './monetization/header-bidding.mjs';

// Self-Healing & Optimization
export {
  PerformanceMonitor,
  SelfHealingSystem,
  AdaptiveQualityManager,
  getSelfHealingSystem,
  getAdaptiveQualityManager,
  initSelfHealing,
  optimizeForDevice,
  getHealthReport,
  getOptimalSettings
} from './optimization/self-healing.mjs';

// Core utilities (re-export from existing)
export {
  formatBytes,
  generateId,
  trackEvent,
  preventDefaults,
  getOS
} from './utils/index.mjs';

// File System API (re-export from existing)
export {
  openPDFFile,
  saveToOriginalLocation
} from './native/file-system-api.mjs';

// Background Sync (re-export from existing)
export {
  queueOperation,
  processQueue
} from './native/background-sync.mjs';

// AI Features (re-export from existing)
export {
  validateWithSmartSuggestions,
  suggestCorrection
} from './ai/smart-validation.mjs';

export {
  getRecommendations
} from './ai/recommendation-engine.mjs';

// Workflow Pipeline (re-export from existing)
export {
  createPipeline
} from './workflow/pipeline.mjs';

/**
 * Initialize all Phase 7 systems
 */
export async function initPhase7Systems() {
  const results = {
    webgpu: false,
    sync: false,
    p2p: false,
    federated: false,
    hardware: false,
    swIntelligence: false,
    webauthn: false,
    optimization: false
  };

  try {
    // Initialize WebGPU
    const { getWebGPUEngine } = await import('./compute/webgpu-engine.mjs');
    const gpu = await getWebGPUEngine();
    results.webgpu = gpu.isAvailable();
  } catch (e) {
    console.warn('WebGPU init failed:', e);
  }

  try {
    // Initialize Sync Manager
    const { getSyncManager } = await import('./sync/crdt-engine.mjs');
    getSyncManager();
    results.sync = true;
  } catch (e) {
    console.warn('Sync init failed:', e);
  }

  try {
    // Initialize Federated Learning
    const { getToolRecommender, getAnomalyDetector } = await import('./ai/federated/learning-engine.mjs');
    await getToolRecommender().init();
    await getAnomalyDetector().init();
    results.federated = true;
  } catch (e) {
    console.warn('Federated learning init failed:', e);
  }

  try {
    // Initialize SW Intelligence
    const { getOfflineQueue } = await import('./sw-intelligence/background-sync.mjs');
    await getOfflineQueue().init();
    results.swIntelligence = true;
  } catch (e) {
    console.warn('SW intelligence init failed:', e);
  }

  try {
    // Initialize Self-Healing
    const { initSelfHealing } = await import('./optimization/self-healing.mjs');
    initSelfHealing();
    results.optimization = true;
  } catch (e) {
    console.warn('Self-healing init failed:', e);
  }

  try {
    // Detect hardware capabilities
    const { getOrientationManager } = await import('./hardware/device-integration.mjs');
    const om = getOrientationManager();
    results.hardware = {
      hid: 'hid' in navigator,
      serial: 'serial' in navigator,
      orientation: om.isSupported(),
      vibration: 'vibrate' in navigator
    };
  } catch (e) {
    console.warn('Hardware detection failed:', e);
  }

  try {
    // Check WebAuthn
    const { isWebAuthnSupported, isPlatformAuthenticatorAvailable } = await import('./auth/webauthn.mjs');
    results.webauthn = {
      supported: isWebAuthnSupported(),
      platform: await isPlatformAuthenticatorAvailable()
    };
  } catch (e) {
    console.warn('WebAuthn detection failed:', e);
  }

  console.log('[Phase 7] System initialization complete:', results);
  return results;
}

/**
 * Get comprehensive platform capabilities
 */
export async function getPlatformCapabilities() {
  return {
    // Browser APIs
    apis: {
      webgpu: 'gpu' in navigator,
      webcodecs: typeof VideoEncoder !== 'undefined',
      webtransport: 'WebTransport' in window,
      webassembly: typeof WebAssembly !== 'undefined',
      fileSystem: 'showOpenFilePicker' in window,
      backgroundSync: 'sync' in (navigator.serviceWorker || {}),
      periodicSync: 'periodicSync' in (navigator.serviceWorker || {}),
      backgroundFetch: 'backgroundFetch' in (navigator.serviceWorker || {}),
      webauthn: 'PublicKeyCredential' in window,
      hid: 'hid' in navigator,
      serial: 'serial' in navigator,
      bluetooth: 'bluetooth' in navigator,
      usb: 'usb' in navigator,
      webShare: 'share' in navigator,
      contacts: 'contacts' in navigator && 'ContactsManager' in window,
      webNfc: 'NDEFReader' in window,
      webSerial: 'serial' in navigator,
      deviceOrientation: 'DeviceOrientationEvent' in window,
      webVibration: 'vibrate' in navigator
    },
    
    // Device capabilities
    device: {
      memory: navigator.deviceMemory,
      cores: navigator.hardwareConcurrency,
      touch: 'ontouchstart' in window,
      connection: navigator.connection ? {
        effectiveType: navigator.connection.effectiveType,
        downlink: navigator.connection.downlink,
        rtt: navigator.connection.rtt,
        saveData: navigator.connection.saveData
      } : null,
      screen: {
        width: screen.width,
        height: screen.height,
        dpr: window.devicePixelRatio,
        colorDepth: screen.colorDepth
      }
    },
    
    // Feature detection
    features: {
      crypto: typeof crypto !== 'undefined' && crypto.subtle,
      indexedDB: 'indexedDB' in window,
      broadcastChannel: 'BroadcastChannel' in window,
      offscreenCanvas: typeof OffscreenCanvas !== 'undefined',
      sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined',
      bigInt: typeof BigInt !== 'undefined',
      proxy: typeof Proxy !== 'undefined',
      weakRef: typeof WeakRef !== 'undefined',
      finalizationRegistry: typeof FinalizationRegistry !== 'undefined'
    }
  };
}
