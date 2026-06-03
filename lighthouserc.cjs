module.exports = {
  ci: {
    collect: {
      // Deterministic local static audit of the already-built site.
      staticDistDir: './dist',
      numberOfRuns: 2,
      settings: {
        chromeFlags: '--no-sandbox --headless',
        preset: 'desktop',
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
        budgets: [
          {
            path: '/*',
            resourceSizes: [
              { resourceType: 'script', budget: 200 },
              { resourceType: 'stylesheet', budget: 50 },
              { resourceType: 'image', budget: 500 }
            ]
          }
        ],
        throttling: {
          rttMs: 150,
          throughputKbps: 1600,
          cpuSlowdownMultiplier: 2,
        },
      },
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.95 }],
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 1 }],
        'categories:seo': ['error', { minScore: 1 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'interactive': ['warn', { maxNumericValue: 3800 }],
        'total-byte-weight': ['warn', { maxNumericValue: 750000 }]
      }
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-results',
    },
  },
};
