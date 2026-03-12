/**
 * Error Handler Module
 * Centralized error handling with user-friendly messages
 */

import { getConfig } from './config.mjs';

export class ErrorHandler {
  constructor() {
    this.errorTypes = new Map();
    this.globalHandler = null;
    this.setupGlobalHandler();
  }

  /**
   * Setup global error handlers
   */
  setupGlobalHandler() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.handle(event.error, { 
        type: 'global',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno 
      });
      return false;
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.handle(event.reason, { type: 'promise' });
      return false;
    });
  }

  /**
   * Register error type handler
   * @param {string} type - Error type
   * @param {Function} handler - Handler function
   */
  register(type, handler) {
    this.errorTypes.set(type, handler);
  }

  /**
   * Handle an error
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   */
  handle(error, context = {}) {
    const errorInfo = this.parseError(error, context);
    
    // Log to console for developers
    this.log(errorInfo);
    
    // Show user-friendly message
    this.showUserMessage(errorInfo);
    
    // Call specific handler if registered
    if (errorInfo.type && this.errorTypes.has(errorInfo.type)) {
      this.errorTypes.get(errorInfo.type)(errorInfo);
    }
    
    return errorInfo;
  }

  /**
   * Parse error into structured format
   * @param {Error} error - Error object
   * @param {Object} context - Error context
   * @returns {Object} Structured error info
   */
  parseError(error, context) {
    const isError = error instanceof Error;
    
    return {
      type: context.type || (isError ? error.name : 'unknown'),
      message: isError ? error.message : String(error),
      stack: isError ? error.stack : null,
      code: error?.code || null,
      context: { ...context },
      timestamp: new Date().toISOString(),
      userMessage: this.getUserMessage(error, context),
      severity: this.getSeverity(error, context)
    };
  }

  /**
   * Get severity level
   * @param {Error} error - Error
   * @param {Object} context - Context
   * @returns {string} Severity level
   */
  getSeverity(error, context) {
    if (context.type === 'validation') return 'warning';
    if (context.type === 'api') return 'error';
    if (error instanceof TypeError || error instanceof ReferenceError) return 'critical';
    return 'error';
  }

  /**
   * Get user-friendly error message
   * @param {Error} error - Error
   * @param {Object} context - Context
   * @returns {string} User message
   */
  getUserMessage(error, context) {
    const messages = {
      validation: 'Please check your input and try again.',
      api: 'Unable to fetch data. Please check your connection.',
      file: 'File processing failed. Please try a different file.',
      calculation: 'Calculation error. Please check your numbers.',
      network: 'Network connection lost. Please try again.',
      global: 'An unexpected error occurred. Please refresh the page.',
      promise: 'An operation failed to complete. Please try again.'
    };

    return messages[context.type] || messages.global;
  }

  /**
   * Log error to console
   * @param {Object} errorInfo - Error information
   */
  log(errorInfo) {
    const consoleMethod = errorInfo.severity === 'critical' ? 'error' : 'warn';
    
    console[consoleMethod]('[%s] %s: %s', 
      errorInfo.timestamp, 
      errorInfo.type, 
      errorInfo.message,
      errorInfo.context
    );
    
    if (errorInfo.stack) {
      console[consoleMethod]('Stack:', errorInfo.stack);
    }
  }

  /**
   * Show error message to user
   * @param {Object} errorInfo - Error information
   */
  showUserMessage(errorInfo) {
    // Check if toast notification system is available
    if (window.showToast) {
      window.showToast({
        type: errorInfo.severity === 'warning' ? 'warning' : 'error',
        message: errorInfo.userMessage,
        duration: getConfig('ui.toastDuration', 5000)
      });
      return;
    }

    // Fallback to alert for critical errors
    if (errorInfo.severity === 'critical') {
      alert(errorInfo.userMessage);
    }
  }

  /**
   * Create a validation error
   * @param {string} field - Field name
   * @param {string} message - Error message
   * @returns {Error} Validation error
   */
  validationError(field, message) {
    const error = new Error(message);
    error.name = 'ValidationError';
    error.field = field;
    error.code = 'VALIDATION_FAILED';
    return error;
  }

  /**
   * Create an API error
   * @param {string} message - Error message
   * @param {number} status - HTTP status
   * @returns {Error} API error
   */
  apiError(message, status) {
    const error = new Error(message);
    error.name = 'APIError';
    error.status = status;
    error.code = 'API_FAILED';
    return error;
  }

  /**
   * Wrap async function with error handling
   * @param {Function} fn - Function to wrap
   * @param {Object} context - Error context
   * @returns {Function} Wrapped function
   */
  wrap(fn, context = {}) {
    return async (...args) => {
      try {
        return await fn(...args);
      } catch (error) {
        this.handle(error, context);
        throw error;
      }
    };
  }
}

// Singleton instance
export const errorHandler = new ErrorHandler();

export default errorHandler;
