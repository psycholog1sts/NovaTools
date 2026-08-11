const REQUEST_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 3000;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value.replace(/\/$/, '');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function safeErrorDetail(error) {
  const code = error?.cause?.code || error?.code;
  return code ? `${error.message} (${code})` : error?.message || String(error);
}

async function requestWithRetries(url, path) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(20_000),
        headers: {
          Accept: path === '/api/health' ? 'application/json' : 'text/html,*/*;q=0.8',
          'User-Agent': 'NovaTools-Production-Smoke/1.0'
        }
      });
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error(`${path} request failed after ${MAX_ATTEMPTS} attempts: ${safeErrorDetail(lastError)}`);
}

async function smokeProductionOrigin(origin) {
  console.log(`Smoke target [Pages production]: ${origin}`);

  const root = await requestWithRetries(`${origin}/`, '/');
  if (root.status !== 200) {
    const location = root.headers.get('location');
    throw new Error(`/ returned HTTP ${root.status}${location ? ` with redirect Location ${location}` : ''}; expected 200.`);
  }

  const health = await requestWithRetries(`${origin}/api/health`, '/api/health');
  if (health.status !== 200) {
    const location = health.headers.get('location');
    throw new Error(`/api/health returned HTTP ${health.status}${location ? ` with redirect Location ${location}` : ''}; expected 200.`);
  }

  const contentType = health.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`/api/health returned non-JSON content type ${contentType || '<missing>'}.`);
  }

  let body;
  try {
    body = await health.json();
  } catch (error) {
    throw new Error(`/api/health returned invalid JSON: ${safeErrorDetail(error)}`);
  }

  if (!body || typeof body !== 'object' || Array.isArray(body) || body.status !== 'ok' || Object.keys(body).length !== 1) {
    throw new Error('/api/health body did not match the exact {"status":"ok"} contract.');
  }

  const requestId = health.headers.get('x-request-id') || '';
  if (!REQUEST_ID_RE.test(requestId)) throw new Error('/api/health returned a missing or invalid X-Request-ID header.');
  console.log('Smoke PASS [Pages production]: / and /api/health are healthy with no redirects.');
}

try {
  await smokeProductionOrigin(requiredEnv('CLOUDFLARE_PAGES_PRODUCTION_ORIGIN'));
} catch (error) {
  console.error(`::error title=Cloudflare Pages production origin smoke::${safeErrorDetail(error)}`);
  process.exitCode = 1;
}
