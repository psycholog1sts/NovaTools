import { allowedFieldsForEvent, normalizeEventName } from './event-schema.mjs';

const FORBIDDEN_KEY_PATTERN = /(file.?name|filename|file.?content|content|text|textarea|clipboard|password|passphrase|token|secret|api.?key|private.?key|authorization|cookie|session|email|phone|address|message|prompt|document|resume|invoice|json|csv|pixel|image.?data|pdf.?data|raw.?payload|amount|balance|salary|income|principal|interest.?value|card|account.?number)/i;
const FILE_LIKE_VALUE_PATTERN = /\b[^\s/\\]+\.(?:pdf|docx?|xlsx?|csv|json|txt|jpe?g|png|webp|gif|svg|zip|rar|7z|pem|key|p12|pfx)\b/i;
const SECRET_LIKE_VALUE_PATTERN = /(?:sk-[a-z0-9_-]{12,}|-----BEGIN [A-Z ]+PRIVATE KEY-----|bearer\s+[a-z0-9._~-]{12,}|eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{5,})/i;
const BUCKET_PATTERN = /^(?:<1MB|1-5MB|5-20MB|20-50MB|50MB\+|1|2-5|6-10|11-25|26-50|50\+|under_100ms|100-500ms|500ms-2s|2-5s|5s\+|unknown)$/;

function safePath(value) {
  try {
    const url = new URL(String(value || ''), 'https://mc-novatools.com');
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    return url.origin === 'https://mc-novatools.com' ? url.pathname : `${url.origin}${url.pathname}`;
  } catch {
    return '';
  }
}

function safeLabel(value) {
  const text = String(value || '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  if (!text || FILE_LIKE_VALUE_PATTERN.test(text) || SECRET_LIKE_VALUE_PATTERN.test(text)) return '';
  return text;
}

function safeIdentifier(value, maxLength = 80) {
  const text = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_./:-]/g, '_').replace(/_+/g, '_').slice(0, maxLength);
  return SECRET_LIKE_VALUE_PATTERN.test(text) ? '' : text;
}

function safePrimitive(key, value) {
  if (FORBIDDEN_KEY_PATTERN.test(key)) return undefined;
  if (value === null || value === undefined) return undefined;

  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return undefined;
    if (key === 'metric_value' || key === 'percent_scrolled' || key === 'query_length') return value;
    return undefined;
  }
  if (typeof value !== 'string') return undefined;

  if (key === 'page_path' || key === 'link_url') return safePath(value);
  if (key.endsWith('_text') || key.endsWith('_label')) return safeLabel(value);
  if (key.endsWith('_bucket')) return BUCKET_PATTERN.test(value) ? value : undefined;
  if (key === 'query_hash') return /^[a-z0-9]{1,32}$/i.test(value) ? value : undefined;
  if (key === 'metric_id') return safeIdentifier(value, 64);
  if (key === 'metric_rating') return ['good', 'needs-improvement', 'poor', 'unknown'].includes(value) ? value : 'unknown';

  return safeIdentifier(value);
}

export function sanitizeEventPayload(eventName, params = {}) {
  const name = normalizeEventName(eventName);
  if (!name) return { name: '', params: {} };

  const allowed = allowedFieldsForEvent(name);
  const safe = {};

  for (const [key, value] of Object.entries(params || {})) {
    if (!allowed.has(key) || FORBIDDEN_KEY_PATTERN.test(key)) continue;
    const sanitized = safePrimitive(key, value);
    if (sanitized !== undefined && sanitized !== '') safe[key] = sanitized;
  }

  return { name, params: safe };
}

export function containsForbiddenAnalyticsField(value) {
  if (!value || typeof value !== 'object') return false;
  return Object.keys(value).some((key) => FORBIDDEN_KEY_PATTERN.test(key));
}
