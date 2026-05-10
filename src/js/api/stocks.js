import { fetchJson } from './client.js';

export function getStockQuote(symbol) {
  return fetchJson('stocks', { symbol: symbol.toUpperCase() }, { ttlMs: 15 * 60 * 1000 });
}
