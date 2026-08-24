import { BILLING_PROVIDER, resolveBillingConfig } from './billing-config.mjs';
import { createBillingStore } from './billing-store.mjs';
import {
  normalizeLemonSqueezyEvent,
  normalizePaddleEvent,
  webhookIdentity
} from './provider-events.mjs';
import {
  verifyLemonSqueezySignature,
  verifyPaddleSignature
} from './webhook-signatures.mjs';
import { REQUEST_ID_HEADER, resolveRequestId } from '../http/request-id.mjs';

const MAX_BODY_BYTES = 1_048_576;
const JSON_HEADERS = Object.freeze({
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff'
});

function json(status, body, requestId, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...JSON_HEADERS, [REQUEST_ID_HEADER]: requestId, ...extra }
  });
}

function contentLength(request) {
  const raw = request.headers.get('Content-Length');
  if (!raw) return null;
  return /^\d{1,10}$/.test(raw) ? Number(raw) : NaN;
}

function normalizeEvent(provider, payload, config) {
  return provider === BILLING_PROVIDER.LEMON_SQUEEZY
    ? normalizeLemonSqueezyEvent(payload, config)
    : normalizePaddleEvent(payload, config);
}

async function signatureValid(provider, rawBody, request, config, verifierOptions) {
  if (provider === BILLING_PROVIDER.LEMON_SQUEEZY) {
    return verifyLemonSqueezySignature(
      rawBody,
      request.headers.get('X-Signature'),
      config.webhookSecret,
      verifierOptions
    );
  }

  const result = await verifyPaddleSignature(
    rawBody,
    request.headers.get('Paddle-Signature'),
    config.webhookSecret,
    verifierOptions
  );
  return result.ok;
}

export function createBillingWebhookHandler(provider, {
  store = createBillingStore(),
  verifierOptions,
  requestIdFactory
} = {}) {
  if (!Object.values(BILLING_PROVIDER).includes(provider)) throw new TypeError('Unsupported billing provider');
  if (!store || typeof store.processSubscriptionEvent !== 'function') throw new TypeError('Invalid billing store');

  return async function handleBillingWebhook(request, env = {}) {
    const requestId = resolveRequestId(request, requestIdFactory);
    if (request.method !== 'POST') return json(405, { error: 'method_not_allowed' }, requestId, { Allow: 'POST' });

    const config = resolveBillingConfig(env);
    if (!config.enabled) return json(503, { error: 'billing_not_configured' }, requestId);
    if (config.provider !== provider) return json(404, { error: 'billing_provider_not_active' }, requestId);

    const length = contentLength(request);
    if (Number.isNaN(length) || (length !== null && length > MAX_BODY_BYTES)) {
      return json(413, { error: 'webhook_payload_too_large' }, requestId);
    }

    const contentType = request.headers.get('Content-Type') || '';
    if (!contentType.toLowerCase().startsWith('application/json')) {
      return json(415, { error: 'unsupported_media_type' }, requestId);
    }

    const rawBody = await request.text();
    if (!rawBody || new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json(413, { error: 'webhook_payload_too_large' }, requestId);
    }

    if (!await signatureValid(provider, rawBody, request, config, verifierOptions)) {
      return json(401, { error: 'invalid_webhook_signature' }, requestId);
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json(400, { error: 'invalid_webhook_payload' }, requestId);
    }

    const event = normalizeEvent(provider, payload, config);
    if (!event) return json(400, { error: 'unsupported_webhook_event' }, requestId);
    if (provider === BILLING_PROVIDER.LEMON_SQUEEZY && event.testMode !== true) {
      return json(409, { error: 'live_event_rejected_in_sandbox' }, requestId);
    }
    if (!event.planKey) return json(503, { error: 'billing_plan_mapping_missing' }, requestId);

    const identity = await webhookIdentity(event, rawBody);
    const stored = await store.processSubscriptionEvent(config, event, identity);
    if (!stored.ok) return json(503, { error: stored.reason }, requestId);

    return json(200, { received: true }, requestId);
  };
}
