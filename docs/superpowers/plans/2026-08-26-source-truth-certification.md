# Source-Truth Certification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Certify every indexable NovaTools tool against its actual source/runtime behavior and fail closed any route that does not truthfully provide the advertised functionality.

**Architecture:** Extend the existing evidence-led AdSense audit instead of creating an SEO word-count system. Use deterministic source/runtime checks plus manual evidence records; B routes are excluded consistently from Search, public discovery and AdSense. Correct Live Exchange first as the first regression-backed Wave 2 slice.

**Tech Stack:** Node.js ESM, vanilla HTML/CSS/JS/MJS, Vite, existing GitHub Actions/Chromium E2E/a11y gates, Cloudflare/Vercel-compatible static routing.

**Spec:** `docs/superpowers/specs/2026-08-26-novatools-remediation-wave-2-design.md`

## Global Constraints

- Preserve Vite + vanilla HTML/CSS/JS/MJS.
- Do not introduce React/Next/shadcn/Radix/Framer/lucide merely for remediation.
- Every material public technical/product claim must have source/runtime evidence.
- B routes must be noindex, sitemap/public-discovery excluded and blocked from AdSense bootstrap.
- No minimum word count.
- No AdSense re-review while a known material source-truth mismatch remains.
- Every stable batch must finish with green CI before the next batch begins.

---

### Task 1: Remove the Live Exchange synthetic trend

**Files:**
- Modify: `tests/live-data-regressions.mjs`
- Modify: `src/tools/finance/p0-batch2.mjs`
- Modify: `src/tools/finance/live-exchange/index.html`
- Modify: `scripts/adsense-readiness-audit.mjs`

**Interfaces:**
- Consumes: `getExchangeRates(base)` from `src/js/api/exchange.js`; `/api/live-data?resource=exchange`; current `calculateLiveExchange(formData)` return shape `{status,type,html}`.
- Produces: `calculateLiveExchange()` output with conversion/source/timestamp but no synthetic historical/trend chart; audit rule rejecting reintroduction of the Live Exchange synthetic trend claim.

- [ ] **Step 1: Add a failing source-truth regression**

Extend `tests/live-data-regressions.mjs` to read `src/tools/finance/p0-batch2.mjs` and `src/tools/finance/live-exchange/index.html` and assert:

```js
assert.equal(financeSource.includes("deterministicSeries(rate, 1.2, 7)"), false);
assert.equal(financeSource.includes("id='liveExchangeChart'"), false);
assert.equal(liveExchangeHtml.includes('recent-trend chart'), false);
assert.equal(liveExchangeHtml.includes('short recent-trend chart'), false);
```

Also strengthen the existing TCMB endpoint regression:

```js
assert.equal(body.provider, 'tcmb.gov.tr');
assert.equal(body.rates.EUR, 40 / 45);
```

- [ ] **Step 2: Run the targeted regression and verify RED**

Run the repository's live-data regression command used by CI. Expected failure: the source-truth assertions find the current `deterministicSeries(rate, 1.2, 7)`/trend wording.

- [ ] **Step 3: Remove only the fabricated Live Exchange trend**

In `calculateLiveExchange()` remove:

```js
const trend = deterministicSeries(rate, 1.2, 7).map(...);
```

and remove the Live Exchange chart container/canvas from its returned HTML. Do not delete `deterministicSeries()` globally because other verified fallbacks may still consume it.

Keep result cards for:

- converted amount;
- numeric rate;
- update timestamp;
- provider label.

- [ ] **Step 4: Correct Live Exchange public copy**

In `src/tools/finance/live-exchange/index.html`:

- remove all statements promising a recent/trend chart;
- state that the live endpoint reads TCMB `today.xml` reference exchange rates;
- state that the amount calculation remains local while the currency-rate request goes through NovaTools' live-data endpoint;
- explain that cached/static fallback may be less current and must not be treated as a bank transaction quote;
- retain the bank/exchange-office spread caveat.

- [ ] **Step 5: Add a permanent audit guard**

In `scripts/adsense-readiness-audit.mjs`, fail when the Live Exchange source reintroduces `deterministicSeries(rate` or when the public page contains a trend/history claim without an actual historical endpoint contract.

- [ ] **Step 6: Run RED→GREEN verification**

Run live-data regressions, AdSense audit, lint, full tests and build. Expected: all pass with zero Live Exchange synthetic-trend claims.

- [ ] **Step 7: Commit**

Commit message:

```text
adsense: remove synthetic live exchange trend
```

---

### Task 2: Establish a repeatable source-truth inventory

**Files:**
- Create: `scripts/tool-source-truth-inventory.mjs`
- Create: `docs/source-truth/tool-certification.json`
- Create: `tests/source-truth-inventory.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: a deterministic inventory record keyed by canonical tool route with `class`, `claims`, `sourceFiles`, `networkBoundary`, `status`, and `notes`.

- [ ] **Step 1: Write failing inventory-contract tests**

Tests must require:

```js
{
  route: '/tools/finance/live-exchange/',
  class: 'A',
  claims: [
    { claim: '...', evidence: ['api/live-data.js:exchange', '...'], verdict: 'true|false|qualified' }
  ],
  sourceFiles: ['...'],
  networkBoundary: 'local|novatools-proxy|third-party|mixed',
  status: 'pending|verified|blocked',
  notes: '...'
}
```

Require exactly one record for every indexable tool generated by the sitemap/tool manifest, and require B routes to have `status: 'blocked'`.

- [ ] **Step 2: Verify RED**

Run `node tests/source-truth-inventory.mjs`. Expected failure: inventory/script do not yet exist.

- [ ] **Step 3: Implement the inventory generator/checker**

The script must:

- enumerate tool HTML under `src/tools/**/index.html`;
- normalize public `/tools/.../` routes;
- merge hand-reviewed certification records from `docs/source-truth/tool-certification.json`;
- fail if an indexable route has no record;
- fail if a B route is marked public/indexable/ads-eligible;
- print totals by A/B/C and pending/verified/blocked.

Do not auto-classify routes from keyword matches.

- [ ] **Step 4: Seed known evidence records**

Seed records for:

- Live Exchange — A after Task 1;
- URL Shortener — B;
- News Summarizer — B;
- Islamic Calendar — B-temporary;
- `/request-tool.html` — A/C candidate where applicable to the inventory model;
- PDF Compressor — A reference candidate;
- Background Remover — A after corrected RGB corner-sampling explanation.

- [ ] **Step 5: Wire into package scripts/CI**

Add a script such as:

```json
"audit:source-truth": "node scripts/tool-source-truth-inventory.mjs"
```

and execute it in the existing PR validation workflow before build/output publication.

- [ ] **Step 6: Verify GREEN**

Run inventory test, inventory audit, full test suite, lint and build.

- [ ] **Step 7: Commit**

```text
adsense: add source-truth certification inventory
```

---

### Task 3: Add a misleading-functionality candidate scanner

**Files:**
- Create: `scripts/misleading-functionality-scan.mjs`
- Create: `tests/misleading-functionality-scan.mjs`
- Modify: `package.json`

**Interfaces:**
- Produces: report-only candidate list; it never changes A/B/C classification automatically.

- [ ] **Step 1: Write failing scanner tests**

Use temporary fixture strings/files and assert detection of:

- `mockNews`/placeholder backend;
- `YOUR_FORM_ID`;
- deterministic/synthetic current-data series;
- generated fake service URL;
- unsupported absolute privacy wording;
- hard-coded current/live values.

Also assert that benign occurrences in documentation/comments can be ignored or reported separately.

- [ ] **Step 2: Verify RED**

Run scanner tests; expected missing module failure.

- [ ] **Step 3: Implement scanner**

Scan `src/tools/**/*.{html,js,mjs,json}` and relevant shared modules. Emit JSON/console findings with path, line, fingerprint and category. Do not fail CI merely because a candidate exists; fail only for fingerprints already adjudicated as prohibited contracts (for example `YOUR_FORM_ID`).

- [ ] **Step 4: Add script**

```json
"audit:misleading": "node scripts/misleading-functionality-scan.mjs"
```

- [ ] **Step 5: Run against current tree and triage every returned tool**

For each actual tool hit, either:

- confirm benign and record why;
- correct the claim/function;
- classify B and apply fail-closed controls.

- [ ] **Step 6: Verify GREEN**

Run scanner tests + existing audits + full CI-equivalent local commands available in the environment.

- [ ] **Step 7: Commit**

```text
adsense: add misleading functionality scanner
```

---

### Task 4: Certify finance tools in 3–5 route batches

**Files:**
- Modify: `docs/source-truth/tool-certification.json`
- Modify: touched `src/tools/finance/**` HTML/MJS only when evidence shows a mismatch
- Modify: B-route routing/sitemap/ads files only for newly blocked tools
- Add/modify focused tests for each behavior fix

**Interfaces:**
- Consumes: Task 2 inventory and Task 3 scanner.
- Produces: verified finance records and corrected/publicly truthful routes.

- [ ] **Step 1: Choose the next 3–5 finance routes from the public inventory**

Prioritize changing/current-data and high-stakes calculation tools first.

- [ ] **Step 2: Extract exactly three material claims per route**

Claims must cover the most user-significant behavior: provider/algorithm, input-output method, and privacy/limitation.

- [ ] **Step 3: Open implementation evidence**

Record exact source file/function evidence. For external changing data, record the endpoint/provider returned by code.

- [ ] **Step 4: Classify**

- C only when implementation/copy/runtime gates pass;
- A when the primary tool works but copy/limitations need correction;
- B when advertised primary functionality is missing/fake/unsafe to present.

- [ ] **Step 5: Apply the smallest treatment**

For A: correct only evidence-mismatched copy/logic. For B: noindex + sitemap/public-discovery exclusion + AdSense block before any optional feature repair.

- [ ] **Step 6: Run route/browser/function tests plus full CI gates**

Do not move to the next batch until green.

- [ ] **Step 7: Commit the batch and record the 3–5 route report**

Commit message format:

```text
adsense: certify finance batch <n>
```

---

### Task 5: Certify image, converters, productivity, social, design and text batches

**Files:**
- Same evidence/touched-route pattern as Task 4.

**Interfaces:**
- Produces: full source-truth coverage of the specified categories.

- [ ] **Step 1: Process image/file routes in 3–5 route batches**
- [ ] **Step 2: Process converters in 3–5 route batches**
- [ ] **Step 3: Process productivity in 3–5 route batches**
- [ ] **Step 4: Process social in 3–5 route batches**
- [ ] **Step 5: Process design in 3–5 route batches**
- [ ] **Step 6: Process text in 3–5 route batches**
- [ ] **Step 7: For every batch run scanner, source-truth inventory, route/browser tests, lint, tests, build, a11y/sitemap/public-route gates**
- [ ] **Step 8: Record new B routes immediately in the fail-closed contract**

No batch is accepted based solely on generic-copy absence.

---

### Task 6: Final certification and AdSense risk gate

**Files:**
- Modify: `docs/source-truth/tool-certification.json`
- Modify: parent remediation report/status docs

- [ ] **Step 1: Require zero pending indexable tool records**
- [ ] **Step 2: Require every B route to pass noindex/sitemap/ads-block assertions**
- [ ] **Step 3: Run all automated gates on the final head**
- [ ] **Step 4: Perform representative manual browser QA across every category**
- [ ] **Step 5: Verify production only after an approved merge/deploy commit exists**
- [ ] **Step 6: Recheck production robots/canonicals/sitemap/source labels/privacy statements**
- [ ] **Step 7: Estimate residual AdSense rejection risk from observable remaining issues**

AdSense re-review remains blocked unless the evidence supports residual low-value/misrepresentation risk below 5%.
