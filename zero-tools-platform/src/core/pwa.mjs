/**
 * PWA Service Worker Registration
 * Offline-first caching strategy
 */

const SW_PATH = '/sw.js';

/**
 * Register service worker
 */
export async function registerSW() {
  try {
    const registration = await navigator.serviceWorker.register(SW_PATH, {
      scope: '/',
      updateViaCache: 'imports'
    });
    
    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New version available
          showUpdateNotification();
        }
      });
    });
    
    // Check for updates periodically
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000); // Every hour
    
  } catch (error) {
    console.warn('SW registration failed:', error);
  }
}

/**
 * Show update available notification
 */
function showUpdateNotification() {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = 'fixed top-4 right-4 bg-primary-600 text-white px-6 py-4 rounded-lg shadow-lg z-50 flex items-center gap-4';
  notification.innerHTML = `
    <span>Yeni sürüm mevcut!</span>
    <button id="sw-update-btn" class="bg-white text-primary-600 px-3 py-1 rounded font-medium hover:bg-gray-100 transition-colors">
      Yenile
    </button>
    <button id="sw-dismiss-btn" class="text-white/80 hover:text-white" aria-label="Kapat">
      <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/>
      </svg>
    </button>
  `;
  
  document.body.appendChild(notification);
  
  // Handle refresh
  document.getElementById('sw-update-btn').addEventListener('click', () => {
    window.location.reload();
  });
  
  // Handle dismiss
  document.getElementById('sw-dismiss-btn').addEventListener('click', () => {
    notification.remove();
  });
  
  // Auto dismiss after 10 seconds
  setTimeout(() => {
    notification.remove();
  }, 10000);
}

/**
 * Unregister service worker (for debugging)
 */
export async function unregisterSW() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
  }
}

/**
 * Check if app is installed
 */
export function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

/**
 * Prompt to install PWA
 */
export function promptInstall() {
  // Only prompt if not already installed
  if (isInstalled()) return;
  
  // Check for beforeinstallprompt event
  let deferredPrompt;
  
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button
    showInstallButton(deferredPrompt);
  });
}

/**
 * Show install button
 */
function showInstallButton(deferredPrompt) {
  const button = document.createElement('button');
  button.className = 'fixed bottom-20 right-4 bg-primary-600 text-white px-4 py-2 rounded-full shadow-lg z-40 flex items-center gap-2';
  button.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
      <path d="M10 2a1 1 0 011 1v10.586l2.293-2.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 13.586V3a1 1 0 011-1z"/>
    </svg>
    <span>Uygulamayı Yükle</span>
  `;
  
  button.addEventListener('click', async () => {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      button.remove();
    }
  });
  
  document.body.appendChild(button);
  
  // Remove after 30 seconds
  setTimeout(() => {
    button.remove();
  }, 30000);
}
