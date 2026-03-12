/**
 * DropZone Component
 * Reusable file upload dropzone with drag-drop support
 */

export class DropZone {
  constructor(element, options = {}) {
    this.element = typeof element === 'string' ? document.querySelector(element) : element;
    this.options = {
      accept: options.accept || '*',
      multiple: options.multiple !== false,
      maxSize: options.maxSize || 50 * 1024 * 1024,
      onDrop: options.onDrop || (() => {}),
      onError: options.onError || (() => {}),
      ...options
    };

    this.init();
  }

  init() {
    if (!this.element) return;

    this.element.classList.add('dropzone');
    
    // Prevent default drag behaviors
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      this.element.addEventListener(eventName, this.preventDefaults, false);
      document.body.addEventListener(eventName, this.preventDefaults, false);
    });

    // Highlight drop zone when dragging over
    ['dragenter', 'dragover'].forEach(eventName => {
      this.element.addEventListener(eventName, () => this.highlight(), false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      this.element.addEventListener(eventName, () => this.unhighlight(), false);
    });

    // Handle drop
    this.element.addEventListener('drop', (e) => this.handleDrop(e), false);

    // Handle file input
    const input = this.element.querySelector('input[type="file"]');
    if (input) {
      input.addEventListener('change', (e) => this.handleFiles(e.target.files), false);
    }
  }

  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  highlight() {
    this.element.classList.add('dropzone-active');
  }

  unhighlight() {
    this.element.classList.remove('dropzone-active');
  }

  handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    this.handleFiles(files);
  }

  handleFiles(files) {
    const fileArray = Array.from(files);
    
    // Validate files
    const validFiles = [];
    const errors = [];

    for (const file of fileArray) {
      // Check file type
      if (this.options.accept !== '*') {
        const acceptedTypes = this.options.accept.split(',').map(t => t.trim());
        const isAccepted = acceptedTypes.some(type => {
          if (type.includes('*')) {
            return file.type.startsWith(type.replace('/*', ''));
          }
          return file.type === type;
        });

        if (!isAccepted) {
          errors.push(`${file.name}: Invalid file type`);
          continue;
        }
      }

      // Check file size
      if (file.size > this.options.maxSize) {
        const maxMB = this.options.maxSize / (1024 * 1024);
        errors.push(`${file.name}: File too large (max ${maxMB}MB)`);
        continue;
      }

      validFiles.push(file);
    }

    // Report errors
    if (errors.length > 0) {
      this.options.onError(errors);
    }

    // Call handler with valid files
    if (validFiles.length > 0) {
      this.options.onDrop(this.options.multiple ? validFiles : validFiles[0]);
    }
  }

  /**
   * Reset the dropzone
   */
  reset() {
    const input = this.element.querySelector('input[type="file"]');
    if (input) input.value = '';
    this.element.classList.remove('dropzone-active');
  }

  /**
   * Destroy the dropzone
   */
  destroy() {
    // Clean up event listeners if needed
    this.element.classList.remove('dropzone', 'dropzone-active');
  }
}

export default DropZone;
