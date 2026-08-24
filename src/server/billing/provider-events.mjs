import { planKeyForProviderId } from './billing-config.mjs';
import { sha256Hex } from './webhook-signatures.mjs';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const INTERNAL_STATUSES = new Set([
  'active',
  'trialing',
  'past_due',
  'paused',
  'unpaid',
  'canceled',
  'expired'
]);

function clean(value) {
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  return typeof value === 'string' ? value.trim() : '';
}

function dateOrNull(value) {
  const candidate = clean(value);
  if (!candidate) return null;
  return Number.isFinite(Date.parse(candidate)) ? new Date(candidate).toISOString() : null;
}

function userIdFromCustomData(customData) {
  if (!customData || typeof customData !== 'object' || Array.isArray(customData)) return null;
  const candidate = clean(customData.novatools_user_id || customData.user_id);
  return UUID.test(candidate) ? candidate.toLowerCase() : null;
}

function normalizedStatus(value, aliases = {}) {
  const candidate = aliases[clean(value)] || clean(value);
  return INTERNAL_STATUSES.has(candidate) ? candidate : null;
}

function freezeEvent(event) {
  return Object.freeze(event);
}

export function normalizeLemonSqueezyEvent(payload, config) {
  const eventType = clean(payload?.meta?.event_name);
  const data = payload?.data;
  const attributes = data?.attributes;
  if (!eventType.startsWith('subscription_') || data?.type !== 'subscriptions' || !attributes) return null;

  const subscriptionId = clean(data.id);
  const customerId = clean(attributes.customer_id);
  const providerPlanId = clean(attributes.variant_id);
  const status = normalizedStatus(attributes.status, { on_trial: 'trialing', cancelled: 'canceled' });
  const occurredAt = dateOrNull(attributes.updated_at || attributes.created_at);
  if (!subscriptionId || !customerId || !providerPlanId || !status || !occurredAt) return null;

  return freezeEvent({
    provider: 'lemon_squeezy',
    providerEventId: null,
    eventType,
    occurredAt,
    subscriptionId,
    customerId,
    userId: userIdFromCustomData(payload.meta?.custom_data),
    providerPlanId,
    planKey: planKeyForProviderId(config, providerPlanId),
    status,
    expiresAt: dateOrNull(attributes.ends_at),
    testMode: attributes.test_mode === true
  });
}

export function normalizePaddleEvent(payload, config) {
  const eventId = clean(payload?.event_id);
  const eventType = clean(payload?.event_type);
  const data = payload?.data;
  if (!/^evt_[a-z0-9]{26}$/.test(eventId) || !eventType.startsWith('subscription.') || !data) return null;

  const subscriptionId = clean(data.id);
  const customerId = clean(data.customer_id);
  const status = normalizedStatus(data.status);
  const occurredAt = dateOrNull(payload.occurred_at);
  const recurringPriceIds = Array.isArray(data.items)
    ? data.items
      .filter((item) => item?.recurring !== false)
      .map((item) => clean(item?.price?.id))
      .filter(Boolean)
    : [];
  const mappedPlanKeys = [...new Set(recurringPriceIds.map((id) => planKeyForProviderId(config, id)).filter(Boolean))];
  const providerPlanId = recurringPriceIds.find((id) => planKeyForProviderId(config, id)) || null;
  if (!subscriptionId || !customerId || !status || !occurredAt || mappedPlanKeys.length > 1) return null;

  return freezeEvent({
    provider: 'paddle',
    providerEventId: eventId,
    eventType,
    occurredAt,
    subscriptionId,
    customerId,
    userId: userIdFromCustomData(data.custom_data),
    providerPlanId,
    planKey: mappedPlanKeys[0] || null,
    status,
    expiresAt: dateOrNull(data.current_billing_period?.ends_at || data.scheduled_change?.effective_at),
    testMode: config?.mode === 'sandbox'
  });
}

export async function webhookIdentity(normalizedEvent, rawBody) {
  if (!normalizedEvent || typeof rawBody !== 'string') return null;
  const payloadHash = await sha256Hex(rawBody);
  const eventKey = normalizedEvent.providerEventId
    ? normalizedEvent.providerEventId
    : await sha256Hex(`${normalizedEvent.eventType}\n${rawBody}`);
  return Object.freeze({ eventKey, payloadHash });
}
