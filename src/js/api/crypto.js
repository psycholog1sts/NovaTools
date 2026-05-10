import { fetchJson } from './client.js';

export function getCryptoPrices(ids = 'bitcoin,ethereum,solana,ripple,cardano') {
  return fetchJson('crypto', { ids }, { ttlMs: 5 * 60 * 1000 });
}
