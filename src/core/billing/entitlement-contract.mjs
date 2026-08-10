import { getPricingPlan } from './pricing-config.mjs';

export const ENTITLEMENT_SCHEMA_VERSION = 1;
export const ENTITLEMENT_AUTHORITY = 'server';

export const PRO_FEATURES = Object.freeze([
  'batch_workflows',
  'saved_presets',
  'workflow_chaining',
  'bulk_export',
  'ad_free',
  'local_workflow_history'
]);

const PRO_PLAN_KEYS = new Set(['pro_monthly', 'pro_annual']);
const ACTIVE_STATUSES = new Set(['active', 'trialing']);
const KNOWN_FEATURES = new Set(PRO_FEATURES);

const EMPTY_FEATURES = Object.freeze([]);

function denied(reason) {
  return Object.freeze({
    schemaVersion: ENTITLEMENT_SCHEMA_VERSION,
    planKey: 'free',
    status: 'inactive',
    isPro: false,
    features: EMPTY_FEATURES,
    reason
  });
}

function parseTime(value) {
  if (!value) return null;
  const time = Date.parse(String(value));
  return Number.isFinite(time) ? time : NaN;
}

function normalizeFeatures(features) {
  if (!Array.isArray(features)) return EMPTY_FEATURES;
  return Object.freeze([
    ...new Set(features.filter((feature) => KNOWN_FEATURES.has(feature)))
  ]);
}

/**
 * Resolve a server entitlement envelope into a client-safe feature snapshot.
 *
 * This function is intentionally fail-closed, but it is not a cryptographic
 * trust mechanism. Callers must only pass data returned by the authenticated
 * NovaTools control plane. Never construct entitlement envelopes from
 * localStorage, query parameters, analytics data, or browser-controlled state.
 */
export function resolveEntitlementEnvelope(envelope, { now = Date.now() } = {}) {
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope)) {
    return denied('missing_entitlement_envelope');
  }

  if (envelope.schemaVersion !== ENTITLEMENT_SCHEMA_VERSION) {
    return denied('unsupported_entitlement_schema');
  }

  if (envelope.authority !== ENTITLEMENT_AUTHORITY) {
    return denied('untrusted_entitlement_authority');
  }

  if (typeof envelope.subject !== 'string' || !envelope.subject.trim()) {
    return denied('missing_entitlement_subject');
  }

  const plan = getPricingPlan(envelope.planKey);
  if (!plan) return denied('unknown_plan');

  if (!ACTIVE_STATUSES.has(envelope.status)) {
    return denied('inactive_subscription_status');
  }

  const expiresAt = parseTime(envelope.expiresAt);
  if (Number.isNaN(expiresAt)) return denied('invalid_entitlement_expiry');
  if (expiresAt !== null && expiresAt <= Number(now)) {
    return denied('expired_entitlement');
  }

  if (!PRO_PLAN_KEYS.has(plan.planKey)) {
    return Object.freeze({
      schemaVersion: ENTITLEMENT_SCHEMA_VERSION,
      planKey: 'free',
      status: envelope.status,
      isPro: false,
      features: EMPTY_FEATURES,
      expiresAt: envelope.expiresAt || null,
      reason: 'free_plan'
    });
  }

  const requestedFeatures = normalizeFeatures(envelope.features);
  const features = requestedFeatures.length === 0
    ? Object.freeze([...PRO_FEATURES])
    : requestedFeatures;

  return Object.freeze({
    schemaVersion: ENTITLEMENT_SCHEMA_VERSION,
    planKey: plan.planKey,
    status: envelope.status,
    isPro: true,
    features,
    expiresAt: envelope.expiresAt || null,
    reason: 'verified_active_plan'
  });
}

export function hasEntitlement(snapshot, feature) {
  return Boolean(
    snapshot?.isPro === true &&
    KNOWN_FEATURES.has(feature) &&
    Array.isArray(snapshot.features) &&
    snapshot.features.includes(feature)
  );
}
