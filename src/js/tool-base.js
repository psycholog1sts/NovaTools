/**
 * Shared premium workflow controller for NovaTools tool pages.
 * It is intentionally small and non-invasive: existing tool logic keeps ownership of processing,
 * while this controller standardizes validation, accessible status updates, and success/error UI.
 */
export class ToolController {
  constructor(options = {}) {
    this.form = options.form || null;
    this.statusRegion = options.statusRegion || null;
    this.successPanel = options.successPanel || null;
    this.errorPanel = options.errorPanel || null;
    this.process = options.process || (() => Promise.resolve({ message: 'İşlem tamamlandı.' }));
  }

  init() {
    if (this.form) {
      this.form.addEventListener('submit', (event) => {
        if (!this.validate()) {
          event.preventDefault();
          this.showError('Lütfen gerekli alanları kontrol edin ve tekrar deneyin.');
        }
      });
    }
    return this;
  }

  validate() {
    if (!this.form || typeof this.form.checkValidity !== 'function') return true;
    return this.form.checkValidity();
  }

  async runDemo() {
    try {
      const result = await this.process();
      this.showSuccess(result?.message || 'İşlem tamamlandı.');
    } catch {
      this.showError('İşlem sırasında beklenmeyen bir sorun oluştu. Lütfen girişleri kontrol edip tekrar deneyin.');
    }
  }

  showSuccess(message = 'İşlem tamamlandı!') {
    this.#setStatus(message);
    this.successPanel?.removeAttribute('hidden');
    this.errorPanel?.setAttribute('hidden', '');
    const messageNode = this.successPanel?.querySelector('[data-tool-success-message]');
    if (messageNode) messageNode.textContent = message;
    this.successPanel?.focus?.({ preventScroll: false });
  }

  showError(message = 'Bir hata oluştu. Lütfen tekrar deneyin.') {
    this.#setStatus(message);
    this.errorPanel?.removeAttribute('hidden');
    this.successPanel?.setAttribute('hidden', '');
    const messageNode = this.errorPanel?.querySelector('[data-tool-error-message]');
    if (messageNode) messageNode.textContent = message;
    this.errorPanel?.focus?.({ preventScroll: false });
  }

  reset() {
    this.form?.reset?.();
    this.successPanel?.setAttribute('hidden', '');
    this.errorPanel?.setAttribute('hidden', '');
    this.#setStatus('Form sıfırlandı.');
  }

  #setStatus(message) {
    if (this.statusRegion) this.statusRegion.textContent = message;
  }
}

export function setupDropzones(root = document, options = {}) {
  const maxBytes = options.maxBytes || 50 * 1024 * 1024;
  root.querySelectorAll('input[type="file"]').forEach((input) => {
    const field = input.closest('label, .form-field, .field, .upload-zone, .dropzone') || input.parentElement;
    if (!field || field.dataset.dropzoneReady === 'true') return;
    field.dataset.dropzoneReady = 'true';
    field.classList.add('premium-dropzone');

    const progress = document.createElement('div');
    progress.className = 'premium-upload-progress';
    progress.innerHTML = '<span></span>';
    field.append(progress);

    const updateProgress = () => {
      const file = input.files?.[0];
      const bar = progress.querySelector('span');
      if (!file || !bar) return;
      const sizeRatio = Math.min(file.size / maxBytes, 1);
      bar.style.width = `${Math.max(12, Math.round(sizeRatio * 100))}%`;
      if (file.size > maxBytes) {
        input.setCustomValidity('Dosya boyutu çok büyük. Lütfen 50MB altında bir dosya seçin.');
      } else {
        input.setCustomValidity('');
      }
    };

    input.addEventListener('change', updateProgress);
    ['dragenter', 'dragover'].forEach((eventName) => {
      field.addEventListener(eventName, (event) => {
        event.preventDefault();
        field.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach((eventName) => {
      field.addEventListener(eventName, () => field.classList.remove('is-dragover'));
    });
    field.addEventListener('drop', (event) => {
      event.preventDefault();
      if (event.dataTransfer?.files?.length) {
        input.files = event.dataTransfer.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
}

export default ToolController;
