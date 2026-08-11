import { REQUEST_ID_HEADER, resolveRequestId } from '../../src/server/http/request-id.mjs';

const HEALTH_HEADERS = Object.freeze({
  'Cache-Control': 'no-store, max-age=0',
  'Content-Type': 'application/json; charset=utf-8',
  'X-Content-Type-Options': 'nosniff'
});

export function onRequest(context) {
  const requestId = resolveRequestId(context.request);
  const headers = { ...HEALTH_HEADERS, [REQUEST_ID_HEADER]: requestId };
  const method = context.request.method;

  if (method !== 'GET' && method !== 'HEAD') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
      status: 405,
      headers: { ...headers, Allow: 'GET, HEAD' }
    });
  }

  return new Response(method === 'HEAD' ? null : JSON.stringify({ status: 'ok' }), {
    status: 200,
    headers
  });
}
