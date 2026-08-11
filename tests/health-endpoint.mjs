import assert from 'node:assert/strict';
import { onRequest } from '../functions/api/health.js';

function context(method = 'GET', requestId = null) {
  const headers = requestId ? { 'X-Request-ID': requestId } : {};
  return {
    request: new Request('https://mc-novatools.com/api/health', { method, headers }),
    env: {
      SUPABASE_URL: 'https://do-not-expose.example',
      SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_do_not_expose'
    }
  };
}

{
  const result = onRequest(context('GET', 'health-check-123'));
  assert.equal(result.status, 200);
  assert.deepEqual(JSON.parse(await result.text()), { status: 'ok' });
  assert.match(result.headers.get('Cache-Control'), /no-store/);
  assert.equal(result.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(result.headers.get('X-Request-ID'), 'health-check-123');
  const serialized = JSON.stringify(Object.fromEntries(result.headers.entries()));
  assert.equal(serialized.includes('do-not-expose'), false);
}

{
  const result = onRequest(context('HEAD'));
  assert.equal(result.status, 200);
  assert.equal(await result.text(), '');
  assert.match(result.headers.get('X-Request-ID'), /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/);
}

{
  const result = onRequest(context('POST'));
  assert.equal(result.status, 405);
  assert.equal(result.headers.get('Allow'), 'GET, HEAD');
  assert.deepEqual(JSON.parse(await result.text()), { error: 'method_not_allowed' });
}

console.log('health endpoint contract: pass');
