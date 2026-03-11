/**
 * Web Share Target API
 * Receive files from native OS share menus
 */

/**
 * Handle incoming shared files
 */
export function initWebShareTarget() {
  // Check if page was opened via share
  if (window.location.search.includes('share-target')) {
    parseSharedFiles();
  }

  // Listen for future shares
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.action === 'share-target') {
        handleSharedFiles(event.data.files);
      }
    });
  }
}

/**
 * Parse shared files from URL/form data
 */
async function parseSharedFiles() {
  try {
    // Try to get files from service worker
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      
      // Send message to SW to get shared files
      registration.active?.postMessage({ action: 'get-shared-files' });
    }
  } catch (err) {
    console.error('Parse shared files error:', err);
  }
}

/**
 * Handle shared files from service worker
 */
function handleSharedFiles(files) {
  files.forEach(file => {
    window.dispatchEvent(new CustomEvent('web-share-received', {
      detail: { file, type: file.type }
    }));
  });
}

/**
 * Share file back to native apps
 */
export async function shareFile(file, title = 'Shared from ZeroTools') {
  if (!navigator.share) {
    console.warn('Web Share API not supported');
    return false;
  }

  try {
    await navigator.share({
      title,
      files: [file]
    });
    return true;
  } catch (err) {
    if (err.name !== 'AbortError') {
      console.error('Share error:', err);
    }
    return false;
  }
}

/**
 * Share text/link
 */
export async function shareText(title, text, url) {
  if (!navigator.share) return false;

  try {
    await navigator.share({ title, text, url });
    return true;
  } catch (err) {
    if (err.name !== 'AbortError') console.error('Share text error:', err);
    return false;
  }
}

/**
 * Check if can share files
 */
export function canShareFiles() {
  return navigator.share && navigator.canShare && 
    navigator.canShare({ files: [new File([''], 'test.txt', { type: 'text/plain' })] });
}

/**
 * Register share target in manifest (handled at build time)
 * This function validates the configuration
 */
export function validateShareTargetConfig() {
  return {
    action: '/src/tools/pdf/merge/',
    method: 'POST',
    enctype: 'multipart/form-data',
    params: {
      title: 'name',
      text: 'description',
      url: 'link',
      files: [
        { name: 'pdfFiles', accept: ['application/pdf', 'image/*'] }
      ]
    }
  };
}
