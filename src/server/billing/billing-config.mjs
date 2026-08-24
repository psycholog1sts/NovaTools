import { PRO_FEATURES } from '../../core/billing/entitlement-contract.mjs';

export const BILLING_MODE = Object.freeze({ DISABLED: 'disabled', SANDBOX: 'sandbox' });
export const BILLING_PROVIDER = Object.freeze({
  LEMON_SQUEEZY: 'lemon_squeezy',
  PADDLE: 'paddle'
});

const SECRET_PREFIX = ['sb', 'secret'].join('_') + '_';
const LEMON_ID = /^\d{1,20}$/;
const PADDLE_PRICE_ID = /^pri_[a-z0-9]{26}$/;

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function httpsUrl(value) {
  try {
    const url = new URL(clean(value));
    if (url.protocol !== 'https:') return null;
    url.pathname = '/';
    url.search = '';
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

function disabled(reason = 'billing_disabled') {
  return Object.freeze({ enabled: false, mode: BILLING_MODE.DISABLED, reason });
}

function providerPlanIds(provider, env) {
  if (provider === BILLING_PROVIDER.LEMON_SQUEEZY) {
    const monthly = clean(env.LEMON_SQUEEZY_PRO_MONTHLY_VARIANT_ID);
    const annual = clean(env.LEMON_SQUEEZY_PRO_ANNUAL_VARIANT_ID);
    if (!LEMON_ID.test(monthly) || !LEMON_ID.test(annual) || monthly === annual) return null;
    return Object.freeze({ pro_monthly: monthly, pro_annual: annual });
  }

  if (provider === BILLING_PROVIDER.PADDLE) {
    const monthly = clean(env.PADDLE_PRO_MONTHLY_PRICE_ID);
    const annual = clean(env.PADDLE_PRO_ANNUAL_PRICE_ID);
    if (!PADDLE_PRICE_ID.test(monthly) || !PADDLE_PRICE_ID.test(annual) || monthly === annual) return null;
    return Object.freeze({ pro_monthly: monthly, pro_annual: annual });
  }

  return null;
}

export function resolveBillingConfig(env = {}) {
  const mode = clean(env.BILLING_MODE) || BILLING_MODE.DISABLED;
  if (mode === BILLING_MODE.DISABLED) return disabled();
  if (mode !== BILLING_MODE.SANDBOX) return disabled('unsupported_billing_mode');

  const provider = clean(env.BILLING_PROVIDER);
  if (!Object.values(BILLING_PROVIDER).includes(provider)) return disabled('invalid_billing_provider');

  const supabaseUrl = httpsUrl(env.SUPABASE_URL);
  const supabaseSecretKey = clean(env.SUPABASE_SECRET_KEY);
  if (!supabaseUrl || !supabaseSecretKey.startsWith(SECRET_PREFIX)) {
    return disabled('billing_store_not_configured');
  }

  const webhookSecret = provider === BILLING_PROVIDER.LEMON_SQUEEZY
    ? clean(env.LEMON_SQUEEZY_WEBHOOK_SECRET)
    : clean(env.PADDLE_WEBHOOK_SECRET);
  if (webhookSecret.length < 6 || webhookSecret.length > 256) {
    return disabled('webhook_secret_not_configured');
  }

  const planIds = providerPlanIds(provider, env);
  if (!planIds) return disabled('billing_plan_mapping_not_configured');

  return Object.freeze({
    enabled: true,
    mode,
    provider,
    supabaseUrl,
    supabaseSecretKey,
    webhookSecret,
    plans: planIds,
    features: Object.freeze([...PRO_FEATURES])
  });
}

export function planKeyForProviderId(config, providerId) {
  const candidate = clean(providerId);
  if (!config?.enabled || !candidate) return null;
  return Object.entries(config.plans).find(([, value]) => value === candidate)?.[0] || null;
}
