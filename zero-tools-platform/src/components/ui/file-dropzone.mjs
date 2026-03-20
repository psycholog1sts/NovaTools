/**
 * File Dropzone Web Component - Premium Dark Mode
 * Shadow DOM isolated, zero style leakage
 */

class FileDropzone extends HTMLElement {
  static get observedAttributes() {
    return ['accept', 'max-size', 'max-files', 'multiple'];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open', delegatesFocus: true });
    this.files = [];
    this.dragCounter = 0;
  }

  connectedCallback() {
    this.render();
    this.attachEvents();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue) {
      this.render();
    }
  }

  get accept() {
    return this.getAttribute('accept') || '*';
  }

  get maxSize() {
    return parseInt(this.getAttribute('max-size') || '50', 10) * 1024 * 1024;
  }

  get maxFiles() {
    return parseInt(this.getAttribute('max-files') || '10', 10);
  }

  get multiple() {
    return this.hasAttribute('multiple');
  }

  render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        
        .dropzone {
          border: 2px dashed rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 2.5rem 2rem;
          text-align: center;
          transition: all 0.3s ease;
          background: rgba(255, 255, 255, 0.03);
          cursor: pointer;
          position: relative;
          overflow: hidden;
        }
        
        .dropzone::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent);
        }
        
        .dropzone:hover {
          border-color: rgba(99, 102, 241, 0.5);
          background: rgba(255, 255, 255, 0.06);
        }
        
        .dropzone.drag-active {
          border-color: #6366F1;
          background: rgba(99, 102, 241, 0.1);
          transform: scale(1.02);
          box-shadow: 0 0 30px rgba(99, 102, 241, 0.2);
        }
        
        .dropzone.drag-error {
          border-color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
        }
        
        .icon {
          width: 64px;
          height: 64px;
          margin: 0 auto 1rem;
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.1));
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          border: 1px solid rgba(99, 102, 241, 0.3);
        }
        
        .title {
          font-size: 1.0625rem;
          font-weight: 600;
          color: #FAFAFA;
          margin-bottom: 0.5rem;
        }
        
        .hint {
          font-size: 0.875rem;
          color: #71717A;
        }
        
        .hint span {
          color: #A1A1AA;
        }
        
        .file-list {
          margin-top: 1.5rem;
          text-align: left;
        }
        
        .file-item {
          display: flex;
          align-items: center;
          gap: 0.875rem;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
          margin-bottom: 0.625rem;
          border: 1px solid rgba(255, 255, 255, 0.06);
          animation: slideIn 0.25s ease;
          transition: all 0.2s ease;
        }
        
        .file-item:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.12);
        }
        
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .file-icon {
          width: 40px;
          height: 40px;
          background: rgba(99, 102, 241, 0.15);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
          border: 1px solid rgba(99, 102, 241, 0.2);
        }
        
        .file-info {
          flex: 1;
          min-width: 0;
        }
        
        .file-name {
          font-weight: 500;
          color: #FAFAFA;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 0.9375rem;
        }
        
        .file-size {
          font-size: 0.8125rem;
          color: #71717A;
          margin-top: 0.125rem;
        }
        
        .file-remove {
          width: 32px;
          height: 32px;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          color: #ef4444;
          cursor: pointer;
          border-radius: 6px;
          font-size: 1.125rem;
          line-height: 1;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .file-remove:hover {
          background: rgba(239, 68, 68, 0.2);
          border-color: rgba(239, 68, 68, 0.4);
        }
        
        input[type="file"] {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        
        .error-message {
          color: #ef4444;
          font-size: 0.875rem;
          margin-top: 0.75rem;
          padding: 0.75rem 1rem;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 8px;
        }
        
        .upload-progress {
          margin-top: 1rem;
        }
        
        .progress-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.06);
          border-radius: 2px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #6366F1, #8B5CF6);
          border-radius: 2px;
          transition: width 0.3s ease;
        }
      </style>
      
      <div class="dropzone" part="dropzone" role="button" tabindex="0" aria-label="Click or drag files to upload">
        <div class="icon" aria-hidden="true">📁</div>
        <div class="title">Drop files here or click to browse</div>
        <div class="hint">Max ${this.maxSize / 1024 / 1024}MB • <span>${this.accept === '*' ? 'All formats' : this.accept}</span></div>
        <input type="file" accept="${this.accept}" ${this.multiple ? 'multiple' : ''} aria-hidden="true">
      </div>
      
      <div class="file-list" part="file-list" role="list" aria-label="Uploaded files"></div>
    `;
  }

  attachEvents() {
    const dropzone = this.shadowRoot.querySelector('.dropzone');
    const input = this.shadowRoot.querySelector('input[type="file"]');

    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        input.click();
      }
    });

    input.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
      input.value = '';
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
      }, false);
    });

    ['dragenter', 'dragover'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => {
        this.dragCounter++;
        dropzone.classList.add('drag-active');
      }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
      dropzone.addEventListener(eventName, () => {
        this.dragCounter--;
        if (this.dragCounter === 0) {
          dropzone.classList.remove('drag-active');
        }
      }, false);
    });

    dropzone.addEventListener('drop', (e) => {
      this.dragCounter = 0;
      dropzone.classList.remove('drag-active');
      this.handleFiles(e.dataTransfer.files);
    }, false);
  }

  handleFiles(fileList) {
    const files = Array.from(fileList);
    const errors = [];
    
    if (this.files.length + files.length > this.maxFiles) {
      this.showError(`Maximum ${this.maxFiles} files allowed`);
      return;
    }

    const validFiles = files.filter(file => {
      if (file.size > this.maxSize) {
        errors.push(`${file.name}: File too large (max ${this.formatFileSize(this.maxSize)})`);
        return false;
      }
      
      if (this.accept !== '*') {
        const acceptedTypes = this.accept.split(',').map(t => t.trim());
        const isAccepted = acceptedTypes.some(type => {
          if (type.includes('*')) {
            return file.type.startsWith(type.replace('/*', ''));
          }
          return file.type === type || file.name.endsWith(type.replace('.', ''));
        });
        
        if (!isAccepted) {
          errors.push(`${file.name}: Invalid file type`);
          return false;
        }
      }
      
      return true;
    });

    if (errors.length > 0) {
      this.showError(errors.join('. '));
    }

    if (validFiles.length === 0) return;

    this.files = [...this.files, ...validFiles];
    this.renderFileList();
    this.clearError();

    this.dispatchEvent(new CustomEvent('files-selected', {
      detail: { 
        files: this.files,
        newFiles: validFiles 
      },
      bubbles: true,
      composed: true
    }));
  }

  renderFileList() {
    const list = this.shadowRoot.querySelector('.file-list');
    
    if (this.files.length === 0) {
      list.innerHTML = '';
      return;
    }

    list.innerHTML = this.files.map((file, index) => `
      <div class="file-item" role="listitem">
        <span class="file-icon" aria-hidden="true">${this.getFileIcon(file.type)}</span>
        <div class="file-info">
          <div class="file-name" title="${file.name}">${file.name}</div>
          <div class="file-size">${this.formatFileSize(file.size)}</div>
        </div>
        <button 
          class="file-remove" 
          data-index="${index}" 
          aria-label="Remove ${file.name}"
          title="Remove"
        >×</button>
      </div>
    `).join('');

    list.querySelectorAll('.file-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const index = parseInt(e.target.dataset.index);
        const removedFile = this.files[index];
        this.files.splice(index, 1);
        this.renderFileList();
        
        this.dispatchEvent(new CustomEvent('file-removed', {
          detail: { file: removedFile, files: this.files },
          bubbles: true,
          composed: true
        }));
        
        this.dispatchEvent(new CustomEvent('files-selected', {
          detail: { files: this.files },
          bubbles: true,
          composed: true
        }));
      });
    });
  }

  getFileIcon(mimeType) {
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('image')) return '🖼️';
    if (mimeType.includes('text')) return '📝';
    if (mimeType.includes('json')) return '📋';
    if (mimeType.includes('zip') || mimeType.includes('compressed')) return '📦';
    return '📎';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }

  showError(message) {
    this.clearError();
    const dropzone = this.shadowRoot.querySelector('.dropzone');
    const errorEl = document.createElement('div');
    errorEl.className = 'error-message';
    errorEl.textContent = message;
    errorEl.setAttribute('role', 'alert');
    dropzone.after(errorEl);
    
    dropzone.classList.add('drag-error');
    setTimeout(() => dropzone.classList.remove('drag-error'), 300);
  }

  clearError() {
    const error = this.shadowRoot.querySelector('.error-message');
    if (error) error.remove();
    const dropzone = this.shadowRoot.querySelector('.dropzone');
    dropzone.classList.remove('drag-error');
  }

  clear() {
    this.files = [];
    this.renderFileList();
    this.clearError();
  }

  getFiles() {
    return [...this.files];
  }
}

customElements.define('file-dropzone', FileDropzone);

export default FileDropzone;
