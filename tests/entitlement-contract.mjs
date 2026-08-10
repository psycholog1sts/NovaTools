import assert from 'node:assert/strict';
import {
  ENTITLEMENT_AUTHORITY,
  ENTITLEMENT_SCHEMA_VERSION,
  PRO_FEATURES,
  hasEntitlement,
  resolveEntitlementEnvelope
} from '../src/core/billing/entitlement-contract.mjs';

const now = Date.parse('2026-08-10T20:00:00Z');

const activePro = resolveEntitlementEnvelope({
  schemaVersion: ENTITLEMENT_SCHEMA_VERSION,
  authority: ENTITLEMENT_AUTHORITY,
  subject: 'opaque-user-id',
  planKey: 'pro_monthly',
  status: 'active',
  expiresAt: '2026-09-10T20:00:00Z'
}, { now });

assert.equal(activePro.isPro, true);
assert.equal(activePro.planKey, 'pro_monthly');
assert.deepEqual(activePro.features, PRO_FEATURES);
assert.equal(hasEntitlement(activePro, 'batch_workflows'), true);
assert.equal(hasEntitlement(activePro, 'ad_free'), true);

const annualSubset = resolveEntitlementEnvelope({
  schemaVersion: ENTITLEMENT_SCHEMA_VERSION,
  authority: ENTITLEMENT_AUTHORITY,
  subject: 'opaque-user-id',
  planKey: 'pro_annual',
  status: 'trialing',
  features: ['bulk_export', 'unknown_feature', 'bulk_export'],
  expiresAt: '2026-08-11T20:00:00Z'
}, { now });
assert.equal(annualSubset.isPro, true);
assert.deepEqual(annualSubset.features, ['bulk_export']);
assert.equal(hasEntitlement(annualSubset, 'bulk_export'), true);
assert.equal(hasEntitlement(annualSubset, 'unknown_feature'), false);

const free = resolveEntitlementEnvelope({
  schemaVersion: ENTITLEMENT_SCHEMA_VERSION,
  authority: ENTITLEMENT_AUTHORITY,
  subject: 'opaque-user-id',
  planKey: 'free',
  status: 'active'
}, { now });
assert.equal(free.isPro, false);
assert.deepEqual(free.features, []);

for (const [name, envelope, reason] of [
  ['missing', null, 'missing_entitlement_envelope'],
  ['schema', { schemaVersion: 999, authority: ENTITLEMENT_AUTHORITY, subject: 'u', planKey: 'pro_monthly', status: 'active' }, 'unsupported_entitlement_schema'],
  ['client authority', { schemaVersion: ENTITLEMENT_SCHEMA_VERSION, authority: 'client', subject: 'u', planKey: 'pro_monthly', status: 'active' }, 'untrusted_entitlement_authority'],
  ['subject', { schemaVersion: ENTITLEMENT_SCHEMA_VERSION, authority: ENTITLEMENT_AUTHORITY, subject: '', planKey: 'pro_monthly', status: 'active' }, 'missing_entitlement_subject'],
  ['unknown plan', { schemaVersion: ENTITLEMENT_SCHEMA_VERSION, authority: ENTITLEMENT_AUTHORITY, subject: 'u', planKey: 'enterprise', status: 'active' }, 'unknown_plan'],
  ['past due', { schemaVersion: ENTITLEMENT_SCHEMA_VERSION, authority: ENTITLEMENT_AUTHORITY, subject: 'u', planKey: 'pro_monthly', status: 'past_due' }, 'inactive_subscription_status'],
  ['canceled', { schemaVersion: ENTITLEMENT_SCHEMA_VERSION, authority: ENTITLEMENT_AUTHORITY, subject: 'u', planKey: 'pro_monthly', status: 'canceled' }, 'inactive_subscription_status'],
  ['invalid expiry', { schemaVersion: ENTITLEMENT_SCHEMA_VERSION, authority: ENTITLEMENT_AUTHORITY, subject: 'u', planKey: 'pro_monthly', status: 'active', expiresAt: 'not-a-date' }, 'invalid_entitlement_expiry'],
  ['expired', { schemaVersion: ENTITLEMENT_SCHEMA_VERSION, authority: ENTITLEMENT_AUTHORITY, subject: 'u', planKey: 'pro_monthly', status: 'active', expiresAt: '2026-08-10T19:59:59Z' }, 'expired_entitlement']
]) {
  const result = resolveEntitlementEnvelope(envelope, { now });
  assert.equal(result.isPro, false, `${name} must fail closed`);
  assert.equal(result.planKey, 'free', `${name} must fall back to free`);
  assert.deepEqual(result.features, [], `${name} must not expose Pro features`);
  assert.equal(result.reason, reason, `${name} reason mismatch`);
}

const source = await import('node:fs').then((fs) => fs.readFileSync(new URL('../src/core/billing/entitlement-contract.mjs', import.meta.url), 'utf8'));
assert.equal(/localStorage\s*\./.test(source), false, 'Entitlement authority must not read localStorage.');
assert.equal(/sessionStorage\s*\./.test(source), false, 'Entitlement authority must not read sessionStorage.');
assert.equal(/location\.(?:search|hash)/.test(source), false, 'Entitlement authority must not read browser URL state.');

console.log('entitlement contract: pass');
