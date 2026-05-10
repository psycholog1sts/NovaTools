import { fetchJson } from './client.js';

export function getWeather(city) {
  return fetchJson('weather', { city }, { ttlMs: 60 * 60 * 1000 });
}
