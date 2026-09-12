import dns from 'node:dns';
import { promisify } from 'node:util';
import { Agent, fetch as undiciFetch } from 'undici';
import { PublicRequestError, assertPublicHttpUrl, analyzePage } from '../src/tools/dev/geo-compliance-inspector/analyzer.mjs';
import { isPublicAddress } from '../src/tools/dev/geo-compliance-inspector/ip-guard.mjs';

// Runs as a Node.js serverless function (not Edge): resolving and validating
// DNS records for a user-supplied hostname needs node:dns, which the Edge
// runtime does not expose.

const dnsLookup = promisify(dns.lookup);

const UPSTREAM_TIMEOUT_MS = 8_000;
const MAX_BODY_BYTES = 2_000_000; // 2 MiB cap on the fetched page
const MAX_REDIRECTS = 3;
// Scan results depend on live third-party content and must never be shared across
// requesters via a CDN/shared cache — this is a live proxy fetch, not static output.
const NO_STORE_CACHE_CONTROL = 'private, no-store';

const json = (response, status = 200) => new Response(JSON.stringify(response), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': NO_STORE_CACHE_CONTROL
  }
});

/**
 * Resolves `hostname` and rejects if ANY returned address is private, loopback,
 * link-local, or otherwise non-public. Returns the validated address list.
 */
async function resolvePublicAddresses(hostname) {
  let records;
  try {
    records = await dnsLookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new PublicRequestError('dns_error', 'The hostname could not be resolved.', 502);
  }

  if (!records.length) {
    throw new PublicRequestError('dns_error', 'The hostname did not resolve to any address.', 502);
  }

  const unsafe = records.filter((r) => !isPublicAddress(r.address, r.family));
  if (unsafe.length) {
    throw new PublicRequestError('blocked_host', 'The hostname resolves to a private/internal address and cannot be scanned.');
  }

  return records;
}

/**
 * Builds an undici Agent whose connector's DNS lookup ALWAYS returns the
 * pre-validated addresses for this one request, regardless of what the
 * authoritative DNS server would answer if queried again right now. This is
 * what actually closes the DNS-rebinding gap: there is only one resolution
 * (the one we already validated) between the check and the TCP connect, not
 * two independent ones that an attacker's DNS server could answer
 * differently.
 */
function buildPinnedAgent(validatedAddresses) {
  return new Agent({
    connect: {
      lookup(_hostname, options, callback) {
        if (options.all) return callback(null, validatedAddresses);
        const first = validatedAddresses[0];
        return callback(null, first.address, first.family);
      }
    }
  });
}

async function fetchOnce(targetUrl) {
  const validated = await resolvePublicAddresses(targetUrl.hostname);
  const agent = buildPinnedAgent(validated);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await undiciFetch(targetUrl.toString(), {
      redirect: 'manual',
      signal: controller.signal,
      dispatcher: agent,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; NovaToolsGEOInspector/1.0; +https://mc-novatools.com/tools/dev/geo-compliance-inspector/)',
        accept: 'text/html,application/xhtml+xml'
      }
    });
  } catch (error) {
    if (controller.signal.aborted) {
      throw new PublicRequestError('upstream_timeout', 'The target page took too long to respond.', 504);
    }
    throw new PublicRequestError('upstream_unreachable', 'The target page could not be reached.', 502);
  } finally {
    clearTimeout(timeout);
    agent.close().catch(() => {});
  }
}

/**
 * Manually follows redirects (undici's `redirect: 'manual'` above means fetch()
 * never does this itself) so every hop — not just the URL the user typed — gets
 * the same assertPublicHttpUrl() + DNS-pinned-address validation before we ever
 * connect to it. `redirect: 'follow'` would let a page redirect straight past
 * our checks into an internal address.
 */
async function fetchWithValidatedRedirects(initialUrl) {
  let currentUrl = initialUrl;

  for (let hop = 0; ; hop += 1) {
    const response = await fetchOnce(currentUrl);

    if (response.status >= 300 && response.status < 400 && response.headers.get('location')) {
      if (hop >= MAX_REDIRECTS) {
        throw new PublicRequestError('too_many_redirects', 'The target page redirected too many times.', 502);
      }
      let nextUrl;
      try {
        nextUrl = new URL(response.headers.get('location'), currentUrl);
      } catch {
        throw new PublicRequestError('upstream_error', 'The target page sent an invalid redirect.', 502);
      }
      currentUrl = assertPublicHttpUrl(nextUrl.toString());
      continue;
    }

    return { response, finalUrl: currentUrl };
  }
}

async function readBodyWithCap(response) {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new PublicRequestError('unsupported_content_type', 'The target URL is not an HTML page.', 415);
  }

  const reader = response.body?.getReader();
  if (!reader) return response.text();

  const decoder = new TextDecoder();
  let received = 0;
  let html = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > MAX_BODY_BYTES) {
      reader.cancel().catch(() => {});
      throw new PublicRequestError('response_too_large', 'The target page is larger than the 2 MB scan limit.', 413);
    }
    html += decoder.decode(value, { stream: true });
  }
  html += decoder.decode();
  return html;
}

export default async function handler(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get('url');
    if (!rawUrl) {
      return json({ error: 'invalid_request', message: 'A "url" query parameter is required.' }, 400);
    }

    const initialUrl = assertPublicHttpUrl(rawUrl);
    const startedAt = Date.now();
    const { response, finalUrl } = await fetchWithValidatedRedirects(initialUrl);
    const fetchTimeMs = Date.now() - startedAt;

    if (!response.ok) {
      throw new PublicRequestError('upstream_error', `The target page responded with HTTP ${response.status}.`, 502);
    }

    const html = await readBodyWithCap(response);
    const analysis = analyzePage(html);

    return json({
      targetUrl: finalUrl.toString(),
      httpStatus: response.status,
      fetchTimeMs,
      ...analysis,
      scannedAt: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof PublicRequestError) {
      return json({ error: error.code, message: error.message }, error.status);
    }
    return json({ error: 'scan_failed', message: 'The scan could not be completed.' }, 500);
  }
}
