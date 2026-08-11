import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  BILLING_PROVIDER,
  planKeyForProviderId,
  resolveBillingConfig
} from '../src/server/billing/billing-config.mjs';
import {
  normalizeLemonSqueezyEvent,
  normalizePaddleEvent,
  webhookIdentity
} from '../src/server/billing/provider-events.mjs';
import {
  parsePaddleSignature,
  sha256Hex,
  verifyLemonSqueezySignature,
  verifyPaddleSignature
} from '../src/server/billing/webhook-signatures.mjs';
import { createBillingWebhookHandler } from '../src/server/billing/webhook-handler.mjs';

const encoder = new TextEncoder();
const USER_ID = '11111111-1111-4111-8111-111111111111';
const LEMON_ENV = Object.freeze({
  BILLING_MODE: 'sandbox',
  BILLING_PROVIDER: 'lemon_squeezy',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_test_server_only_key',
  LEMON_SQUEEZY_WEBHOOK_SECRET: 'test-signing-secret',
  LEMON_SQUEEZY_PRO_MONTHLY_VARIANT_ID: '101',
  LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID: '202'
});
const PADDLE_MONTHLY = `pri_${'a'.repeat(26)}`;
const PADDLE_ANNUAL = `pri_${'b'.repeat(26)}`;
const PADDLE_ENV = Object.freeze({
  BILLING_MODE: 'sandbox',
  BILLING_PROVIDER: 'paddle',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_SECRET_KEY: 'sb_secret_test_server_only_key',
  PADDLE_WEBHOOK_SECRET: 'pdl_ntfset_test_secret',
  PADDLE_PRO_MONTHLY_PRICE_ID: PADDLE_MONTHLY,
  PADDLE_PRO_ANNUAL_PRICE_ID: PADDLE_ANNUAL
});

async function hmacHex(message, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return [...new Uint8Array(signature)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function lemonPayload(overrides = {}) {
  return {
    meta: {
      event_name: 'subscription_updated',
      custom_data: { novatools_user_id: USER_ID }
    },
    data: {
      type: 'subscriptions',
      id: 'sub-lemon-1',
      attributes: {
        customer_id: 77,
        variant_id: 101,
        status: 'active',
        ends_at: null,
        created_at: '2026-08-11T10:00:00.000Z',
        updated_at: '2026-08-11T10:01:00.000Z',
        test_mode: true,
        ...overrides
      }
    }
  };
}

function paddlePayload(overrides = {}) {
  return {
    event_id: `evt_${'c'.repeat(26)}`,
    event_type: 'subscription.updated',
    occurred_at: '2026-08-11T10:01:00.000Z',
    data: {
      id: `sub_${'d'.repeat(26)}`,
      customer_id: `ctm_${'e'.repeat(26)}`,
      status: 'active',
      custom_data: { novatools_user_id: USER_ID },
      current_billing_period: { ends_at: '2026-09-11T10:01:00.000Z' },
      items: [{ recurring: true, price: { id: PADDLE_MONTHLY } }],
      ...overrides
    }
  };
}

assert.deepEqual(resolveBillingConfig({}), { enabled: false, mode: 'disabled', reason: 'billing_disabled' });
assert.equal(resolveBillingConfig({ BILLING_MODE: 'live' }).enabled, false, 'Live billing must not be activatable by configuration yet.');
assert.equal(resolveBillingConfig({ ...LEMON_ENV, SUPABASE_SECRET_KEY: 'public-key' }).enabled, false);
assert.equal(resolveBillingConfig({ ...LEMON_ENV, LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID: '101' }).enabled, false);

const lemonConfig = resolveBillingConfig(LEMON_ENV);
assert.equal(lemonConfig.enabled, true);
assert.equal(lemonConfig.provider, BILLING_PROVIDER.LEMON_SQUEEZY);
assert.equal(planKeyForProviderId(lemonConfig, '101'), 'pro_monthly');
assert.equal(planKeyForProviderId(lemonConfig, '999'), null);

const paddleConfig = resolveBillingConfig(PADDLE_ENV);
assert.equal(paddleConfig.enabled, true);
assert.equal(planKeyForProviderId(paddleConfig, PADDLE_ANNUAL), 'pro_annual');

{
  const raw = JSON.stringify(lemonPayload());
  const signature = await hmacHex(raw, LEMON_ENV.LEMON_SQUEEZY_WEBHOOK_SECRET);
  assert.equal(await verifyLemonSqueezySignature(raw, signature, LEMON_ENV.LEMON_SQUEEZY_WEBHOOK_SECRET), true);
  assert.equal(await verifyLemonSqueezySignature(`${raw} `, signature, LEMON_ENV.LEMON_SQUEEZY_WEBHOOK_SECRET), false, 'Raw-body mutation must invalidate signature.');
  assert.equal(await verifyLemonSqueezySignature(raw, 'not-a-signature', LEMON_ENV.LEMON_SQUEEZY_WEBHOOK_SECRET), false);
}

{
  const raw = JSON.stringify(paddlePayload());
  const timestamp = 1_786_444_860;
  const signature = await hmacHex(`${timestamp}:${raw}`, PADDLE_ENV.PADDLE_WEBHOOK_SECRET);
  const header = `ts=${timestamp};h1=${'0'.repeat(64)};h1=${signature}`;
  const parsed = parsePaddleSignature(header);
  assert.equal(parsed.timestamp, timestamp);
  assert.equal(parsed.signatures.length, 2, 'Verifier must support multiple h1 values for provider secret rotation.');
  assert.equal((await verifyPaddleSignature(raw, header, PADDLE_ENV.PADDLE_WEBHOOK_SECRET, { nowSeconds: timestamp })).ok, true);
  assert.equal((await verifyPaddleSignature(raw, header, PADDLE_ENV.PADDLE_WEBHOOK_SECRET, { nowSeconds: timestamp + 6 })).ok, false, 'Paddle replay tolerance must fail closed.');
}

{
  const event = normalizeLemonSqueezyEvent(lemonPayload(), lemonConfig);
  assert.equal(event.userId, USER_ID);
  assert.equal(event.planKey, 'pro_monthly');
  assert.equal(event.status, 'active');
  assert.equal(event.testMode, true);
  const raw = JSON.stringify(lemonPayload());
  const first = await webhookIdentity(event, raw);
  const second = await webhookIdentity(event, raw);
  assert.deepEqual(first, second, 'Lemon Squeezy retransmissions must produce a deterministic idempotency key.');
  assert.equal(first.payloadHash, await sha256Hex(raw));
}

{
  const event = normalizeLemonSqueezyEvent(lemonPayload({ status: 'cancelled', ends_at: '2026-09-11T10:01:00Z' }), lemonConfig);
  assert.equal(event.status, 'canceled');
  assert.equal(event.expiresAt, '2026-09-11T10:01:00.000Z');
}

{
  const event = normalizePaddleEvent(paddlePayload(), paddleConfig);
  assert.equal(event.providerEventId, `evt_${'c'.repeat(26)}`);
  assert.equal(event.planKey, 'pro_monthly');
  assert.equal(event.userId, USER_ID);
  const identity = await webhookIdentity(event, JSON.stringify(paddlePayload()));
  assert.equal(identity.eventKey, event.providerEventId, 'Paddle event_id is the durable idempotency key.');
}

{
  const conflict = paddlePayload({
    items: [
      { recurring: true, price: { id: PADDLE_MONTHLY } },
      { recurring: true, price: { id: PADDLE_ANNUAL } }
    ]
  });
  assert.equal(normalizePaddleEvent(conflict, paddleConfig), null, 'Conflicting Pro plan prices must fail closed.');
}

{
  let storeCalls = 0;
  const handler = createBillingWebhookHandler('lemon_squeezy', {
    store: { processSubscriptionEvent: async () => { storeCalls += 1; return { ok: true, result: 'applied' }; } },
    requestIdFactory: () => 'billing-request-1'
  });
  const response = await handler(new Request('https://mc-novatools.com/api/billing/webhooks/lemon-squeezy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}'
  }), {});
  assert.equal(response.status, 503);
  assert.equal(storeCalls, 0);
  assert.equal(response.headers.get('X-Request-ID'), 'billing-request-1');
}

{
  let storeCalls = 0;
  const raw = JSON.stringify(lemonPayload());
  const signature = await hmacHex(raw, LEMON_ENV.LEMON_SQUEEZY_WEBHOOK_SECRET);
  const handler = createBillingWebhookHandler('lemon_squeezy', {
    store: {
      processSubscriptionEvent: async (_config, event, identity) => {
        storeCalls += 1;
        assert.equal(event.userId, USER_ID);
        assert.equal(event.planKey, 'pro_monthly');
        assert.match(identity.eventKey, /^[a-f0-9]{64}$/);
        return { ok: true, result: 'applied' };
      }
    },
    requestIdFactory: () => 'billing-request-2'
  });
  const request = new Request('https://mc-novatools.com/api/billing/webhooks/lemon-squeezy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
    body: raw
  });
  const response = await handler(request, LEMON_ENV);
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(await response.text()), { received: true });
  assert.equal(storeCalls, 1);
}

{
  let storeCalls = 0;
  const raw = JSON.stringify(lemonPayload());
  const handler = createBillingWebhookHandler('lemon_squeezy', {
    store: { processSubscriptionEvent: async () => { storeCalls += 1; return { ok: true, result: 'applied' }; } }
  });
  const response = await handler(new Request('https://mc-novatools.com/api/billing/webhooks/lemon-squeezy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Signature': '0'.repeat(64) },
    body: raw
  }), LEMON_ENV);
  assert.equal(response.status, 401);
  assert.equal(storeCalls, 0, 'Unverified payloads must never reach durable processing.');
}

{
  const liveRaw = JSON.stringify(lemonPayload({ test_mode: false }));
  const signature = await hmacHex(liveRaw, LEMON_ENV.LEMON_SQUEEZY_WEBHOOK_SECRET);
  const handler = createBillingWebhookHandler('lemon_squeezy', {
    store: { processSubscriptionEvent: async () => { throw new Error('must not store live event'); } }
  });
  const response = await handler(new Request('https://mc-novatools.com/api/billing/webhooks/lemon-squeezy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Signature': signature },
    body: liveRaw
  }), LEMON_ENV);
  assert.equal(response.status, 409);
}

const migration = fs.readFileSync(new URL('../supabase/migrations/20260811133000_billing_sandbox_foundation.sql', import.meta.url), 'utf8').toLowerCase();
for (const table of ['profiles', 'billing_customers', 'subscriptions', 'billing_webhook_events', 'usage_limits', 'usage_events']) {
  assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  assert.match(migration, new RegExp(`alter table public\\.${table} force row level security`));
}
assert.match(migration, /primary key \(provider, event_key\)/, 'Webhook events need provider-scoped durable idempotency.');
assert.match(migration, /where excluded\.last_event_at >= public\.subscriptions\.last_event_at/, 'Delayed events must not overwrite newer subscription state.');
assert.match(migration, /security definer/);
assert.match(migration, /revoke all on function public\.process_billing_subscription_event[\s\S]*from public, anon, authenticated/);
assert.match(migration, /case when p_status in \('active', 'trialing'\) then p_plan_key else 'free' end/, 'Non-active provider states must project to Free.');
assert.equal(/grant\s+(?:insert|update|delete)[\s\S]*on public\.(?:billing_customers|subscriptions|billing_webhook_events|usage_events)[\s\S]*to authenticated/.test(migration), false, 'Clients must not receive billing or usage mutation grants.');

console.log('billing sandbox contract: pass');
