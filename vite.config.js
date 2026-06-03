import { defineConfig } from 'vite';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import { readFileSync, statSync } from 'fs';
import { globSync } from 'glob';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import cssnano from 'cssnano';
import postcssImport from 'postcss-import';
import liveDataHandler from './api/live-data.js';
import { applySeoHead } from './src/components/Analytics.mjs';
import { buildBlogArticleRouteEntries, buildBlogSlugsByLocale, fallbackBlogLocale, normalizeBlogSlug, supportedBlogLocales } from './src/js/blog-routes.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const resolveHtmlEntry = (file) => {
  const absolutePath = resolve(__dirname, file);
  const stats = statSync(absolutePath);
  if (!stats.isFile()) {
    throw new Error(`Vite HTML input must be a file: ${file}`);
  }
  return absolutePath;
};

const googleSiteVerification = process.env.PUBLIC_GSC_ID || process.env.VITE_GOOGLE_SITE_VERIFICATION || '';
const googleAnalyticsId = process.env.PUBLIC_GA_ID || process.env.VITE_GA_ID || '';
const defaultAdSenseClient = 'ca-pub-5738022526587953';
const adSenseClientPattern = /^ca-pub-[0-9]{16}$/;
const googleAdSenseClient = [process.env.PUBLIC_ADSENSE_CLIENT, process.env.VITE_ADSENSE_CLIENT]
  .map((value) => String(value || '').trim())
  .find((value) => adSenseClientPattern.test(value)) || defaultAdSenseClient;

const optionalHtmlEnv = {
  name: 'novatools-optional-html-env',
  enforce: 'pre',
  transformIndexHtml(html, context) {
    return applySeoHead(html, context?.path || '/', {
      gaId: googleAnalyticsId,
      gscId: googleSiteVerification,
      adsenseClient: googleAdSenseClient
    });
  }
};


const devCorsOrigins = (process.env.VITE_DEV_CORS_ORIGINS || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);


const liveDataDevProxy = {
  name: 'novatools-live-data-dev-proxy',
  configureServer(server) {
    server.middlewares.use('/api/live-data', async (request, response) => {
      try {
        const devRequest = new Request(`http://localhost${request.url || ''}`);
        const proxiedResponse = await liveDataHandler(devRequest);
        response.statusCode = proxiedResponse.status;
        proxiedResponse.headers.forEach((value, key) => response.setHeader(key, value));
        response.end(await proxiedResponse.text());
      } catch (error) {
        response.statusCode = 502;
        response.setHeader('content-type', 'application/json; charset=utf-8');
        response.end(JSON.stringify({ error: 'live_data_unavailable', message: error.message || 'Live data is temporarily unavailable.' }));
      }
    });
  }
};

const securityHeaders = {
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
};

// Discover all tool entry points
const toolEntries = globSync('src/tools/**/index.html', {
  ignore: ['**/demo-*/**', '**/experimental/**', '**/test/**']
}).reduce((acc, file) => {
  const name = file
    .replace(/^src[/\\]/, '')
    .replace(/[/\\]index\.html$/, '')
    .replace(/\\/g, '/');

  acc[name] = resolveHtmlEntry(file);
  return acc;
}, {});

// Root standalone HTML pages
const rootHtmlEntries = globSync('*.html', {
  ignore: ['index.html']
}).reduce((acc, file) => {
  const name = file
    .replace(/\\/g, '/')
    .replace(/\.html$/, '');

  acc[name] = resolveHtmlEntry(file);
  return acc;
}, {});


const authorEntries = globSync('author/**/*.html').reduce((acc, file) => {
  const name = file
    .replace(/\\/g, '/')
    .replace(/\.html$/, '');

  acc[name] = resolveHtmlEntry(file);
  return acc;
}, {});

// Admin entry point
const adminEntry = {
  admin: resolveHtmlEntry('admin/index.html'),
  'admin/dashboard': resolveHtmlEntry('admin/dashboard.html')
};


// Localized duplicate entries keep path-prefixed locale routes buildable for
// locales that still use static path prefixes while runtime localization handles others.
const localizedRootHtmlEntries = ['en', 'tr', 'ar'].reduce((acc, locale) => {
  acc[`${locale}/index`] = resolveHtmlEntry('index.html');
  Object.keys(rootHtmlEntries).forEach((name) => {
    acc[`${locale}/${name}`] = rootHtmlEntries[name];
  });
  return acc;
}, {});


const sourceBlogArticleSlugs = globSync('src/blog/articles/**/*.html')
  .map((file) => file.replace(/\\/g, '/').split('/').pop().replace(/\.html$/, ''))
  .filter((slug) => slug !== 'index')
  .map((slug) => normalizeBlogSlug(slug));

const blogSlugsByLocale = (() => {
  const fallbackPosts = JSON.parse(readFileSync(resolve(__dirname, `src/i18n/blog/${fallbackBlogLocale}.json`), 'utf8'));
  const fallbackSlugs = fallbackPosts.map((post) => post.slug).filter(Boolean);

  const manifestSlugsByLocale = supportedBlogLocales.reduce((acc, locale) => {
    try {
      const posts = JSON.parse(readFileSync(resolve(__dirname, `src/i18n/blog/${locale}.json`), 'utf8'));
      acc[locale] = posts.map((post) => post.slug).filter(Boolean);
    } catch {
      acc[locale] = fallbackSlugs;
    }
    return acc;
  }, {});

  return buildBlogSlugsByLocale(manifestSlugsByLocale, sourceBlogArticleSlugs);
})();

const localizedBlogIndexEntries = supportedBlogLocales
  .filter((locale) => locale !== fallbackBlogLocale)
  .reduce((acc, locale) => {
    acc[`${locale}/blog/index`] = resolveHtmlEntry('src/blog/index.html');
    return acc;
  }, {});

const blogArticleRouteEntries = buildBlogArticleRouteEntries(blogSlugsByLocale, resolveHtmlEntry);

// Blog entry points
const blogEntry = {
  'blog/index': resolveHtmlEntry('src/blog/index.html'),
  'blog/article-template': resolveHtmlEntry('src/blog/article-template.html')
};


const blogCategoryArchiveEntries = globSync('blog/categories/**/*.html').reduce((acc, file) => {
  const name = file
    .replace(/\.html$/, '')
    .replace(/\\/g, '/');

  acc[name] = resolveHtmlEntry(file);
  return acc;
}, {});


const blogArticleEntries = globSync('src/blog/articles/**/*.html').reduce((acc, file) => {
  const name = file
    .replace(/^src[/\\]/, '')
    .replace(/\.html$/, '')
    .replace(/\\/g, '/');

  acc[name] = resolveHtmlEntry(file);
  return acc;
}, {});


const localizedAuthorEntries = ['en', 'tr'].reduce((acc, locale) => {
  Object.entries(authorEntries).forEach(([name, file]) => {
    acc[`${locale}/${name}`] = file;
  });
  return acc;
}, {});

// Categories entry points
const categoryEntries = globSync('categories/**/*.html').reduce((acc, file) => {
  const name = file
    .replace(/\\/g, '/')
    .replace(/\.html$/, '');

  acc[name] = resolveHtmlEntry(file);
  return acc;
}, {});

const localizedCategoryEntries = ['en', 'tr', 'ar'].reduce((acc, locale) => {
  Object.entries(categoryEntries).forEach(([name, file]) => {
    acc[`${locale}/${name}`] = file;
  });
  return acc;
}, {});

const localizedToolEntries = ['en', 'tr', 'ar'].reduce((acc, locale) => {
  Object.entries(toolEntries).forEach(([name, file]) => {
    acc[`${locale}/${name}`] = file;
  });
  return acc;
}, {});

export default defineConfig({
  root: '.',
  envPrefix: ['VITE_', 'PUBLIC_'],
  base: '/',
  publicDir: 'public',
  appType: 'mpa',

  build: {
    target: 'es2020',
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: false,
    cssCodeSplit: true,
    cssMinify: 'esbuild',
    assetsInlineLimit: 4096,
    modulePreload: {
      // Keep MPA HTML entries free of Vite's injected source-phase polyfill import;
      // modern module browsers still receive generated modulepreload links.
      polyfill: false
    },

    rollupOptions: {
      input: {
        main: resolveHtmlEntry('index.html'),
        ...rootHtmlEntries,
        ...authorEntries,
        ...localizedRootHtmlEntries,
        ...adminEntry,
        ...blogEntry,
        ...localizedBlogIndexEntries,
        ...localizedAuthorEntries,
        ...blogArticleEntries,
        ...blogArticleRouteEntries,
        ...blogCategoryArchiveEntries,
        ...categoryEntries,
        ...localizedCategoryEntries,
        ...toolEntries,
        ...localizedToolEntries
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
            if (id.includes('/src/core/native/')) return 'core-native';
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
    chunkSizeWarningLimit: 800,

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
    optionalHtmlEnv,
    liveDataDevProxy,
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
          src: 'src/tools/**/meta.json',
          dest: 'meta'
        },
        {
          src: 'src/styles/critical.css',
          dest: 'styles'
        },
        {
          src: 'src/styles/design-system.css',
          dest: 'styles'
        },
        {
          src: 'src/styles/layout.css',
          dest: 'styles'
        },
        {
          src: 'src/styles/component-library.css',
          dest: 'styles'
        }
      ]
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
      target: 'es2020'
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
    cors: {
      origin: devCorsOrigins
    },
    headers: securityHeaders
  },

  preview: {
    port: 4173,
    headers: {
      ...securityHeaders,
      'Cache-Control': 'no-cache'
    }
  },

  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
    __ADSENSE_CLIENT__: JSON.stringify(process.env.VITE_ADSENSE_CLIENT || 'ca-pub-5738022526587953')
  }
});
