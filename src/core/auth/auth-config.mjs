export const AUTH_PROVIDER = 'supabase';

export const CLIENT_AUTH_ENV_KEYS = Object.freeze({
  url: 'VITE_SUPABASE_URL',
  publishableKey: 'VITE_SUPABASE_PUBLISHABLE_KEY'
});

const FORBIDDEN_CLIENT_ENV_NAME = /^VITE_[A-Z0-9_]*(?:SECRET|SERVICE_ROLE|PRIVATE_KEY|SERVICE_KEY)/i;
const PUBLISHABLE_KEY_PREFIX = 'sb_publishable_';

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function isAllowedClientUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:') return true;
    return url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
  } catch {
    return false;
  }
}

function isPublishableKey(value) {
  return value.startsWith(PUBLISHABLE_KEY_PREFIX) && value.length > PUBLISHABLE_KEY_PREFIX.length;
}

export function resolveAuthConfig(env = {}) {
  const exposedSecretName = Object.keys(env).find((name) => FORBIDDEN_CLIENT_ENV_NAME.test(name));
  if (exposedSecretName) {
    return Object.freeze({
      provider: AUTH_PROVIDER,
      enabled: false,
      status: 'misconfigured',
      reason: 'forbidden_client_secret_env'
    });
  }

  const url = clean(env[CLIENT_AUTH_ENV_KEYS.url]);
  const publishableKey = clean(env[CLIENT_AUTH_ENV_KEYS.publishableKey]);

  if (!url && !publishableKey) {
    return Object.freeze({
      provider: AUTH_PROVIDER,
      enabled: false,
      status: 'not_configured',
      reason: 'public_auth_env_missing'
    });
  }

  if (!url || !publishableKey) {
    return Object.freeze({
      provider: AUTH_PROVIDER,
      enabled: false,
      status: 'misconfigured',
      reason: 'public_auth_env_incomplete'
    });
  }

  if (!isAllowedClientUrl(url)) {
    return Object.freeze({
      provider: AUTH_PROVIDER,
      enabled: false,
      status: 'misconfigured',
      reason: 'invalid_supabase_url'
    });
  }

  if (!isPublishableKey(publishableKey)) {
    return Object.freeze({
      provider: AUTH_PROVIDER,
      enabled: false,
      status: 'misconfigured',
      reason: 'invalid_publishable_key'
    });
  }

  return Object.freeze({
    provider: AUTH_PROVIDER,
    enabled: true,
    status: 'ready',
    url,
    publishableKey
  });
}

export function assertAuthConfigSafe(env = {}) {
  const config = resolveAuthConfig(env);
  if (config.status === 'misconfigured') {
    throw new Error(`Auth configuration rejected: ${config.reason}`);
  }
  return config;
}
