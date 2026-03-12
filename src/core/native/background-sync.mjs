/**
 * Background Sync API
 * Queue operations for offline execution
 */

const SYNC_TAG = 'novatools-offline-queue';
const DB_NAME = 'NovaToolsOfflineQueue';
const DB_VERSION = 1;
const STORE_NAME = 'operations';

let db = null;

/**
 * Initialize IndexedDB for offline queue
 */
export async function initOfflineQueue() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('tool', 'tool', { unique: false });
        store.createIndex('status', 'status', { unique: false });
      }
    };
  });
}

/**
 * Queue operation for background sync
 */
export async function queueOperation(tool, operation, data) {
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  const item = {
    tool,
    operation,
    data: await serializeData(data),
    status: 'pending',
    createdAt: Date.now(),
    attempts: 0
  };
  
  await store.add(item);
  
  // Register for background sync
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register(`${SYNC_TAG}-${tool}`);
  }
  
  // Show notification that operation is queued
  showQueuedNotification(tool);
}

/**
 * Get all pending operations
 */
export async function getPendingOperations(tool = null) {
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  
  if (tool) {
    const index = store.index('tool');
    return await index.getAll(tool);
  }
  
  return await store.getAll();
}

/**
 * Mark operation as completed
 */
export async function completeOperation(id) {
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  
  const item = await store.get(id);
  if (item) {
    item.status = 'completed';
    item.completedAt = Date.now();
    await store.put(item);
  }
}

/**
 * Remove operation from queue
 */
export async function removeOperation(id) {
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  await store.delete(id);
}

/**
 * Clear all completed operations
 */
export async function clearCompletedOperations() {
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const index = store.index('status');
  
  const completed = await index.getAll('completed');
  await Promise.all(completed.map(op => store.delete(op.id)));
}

/**
 * Serialize data for storage
 */
async function serializeData(data) {
  // Convert File/Blob to ArrayBuffer for storage
  const serialized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value instanceof File || value instanceof Blob) {
      serialized[key] = {
        __type: 'File',
        name: value.name,
        type: value.type,
        size: value.size,
        data: Array.from(new Uint8Array(await value.arrayBuffer()))
      };
    } else {
      serialized[key] = value;
    }
  }
  
  return serialized;
}

/**
 * Deserialize data from storage
 */
export function deserializeData(data) {
  const deserialized = {};
  
  for (const [key, value] of Object.entries(data)) {
    if (value && value.__type === 'File') {
      const uint8Array = new Uint8Array(value.data);
      deserialized[key] = new File([uint8Array], value.name, { type: value.type });
    } else {
      deserialized[key] = value;
    }
  }
  
  return deserialized;
}

/**
 * Show notification that operation is queued
 */
function showQueuedNotification(tool) {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('NovaTools', {
      body: `${tool} işlemi çevrimdışı kuyruğa eklendi. İnternet bağlantısı sağlandığında otomatik çalıştırılacak.`,
      icon: '/icons/icon-192x192.png',
      tag: 'offline-queued'
    });
  }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

/**
 * Check if background sync is supported
 */
export function isBackgroundSyncSupported() {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
}

/**
 * Get queue stats
 */
export async function getQueueStats() {
  const operations = await getPendingOperations();
  return {
    total: operations.length,
    pending: operations.filter(op => op.status === 'pending').length,
    completed: operations.filter(op => op.status === 'completed').length,
    failed: operations.filter(op => op.status === 'failed').length
  };
}

/**
 * Process queue - to be called by service worker
 */
export async function processQueue(processor) {
  const pending = await getPendingOperations();
  
  for (const item of pending) {
    if (item.status !== 'pending') continue;
    
    try {
      const data = deserializeData(item.data);
      await processor(item.tool, item.operation, data);
      await completeOperation(item.id);
    } catch (error) {
      console.error('Failed to process operation:', error);
      item.attempts++;
      if (item.attempts >= 3) {
        item.status = 'failed';
      }
    }
  }
}
