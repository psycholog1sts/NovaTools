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
    'visible',
    'glow-green',
    'glow-cyan',
    'glow-blue',
    'glow-purple',
    'glow-yellow',
    'glow-red'
  ],
  
  theme: {
    extend: {
      colors: {
        // Matrix Theme Colors
        matrix: {
          dark: '#0a0a0a',        // Deep black background
          darker: '#050505',      // Even darker
          green: '#00FF41',       // Matrix Green (primary)
          cyan: '#00F3FF',        // Cyber Blue
          blue: '#0080FF',        // Electric Blue
          purple: '#BD00FF',      // Neon Purple
          yellow: '#FFD700',      // Gold/Yellow
          red: '#FF0040',         // Neon Red
          gray: '#6B7280',        // Medium gray text
          light: '#E5E7EB',       // Light text
        },
        // Legacy mappings for compatibility
        primary: {
          50: '#00FF4108',
          100: '#00FF4110',
          200: '#00FF4120',
          300: '#00FF4130',
          400: '#00FF4140',
          500: '#00FF4150',
          600: '#00FF41',
          700: '#00CC33',
          800: '#009926',
          900: '#006619',
        },
        secondary: {
          50: '#0a0a0a',
          100: '#111111',
          200: '#1a1a1a',
          300: '#222222',
          400: '#333333',
          500: '#444444',
          600: '#6B7280',
          700: '#9CA3AF',
          800: '#D1D5DB',
          900: '#E5E7EB',
        }
      },
      
      fontFamily: {
        mono: [
          'JetBrains Mono',
          'Roboto Mono',
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ],
        sans: [
          'JetBrains Mono',
          'system-ui',
          '-apple-system',
          'sans-serif'
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
        'glow': 'glow 2s ease-in-out infinite alternate',
        'cursor-blink': 'cursorBlink 1s step-end infinite',
        'typing': 'typing 3.5s steps(40, end)',
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
        glow: {
          '0%': { boxShadow: '0 0 5px #00FF41, 0 0 10px #00FF41' },
          '100%': { boxShadow: '0 0 20px #00FF41, 0 0 30px #00FF41' },
        },
        cursorBlink: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        typing: {
          '0%': { width: '0' },
          '100%': { width: '100%' },
        }
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
        'glow-green': '0 0 10px rgba(0, 255, 65, 0.5), 0 0 20px rgba(0, 255, 65, 0.3)',
        'glow-cyan': '0 0 10px rgba(0, 243, 255, 0.5), 0 0 20px rgba(0, 243, 255, 0.3)',
        'glow-blue': '0 0 10px rgba(0, 128, 255, 0.5), 0 0 20px rgba(0, 128, 255, 0.3)',
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
};
