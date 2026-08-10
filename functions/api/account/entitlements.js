import { handleEntitlements } from '../../../src/server/control-plane/entitlements.mjs';

export function onRequest(context) {
  return handleEntitlements(context.request, context.env);
}
