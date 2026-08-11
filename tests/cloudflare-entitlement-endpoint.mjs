import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createEntitlementsHandler } from '../src/server/control-plane/entitlements.mjs';

const BASE_ENV = Object.freeze({
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example_public_key'
});
const TOKEN = 'test-session-token-1234567890';

function request(method = 'GET', token = TOKEN, requestId = null) {
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  if (requestId) headers['X-Request-ID'] = requestId;
  return new Request('https://mc-novatools.com/api/account/entitlements', { method, headers });
}

function response(status, body, headers = {}) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

async function bodyOf(result) {
  return JSON.parse(await result.text());
}

{
  const handler = createEntitlementsHandler({ fetchImpl: async () => { throw new Error('must not fetch'); } });
  const result = await handler(request('POST'), {});
  assert.equal(result.status, 405);
  assert.equal(result.headers.get('Allow'), 'GET');
  assert.match(result.headers.get('X-Request-ID'), /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/);
}

{
  const handler = createEntitlementsHandler({
    fetchImpl: async () => { throw new Error('must not fetch'); },
    requestIdFactory: () => { throw new Error('factory must not run for valid caller IDs'); }
  });
  const result = await handler(request('POST', TOKEN, 'client-request-123'), {});
  assert.equal(result.status, 405);
  assert.equal(result.headers.get('X-Request-ID'), 'client-request-123');
}

{
  const handler = createEntitlementsHandler({
    fetchImpl: async () => { throw new Error('must not fetch'); },
    requestIdFactory: () => 'generated-request-456'
  });
  const result = await handler(request('GET', null, 'invalid request id'), BASE_ENV);
  assert.equal(result.status, 401);
  assert.equal(result.headers.get('X-Request-ID'), 'generated-request-456');
  assert.equal((await result.text()).includes('invalid request id'), false);
}

{
  let calls = 0;
  const handler = createEntitlementsHandler({ fetchImpl: async () => { calls += 1; return response(500); } });
  const result = await handler(request(), {});
  assert.equal(result.status, 503);
  assert.deepEqual(await bodyOf(result), { error: 'control_plane_not_configured' });
  assert.equal(calls, 0);
}

{
  let calls = 0;
  const handler = createEntitlementsHandler({ fetchImpl: async () => { calls += 1; return response(500); } });
  const result = await handler(request('GET', null), BASE_ENV);
  assert.equal(result.status, 401);
  assert.deepEqual(await bodyOf(result), { error: 'authorization_required' });
  assert.equal(calls, 0);
}

{
  let calls = 0;
  const handler = createEntitlementsHandler({
    fetchImpl: async () => {
      calls += 1;
      return response(401, { message: `do-not-leak-${TOKEN}` });
    }
  });
  const result = await handler(request(), BASE_ENV);
  assert.equal(result.status, 401);
  const text = await result.text();
  assert.equal(text.includes(TOKEN), false);
  assert.match(text, /invalid_session/);
  assert.equal(calls, 1);
}

{
  const calls = [];
  const handler = createEntitlementsHandler({
    fetchImpl: async (input, init) => {
      const url = new URL(input);
      calls.push({ url, init });
      if (url.pathname === '/auth/v1/user') return response(200, { id: '11111111-1111-1111-1111-111111111111' });
      return response(200, [{
        plan_key: 'pro_monthly',
        status: 'active',
        expires_at: '2099-01-01T00:00:00Z',
        features: ['batch_workflows', 'bulk_export']
      }]);
    }
  });

  const result = await handler(request(), BASE_ENV);
  assert.equal(result.status, 200);
  assert.match(result.headers.get('Cache-Control'), /no-store/);
  assert.equal(result.headers.get('Vary'), 'Authorization');
  assert.match(result.headers.get('X-Request-ID'), /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/);
  const payload = await bodyOf(result);
  assert.equal(payload.entitlement.isPro, true);
  assert.equal(payload.entitlement.planKey, 'pro_monthly');
  assert.deepEqual(payload.entitlement.features, ['batch_workflows', 'bulk_export']);
  assert.equal(JSON.stringify(payload).includes('11111111-1111-1111-1111-111111111111'), false, 'Client response must not expose the auth subject.');

  assert.equal(calls.length, 2);
  assert.equal(calls[0].url.pathname, '/auth/v1/user');
  assert.equal(calls[0].init.headers.apikey, BASE_ENV.SUPABASE_PUBLISHABLE_KEY);
  assert.equal(calls[0].init.headers.Authorization, `Bearer ${TOKEN}`);
  assert.equal(calls[1].url.pathname, '/rest/v1/user_entitlements');
  assert.equal(calls[1].url.searchParams.get('select'), 'plan_key,status,expires_at,features');
  assert.equal(calls[1].url.searchParams.get('user_id'), 'eq.11111111-1111-1111-1111-111111111111');
  assert.equal(calls[1].url.searchParams.get('limit'), '1');
}

{
  const handler = createEntitlementsHandler({
    fetchImpl: async (input) => {
      const url = new URL(input);
      if (url.pathname === '/auth/v1/user') return response(200, { id: '22222222-2222-2222-2222-222222222222' });
      return response(200, []);
    }
  });
  const result = await handler(request(), BASE_ENV);
  const payload = await bodyOf(result);
  assert.equal(result.status, 200);
  assert.equal(payload.entitlement.isPro, false);
  assert.equal(payload.entitlement.planKey, 'free');
  assert.deepEqual(payload.entitlement.features, []);
}

{
  const handler = createEntitlementsHandler({
    fetchImpl: async (input) => {
      const url = new URL(input);
      if (url.pathname === '/auth/v1/user') return response(200, { id: '33333333-3333-3333-3333-333333333333' });
      return response(200, [{
        plan_key: 'pro_annual',
        status: 'active',
        expires_at: '2000-01-01T00:00:00Z',
        features: ['ad_free']
      }]);
    }
  });
  const result = await handler(request(), BASE_ENV);
  const payload = await bodyOf(result);
  assert.equal(payload.entitlement.isPro, false);
  assert.equal(payload.entitlement.reason, 'expired_entitlement');
}

{
  const handler = createEntitlementsHandler({
    fetchImpl: async (input) => {
      const url = new URL(input);
      if (url.pathname === '/auth/v1/user') return response(200, { id: '44444444-4444-4444-4444-444444444444' });
      return response(403, { details: 'private database details' });
    }
  });
  const result = await handler(request(), BASE_ENV);
  assert.equal(result.status, 503);
  const text = await result.text();
  assert.match(text, /entitlement_store_forbidden/);
  assert.equal(text.includes('private database details'), false);
}

{
  let calls = 0;
  const handler = createEntitlementsHandler({ fetchImpl: async () => { calls += 1; return response(200, {}); } });
  const result = await handler(request(), {
    SUPABASE_URL: BASE_ENV.SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY: 'sb_secret_never_allowed_here'
  });
  assert.equal(result.status, 503);
  assert.equal(calls, 0);
}

{
  const handler = createEntitlementsHandler({
    timeoutMs: 5,
    fetchImpl: async (_input, init) => new Promise((_resolve, reject) => {
      init.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      }, { once: true });
    })
  });
  const result = await handler(request(), BASE_ENV);
  assert.equal(result.status, 504);
  assert.deepEqual(await bodyOf(result), { error: 'control_plane_timeout' });
  assert.match(result.headers.get('X-Request-ID'), /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/);
}

const migration = fs.readFileSync(new URL('../supabase/migrations/20260810210000_user_entitlements.sql', import.meta.url), 'utf8').toLowerCase();
assert.match(migration, /alter table public\.user_entitlements enable row level security/);
assert.match(migration, /alter table public\.user_entitlements force row level security/);
assert.match(migration, /revoke all on table public\.user_entitlements from anon, authenticated/);
assert.match(migration, /grant select[\s\S]*to authenticated/);
assert.match(migration, /for select[\s\S]*to authenticated[\s\S]*auth\.uid\(\)[\s\S]*user_id/);
assert.equal(/grant\s+(?:insert|update|delete)/.test(migration), false, 'Authenticated users must not receive entitlement write grants.');
assert.equal(/for\s+(?:insert|update|delete)/.test(migration), false, 'Migration must not create client write policies.');
assert.equal(migration.includes('service_role'), false, 'Migration must not embed service-role credentials or grants.');

const adapter = fs.readFileSync(new URL('../functions/api/account/entitlements.js', import.meta.url), 'utf8');
assert.match(adapter, /handleEntitlements/);
assert.match(adapter, /context\.request/);
assert.match(adapter, /context\.env/);

console.log('cloudflare entitlement endpoint contract: pass');
