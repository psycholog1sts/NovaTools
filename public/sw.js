const CACHE_VERSION = 'novatools-static-v1';
const STATIC_CACHE = `${CACHE_VERSION}-assets`;
const STATIC_ASSET_PATTERN = /\.(?:css|js|mjs|woff2?|png|jpe?g|webp|avif|svg|ico)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => cacheName.startsWith('novatools-static-') && cacheName !== STATIC_CACHE)
        .map((cacheName) => caches.delete(cacheName))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !STATIC_ASSET_PATTERN.test(url.pathname)) return;

  event.respondWith(cacheFirst(request));
});

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) return cachedResponse;

  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    await cache.put(request, networkResponse.clone());
  }
  return networkResponse;
}
