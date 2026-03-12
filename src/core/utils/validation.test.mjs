import { describe, it, expect } from 'vitest';

/**
 * Validation Utilities Tests
 */

// Mortgage validation
const validateMortgageInput = (input) => {
  const errors = [];
  
  if (!input.loanAmount || input.loanAmount <= 0) {
    errors.push('Loan amount must be greater than 0');
  }
  if (input.loanAmount > 100_000_000) {
    errors.push('Loan amount exceeds maximum limit');
  }
  if (!input.interestRate || input.interestRate < 0 || input.interestRate > 100) {
    errors.push('Interest rate must be between 0 and 100');
  }
  if (!input.loanTerm || input.loanTerm < 1 || input.loanTerm > 50) {
    errors.push('Loan term must be between 1 and 50 years');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Email validation
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// File validation
const validateFile = (file, options = {}) => {
  const { maxSize = 10 * 1024 * 1024, allowedTypes = [] } = options;
  const errors = [];
  
  if (!file) {
    errors.push('No file provided');
    return { isValid: false, errors };
  }
  
  if (file.size > maxSize) {
    errors.push(`File size exceeds ${maxSize / 1024 / 1024}MB limit`);
  }
  
  if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
    errors.push(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

// Number formatting
const formatCurrency = (amount, currency = 'USD') => {
  if (typeof amount !== 'number' || isNaN(amount)) return '$0.00';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
};

const formatPercent = (value, decimals = 2) => {
  if (typeof value !== 'number' || isNaN(value)) return '0%';
  return `${value.toFixed(decimals)}%`;
};

describe('Validation Utilities', () => {
  describe('validateMortgageInput', () => {
    it('should validate correct mortgage input', () => {
      const input = {
        loanAmount: 300000,
        interestRate: 4.5,
        loanTerm: 30
      };
      const result = validateMortgageInput(input);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject negative loan amount', () => {
      const input = {
        loanAmount: -1000,
        interestRate: 4.5,
        loanTerm: 30
      };
      const result = validateMortgageInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Loan amount must be greater than 0');
    });

    it('should reject excessive loan amount', () => {
      const input = {
        loanAmount: 200_000_000,
        interestRate: 4.5,
        loanTerm: 30
      };
      const result = validateMortgageInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Loan amount exceeds maximum limit');
    });

    it('should reject invalid interest rate', () => {
      const input = {
        loanAmount: 300000,
        interestRate: 150,
        loanTerm: 30
      };
      const result = validateMortgageInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Interest rate must be between 0 and 100');
    });

    it('should reject invalid loan term', () => {
      const input = {
        loanAmount: 300000,
        interestRate: 4.5,
        loanTerm: 0
      };
      const result = validateMortgageInput(input);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Loan term must be between 1 and 50 years');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('missing@domain')).toBe(false);
      expect(validateEmail('@nodomain.com')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('validateFile', () => {
    it('should validate file within size limit', () => {
      const file = { size: 1024 * 1024, type: 'application/pdf' }; // 1MB
      const result = validateFile(file, { maxSize: 5 * 1024 * 1024, allowedTypes: ['application/pdf'] });
      expect(result.isValid).toBe(true);
    });

    it('should reject file exceeding size limit', () => {
      const file = { size: 20 * 1024 * 1024, type: 'application/pdf' }; // 20MB
      const result = validateFile(file, { maxSize: 10 * 1024 * 1024, allowedTypes: ['application/pdf'] });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('File size exceeds');
    });

    it('should reject invalid file type', () => {
      const file = { size: 1024, type: 'image/png' };
      const result = validateFile(file, { allowedTypes: ['application/pdf'] });
      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Invalid file type');
    });

    it('should handle missing file', () => {
      const result = validateFile(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('No file provided');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should handle invalid input', () => {
      expect(formatCurrency(null)).toBe('$0.00');
      expect(formatCurrency(undefined)).toBe('$0.00');
      expect(formatCurrency('invalid')).toBe('$0.00');
      expect(formatCurrency(NaN)).toBe('$0.00');
    });
  });

  describe('formatPercent', () => {
    it('should format percentage correctly', () => {
      expect(formatPercent(4.5)).toBe('4.50%');
      expect(formatPercent(100)).toBe('100.00%');
      expect(formatPercent(0)).toBe('0.00%');
    });

    it('should handle custom decimal places', () => {
      expect(formatPercent(4.567, 1)).toBe('4.6%');
      expect(formatPercent(4.567, 0)).toBe('5%');
    });

    it('should handle invalid input', () => {
      expect(formatPercent(null)).toBe('0%');
      expect(formatPercent(undefined)).toBe('0%');
    });
  });
});

export { validateMortgageInput, validateEmail, validateFile, formatCurrency, formatPercent };
