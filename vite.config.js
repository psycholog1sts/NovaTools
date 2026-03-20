import { defineConfig } from 'vite';
import { resolve } from 'path';
import { globSync } from 'glob';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import postcssImport from 'postcss-import';

// Discover all tool entry points
const toolEntries = globSync('src/tools/**/index.html', {
  ignore: ['**/demo-*/**', '**/experimental/**', '**/test/**']
}).reduce((acc, file) => {
  const name = file
    .replace(/^src[/\\]/, '')
    .replace(/[/\\]index\.html$/, '')
    .replace(/\\/g, '/');

  acc[name] = resolve(__dirname, file);
  return acc;
}, {});

// Admin entry point
const adminEntry = {
  admin: resolve(__dirname, 'admin/index.html')
};

// Blog entry point
const blogEntry = {
  blog: resolve(__dirname, 'src/blog/index.html')
};

// Categories entry points
const categoryEntries = globSync('categories/**/*.html').reduce((acc, file) => {
  const name = file
    .replace(/\\/g, '/')
    .replace(/\.html$/, '');

  acc[name] = resolve(__dirname, file);
  return acc;
}, {});

export default defineConfig({
  root: '.',
  base: '/',
  publicDir: 'public',

  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
    cssCodeSplit: true,
    cssMinify: 'lightningcss',
    assetsInlineLimit: 4096,
    modulePreload: {
      polyfill: true
    },

    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        ...adminEntry,
        ...blogEntry,
        ...categoryEntries,
        ...toolEntries
      },

      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('pdf-lib') || id.includes('pdfjs') || id.includes('pdf')) {
              return 'vendor-pdf';
            }
            if (id.includes('decimal.js') || id.includes('finance')) {
              return 'vendor-finance';
            }
            if (id.includes('wasm') || id.includes('sharp') || id.includes('image')) {
              return 'vendor-image';
            }
            if (id.includes('dompurify') || id.includes('zod') || id.includes('validator')) {
              return 'vendor-ui';
            }
            if (id.includes('react') || id.includes('vue') || id.includes('preact')) {
              return 'vendor-framework';
            }
            return 'vendor-other';
          }

          if (id.includes('/src/core/')) {
            if (id.includes('ai')) return 'core-ai';
            if (id.includes('compute')) return 'core-compute';
            if (id.includes('security')) return 'core-security';
            return 'core';
          }

          if (id.includes('/src/components/')) {
            return 'components';
          }
        },

        chunkFileNames: (chunkInfo) => {
          const name = chunkInfo.name || 'chunk';
          if (name.includes('vendor')) {
            return 'vendor/[name]-[hash].js';
          }
          return 'js/[name]-[hash].js';
        },

        entryFileNames: () => {
          return 'js/[name]-[hash].js';
        },

        assetFileNames: (assetInfo) => {
          const assetName = assetInfo.name || '';
          const parts = assetName.split('.');
          const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';

          if (ext === 'wasm') {
            return 'wasm/[name][extname]';
          }

          if (ext === 'css') {
            return 'css/[name]-[hash][extname]';
          }

          if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'avif'].includes(ext)) {
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
        },
        {
          src: 'src/blog/articles/**/*',
          dest: 'blog/articles'
        }
      ]
    }),

    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifestFilename: 'manifest.webmanifest',

      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,avif,wasm,json,webmanifest,txt,xml}'],
        globIgnores: [
          '**/node_modules/**/*',
          '**/src/**/*',
          '**/.git/**/*'
        ],
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,

        runtimeCaching: [
          {
            urlPattern: /\.wasm$/i,
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
            urlPattern: /analytics\./i,
            handler: 'NetworkOnly'
          }
        ]
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
          preset: [
            'default',
            {
              discardComments: { removeAll: true },
              normalizeWhitespace: true,
              minifyFontValues: true,
              minifySelectors: true
            }
          ]
        })
      ]
    },
    devSourcemap: true
  },

  optimizeDeps: {
    exclude: ['pdf-lib', 'decimal.js', 'dompurify', 'wasm-vips'],
    include: ['zod', 'lodash-es', 'date-fns'],
    esbuildOptions: {
      target: 'es2022'
    }
  },

  experimental: {
    renderBuiltUrl(filename, { hostType }) {
      if (hostType === 'js') {
        return { relative: true };
      }
      return { relative: true };
    }
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
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __ADSENSE_CLIENT__: JSON.stringify(process.env.VITE_ADSENSE_CLIENT || 'ca-pub-XXXXXXXXXXXXXXXX')
  }
});