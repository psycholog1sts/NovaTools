# NovaTools Public Delivery Contract Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish English at canonical root URLs and first-class Turkish pages under `/tr/`, while restoring CSP-blocked tools and enforcing the public delivery contract in CI.

**Architecture:** Keep the Vite multi-page application and introduce one locale/route contract consumed by build, sitemap, redirects, and runtime language switching. Generate language-correct HTML before JavaScript executes, bundle executable dependencies on the same origin, and validate final `dist` output with behavior-oriented audits.

**Tech Stack:** Node.js 22, npm 10, Vite 5, JavaScript ES modules, jsdom 24, pdf-lib 1.17.1, JSZip 3.10.1, QRCode 1.5.4, Vercel preview, Cloudflare proxy/CDN.

## Global Constraints

- English is the default language at root URLs; Turkish uses `/tr/`.
- Supported public locales are exactly `en` and `tr`.
- Preserve existing English URL authority and the Vite MPA architecture.
- Do not add a framework, database, account system, analytics vendor, or production-only service.
- Do not publish machine-translated editorial content.
- Do not weaken CSP to permit third-party executable CDNs.
- Do not change Cloudflare DNS, SSL, WAF, Vercel production environment variables, or production deployment in this plan.
- A Turkish page is emitted only when its required visible copy and metadata are available.
- Sitemaps contain final 200 canonical URLs and reciprocal alternates only.
- Keep recent-tool history browser-local and do not add tracking.
- Every task uses failing-test → minimal implementation → passing-test → focused commit.

---

## File Responsibility Map

- `src/core/i18n/locale-contract.mjs`: authoritative locale, path, canonical, alternate, and query-preservation functions.
- `src/data/locale-route-manifest.mjs`: route-level locale availability and critical-copy declaration.
- `scripts/build-localized-pages.mjs`: generate `/tr/` documents from built English HTML and approved locale data.
- `scripts/audit-delivery-contract.mjs`: validate final HTML, redirects, sitemap, robots, dependency hosts, headings, and AdSense invariants.
- `scripts/generate-localized-sitemap.mjs`: emit final clean URLs and `xhtml:link` alternates.
- `src/js/tool-page-copy.mjs`: stable English/Turkish copy dictionary for generated tool components.
- `src/js/tool-page-enhancer.js`: consume locale copy directly; no text-node translation pass.
- `tests/locale-contract.mjs`: unit coverage for route and locale behavior.
- `tests/localized-build.mjs`: integration coverage for generated source HTML.
- `tests/tool-page-copy.mjs`: executable generated-component localization coverage.
- `tests/delivery-regressions.mjs`: static regressions for CSP, AdSense, headings, redirects, and CI wiring.

---

### Task 1: Establish the Authoritative Locale Contract

**Files:**
- Create: `src/core/i18n/locale-contract.mjs`
- Create: `src/data/locale-route-manifest.mjs`
- Create: `tests/locale-contract.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: `SUPPORTED_LOCALES`, `DEFAULT_LOCALE`, `normalizeLocale(value)`, `parseLocalizedPath(pathname)`, `localizedPath(pathname, locale)`, `canonicalUrl(pathname, locale)`, `alternateUrls(pathname)`, `languageSwitchUrl(url, locale)`, `routeSupportsLocale(pathname, locale)`.
- Consumes: no runtime globals; every function is deterministic and accepts strings or `URL` values.

- [ ] **Step 1: Write the failing contract tests**

```js
// tests/locale-contract.mjs
import assert from 'node:assert/strict';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  alternateUrls,
  canonicalUrl,
  languageSwitchUrl,
  localizedPath,
  parseLocalizedPath
} from '../src/core/i18n/locale-contract.mjs';

assert.deepEqual(SUPPORTED_LOCALES, ['en', 'tr']);
assert.equal(DEFAULT_LOCALE, 'en');
assert.deepEqual(parseLocalizedPath('/tr/tools/pdf/merge/'), {
  locale: 'tr',
  canonicalPath: '/tools/pdf/merge/'
});
assert.equal(localizedPath('/tools/pdf/merge/', 'en'), '/tools/pdf/merge/');
assert.equal(localizedPath('/tools/pdf/merge/', 'tr'), '/tr/tools/pdf/merge/');
assert.equal(canonicalUrl('/tools/pdf/merge/', 'tr'), 'https://mc-novatools.com/tr/tools/pdf/merge/');
assert.deepEqual(alternateUrls('/tools/pdf/merge/'), {
  en: 'https://mc-novatools.com/tools/pdf/merge/',
  tr: 'https://mc-novatools.com/tr/tools/pdf/merge/',
  'x-default': 'https://mc-novatools.com/tools/pdf/merge/'
});
assert.equal(
  languageSwitchUrl(new URL('https://mc-novatools.com/tools/pdf/merge/?utm_source=qa&lang=tr'), 'tr'),
  '/tr/tools/pdf/merge/?utm_source=qa'
);
console.log('Locale contract tests passed.');
```

- [ ] **Step 2: Register and run the test to verify failure**

Add `node tests/locale-contract.mjs` to `test:unit`, `test`, and `ci:validate` through the existing `npm test` chain.

Run: `npm run test:unit`  
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `locale-contract.mjs`.

- [ ] **Step 3: Implement the locale contract**

```js
// src/core/i18n/locale-contract.mjs
export const SITE_ORIGIN = 'https://mc-novatools.com';
export const SUPPORTED_LOCALES = Object.freeze(['en', 'tr']);
export const DEFAULT_LOCALE = 'en';
export const PRESERVED_QUERY_KEYS = Object.freeze(['utm_source', 'utm_medium', 'utm_campaign', 'ref']);

export function normalizeLocale(value) {
  const locale = String(value || '').trim().toLowerCase().replace('_', '-').split('-')[0];
  return SUPPORTED_LOCALES.includes(locale) ? locale : DEFAULT_LOCALE;
}

export function normalizePath(pathname = '/') {
  const clean = `/${String(pathname || '/').split('?')[0].split('#')[0].replace(/^\/+|\/+$/g, '')}`;
  if (clean === '/') return '/';
  return /\.[a-z0-9]+$/i.test(clean) ? clean : `${clean}/`;
}

export function parseLocalizedPath(pathname = '/') {
  const path = normalizePath(pathname);
  const match = path.match(/^\/(en|tr)(?=\/|$)(.*)$/);
  if (!match) return { locale: DEFAULT_LOCALE, canonicalPath: path };
  return { locale: match[1], canonicalPath: normalizePath(match[2] || '/') };
}

export function localizedPath(pathname, locale) {
  const { canonicalPath } = parseLocalizedPath(pathname);
  return normalizeLocale(locale) === DEFAULT_LOCALE
    ? canonicalPath
    : canonicalPath === '/' ? '/tr/' : `/tr${canonicalPath}`;
}

export function canonicalUrl(pathname, locale = DEFAULT_LOCALE) {
  return new URL(localizedPath(pathname, locale), SITE_ORIGIN).href;
}

export function alternateUrls(pathname) {
  return { en: canonicalUrl(pathname, 'en'), tr: canonicalUrl(pathname, 'tr'), 'x-default': canonicalUrl(pathname, 'en') };
}

export function languageSwitchUrl(input, locale) {
  const url = input instanceof URL ? input : new URL(input, SITE_ORIGIN);
  const params = new URLSearchParams();
  for (const key of PRESERVED_QUERY_KEYS) {
    for (const value of url.searchParams.getAll(key)) params.append(key, value);
  }
  const query = params.toString();
  return `${localizedPath(url.pathname, locale)}${query ? `?${query}` : ''}`;
}
```

Create `src/data/locale-route-manifest.mjs` with explicit route families and an empty-by-default Turkish editorial policy:

```js
export const localeRouteManifest = Object.freeze({
  alwaysLocalized: ['/', '/about-us/', '/contact/', '/privacy-policy/', '/terms-of-service/', '/cookie-policy/', '/security/'],
  generatedFamilies: ['/categories/', '/tools/'],
  approvedTurkishArticles: []
});

export function routeSupportsLocale(pathname, locale) {
  if (locale === 'en') return true;
  if (locale !== 'tr') return false;
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (localeRouteManifest.alwaysLocalized.includes(path)) return true;
  if (localeRouteManifest.generatedFamilies.some((prefix) => path.startsWith(prefix))) return true;
  return localeRouteManifest.approvedTurkishArticles.some((article) => path === `/blog/articles/${article}/`);
}
```

- [ ] **Step 4: Run the unit tests**

Run: `npm run test:unit`  
Expected: PASS and output includes `Locale contract tests passed.`

- [ ] **Step 5: Commit the contract**

```bash
git add package.json src/core/i18n/locale-contract.mjs src/data/locale-route-manifest.mjs tests/locale-contract.mjs
git commit -m "feat: define canonical locale contract"
```

---

### Task 2: Generate Language-Correct Static Turkish HTML

**Files:**
- Create: `scripts/build-localized-pages.mjs`
- Create: `tests/localized-build.mjs`
- Modify: `package.json`
- Modify: `vite.config.js`
- Modify: `src/i18n.js`
- Modify: `public/i18n.js`
- Modify: `src/js/i18n.js`
- Modify: `scripts/inject-structured-data.mjs`

**Interfaces:**
- Consumes: `localizedPath`, `alternateUrls`, `routeSupportsLocale`, `public/locales/tr/translation.json`, and final English HTML under `dist`.
- Produces: `renderLocalizedHtml(html, { locale, canonicalPath, translations })` and Turkish HTML documents under `dist/tr`.

- [ ] **Step 1: Write failing localized-build tests**

```js
// tests/localized-build.mjs
import assert from 'node:assert/strict';
import { renderLocalizedHtml } from '../scripts/build-localized-pages.mjs';

const source = `<!doctype html><html lang="en"><head>
<title data-i18n="meta.home.title">English title</title>
<meta name="description" content="English description" data-i18n-content="meta.home.description">
<link rel="canonical" href="https://mc-novatools.com/">
</head><body><h1 data-i18n="home.hero.title">English heading</h1></body></html>`;
const translations = {
  meta: { home: { title: 'Türkçe başlık', description: 'Türkçe açıklama' } },
  home: { hero: { title: 'Türkçe ana başlık' } }
};
const html = renderLocalizedHtml(source, { locale: 'tr', canonicalPath: '/', translations });

assert.match(html, /<html lang="tr"/);
assert.match(html, /<title[^>]*>Türkçe başlık<\/title>/);
assert.match(html, /content="Türkçe açıklama"/);
assert.match(html, />Türkçe ana başlık<\/h1>/);
assert.match(html, /rel="canonical" href="https:\/\/mc-novatools\.com\/tr\/"/);
assert.equal((html.match(/hreflang="en"/g) || []).length, 1);
assert.equal((html.match(/hreflang="tr"/g) || []).length, 1);
assert.equal((html.match(/hreflang="x-default"/g) || []).length, 1);
console.log('Localized build tests passed.');
```

- [ ] **Step 2: Run the test to verify failure**

Run: `node tests/localized-build.mjs`  
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `build-localized-pages.mjs`.

- [ ] **Step 3: Implement deterministic HTML localization**

Use jsdom so attribute and text replacement do not rely on regex-only HTML rewriting:

```js
// scripts/build-localized-pages.mjs
import { JSDOM } from 'jsdom';
import { alternateUrls, canonicalUrl } from '../src/core/i18n/locale-contract.mjs';

function getByPath(object, key) {
  return key.split('.').reduce((value, segment) => value?.[segment], object);
}

function requireCopy(translations, key, context) {
  const value = getByPath(translations, key);
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Missing ${context} translation: ${key}`);
  return value.trim();
}

export function renderLocalizedHtml(html, { locale, canonicalPath, translations }) {
  const dom = new JSDOM(html);
  const { document } = dom.window;
  document.documentElement.lang = locale;
  document.documentElement.dir = 'ltr';

  for (const element of document.querySelectorAll('[data-i18n]')) {
    element.textContent = requireCopy(translations, element.dataset.i18n, 'text');
  }
  for (const element of document.querySelectorAll('[data-i18n-content]')) {
    element.setAttribute('content', requireCopy(translations, element.dataset.i18nContent, 'content'));
  }
  document.querySelectorAll('link[rel="canonical"], link[rel="alternate"][hreflang]').forEach((node) => node.remove());

  const canonical = document.createElement('link');
  canonical.rel = 'canonical';
  canonical.href = canonicalUrl(canonicalPath, locale);
  document.head.append(canonical);

  for (const [hreflang, href] of Object.entries(alternateUrls(canonicalPath))) {
    const alternate = document.createElement('link');
    alternate.rel = 'alternate';
    alternate.hreflang = hreflang;
    alternate.href = href;
    document.head.append(alternate);
  }
  return `<!doctype html>\n${document.documentElement.outerHTML}`;
}
```

The executable entry walks final English HTML files, checks `routeSupportsLocale`, resolves each clean route, writes the Turkish output under `dist/tr`, and exits non-zero when required translation keys are missing.

Update `scripts/inject-structured-data.mjs` to derive locale and final URL from the output path rather than assuming English:

```js
import { canonicalUrl, parseLocalizedPath } from '../src/core/i18n/locale-contract.mjs';

function localizedStructuredDataContext(publicPath) {
  const { locale, canonicalPath } = parseLocalizedPath(publicPath);
  return {
    locale,
    canonicalPath,
    pageUrl: canonicalUrl(canonicalPath, locale)
  };
}
```

Every injected `WebPage`, `SoftwareApplication`, `FAQPage`, `HowTo`, `BreadcrumbList`, and `Article` record uses `pageUrl` for its page identity and `locale` for `inLanguage`. Existing schema identities are replaced by `@id` instead of appended a second time.

- [ ] **Step 4: Remove metadata mutation from runtime locale switching**

In the three existing i18n entry points, replace query-string navigation and `applyLocaleSeo()` mutation with a single navigation helper:

```js
import { languageSwitchUrl } from './core/i18n/locale-contract.mjs';

function changeLanguage(locale) {
  window.location.assign(languageSwitchUrl(window.location.href, locale));
}
```

Keep compatibility globals only where existing pages call them. Do not retain duplicate supported-language or canonical-generation logic.

- [ ] **Step 5: Wire localization after the Vite build**

Update the build script in `package.json` so localized documents exist before structured-data injection and all final documents are validated together:

```json
"build": "node ./node_modules/vite/bin/vite.js build && npm run build:fix-paths && node scripts/build-localized-pages.mjs && npm run build:inline-critical-css && npm run build:structured-data"
```

Remove `localizedRootHtmlEntries`, `localizedCategoryEntries`, and `localizedToolEntries` from `vite.config.js`; the post-build generator owns `/tr/` emission and prevents multiple competing locale paths.

- [ ] **Step 6: Run localization tests and build**

Run: `node tests/localized-build.mjs && npm run build`  
Expected: PASS; `dist/tr/index.html` exists, has `lang="tr"`, a `/tr/` self-canonical, and one set of alternates.

- [ ] **Step 7: Commit static localization**

```bash
git add package.json vite.config.js src/i18n.js public/i18n.js src/js/i18n.js scripts/build-localized-pages.mjs scripts/inject-structured-data.mjs tests/localized-build.mjs
git commit -m "feat: generate static Turkish pages"
```

---

### Task 3: Align Redirects, Robots, Canonicals, and Sitemaps

**Files:**
- Modify: `vercel.json`
- Modify: `public/_redirects`
- Modify: `public/robots.txt`
- Modify: `robots.txt`
- Modify: `scripts/generate-localized-sitemap.mjs`
- Create: `tests/delivery-routes.mjs`

**Interfaces:**
- Consumes: locale contract and route manifest from Task 1.
- Produces: final clean sitemap URLs, reciprocal `xhtml:link` alternates, single-hop legacy redirects, and crawlable `/tr/` routes.

- [ ] **Step 1: Write failing route tests**

```js
// tests/delivery-routes.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const robots = readFileSync('public/robots.txt', 'utf8');
const redirects = readFileSync('public/_redirects', 'utf8');
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));

assert.doesNotMatch(robots, /Disallow:\s*\/\*\?\*/);
assert.match(redirects, /^\/en\/\*\s+\/:splat\s+301$/m);
assert.match(redirects, /^\/tr\/\*\s+\/tr\/:splat\s+200$/m);
assert.ok(vercel.redirects.some((rule) => rule.source === '/en/:path*' && rule.permanent));
assert.ok(vercel.rewrites.some((rule) => rule.source === '/tr/:path*'));
console.log('Delivery route tests passed.');
```

- [ ] **Step 2: Run the route tests to verify failure**

Run: `node tests/delivery-routes.mjs`  
Expected: FAIL because the broad query disallow and canonical locale rules are not yet aligned.

- [ ] **Step 3: Replace broad query blocking and add locale rules**

The public robots file must become:

```text
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /test/

Sitemap: https://mc-novatools.com/sitemap.xml
Sitemap: https://mc-novatools.com/sitemap-blog.xml
Sitemap: https://mc-novatools.com/sitemap-tools.xml
```

Add single-hop `/en/` redirects and `/tr/` static rewrites to Vercel and Cloudflare equivalents. Generate exact `?lang=tr` redirects for exported public routes during build; do not use a catch-all that redirects unknown paths to the homepage.

- [ ] **Step 4: Generate clean localized sitemap entries**

Emit entries with reciprocal alternates:

```xml
<url>
  <loc>https://mc-novatools.com/tools/pdf/merge/</loc>
  <xhtml:link rel="alternate" hreflang="en" href="https://mc-novatools.com/tools/pdf/merge/" />
  <xhtml:link rel="alternate" hreflang="tr" href="https://mc-novatools.com/tr/tools/pdf/merge/" />
  <xhtml:link rel="alternate" hreflang="x-default" href="https://mc-novatools.com/tools/pdf/merge/" />
</url>
```

Use extensionless public URLs. Do not emit a Turkish alternate when `routeSupportsLocale(path, 'tr')` is false.

- [ ] **Step 5: Run route and sitemap verification**

Run: `node tests/delivery-routes.mjs && npm run build:sitemap && npm run lint:site-links`  
Expected: PASS; no `.html` `<loc>`, no query-wide robots block, and both locale paths are covered.

- [ ] **Step 6: Commit delivery routes**

```bash
git add vercel.json public/_redirects public/robots.txt robots.txt scripts/generate-localized-sitemap.mjs tests/delivery-routes.mjs
git commit -m "fix: align locale routes and indexing"
```

---

### Task 4: Render Generated Tool UI Directly in the Active Locale

**Files:**
- Create: `src/js/tool-page-copy.mjs`
- Create: `tests/tool-page-copy.mjs`
- Modify: `src/js/tool-page-enhancer.js`
- Modify: `tests/site-regressions.mjs`

**Interfaces:**
- Produces: `toolPageCopy(locale)`, `formatToolCopy(locale, key, values)`, and locale-keyed component rendering.
- Consumes: document `lang`, stable tool metadata, and no language-change event for SEO mutation.

- [ ] **Step 1: Write failing generated-copy tests**

```js
// tests/tool-page-copy.mjs
import assert from 'node:assert/strict';
import { formatToolCopy, toolPageCopy } from '../src/js/tool-page-copy.mjs';

assert.equal(toolPageCopy('tr').workflowSupport, 'İş akışı desteği');
assert.equal(toolPageCopy('tr').reviewToolPanel, 'Araç panelini incele');
assert.equal(
  formatToolCopy('tr', 'howToUse', { tool: 'PDF Birleştirme' }),
  'PDF Birleştirme nasıl kullanılır?'
);
assert.equal(toolPageCopy('en').workflowSupport, 'Workflow support');
console.log('Tool page copy tests passed.');
```

- [ ] **Step 2: Run the generated-copy tests to verify failure**

Run: `node tests/tool-page-copy.mjs`  
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `tool-page-copy.mjs`.

- [ ] **Step 3: Implement the direct copy module**

```js
// src/js/tool-page-copy.mjs
const COPY = Object.freeze({
  en: Object.freeze({
    workflowSupport: 'Workflow support',
    reviewToolPanel: 'Review tool panel',
    howToUse: '{tool}: how to use'
  }),
  tr: Object.freeze({
    workflowSupport: 'İş akışı desteği',
    reviewToolPanel: 'Araç panelini incele',
    howToUse: '{tool} nasıl kullanılır?'
  })
});

export function toolPageCopy(locale) {
  return COPY[locale] || COPY.en;
}

export function formatToolCopy(locale, key, values = {}) {
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    toolPageCopy(locale)[key]
  );
}
```

- [ ] **Step 4: Replace post-render text-node translation**

In `tool-page-enhancer.js`, import the copy module, compute locale once, and interpolate localized strings while creating components:

```js
import { formatToolCopy, toolPageCopy } from './tool-page-copy.mjs';

function enhancerLocale() {
  return document.documentElement.lang === 'tr' ? 'tr' : 'en';
}

function createWorkspaceCompanion(tool, slug) {
  const copy = toolPageCopy(enhancerLocale());
  const panel = document.createElement('aside');
  panel.className = 'premium-workspace-companion';
  panel.innerHTML = `<h2>${escapeHtml(copy.workflowSupport)}</h2>`;
  return panel;
}
```

Delete `originalEnhancerText`, `translateEnhancerText`, `localizeEnhancerSubtree`, and the `languageChanged` metadata-refresh listener. Language switching navigates to another static document.

- [ ] **Step 5: Replace regex-presence tests with executable assertions**

Remove assertions that merely look for `ENHANCER_COPY`. Import and execute `tool-page-copy.mjs` in the test suite. Add assertions that the retired `^\\s*` source bug and `localizeEnhancerSubtree` no longer exist.

- [ ] **Step 6: Run copy tests and build**

Run: `node tests/tool-page-copy.mjs && npm test && npm run build`  
Expected: PASS; generated Turkish tool UI is Turkish in source HTML and runtime-generated components.

- [ ] **Step 7: Commit direct locale rendering**

```bash
git add src/js/tool-page-copy.mjs src/js/tool-page-enhancer.js tests/tool-page-copy.mjs tests/site-regressions.mjs
git commit -m "fix: render tool workflow copy by locale"
```

---

### Task 5: Restore CSP-Blocked Tool Workflows with Same-Origin Bundles

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `src/tools/pdf/merge/index.html`
- Modify: `src/tools/pdf/split/index.html`
- Modify: `src/tools/design/qr-code-designer/index.html`
- Create: `tests/tool-dependency-policy.mjs`

**Interfaces:**
- Consumes: `PDFDocument` from `pdf-lib`, `JSZip` from `jszip`, and `QRCode` from `qrcode` through Vite module imports.
- Produces: no executable request to jsDelivr, unpkg, or esm.sh in final production artifacts.

- [ ] **Step 1: Write the failing dependency policy test**

```js
// tests/tool-dependency-policy.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

for (const file of [
  'src/tools/pdf/merge/index.html',
  'src/tools/pdf/split/index.html',
  'src/tools/design/qr-code-designer/index.html'
]) {
  const html = readFileSync(file, 'utf8');
  assert.doesNotMatch(html, /cdn\.jsdelivr\.net|unpkg\.com|esm\.sh/, `${file} contains a CSP-blocked dependency host`);
}
console.log('Tool dependency policy tests passed.');
```

- [ ] **Step 2: Run the test to verify failure**

Run: `node tests/tool-dependency-policy.mjs`  
Expected: FAIL and identify all affected source pages.

- [ ] **Step 3: Install only the required runtime packages**

Run: `npm install jszip@3.10.1 qrcode@1.5.4 --save-exact`  
Expected: `package.json` and lockfile contain exact versions; no install script is added.

- [ ] **Step 4: Convert tool scripts to Vite module imports**

PDF Merge module header:

```html
<script type="module">
  import { PDFDocument } from 'pdf-lib';
  // Existing validated file-order and download behavior remains unchanged.
</script>
```

Replace `window.PDFLib.PDFDocument.create()` and `.load()` with `PDFDocument.create()` and `PDFDocument.load()`.

PDF Split module header:

```html
<script type="module">
  import { PDFDocument } from 'pdf-lib';
  import JSZip from 'jszip';
</script>
```

QR Designer module header:

```html
<script type="module">
  import QRCode from 'qrcode';
</script>
```

Retain existing validation and user-visible error panels. Replace generic load failures with localized `dependencyUnavailable` copy and never mark output ready after an import or processing exception.

- [ ] **Step 5: Run source policy and production build checks**

Run: `node tests/tool-dependency-policy.mjs && npm run build && rg -n "cdn\\.jsdelivr\\.net|unpkg\\.com|esm\\.sh" dist/tools/pdf/merge dist/tools/pdf/split dist/tools/design/qr-code-designer`  
Expected: tests and build PASS; `rg` returns no matches.

- [ ] **Step 6: Commit same-origin tool dependencies**

```bash
git add package.json package-lock.json src/tools/pdf/merge/index.html src/tools/pdf/split/index.html src/tools/design/qr-code-designer/index.html tests/tool-dependency-policy.mjs
git commit -m "fix: bundle blocked tool dependencies"
```

---

### Task 6: Correct AdSense Injection and Heading Semantics

**Files:**
- Modify: `src/components/Analytics.mjs`
- Modify: `src/tools/design/resume-builder/index.html`
- Create: `tests/adsense-heading-policy.mjs`
- Modify: `scripts/adsense-readiness-audit.mjs`

**Interfaces:**
- Produces: `shouldInjectAdSense(pathname)` and one valid AdSense head script on eligible content routes.
- Consumes: normalized public pathname; no account secret values.

- [ ] **Step 1: Write failing policy tests**

```js
// tests/adsense-heading-policy.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { renderAdSenseHead, shouldInjectAdSense } from '../src/components/Analytics.mjs';

assert.equal(shouldInjectAdSense('/404.html'), false);
assert.equal(shouldInjectAdSense('/admin/'), false);
assert.equal(shouldInjectAdSense('/tools/pdf/merge/'), true);
assert.doesNotMatch(renderAdSenseHead('ca-pub-5738022526587953'), /data-adsense=/);

const resume = readFileSync('src/tools/design/resume-builder/index.html', 'utf8');
assert.equal((resume.match(/<h1\b/gi) || []).length, 1);
console.log('AdSense and heading policy tests passed.');
```

- [ ] **Step 2: Run the test to verify failure**

Run: `node tests/adsense-heading-policy.mjs`  
Expected: FAIL because `shouldInjectAdSense` is absent, the unsupported attribute exists, and Resume Builder has multiple `h1` elements.

- [ ] **Step 3: Implement route eligibility and valid head markup**

```js
const ADSENSE_EXCLUDED_PATHS = [/^\/404(?:\.html)?$/, /^\/admin(?:\/|$)/, /^\/test(?:\/|$)/, /^\/api(?:\/|$)/];

export function shouldInjectAdSense(pathname = '/') {
  return !ADSENSE_EXCLUDED_PATHS.some((pattern) => pattern.test(pathname));
}

export function renderAdSenseHead(client, pathname = '/') {
  if (!shouldInjectAdSense(pathname)) return '';
  const safeClient = escapeHtml(client);
  return `<meta name="google-adsense-account" content="${safeClient}">
<link rel="dns-prefetch" href="https://pagead2.googlesyndication.com">
<script async crossorigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${safeClient}"></script>`;
}
```

Pass the current HTML route from `applySeoHead` to this function. Ensure legacy removal remains idempotent.

- [ ] **Step 4: Correct Resume Builder preview headings**

Keep the page title as the only `h1`. Change user-generated resume-name headings inside preview templates to `h2` and style them through classes rather than heading rank assumptions.

- [ ] **Step 5: Extend AdSense audit and run tests**

The audit must fail on `data-adsense`, duplicate head scripts, or excluded routes containing the script.

Run: `node tests/adsense-heading-policy.mjs && npm run audit:adsense && npm test`  
Expected: PASS; Resume Builder has one `h1` and excluded routes have no ad script after build.

- [ ] **Step 6: Commit policy fixes**

```bash
git add src/components/Analytics.mjs src/tools/design/resume-builder/index.html scripts/adsense-readiness-audit.mjs tests/adsense-heading-policy.mjs
git commit -m "fix: enforce ad and heading policy"
```

---

### Task 7: Add the Final Delivery Contract Audit and CI Gate

**Files:**
- Create: `scripts/audit-delivery-contract.mjs`
- Create: `tests/delivery-regressions.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/deploy.yml`
- Modify: `docs/professional-site-master-checklist-2026-08-04.md`

**Interfaces:**
- Consumes: final `dist`, public robots, sitemap XML, redirect files, locale contract, and approved executable-host list.
- Produces: zero exit status only when all delivery invariants pass; JSON summary for CI artifacts.

- [ ] **Step 1: Write failing CI-wiring tests**

```js
// tests/delivery-regressions.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const workflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
assert.match(pkg.scripts['ci:validate'], /audit:delivery-contract/);
assert.equal(pkg.scripts['audit:delivery-contract'], 'node scripts/audit-delivery-contract.mjs');
assert.match(workflow, /npm run audit:delivery-contract/);
console.log('Delivery CI wiring tests passed.');
```

- [ ] **Step 2: Run the CI-wiring test to verify failure**

Run: `node tests/delivery-regressions.mjs`  
Expected: FAIL because the audit script is not registered.

- [ ] **Step 3: Implement the final-dist audit**

The audit walks every HTML file and records exact failures:

```js
const approvedScriptOrigins = new Set([
  'https://mc-novatools.com',
  'https://www.googletagmanager.com',
  'https://pagead2.googlesyndication.com'
]);

const checks = {
  statusModel: 'local-dist',
  canonicalCount: 1,
  h1Count: 1,
  adsenseScriptMax: 1,
  forbiddenHosts: ['cdn.jsdelivr.net', 'unpkg.com', 'esm.sh'],
  supportedLocales: ['en', 'tr']
};
```

For each file, parse with jsdom and fail on:

- missing or duplicate canonical;
- canonical not matching the file's clean public route;
- zero or multiple `h1` on indexable content routes;
- unsupported `html[lang]`;
- English critical UI fragments in Turkish documents;
- duplicate or nonreciprocal alternates;
- duplicate structured-data identities for FAQ, SoftwareApplication, or WebPage;
- `data-adsense` or ads on excluded routes;
- executable dependency hosts outside the allowlist;
- sitemap URLs that map to absent dist files;
- `.html` sitemap URLs;
- query-wide robots disallow.

Write `artifacts/delivery-contract.json` with counts and file paths, then exit `1` when failures are non-empty.

- [ ] **Step 4: Register the gate after build**

Add:

```json
"audit:delivery-contract": "node scripts/audit-delivery-contract.mjs"
```

Append it to `ci:validate` after `build` and before performance budget checks. Add the same command to pull-request validation and production build jobs in `.github/workflows/deploy.yml`.

- [ ] **Step 5: Run the full automated acceptance loop**

Run:

```bash
npm ci --include=optional
npm run lint
npm run test:unit
npm test
npm run audit:adsense
npm run build
npm run audit:delivery-contract
npm run lint:performance-budget
npm run lint:critical-css
npm run lint:rss
npm run lint:site-links
npm run audit:public-routes
```

Expected: every command exits `0`; the delivery report lists zero failures.

- [ ] **Step 6: Update the master checklist with measured outcomes**

Record the branch, commit range, test commands, artifact path, preview requirement, and production hold. Mark account-only Cloudflare, Vercel, CMP, Search Console, and Analytics checks as unverified rather than complete.

- [ ] **Step 7: Commit the release gate**

```bash
git add package.json .github/workflows/deploy.yml scripts/audit-delivery-contract.mjs tests/delivery-regressions.mjs docs/professional-site-master-checklist-2026-08-04.md
git commit -m "ci: enforce public delivery contract"
```

---

### Task 8: Preview Deployment and Final Verification

**Files:**
- Create: `docs/reports/2026-08-10-public-delivery-stabilization-report.md`
- Read: GitHub Actions logs, Vercel preview headers, preview sitemap, preview robots, representative preview pages.

**Interfaces:**
- Consumes: completed branch, CI results, Vercel preview URL, and August 10 baseline.
- Produces: evidence-backed release report and explicit production hold status.

- [ ] **Step 1: Push the isolated branch and open a draft PR**

```bash
git push -u origin agent/public-delivery-contract-stabilization
```

Open a draft PR targeting `main` titled `Stabilize locale, indexing, and public delivery contract`.

- [ ] **Step 2: Require successful GitHub checks**

Verify pull-request validation, security audit, build, delivery-contract audit, route audit, and performance gates. Any failed check blocks preview acceptance.

- [ ] **Step 3: Crawl preview English and Turkish routes**

Audit at least home, legal, category, PDF Merge, PDF Split, QR Designer, Resume Builder, blog hub, one approved article, and 404. For each, verify status, final URL, `lang`, canonical, alternates, one `h1`, JSON-LD parse, no forbidden dependency host, and expected language.

- [ ] **Step 4: Run browser workflow tests**

On desktop and mobile preview:

- switch English ↔ Turkish;
- complete PDF Merge with two small QA PDFs;
- split a multi-page QA PDF;
- generate and download a QR code;
- open Resume Builder and verify heading outline;
- navigate 404 and confirm localized recovery links and no ad request;
- inspect console for CSP, uncaught exceptions, and AdSense head warnings.

Expected: primary workflows succeed and no application CSP violations or uncaught errors appear.

- [ ] **Step 5: Compare preview with baseline**

Required deltas:

- Turkish mixed critical UI fragments: `244` → `0` for emitted Turkish routes;
- unsupported AdSense attribute: `606` → `0` audited variants;
- sitemap requests requiring redirect: `322` → `0` sitemap URLs;
- CSP-blocked tool dependency pages: `3` → `0`;
- Resume Builder `h1` count: `4` → `1`;
- `/tr/` status: `404` → `200`.

- [ ] **Step 6: Write the final report**

The report separates `implemented`, `tested`, `recommended`, and `not yet verified`; records files, commits, CI runs, preview URL, measured deltas, residual risks, rollback commit boundaries, and production hold.

- [ ] **Step 7: Commit the verification report**

```bash
git add docs/reports/2026-08-10-public-delivery-stabilization-report.md
git commit -m "docs: report delivery stabilization verification"
git push
```

Production remains unchanged. Merge and production release are separate actions after the preview evidence is reviewed.
