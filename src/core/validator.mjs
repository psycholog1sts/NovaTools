/**
 * Validation Module
 * Input validation with detailed error reporting
 */

import { errorHandler } from './error-handler.mjs';

class Validator {
  constructor() {
    this.rules = new Map();
    this.registerDefaultRules();
  }

  /**
   * Register default validation rules
   */
  registerDefaultRules() {
    this.rules.set('required', (value) => ({
      valid: value !== null && value !== undefined && value !== '',
      message: 'This field is required'
    }));

    this.rules.set('number', (value) => ({
      valid: !isNaN(parseFloat(value)) && isFinite(value),
      message: 'Must be a valid number'
    }));

    this.rules.set('positive', (value) => ({
      valid: parseFloat(value) > 0,
      message: 'Must be greater than 0'
    }));

    this.rules.set('nonNegative', (value) => ({
      valid: parseFloat(value) >= 0,
      message: 'Must be 0 or greater'
    }));

    this.rules.set('integer', (value) => ({
      valid: Number.isInteger(parseFloat(value)),
      message: 'Must be a whole number'
    }));
  }

  /**
   * Register a custom validation rule
   * @param {string} name - Rule name
   * @param {Function} validator - Validation function
   */
  register(name, validator) {
    this.rules.set(name, validator);
  }

  /**
   * Validate a single value
   * @param {*} value - Value to validate
   * @param {string|Array} rules - Validation rules
   * @param {Object} options - Validation options
   * @returns {Object} Validation result
   */
  validate(value, rules, options = {}) {
    const errors = [];
    const ruleList = Array.isArray(rules) ? rules : [rules];

    for (const rule of ruleList) {
      let ruleName, ruleOptions;

      if (typeof rule === 'string') {
        ruleName = rule;
        ruleOptions = {};
      } else if (typeof rule === 'object') {
        ruleName = rule.name;
        ruleOptions = rule.options || {};
      }

      // Skip required check for empty values (unless required is explicitly set)
      if (ruleName !== 'required' && (value === null || value === undefined || value === '')) {
        continue;
      }

      // Get validator function
      let validator = this.rules.get(ruleName);

      // Handle custom function
      if (typeof rule === 'function') {
        validator = rule;
      }

      if (!validator) {
        console.warn(`Unknown validation rule: ${ruleName}`);
        continue;
      }

      // Run validation
      const result = validator(value, ruleOptions);

      if (!result.valid) {
        errors.push(result.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      value: this.sanitize(value, options.sanitize)
    };
  }

  /**
   * Validate multiple fields
   * @param {Object} data - Data object to validate
   * @param {Object} schema - Validation schema
   * @returns {Object} Validation result
   */
  validateSchema(data, schema) {
    const errors = {};
    const sanitized = {};
    let isValid = true;

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field];
      const result = this.validate(value, rules, { field });

      if (!result.valid) {
        errors[field] = result.errors;
        isValid = false;
      }

      sanitized[field] = result.value;
    }

    return {
      valid: isValid,
      errors: isValid ? null : errors,
      data: sanitized
    };
  }

  /**
   * Sanitize a value
   * @param {*} value - Value to sanitize
   * @param {string} type - Sanitization type
   * @returns {*} Sanitized value
   */
  sanitize(value, type) {
    if (!type) return value;

    switch (type) {
      case 'number':
        return parseFloat(value);
      case 'integer':
        return parseInt(value, 10);
      case 'string':
        return String(value).trim();
      case 'boolean':
        return Boolean(value);
      default:
        return value;
    }
  }

  /**
   * Create a range validator
   * @param {number} min - Minimum value
   * @param {number} max - Maximum value
   * @returns {Function} Validator function
   */
  range(min, max) {
    return (value) => ({
      valid: parseFloat(value) >= min && parseFloat(value) <= max,
      message: `Must be between ${min} and ${max}`
    });
  }

  /**
   * Create a min value validator
   * @param {number} min - Minimum value
   * @returns {Function} Validator function
   */
  min(min) {
    return (value) => ({
      valid: parseFloat(value) >= min,
      message: `Must be at least ${min}`
    });
  }

  /**
   * Create a max value validator
   * @param {number} max - Maximum value
   * @returns {Function} Validator function
   */
  max(max) {
    return (value) => ({
      valid: parseFloat(value) <= max,
      message: `Must be at most ${max}`
    });
  }

  /**
   * Create a pattern validator
   * @param {RegExp} regex - Regular expression
   * @param {string} message - Error message
   * @returns {Function} Validator function
   */
  pattern(regex, message) {
    return (value) => ({
      valid: regex.test(String(value)),
      message: message || 'Invalid format'
    });
  }

  /**
   * Create an enum validator
   * @param {Array} values - Allowed values
   * @returns {Function} Validator function
   */
  enum(values) {
    return (value) => ({
      valid: values.includes(value),
      message: `Must be one of: ${values.join(', ')}`
    });
  }
}

// Tool-specific validation schemas
export const ToolSchemas = {
  mortgage: {
    balance: ['required', 'number', 'positive', { name: 'max', options: { max: 100000000 } }],
    currentRate: ['required', 'number', { name: 'min', options: { min: 0 } }, { name: 'max', options: { max: 100 } }],
    newRate: ['required', 'number', { name: 'min', options: { min: 0 } }, { name: 'max', options: { max: 100 } }],
    yearsRemaining: ['required', 'number', 'integer', { name: 'min', options: { min: 1 } }, { name: 'max', options: { max: 50 } }],
    newTerm: ['required', 'number', 'integer', { name: 'min', options: { min: 1 } }, { name: 'max', options: { max: 50 } }],
    closingCosts: ['required', 'number', 'nonNegative']
  },

  compoundInterest: {
    principal: ['required', 'number', 'nonNegative', { name: 'max', options: { max: 1000000000 } }],
    rate: ['required', 'number', { name: 'min', options: { min: 0 } }, { name: 'max', options: { max: 1000 } }],
    years: ['required', 'number', 'integer', { name: 'min', options: { min: 1 } }, { name: 'max', options: { max: 100 } }],
    monthlyContribution: ['number', 'nonNegative']
  },

  cloudCost: {
    instances: ['required', 'number', 'integer', 'positive', { name: 'max', options: { max: 1000 } }],
    storage: ['required', 'number', 'nonNegative', { name: 'max', options: { max: 100000 } }],
    bandwidth: ['required', 'number', 'nonNegative', { name: 'max', options: { max: 1000000 } }],
    hours: ['required', 'number', 'integer', { name: 'min', options: { min: 1 } }, { name: 'max', options: { max: 24 } }]
  }
};

// Singleton instance
export const validator = new Validator();

export default validator;
