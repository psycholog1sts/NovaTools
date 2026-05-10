import { fetchJson } from './client.js';

export function getExchangeRates(base = 'USD') {
  return fetchJson('exchange', { base: base.toUpperCase() }, { ttlMs: 60 * 60 * 1000 });
}
