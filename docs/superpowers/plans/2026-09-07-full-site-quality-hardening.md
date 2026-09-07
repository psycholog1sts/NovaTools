# NovaTools Full-Site Quality Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn NovaTools into a fail-closed, production-certified utility site where every public tool is truthful, secure, accessible, indexable only when verified, performant, and protected by repeatable browser/CI checks.

**Architecture:** Keep `tools-manifest.json` as the public-tool source of truth and `src/data/tool-certification.json` as the certification matrix. Uncertified tools stay noindex/unavailable through `scripts/finalize-runtime-contracts.mjs`; tools are promoted only after source-level and real-browser contracts pass. Changes ship in small reviewable waves through GitHub Actions and Cloudflare Pages, with production smoke/Lighthouse checks after merge.

**Tech Stack:** Node.js 22, Vite 5, Playwright Chromium, Cloudflare Pages/Functions, plain browser JavaScript, ESLint, existing NovaTools audit scripts.

**Spec:** Existing repository contracts in `tools-manifest.json`, `src/data/tool-certification.json`, `scripts/finalize-runtime-contracts.mjs`, `.github/workflows/deploy.yml`, and this work package.

## Global Constraints

- Never make an uncertified tool public just to make a test pass.
- Never return invented live financial/market data when live and bounded stale cache are unavailable.
- User-controlled strings must be rendered as text or through context-correct escaping, never raw HTML sinks.
- Every behavior change follows RED -> GREEN -> regression verification.
- Existing `npm test`, `npm run lint`, `npm run build`, Playwright, CSP, sitemap/link, public-route, dependency, Lighthouse, and Cloudflare smoke gates remain mandatory.
- No new runtime dependency unless an existing browser/platform API cannot satisfy the requirement.
- Production is updated only from a merged PR with successful required gates.

---

### Task 1: Stabilize the current runtime-hardening PR

**Files:**
- Modify: `tests/e2e/tool-runtime-hardening.spec.mjs`
- Create: `tests/tool-runtime-source-contract.mjs`
- Modify: `package.json`
- Modify: `src/js/phase10-tools.js`

**Interfaces:**
- Consumes: fail-closed behavior from `scripts/finalize-runtime-contracts.mjs`.
- Produces: source contracts for unavailable tools plus browser contracts that test only behavior actually present in the production build.

- [ ] Write a source contract that asserts truncated JPEG and invalid audio paths are handled, empty chart input is rejected, and translator copy has no internal Phase 10 promise.
- [ ] Run `node tests/tool-runtime-source-contract.mjs` on the pre-fix state and confirm the intended assertions fail.
- [ ] Keep the minimal `src/js/phase10-tools.js` implementations that satisfy those contracts.
- [ ] Change browser tests for currently `UNAVAILABLE` routes to assert the certified fail-closed surface instead of trying to click controls removed by the production finalizer.
- [ ] Add `node tests/tool-runtime-source-contract.mjs` to the main `test` script in `package.json`.
- [ ] Run `npm test`, `npm run lint`, `npm run build`, and `npx playwright test tests/e2e/tool-runtime-hardening.spec.mjs` through CI and require green results.

### Task 2: Remove the Todo List stored-DOM injection path and upgrade core UX

**Files:**
- Modify: `src/tools/productivity/todo-list/index.html`
- Create: `tests/todo-list-source-contract.mjs`
- Modify: `package.json`
- Later, only after browser certification: `tools-manifest.json`
- Later, only after browser certification: `src/data/tool-certification.json`

**Interfaces:**
- Consumes: localStorage key `todo_tasks`.
- Produces: DOM nodes built with `document.createElement`/`textContent`, local task persistence, completion/filter/delete behavior, and a browser-certifiable route.

- [ ] Add a failing source contract proving task text is not interpolated into `innerHTML` and that user-controlled task values do not enter HTML/event-handler attributes.
- [ ] Replace dynamic task-list template-string rendering with DOM construction and `textContent`; bind checkbox/delete listeners directly instead of encoding task IDs into executable/HTML contexts.
- [ ] Validate persisted task shape before rendering: text string, priority in `low|medium|high`, optional ISO date, boolean completed, safe generated id.
- [ ] Keep empty-state markup constant and non-user-controlled.
- [ ] Run source contract plus the existing full test suite.
- [ ] Add a Playwright test that injects `<img src=x onerror=...>` as a task and proves it remains literal text with zero page errors.
- [ ] Only if source, Playwright, accessibility, sitemap/discovery, privacy, and output checks pass, change Todo List from `UNAVAILABLE` to `CERTIFIED` in both certification sources in one reviewed commit.

### Task 3: Make live finance fail closed and time-bounded

**Files:**
- Modify: `src/tools/finance/p0-batch2.mjs`
- Modify as needed: `src/js/api/client.js`
- Modify: `tests/live-data-regressions.mjs`
- Modify: `tests/finance-certification.mjs`
- Modify truthful copy in: `src/tools/finance/live-exchange/index.html`
- Modify matching source-truth fields in: `tools-manifest.json`
- Modify matching certification evidence in: `src/data/tool-certification.json`

**Interfaces:**
- Consumes: `/api/live-data` exchange/stock/crypto payloads and browser cache.
- Produces: live response, explicitly bounded stale cache, or a hard unavailable error; never fabricated current rates/prices.

- [ ] Add failing tests proving `STATIC_RATES`, `STOCK_FALLBACKS`, and `CRYPTO_FALLBACKS` cannot be used as current market output after network/cache failure.
- [ ] Add age metadata to persisted finance cache and define a finite maximum stale window per resource.
- [ ] Permit stale cache only inside that bound and label provider/timestamp/staleness in the UI.
- [ ] If live and eligible stale data are absent, return an error state with no converted/price number.
- [ ] Remove static exchange/stock/crypto market-number fallbacks from user-visible execution paths.
- [ ] Update copy and source-truth records so provider, snapshot nature, cache window, and failure behavior exactly match runtime.
- [ ] Run finance regression, full tests, build, Playwright, and production live-data smoke gates.

### Task 4: Certify or contain every tool systematically

**Files:**
- Inventory: `tools-manifest.json`
- Certification state: `src/data/tool-certification.json`
- Runtime containment: `scripts/finalize-runtime-contracts.mjs`
- Audit: `scripts/audit-tool-source-truth.mjs`
- Audit: `scripts/audit-public-routes.mjs`
- Discovery audit: `tests/public-tool-discovery.mjs`
- Browser tests: `tests/e2e/*.spec.mjs`

**Interfaces:**
- Consumes: every manifest tool route.
- Produces: exactly one of `CERTIFIED/ENABLED/INDEXABLE` or `UNAVAILABLE/DISABLED_FAIL_CLOSED/NOINDEX` with evidence.

- [ ] Run the source-truth audit and collect every non-certified route from the certification matrix.
- [ ] For each route, verify source existence, input validation, empty/invalid-input behavior, privacy/network truth, output correctness, mobile/basic keyboard accessibility, page errors, and source-specific limitations.
- [ ] Add a route-specific regression before changing behavior.
- [ ] Fix the smallest root cause; do not enable placeholders or duplicated tools.
- [ ] Add real-browser acceptance tests for routes eligible for certification.
- [ ] Promote only the tools whose source truth, runtime, SEO/discovery, privacy, accessibility, and tests all pass; leave the rest contained with an explicit reason/evidence.
- [ ] Require `npm run audit:source-truth`, `npm run audit:public-routes`, `npm run lint:site-links`, and Playwright to stay green after each certification batch.

### Task 5: Finish indexability, crawl hygiene, accessibility, and performance

**Files:**
- `robots.txt`
- `public/robots.txt`
- `public/_redirects`
- `scripts/generate-localized-sitemap.mjs`
- `scripts/audit-public-routes.mjs`
- `scripts/validate-site-links.mjs`
- `scripts/check-performance-budget.mjs`
- `lighthouserc.cjs`
- `tests/e2e/*.spec.mjs`

**Interfaces:**
- Consumes: certified route inventory.
- Produces: crawlable canonical pages without duplicate locale/query traps, no broken internal links, and browser/Lighthouse gates within budget.

- [ ] Re-run sitemap/link/public-route audits after each certification wave and ensure no unavailable tool enters sitemap/discovery.
- [ ] Verify canonical/hreflang/robots behavior for English and Turkish canonical URLs and dedicated Arabic blog routes.
- [ ] Sample redirects, native 404 handling, intentional noindex routes, and previously reported Search Console failure classes against the production host.
- [ ] Run Playwright accessibility gates across representative tool categories and fix blocking keyboard/label/contrast/DOM issues.
- [ ] Run Lighthouse CI; fix only measured blocking regressions in critical assets, render-blocking work, oversized bundles/media, and layout shifts.

### Task 6: Release and production verification

**Files:**
- `.github/workflows/deploy.yml`
- `.github/workflows/release-readiness.yml`
- `scripts/smoke-cloudflare-pages.mjs`
- `scripts/enforce-production-diagnostics-gate.mjs`

**Interfaces:**
- Consumes: green PR head.
- Produces: merged main commit, Cloudflare Pages deployment, and recorded production evidence.

- [ ] Require the latest PR head to pass Security audit, Release Readiness, build, unit/regression, Cloudflare function compile, Playwright/accessibility, CSP, sitemap/link, public-route, and performance gates.
- [ ] Merge only after the latest head is green; do not rely on an earlier commit's CI.
- [ ] Watch the main-branch production workflow through Cloudflare deployment.
- [ ] Verify apex and `www` health/smoke results, key certified tool routes, 404 behavior, robots/sitemaps, and representative live-data failure behavior on production.
- [ ] Treat any failed production diagnostic as incomplete and reopen the relevant wave.

## Research decisions applied

- OWASP DOM XSS guidance: untrusted data should be treated as text and DOM should be populated with safe APIs such as `textContent`/`createElement`, not user strings passed to HTML-rendering sinks.
- MDN Web Audio guidance: `decodeAudioData()` is asynchronous, requires complete file data, and exposes promise/error paths that must be handled.
- HTTP stale-data guidance: stale responses require explicit policy and an upper staleness bound; stale data must remain visibly stale rather than silently masquerading as current.
- Existing Cloudflare Pages contracts remain authoritative for deployment, redirects, and native not-found handling.
