#!/usr/bin/env node
// Scheduled production monitor: live-data providers and every sitemap URL.
// /api/health only proves the function runtime is up; on 2026-11-04 it said
// "ok" while every crypto request returned 502. This checks real outcomes.
//
// Base URL: MONITOR_BASE_URL, else the Cloudflare Pages project subdomain
// (CLOUDFLARE_API_TOKEN / CLOUDFLARE_ACCOUNT_ID / CLOUDFLARE_PROJECT_NAME),
// which avoids the custom domain's bot protection that answers CI with 403.
import { pathToFileURL } from 'node:url';

const CANONICAL_ORIGIN = 'https://mc-novatools.com';
const SITEMAPS = ['/sitemap.xml', '/sitemap-tools.xml', '/sitemap-blog.xml'];
// Providers behind CERTIFIED tools only. Weather backs an UNAVAILABLE tool and
// Open-Meteo intermittently rejects Cloudflare egress, so it would only add noise.
const LIVE_DATA = {
  exchange: '/api/live-data?resource=exchange&base=USD',
  stocks: '/api/live-data?resource=stocks&symbol=AAPL',
  crypto: '/api/live-data?resource=crypto&ids=bitcoin,ethereum'
};
const MAX_ATTEMPTS = 3;
const CONCURRENCY = 6;

const isNumber = (value) => Number.isFinite(Number(value)) && value !== null && value !== '';

export function evaluateLiveData(resource, status, body) {
  if (status !== 200) return [`${resource}: HTTP ${status}`];
  const numeric = {
    exchange: () => isNumber(body?.rates?.TRY),
    stocks: () => isNumber(body?.lastClose),
    crypto: () => Object.values(body?.coins || {}).some((coin) => isNumber(coin?.usd)),
    weather: () => isNumber(body?.current?.temperature_2m)
  }[resource];
  return numeric && numeric() ? [] : [`${resource}: 200 but no numeric provider data`];
}

export function evaluateSitemapPage(loc, status, html, location = '') {
  const problems = [];
  const expected = new URL(loc);
  if (expected.pathname.endsWith('.html')) problems.push(`${loc}: sitemap lists redirected .html form`);
  if (status !== 200) return [...problems, `${loc}: HTTP ${status}${location ? ` -> ${location}` : ''}`];
  const canonical = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];
  if (!canonical) problems.push(`${loc}: canonical missing`);
  else if (new URL(canonical, CANONICAL_ORIGIN).toString() !== expected.toString()) problems.push(`${loc}: canonical points to ${canonical}`);
  if (/<meta\b[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(html)) problems.push(`${loc}: listed in sitemap but noindex`);
  return problems;
}

async function request(url) {
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(20_000),
        headers: { 'User-Agent': 'NovaTools-Production-Monitor/1.0' }
      });
      if (response.status >= 500 && attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw lastError;
}

async function resolveBaseUrl() {
  if (process.env.MONITOR_BASE_URL) return process.env.MONITOR_BASE_URL.replace(/\/$/, '');
  const { CLOUDFLARE_API_TOKEN: token, CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_PROJECT_NAME: project } = process.env;
  if (!token || !account || !project) throw new Error('Set MONITOR_BASE_URL or the Cloudflare project secrets.');
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/pages/projects/${encodeURIComponent(project)}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20_000)
  });
  const payload = await response.json();
  if (!response.ok || !payload?.result?.subdomain) throw new Error(`Cloudflare project lookup failed (HTTP ${response.status}).`);
  return `https://${payload.result.subdomain}`;
}

async function main() {
  const base = await resolveBaseUrl();
  const problems = [];
  const toBase = (loc) => `${base}${new URL(loc).pathname}${new URL(loc).search}`;

  for (const [resource, path] of Object.entries(LIVE_DATA)) {
    const response = await request(`${base}${path}`);
    const body = await response.json().catch(() => null);
    problems.push(...evaluateLiveData(resource, response.status, body));
  }

  const locs = [];
  for (const sitemap of SITEMAPS) {
    const response = await request(`${base}${sitemap}`);
    if (response.status !== 200) { problems.push(`${sitemap}: HTTP ${response.status}`); continue; }
    for (const [, loc] of (await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)) locs.push(loc.trim());
  }

  let index = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (index < locs.length) {
      const loc = locs[index++];
      try {
        const response = await request(toBase(loc));
        const html = response.status === 200 ? await response.text() : '';
        problems.push(...evaluateSitemapPage(loc, response.status, html, response.headers.get('location') || ''));
      } catch (error) {
        problems.push(`${loc}: request failed (${error?.cause?.code || error?.message})`);
      }
    }
  }));

  console.log(JSON.stringify({ base_host: new URL(base).host, live_data_checked: Object.keys(LIVE_DATA).length, sitemap_urls_checked: locs.length, problems: problems.length }));
  for (const problem of problems) console.log(`::error title=Production monitor::${problem}`);
  if (problems.length) process.exit(1);
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  main().catch((error) => {
    console.log(`::error title=Production monitor::${error.message}`);
    process.exit(1);
  });
}
