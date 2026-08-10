export const config = { runtime: 'edge' };

const UPSTREAM_TIMEOUT_MS = 8_000;
const SUCCESS_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600';
const ERROR_CACHE_CONTROL = 'no-store, max-age=0';

class PublicRequestError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'PublicRequestError';
    this.code = code;
    this.status = status;
  }
}

const json = (response, status = 200) => new Response(JSON.stringify(response), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': status >= 200 && status < 300 ? SUCCESS_CACHE_CONTROL : ERROR_CACHE_CONTROL
  }
});

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error('upstream_timeout');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url) {
  const response = await fetchWithTimeout(url, {
    headers: { accept: 'application/json', 'user-agent': 'NovaTools/1.0' }
  });
  if (!response.ok) throw new Error('upstream_unavailable');
  return response.json();
}

function readTcmbCurrency(xml, code) {
  const marker = `CurrencyCode="${code}"`;
  const start = xml.indexOf(marker);
  if (start === -1) return null;
  const finish = xml.indexOf('</Currency>', start);
  if (finish === -1) return null;
  const block = xml.slice(start, finish);
  const forexSelling = block.match(/<ForexSelling>([^<]+)<\/ForexSelling>/)?.[1];
  const forexBuying = block.match(/<ForexBuying>([^<]+)<\/ForexBuying>/)?.[1];
  const value = Number.parseFloat(forexSelling || forexBuying || '');
  return Number.isFinite(value) ? value : null;
}

async function fetchText(url) {
  const response = await fetchWithTimeout(url, {
    headers: { accept: 'application/xml,text/xml,*/*', 'user-agent': 'NovaTools/1.0' }
  });
  if (!response.ok) throw new Error('upstream_unavailable');
  return response.text();
}

async function exchange(searchParams) {
  const requestedBase = (searchParams.get('base') || 'USD').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'USD';
  const base = ['TRY', 'USD', 'EUR'].includes(requestedBase) ? requestedBase : 'USD';
  const xml = await fetchText('https://www.tcmb.gov.tr/kurlar/today.xml');
  const usdTry = readTcmbCurrency(xml, 'USD');
  const eurTry = readTcmbCurrency(xml, 'EUR');
  if (!usdTry || !eurTry) throw new Error('upstream_unavailable');
  const tryRates = { TRY: 1, USD: 1 / usdTry, EUR: 1 / eurTry };
  const usdRates = { TRY: usdTry, USD: 1, EUR: usdTry / eurTry };
  const eurRates = { TRY: eurTry, USD: eurTry / usdTry, EUR: 1 };
  const table = { TRY: tryRates, USD: usdRates, EUR: eurRates };
  return { resource: 'exchange', base, date: new Date().toISOString().slice(0, 10), rates: table[base], provider: 'tcmb.gov.tr' };
}

async function crypto(searchParams) {
  const requestedIds = (searchParams.get('ids') || 'bitcoin,ethereum,solana,ripple,cardano').split(',')
    .map((id) => id.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
    .filter(Boolean)
    .slice(0, 12);
  const ids = (requestedIds.length ? requestedIds : ['bitcoin', 'ethereum', 'solana', 'ripple', 'cardano']).join(',');
  const data = await fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`);
  return { resource: 'crypto', coins: data, provider: 'coingecko.com' };
}

async function weather(searchParams) {
  const city = (searchParams.get('city') || '').trim().slice(0, 80);
  if (!city) throw new PublicRequestError('invalid_request', 'City is required.');
  const geo = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  const place = geo.results?.[0];
  if (!place) throw new PublicRequestError('not_found', 'City was not found.', 404);
  const forecast = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`);
  return { resource: 'weather', place, current: forecast.current, units: forecast.current_units, provider: 'open-meteo.com' };
}

async function stocks(searchParams) {
  const symbol = (searchParams.get('symbol') || 'AAPL').toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 12) || 'AAPL';
  const data = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`);
  const result = data.chart?.result?.[0];
  if (!result) throw new PublicRequestError('not_found', 'Stock symbol was not found.', 404);
  const quote = result.indicators?.quote?.[0] || {};
  const meta = result.meta || {};
  const closes = (quote.close || []).filter((value) => Number.isFinite(value));
  const volumes = (quote.volume || []).filter((value) => Number.isFinite(value));
  const lastClose = [...closes].reverse().find((value) => Number.isFinite(value));
  const lastVolume = [...volumes].reverse().find((value) => Number.isFinite(value));
  return { resource: 'stocks', symbol, meta: { ...meta, regularMarketVolume: meta.regularMarketVolume || lastVolume }, closes, lastClose, currency: meta.currency, provider: 'finance.yahoo.com' };
}

const handlers = { exchange, crypto, weather, stocks };

export default async function handler(request) {
  try {
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');
    if (!handlers[resource]) {
      return json({ error: 'unknown_resource', message: 'Unknown live-data resource.' }, 400);
    }
    const body = await handlers[resource](searchParams);
    return json({ ...body, fetchedAt: new Date().toISOString() });
  } catch (error) {
    if (error instanceof PublicRequestError) {
      return json({ error: error.code, message: error.message }, error.status);
    }
    return json({ error: 'live_data_unavailable', message: 'Live data is temporarily unavailable.' }, 502);
  }
}
