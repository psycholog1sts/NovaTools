# RLSProof NovaTools Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Publish RLSProof as a certified NovaTools security tool at `/tools/security/rlsproof/` with browser Quick Scan, truthful SEO/commercial copy, and Paddle-ready legal linking without changing existing NovaTools tool behavior.

**Architecture:** Add an isolated tool directory that ports the already-verified browser-only RLSProof scan core. Keep existing NovaTools routing/build/discovery/certification systems unchanged and integrate only through their established `meta.json` + certification + generated-manifest contracts.

**Tech Stack:** Vite 5, static HTML/CSS, browser ES modules, Node 22 tests, existing NovaTools build/SEO/CSP pipeline.

**Spec:** `docs/superpowers/specs/2026-09-11-rlsproof-novatools-integration-design.md`

## Global Constraints
- Existing NovaTools routes and runtime behavior must remain unchanged.
- Canonical RLSProof URL is `https://mc-novatools.com/tools/security/rlsproof/`.
- Quick Scan supports public GitHub repositories only and no token input.
- Coverage must remain explicitly incomplete; failures never become PASS.
- No new runtime dependency, font, UI framework, analytics provider, or paid API.
- No fabricated rating, review, customer, certification, legal-company, payment-approval, or compliance claims.
- `$149 USD` Launch Verification remains visible but checkout is unavailable until Paddle is approved.

---

### Task 1: Add source-level contract tests

**Files:**
- Create: `tests/rlsproof-integration.mjs`

**Interfaces:**
- Consumes: new RLSProof tool files and certification record.
- Produces: regression contract run by `npm test`.

- [ ] Write tests that require the route, canonical URL, `$149`, payment-pending copy, public-GitHub-only limits, privacy/legal links, no ratings/reviews, no token field, and fail-closed scan semantics.
- [ ] Add browser-core unit cases for repository parsing, candidate-file limits, redaction, finding generation, scoring, rate-limit errors, and private-repository rejection.
- [ ] Add `node tests/rlsproof-integration.mjs` to the main `test` script.
- [ ] Run the focused test and verify RED because the tool does not yet exist.

### Task 2: Port the browser Quick Scan core

**Files:**
- Create: `src/tools/security/rlsproof/core/github.mjs`
- Create: `src/tools/security/rlsproof/core/sha256.mjs`
- Create: `src/tools/security/rlsproof/core/redact.mjs`
- Create: `src/tools/security/rlsproof/core/finding.mjs`
- Create: `src/tools/security/rlsproof/core/content-scan.mjs`
- Create: `src/tools/security/rlsproof/core/score.mjs`
- Create: `src/tools/security/rlsproof/core/browser-quick-scan.mjs`

**Interfaces:**
- Produces: `browserQuickScanGithubRepo(input, options)` and `BrowserQuickScanError`.

- [ ] Port the verified personal-app browser modules with imports changed to local `.mjs` paths only.
- [ ] Preserve the exact limits: 18 files, 128 KiB/file, 1 MiB total, 5,000 tree entries, 50,000 KiB repo size.
- [ ] Preserve evidence redaction and deterministic finding IDs/fingerprints.
- [ ] Preserve `blocked` for unresolved high/critical findings and `incomplete` otherwise.
- [ ] Run focused tests until the core contract is GREEN.

### Task 3: Build the NovaTools-native RLSProof page

**Files:**
- Create: `src/tools/security/rlsproof/index.html`
- Create: `src/tools/security/rlsproof/logic.mjs`
- Create: `src/tools/security/rlsproof/rlsproof.css`
- Create: `src/tools/security/rlsproof/meta.json`

**Interfaces:**
- Consumes: `browserQuickScanGithubRepo`.
- Produces: public interactive route and manifest metadata.

- [ ] Build semantic NovaTools header/footer and tool container using existing global CSS assets.
- [ ] Add labeled repository input, scan button, `aria-live` status, coverage summary, score, release-gate state, and findings list.
- [ ] Render all finding text via DOM text APIs; never inject scanner output via `innerHTML`.
- [ ] Add visible boundaries: public repos only, bounded native checks, direct GitHub API access, no private source upload to NovaTools, no security-certification claim.
- [ ] Add Launch Verification card: `$149 USD`, one-time, human-reviewed findings/remediation/fix→re-test evidence, `Payment activation pending`.
- [ ] Link Privacy, Terms, Contact, Security, Refund Policy, RLSProof repository, and GitHub Action documentation.
- [ ] Add canonical/OG/Twitter metadata and truthful SoftwareApplication JSON-LD without review/rating properties.
- [ ] Keep RLSProof CSS scoped and responsive; no new dependency.
- [ ] Run focused tests.

### Task 4: Certify and expose through NovaTools discovery

**Files:**
- Modify: `src/data/tool-certification.json`
- Modify: `src/data/category-meta/security-tools/category-meta.json` only if the existing category generator requires explicit listing.
- Generated by existing postinstall/build: `tools-manifest.json`, sitemap, category availability.

**Interfaces:**
- Produces: one certified security tool record.

- [ ] Add a full certification record for `/tools/security/rlsproof/` with all required fields.
- [ ] Set `CertificationStatus: CERTIFIED`, `Indexable: true`, `AdsEligible: false`, `PrivacyTruth: EXTERNAL_API`, `ExternalNetwork: true`, `SyntheticData: NONE`.
- [ ] State the GitHub REST API as the data source and enumerate rate-limit/bounded-scope limitations.
- [ ] Ensure search/category/sitemap discovery derives from the generated manifest instead of hard-coded duplicates where possible.
- [ ] Regenerate manifest and run the focused contract.

### Task 5: Add refund-policy surface for paid-service readiness

**Files:**
- Create: `public/refund-policy.html`
- Modify: `site-links.txt`

**Interfaces:**
- Produces: `https://mc-novatools.com/refund-policy.html` linked from RLSProof.

- [ ] Match existing NovaTools legal-page header/footer/layout and canonical/OG metadata.
- [ ] State that Launch Verification is a one-time digital/human-reviewed service; cancellation/refund requests before substantial work begins are reviewed promptly, completed/delivered work may be non-refundable where legally permitted, and mandatory consumer rights remain unaffected.
- [ ] Do not claim Paddle is active or approved.
- [ ] Add the route to `site-links.txt` so link validation covers it.

### Task 6: Full build/security/SEO verification

**Files:**
- Modify only if an existing gate reveals a real compatibility issue.

- [ ] Run `npm ci`/postinstall and confirm the manifest includes RLSProof exactly once.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run lint:csp`, `npm run lint:site-links`, `npm run audit:public-routes`, and `npm run lint:performance-budget`.
- [ ] Inspect generated HTML for canonical, no localhost, no duplicate JSON-LD, and no fabricated rating/review.
- [ ] Review diff for unrelated changes.
- [ ] Open PR only when branch verification is green; merge only after exact-head CI succeeds.
- [ ] Verify the production Cloudflare route and then use `https://mc-novatools.com/tools/security/rlsproof/` as the Paddle product/domain review URL.

## Verification checkpoints

- 2026-09-11: RLSProof focused integration contract is GREEN in CI; the remaining full-suite failure was traced to stale committed sitemap artifacts after the security category gained its first certified public tool.
- 2026-09-11: Canonical sitemap artifacts were regenerated from `tools-manifest.json`; `/categories/security-tools.html` and `/tools/security/rlsproof/` are now derived from the certification state instead of being manually whitelisted.
- 2026-09-12: NovaTools-native About navigation, footer legal markup, Refund Policy sitemap registration, and generated sitemap state were corrected; the migration regression suite passed before commit.
- Exact-head full CI remains the merge gate; no production merge is allowed until the current user-authored head completes the normal release-readiness and Cloudflare validation workflows successfully.
