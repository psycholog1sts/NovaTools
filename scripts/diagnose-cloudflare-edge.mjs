const healthUrl = process.env.CUSTOM_DOMAIN_HEALTH_URL || 'https://mc-novatools.com/api/health';
const zoneName = new URL(healthUrl).hostname;
const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const userAgent = `mc-novatools-deploy-smoke/${(process.env.GITHUB_SHA || 'local').slice(0, 12)}`;

const requestIdPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;

function annotation(level, title, message) {
  const escaped = String(message).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  console.log(`::${level} title=${title}::${escaped}`);
}

function safeApiError(payload, fallback) {
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];
  if (!errors.length) return fallback;
  return errors.map((entry) => `${entry?.code ?? 'unknown'}:${entry?.message ?? 'Cloudflare API error'}`).join(', ');
}

async function cloudflareJson(path, options = {}) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok || payload?.success === false) {
    throw new Error(safeApiError(payload, `HTTP ${response.status}`));
  }
  return payload;
}

async function inspectCloudflareSecurity() {
  if (!token) {
    annotation('warning', 'Cloudflare edge metadata unavailable', 'CLOUDFLARE_API_TOKEN is not available to the diagnostic.');
    return;
  }

  let zone;
  try {
    const accountFilter = accountId ? `&account.id=${encodeURIComponent(accountId)}` : '';
    const zones = await cloudflareJson(`/zones?name=${encodeURIComponent(zoneName)}${accountFilter}`);
    zone = Array.isArray(zones?.result) ? zones.result.find((entry) => entry?.name === zoneName) : undefined;
    if (!zone?.id) throw new Error(`zone ${zoneName} was not returned`);
  } catch (error) {
    annotation('warning', 'Cloudflare zone diagnostics unavailable', `The deploy token cannot read zone metadata: ${error.message}`);
    return;
  }

  try {
    const config = await cloudflareJson(`/zones/${zone.id}/bot_management`);
    const result = config?.result || {};
    const summary = {
      fight_mode: result.fight_mode ?? null,
      ai_bots_protection: result.ai_bots_protection ?? null,
      content_bots_protection: result.content_bots_protection ?? null,
      crawler_protection: result.crawler_protection ?? null,
      enable_js: result.enable_js ?? null,
    };
    annotation('notice', 'Cloudflare bot configuration', JSON.stringify(summary));
  } catch (error) {
    annotation('warning', 'Cloudflare bot configuration unavailable', `The deploy token cannot read Bot Management: ${error.message}`);
  }

  try {
    const now = new Date();
    const since = new Date(now.getTime() - 10 * 60 * 1000);
    const query = `query EdgeEvents($zoneTag: string, $filter: FirewallEventsAdaptiveFilter_InputObject) {
      viewer {
        zones(filter: { zoneTag: $zoneTag }) {
          firewallEventsAdaptive(filter: $filter, limit: 20, orderBy: [datetime_DESC]) {
            action
            clientRequestPath
            datetime
            source
            userAgent
          }
        }
      }
    }`;
    const payload = await cloudflareJson('/graphql', {
      method: 'POST',
      body: JSON.stringify({
        query,
        variables: {
          zoneTag: zone.id,
          filter: {
            datetime_geq: since.toISOString(),
            datetime_leq: now.toISOString(),
            clientRequestPath: new URL(healthUrl).pathname,
          },
        },
      }),
    });
    if (Array.isArray(payload?.errors) && payload.errors.length) {
      throw new Error(payload.errors.map((entry) => entry.message).join('; '));
    }
    const events = payload?.data?.viewer?.zones?.[0]?.firewallEventsAdaptive || [];
    const relevant = events.filter((event) => event?.userAgent === userAgent || event?.clientRequestPath === new URL(healthUrl).pathname);
    const safeEvents = relevant.slice(0, 5).map(({ action, clientRequestPath, datetime, source }) => ({ action, clientRequestPath, datetime, source }));
    if (safeEvents.length) {
      annotation('notice', 'Cloudflare recent edge events', JSON.stringify(safeEvents));
    } else {
      annotation('notice', 'Cloudflare recent edge events', 'No matching firewallEventsAdaptive records were returned in the last 10 minutes.');
    }
  } catch (error) {
    annotation('warning', 'Cloudflare Security Events unavailable', `The deploy token cannot query firewallEventsAdaptive: ${error.message}`);
  }
}

async function probe() {
  let response;
  try {
    response = await fetch(healthUrl, {
      redirect: 'manual',
      signal: AbortSignal.timeout(20_000),
      headers: {
        Accept: 'application/json',
        'User-Agent': userAgent,
      },
    });
  } catch (error) {
    annotation('error', 'Custom-domain transport failure', `${healthUrl}: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const mitigated = (response.headers.get('cf-mitigated') || '').toLowerCase();
  const contentType = response.headers.get('content-type') || '';
  const cfRay = response.headers.get('cf-ray') || '';
  const server = response.headers.get('server') || '';
  const location = response.headers.get('location') || '';
  const requestId = response.headers.get('x-request-id') || '';
  const body = await response.text();

  annotation('notice', 'Custom-domain edge response', JSON.stringify({
    status: response.status,
    mitigated: mitigated || null,
    content_type: contentType || null,
    server: server || null,
    cf_ray_present: Boolean(cfRay),
    location: location || null,
    request_id_present: Boolean(requestId),
  }));

  if (mitigated === 'challenge') {
    if (!contentType.toLowerCase().includes('text/html')) {
      annotation('error', 'Malformed Cloudflare challenge response', `cf-mitigated=challenge was present but content-type was ${contentType || '(missing)'}.`);
      process.exitCode = 1;
      return;
    }
    annotation('warning', 'Cloudflare custom-domain challenge', 'Cloudflare positively identified this automated custom-domain probe as a Challenge Page. The Pages production origin is the deployment health gate; edge protection remains enabled and is diagnosed separately.');
    await inspectCloudflareSecurity();
    return;
  }

  if (response.status !== 200) {
    const bodyPreview = body.replace(/\s+/g, ' ').slice(0, 240);
    annotation('error', 'Unexpected custom-domain response', `HTTP ${response.status}; server=${server || '(missing)'}; cf-ray=${cfRay ? 'present' : 'missing'}; location=${location || '(none)'}; body=${bodyPreview || '(empty)'}`);
    process.exitCode = 1;
    await inspectCloudflareSecurity();
    return;
  }

  if (!contentType.toLowerCase().includes('application/json')) {
    annotation('error', 'Invalid custom-domain health content type', `Expected application/json, received ${contentType || '(missing)'}.`);
    process.exitCode = 1;
    return;
  }

  let parsed;
  try {
    parsed = JSON.parse(body);
  } catch {
    annotation('error', 'Invalid custom-domain health JSON', 'The 200 response body was not valid JSON.');
    process.exitCode = 1;
    return;
  }

  if (JSON.stringify(parsed) !== JSON.stringify({ status: 'ok' })) {
    annotation('error', 'Invalid custom-domain health contract', 'The response did not match the exact {"status":"ok"} contract.');
    process.exitCode = 1;
    return;
  }

  if (!requestIdPattern.test(requestId)) {
    annotation('error', 'Invalid custom-domain request ID', 'A valid X-Request-ID header was not present.');
    process.exitCode = 1;
    return;
  }

  annotation('notice', 'Custom-domain health passed', `${healthUrl} returned the expected health contract.`);
}

await probe();
