import { createBillingWebhookHandler } from '../../../../src/server/billing/webhook-handler.mjs';

const handle = createBillingWebhookHandler('lemon_squeezy');

export function onRequest(context) {
  return handle(context.request, context.env);
}
