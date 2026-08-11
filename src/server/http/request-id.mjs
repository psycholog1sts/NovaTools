const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

export const REQUEST_ID_HEADER = 'X-Request-ID';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

export function validRequestId(value) {
  return REQUEST_ID_PATTERN.test(clean(value));
}

export function resolveRequestId(request, idFactory = () => globalThis.crypto.randomUUID()) {
  const incoming = clean(request?.headers?.get?.(REQUEST_ID_HEADER));
  if (validRequestId(incoming)) return incoming;

  const generated = clean(idFactory());
  if (validRequestId(generated)) return generated;

  const fallback = globalThis.crypto.randomUUID();
  if (validRequestId(fallback)) return fallback;

  throw new Error('Unable to create a valid request ID.');
}
