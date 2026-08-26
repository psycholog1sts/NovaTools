/**
 * DropZone Component
 * Reusable, accessible file chooser enhancement with drag/drop support.
 * The native <input type="file"> remains the source of truth.
 */

function normalizeAccept(accept) {
  return String(accept || '*').split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
}

function fileExtension(name = '') {
  const index = String(name).lastIndexOf('.');
  return index >= 0 ? String(name).slice(index).toLowerCase() : '';
}

export class DropZone {
  constructor(element, options = {}) {
    this.element = typeof element === 'string' ? document.querySelector(element) : element;
    this.options = {
      accept: options.accept || '*',
      multiple: options.multiple !== false,
      maxSize: options.maxSize || 50 * 1024 * 1024,
      onDrop: options.onDrop || (() => {}),
      onError: options.onError || (() => {}),
      onRemove: options.onRemove || (() => {}),
      ...options
    };
    this.input = null;
    this.status = null;
    this.selected = [];
    this.listeners = [];
    this.init();
  }

  listen(target, type, handler, options = false) {
    target.addEventListener(type, handler, options);
    this.listeners.push(() => target.removeEventListener(type, handler, options));
  }

  init() {
    if (!this.element) return;
    this.element.classList.add('dropzone');
    this.input = this.element.querySelector('input[type="file"]');
    if (this.input) {
      if (!this.input.accept && this.options.accept !== '*') this.input.accept = this.options.accept;
      this.input.multiple = Boolean(this.options.multiple);
    }

    this.status = this.element.querySelector('[data-dropzone-status]');
    if (!this.status) {
      this.status = document.createElement('div');
      this.status.className = 'dropzone-status';
      this.status.dataset.dropzoneStatus = 'true';
      this.status.setAttribute('aria-live', 'polite');
      this.status.setAttribute('aria-atomic', 'true');
      this.element.appendChild(this.status);
    }

    const prevent = (event) => this.preventDefaults(event);
    for (const type of ['dragenter', 'dragover', 'dragleave', 'drop']) this.listen(this.element, type, prevent);
    for (const type of ['dragenter', 'dragover']) this.listen(this.element, type, () => this.highlight());
    for (const type of ['dragleave', 'drop']) this.listen(this.element, type, () => this.unhighlight());
    this.listen(this.element, 'drop', (event) => this.handleDrop(event));
    if (this.input) this.listen(this.input, 'change', (event) => this.handleFiles(event.target.files));

    if (this.element.getAttribute('role') === 'button') {
      this.listen(this.element, 'keydown', (event) => {
        if ((event.key === 'Enter' || event.key === ' ') && event.target === this.element) {
          event.preventDefault();
          this.input?.click();
        }
      });
    }
  }

  preventDefaults(event) {
    event.preventDefault();
    event.stopPropagation();
  }

  highlight() {
    this.element?.classList.add('dropzone-active', 'drag-active');
  }

  unhighlight() {
    this.element?.classList.remove('dropzone-active', 'drag-active');
  }

  handleDrop(event) {
    this.handleFiles(event.dataTransfer?.files || []);
  }

  accepts(file) {
    const accepted = normalizeAccept(this.options.accept);
    if (!accepted.length || accepted.includes('*') || accepted.includes('*/*')) return true;
    const mime = String(file.type || '').toLowerCase();
    const extension = fileExtension(file.name);
    const acceptExtensions = accepted.filter((value) => value.startsWith('.'));
    if (acceptExtensions.includes(extension)) return true;
    return accepted.some((rule) => {
      if (rule.startsWith('.')) return false;
      if (rule.endsWith('/*')) return mime.startsWith(rule.slice(0, -1));
      return mime === rule;
    });
  }

  announce(message, kind = 'info') {
    if (!this.status) return;
    this.status.dataset.type = kind;
    this.status.textContent = message;
  }

  handleFiles(files) {
    const fileArray = Array.from(files || []);
    if (!fileArray.length) return;
    const validFiles = [];
    const errors = [];

    for (const file of fileArray) {
      if (!this.accepts(file)) {
        errors.push(`${file.name}: unsupported file type`);
        continue;
      }
      if (file.size > this.options.maxSize) {
        const maxMB = Math.round((this.options.maxSize / (1024 * 1024)) * 10) / 10;
        errors.push(`${file.name}: file is larger than ${maxMB} MB`);
        continue;
      }
      validFiles.push(file);
      if (!this.options.multiple) break;
    }

    if (errors.length) {
      this.announce(errors.join('. '), 'error');
      this.options.onError(errors);
    }

    if (!validFiles.length) return;
    this.selected = validFiles;
    const labels = validFiles.map((file) => file.name).join(', ');
    this.announce(`${validFiles.length} file${validFiles.length === 1 ? '' : 's'} selected: ${labels}`, 'success');
    this.options.onDrop(this.options.multiple ? validFiles : validFiles[0]);
  }

  reset() {
    if (this.input) this.input.value = '';
    this.selected = [];
    this.unhighlight();
    this.announce('No file selected.');
    this.options.onRemove();
  }

  destroy() {
    for (const removeEventListener of this.listeners.splice(0)) removeEventListener();
    this.element?.classList.remove('dropzone', 'dropzone-active', 'drag-active');
    if (this.status?.dataset.dropzoneStatus === 'true') this.status.remove();
    this.status = null;
    this.input = null;
    this.selected = [];
  }
}

export default DropZone;
