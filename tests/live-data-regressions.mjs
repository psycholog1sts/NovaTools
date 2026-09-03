import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import handler from '../api/live-data.js';

const originalFetch = globalThis.fetch;
const financeSource = readFileSync(new URL('../src/tools/finance/p0-batch2.mjs', import.meta.url), 'utf8');
const liveExchangeHtml = readFileSync(new URL('../src/tools/finance/live-exchange/index.html', import.meta.url), 'utf8');
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
      assert.match(financeSource, /data\.closes\?\.?|Array\.isArray\(data\.closes\)/, 'Stock charts must be based on provider close data.');
      assert.match(financeSource, /real historical|gerçek tarihsel|gerçek.*kapanış|Son kapanışları|son kapanışları/i, 'Stock UI must explain when real history is unavailable or used.');
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
