import {
  ENTITLEMENT_AUTHORITY,
  ENTITLEMENT_SCHEMA_VERSION,
  resolveEntitlementEnvelope
} from '../../core/billing/entitlement-contract.mjs';

const DEFAULT_TIMEOUT_MS = 4_000;
const MAX_BEARER_LENGTH = 16_384;
const JSON_HEADERS = Object.freeze({
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff',
  Vary: 'Authorization'
});

function json(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, ...extraHeaders }
  });
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeSupabaseUrl(value) {
  const candidate = clean(value);
  if (!candidate) return null;
  try {
    const url = new URL(candidate);
    const local = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    if (url.protocol !== 'https:' && !local) return null;
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

function resolveServerConfig(env = {}) {
  const url = normalizeSupabaseUrl(env.SUPABASE_URL);
  const publishableKey = clean(env.SUPABASE_PUBLISHABLE_KEY);
  if (!url || !publishableKey.startsWith('sb_publishable_')) return null;
  return Object.freeze({ url, publishableKey });
}

function bearerToken(request) {
  const header = clean(request.headers.get('Authorization'));
  const match = /^Bearer\s+([^\s]+)$/i.exec(header);
  if (!match) return null;
  const token = match[1];
  if (token.length < 16 || token.length > MAX_BEARER_LENGTH) return null;
  return token;
}

async function fetchWithTimeout(fetchImpl, input, init, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function upstreamHeaders(config, token) {
  return {
    Accept: 'application/json',
    apikey: config.publishableKey,
    Authorization: `Bearer ${token}`
  };
}

function safeRetryAfter(response) {
  const value = response.headers.get('Retry-After');
  return /^\d{1,5}$/.test(value || '') ? value : null;
}

async function readJson(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function mapAuthFailure(response) {
  if (response.status === 401 || response.status === 403) {
    return json(401, { error: 'invalid_session' });
  }
  if (response.status === 429) {
    const retryAfter = safeRetryAfter(response);
    return json(503, { error: 'auth_temporarily_unavailable' }, retryAfter ? { 'Retry-After': retryAfter } : {});
  }
  return json(502, { error: 'auth_upstream_unavailable' });
}

function mapStoreFailure(response) {
  if (response.status === 401) return json(401, { error: 'invalid_session' });
  if (response.status === 403) return json(503, { error: 'entitlement_store_forbidden' });
  if (response.status === 404) return json(503, { error: 'entitlement_store_not_ready' });
  if (response.status === 429) {
    const retryAfter = safeRetryAfter(response);
    return json(503, { error: 'entitlement_store_busy' }, retryAfter ? { 'Retry-After': retryAfter } : {});
  }
  return json(502, { error: 'entitlement_store_unavailable' });
}

function validSubject(value) {
  return typeof value === 'string' && value.length > 0 && value.length <= 256;
}

function envelopeFromRow(userId, row) {
  if (!row) {
    return {
      schemaVersion: ENTITLEMENT_SCHEMA_VERSION,
      authority: ENTITLEMENT_AUTHORITY,
      subject: userId,
      planKey: 'free',
      status: 'active',
      features: []
    };
  }

  return {
    schemaVersion: ENTITLEMENT_SCHEMA_VERSION,
    authority: ENTITLEMENT_AUTHORITY,
    subject: userId,
    planKey: row.plan_key,
    status: row.status,
    expiresAt: row.expires_at || null,
    features: Array.isArray(row.features) ? row.features : []
  };
}

export function createEntitlementsHandler({ fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');

  return async function handleEntitlements(request, env = {}) {
    if (request.method !== 'GET') {
      return json(405, { error: 'method_not_allowed' }, { Allow: 'GET' });
    }

    const config = resolveServerConfig(env);
    if (!config) return json(503, { error: 'control_plane_not_configured' });

    const token = bearerToken(request);
    if (!token) return json(401, { error: 'authorization_required' });

    try {
      const userUrl = new URL('/auth/v1/user', config.url);
      const userResponse = await fetchWithTimeout(fetchImpl, userUrl, {
        method: 'GET',
        headers: upstreamHeaders(config, token)
      }, timeoutMs);

      if (!userResponse.ok) return mapAuthFailure(userResponse);
      const user = await readJson(userResponse);
      if (!validSubject(user?.id)) return json(502, { error: 'invalid_auth_response' });

      const entitlementUrl = new URL('/rest/v1/user_entitlements', config.url);
      entitlementUrl.searchParams.set('select', 'plan_key,status,expires_at,features');
      entitlementUrl.searchParams.set('user_id', `eq.${user.id}`);
      entitlementUrl.searchParams.set('limit', '1');

      const storeResponse = await fetchWithTimeout(fetchImpl, entitlementUrl, {
        method: 'GET',
        headers: upstreamHeaders(config, token)
      }, timeoutMs);

      if (!storeResponse.ok) return mapStoreFailure(storeResponse);
      const rows = await readJson(storeResponse);
      if (!Array.isArray(rows)) return json(502, { error: 'invalid_entitlement_response' });

      const entitlement = resolveEntitlementEnvelope(envelopeFromRow(user.id, rows[0] || null));
      return json(200, { entitlement });
    } catch (error) {
      if (error?.name === 'AbortError') return json(504, { error: 'control_plane_timeout' });
      return json(502, { error: 'control_plane_unavailable' });
    }
  };
}

export const handleEntitlements = createEntitlementsHandler();
