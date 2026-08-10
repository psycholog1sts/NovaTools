export const PRODUCT_EVENT_NAMES = Object.freeze({
  PAGE_VIEW: 'page_view',
  TOOL_VIEW: 'tool_view',
  TOOL_START: 'tool_start',
  TOOL_SUCCESS: 'tool_success',
  TOOL_ERROR: 'tool_error',
  RESULT_DOWNLOAD: 'result_download',
  PRO_CTA_VIEW: 'pro_cta_view',
  PRO_CTA_CLICK: 'pro_cta_click',
  PRICING_VIEW: 'pricing_view',
  CHECKOUT_START: 'checkout_start',
  CHECKOUT_COMPLETE: 'checkout_complete',
  LOGIN_START: 'login_start',
  LOGIN_SUCCESS: 'login_success',
  LOGOUT: 'logout',
  SUBSCRIPTION_STATE_CHANGED: 'subscription_state_changed',
  FEATURE_GATE_HIT: 'feature_gate_hit',
  PRO_FEATURE_USED: 'pro_feature_used'
});

export const EVENT_NAME_ALIASES = Object.freeze({
  content_view: PRODUCT_EVENT_NAMES.PAGE_VIEW,
  tool_task_start: PRODUCT_EVENT_NAMES.TOOL_START,
  tool_task_complete: PRODUCT_EVENT_NAMES.TOOL_SUCCESS,
  tool_task_error: PRODUCT_EVENT_NAMES.TOOL_ERROR
});

export const UNIVERSAL_SAFE_FIELDS = Object.freeze([
  'tool_slug',
  'tool_id',
  'category',
  'locale',
  'device_class',
  'success',
  'error_code',
  'duration_bucket',
  'file_size_bucket',
  'file_count_bucket',
  'output_format',
  'input_method',
  'mode',
  'pro_status',
  'experiment_variant',
  'feature_key',
  'plan_key',
  'billing_interval',
  'subscription_state'
]);

const COMMON_PAGE_FIELDS = ['page_path', 'page_type'];

export const EVENT_ALLOWED_FIELDS = Object.freeze({
  [PRODUCT_EVENT_NAMES.PAGE_VIEW]: [...COMMON_PAGE_FIELDS, 'locale', 'device_class'],
  [PRODUCT_EVENT_NAMES.TOOL_VIEW]: [...COMMON_PAGE_FIELDS, ...UNIVERSAL_SAFE_FIELDS],
  [PRODUCT_EVENT_NAMES.TOOL_START]: [...COMMON_PAGE_FIELDS, ...UNIVERSAL_SAFE_FIELDS, 'action_label'],
  [PRODUCT_EVENT_NAMES.TOOL_SUCCESS]: [...COMMON_PAGE_FIELDS, ...UNIVERSAL_SAFE_FIELDS],
  [PRODUCT_EVENT_NAMES.TOOL_ERROR]: [...COMMON_PAGE_FIELDS, ...UNIVERSAL_SAFE_FIELDS],
  [PRODUCT_EVENT_NAMES.RESULT_DOWNLOAD]: [...COMMON_PAGE_FIELDS, ...UNIVERSAL_SAFE_FIELDS],
  [PRODUCT_EVENT_NAMES.PRO_CTA_VIEW]: [...COMMON_PAGE_FIELDS, 'tool_slug', 'category', 'locale', 'cta_location', 'feature_key', 'experiment_variant'],
  [PRODUCT_EVENT_NAMES.PRO_CTA_CLICK]: [...COMMON_PAGE_FIELDS, 'tool_slug', 'category', 'locale', 'cta_location', 'feature_key', 'experiment_variant'],
  [PRODUCT_EVENT_NAMES.PRICING_VIEW]: [...COMMON_PAGE_FIELDS, 'locale', 'device_class', 'experiment_variant'],
  [PRODUCT_EVENT_NAMES.CHECKOUT_START]: [...COMMON_PAGE_FIELDS, 'plan_key', 'billing_interval', 'locale', 'experiment_variant'],
  [PRODUCT_EVENT_NAMES.CHECKOUT_COMPLETE]: [...COMMON_PAGE_FIELDS, 'plan_key', 'billing_interval', 'locale'],
  [PRODUCT_EVENT_NAMES.LOGIN_START]: [...COMMON_PAGE_FIELDS, 'locale'],
  [PRODUCT_EVENT_NAMES.LOGIN_SUCCESS]: [...COMMON_PAGE_FIELDS, 'locale'],
  [PRODUCT_EVENT_NAMES.LOGOUT]: [...COMMON_PAGE_FIELDS, 'locale'],
  [PRODUCT_EVENT_NAMES.SUBSCRIPTION_STATE_CHANGED]: [...COMMON_PAGE_FIELDS, 'plan_key', 'subscription_state'],
  [PRODUCT_EVENT_NAMES.FEATURE_GATE_HIT]: [...COMMON_PAGE_FIELDS, 'tool_slug', 'feature_key', 'pro_status'],
  [PRODUCT_EVENT_NAMES.PRO_FEATURE_USED]: [...COMMON_PAGE_FIELDS, ...UNIVERSAL_SAFE_FIELDS],
  cta_click: [...COMMON_PAGE_FIELDS, 'cta_location', 'cta_text', 'link_url'],
  nav_click: [...COMMON_PAGE_FIELDS, 'nav_location', 'nav_text', 'link_url'],
  search_query: [...COMMON_PAGE_FIELDS, 'query_hash', 'query_length'],
  language_change: [...COMMON_PAGE_FIELDS, 'old_language', 'new_language'],
  theme_change: [...COMMON_PAGE_FIELDS, 'old_theme', 'new_theme'],
  tool_input_method: [...COMMON_PAGE_FIELDS, 'tool_slug', 'tool_id', 'input_method'],
  blog_article_read: [...COMMON_PAGE_FIELDS, 'read_trigger'],
  blog_scroll_depth: [...COMMON_PAGE_FIELDS, 'percent_scrolled'],
  scroll_depth: [...COMMON_PAGE_FIELDS, 'percent_scrolled'],
  web_vital: [...COMMON_PAGE_FIELDS, 'metric_name', 'metric_value', 'metric_rating', 'metric_id'],
  ad_impression: [...COMMON_PAGE_FIELDS, 'ad_slot', 'device_class'],
  ad_click: [...COMMON_PAGE_FIELDS, 'ad_slot', 'device_class']
});

export function normalizeEventName(name) {
  const normalized = String(name || '').trim().toLowerCase().replace(/[^a-z0-9_:-]/g, '_').slice(0, 64);
  return EVENT_NAME_ALIASES[normalized] || normalized;
}

export function allowedFieldsForEvent(name) {
  const normalized = normalizeEventName(name);
  return new Set(EVENT_ALLOWED_FIELDS[normalized] || [...COMMON_PAGE_FIELDS, ...UNIVERSAL_SAFE_FIELDS]);
}
