const encoder = new TextEncoder();
const HEX_SHA256 = /^[a-f0-9]{64}$/i;

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function hexBytes(value) {
  if (!HEX_SHA256.test(value)) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = Number.parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

async function importHmacKey(secret, cryptoImpl) {
  return cryptoImpl.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );
}

async function verifyHexHmac(message, signatureHex, secret, cryptoImpl) {
  const signature = hexBytes(clean(signatureHex));
  const normalizedSecret = clean(secret);
  if (!signature || !normalizedSecret) return false;

  try {
    const key = await importHmacKey(normalizedSecret, cryptoImpl);
    return await cryptoImpl.subtle.verify(
      'HMAC',
      key,
      signature,
      encoder.encode(message)
    );
  } catch {
    return false;
  }
}

export async function verifyLemonSqueezySignature(
  rawBody,
  signatureHeader,
  secret,
  { cryptoImpl = globalThis.crypto } = {}
) {
  if (typeof rawBody !== 'string') return false;
  return verifyHexHmac(rawBody, signatureHeader, secret, cryptoImpl);
}

export function parsePaddleSignature(signatureHeader) {
  const header = clean(signatureHeader);
  if (!header || header.length > 2_048) return null;

  const timestamps = [];
  const signatures = [];
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator <= 0) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === 'ts' && /^\d{1,12}$/.test(value)) timestamps.push(value);
    if (key === 'h1' && HEX_SHA256.test(value)) signatures.push(value.toLowerCase());
  }

  if (timestamps.length !== 1 || signatures.length === 0) return null;
  return Object.freeze({
    timestamp: Number(timestamps[0]),
    timestampRaw: timestamps[0],
    signatures: Object.freeze([...new Set(signatures)])
  });
}

export async function verifyPaddleSignature(
  rawBody,
  signatureHeader,
  secret,
  {
    cryptoImpl = globalThis.crypto,
    nowSeconds = Math.floor(Date.now() / 1_000),
    toleranceSeconds = 5
  } = {}
) {
  if (typeof rawBody !== 'string') return Object.freeze({ ok: false, reason: 'invalid_body' });
  const parsed = parsePaddleSignature(signatureHeader);
  if (!parsed) return Object.freeze({ ok: false, reason: 'invalid_signature_header' });

  const tolerance = Number(toleranceSeconds);
  const current = Number(nowSeconds);
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 300 || !Number.isFinite(current)) {
    return Object.freeze({ ok: false, reason: 'invalid_verifier_config' });
  }

  if (Math.abs(current - parsed.timestamp) > tolerance) {
    return Object.freeze({ ok: false, reason: 'signature_timestamp_outside_tolerance' });
  }

  const signedPayload = `${parsed.timestampRaw}:${rawBody}`;
  for (const signature of parsed.signatures) {
    if (await verifyHexHmac(signedPayload, signature, secret, cryptoImpl)) {
      return Object.freeze({ ok: true, timestamp: parsed.timestamp });
    }
  }

  return Object.freeze({ ok: false, reason: 'signature_mismatch' });
}

export async function sha256Hex(value, { cryptoImpl = globalThis.crypto } = {}) {
  const digest = await cryptoImpl.subtle.digest('SHA-256', encoder.encode(String(value)));
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}
