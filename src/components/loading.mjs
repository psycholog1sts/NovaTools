/**
 * Loading & Progress Indicators
 * Semantic loading states. Progress percentages are displayed only when supplied by the caller.
 */

function resolveTarget(target) {
  if (typeof document === 'undefined') return null;
  return typeof target === 'string' ? document.querySelector(target) : target;
}

function createSpinner(type = 'spinner') {
  const visual = document.createElement('span');
  visual.className = `loading-indicator loading-indicator--${type}`;
  visual.setAttribute('aria-hidden', 'true');

  if (type === 'dots') {
    for (let index = 0; index < 3; index += 1) {
      const dot = document.createElement('span');
      dot.className = 'loading-indicator__dot';
      visual.appendChild(dot);
    }
  }
  return visual;
}

export class LoadingManager {
  constructor() {
    this.activeLoaders = new Map();
    this.progressBars = new Map();
  }

  show(target, options = {}) {
    const element = resolveTarget(target);
    if (!element) return null;

    const id = options.id || `loader-${Date.now()}`;
    const message = String(options.message || 'Loading…');
    const type = ['spinner', 'dots', 'pulse'].includes(options.type) ? options.type : 'spinner';

    const overlay = document.createElement('div');
    overlay.className = `loading-overlay loading-${type}`;
    overlay.dataset.loaderId = id;
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-busy', 'true');
    overlay.appendChild(createSpinner(type));

    const copy = document.createElement('span');
    copy.className = 'loading-overlay__message';
    copy.textContent = message;
    overlay.appendChild(copy);

    const computedStyle = window.getComputedStyle(element);
    const changedPosition = computedStyle.position === 'static';
    if (changedPosition) element.style.position = 'relative';
    element.setAttribute('aria-busy', 'true');
    element.appendChild(overlay);
    this.activeLoaders.set(id, { element: overlay, parent: element, changedPosition });
    return id;
  }

  hide(id) {
    const loader = this.activeLoaders.get(id);
    if (!loader) return;
    loader.element.remove();
    loader.parent.removeAttribute('aria-busy');
    if (loader.changedPosition) loader.parent.style.position = '';
    this.activeLoaders.delete(id);
  }

  button(button, loadingText = 'Processing…') {
    if (!button) return () => {};
    const originalNodes = [...button.childNodes].map((node) => node.cloneNode(true));
    const originalDisabled = button.disabled;
    button.disabled = true;
    button.setAttribute('aria-busy', 'true');
    button.replaceChildren(createSpinner('spinner'));
    const label = document.createElement('span');
    label.textContent = loadingText;
    button.appendChild(label);

    return () => {
      button.replaceChildren(...originalNodes.map((node) => node.cloneNode(true)));
      button.disabled = originalDisabled;
      button.removeAttribute('aria-busy');
    };
  }

  createProgress(target, options = {}) {
    const element = resolveTarget(target);
    if (!element) return null;

    const id = options.id || `progress-${Date.now()}`;
    const container = document.createElement('div');
    container.className = 'progress-container';

    const progress = document.createElement('progress');
    progress.className = 'progress-native';
    progress.max = 100;
    progress.setAttribute('aria-label', options.label || 'Progress');
    if (Number.isFinite(options.value)) progress.value = Math.max(0, Math.min(100, Number(options.value)));
    container.appendChild(progress);

    const status = document.createElement('div');
    status.className = 'progress-label';
    status.setAttribute('aria-live', 'polite');
    status.textContent = Number.isFinite(options.value) && options.showPercentage !== false
      ? `${Math.round(progress.value)}%`
      : String(options.message || 'Working…');
    container.appendChild(status);

    element.appendChild(container);
    this.progressBars.set(id, { container, progress, status, showPercentage: options.showPercentage !== false });
    return id;
  }

  updateProgress(id, percent, message = null) {
    const entry = this.progressBars.get(id);
    if (!entry || !Number.isFinite(percent)) return;
    const value = Math.max(0, Math.min(100, Number(percent)));
    entry.progress.value = value;
    entry.status.textContent = message || (entry.showPercentage ? `${Math.round(value)}%` : 'Working…');
  }

  setIndeterminate(id, message = 'Working…') {
    const entry = this.progressBars.get(id);
    if (!entry) return;
    entry.progress.removeAttribute('value');
    entry.status.textContent = message;
  }

  removeProgress(id) {
    const entry = this.progressBars.get(id);
    if (!entry) return;
    entry.container.remove();
    this.progressBars.delete(id);
  }

  skeleton(target, count = 3) {
    const element = resolveTarget(target);
    if (!element) return null;
    const container = document.createElement('div');
    container.className = 'skeleton-container';
    container.setAttribute('aria-hidden', 'true');
    for (let index = 0; index < count; index += 1) {
      const item = document.createElement('div');
      item.className = 'nt-skeleton nt-skeleton--row';
      container.appendChild(item);
    }
    element.appendChild(container);
    return () => container.remove();
  }

  clearAll() {
    [...this.activeLoaders.keys()].forEach((id) => this.hide(id));
    [...this.progressBars.keys()].forEach((id) => this.removeProgress(id));
  }
}

export const loading = new LoadingManager();
export default loading;
