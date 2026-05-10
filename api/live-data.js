export const config = { runtime: 'edge' };

const json = (response, status = 200) => new Response(JSON.stringify(response), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 's-maxage=300, stale-while-revalidate=3600'
  }
});

async function fetchJson(url) {
  const response = await fetch(url, { headers: { accept: 'application/json', 'user-agent': 'NovaTools/1.0' } });
  if (!response.ok) throw new Error(`Upstream returned ${response.status}`);
  return response.json();
}

async function exchange(searchParams) {
  const base = (searchParams.get('base') || 'USD').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'USD';
  const data = await fetchJson(`https://api.frankfurter.app/latest?from=${base}`);
  return { resource: 'exchange', base: data.base, date: data.date, rates: data.rates, provider: 'frankfurter.app' };
}

async function crypto(searchParams) {
  const ids = (searchParams.get('ids') || 'bitcoin,ethereum,solana,ripple,cardano').split(',')
    .map((id) => id.trim().toLowerCase().replace(/[^a-z0-9-]/g, ''))
    .filter(Boolean)
    .slice(0, 12)
    .join(',');
  const data = await fetchJson(`https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true&include_last_updated_at=true`);
  return { resource: 'crypto', coins: data, provider: 'coingecko.com' };
}

async function weather(searchParams) {
  const city = (searchParams.get('city') || '').trim().slice(0, 80);
  if (!city) throw new Error('City is required.');
  const geo = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
  const place = geo.results?.[0];
  if (!place) throw new Error('City was not found.');
  const forecast = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`);
  return { resource: 'weather', place, current: forecast.current, units: forecast.current_units, provider: 'open-meteo.com' };
}

async function stocks(searchParams) {
  const symbol = (searchParams.get('symbol') || 'AAPL').toUpperCase().replace(/[^A-Z0-9.-]/g, '').slice(0, 12) || 'AAPL';
  const data = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`);
  const result = data.chart?.result?.[0];
  if (!result) throw new Error('Stock symbol was not found.');
  const quote = result.indicators?.quote?.[0] || {};
  const meta = result.meta || {};
  const lastClose = [...(quote.close || [])].reverse().find((value) => Number.isFinite(value));
  return { resource: 'stocks', symbol, meta, lastClose, currency: meta.currency, provider: 'finance.yahoo.com' };
}

const handlers = { exchange, crypto, weather, stocks };

export default async function handler(request) {
  try {
    const { searchParams } = new URL(request.url);
    const resource = searchParams.get('resource');
    if (!handlers[resource]) return json({ error: 'unknown_resource', message: 'Unknown live-data resource.' }, 400);
    const body = await handlers[resource](searchParams);
    return json({ ...body, fetchedAt: new Date().toISOString() });
  } catch (error) {
    return json({ error: 'live_data_unavailable', message: error.message || 'Live data is temporarily unavailable.' }, 502);
  }
}
