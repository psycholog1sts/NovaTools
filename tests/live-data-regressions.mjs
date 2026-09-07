import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import handler from '../api/live-data.js';
import {
  calculateCryptoPrices,
  calculateLiveExchange,
  calculateStockLookup
} from '../src/tools/finance/live-market-tools.mjs';

const originalFetch = globalThis.fetch;
const financeSource = readFileSync(new URL('../src/tools/finance/p0-batch2.mjs', import.meta.url), 'utf8');
const liveMarketSource = readFileSync(new URL('../src/tools/finance/live-market-tools.mjs', import.meta.url), 'utf8');
const liveExchangeHtml = readFileSync(new URL('../src/tools/finance/live-exchange/index.html', import.meta.url), 'utf8');
const stockLookupHtml = readFileSync(new URL('../src/tools/finance/stock-lookup/index.html', import.meta.url), 'utf8');
const cryptoPricesHtml = readFileSync(new URL('../src/tools/finance/crypto-prices/index.html', import.meta.url), 'utf8');

async function readJson(response) {
  return JSON.parse(await response.text());
}

async function run() {
  try {
    {
      const response = await handler(new Request('https://example.test/api/live-data?resource=unknown'));
      const body = await readJson(response);
      assert.equal(response.status, 400);
      assert.match(response.headers.get('cache-control') || '', /no-store/);
      assert.equal(body.error, 'unknown_resource');
    }

    {
      const response = await handler(new Request('https://example.test/api/live-data?resource=weather'));
      const body = await readJson(response);
      assert.equal(response.status, 400);
      assert.match(response.headers.get('cache-control') || '', /no-store/);
      assert.deepEqual(body, { error: 'invalid_request', message: 'City is required.' });
    }

    {
      const tcmbXml = [
        '<Tarih_Date>',
        '<Currency CurrencyCode="USD"><ForexSelling>40.0000</ForexSelling></Currency>',
        '<Currency CurrencyCode="EUR"><ForexSelling>45.0000</ForexSelling></Currency>',
        '</Tarih_Date>'
      ].join('');
      globalThis.fetch = async () => new Response(tcmbXml, { status: 200 });

      const response = await handler(new Request('https://example.test/api/live-data?resource=exchange&base=GBP'));
      const body = await readJson(response);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('cache-control') || '', /s-maxage=300/);
      assert.equal(body.base, 'USD');
      assert.equal(body.rates.USD, 1);
      assert.equal(body.rates.TRY, 40);
      assert.equal(body.rates.EUR, 40 / 45);
      assert.equal(body.provider, 'tcmb.gov.tr');
    }

    {
      assert.equal(
        financeSource.includes('deterministicSeries(rate, 1.2, 7)'),
        false,
        'Live Exchange must not fabricate a historical/trend series from the current rate.'
      );
      assert.equal(
        financeSource.includes('liveExchangeChart'),
        false,
        'Live Exchange must not render a chart unless real historical exchange data is supplied.'
      );
      assert.doesNotMatch(
        liveExchangeHtml,
        /recent[- ]trend|trend chart|trend grafiği|recent movement/i,
        'Live Exchange public copy must not describe synthetic data as recent/historical trend data.'
      );
    }

    {
      assert.equal(
        financeSource.includes('deterministicSeries('),
        false,
        'Finance tools must not fabricate market-history series from current values.'
      );
      assert.doesNotMatch(
        cryptoPricesHtml,
        /7\s*(day|daily|günlük)|historical\s+(price|trend)|price\s+history/i,
        'Crypto Price Tracker public copy must not promise historical charts without historical provider data.'
      );
      assert.match(financeSource, /data\.closes\?\.?|Array\.isArray\(data\.closes\)/, 'Stock charts in the legacy non-public path must still be based on provider close data.');
    }

    {
      for (const [name, html] of [
        ['Live Exchange', liveExchangeHtml],
        ['Stock Lookup', stockLookupHtml],
        ['Crypto Prices', cryptoPricesHtml]
      ]) {
        assert.match(html, /<script type="module" src="\.\.\/live-market-tools\.mjs"><\/script>/, `${name} must use the dedicated fail-closed live-market runtime.`);
        assert.doesNotMatch(html, /src="\.\.\/p0-batch2\.mjs"/, `${name} must not execute the legacy static-fallback runtime.`);
      }

      assert.doesNotMatch(liveMarketSource, /STATIC_RATES|STOCK_FALLBACKS|CRYPTO_FALLBACKS|STATIC_USD_TRY/, 'Live market runtime must not contain hard-coded current-market fallbacks.');
      assert.doesNotMatch(liveMarketSource, /statik yaklaşık fallback|statik örnek fallback|statik örnek değerler/i, 'Live market runtime must not present static values as current market data.');
    }

    {
      const providerFailure = async () => { throw new Error('provider unavailable'); };
      await assert.rejects(
        calculateLiveExchange({ amount: 100, from: 'USD', to: 'TRY' }, { getExchangeRates: providerFailure }),
        /provider unavailable/,
        'Exchange conversion must fail closed when no provider/cache value exists.'
      );
      await assert.rejects(
        calculateStockLookup({ symbol: 'AAPL' }, { getStockQuote: providerFailure }),
        /provider unavailable/,
        'Stock lookup must fail closed when no provider/cache value exists.'
      );
      await assert.rejects(
        calculateCryptoPrices({}, { getCryptoPrices: providerFailure }),
        /provider unavailable/,
        'Crypto prices must fail closed when no provider/cache value exists.'
      );
    }

    {
      const exchange = await calculateLiveExchange(
        { amount: 100, from: 'USD', to: 'TRY' },
        { getExchangeRates: async () => ({ source: 'cache', data: { rates: { TRY: 42 }, provider: 'tcmb.gov.tr', fetchedAt: '2026-09-07T12:00:00Z' } }) }
      );
      assert.equal(exchange.type, 'warning');
      assert.match(exchange.html, /tcmb\.gov\.tr/);
      assert.doesNotMatch(exchange.html, /fallback/i);

      const stock = await calculateStockLookup(
        { symbol: 'AAPL' },
        { getStockQuote: async () => ({ source: 'network', data: { provider: 'finance.yahoo.com', currency: 'USD', closes: [100, 101], meta: { regularMarketPrice: 101, previousClose: 100, regularMarketVolume: 1234 } } }) }
      );
      assert.equal(stock.type, 'success');
      assert.match(stock.html, /finance\.yahoo\.com/);
      assert.match(stock.html, /stockSparklineChart/);

      const crypto = await calculateCryptoPrices(
        {},
        { getCryptoPrices: async () => ({ source: 'network', data: { provider: 'coingecko.com', coins: { bitcoin: { usd: 65000, try: 2730000, usd_24h_change: 1.2, try_market_cap: 100, try_24h_vol: 10 } } } }) }
      );
      assert.equal(crypto.type, 'warning');
      assert.match(crypto.status, /1\/5/);
      assert.match(crypto.html, /coingecko\.com/);
      assert.doesNotMatch(crypto.html, /ETH|SOL|XRP|ADA/);
    }

    {
      globalThis.fetch = async () => new Response('provider failure details', { status: 500 });
      const response = await handler(new Request('https://example.test/api/live-data?resource=crypto'));
      const body = await readJson(response);
      assert.equal(response.status, 502);
      assert.match(response.headers.get('cache-control') || '', /no-store/);
      assert.deepEqual(body, {
        error: 'live_data_unavailable',
        message: 'Live data is temporarily unavailable.'
      });
      assert.equal(JSON.stringify(body).includes('500'), false);
      assert.equal(JSON.stringify(body).includes('provider failure'), false);
    }

    {
      let requestedUrl = '';
      globalThis.fetch = async (url) => {
        requestedUrl = String(url);
        return new Response(JSON.stringify({ bitcoin: { usd: 1, try: 40 } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      };

      const response = await handler(new Request('https://example.test/api/live-data?resource=crypto&ids=%25%25%25'));
      const body = await readJson(response);
      assert.equal(response.status, 200);
      assert.match(requestedUrl, /ids=bitcoin,ethereum,solana,ripple,cardano/);
      assert.match(requestedUrl, /vs_currencies=usd,try/);
      assert.equal(body.provider, 'coingecko.com');
      assert.equal(body.coins.bitcoin.try, 40);
    }

    console.log('live-data regressions: pass');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

await run();
