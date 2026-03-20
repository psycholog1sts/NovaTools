/**
 * State Manager Module
 * Centralized state management with reactive updates
 */

class StateManager {
  constructor() {
    this.state = {};
    this.subscribers = new Map();
    this.computed = new Map();
  }

  /**
   * Initialize state with default values
   * @param {Object} initialState - Initial state object
   */
  init(initialState = {}) {
    this.state = { ...initialState };
    return this;
  }

  /**
   * Get state value by path
   * @param {string} path - Dot notation path
   * @param {*} defaultValue - Default if not found
   * @returns {*} State value
   */
  get(path, defaultValue = null) {
    const keys = path.split('.');
    let value = this.state;
    
    for (const key of keys) {
      if (value === null || value === undefined || !(key in value)) {
        return defaultValue;
      }
      value = value[key];
    }
    
    return value;
  }

  /**
   * Set state value at path
   * @param {string} path - Dot notation path
   * @param {*} value - Value to set
   * @param {boolean} notify - Whether to notify subscribers
   */
  set(path, value, notify = true) {
    const keys = path.split('.');
    let target = this.state;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!(keys[i] in target) || typeof target[keys[i]] !== 'object') {
        target[keys[i]] = {};
      }
      target = target[keys[i]];
    }
    
    const oldValue = target[keys[keys.length - 1]];
    target[keys[keys.length - 1]] = value;
    
    if (notify && oldValue !== value) {
      this.notify(path, value, oldValue);
    }
    
    return this;
  }

  /**
   * Subscribe to state changes
   * @param {string} path - State path to watch
   * @param {Function} callback - Callback function
   * @returns {Function} Unsubscribe function
   */
  subscribe(path, callback) {
    if (!this.subscribers.has(path)) {
      this.subscribers.set(path, new Set());
    }
    
    this.subscribers.get(path).add(callback);
    
    // Return unsubscribe function
    return () => {
      this.subscribers.get(path)?.delete(callback);
    };
  }

  /**
   * Notify subscribers of state change
   * @param {string} path - Changed path
   * @param {*} newValue - New value
   * @param {*} oldValue - Old value
   */
  notify(path, newValue, oldValue) {
    // Notify exact path subscribers
    if (this.subscribers.has(path)) {
      this.subscribers.get(path).forEach(cb => cb(newValue, oldValue, path));
    }
    
    // Notify parent path subscribers
    const parentPaths = this.getParentPaths(path);
    parentPaths.forEach(parentPath => {
      if (this.subscribers.has(parentPath)) {
        const parentValue = this.get(parentPath);
        this.subscribers.get(parentPath).forEach(cb => cb(parentValue, null, path));
      }
    });
  }

  /**
   * Get parent paths for notification bubbling
   * @param {string} path - Full path
   * @returns {string[]} Parent paths
   */
  getParentPaths(path) {
    const keys = path.split('.');
    const parents = [];
    
    for (let i = 1; i < keys.length; i++) {
      parents.push(keys.slice(0, i).join('.'));
    }
    
    return parents;
  }

  /**
   * Batch multiple state updates
   * @param {Function} updater - Function that performs updates
   */
  batch(updater) {
    const notifications = [];
    const originalNotify = this.notify;
    
    // Temporarily override notify to collect notifications
    this.notify = (path, newValue, oldValue) => {
      notifications.push({ path, newValue, oldValue });
    };
    
    updater(this);
    
    // Restore original notify
    this.notify = originalNotify;
    
    // Send notifications
    notifications.forEach(({ path, newValue, oldValue }) => {
      this.notify(path, newValue, oldValue);
    });
  }

  /**
   * Reset state to initial values
   */
  reset() {
    this.state = {};
    this.subscribers.clear();
  }

  /**
   * Get full state snapshot
   * @returns {Object} Current state
   */
  snapshot() {
    return JSON.parse(JSON.stringify(this.state));
  }
}

// Singleton instance
export const stateManager = new StateManager();

// Initialize with default state
stateManager.init({
  tools: {},
  ui: {
    theme: 'dark',
    sidebarOpen: false,
    currentRoute: '/'
  },
  data: {
    crypto: null,
    exchangeRates: null,
    lastUpdate: null
  }
});

export default stateManager;
