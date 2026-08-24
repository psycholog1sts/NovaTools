const DEFAULT_TIMEOUT_MS = 4_000;
const STORE_RESULTS = new Set(['applied', 'duplicate', 'stale', 'unbound_user']);

function requestBody(event, identity, features) {
  return {
    p_provider: event.provider,
    p_event_key: identity.eventKey,
    p_payload_hash: identity.payloadHash,
    p_event_type: event.eventType,
    p_event_occurred_at: event.occurredAt,
    p_subscription_id: event.subscriptionId,
    p_customer_id: event.customerId,
    p_user_id: event.userId,
    p_plan_key: event.planKey,
    p_status: event.status,
    p_expires_at: event.expiresAt,
    p_features: features
  };
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

export function createBillingStore({ fetchImpl = globalThis.fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  if (typeof fetchImpl !== 'function') throw new TypeError('fetchImpl must be a function');

  return Object.freeze({
    async processSubscriptionEvent(config, event, identity) {
      const url = new URL('/rest/v1/rpc/process_billing_subscription_event', config.supabaseUrl);
      try {
        const response = await fetchWithTimeout(fetchImpl, url, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            apikey: config.supabaseSecretKey,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody(event, identity, config.features))
        }, timeoutMs);

        if (!response.ok) return Object.freeze({ ok: false, reason: 'billing_store_unavailable' });
        const result = await response.json().catch(() => null);
        if (!STORE_RESULTS.has(result)) {
          return Object.freeze({ ok: false, reason: 'invalid_billing_store_response' });
        }
        return Object.freeze({ ok: true, result });
      } catch (error) {
        return Object.freeze({
          ok: false,
          reason: error?.name === 'AbortError' ? 'billing_store_timeout' : 'billing_store_unavailable'
        });
      }
    }
  });
}
