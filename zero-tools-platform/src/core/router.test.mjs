import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  loadToolMeta,
  getVendorForCategory,
  generateBreadcrumb
} from './router.mjs';

describe('Router Module', () => {
  beforeEach(() => {
    // Reset fetch mock
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getVendorForCategory', () => {
    it('returns correct vendor for pdf category', () => {
      expect(getVendorForCategory('pdf')).toBe('pdf-vendor');
    });

    it('returns correct vendor for finance category', () => {
      expect(getVendorForCategory('finance')).toBe('finance-vendor');
    });

    it('returns correct vendor for image category', () => {
      expect(getVendorForCategory('image')).toBe('image-vendor');
    });

    it('returns null for unknown category', () => {
      expect(getVendorForCategory('unknown')).toBeNull();
    });
  });

  describe('loadToolMeta', () => {
    it('fetches and returns tool metadata', async () => {
      const mockMeta = {
        id: 'test-tool',
        name: 'Test Tool',
        category: 'pdf'
      };

      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMeta)
        })
      );

      const result = await loadToolMeta('pdf/test');
      expect(result).toEqual(mockMeta);
      expect(fetch).toHaveBeenCalledWith('/meta/pdf/test.json');
    });

    it('returns null on fetch error', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 404
        })
      );

      const result = await loadToolMeta('nonexistent/tool');
      expect(result).toBeNull();
    });

    it('returns cached result on second call', async () => {
      const mockMeta = { id: 'cached-tool', name: 'Cached' };
      
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMeta)
        })
      );

      await loadToolMeta('pdf/cached');
      await loadToolMeta('pdf/cached');
      
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('generateBreadcrumb', () => {
    it('generates breadcrumb HTML', () => {
      // Mock document
      document.body.innerHTML = '<div id="breadcrumb"></div>';
      
      generateBreadcrumb('pdf', 'PDF Merge');
      
      const breadcrumb = document.getElementById('breadcrumb');
      expect(breadcrumb.innerHTML).toContain('Ana Sayfa');
      expect(breadcrumb.innerHTML).toContain('PDF Araçları');
      expect(breadcrumb.innerHTML).toContain('PDF Merge');
    });
  });
});
