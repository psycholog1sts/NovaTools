/**
 * Validation Engine
 * Robust input validation with type checking and sanitization
 */

export class ValidationEngine {
  /**
   * Validate inputs against schema
   * @param {Object} inputs - Input values
   * @param {Array} schema - Validation schema
   * @returns {Object} Validation result
   */
  validate(inputs, schema) {
    const errors = [];
    const sanitized = {};

    for (const field of schema) {
      const value = inputs[field.name];
      const result = this.validateField(value, field);

      if (!result.valid) {
        errors.push(...result.errors);
      } else {
        sanitized[field.name] = result.value;
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      sanitized
    };
  }

  /**
   * Validate a single field
   * @param {*} value - Input value
   * @param {Object} field - Field schema
   * @returns {Object} Validation result
   */
  validateField(value, field) {
    const errors = [];
    let sanitizedValue = value;

    // Required check
    if (field.required && (value === undefined || value === null || value === '')) {
      return { valid: false, errors: [`${field.label || field.name} is required`] };
    }

    // Skip further validation if empty and not required
    if (!value && !field.required) {
      return { valid: true, value: field.default || null };
    }

    // Type validation
    switch (field.type) {
      case 'number': {
        const num = parseFloat(value);
        if (isNaN(num)) {
          errors.push(`${field.label || field.name} must be a valid number`);
        } else {
          sanitizedValue = num;
          
          // Min/max validation
          if (field.min !== undefined && num < field.min) {
            errors.push(`${field.label || field.name} must be at least ${field.min}`);
          }
          if (field.max !== undefined && num > field.max) {
            errors.push(`${field.label || field.name} must be at most ${field.max}`);
          }
        }
        break;
      }

      case 'integer': {
        const int = parseInt(value);
        if (isNaN(int)) {
          errors.push(`${field.label || field.name} must be a valid integer`);
        } else {
          sanitizedValue = int;
          
          if (field.min !== undefined && int < field.min) {
            errors.push(`${field.label || field.name} must be at least ${field.min}`);
          }
          if (field.max !== undefined && int > field.max) {
            errors.push(`${field.label || field.name} must be at most ${field.max}`);
          }
        }
        break;
      }

      case 'string':
        sanitizedValue = String(value).trim();
        
        if (field.minLength && sanitizedValue.length < field.minLength) {
          errors.push(`${field.label || field.name} must be at least ${field.minLength} characters`);
        }
        if (field.maxLength && sanitizedValue.length > field.maxLength) {
          errors.push(`${field.label || field.name} must be at most ${field.maxLength} characters`);
        }
        if (field.pattern && !field.pattern.test(sanitizedValue)) {
          errors.push(`${field.label || field.name} format is invalid`);
        }
        break;

      case 'select':
        if (field.options && !field.options.includes(value)) {
          errors.push(`${field.label || field.name} must be one of: ${field.options.join(', ')}`);
        }
        sanitizedValue = value;
        break;

      case 'file':
        if (field.accept && value) {
          const validType = field.accept.some(type => 
            value.type === type || value.name.endsWith(type.replace('*', ''))
          );
          if (!validType) {
            errors.push(`${field.label || field.name} must be one of: ${field.accept.join(', ')}`);
          }
        }
        if (field.maxSize && value && value.size > field.maxSize) {
          errors.push(`${field.label || field.name} must be smaller than ${this.formatBytes(field.maxSize)}`);
        }
        sanitizedValue = value;
        break;

      case 'boolean':
        sanitizedValue = Boolean(value);
        break;

      case 'array':
        if (!Array.isArray(value)) {
          errors.push(`${field.label || field.name} must be an array`);
        } else {
          sanitizedValue = value;
          if (field.minItems && value.length < field.minItems) {
            errors.push(`${field.label || field.name} must have at least ${field.minItems} items`);
          }
        }
        break;

      case 'date': {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          errors.push(`${field.label || field.name} must be a valid date`);
        } else {
          sanitizedValue = date;
        }
        break;
      }

      case 'email': {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(String(value))) {
          errors.push(`${field.label || field.name} must be a valid email address`);
        }
        sanitizedValue = String(value).trim().toLowerCase();
        break;
      }

      case 'percentage': {
        const pct = parseFloat(value);
        if (isNaN(pct)) {
          errors.push(`${field.label || field.name} must be a valid percentage`);
        } else {
          sanitizedValue = Math.max(0, Math.min(100, pct));
        }
        break;
      }

      case 'currency': {
        const currencyRegex = /^[A-Z]{3}$/;
        if (!currencyRegex.test(String(value).toUpperCase())) {
          errors.push(`${field.label || field.name} must be a valid 3-letter currency code`);
        }
        sanitizedValue = String(value).toUpperCase();
        break;
      }

      default:
        sanitizedValue = value;
    }

    // Custom validator
    if (field.validate && errors.length === 0) {
      const customResult = field.validate(sanitizedValue);
      if (customResult !== true) {
        errors.push(customResult || `${field.label || field.name} is invalid`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      value: sanitizedValue
    };
  }

  /**
   * Format bytes to human readable
   * @param {number} bytes - Bytes
   * @returns {string} Formatted size
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))  } ${  sizes[i]}`;
  }
}

// Default instance
export const validationEngine = new ValidationEngine();

export default validationEngine;
