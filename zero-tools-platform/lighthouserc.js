module.exports = {
  ci: {
    collect: {
      // Static site - no server needed
      staticDistDir: './dist',
      // Number of runs for stability
      numberOfRuns: 3,
      // Chrome flags for consistent results
      settings: {
        chromeFlags: '--no-sandbox --headless',
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        throttling: {
          // Simulate fast 4G
          rttMs: 150,
          throughputKbps: 1600,
          cpuSlowdownMultiplier: 2,
        },
      },
    },
    assert: {
      assertions: {
        // Performance budgets - strict for passive income sites
        'categories:performance': ['warn', { minScore: 0.90 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.95 }],
        'categories:seo': ['error', { minScore: 0.95 }],
        
        // Core Web Vitals
        'first-contentful-paint': ['warn', { maxNumericValue: 1200 }], // < 1.2s
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }], // < 2.5s
        'interactive': ['warn', { maxNumericValue: 3500 }], // TTI < 3.5s
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }], // CLS < 0.1
        'total-blocking-time': ['warn', { maxNumericValue: 200 }], // TBT < 200ms
        
        // Resource budgets
        'resource-summary:document:size': ['error', { maxNumericValue: 20000 }], // 20KB HTML
        'resource-summary:script:size': ['warn', { maxNumericValue: 500000 }], // 500KB JS
        'resource-summary:stylesheet:size': ['error', { maxNumericValue: 10000 }], // 10KB CSS
        'resource-summary:image:size': ['warn', { maxNumericValue: 1000000 }], // 1MB images
        'resource-summary:third-party:count': ['warn', { maxNumericValue: 3 }], // Max 3 third-party
        
        // SEO specific
        'meta-description': 'error',
        'document-title': 'error',
        'canonical': 'error',
        'is-crawlable': 'error',
        'robots-txt': 'error',
        
        // Accessibility
        'aria-allowed-attr': 'error',
        'aria-required-attr': 'error',
        'aria-required-children': 'error',
        'aria-required-parent': 'error',
        'aria-roles': 'error',
        'aria-valid-attr-value': 'error',
        'aria-valid-attr': 'error',
        'button-name': 'error',
        'color-contrast': 'error',
        'heading-order': 'error',
        'label': 'error',
        'link-name': 'error',
      },
    },
    upload: {
      target: 'temporary-public-storage',
      outputDir: './lighthouse-results',
      githubAppToken: process.env.LHCI_GITHUB_APP_TOKEN,
    },
    server: {
      // Server options if needed
    },
  },
};
