/* NovaTools Workbox service worker: precache critical shell assets and cache same-origin static assets. */

importScripts('https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js');

workbox.setConfig({ debug: false });
workbox.core.skipWaiting();
workbox.core.clientsClaim();

workbox.precaching.precacheAndRoute([
  { url: '/', revision: 'phase6-shell' },
  { url: '/index.html', revision: 'phase6-shell' },
  { url: '/styles/critical.css', revision: 'phase6-critical-css' },
  { url: '/styles/design-system.css', revision: 'phase6-design-system' },
  { url: '/styles/layout.css', revision: 'phase6-layout' },
  { url: '/i18n.js', revision: 'phase6-i18n' },
  { url: '/favicon.svg', revision: 'phase6-favicon' },
  { url: '/logo-bird-44.webp', revision: 'phase6-logo' },
  { url: '/logo-brand-520.webp', revision: 'phase6-brand' }
]);

workbox.routing.registerRoute(
  ({ request, sameOrigin }) => sameOrigin && ['style', 'script', 'font', 'image'].includes(request.destination),
  new workbox.strategies.CacheFirst({
    cacheName: 'novatools-static-assets',
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 180,
        maxAgeSeconds: 60 * 60 * 24 * 30
      })
    ]
  })
);

workbox.routing.registerRoute(
  ({ request, sameOrigin }) => sameOrigin && request.mode === 'navigate',
  new workbox.strategies.NetworkFirst({
    cacheName: 'novatools-pages',
    networkTimeoutSeconds: 3,
    plugins: [
      new workbox.expiration.ExpirationPlugin({
        maxEntries: 80,
        maxAgeSeconds: 60 * 60 * 24 * 7
      })
    ]
  })
);
