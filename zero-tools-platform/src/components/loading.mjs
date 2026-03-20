/**
 * Loading & Progress Indicators
 * Centralized loading states and progress bars
 */

export class LoadingManager {
  constructor() {
    this.activeLoaders = new Map();
    this.progressBars = new Map();
  }

  /**
   * Show loading overlay on an element
   * @param {string|HTMLElement} target - Target element or selector
   * @param {Object} options - Loading options
   */
  show(target, options = {}) {
    const element = typeof target === 'string' 
      ? document.querySelector(target) 
      : target;

    if (!element) return null;

    const id = options.id || `loader-${Date.now()}`;
    const message = options.message || 'Loading...';
    const type = options.type || 'spinner'; // spinner, dots, pulse, progress

    const overlay = document.createElement('div');
    overlay.className = `loading-overlay loading-${type}`;
    overlay.dataset.loaderId = id;
    overlay.style.cssText = `
      position: absolute;
      inset: 0;
      background: rgba(15, 23, 42, 0.9);
      backdrop-filter: blur(4px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      z-index: 100;
      border-radius: inherit;
    `;

    const spinnerHTML = this.getSpinnerHTML(type, options);
    
    overlay.innerHTML = `
      ${spinnerHTML}
      ${message ? `<div style="
        color: #94A3B8;
        margin-top: 16px;
        font-size: 14px;
        text-align: center;
      ">${message}</div>` : ''}
    `;

    // Ensure parent has position
    const computedStyle = window.getComputedStyle(element);
    if (computedStyle.position === 'static') {
      element.style.position = 'relative';
    }

    element.appendChild(overlay);
    this.activeLoaders.set(id, { element: overlay, parent: element, type });

    return id;
  }

  /**
   * Hide loading overlay
   * @param {string} id - Loader ID
   */
  hide(id) {
    const loader = this.activeLoaders.get(id);
    if (loader) {
      loader.element.style.opacity = '0';
      setTimeout(() => {
        if (loader.element.parentNode) {
          loader.element.parentNode.removeChild(loader.element);
        }
      }, 200);
      this.activeLoaders.delete(id);
    }
  }

  /**
   * Show button loading state
   * @param {HTMLElement} button - Button element
   * @param {string} loadingText - Text while loading
   */
  button(button, loadingText = 'Processing...') {
    const originalText = button.innerHTML;
    const originalDisabled = button.disabled;

    button.disabled = true;
    button.innerHTML = `
      <span style="display: inline-flex; align-items: center; gap: 8px;">
        <span class="btn-spinner" style="
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        "></span>
        ${loadingText}
      </span>
    `;

    // Add spin animation if not present
    if (!document.getElementById('loading-animations')) {
      const style = document.createElement('style');
      style.id = 'loading-animations';
      style.textContent = `
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.95); }
        }
        @keyframes dots {
          0%, 20% { content: '.'; }
          40% { content: '..'; }
          60%, 100% { content: '...'; }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `;
      document.head.appendChild(style);
    }

    return () => {
      button.innerHTML = originalText;
      button.disabled = originalDisabled;
    };
  }

  /**
   * Create a progress bar
   * @param {string|HTMLElement} target - Target element
   * @param {Object} options - Progress options
   */
  createProgress(target, options = {}) {
    const element = typeof target === 'string' 
      ? document.querySelector(target) 
      : target;

    if (!element) return null;

    const id = options.id || `progress-${Date.now()}`;
    const showPercentage = options.showPercentage !== false;

    const container = document.createElement('div');
    container.className = 'progress-container';
    container.style.cssText = `
      width: 100%;
      background: rgba(255,255,255,0.1);
      border-radius: 8px;
      overflow: hidden;
      height: 8px;
      position: relative;
    `;

    const bar = document.createElement('div');
    bar.className = 'progress-bar';
    bar.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #00F5D4, #00D9FF);
      border-radius: 8px;
      transition: width 0.3s ease;
      width: 0%;
    `;

    container.appendChild(bar);

    if (showPercentage) {
      const label = document.createElement('div');
      label.className = 'progress-label';
      label.style.cssText = `
        text-align: center;
        margin-top: 8px;
        font-size: 12px;
        color: #94A3B8;
      `;
      label.textContent = '0%';
      container.appendChild(label);
      this.progressBars.set(id, { container, bar, label });
    } else {
      this.progressBars.set(id, { container, bar });
    }

    element.appendChild(container);
    return id;
  }

  /**
   * Update progress bar
   * @param {string} id - Progress bar ID
   * @param {number} percent - Percentage (0-100)
   * @param {string} message - Optional message
   */
  updateProgress(id, percent, message = null) {
    const progress = this.progressBars.get(id);
    if (!progress) return;

    const clampedPercent = Math.max(0, Math.min(100, percent));
    progress.bar.style.width = `${clampedPercent}%`;

    if (progress.label) {
      progress.label.textContent = message || `${Math.round(clampedPercent)}%`;
    }
  }

  /**
   * Remove progress bar
   * @param {string} id - Progress bar ID
   */
  removeProgress(id) {
    const progress = this.progressBars.get(id);
    if (progress && progress.container.parentNode) {
      progress.container.parentNode.removeChild(progress.container);
      this.progressBars.delete(id);
    }
  }

  /**
   * Show skeleton loading placeholder
   * @param {string|HTMLElement} target - Target element
   * @param {number} count - Number of skeleton items
   */
  skeleton(target, count = 3) {
    const element = typeof target === 'string' 
      ? document.querySelector(target) 
      : target;

    if (!element) return null;

    const container = document.createElement('div');
    container.className = 'skeleton-container';
    
    let html = '';
    for (let i = 0; i < count; i++) {
      html += `
        <div style="
          background: linear-gradient(90deg, #1E293B 25%, #334155 50%, #1E293B 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite;
          height: 60px;
          border-radius: 8px;
          margin-bottom: 12px;
        "></div>
      `;
    }
    
    container.innerHTML = html;
    element.appendChild(container);

    return () => {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    };
  }

  /**
   * Get spinner HTML by type
   */
  getSpinnerHTML(type, options) {
    const size = options.size || 48;
    
    switch (type) {
      case 'spinner':
        return `
          <div style="
            width: ${size}px;
            height: ${size}px;
            border: 3px solid rgba(0, 245, 212, 0.2);
            border-top-color: #00F5D4;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          "></div>
        `;
      
      case 'dots':
        return `
          <div style="display: flex; gap: 8px;">
            ${[0, 1, 2].map(i => `
              <div style="
                width: 12px;
                height: 12px;
                background: #00F5D4;
                border-radius: 50%;
                animation: pulse 1s ease-in-out ${i * 0.2}s infinite;
              "></div>
            `).join('')}
          </div>
        `;
      
      case 'pulse':
        return `
          <div style="
            width: ${size}px;
            height: ${size}px;
            background: #00F5D4;
            border-radius: 50%;
            animation: pulse 1.5s ease-in-out infinite;
            opacity: 0.6;
          "></div>
        `;

      default:
        return this.getSpinnerHTML('spinner', options);
    }
  }

  /**
   * Clear all loaders
   */
  clearAll() {
    this.activeLoaders.forEach((loader, id) => this.hide(id));
    this.progressBars.forEach((progress, id) => this.removeProgress(id));
  }
}

// Singleton instance
export const loading = new LoadingManager();

export default loading;
