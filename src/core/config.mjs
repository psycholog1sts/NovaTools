/**
 * Core Configuration Module
 * Centralized configuration for the entire application
 */

export const CONFIG = {
  // App Info
  app: {
    name: 'NovaTools MC',
    version: '2.0.0',
    author: 'Licensed Professional Counselor Metehan ÇETİN',
    email: 'support@mc-novatools.com',
    copyright: '© 2026 Licensed Professional Counselor Metehan ÇETİN. All rights reserved.'
  },

  // API Configuration
  apis: {
    coingecko: {
      baseUrl: 'https://api.coingecko.com/api/v3',
      endpoints: {
        prices: '/simple/price'
      },
      cacheDuration: 5 * 60 * 1000, // 5 minutes
      retryAttempts: 3
    },
    exchangeRate: {
      baseUrl: 'https://api.exchangerate-api.com/v4',
      cacheDuration: 5 * 60 * 1000,
      fallbackRates: {
        EUR: 0.9234,
        GBP: 0.7891,
        JPY: 149.52,
        TRY: 28.45
      }
    },
    aladhan: {
      baseUrl: 'https://api.aladhan.com/v1',
      cacheDuration: 24 * 60 * 60 * 1000 // 24 hours for calendar
    }
  },

  // Tool Configuration
  tools: {
    pdf: {
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxFiles: 20,
      allowedTypes: ['application/pdf']
    },
    image: {
      maxFileSize: 10 * 1024 * 1024, // 10MB
      allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    }
  },

  // Validation Rules
  validation: {
    mortgage: {
      minLoanAmount: 1000,
      maxLoanAmount: 100000000,
      minRate: 0,
      maxRate: 100,
      minTerm: 1,
      maxTerm: 50
    },
    compoundInterest: {
      minPrincipal: 0,
      maxPrincipal: 1000000000,
      minRate: 0,
      maxRate: 1000,
      maxYears: 100
    }
  },

  // UI Configuration
  ui: {
    toastDuration: 5000,
    debounceDelay: 300,
    animationDuration: 300
  }
};

/**
 * Get configuration value by path
 * @param {string} path - Dot notation path (e.g., 'apis.coingecko.baseUrl')
 * @param {*} defaultValue - Default value if path not found
 * @returns {*} Configuration value
 */
export function getConfig(path, defaultValue = null) {
  const keys = path.split('.');
  let value = CONFIG;
  
  for (const key of keys) {
    if (value === null || value === undefined || !(key in value)) {
      return defaultValue;
    }
    value = value[key];
  }
  
  return value;
}

/**
 * Update configuration (for runtime overrides)
 * @param {string} path - Configuration path
 * @param {*} value - New value
 */
export function setConfig(path, value) {
  const keys = path.split('.');
  let target = CONFIG;
  
  for (let i = 0; i < keys.length - 1; i++) {
    if (!(keys[i] in target)) {
      target[keys[i]] = {};
    }
    target = target[keys[i]];
  }
  
  target[keys[keys.length - 1]] = value;
}

export default CONFIG;
