/* NovaTools service worker: same-origin offline cache with background sync hooks. */

const VERSION = 'cwv-2026-06-03';
const SHELL_CACHE = `novatools-shell-${VERSION}`;
const STATIC_CACHE = `novatools-static-${VERSION}`;
const PAGE_CACHE = `novatools-pages-${VERSION}`;
const BACKGROUND_SYNC_TAG = 'novatools-process-when-online';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles/critical.css',
  '/styles/design-system.css',
  '/styles/layout.css',
  '/i18n.js',
  '/favicon.svg',
  '/hero.svg',
  '/logo-bird-44.webp',
  '/logo-brand-520.webp'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, STATIC_CACHE, PAGE_CACHE]);
    const keys = await caches.keys();
    await Promise.all(keys.filter((key) => key.startsWith('novatools-') && !keep.has(key)).map((key) => caches.delete(key)));
    await self.clients.claim();
  })());
});

function isStaticAsset(request) {
  return ['style', 'script', 'font', 'image', 'manifest'].includes(request.destination);
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstPage(request) {
  const cache = await caches.open(PAGE_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await cache.match(request)) || (await caches.match('/index.html'));
  }
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin || request.method !== 'GET') return;

  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstPage(request));
  }
});

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach((client) => client.postMessage(message));
}

self.addEventListener('message', (event) => {
  if (event.data?.type === 'NOVATOOLS_QUEUE_ONLINE_PROCESSING') {
    event.waitUntil((async () => {
      if ('sync' in self.registration) {
        await self.registration.sync.register(BACKGROUND_SYNC_TAG);
      }
      await notifyClients({ type: 'NOVATOOLS_ONLINE_PROCESSING_QUEUED' });
    })());
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag !== BACKGROUND_SYNC_TAG) return;
  event.waitUntil(notifyClients({
    type: 'NOVATOOLS_PROCESS_WHEN_ONLINE',
    online: self.navigator?.onLine !== false
  }));
});
