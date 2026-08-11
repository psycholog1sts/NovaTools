const REQUEST_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const MAX_ATTEMPTS = 5;
const RETRY_DELAY_MS = 3000;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value.replace(/\/$/, '');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function safeErrorDetail(error) {
  const code = error?.cause?.code || error?.code;
  return code ? `${error.message} (${code})` : error?.message || String(error);
}

function annotateFailure(label, message) {
  console.error(`::error title=Cloudflare ${label} origin smoke::${message}`);
}

async function requestWithRetries(url, label, path) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        redirect: 'manual',
        signal: AbortSignal.timeout(20_000),
        headers: {
          Accept: path === '/api/health' ? 'application/json' : 'text/html,*/*;q=0.8',
          'User-Agent': 'NovaTools-Production-Smoke/1.0'
        }
      });
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
    }
  }

  throw new Error(`${label} ${path} request failed after ${MAX_ATTEMPTS} attempts: ${safeErrorDetail(lastError)}`);
}

async function smokeOrigin(origin, label) {
  console.log(`Smoke target [${label}]: ${origin}`);

  const root = await requestWithRetries(`${origin}/`, label, '/');
  if (root.status !== 200) {
    const location = root.headers.get('location');
    throw new Error(
      `${label} / returned HTTP ${root.status}${location ? ` with redirect Location ${location}` : ''}; expected 200.`
    );
  }

  const health = await requestWithRetries(`${origin}/api/health`, label, '/api/health');
  if (health.status !== 200) {
    const location = health.headers.get('location');
    throw new Error(
      `${label} /api/health returned HTTP ${health.status}${location ? ` with redirect Location ${location}` : ''}; expected 200.`
    );
  }

  const contentType = health.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`${label} /api/health returned non-JSON content type ${contentType || '<missing>'}.`);
  }

  let body;
  try {
    body = await health.json();
  } catch (error) {
    throw new Error(`${label} /api/health returned invalid JSON: ${safeErrorDetail(error)}`);
  }

  if (
    !body ||
    typeof body !== 'object' ||
    Array.isArray(body) ||
    body.status !== 'ok' ||
    Object.keys(body).length !== 1
  ) {
    throw new Error(`${label} /api/health body did not match the exact {"status":"ok"} contract.`);
  }

  const requestId = health.headers.get('x-request-id') || '';
  if (!REQUEST_ID_RE.test(requestId)) {
    throw new Error(`${label} /api/health returned a missing or invalid X-Request-ID header.`);
  }

  console.log(`Smoke PASS [${label}]: / and /api/health are healthy.`);
}

const targets = [
  ['immutable', requiredEnv('CLOUDFLARE_DEPLOYMENT_URL')],
  ['canonical', requiredEnv('CLOUDFLARE_PAGES_PRODUCTION_ORIGIN')]
];

let failed = false;
for (const [label, origin] of targets) {
  try {
    await smokeOrigin(origin, label);
  } catch (error) {
    failed = true;
    annotateFailure(label, safeErrorDetail(error));
  }
}

if (failed) process.exitCode = 1;
