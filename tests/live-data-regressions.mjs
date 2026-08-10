import assert from 'node:assert/strict';
import handler from '../api/live-data.js';

const originalFetch = globalThis.fetch;

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
        return new Response(JSON.stringify({ bitcoin: { usd: 1 } }), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        });
      };

      const response = await handler(new Request('https://example.test/api/live-data?resource=crypto&ids=%25%25%25'));
      assert.equal(response.status, 200);
      assert.match(requestedUrl, /ids=bitcoin,ethereum,solana,ripple,cardano/);
    }

    console.log('live-data regressions: pass');
  } finally {
    globalThis.fetch = originalFetch;
  }
}

await run();
