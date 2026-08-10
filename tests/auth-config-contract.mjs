import assert from 'node:assert/strict';
import { assertAuthConfigSafe, resolveAuthConfig } from '../src/core/auth/auth-config.mjs';

const disabled = resolveAuthConfig({});
assert.equal(disabled.enabled, false);
assert.equal(disabled.status, 'not_configured');

const ready = resolveAuthConfig({
  VITE_SUPABASE_URL: 'https://example.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example_public_key'
});
assert.equal(ready.enabled, true);
assert.equal(ready.status, 'ready');
assert.equal(ready.url, 'https://example.supabase.co');
assert.equal(ready.publishableKey, 'sb_publishable_example_public_key');

for (const env of [
  { VITE_SUPABASE_URL: 'https://example.supabase.co' },
  { VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example_public_key' },
  { VITE_SUPABASE_URL: 'javascript:alert(1)', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example_public_key' },
  { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_never_client_side' },
  { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'legacy-jwt-value' },
  { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example_public_key', VITE_SUPABASE_SECRET_KEY: 'hidden' },
  { VITE_SUPABASE_URL: 'https://example.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_example_public_key', VITE_SERVICE_ROLE_KEY: 'hidden' }
]) {
  const config = resolveAuthConfig(env);
  assert.equal(config.enabled, false);
  assert.equal(config.status, 'misconfigured');
  assert.equal(JSON.stringify(config).includes('hidden'), false);
  assert.throws(() => assertAuthConfigSafe(env), /Auth configuration rejected:/);
}

const local = resolveAuthConfig({
  VITE_SUPABASE_URL: 'http://localhost:54321',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_local_key'
});
assert.equal(local.enabled, true);

console.log('auth config contract: pass');
