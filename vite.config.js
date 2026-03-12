import { defineConfig } from 'vite';
import { resolve } from 'path';
import { globSync } from 'glob';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import postcssImport from 'postcss-import';

// Discover all tool entry points (exclude demo and experimental)
// Use path structure (tools/finance/tax) for proper nested output in dist
const toolEntries = globSync('src/tools/**/index.html', {
  ignore: ['**/demo-*/**', '**/experimental/**', '**/test/**']
}).reduce((acc, file) => {
  // Convert 'src/tools/finance/tax/index.html' -> 'tools/finance/tax'
  // Handle both Windows (\) and Unix (/) path separators
  const name = file
    .replace(/^src[/\\]/, '')  // Remove src/ or src\
    .replace(/[/\\]index\.html$/, '')  // Remove /index.html or \index.html
    .replace(/\\/g, '/');  // Normalize to forward slashes
  acc[name] = resolve(__dirname, file);
  return acc;
}, {});

export default defineConfig({
  root: '.',
  publicDir: 'public',
  
  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    cssCodeSplit: true,
    cssMinify: 'lightningcss',
    
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...toolEntries
      },
      
      output: {
        manualChunks: (id) => {
          if (id.includes('pdf-lib') || id.includes('pdfjs')) {
            return 'pdf-vendor';
          }
          if (id.includes('decimal.js')) {
            return 'finance-vendor';
          }
          if (id.includes('wasm-vips') || id.includes('sharp')) {
            return 'image-vendor';
          }
          if (id.includes('dompurify') || id.includes('zod')) {
            return 'ui-vendor';
          }
          if (id.includes('/src/core/')) {
            return 'core';
          }
          if (id.includes('/src/components/')) {
            return 'components';
          }
        },
        
        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name;
          if (name.includes('vendor')) {
            return 'vendor/[name]-[hash].js';
          }
          return 'js/[name]-[hash].js';
        },
        
        entryFileNames: (chunkInfo) => {
          const name = chunkInfo.name;
          // All JS files go to js/ folder
          // Name already contains full path like 'tools/finance/tax'
          return 'js/[name]-[hash].js';
        },
        
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          
          if (ext === 'wasm') {
            return 'wasm/[name][extname]';
          }
          if (ext === 'css') {
            return 'css/[name]-[hash][extname]';
          }
          if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp'].includes(ext)) {
            return 'images/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    
    reportCompressedSize: true,
    chunkSizeWarningLimit: 200,
    
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug'],
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    }
  },

  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'static/wasm/**/*',
          dest: 'wasm'
        },
        {
          src: 'static/icons/**/*',
          dest: 'icons'
        },
        {
          src: 'static/sitemap*.xml',
          dest: '.'
        },
        {
          src: 'src/tools/**/meta.json',
          dest: 'meta'
        }
      ]
    }),
    
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,json}'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        
        runtimeCaching: [
          {
            urlPattern: /\.wasm$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'wasm-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 30 * 24 * 60 * 60
              }
            }
          },
          {
            urlPattern: /analytics\./,
            handler: 'NetworkOnly'
          }
        ],
        
        skipWaiting: true,
        clientsClaim: true
      },
      
      manifest: {
        name: 'NovaTools MC - Professional Financial Tools',
        short_name: 'NovaTools',
        description: 'Professional-grade financial calculators and privacy-first utilities. Your data never leaves your browser.',
        theme_color: '#0A0A0C',
        background_color: '#0A0A0C',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
          { src: '/icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
          { src: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
          { src: '/icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
          { src: '/icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
          { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
          { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ],
        categories: ['finance', 'utilities', 'productivity'],
        lang: 'en',
        dir: 'ltr'
      }
    })
  ],

  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@components': resolve(__dirname, './src/components'),
      '@core': resolve(__dirname, './src/core'),
      '@tools': resolve(__dirname, './src/tools'),
      '@styles': resolve(__dirname, './src/styles'),
      '@static': resolve(__dirname, './static'),
      '@i18n': resolve(__dirname, './src/i18n')
    }
  },

  css: {
    postcss: {
      plugins: [
        postcssImport,
        tailwindcss,
        autoprefixer,
        cssnano({
          preset: ['default', { 
            discardComments: { removeAll: true },
            normalizeWhitespace: true,
            minifyFontValues: true,
            minifySelectors: true
          }]
        })
      ]
    },
    devSourcemap: true
  },

  optimizeDeps: {
    exclude: ['pdf-lib', 'decimal.js', 'dompurify'],
    include: ['zod']
  },

  server: {
    port: 3000,
    open: true,
    cors: true,
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  },

  preview: {
    port: 4173,
    headers: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  },

  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  }
});
