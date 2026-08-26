/**
 * Toast Notification System
 * Accessible, text-safe notifications with optional actions and focus-safe dismissal.
 */

const VALID_TYPES = new Set(['success', 'error', 'warning', 'info']);

export class ToastManager {
  constructor() {
    this.container = null;
    this.toasts = new Set();
    this.timers = new WeakMap();
    this.init();
  }

  init() {
    if (typeof document === 'undefined') return;
    this.container = document.getElementById('toast-container');
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'toast-container';
    this.container.className = 'toast-region';
    this.container.setAttribute('aria-label', 'Notifications');
    this.container.setAttribute('aria-live', 'polite');
    this.container.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(this.container);
  }

  /**
   * @param {Object} options
   * @param {'success'|'error'|'warning'|'info'} [options.type]
   * @param {string} [options.title]
   * @param {string} [options.message]
   * @param {number} [options.duration]
   * @param {boolean} [options.dismissible]
   * @param {{label:string,onClick:Function}|null} [options.action]
   */
  show(options = {}) {
    if (!this.container) this.init();
    if (!this.container) return null;

    const {
      type: requestedType = 'info',
      title = '',
      message = '',
      duration = 5000,
      dismissible = true,
      action = null
    } = options;
    const type = VALID_TYPES.has(requestedType) ? requestedType : 'info';

    const toast = document.createElement('section');
    toast.className = `toast toast-${type}`;
    toast.dataset.state = 'entering';
    toast.setAttribute('role', type === 'error' ? 'alert' : 'status');
    toast.setAttribute('aria-atomic', 'true');

    const icon = document.createElement('span');
    icon.className = 'toast__icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = this.getIcon(type);

    const copy = document.createElement('div');
    copy.className = 'toast__copy';
    if (title) {
      const heading = document.createElement('strong');
      heading.className = 'toast__title';
      heading.textContent = title;
      copy.appendChild(heading);
    }
    const body = document.createElement('div');
    body.className = 'toast__message';
    body.textContent = message;
    copy.appendChild(body);

    const row = document.createElement('div');
    row.className = 'toast__row';
    row.append(icon, copy);

    if (action?.label && typeof action.onClick === 'function') {
      const actionButton = document.createElement('button');
      actionButton.type = 'button';
      actionButton.className = 'toast__action';
      actionButton.textContent = action.label;
      actionButton.addEventListener('click', (event) => action.onClick(event, toast));
      copy.appendChild(actionButton);
    }

    if (dismissible) {
      const close = document.createElement('button');
      close.type = 'button';
      close.className = 'toast__close';
      close.setAttribute('aria-label', 'Dismiss notification');
      close.textContent = '×';
      close.addEventListener('click', () => this.dismiss(toast));
      row.appendChild(close);
    }

    toast.appendChild(row);
    this.container.appendChild(toast);
    this.toasts.add(toast);

    requestAnimationFrame(() => {
      toast.dataset.state = 'visible';
    });

    if (Number.isFinite(duration) && duration > 0) {
      const timer = window.setTimeout(() => this.dismiss(toast), duration);
      this.timers.set(toast, timer);
      toast.addEventListener('mouseenter', () => window.clearTimeout(this.timers.get(toast)), { once: true });
    }

    return toast;
  }

  dismiss(toast) {
    if (!toast?.isConnected) return;
    const timer = this.timers.get(toast);
    if (timer) window.clearTimeout(timer);
    toast.dataset.state = 'leaving';
    const remove = () => {
      toast.remove();
      this.toasts.delete(toast);
    };
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) remove();
    else window.setTimeout(remove, 180);
  }

  dismissAll() {
    [...this.toasts].forEach((item) => this.dismiss(item));
  }

  success(message, title = 'Success') {
    return this.show({ type: 'success', title, message });
  }

  error(message, title = 'Error') {
    return this.show({ type: 'error', title, message, duration: 8000 });
  }

  warning(message, title = 'Warning') {
    return this.show({ type: 'warning', title, message });
  }

  info(message, title = 'Info') {
    return this.show({ type: 'info', title, message });
  }

  getIcon(type) {
    return ({ success: '✓', error: '!', warning: '⚠', info: 'i' })[type] || 'i';
  }
}

export const toast = typeof document !== 'undefined' ? new ToastManager() : null;

if (typeof window !== 'undefined') {
  window.addEventListener('app-error', (event) => {
    const { type, message } = event.detail || {};
    if (!toast || !message) return;
    toast[type === 'validation' ? 'warning' : 'error'](String(message));
  });
}

export default toast;
