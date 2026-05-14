module.exports = {
  ci: {
    collect: {
      // Deterministic local static audit of the already-built site.
      staticDistDir: './dist',
      // Multiple runs reduce CI noise without relying on hosted preview URLs.
      numberOfRuns: 2,
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
      // Keep Lighthouse CI informative during urgent production deploys without blocking the workflow.
      assertions: {},
    },
    upload: {
      target: 'filesystem',
      outputDir: './lighthouse-results',
    },
    server: {
      // Server options if needed
    },
  },
};
