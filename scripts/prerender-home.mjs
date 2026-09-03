#!/usr/bin/env node
/**
 * Server-renders the homepage grids that main.js builds at runtime.
 *
 * The homepage shipped `<div id="featuredTools"></div>` and
 * `<div id="categoriesGrid"></div>` empty: every tool card, category card,
 * workflow card and blog card existed only after main.js ran. That cost two
 * things — a measured 0.38 cumulative layout shift as the sections filled in,
 * and an HTML document whose main content was invisible to anything that reads
 * markup without executing scripts.
 *
 * Rather than re-implement the templates here (two copies drift), this loads
 * the built page in the same browser the tests use, lets main.js render, and
 * copies the resulting markup of those containers back into the HTML. main.js
 * still runs on the client and skips the assignment when it would produce the
 * markup that is already there.
 */
import { chromium } from '@playwright/test';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const indexPath = path.join(distDir, 'index.html');

if (!fs.existsSync(indexPath)) throw new Error('dist/index.html is missing; run the build first');

const CONTAINERS = [
  { id: 'featuredTools', required: true },
  { id: 'categoriesGrid', required: true },
  { id: 'workflowCards', required: false },
  { id: 'homeBlogCards', required: false },
];

const MIME = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp',
  '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml',
  '.txt': 'text/plain', '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  let pathname = decodeURIComponent(String(req.url).split('?')[0]);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const file = path.join(distDir, pathname);
  if (!file.startsWith(distDir) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    res.writeHead(404);
    res.end();
    return;
  }
  res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();

// Where the browser is guaranteed (the GitHub workflows and Cloudflare Pages
// install Chromium before the build) a failure to launch is a real build
// failure. The standby Vercel image has no browser, and there the page simply
// falls back to rendering these grids on the client as it did before, so the
// deployment is degraded rather than broken.
const PRERENDER_REQUIRED = process.env.PRERENDER_REQUIRED === '1'
  || process.env.GITHUB_ACTIONS === 'true'
  || process.env.CF_PAGES === '1';

let browser;
try {
  browser = await chromium.launch();
} catch (error) {
  server.close();
  if (PRERENDER_REQUIRED) throw error;
  console.warn(`⚠️  Skipping homepage prerender: no browser available (${error.message.split('\n')[0]})`);
  process.exit(0);
}
let rendered;
try {
  const page = await browser.newPage({ viewport: { width: 1350, height: 940 } });
  await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
  await page.waitForSelector('#featuredTools article', { timeout: 30000 });
  await page.waitForSelector('#categoriesGrid article', { timeout: 30000 });
  rendered = await page.evaluate((ids) => {
    const out = {};
    for (const id of ids) {
      const el = document.getElementById(id);
      out[id] = el ? el.innerHTML : null;
    }
    const note = document.getElementById('categoriesPending');
    out.__note = note ? { text: note.textContent || '', hidden: note.hidden } : null;
    return out;
  }, CONTAINERS.map((c) => c.id));
} finally {
  await browser.close();
  server.close();
}

let html = fs.readFileSync(indexPath, 'utf8');
let filled = 0;

for (const { id, required } of CONTAINERS) {
  const markup = rendered[id];
  if (markup === null || markup === undefined || !markup.trim()) {
    if (required) throw new Error(`prerender produced no markup for #${id}`);
    continue;
  }
  const open = new RegExp(`(<div\\b[^>]*\\bid="${id}"[^>]*>)([\\s\\S]*?)(</div>)`, 'i');
  if (!open.test(html)) throw new Error(`prerender target #${id} was not found in dist/index.html`);
  html = html.replace(open, (_m, start, _inner, end) => `${start}${markup}${end}`);
  filled += 1;
}

if (rendered.__note) {
  const note = rendered.__note;
  html = html.replace(
    /(<p\b[^>]*\bid="categoriesPending"[^>]*>)([\s\S]*?)(<\/p>)/i,
    (match, start, _inner, end) => {
      const withoutHidden = start.replace(/\s+hidden(?==|\b)/gi, '');
      const opening = note.hidden ? withoutHidden.replace(/>$/, ' hidden>') : withoutHidden;
      return `${opening}${note.text}${end}`;
    }
  );
}

fs.writeFileSync(indexPath, html);
console.log(`✅ Prerendered ${filled} homepage container(s) into dist/index.html`);
