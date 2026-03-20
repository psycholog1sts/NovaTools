/**
 * CRDT (Conflict-free Replicated Data Type) Engine
 * Multi-device state synchronization without central server
 * Inspired by Yjs/Automerge architecture
 */

// Simple LWW (Last-Write-Wins) Register CRDT
class LWWRegister {
  constructor(value = null, timestamp = 0, peerId = '') {
    this.value = value;
    this.timestamp = timestamp;
    this.peerId = peerId;
  }

  set(value, timestamp, peerId) {
    if (timestamp > this.timestamp || 
        (timestamp === this.timestamp && peerId > this.peerId)) {
      this.value = value;
      this.timestamp = timestamp;
      this.peerId = peerId;
      return true;
    }
    return false;
  }

  get() {
    return this.value;
  }

  merge(other) {
    this.set(other.value, other.timestamp, other.peerId);
  }

  toJSON() {
    return { value: this.value, timestamp: this.timestamp, peerId: this.peerId };
  }

  static fromJSON(json) {
    return new LWWRegister(json.value, json.timestamp, json.peerId);
  }
}

// Grow-Only Set CRDT
class GSet {
  constructor() {
    this.elements = new Set();
  }

  add(element) {
    this.elements.add(JSON.stringify(element));
  }

  has(element) {
    return this.elements.has(JSON.stringify(element));
  }

  values() {
    return Array.from(this.elements).map(e => JSON.parse(e));
  }

  merge(other) {
    other.elements.forEach(e => this.elements.add(e));
  }

  toJSON() {
    return Array.from(this.elements).map(e => JSON.parse(e));
  }

  static fromJSON(json) {
    const set = new GSet();
    json.forEach(e => set.add(e));
    return set;
  }
}

// Add-Wins OR-Set (Observed-Remove Set) CRDT
class AWORSet {
  constructor() {
    this.adds = new Map(); // element -> Set of tags
    this.removes = new Set(); // Set of tags
  }

  add(element, tag) {
    const key = JSON.stringify(element);
    if (!this.adds.has(key)) {
      this.adds.set(key, new Set());
    }
    this.adds.get(key).add(tag);
  }

  remove(element, _tag) {
    const key = JSON.stringify(element);
    if (this.adds.has(key)) {
      this.adds.get(key).forEach(t => this.removes.add(t));
    }
  }

  has(element) {
    const key = JSON.stringify(element);
    if (!this.adds.has(key)) return false;
    
    // Element exists if at least one tag hasn't been removed
    const tags = this.adds.get(key);
    for (const tag of tags) {
      if (!this.removes.has(tag)) return true;
    }
    return false;
  }

  values() {
    const result = [];
    for (const [key, tags] of this.adds) {
      for (const tag of tags) {
        if (!this.removes.has(tag)) {
          result.push(JSON.parse(key));
          break;
        }
      }
    }
    return result;
  }

  merge(other) {
    // Merge adds
    for (const [key, tags] of other.adds) {
      if (!this.adds.has(key)) {
        this.adds.set(key, new Set());
      }
      tags.forEach(t => this.adds.get(key).add(t));
    }
    // Merge removes
    other.removes.forEach(t => this.removes.add(t));
  }

  toJSON() {
    return {
      adds: Array.from(this.adds.entries()).map(([k, v]) => [k, Array.from(v)]),
      removes: Array.from(this.removes)
    };
  }

  static fromJSON(json) {
    const set = new AWORSet();
    json.adds.forEach(([k, tags]) => {
      set.adds.set(k, new Set(tags));
    });
    json.removes.forEach(t => set.removes.add(t));
    return set;
  }
}

// Tool State Document - Composite CRDT
class ToolStateDocument {
  constructor(toolId, peerId) {
    this.toolId = toolId;
    this.peerId = peerId;
    this.clock = 0;
    
    // State components
    this.fields = new Map(); // Map<string, LWWRegister>
    this.history = new GSet(); // Operation history
    this.files = new AWORSet(); // File references
    this.metadata = new LWWRegister({}, 0, peerId);
  }

  getClock() {
    return ++this.clock;
  }

  /**
   * Set a field value
   */
  setField(key, value) {
    const timestamp = this.getClock();
    
    if (!this.fields.has(key)) {
      this.fields.set(key, new LWWRegister());
    }
    
    this.fields.get(key).set(value, timestamp, this.peerId);
    this.history.add({ type: 'set', key, value, timestamp, peerId: this.peerId });
    
    return { type: 'set', key, value, timestamp, peerId: this.peerId };
  }

  /**
   * Get a field value
   */
  getField(key) {
    return this.fields.get(key)?.get();
  }

  /**
   * Add file reference
   */
  addFile(fileRef) {
    const tag = `${this.peerId}-${this.getClock()}`;
    this.files.add(fileRef, tag);
    this.history.add({ type: 'addFile', fileRef, tag, peerId: this.peerId });
    return { type: 'addFile', fileRef, tag, peerId: this.peerId };
  }

  /**
   * Remove file reference
   */
  removeFile(fileRef) {
    const tag = `${this.peerId}-${this.getClock()}`;
    this.files.remove(fileRef, tag);
    this.history.add({ type: 'removeFile', fileRef, tag, peerId: this.peerId });
    return { type: 'removeFile', fileRef, tag, peerId: this.peerId };
  }

  /**
   * Get all file references
   */
  getFiles() {
    return this.files.values();
  }

  /**
   * Set document metadata
   */
  setMetadata(data) {
    const timestamp = this.getClock();
    const current = this.metadata.get() || {};
    this.metadata.set({ ...current, ...data }, timestamp, this.peerId);
    return { type: 'metadata', data, timestamp, peerId: this.peerId };
  }

  /**
   * Apply remote operation
   */
  applyOperation(op) {
    switch (op.type) {
      case 'set':
        if (!this.fields.has(op.key)) {
          this.fields.set(op.key, new LWWRegister());
        }
        this.fields.get(op.key).set(op.value, op.timestamp, op.peerId);
        break;
        
      case 'addFile':
        this.files.add(op.fileRef, op.tag);
        break;
        
      case 'removeFile':
        this.files.remove(op.fileRef, op.tag);
        break;
        
      case 'metadata': {
        const current = this.metadata.get() || {};
        this.metadata.set({ ...current, ...op.data }, op.timestamp, op.peerId);
        break;
      }
    }
    
    this.history.add(op);
  }

  /**
   * Merge another document
   */
  merge(other) {
    // Merge fields
    for (const [key, register] of other.fields) {
      if (!this.fields.has(key)) {
        this.fields.set(key, new LWWRegister());
      }
      this.fields.get(key).merge(register);
    }
    
    // Merge files
    this.files.merge(other.files);
    
    // Merge metadata
    this.metadata.merge(other.metadata);
    
    // Merge history
    this.history.merge(other.history);
  }

  /**
   * Get all operations since a given point
   */
  getOperationsSince(checkpoint = null) {
    const ops = this.history.values();
    if (!checkpoint) return ops;
    
    return ops.filter(op => op.timestamp > checkpoint);
  }

  /**
   * Get current state snapshot
   */
  getState() {
    const state = {};
    for (const [key, register] of this.fields) {
      state[key] = register.get();
    }
    return {
      toolId: this.toolId,
      peerId: this.peerId,
      fields: state,
      files: this.files.values(),
      metadata: this.metadata.get(),
      clock: this.clock
    };
  }

  /**
   * Serialize to JSON
   */
  toJSON() {
    return {
      toolId: this.toolId,
      peerId: this.peerId,
      clock: this.clock,
      fields: Array.from(this.fields.entries()).map(([k, v]) => [k, v.toJSON()]),
      files: this.files.toJSON(),
      metadata: this.metadata.toJSON(),
      history: this.history.toJSON()
    };
  }

  /**
   * Deserialize from JSON
   */
  static fromJSON(json) {
    const doc = new ToolStateDocument(json.toolId, json.peerId);
    doc.clock = json.clock;
    
    json.fields.forEach(([k, v]) => {
      doc.fields.set(k, LWWRegister.fromJSON(v));
    });
    
    doc.files = AWORSet.fromJSON(json.files);
    doc.metadata = LWWRegister.fromJSON(json.metadata);
    doc.history = GSet.fromJSON(json.history);
    
    return doc;
  }
}

// Sync Manager - Handles device-to-device synchronization
export class SyncManager {
  constructor(peerId) {
    this.peerId = peerId || this.generatePeerId();
    this.documents = new Map();
    this.syncProviders = new Map();
    this.listeners = new Map();
  }

  generatePeerId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Get or create document
   */
  getDocument(toolId) {
    if (!this.documents.has(toolId)) {
      this.documents.set(toolId, new ToolStateDocument(toolId, this.peerId));
    }
    return this.documents.get(toolId);
  }

  /**
   * Set field with sync
   */
  setField(toolId, key, value) {
    const doc = this.getDocument(toolId);
    const op = doc.setField(key, value);
    this.broadcast(toolId, op);
    this.persist(toolId);
    return op;
  }

  /**
   * Get field value
   */
  getField(toolId, key) {
    return this.getDocument(toolId).getField(key);
  }

  /**
   * Add file to tool state
   */
  addFile(toolId, fileRef) {
    const doc = this.getDocument(toolId);
    const op = doc.addFile(fileRef);
    this.broadcast(toolId, op);
    this.persist(toolId);
    return op;
  }

  /**
   * Subscribe to document changes
   */
  subscribe(toolId, callback) {
    if (!this.listeners.has(toolId)) {
      this.listeners.set(toolId, new Set());
    }
    this.listeners.get(toolId).add(callback);
    
    return () => {
      this.listeners.get(toolId).delete(callback);
    };
  }

  /**
   * Notify listeners of changes
   */
  notify(toolId, op) {
    const callbacks = this.listeners.get(toolId);
    if (callbacks) {
      callbacks.forEach(cb => cb(op));
    }
  }

  /**
   * Broadcast operation to sync providers
   */
  broadcast(toolId, op) {
    this.syncProviders.forEach(provider => {
      provider.send(toolId, op);
    });
    this.notify(toolId, op);
  }

  /**
   * Receive operation from sync provider
   */
  receive(toolId, op) {
    const doc = this.getDocument(toolId);
    doc.applyOperation(op);
    this.persist(toolId);
    this.notify(toolId, op);
  }

  /**
   * Persist document to storage
   */
  async persist(toolId) {
    const doc = this.getDocument(toolId);
    const data = doc.toJSON();
    
    // Store in IndexedDB
    await this.saveToIndexedDB(`crdt-${toolId}`, data);
    
    // Also broadcast to other tabs via BroadcastChannel
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'crdt-sync',
        toolId,
        data
      });
    }
  }

  /**
   * Load document from storage
   */
  async load(toolId) {
    const data = await this.loadFromIndexedDB(`crdt-${toolId}`);
    if (data) {
      const doc = ToolStateDocument.fromJSON(data);
      this.documents.set(toolId, doc);
      return doc;
    }
    return this.getDocument(toolId);
  }

  /**
   * Save to IndexedDB
   */
  saveToIndexedDB(key, data) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ZeroToolsSync', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents');
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['documents'], 'readwrite');
        const store = transaction.objectStore('documents');
        store.put(data, key);
        transaction.oncomplete = resolve;
        transaction.onerror = reject;
      };
      
      request.onerror = reject;
    });
  }

  /**
   * Load from IndexedDB
   */
  loadFromIndexedDB(key) {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('ZeroToolsSync', 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('documents')) {
          db.createObjectStore('documents');
        }
      };
      
      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['documents'], 'readonly');
        const store = transaction.objectStore('documents');
        const getRequest = store.get(key);
        
        getRequest.onsuccess = () => resolve(getRequest.result);
        getRequest.onerror = reject;
      };
      
      request.onerror = () => resolve(null);
    });
  }

  /**
   * Initialize BroadcastChannel for cross-tab sync
   */
  initCrossTabSync() {
    if (typeof BroadcastChannel !== 'undefined') {
      this.broadcastChannel = new BroadcastChannel('zero-tools-sync');
      
      this.broadcastChannel.onmessage = (event) => {
        if (event.data.type === 'crdt-sync') {
          const { toolId, data } = event.data;
          const doc = ToolStateDocument.fromJSON(data);
          
          if (this.documents.has(toolId)) {
            this.documents.get(toolId).merge(doc);
          } else {
            this.documents.set(toolId, doc);
          }
          
          this.notify(toolId, { type: 'sync', source: 'broadcast' });
        }
      };
    }
  }

  /**
   * Export document for sharing
   */
  exportDocument(toolId) {
    const doc = this.getDocument(toolId);
    return btoa(JSON.stringify(doc.toJSON()));
  }

  /**
   * Import document from share
   */
  importDocument(encoded) {
    const data = JSON.parse(atob(encoded));
    const doc = ToolStateDocument.fromJSON(data);
    this.documents.set(doc.toolId, doc);
    this.persist(doc.toolId);
    return doc;
  }
}

// Singleton instance
let syncManager = null;

export function getSyncManager() {
  if (!syncManager) {
    syncManager = new SyncManager();
    syncManager.initCrossTabSync();
  }
  return syncManager;
}

// Utility exports
export function syncField(toolId, key, value) {
  return getSyncManager().setField(toolId, key, value);
}

export function getSyncedField(toolId, key) {
  return getSyncManager().getField(toolId, key);
}

export function subscribeToTool(toolId, callback) {
  return getSyncManager().subscribe(toolId, callback);
}

export function exportToolState(toolId) {
  return getSyncManager().exportDocument(toolId);
}

export function importToolState(encoded) {
  return getSyncManager().importDocument(encoded);
}
