import { describe, it, expect } from 'vitest';

/**
 * Formatter Utilities Tests
 */

// Number formatter
const formatNumber = (num, options = {}) => {
  const { decimals = 0, locale = 'en-US' } = options;
  
  if (typeof num !== 'number' || isNaN(num)) return '0';
  
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

// File size formatter
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 B';
  if (!bytes || isNaN(bytes) || bytes < 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

// Date formatter
const formatDate = (date, options = {}) => {
  const d = date instanceof Date ? date : new Date(date);
  
  if (isNaN(d.getTime())) return 'Invalid date';
  
  const { format = 'short' } = options;
  
  if (format === 'short') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
  
  if (format === 'long') {
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
  
  return d.toISOString().split('T')[0];
};

// Slug generator
const slugify = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

// Truncate text
const truncate = (text, maxLength = 100, suffix = '...') => {
  if (!text || typeof text !== 'string') return '';
  if (text.length <= maxLength) return text;
  
  return text.substring(0, maxLength).trim() + suffix;
};

describe('Formatters', () => {
  describe('formatNumber', () => {
    it('should format numbers correctly', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1234567.89, { decimals: 2 })).toBe('1,234,567.89');
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle invalid input', () => {
      expect(formatNumber(null)).toBe('0');
      expect(formatNumber(undefined)).toBe('0');
      expect(formatNumber('invalid')).toBe('0');
      expect(formatNumber(NaN)).toBe('0');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes correctly', () => {
      expect(formatFileSize(0)).toBe('0 B');
      expect(formatFileSize(1024)).toBe('1 KB');
      expect(formatFileSize(1024 * 1024)).toBe('1 MB');
      expect(formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
    });

    it('should handle decimal values', () => {
      expect(formatFileSize(1536)).toBe('1.5 KB');
      expect(formatFileSize(1572864)).toBe('1.5 MB');
    });

    it('should handle invalid input', () => {
      expect(formatFileSize(null)).toBe('0 B');
      expect(formatFileSize(undefined)).toBe('0 B');
      expect(formatFileSize(-1)).toBe('0 B');
    });
  });

  describe('formatDate', () => {
    it('should format dates correctly', () => {
      const date = new Date('2025-01-15');
      expect(formatDate(date)).toContain('Jan');
      expect(formatDate(date)).toContain('2025');
    });

    it('should handle string dates', () => {
      expect(formatDate('2025-01-15')).toContain('Jan');
    });

    it('should handle invalid dates', () => {
      expect(formatDate('invalid')).toBe('Invalid date');
      // null creates epoch date - check it returns a date string
      const nullResult = formatDate(null);
      expect(typeof nullResult === 'string').toBe(true);
    });
  });

  describe('slugify', () => {
    it('should create correct slugs', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
      expect(slugify('Special!@#Characters')).toBe('specialcharacters');
    });

    it('should handle edge cases', () => {
      expect(slugify('')).toBe('');
      expect(slugify(null)).toBe('');
      expect(slugify(undefined)).toBe('');
      expect(slugify(123)).toBe('');
    });
  });

  describe('truncate', () => {
    it('should truncate long text', () => {
      const text = 'This is a very long text that needs to be truncated';
      expect(truncate(text, 20)).toBe('This is a very long...');
    });

    it('should not truncate short text', () => {
      const text = 'Short';
      expect(truncate(text, 100)).toBe('Short');
    });

    it('should handle custom suffix', () => {
      const text = 'This is a very long text';
      // Truncate cuts at maxLength then adds suffix
      const result = truncate(text, 10, '...more');
      expect(result.endsWith('...more')).toBe(true);
      expect(result.length).toBeLessThanOrEqual(10 + '...more'.length);
    });
  });
});

export { formatNumber, formatFileSize, formatDate, slugify, truncate };
