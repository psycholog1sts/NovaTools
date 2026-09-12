import { PublicRequestError, assertPublicHttpUrl, analyzePage } from '../src/tools/dev/geo-compliance-inspector/analyzer.mjs';

export const config = { runtime: 'edge' };

const UPSTREAM_TIMEOUT_MS = 8_000;
const MAX_BODY_BYTES = 2_000_000; // 2 MiB cap on the fetched page
const SUCCESS_CACHE_CONTROL = 'public, s-maxage=300, stale-while-revalidate=3600';
const ERROR_CACHE_CONTROL = 'no-store, max-age=0';

const json = (response, status = 200) => new Response(JSON.stringify(response), {
  status,
  headers: {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': status >= 200 && status < 300 ? SUCCESS_CACHE_CONTROL : ERROR_CACHE_CONTROL
  }
});

async function fetchPageHtml(targetUrl) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
  let response;
  try {
    response = await fetch(targetUrl.toString(), {
      redirect: 'follow',
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

  if (!response.ok) {
    throw new PublicRequestError('upstream_error', `The target page responded with HTTP ${response.status}.`, 502);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html') && !contentType.includes('application/xhtml+xml')) {
    throw new PublicRequestError('unsupported_content_type', 'The target URL is not an HTML page.', 415);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return { html: await response.text(), finalUrl: response.url, status: response.status };
  }

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

  return { html, finalUrl: response.url, status: response.status };
}

export default async function handler(request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawUrl = searchParams.get('url');
    if (!rawUrl) {
      return json({ error: 'invalid_request', message: 'A "url" query parameter is required.' }, 400);
    }

    const targetUrl = assertPublicHttpUrl(rawUrl);
    const startedAt = Date.now();
    const { html, finalUrl, status } = await fetchPageHtml(targetUrl);
    const fetchTimeMs = Date.now() - startedAt;
    const analysis = analyzePage(html);

    return json({
      targetUrl: finalUrl || targetUrl.toString(),
      httpStatus: status,
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
