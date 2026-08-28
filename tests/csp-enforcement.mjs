#!/usr/bin/env node
/**
 * Enforced-CSP browser gate.
 *
 * Serves `dist/` with the exact headers Cloudflare Pages will send (parsed from
 * `dist/_headers`) and drives a real Chromium over a representative slice of the
 * site, failing on any Content-Security-Policy violation, uncaught page error, or
 * blocked same-origin request.
 *
 * This is the gate that makes removing `'unsafe-inline'` from `script-src` safe:
 * a missing hash, a surviving inline handler, or a newly added inline script all
 * surface here instead of in production.
 *
 * Usage: node tests/csp-enforcement.mjs [--all] [--limit=N]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import https from 'node:https';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const headersFile = path.join(distDir, '_headers');
const port = Number(process.env.CSP_GATE_PORT || 443);
/**
 * The gate serves the site over HTTPS under the real production hostname and maps
 * that hostname to the local server inside Chromium. Without this, every absolute
 * `https://mc-novatools.com/...` asset in the build would read as cross-origin and
 * report a false `'self'` violation.
 */
const productionHost = 'mc-novatools.com';
const origin = port === 443 ? `https://${productionHost}` : `https://${productionHost}:${port}`;

/** Throwaway TLS material, generated per run into a temp dir — never committed. */
function createSelfSignedCertificate() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'novatools-csp-gate-'));
  const keyPath = path.join(dir, 'key.pem');
  const certPath = path.join(dir, 'cert.pem');
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
    '-keyout', keyPath, '-out', certPath, '-days', '2',
    '-subj', `/CN=${productionHost}`,
    '-addext', `subjectAltName=DNS:${productionHost},DNS:www.${productionHost}`
  ], { stdio: 'ignore' });
  return { dir, key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
}

const limitArg = process.argv.find((value) => value.startsWith('--limit='));
const explicitLimit = limitArg ? Number(limitArg.split('=')[1]) : null;
const testAll = process.argv.includes('--all');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json; charset=utf-8'
};

/** Parse the `/*` block of `_headers` — the policy every response inherits. */
function parseGlobalHeaders() {
  const raw = fs.readFileSync(headersFile, 'utf8').split('\n');
  const headers = {};
  let inGlobalBlock = false;
  for (const line of raw) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      inGlobalBlock = line.trim() === '/*';
      continue;
    }
    if (!inGlobalBlock) continue;
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
  if (!headers['Content-Security-Policy']) {
    throw new Error('dist/_headers has no Content-Security-Policy in its /* block');
  }
  return headers;
}

function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const candidates = [
    path.join(distDir, clean),
    path.join(distDir, `${clean}.html`),
    path.join(distDir, clean, 'index.html')
  ];
  for (const candidate of candidates) {
    if (!candidate.startsWith(distDir)) continue;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  return null;
}

function startServer(globalHeaders, tls) {
  const server = https.createServer({ key: tls.key, cert: tls.cert }, (req, res) => {
    const file = resolveFile(req.url || '/');
    const headers = { ...globalHeaders };
    if (!file) {
      res.writeHead(404, { ...headers, 'Content-Type': 'text/plain' });
      res.end('not found');
      return;
    }
    headers['Content-Type'] = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
    res.writeHead(200, headers);
    res.end(fs.readFileSync(file));
  });
  return new Promise((resolve) => server.listen(port, '127.0.0.1', () => resolve(server)));
}

function listRoutes() {
  const routes = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.html')) continue;
      routes.push('/' + path.relative(distDir, full).replace(/\\/g, '/'));
    }
  }
  walk(distDir);
  return routes.sort();
}

/**
 * Default slice: every English tool page (they carry the inline app logic and the
 * delegated action handlers) plus the site shell, category, guide and blog samples.
 * `--all` widens this to all 4,000+ localized permutations.
 */
function selectRoutes(routes) {
  if (testAll) return routes;
  const isLocalized = (route) => /^\/(?:ar|de|es|fr|hi|it|ja|ko|nl|pl|pt|ru|tr|zh|en)\//.test(route);
  const tools = routes.filter((r) => r.startsWith('/tools/') && !isLocalized(r));
  const shell = routes.filter((r) => !r.includes('/') || r.split('/').length === 2).filter((r) => !isLocalized(r));
  const categories = routes.filter((r) => r.startsWith('/categories/') && !isLocalized(r));
  const guides = routes.filter((r) => r.startsWith('/guides/') && !isLocalized(r)).slice(0, 6);
  const blog = routes.filter((r) => r.startsWith('/blog/') && !isLocalized(r)).slice(0, 12);
  const localizedSample = routes.filter((r) => /^\/(?:tr|ar)\/tools\//.test(r)).slice(0, 10);
  const admin = routes.filter((r) => r.startsWith('/admin'));
  const selected = [...new Set([...shell, ...categories, ...tools, ...guides, ...blog, ...localizedSample, ...admin])];
  return explicitLimit ? selected.slice(0, explicitLimit) : selected;
}

async function main() {
  if (!fs.existsSync(distDir)) throw new Error('dist is missing; run `npm run build` first');

  const globalHeaders = parseGlobalHeaders();
  if (/script-src[^;]*'unsafe-inline'/.test(globalHeaders['Content-Security-Policy'])) {
    throw new Error("script-src still contains 'unsafe-inline'; the hardened policy was not emitted");
  }

  const tls = createSelfSignedCertificate();
  const server = await startServer(globalHeaders, tls);
  const routes = selectRoutes(listRoutes());
  console.log(`CSP gate: ${routes.length} route(s) against the enforced production policy`);

  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE || undefined;
  const browser = await chromium.launch({
    ...(executablePath ? { executablePath } : {}),
    args: [
      `--host-resolver-rules=MAP ${productionHost} 127.0.0.1, MAP www.${productionHost} 127.0.0.1`,
      '--proxy-server=direct://',
      '--proxy-bypass-list=*'
    ]
  });
  const failures = [];
  let checked = 0;
  let tolerated = 0;

  try {
    for (const route of routes) {
      const context = await browser.newContext({ ignoreHTTPSErrors: true });
      const page = await context.newPage();
      const problems = [];

      // CSP is evaluated before the network layer, so violations still surface while
      // third-party hosts are short-circuited instead of hanging on an unreachable network.
      let abortedExternalScript = false;
      await page.route('**', (route) => {
        const request = route.request();
        if (request.url().startsWith(origin)) return route.continue();
        // The sandbox has no outbound network, so third-party scripts a page legitimately
        // loads (pdf-lib, jszip, qrcode) can never execute here. Note it, so the resulting
        // "X is not defined" is not mistaken for a policy failure.
        if (request.resourceType() === 'script') abortedExternalScript = true;
        return route.abort();
      });

      await page.addInitScript(() => {
        window.__cspViolations = [];
        document.addEventListener('securitypolicyviolation', (event) => {
          window.__cspViolations.push({
            directive: event.effectiveDirective || event.violatedDirective,
            blocked: event.blockedURI,
            sample: (event.sample || '').slice(0, 120)
          });
        });
      });

      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(`pageerror: ${error.message}`));
      page.on('requestfailed', (request) => {
        const url = request.url();
        if (!url.startsWith(origin)) return; // third-party hosts are unreachable in CI
        if (request.failure()?.errorText === 'net::ERR_ABORTED') return;
        problems.push(`requestfailed: ${url} (${request.failure()?.errorText})`);
      });

      try {
        await page.goto(`${origin}${route}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
        await page.waitForTimeout(200);
        const violations = await page.evaluate(() => window.__cspViolations || []);
        for (const violation of violations) {
          problems.push(`csp ${violation.directive} blocked ${violation.blocked} ${violation.sample}`.trim());
        }
      } catch (error) {
        problems.push(`navigation: ${error.message}`);
      }

      if (!abortedExternalScript) problems.push(...pageErrors);
      else if (pageErrors.length) tolerated += pageErrors.length;

      await context.close();
      checked += 1;
      if (problems.length) failures.push({ route, problems: [...new Set(problems)] });
      if (checked % 25 === 0) console.log(`  ...${checked}/${routes.length}`);
    }
  } finally {
    await browser.close();
    server.close();
    fs.rmSync(tls.dir, { recursive: true, force: true });
  }

  if (failures.length) {
    console.error(`\nCSP gate FAILED on ${failures.length}/${checked} route(s):`);
    for (const failure of failures.slice(0, 40)) {
      console.error(`\n  ${failure.route}`);
      for (const problem of failure.problems.slice(0, 6)) console.error(`    - ${problem}`);
    }
    if (failures.length > 40) console.error(`\n  ...and ${failures.length - 40} more`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `CSP gate passed: ${checked} route(s), zero policy violations, zero page errors` +
    `${tolerated ? ` (${tolerated} error(s) tolerated on pages whose third-party script is unreachable offline)` : ''}.`
  );
}

await main();
