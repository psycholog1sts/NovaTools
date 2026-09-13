import dns from 'node:dns';
import { promisify } from 'node:util';
import { PublicRequestError, assertPublicHttpUrl, analyzePage } from '../../src/tools/dev/geo-compliance-inspector/analyzer.mjs';
import { isPublicAddress } from '../../src/tools/dev/geo-compliance-inspector/ip-guard.mjs';

/**
 * Cloudflare Pages Functions port of api/geo-scan.js (the Vercel Edge Function
 * used for Vercel PR previews). This is the version that actually runs on
 * production, since mc-novatools.com is served by Cloudflare Pages, not
 * Vercel — Vercel's `deploymentEnabled.main` is explicitly false in
 * vercel.json and only produces preview deployments.
 *
 * IMPORTANT PLATFORM DIFFERENCE FROM THE VERCEL VERSION: on Node.js (Vercel),
 * fetch() is pinned to the exact validated address via an undici Agent with a
 * custom connect.lookup, closing the gap between "we validated this DNS
 * answer" and "we connected to it". Cloudflare Workers' fetch() has no
 * equivalent — there is no documented way to force fetch() to connect to a
 * specific pre-resolved IP while keeping the original hostname for the
 * request/SNI. So this version validates the resolved addresses with
 * node:dns (available here via the nodejs_compat compatibility flag) and
 * THEN calls the ordinary fetch(), which re-resolves DNS itself. A DNS
 * rebinding attacker with a very short TTL could in principle return a safe
 * address to our validation lookup and a different, private address to
 * fetch()'s own lookup moments later. This is a real, documented residual
 * limitation of this platform (see KnownLimitations in
 * src/data/tool-certification.json), not something silently accepted as
 * equivalent to the Node/undici version.
 */

const dnsLookup = promisify(dns.lookup);

const UPSTREAM_TIMEOUT_MS = 8_000;
const MAX_BODY_BYTES = 2_000_000; // 2 MiB cap on the fetched page
const MAX_REDIRECTS = 3;
const NO_STORE_CACHE_CONTROL = 'private, no-store';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': NO_STORE_CACHE_CONTROL
  }
});

async function assertResolvedAddressesArePublic(hostname) {
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
}

async function fetchOnce(targetUrl) {
  await assertResolvedAddressesArePublic(targetUrl.hostname);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  try {
    return await fetch(targetUrl.toString(), {
      redirect: 'manual',
      signal: controller.signal,
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; NovaToolsGEOInspector/1.0; +https://mc-novatools.com/tools/dev/geo-compliance-inspector/)',
        accept: 'text/html,application/xhtml+xml'
      }
    });
  } catch {
    if (controller.signal.aborted) {
      throw new PublicRequestError('upstream_timeout', 'The target page took too long to respond.', 504);
    }
    throw new PublicRequestError('upstream_unreachable', 'The target page could not be reached.', 502);
  } finally {
    clearTimeout(timeout);
  }
}

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

export async function onRequest(context) {
  try {
    const { searchParams } = new URL(context.request.url);
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
