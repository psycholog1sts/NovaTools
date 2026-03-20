/**
 * Toast Notification System
 * Centralized toast notifications with auto-dismiss
 */

export class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = [];
    this.init();
  }

  init() {
    // Create container if it doesn't exist
    if (!document.getElementById('toast-container')) {
      this.container = document.createElement('div');
      this.container.id = 'toast-container';
      this.container.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 10000;
        display: flex;
        flex-direction: column;
        gap: 10px;
        pointer-events: none;
      `;
      document.body.appendChild(this.container);
    } else {
      this.container = document.getElementById('toast-container');
    }
  }

  /**
   * Show a toast notification
   * @param {Object} options - Toast options
   */
  show(options = {}) {
    const {
      type = 'info',
      title = '',
      message = '',
      duration = 5000,
      dismissible = true
    } = options;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.cssText = `
      background: ${this.getBackground(type)};
      color: white;
      padding: 16px 20px;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.3);
      min-width: 300px;
      max-width: 400px;
      pointer-events: auto;
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
      border-left: 4px solid ${this.getBorderColor(type)};
    `;

    const icon = this.getIcon(type);
    
    toast.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <span style="font-size: 20px; flex-shrink: 0;">${icon}</span>
        <div style="flex: 1;">
          ${title ? `<div style="font-weight: 600; margin-bottom: 4px;">${title}</div>` : ''}
          <div style="opacity: 0.9; font-size: 14px; line-height: 1.4;">${message}</div>
        </div>
        ${dismissible ? `
          <button style="
            background: none;
            border: none;
            color: white;
            cursor: pointer;
            opacity: 0.7;
            padding: 0;
            font-size: 18px;
            line-height: 1;
          " onclick="this.closest('.toast').remove()">×</button>
        ` : ''}
      </div>
    `;

    this.container.appendChild(toast);
    this.toasts.push(toast);

    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)';
      toast.style.opacity = '1';
    });

    // Auto dismiss
    if (duration > 0) {
      setTimeout(() => this.dismiss(toast), duration);
    }

    return toast;
  }

  /**
   * Dismiss a toast
   * @param {HTMLElement} toast - Toast element
   */
  dismiss(toast) {
    if (!toast || !toast.parentNode) return;
    
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }

  /**
   * Show success toast
   * @param {string} message - Message
   * @param {string} title - Title
   */
  success(message, title = 'Success') {
    return this.show({ type: 'success', title, message });
  }

  /**
   * Show error toast
   * @param {string} message - Message
   * @param {string} title - Title
   */
  error(message, title = 'Error') {
    return this.show({ type: 'error', title, message, duration: 8000 });
  }

  /**
   * Show warning toast
   * @param {string} message - Message
   * @param {string} title - Title
   */
  warning(message, title = 'Warning') {
    return this.show({ type: 'warning', title, message });
  }

  /**
   * Show info toast
   * @param {string} message - Message
   * @param {string} title - Title
   */
  info(message, title = 'Info') {
    return this.show({ type: 'info', title, message });
  }

  getBackground(type) {
    const colors = {
      success: 'linear-gradient(135deg, #00C853, #00E676)',
      error: 'linear-gradient(135deg, #FF1744, #FF5252)',
      warning: 'linear-gradient(135deg, #FF9100, #FFC400)',
      info: 'linear-gradient(135deg, #00B0FF, #00E5FF)'
    };
    return colors[type] || colors.info;
  }

  getBorderColor(type) {
    const colors = {
      success: '#00FF88',
      error: '#FF5252',
      warning: '#FFC400',
      info: '#00E5FF'
    };
    return colors[type] || colors.info;
  }

  getIcon(type) {
    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ'
    };
    return icons[type] || icons.info;
  }
}

// Singleton instance
export const toast = new ToastManager();

// Listen for app errors
window.addEventListener('app-error', (e) => {
  const { type, message } = e.detail;
  toast[type === 'validation' ? 'warning' : 'error'](message);
});

export default toast;
