#!/usr/bin/env node
/**
 * Content-Security-Policy hardening pass.
 *
 * Runs as the final build step. It:
 *   1. Injects the deferred-stylesheet activator on pages that use `data-nv-deferred-style`.
 *   2. Injects the delegated action dispatcher on pages that use `data-nv-*` action attributes.
 *   3. Externalises large inline <script> blocks into content-addressed files under /js/inline/
 *      so the emitted policy needs only a handful of hashes (Cloudflare Pages `_headers`
 *      enforces a hard 2,000 character limit per line).
 *   4. Emits `dist/_headers` with a `script-src` that no longer needs `'unsafe-inline'`.
 *
 * Externalised scripts keep their original attributes and document position, so classic
 * scripts stay classic (globals still land on `window`) and module scripts stay deferred.
 *
 * Usage:
 *   node scripts/harden-csp.mjs           # rewrite dist and emit dist/_headers
 *   node scripts/harden-csp.mjs --check   # verify a built dist is already hardened
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');
const inlineDir = path.join(distDir, 'js', 'inline');
const headersTemplate = path.join(root, 'public', '_headers');
const checkMode = process.argv.includes('--check');

/** Inline scripts at or below this byte length stay inline and are hashed. */
const INLINE_KEEP_MAX_BYTES = 600;
/** Hard ceiling for a single `_headers` line (Cloudflare Pages limit is 2000). */
const HEADER_LINE_LIMIT = 1980;

const CSP_PLACEHOLDER = '__NOVATOOLS_SCRIPT_SRC_HASHES__';

const DEFERRED_STYLE_ACTIVATOR_MARKER = 'data-nv-deferred-style-activator';
const DEFERRED_STYLE_ACTIVATOR = `<script ${DEFERRED_STYLE_ACTIVATOR_MARKER}>(function(){var l=document.querySelectorAll('link[data-nv-deferred-style]');for(var i=0;i<l.length;i++){(function(n){function a(){n.media='all';n.removeAttribute('data-nv-deferred-style');}if(n.sheet){a();}else{n.addEventListener('load',a);}})(l[i]);}})();</script>`;

const ACTIONS_MARKER = 'data-nv-actions';
const ACTIONS_SCRIPT = `<script ${ACTIONS_MARKER}>(function(){function g(e,a){var o=[];try{o=JSON.parse(e.getAttribute(a)||'[]');}catch(x){o=[];}if(!Array.isArray(o))o=[];for(var i=0;i<o.length;i++){if(o[i]==='@el')o[i]=e;}return o;}function r(e,n,a){var f=window[e.getAttribute(n)];if(typeof f==='function')f.apply(e,g(e,a));}document.addEventListener('click',function(v){var t=v.target&&v.target.closest?v.target.closest('[data-nv-click]'):null;if(t)r(t,'data-nv-click','data-nv-args');},false);document.addEventListener('change',function(v){var t=v.target&&v.target.closest?v.target.closest('[data-nv-change]'):null;if(t)r(t,'data-nv-change','data-nv-change-args');},false);document.addEventListener('error',function(v){var t=v.target;if(t&&t.getAttribute&&t.getAttribute('data-nv-onerror')==='hide-parent'&&t.parentElement)t.parentElement.style.display='none';},true);window.nvBookmarkHint=function(){window.alert('Press Ctrl+D or Command+D to bookmark this tool.');};})();</script>`;

const ACTION_ATTRIBUTE_PATTERN = /data-nv-(?:click|change|onerror)=/;
const SCRIPT_PATTERN = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
const SRC_ATTRIBUTE = /\bsrc\s*=/i;
const NON_JS_TYPE = /\btype\s*=\s*["']([^"']+)["']/i;
const EXECUTABLE_TYPES = new Set(['', 'module', 'text/javascript', 'application/javascript', 'module ']);

function listHtmlFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listHtmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function isExecutableInlineScript(attrs) {
  if (SRC_ATTRIBUTE.test(attrs)) return false;
  const match = attrs.match(NON_JS_TYPE);
  if (!match) return true;
  return EXECUTABLE_TYPES.has(match[1].trim().toLowerCase());
}

function sha256Base64(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('base64');
}

function sha256Hex(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function injectBeforeHeadClose(html, snippet, relativePath) {
  if (!/<\/head>/i.test(html)) {
    throw new Error(`${relativePath} has no </head>; cannot inject CSP runtime`);
  }
  return html.replace(/<\/head>/i, `  ${snippet}\n</head>`);
}

function buildCsp(hashes) {
  const scriptSrc = [
    "'self'",
    "'wasm-unsafe-eval'",
    ...hashes,
    'https://www.googletagmanager.com',
    'https://pagead2.googlesyndication.com',
    'https://partner.googleadservices.com',
    'https://tpc.googlesyndication.com',
    'https://googleads.g.doubleclick.net',
    'https://www.google-analytics.com',
    // jsdelivr, unpkg and esm.sh were allowlisted for PDF tools that are all
    // fail-closed (UNAVAILABLE, noindex), so nothing that runs needs them. Any
    // route that is certified later vendors its library locally, as the working
    // PDF tools already do via /vendor.
    'https://va.vercel-scripts.com',
    'https://www.clarity.ms'
  ].join(' ');

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self' https://formspree.io",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://fonts.gstatic.com",
    "connect-src 'self' blob: https://www.google-analytics.com https://region1.google-analytics.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://fonts.googleapis.com https://fonts.gstatic.com https://ipapi.co https://va.vercel-scripts.com https://*.clarity.ms",
    "media-src 'self' blob: data:",
    "worker-src 'self' blob:",
    "frame-src 'self' https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com",
    "manifest-src 'self'",
    'upgrade-insecure-requests'
  ].join('; ') + ';';
}

function main() {
  if (!fs.existsSync(distDir)) {
    throw new Error('dist directory is missing; CSP hardening cannot run');
  }
  if (!fs.existsSync(headersTemplate)) {
    throw new Error('public/_headers template is missing; CSP hardening cannot run');
  }

  const htmlFiles = listHtmlFiles(distDir);
  if (!htmlFiles.length) throw new Error('no built HTML files were found in dist');

  const inlineHashes = new Set();
  const externalised = new Map();
  const syntaxChecked = new Set();
  const brokenScripts = [];
  let injectedActivators = 0;
  let injectedDispatchers = 0;
  let rewrittenFiles = 0;
  let leftoverHandlers = [];

  for (const filePath of htmlFiles) {
    const relative = path.relative(distDir, filePath).replace(/\\/g, '/');
    const before = fs.readFileSync(filePath, 'utf8');
    let html = before;

    if (html.includes('data-nv-deferred-style') && !html.includes(DEFERRED_STYLE_ACTIVATOR_MARKER)) {
      html = injectBeforeHeadClose(html, DEFERRED_STYLE_ACTIVATOR, relative);
      injectedActivators += 1;
    }
    if (ACTION_ATTRIBUTE_PATTERN.test(html) && !html.includes(ACTIONS_MARKER)) {
      html = injectBeforeHeadClose(html, ACTIONS_SCRIPT, relative);
      injectedDispatchers += 1;
    }

    html = html.replace(SCRIPT_PATTERN, (tag, attrs, body) => {
      if (!isExecutableInlineScript(attrs)) return tag;
      if (!body.trim()) return tag;

      if (Buffer.byteLength(body, 'utf8') <= INLINE_KEEP_MAX_BYTES) {
        inlineHashes.add(`'sha256-${sha256Base64(body)}'`);
        return tag;
      }

      const digest = sha256Hex(body).slice(0, 24);
      const assetPath = `/js/inline/${digest}.js`;
      const isModule = /\btype\s*=\s*["']module["']/i.test(attrs);
      if (!isModule && !syntaxChecked.has(digest)) {
        syntaxChecked.add(digest);
        try {
          new vm.Script(body, { filename: assetPath });
        } catch (error) {
          brokenScripts.push(`${relative} -> ${assetPath}: ${error.message}`);
        }
      }
      externalised.set(digest, body);
      const keptAttrs = attrs.replace(/\s+$/, '');
      return `<script${keptAttrs} src="${assetPath}"></script>`;
    });

    // Any remaining inline event-handler attribute would need 'unsafe-inline' to run.
    const handlerMatch = html.match(/\son(?:abort|blur|change|click|dblclick|error|focus|input|keydown|keypress|keyup|load|mousedown|mouseover|mouseup|reset|scroll|select|submit|toggle|unload)\s*=\s*["']/i);
    if (handlerMatch) leftoverHandlers.push(`${relative}: ${handlerMatch[0].trim()}`);

    if (html !== before) {
      if (!checkMode) fs.writeFileSync(filePath, html);
      rewrittenFiles += 1;
    }
  }

  if (brokenScripts.length) {
    throw new Error(
      `${brokenScripts.length} inline script(s) do not parse as JavaScript; the page is shipping ` +
      `broken code:\n  ${brokenScripts.slice(0, 10).join('\n  ')}`
    );
  }

  if (leftoverHandlers.length) {
    throw new Error(
      `inline event handlers survive the CSP pass in ${leftoverHandlers.length} file(s); ` +
      `they would be blocked once 'unsafe-inline' is removed:\n  ${leftoverHandlers.slice(0, 10).join('\n  ')}`
    );
  }

  if (!checkMode) {
    fs.mkdirSync(inlineDir, { recursive: true });
    for (const [digest, body] of externalised) {
      fs.writeFileSync(path.join(inlineDir, `${digest}.js`), body);
    }
  }

  const hashes = [...inlineHashes].sort();
  const csp = buildCsp(hashes);
  const headerLine = `  Content-Security-Policy: ${csp}`;

  if (headerLine.length > HEADER_LINE_LIMIT) {
    throw new Error(
      `generated Content-Security-Policy line is ${headerLine.length} characters, over the ` +
      `${HEADER_LINE_LIMIT} character budget (Cloudflare Pages hard limit is 2000). ` +
      `Lower INLINE_KEEP_MAX_BYTES so more inline scripts are externalised.`
    );
  }

  const template = fs.readFileSync(headersTemplate, 'utf8');
  if (!template.includes(CSP_PLACEHOLDER)) {
    throw new Error(`public/_headers must contain the ${CSP_PLACEHOLDER} placeholder`);
  }
  const rendered = template.split(CSP_PLACEHOLDER).join(csp);

  // The Vercel standby deployment cannot read `_headers`, so its copy of the policy
  // lives in vercel.json. Fail loudly on drift rather than letting the two diverge.
  const vercelConfigPath = path.join(root, 'vercel.json');
  if (fs.existsSync(vercelConfigPath)) {
    const vercelConfig = JSON.parse(fs.readFileSync(vercelConfigPath, 'utf8'));
    const globalRule = (vercelConfig.headers || []).find((rule) => rule.source === '/(.*)' && !rule.has);
    const declared = globalRule?.headers?.find((header) => header.key === 'Content-Security-Policy')?.value;
    if (declared !== csp) {
      throw new Error(
        'vercel.json Content-Security-Policy is out of sync with the generated policy.\n' +
        'Replace it with:\n' + csp
      );
    }
  }

  const headersOut = path.join(distDir, '_headers');
  if (checkMode) {
    const current = fs.existsSync(headersOut) ? fs.readFileSync(headersOut, 'utf8') : '';
    if (current.trim() !== rendered.trim()) {
      throw new Error('dist/_headers does not match the hardened policy; run `npm run build`');
    }
  } else {
    fs.writeFileSync(headersOut, rendered);
  }

  console.log(JSON.stringify({
    html_files: htmlFiles.length,
    rewritten_files: rewrittenFiles,
    injected_deferred_style_activators: injectedActivators,
    injected_action_dispatchers: injectedDispatchers,
    externalised_inline_scripts: externalised.size,
    retained_inline_script_hashes: hashes.length,
    csp_header_line_length: headerLine.length,
    unsafe_inline_in_script_src: csp.includes("script-src") && /script-src[^;]*'unsafe-inline'/.test(csp)
  }, null, 2));
}

main();
