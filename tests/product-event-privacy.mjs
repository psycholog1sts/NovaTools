import assert from 'node:assert/strict';
import { PRODUCT_EVENT_NAMES, normalizeEventName } from '../src/core/analytics/event-schema.mjs';
import { sanitizeEventPayload } from '../src/core/analytics/privacy-filter.mjs';

assert.equal(normalizeEventName('tool_task_start'), PRODUCT_EVENT_NAMES.TOOL_START);
assert.equal(normalizeEventName('tool_task_complete'), PRODUCT_EVENT_NAMES.TOOL_SUCCESS);
assert.equal(normalizeEventName('tool_task_error'), PRODUCT_EVENT_NAMES.TOOL_ERROR);
assert.equal(normalizeEventName('content_view'), PRODUCT_EVENT_NAMES.PAGE_VIEW);

const toolStart = sanitizeEventPayload('tool_task_start', {
  page_path: '/tools/pdf/compress/?file=private.pdf',
  page_type: 'tool',
  tool_slug: 'pdf/compress',
  action_label: 'Optimize PDF',
  filename: 'tax-return-2026.pdf',
  fileName: 'passport.png',
  content: 'private document text',
  clipboard: 'secret clipboard value',
  apiKey: 'sk-example-secret-value-123456789',
  amount: 125000,
  salary: 90000,
  arbitrary_nested: { token: 'secret' }
});

assert.equal(toolStart.name, PRODUCT_EVENT_NAMES.TOOL_START);
assert.deepEqual(toolStart.params, {
  page_path: '/tools/pdf/compress/',
  page_type: 'tool',
  tool_slug: 'pdf/compress',
  action_label: 'Optimize PDF'
});

const toolSuccess = sanitizeEventPayload(PRODUCT_EVENT_NAMES.TOOL_SUCCESS, {
  tool_slug: 'image/compress',
  file_size_bucket: '5-20MB',
  file_count_bucket: '2-5',
  duration_bucket: '500ms-2s',
  output_format: 'webp',
  success: true,
  originalSize: 12345678,
  outputSize: 4567890,
  imageData: 'data:image/png;base64,private',
  file: { name: 'private.png' }
});

assert.deepEqual(toolSuccess.params, {
  tool_slug: 'image/compress',
  file_size_bucket: '5-20MB',
  file_count_bucket: '2-5',
  duration_bucket: '500ms-2s',
  output_format: 'webp',
  success: true
});

const toolError = sanitizeEventPayload(PRODUCT_EVENT_NAMES.TOOL_ERROR, {
  tool_slug: 'dev/json-formatter',
  error_code: 'invalid_json',
  error_message: 'Unexpected token near password=secret',
  json_input: '{"password":"secret"}'
});
assert.deepEqual(toolError.params, {
  tool_slug: 'dev/json-formatter',
  error_code: 'invalid_json'
});

const checkout = sanitizeEventPayload(PRODUCT_EVENT_NAMES.CHECKOUT_START, {
  plan_key: 'pro_monthly',
  billing_interval: 'monthly',
  experiment_variant: 'pricing_a',
  amount: 12,
  currency_amount: 1200,
  provider_product_id: 'private-provider-id',
  entitlement_list: ['pro.batch.pdf']
});
assert.deepEqual(checkout.params, {
  plan_key: 'pro_monthly',
  billing_interval: 'monthly',
  experiment_variant: 'pricing_a'
});

const navigation = sanitizeEventPayload('nav_click', {
  nav_location: 'header',
  nav_text: 'Open report.pdf',
  link_url: 'https://mc-novatools.com/tools/pdf/merge/?utm_source=private&email=user@example.com'
});
assert.deepEqual(navigation.params, {
  nav_location: 'header',
  link_url: '/tools/pdf/merge/'
});

const search = sanitizeEventPayload('search_query', {
  page_path: '/?q=passport number',
  query_hash: 'abc123',
  query_length: 15,
  query: 'passport number'
});
assert.deepEqual(search.params, {
  page_path: '/',
  query_hash: 'abc123',
  query_length: 15
});

const unknownToolEvent = sanitizeEventPayload('pdf-compress-success', {
  tool_slug: 'pdf/compress',
  file_size_bucket: '1-5MB',
  output_format: 'pdf',
  exact_bytes: 123456,
  filename: 'private.pdf',
  note: 'user supplied text'
});
assert.deepEqual(unknownToolEvent.params, {
  tool_slug: 'pdf/compress',
  file_size_bucket: '1-5MB',
  output_format: 'pdf'
});

console.log('product event privacy contract: pass');
