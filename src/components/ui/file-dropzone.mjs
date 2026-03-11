/**
 * File Dropzone Web Component
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
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        
        .dropzone {
          border: 2px dashed #cbd5e1;
          border-radius: 0.75rem;
          padding: 2rem;
          text-align: center;
          transition: all 0.2s ease;
          background: #f8fafc;
          cursor: pointer;
        }
        
        .dropzone:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }
        
        .dropzone.drag-active {
          border-color: #3b82f6;
          background: #dbeafe;
          transform: scale(1.02);
        }
        
        .dropzone.drag-error {
          border-color: #ef4444;
          background: #fef2f2;
        }
        
        .icon {
          font-size: 3rem;
          margin-bottom: 0.75rem;
          line-height: 1;
        }
        
        .title {
          font-size: 1rem;
          font-weight: 500;
          color: #374151;
          margin-bottom: 0.25rem;
        }
        
        .hint {
          font-size: 0.875rem;
          color: #6b7280;
        }
        
        .file-list {
          margin-top: 1rem;
          text-align: left;
        }
        
        .file-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: white;
          border-radius: 0.5rem;
          margin-bottom: 0.5rem;
          border: 1px solid #e5e7eb;
          animation: slideIn 0.2s ease;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .file-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }
        
        .file-info {
          flex: 1;
          min-width: 0;
        }
        
        .file-name {
          font-weight: 500;
          color: #111827;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .file-size {
          font-size: 0.75rem;
          color: #6b7280;
        }
        
        .file-remove {
          background: none;
          border: none;
          color: #ef4444;
          cursor: pointer;
          padding: 0.25rem;
          font-size: 1.25rem;
          line-height: 1;
          border-radius: 0.25rem;
          transition: background 0.2s;
        }
        
        .file-remove:hover {
          background: #fef2f2;
        }
        
        .file-remove:focus {
          outline: 2px solid #ef4444;
          outline-offset: 2px;
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
          margin-top: 0.5rem;
          padding: 0.5rem;
          background: #fef2f2;
          border-radius: 0.375rem;
        }
      </style>
      
      <div class="dropzone" part="dropzone" role="button" tabindex="0" aria-label="Dosya yüklemek için tıklayın veya sürükleyin">
        <div class="icon" aria-hidden="true">📁</div>
        <div class="title">Dosyaları sürükleyin veya seçin</div>
        <div class="hint">En fazla ${this.maxSize / 1024 / 1024}MB • ${this.accept === '*' ? 'Tüm formatlar' : this.accept}</div>
        <input type="file" accept="${this.accept}" ${this.multiple ? 'multiple' : ''} aria-hidden="true">
      </div>
      
      <div class="file-list" part="file-list" role="list" aria-label="Yüklenen dosyalar"></div>
    `;
  }

  attachEvents() {
    const dropzone = this.shadowRoot.querySelector('.dropzone');
    const input = this.shadowRoot.querySelector('input[type="file"]');

    // Click to select
    dropzone.addEventListener('click', () => input.click());
    dropzone.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        input.click();
      }
    });

    // File selection
    input.addEventListener('change', (e) => {
      this.handleFiles(e.target.files);
      input.value = ''; // Reset for re-selection
    });

    // Drag and drop
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
    
    // Validate file count
    if (this.files.length + files.length > this.maxFiles) {
      this.showError(`En fazla ${this.maxFiles} dosya yükleyebilirsiniz`);
      return;
    }

    // Validate each file
    const validFiles = files.filter(file => {
      if (file.size > this.maxSize) {
        errors.push(`${file.name}: Boyut limiti aşıldı (${this.formatFileSize(this.maxSize)})`);
        return false;
      }
      
      if (this.accept !== '*') {
        const acceptedTypes = this.accept.split(',').map(t => t.trim());
        const isAccepted = acceptedTypes.some(type => {
          if (type.includes('*')) {
            return file.type.startsWith(type.replace('/*', ''));
          }
          return file.type === type;
        });
        
        if (!isAccepted) {
          errors.push(`${file.name}: Geçersiz dosya formatı`);
          return false;
        }
      }
      
      return true;
    });

    if (errors.length > 0) {
      this.showError(errors.join('\n'));
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
          aria-label="${file.name} dosyasını kaldır"
          title="Kaldır"
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
    return '📎';
  }

  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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
