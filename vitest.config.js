import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,mjs,ts}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.mjs'],
      exclude: [
        'src/**/*.test.mjs',
        'src/**/*.spec.mjs',
        'src/components/**/*.mjs'
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80
      }
    },
    
    // Test timeout for async operations
    testTimeout: 10000,
    
    // Setup files
    setupFiles: ['./tests/setup.mjs'],
    
    // Mock configuration
    mockReset: true,
    restoreMocks: true,
    
    // Reporter
    reporter: ['default', 'html'],
    
    outputFile: {
      html: './tests/report/index.html'
    }
  },
  
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@core': resolve(__dirname, './src/core'),
      '@tools': resolve(__dirname, './src/tools')
    }
  }
});
