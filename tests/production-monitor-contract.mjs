import assert from 'node:assert/strict';
import { evaluateLiveData, evaluateSitemapPage } from '../scripts/monitor-production.mjs';

const loc = 'https://mc-novatools.com/contact';
const page = (head) => `<!DOCTYPE html><html><head>${head}</head><body></body></html>`;

assert.deepEqual(evaluateSitemapPage(loc, 200, page('<link rel="canonical" href="https://mc-novatools.com/contact">')), []);
assert.match(evaluateSitemapPage(loc, 308, '', '/contact')[0], /HTTP 308/);
assert.match(evaluateSitemapPage('https://mc-novatools.com/contact.html', 200, page('<link rel="canonical" href="https://mc-novatools.com/contact.html">'))[0], /\.html/);
assert.match(evaluateSitemapPage(loc, 200, page('<link rel="canonical" href="https://mc-novatools.com/contact.html">'))[0], /canonical/);
assert.match(evaluateSitemapPage(loc, 200, page(''))[0], /canonical missing/);
assert.match(
  evaluateSitemapPage(loc, 200, page('<link rel="canonical" href="https://mc-novatools.com/contact"><meta name="robots" content="noindex, follow">')).join(' '),
  /noindex/
);

// The 2026-11-04 incident: crypto returned 502 while /api/health said "ok".
assert.deepEqual(evaluateLiveData('crypto', 200, { coins: { bitcoin: { usd: 76934.97, try: 3850167 } } }), []);
assert.match(evaluateLiveData('crypto', 502, { error: 'live_data_unavailable' })[0], /HTTP 502/);
assert.match(evaluateLiveData('crypto', 200, { coins: {} })[0], /no numeric/);
assert.deepEqual(evaluateLiveData('exchange', 200, { rates: { TRY: 49.99 } }), []);
assert.deepEqual(evaluateLiveData('stocks', 200, { lastClose: 331.9 }), []);
assert.deepEqual(evaluateLiveData('weather', 200, { current: { temperature_2m: 14.2 } }), []);
assert.match(evaluateLiveData('weather', 200, { current: {} })[0], /no numeric/);

console.log('production monitor contract: pass');
