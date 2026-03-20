/**
 * Tool Bridge System
 * Connects HTML forms to the Tool Controller framework
 * Provides unified form handling, validation, and result rendering
 */

import { toolController, executeTool } from './tool-controller.mjs';
import { toast } from '../components/toast.mjs';
import { loading } from '../components/loading.mjs';
import { ErrorHandler } from './error-handler.mjs';

/**
 * Tool Bridge - Manages form-to-tool binding
 */
export class ToolBridge {
  constructor(formElement, toolId, options = {}) {
    this.form = typeof formElement === 'string' 
      ? document.querySelector(formElement) 
      : formElement;
    
    if (!this.form) {
      throw new Error(`ToolBridge: Form not found for selector: ${formElement}`);
    }

    this.toolId = toolId;
    this.options = {
      resultContainer: options.resultContainer || '.results-panel',
      submitButton: options.submitButton || 'button[type="submit"], .calculate-btn',
      showLoading: options.showLoading !== false,
      showToast: options.showToast !== false,
      scrollToResults: options.scrollToResults !== false,
      ...options
    };

    this.submitButton = this.form.querySelector(this.options.submitButton);
    this.resultContainer = typeof this.options.resultContainer === 'string'
      ? document.querySelector(this.options.resultContainer)
      : this.options.resultContainer;

    this.init();
  }

  /**
   * Initialize the bridge
   */
  init() {
    // Bind form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    
    // Bind input validation on blur
    this.form.querySelectorAll('input, select, textarea').forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearFieldError(input));
    });
  }

  /**
   * Handle form submission
   */
  async handleSubmit(e) {
    e.preventDefault();

    // Collect form data
    const formData = new FormData(this.form);
    const inputs = this.parseInputs(formData);

    // Validate all fields
    const validation = this.validateAll(inputs);
    if (!validation.valid) {
      this.showValidationErrors(validation.errors);
      return;
    }

    // Show loading state
    let restoreButton = null;
    if (this.options.showLoading && this.submitButton) {
      restoreButton = loading.button(this.submitButton);
    }

    try {
      // Execute tool through controller
      const result = await executeTool(this.toolId, inputs);

      if (result.success) {
        this.handleSuccess(result.data);
      } else {
        this.handleError(result.error);
      }
    } catch (error) {
      ErrorHandler.handle(error, `ToolBridge: ${this.toolId}`);
      this.handleError({ message: error.message });
    } finally {
      if (restoreButton) restoreButton();
    }
  }

  /**
   * Parse form inputs based on input types
   */
  parseInputs(formData) {
    const inputs = {};
    const toolConfig = toolController.getToolConfig(this.toolId);
    
    if (!toolConfig || !toolConfig.inputs) {
      // Fallback: parse all form fields as strings
      formData.forEach((value, key) => {
        inputs[key] = value;
      });
      return inputs;
    }

    // Parse based on schema
    for (const field of toolConfig.inputs) {
      let value = formData.get(field.name);

      // Handle file inputs
      if (field.type === 'file' && this.form.querySelector(`[name="${field.name}"]`)) {
        const fileInput = this.form.querySelector(`[name="${field.name}"]`);
        if (fileInput.files.length > 0) {
          value = fileInput.files[0];
        }
      }

      // Handle arrays
      if (field.type === 'array') {
        value = formData.getAll(field.name);
      }

      // Parse numbers
      if (field.type === 'number' || field.type === 'integer' || field.type === 'percentage') {
        value = value === '' ? null : parseFloat(value);
      }

      // Parse booleans
      if (field.type === 'boolean') {
        value = value === 'on' || value === 'true' || value === true;
      }

      inputs[field.name] = value;
    }

    return inputs;
  }

  /**
   * Validate all inputs
   */
  validateAll(inputs) {
    const toolConfig = toolController.getToolConfig(this.toolId);
    if (!toolConfig || !toolConfig.inputs) {
      return { valid: true, errors: [] };
    }

    const errors = [];

    for (const field of toolConfig.inputs) {
      const value = inputs[field.name];
      
      // Required check
      if (field.required && (value === undefined || value === null || value === '')) {
        errors.push({ field: field.name, message: `${field.label} is required` });
        continue;
      }

      // Skip if empty and not required
      if (!value && !field.required) continue;

      // Type-specific validation
      const fieldError = this.validateFieldType(value, field);
      if (fieldError) {
        errors.push({ field: field.name, message: fieldError });
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate a single field type
   */
  validateFieldType(value, field) {
    switch (field.type) {
      case 'number':
      case 'percentage':
        if (isNaN(parseFloat(value))) {
          return `${field.label} must be a valid number`;
        }
        if (field.min !== undefined && parseFloat(value) < field.min) {
          return `${field.label} must be at least ${field.min}`;
        }
        if (field.max !== undefined && parseFloat(value) > field.max) {
          return `${field.label} must be at most ${field.max}`;
        }
        break;

      case 'integer':
        if (!Number.isInteger(parseFloat(value))) {
          return `${field.label} must be a whole number`;
        }
        if (field.min !== undefined && parseInt(value) < field.min) {
          return `${field.label} must be at least ${field.min}`;
        }
        if (field.max !== undefined && parseInt(value) > field.max) {
          return `${field.label} must be at most ${field.max}`;
        }
        break;

      case 'string':
        if (field.minLength && String(value).length < field.minLength) {
          return `${field.label} must be at least ${field.minLength} characters`;
        }
        if (field.maxLength && String(value).length > field.maxLength) {
          return `${field.label} must be at most ${field.maxLength} characters`;
        }
        break;

      case 'file':
        if (value instanceof File) {
          if (field.maxSize && value.size > field.maxSize) {
            return `${field.label} must be smaller than ${this.formatBytes(field.maxSize)}`;
          }
          if (field.accept && !field.accept.includes(value.type)) {
            return `${field.label} must be one of: ${field.accept.join(', ')}`;
          }
        }
        break;
    }

    return null;
  }

  /**
   * Validate a single field (for blur events)
   */
  validateField(input) {
    const toolConfig = toolController.getToolConfig(this.toolId);
    if (!toolConfig) return;

    const field = toolConfig.inputs.find(f => f.name === input.name);
    if (!field) return;

    const error = this.validateFieldType(input.value, field);
    if (error) {
      this.showFieldError(input, error);
    }
  }

  /**
   * Show field error
   */
  showFieldError(input, message) {
    input.classList.add('error');
    
    let errorEl = input.parentElement.querySelector('.field-error');
    if (!errorEl) {
      errorEl = document.createElement('span');
      errorEl.className = 'field-error';
      input.parentElement.appendChild(errorEl);
    }
    errorEl.textContent = message;
    errorEl.style.color = 'var(--error)';
    errorEl.style.fontSize = '0.875rem';
    errorEl.style.marginTop = '0.25rem';
  }

  /**
   * Clear field error
   */
  clearFieldError(input) {
    input.classList.remove('error');
    const errorEl = input.parentElement.querySelector('.field-error');
    if (errorEl) {
      errorEl.remove();
    }
  }

  /**
   * Show validation errors
   */
  showValidationErrors(errors) {
    errors.forEach(({ field, message }) => {
      const input = this.form.querySelector(`[name="${field}"]`);
      if (input) {
        this.showFieldError(input, message);
      }
    });

    if (this.options.showToast) {
      toast.error('Please fix the errors in the form');
    }
  }

  /**
   * Handle successful execution
   */
  handleSuccess(data) {
    if (this.resultContainer) {
      // If data has HTML, render it
      if (data.html) {
        this.resultContainer.innerHTML = data.html;
      } else {
        this.resultContainer.innerHTML = this.formatResult(data);
      }

      this.resultContainer.style.display = 'block';
      this.resultContainer.classList.add('visible');

      if (this.options.scrollToResults) {
        this.resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    if (this.options.showToast) {
      toast.success('Calculation completed successfully');
    }

    // Dispatch custom event
    this.form.dispatchEvent(new CustomEvent('tool-complete', { 
      detail: { toolId: this.toolId, data },
      bubbles: true 
    }));
  }

  /**
   * Handle execution error
   */
  handleError(error) {
    if (this.options.showToast) {
      toast.error(error.message || 'An error occurred during calculation');
    }

    // Dispatch custom event
    this.form.dispatchEvent(new CustomEvent('tool-error', { 
      detail: { toolId: this.toolId, error },
      bubbles: true 
    }));
  }

  /**
   * Format result data as HTML (fallback)
   */
  formatResult(data) {
    let html = '<div class="results">';
    
    for (const [key, value] of Object.entries(data)) {
      if (key === 'html' || key === 'chart' || key === 'raw') continue;
      
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      const formatted = typeof value === 'number' 
        ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : value;
      
      html += `
        <div class="result-row">
          <span class="result-label">${label}:</span>
          <span class="result-value">${formatted}</span>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
  }

  /**
   * Destroy the bridge
   */
  destroy() {
    // Clean up event listeners if needed
  }
}

/**
 * Auto-initialize tool bridges on DOM ready
 * Looks for forms with data-tool attribute
 */
export function initToolBridges() {
  document.querySelectorAll('form[data-tool]').forEach(form => {
    const toolId = form.dataset.tool;
    if (toolId) {
      new ToolBridge(form, toolId, {
        resultContainer: form.dataset.result || '.results-panel',
        scrollToResults: form.dataset.scroll !== 'false'
      });
    }
  });
}

// Auto-init on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initToolBridges);
} else {
  initToolBridges();
}

export default ToolBridge;
