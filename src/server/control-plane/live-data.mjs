/**
 * Shared live-data resource handlers (TCMB exchange rates, CoinGecko crypto
 * prices, Open-Meteo weather, Yahoo Finance stock lookups). Runtime-agnostic:
 * imported by both the Vercel Edge Function (api/live-data.js, Vercel preview
 * deployments) and the Cloudflare Pages Function (functions/api/live-data.js,
 * production — mc-novatools.com is served by Cloudflare Pages).
 *
 * All upstreams here are fixed, trusted providers (not user-supplied), so
 * unlike the GEO scan endpoint this has no SSRF surface.
 */

const UPSTREAM_TIMEOUT_MS = 8_000;

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

async function fetchJson(url, extraHeaders = {}) {
  const response = await fetchWithTimeout(url, {
    headers: { accept: 'application/json', 'user-agent': 'NovaTools/1.0', ...extraHeaders }
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

export class PublicRequestError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'PublicRequestError';
    this.code = code;
    this.status = status;
  }
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

async function crypto(searchParams, env = {}) {
  const requestedIds = (searchParams.get('ids') || 'bitcoin,ethereum,solana,ripple,cardano').split(',')
    .map((id) => id.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
    .filter(Boolean)
    .slice(0, 12);
  const ids = (requestedIds.length ? requestedIds : ['bitcoin', 'ethereum', 'solana', 'ripple', 'cardano']).join(',');
  // CoinGecko's keyless API rejects Cloudflare's shared egress IPs; a free Demo key
  // (Cloudflare Pages env COINGECKO_DEMO_API_KEY) lifts that.
  const demoKey = String(env.COINGECKO_DEMO_API_KEY || '').trim();
  try {
    const data = await fetchJson(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd,try&include_market_cap=true&include_24hr_vol=true&include_24hr_change=true&include_last_updated_at=true`,
      demoKey ? { 'x-cg-demo-api-key': demoKey } : {}
    );
    return { resource: 'crypto', coins: data, provider: 'coingecko.com' };
  } catch {
    return coinbaseSpotPrices(ids.split(','));
  }
}

// Keyless fallback: Coinbase public exchange rates (spot USD/TRY only). Market cap,
// volume and 24h change are not available there and are left absent, not estimated.
const COINBASE_SYMBOLS = {
  bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', ripple: 'XRP', cardano: 'ADA',
  dogecoin: 'DOGE', polkadot: 'DOT', litecoin: 'LTC', chainlink: 'LINK', 'avalanche-2': 'AVAX', tether: 'USDT'
};

async function coinbaseSpotPrices(ids) {
  const coins = {};
  await Promise.all(ids.filter((id) => COINBASE_SYMBOLS[id]).map(async (id) => {
    try {
      const { data } = await fetchJson(`https://api.coinbase.com/v2/exchange-rates?currency=${COINBASE_SYMBOLS[id]}`);
      const usd = Number(data?.rates?.USD);
      const tryPrice = Number(data?.rates?.TRY);
      if (Number.isFinite(usd) && usd > 0 && Number.isFinite(tryPrice) && tryPrice > 0) coins[id] = { usd, try: tryPrice };
    } catch {
      // A coin the fallback cannot price is omitted; the client reports partial data.
    }
  }));
  if (!Object.keys(coins).length) throw new Error('upstream_unavailable');
  return { resource: 'crypto', coins, provider: 'coinbase.com' };
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

/**
 * @param {URLSearchParams} searchParams
 * @param {Record<string, string>} [env] runtime bindings (Cloudflare `context.env`, Vercel `process.env`)
 * @returns {Promise<{status: number, body: object}>}
 */
export async function handleLiveData(searchParams, env = {}) {
  const resource = searchParams.get('resource');
  if (!handlers[resource]) {
    return { status: 400, body: { error: 'unknown_resource', message: 'Unknown live-data resource.' } };
  }

  try {
    const body = await handlers[resource](searchParams, env);
    return { status: 200, body: { ...body, fetchedAt: new Date().toISOString() } };
  } catch (error) {
    if (error instanceof PublicRequestError) {
      return { status: error.status, body: { error: error.code, message: error.message } };
    }
    return { status: 502, body: { error: 'live_data_unavailable', message: 'Live data is temporarily unavailable.' } };
  }
}
