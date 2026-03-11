/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,mjs,ts,html}',
    './src/tools/**/*.{js,mjs,html}',
    './src/components/**/*.{js,mjs}'
  ],
  
  // Safelist for dynamically used classes
  safelist: [
    'bg-red-50',
    'text-red-700',
    'border-red-200',
    'bg-green-50',
    'text-green-700',
    'border-green-200',
    'bg-blue-50',
    'text-blue-700',
    'border-blue-200',
    'hidden',
    'visible'
  ],
  
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        secondary: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        warning: {
          50: '#fffbeb',
          100: '#fef3c7',
          500: '#f59e0b',
          600: '#d97706',
        },
        danger: {
          50: '#fef2f2',
          100: '#fee2e2',
          500: '#ef4444',
          600: '#dc2626',
        },
        success: {
          50: '#f0fdf4',
          100: '#dcfce7',
          500: '#10b981',
          600: '#059669',
        }
      },
      
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ]
      },
      
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },
      
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
        // Ad-specific spacing
        'ad-sidebar': '336px',
        'ad-banner': '90px',
        'ad-anchor': '50px',
        'ad-medium-rectangle': '280px',
      },
      
      maxWidth: {
        'content': '1200px',
        'tool': '800px',
        'sidebar': '336px',
      },
      
      minHeight: {
        'ad-sidebar': '280px',
        'ad-banner': '90px',
        'ad-anchor': '50px',
      },
      
      height: {
        'ad-banner': '90px',
        'ad-anchor': '50px',
      },
      
      width: {
        'ad-sidebar': '336px',
        'ad-medium': '300px',
      },
      
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      
      transitionDuration: {
        '400': '400ms',
      },
      
      zIndex: {
        'sticky-ad': 40,
        'anchor-ad': 50,
        'modal': 60,
        'toast': 70,
      },
      
      aspectRatio: {
        'ad-banner': '728 / 90',
        'ad-medium': '336 / 280',
        'ad-anchor': '320 / 50',
      },
      
      boxShadow: {
        'ad': '0 2px 4px rgba(0, 0, 0, 0.1)',
        'card': '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      },
      
      borderRadius: {
        'card': '0.75rem',
        'button': '0.5rem',
      }
    },
  },
  
  plugins: [],
  
  // Core plugins to reduce bundle size
  corePlugins: {
    // Disable unused features
    container: false, // We use custom max-width
    float: false, // Use flex/grid instead
    clear: false,
    skew: false,
    // Keep essential utilities
    spacing: true,
    colors: true,
  },
  
  // Experimental features
  experimental: {
    optimizeUniversalDefaults: true,
  },
};
