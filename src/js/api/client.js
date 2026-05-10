const DEFAULT_TTL_MS = 60 * 60 * 1000;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 20;

function safeStorage() {
  try {
    const testKey = '__nt_api_test__';
    window.localStorage.setItem(testKey, '1');
    window.localStorage.removeItem(testKey);
    return window.localStorage;
  } catch {
    return null;
  }
}

const storage = typeof window !== 'undefined' ? safeStorage() : null;

function now() {
  return Date.now();
}

function cacheKey(key) {
  return `novatools:api:${key}`;
}

export function readCache(key, ttlMs = DEFAULT_TTL_MS) {
  if (!storage) return null;
  try {
    const raw = storage.getItem(cacheKey(key));
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (!entry || now() - entry.savedAt > ttlMs) return null;
    return entry.value;
  } catch {
    return null;
  }
}

export function writeCache(key, value) {
  if (!storage) return;
  try {
    storage.setItem(cacheKey(key), JSON.stringify({ savedAt: now(), value }));
  } catch {
    // Ignore quota and privacy-mode storage failures.
  }
}

function checkRateLimit(resource) {
  if (!storage) return;
  const key = cacheKey(`rate:${resource}`);
  const current = now();
  let events = [];
  try {
    events = JSON.parse(storage.getItem(key) || '[]').filter((time) => current - time < RATE_WINDOW_MS);
  } catch {
    events = [];
  }
  if (events.length >= RATE_LIMIT) {
    throw new Error('Too many refreshes. Please wait a minute and try again.');
  }
  events.push(current);
  try {
    storage.setItem(key, JSON.stringify(events));
  } catch {
    // Ignore storage failures; the network request can continue.
  }
}

export async function fetchJson(resource, params = {}, options = {}) {
  const ttlMs = options.ttlMs ?? DEFAULT_TTL_MS;
  const cacheId = `${resource}:${JSON.stringify(params)}`;
  const cached = readCache(cacheId, ttlMs);
  if (cached && !options.forceRefresh) {
    return { data: cached, stale: false, source: 'cache' };
  }

  checkRateLimit(resource);
  const url = new URL('/api/live-data', window.location.origin);
  url.searchParams.set('resource', resource);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });

  try {
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.error) {
      throw new Error(payload.message || 'Live data is temporarily unavailable.');
    }
    writeCache(cacheId, payload);
    return { data: payload, stale: false, source: 'network' };
  } catch (error) {
    if (cached) return { data: cached, stale: true, source: 'fallback', error };
    throw error;
  }
}
