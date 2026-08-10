# NovaTools — Discovery, Risk Register and 30-Day Roadmap

**Date:** 2026-08-10  
**Working branch:** `agent/pro-platform-phase0-phase1`  
**Production changes:** none intended from this document  
**Companion baseline:** `docs/revenue/pro-platform-baseline.md`

## 1. Current-state discovery summary

NovaTools is a privacy-oriented browser utility platform implemented as a Vite multi-page application. The current strengths are the large static/crawlable route surface, browser-first processing model, established SEO/build audit scripts, and an existing Cloudflare Pages deployment workflow. The immediate objective is not a framework migration; it is to make the existing product truthful, deterministic, measurable, secure, and monetization-ready without coupling Free tools to future auth/billing systems.

### Product purpose

- Fast browser utilities across PDF, image, text, developer, finance, conversion, productivity and related categories.
- Public Free use without forced signup.
- SEO/discovery through tool/category/blog routes.
- Advertising exists as a current monetization surface; a future Pro tier should monetize workflow convenience rather than disabling existing Free utility value.

### Current delivery map

```text
GitHub: psycholog1sts/NovaTools (private)
        |
        +-- main push ----------------------------+
        |                                         |
        |                           GitHub Actions deploy.yml
        |                                         |
        |                                         v
        |                                  Cloudflare Pages
        |                                         |
        |                                  mc-novatools.com
        |
        +-- Git integration ----------------------+
                                                  |
                                                  v
                                                Vercel
                                       production + previews
```

The repository and hosting data prove that both Cloudflare Pages and Vercel deploy the same repository. The authoritative DNS/origin path still requires Cloudflare-dashboard verification; it must not be guessed.

### Future control-plane boundary

```text
Public / Free data plane
  Vite MPA + browser tool runtime
  no auth dependency
  no billing dependency

Future authenticated control plane
  Cloudflare Worker (preferred, subject to route verification)
    ├─ auth verification
    ├─ checkout / portal
    ├─ subscription mirror
    ├─ entitlements
    ├─ product events
    ├─ health
    └─ reconciliation

  Supabase
    ├─ Auth
    └─ Postgres + RLS

  Merchant of Record
    └─ billing source of truth
```

## 2. Critical files and integrations

### Repository/runtime

- `AGENTS.md`
- `package.json`
- `package-lock.json`
- `.node-version`
- `vite.config.js`
- `tools-manifest.json`
- `.gitignore`

### Delivery / Cloudflare / Vercel

- `.github/workflows/deploy.yml`
- `.github/workflows/indexing.yml`
- `wrangler.toml`
- `public/_headers`
- `public/_redirects`
- `vercel.json`
- `api/live-data.js`

### SEO / indexing / i18n

- `src/js/seo.js`
- `src/i18n.js`
- `src/i18n/*`
- `/locales/*`
- sitemap/RSS/structured-data build scripts
- public-route and site-link audits
- draft PR #157 for locale/public-delivery contract stabilization

### Tool runtime / trust-sensitive examples

- `src/js/tool-page-enhancer.js`
- `src/tools/pdf/compress/index.html`
- `src/tools/pdf/compress/logic.mjs`
- finance calculators using `decimal.js`
- password/security utilities using browser cryptography

### Monetization / privacy

- AdSense/analytics integration in build/head components
- consent UI and consent-conditioned scripts
- privacy policy, cookie policy, terms, about, contact, security pages

## 3. Top 50 issue register

No verified P0 issue has been established in this audit. P0 must be reserved for demonstrated data loss, exploitable critical security exposure, production-wide outage, or comparable severity.

### P1 — High

1. **PDF Compressor preset claims do not match implementation.** Three quality/reduction modes claim materially different compression behavior while `imageQuality` is unused and pages are not downsampled.
2. **PDF Compressor publishes unsupported percentage-reduction ranges.** 10–20%, 30–50%, and 50–80% claims are not backed by the current algorithm or fixture corpus.
3. **PDF Compressor content is internally contradictory.** One section correctly states pages are not downsampled while other sections imply visual-quality trade-offs.
4. **PDF Compressor repeats SEO/help content and `Last updated` metadata.** This weakens clarity and creates source-of-truth debt.
5. **Author/credential claims require evidence.** `LPC` and any professional credential must remain only if current, accurate, and publicly supportable; otherwise remove or use a neutral role description.
6. **Locale configuration has multiple sources of truth.** Vite builds `en/tr/ar`; `src/js/seo.js` supports `en/tr` while also containing Arabic copy. PR #157 is the isolated repair stream.
7. **Canonical-host sources are inconsistent.** Some tool HTML uses `www.mc-novatools.com` while the SEO module uses `mc-novatools.com`.
8. **Hard-coded `110+` tool-count copy can become stale.** Prefer manifest-derived build-time count or non-numeric copy.
9. **Structured-data rating support can create fake review markup if fed unverified values.** Production must reject/remove ratings unless visible real rating data exists.
10. **`main` is unprotected.** Direct writes can trigger production Cloudflare deploys.
11. **No required branch status checks are enforced.** Green PR checks are not structurally required before merge.
12. **Cloudflare deployment is not reproducible enough.** CI uses `npx wrangler@latest` instead of a lockfile-pinned Wrangler version.
13. **Production security audit is non-blocking.** `npm audit --audit-level=high --omit=dev` uses `continue-on-error`.
14. **Lighthouse is non-blocking without an explicit regression policy.** Large regressions can remain deployable.
15. **Cloudflare Pages and Vercel both deploy the same repo.** Delivery authority, rollback ownership and domain intent are ambiguous.
16. **Vercel runtime is Node 24.x while repository contract is Node 22.x.** Preview/production behavior can diverge from Cloudflare/CI assumptions.
17. **Vercel has the production domain configured while Cloudflare Pages also deploys production.** The actual request path needs DNS verification before either platform is removed or repurposed.
18. **`api/live-data.js` production runtime path on Cloudflare is not proven.** It is Vercel-style Edge code plus Vite dev middleware, not an established Pages Function/Worker route.
19. **Open draft PR #157 currently has a failing latest workflow.** Locale/public-delivery work should not merge until its failure is diagnosed and green again.
20. **There is no browser E2E gate for representative Free tools.** Existing Node/jsdom tests do not prove real browser interaction, file flows, navigation, mobile, or accessibility behavior.

### P2 — Medium

21. **Live-data error responses were cacheable.** Fixed on PR #158: non-2xx now uses `no-store`.
22. **Live-data upstream calls lacked explicit timeout.** Fixed on PR #158 with bounded abort timeout.
23. **Live-data errors leaked upstream exception text.** Fixed on PR #158 with public error sanitization.
24. **Unsupported exchange bases could be mislabeled.** Fixed on PR #158 by limiting/falling back to supported bases.
25. **Live-data has no distributed rate-limit/abuse control.** Required before expanding the API surface.
26. **Yahoo Finance-style upstream is an availability/terms risk.** Verify provider contract and attribution before relying on it as a core product dependency.
27. **External-provider attribution/freshness policies are not centralized.** Each live-data resource needs explicit source, cache and disclaimer contracts.
28. **CSP still allows `'unsafe-inline'` scripts/styles.** Needs staged inventory/report-only hardening, not abrupt enforcement.
29. **Security header policy has multiple sources.** Vite dev/preview headers and Cloudflare `_headers` can drift.
30. **Future `/api/*` and account pages lack explicit private/no-store cache policy.** Must be added before authenticated routes exist.
31. **Tracked `.venv` content exists despite `.gitignore`.** Clean current index; do not rewrite history inside the monetization PR.
32. **Generated `dist/` tracking policy creates stale/noisy artifact risk.** Determine whether it is intentionally versioned and enforce one source of truth.
33. **Repository contains many stale/open branches and PRs.** Triage to reduce merge/conflict and maintenance risk.
34. **No dedicated secret-scan gate is proven.** Add a repository-safe secret scanning step without echoing secrets.
35. **No explicit trust-claim CI policy exists.** Detect globally false phrases/percentages/fake ratings in public output where practical.
36. **Service-worker behavior for future account/API pages is not yet defined.** Auth/entitlement responses must never be cached as public static content.
37. **Current analytics/consent contracts need event-level privacy tests before Pro funnel measurement.** Product analytics must reject filenames/content/financial inputs/secrets.
38. **No typed/validated internal API contract exists yet.** Future Worker requests/responses should use explicit validation and stable error codes.
39. **No request-ID observability contract exists for future dynamic requests.** Required for support and incident correlation.
40. **No control-plane fail-open/fail-closed matrix is implemented.** Free public site must fail open; entitlement grants/billing mutations fail closed; verified local-only Pro convenience may use bounded grace.

### P3 — Low / polish

41. **README/product documentation was stale and misleading.** Corrected on PR #158.
42. **Package repository metadata was stale.** Corrected on PR #158.
43. **Some public pages contain excessive/repeated explanatory blocks.** Consolidate incrementally based on user intent, not a site-wide template rewrite.
44. **Tool page copy has repeated absolute privacy/security wording.** Keep tool-specific local-processing truth but avoid global absolutes.
45. **Brand naming varies (`MC NovaTools`, `NovaTools MC`, `NovaTools`).** Define one user-facing convention without URL changes.
46. **Mobile consent/sticky UI collision needs explicit visual regression coverage.** Test 320/360/390px widths.
47. **Accessibility needs browser-level WCAG 2.2 AA checks.** Especially nav, modal-like surfaces, pricing/account and file controls.

### P4 — Ideas requiring evidence

48. **Batch Image Workspace** is a plausible first Pro workflow but should be validated against actual repeat/high-intent tool usage before broad investment.
49. **Saved local presets/workflow chaining** are promising low-maintenance Pro value but require funnel/retention measurement before expansion.
50. **Public commercial API / cloud sync / team features** should remain deferred until paid-user or B2B demand proves the operational cost is justified.

## 4. 30-day implementation plan

### Days 1–5 — Phase 0/1: truth, delivery and safety baseline

- Keep PR #158 isolated and green.
- Resolve PDF Compressor trust debt with implementation + copy + i18n + regression tests as one atomic change.
- Finish claim audit: fake ratings, percentages, guarantees, hard-coded counts, privacy absolutes, unsupported credentials.
- Diagnose latest PR #157 CI failure; merge nothing until locale/public-delivery checks are green.
- Verify Cloudflare dashboard: DNS authority, Pages project, custom domains, cache rules, WAF, analytics, current nameservers.
- Decide/document Vercel role after DNS evidence; do not remove it blindly.
- Pin Wrangler through package/lockfile in a dedicated CI change.
- Establish branch protection/required checks only after validating the exact check names and avoiding deploy deadlock.

**Success:** trustworthy public copy, deterministic delivery source, no known P1 claim contradiction, repeatable CI.

### Days 6–10 — Phase 2: measurement contract and browser regression suite

- Add Playwright as dev-only dependency.
- Representative Free-tool smoke matrix: PDF, image, text, developer, finance, converter, calculator, security, productivity.
- Add mobile/keyboard/404/canonical/public-route E2E.
- Define product-event schema and privacy filter.
- Prohibit filenames, document/text content, finance values, secrets and clipboard data in analytics payloads.
- Create consent-aware event transport with no-op behavior when consent is absent where required.
- Add pricing funnel event names without live billing.

**Success:** Free behavior and privacy become measurable without collecting sensitive inputs.

### Days 11–14 — Phase 2B: pricing/value validation

- Add crawlable `/pricing/` with transparent Free / Pro Monthly / Pro Annual comparison.
- Price and provider identifiers remain config-driven hypotheses.
- If live billing is not ready, use a truthful disabled/interest mode rather than fake checkout success.
- Add contextual Pro CTA only at high-intent moments; no aggressive homepage modal.
- `account/` can remain absent until auth foundation is ready.

**Success:** measurable pricing intent without changing Free access.

### Days 15–20 — Phase 3/4: auth + data foundation

- Verify/create Supabase environment separation: local/preview/production.
- Add auth client lazily; do not add SDK cost to normal Free-page initial load.
- Prefer magic-link/OTP initial flow.
- Add additive DB migrations: profiles, billing customers, subscriptions, webhook event store, entitlement/read model as justified.
- Enable RLS in the same migration package as user-owned tables/policies.
- Add DB constraints/indexes for provider/customer/subscription/event identities.
- Add migration and RLS tests.

**Success:** account identity exists without becoming a dependency of Free tools.

### Days 21–25 — Phase 5/6: billing adapter, webhooks, entitlement

- Re-check current official Lemon Squeezy and Paddle docs before coding provider-specific details.
- Implement provider-neutral billing interface.
- Implement server-side plan-key mapping; client cannot set amount/currency/provider IDs/entitlements.
- Signed raw-body webhook verification.
- Event-store idempotency and old-event protection.
- Normalize provider state to internal subscription state machine.
- Generate entitlements from server-owned plan config.
- Add reconciliation routine.
- Add sandbox lifecycle, duplicate replay, delayed event, failed-payment, cancel/end-period tests.

**Success:** no live billing yet; sandbox contract is deterministic and idempotent.

### Days 26–30 — Phase 7–10: account, first Pro workflow, hardening

- Add `/account/` and billing portal integration; default `noindex,nofollow`.
- Add one evidence-backed Pro workflow only (likely Batch Image or Batch PDF based on usage data).
- Queue/concurrency/cancel/partial-success/memory cleanup for browser batch jobs.
- Add `pro.ad-free` behavior without empty ad placeholders/CLS.
- Add health endpoint, request IDs, sanitized operational logs, alerts and incident runbooks.
- Perform security/accessibility/performance/SEO/privacy regression sweep.
- Do not switch live billing until legal/product/technical go-live gates pass.

**Success:** preview/sandbox Pro lifecycle works while Free tools remain independent.

## 5. Test plan

### Every relevant PR

- `npm ci --include=optional`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run lint:site-links`
- `npm run audit:public-routes`
- relevant focused regression tests

### Browser E2E target

- homepage and navigation
- one critical tool from each representative category
- PDF fixtures: normal, image-heavy, encrypted, corrupt, one-page, large-page-count
- image fixtures: JPEG, PNG, WebP, transparency, EXIF, large dimensions, corrupt/unsupported
- finance boundaries: zero, negative, huge, decimal, invalid/missing
- pricing/account/auth/billing sandbox when those surfaces exist
- keyboard, focus, reduced motion, 320px mobile, 404
- canonical/robots/noindex/cache headers

### Security target

- dependency audit policy
- secret scan
- DOM/XSS sinks and URL-parameter/open-redirect tests
- RLS/authorization tests
- webhook signature + replay/idempotency
- rate-limit behavior
- no-sensitive-analytics payload tests
- no shared cache on authenticated/API responses

### Performance target

- preserve Free initial bundle budget
- Pro/auth code lazy-loaded
- Lighthouse regression thresholds
- field CWV tracked separately when CrUX/Search Console data becomes available
- LCP/INP/CLS p75 targets: 2.5s / 200ms / 0.1 where field data exists

## 6. Rollback and security plan

### Static Pages change

1. Identify last verified deployment/commit.
2. Confirm DB schema compatibility is irrelevant for static-only rollback or compatible if control plane exists.
3. Roll back Pages deployment / revert commit.
4. Smoke `/`, representative tools, sitemap, robots, canonical, 404.
5. Record incident and root cause.

### Worker/control-plane change

1. Use previous Cloudflare Worker version/deployment if schema-compatible.
2. If migration prevents rollback, prefer forward-compatible fix rather than blind code rollback.
3. Keep Free static site independent.

### Database change

- expand → deploy compatible code → backfill → switch reads → verify → later contract.
- no destructive production migration as first step.
- backup/restore capability and RPO/RTO must be verified from the actual Supabase plan before go-live.

### Secret incident

- revoke → rotate → update CI/runtime → audit access/logs/provider activity → document scope.
- deleting the secret from a current Git commit is not sufficient.

## 7. Content and niche development plan

Focus on high-intent utility clusters rather than generic AI-generated volume:

1. **PDF workflows:** merge/split/compress/OCR/convert/clean/share constraints.
2. **Image workflows:** resize/compress/convert/metadata/batch publishing.
3. **Developer utilities:** JSON, encoding, formatting, diff, schema and safe local secret utilities.
4. **Practical calculators/converters:** exact input/output usefulness, transparent formulas and limitations.
5. **Workflow guides:** answer real task sequences and naturally link to the exact tools required.

For each content item require: user intent, unique contribution, source/evidence, update date, internal links, relevant tool CTA, limitation notes and localized quality review.

Do not create doorway pages such as near-identical “compress PDF for school/office/business/email” pages unless intent and actual content/functionality are meaningfully different.

## 8. Acquisition and retention plan

### Acquisition

- Technical SEO correctness first: deterministic canonical/hreflang/sitemap/404 and useful tool pages.
- Content clusters tied to real tool workflows rather than broad keyword volume.
- Search snippets based on honest benefits/limitations.
- Fast public pages and strong mobile usability.
- Shareable/downloadable outcomes where appropriate without dark patterns.

### Retention

Use product value, not forced engagement:

- recent local tool history without file contents
- saved local presets
- related next-step tools after successful completion
- batch/workflow convenience for Pro
- optional RSS/email later only if demand justifies maintenance
- no back-button hijack, false scarcity, intrusive popups or accidental ad-click design

### Primary metrics

- tool start → success
- repeat successful use
- pricing view → CTA click → checkout start → authoritative paid conversion
- active paid / MRR / churn
- Pro feature activation and repeat use
- error/support rates
- CWV and task-completion quality

## 9. AdSense / advertising readiness checklist

- [ ] Site purpose is clear and navigation works without traps.
- [ ] About, contact, privacy, cookie and terms pages are accurate/current.
- [ ] No fabricated reviews, ratings, user counts or earnings/CPC claims.
- [ ] No thin/duplicated SEO content blocks on key tools.
- [ ] Ad slots do not cover controls or create accidental-click patterns.
- [ ] Mobile tool workflow remains usable with consent/ad UI present.
- [ ] Ad space is reserved where needed to avoid CLS.
- [ ] Consent behavior matches applicable policy and real script behavior.
- [ ] Pro `ad-free` later prevents ad script/slot work where technically controllable.
- [ ] User files/inputs are not sent to ad/product analytics.
- [ ] Public pages are crawlable and canonical/sitemap/robots behavior is deterministic.
- [ ] Content/structured data reflects visible reality.
- [ ] Performance cost of third-party scripts is measured, not assumed.

AdSense approval and search ranking cannot be guaranteed.

## 10. User/production approval gates

The following remain gated and are not part of this branch:

- production DNS/nameserver/SSL changes
- destructive or incompatible database migration
- production env/secret changes or rotation
- live billing switch / real-money transaction
- provider KYC or contractual acceptance
- destructive Git history rewrite
- irreversible data deletion/export
- security-rule relaxation

Routine branch work, tests, docs, preview validation and sandbox billing implementation can proceed without repeated approval.

## 11. Current status of requested external sources

- **GitHub:** connected and verified; repository, branches, PRs, workflow runs and files inspected.
- **Vercel:** connected and verified; project, domains, deployments and runtime error surface inspected.
- **Cloudflare:** production Pages deployment is proven from GitHub Actions. Cloudflare dashboard-only DNS/WAF/cache/analytics settings remain unverified because the newly installed Cloudflare plugin did not expose callable tools in this chat session.
- **Google Search Console:** no connector is available in this session; Search Console metrics are therefore explicitly unverified. Repository/live-site indexability checks are used only as a substitute for technical validation, not as Search Console data.

## 12. Immediate next execution order

1. Make PR #158 green and review its preview.
2. Fix PDF Compressor truth debt atomically.
3. Diagnose/fix PR #157 latest CI failure and preserve one locale contract source of truth.
4. Verify Cloudflare dashboard when callable tools become available.
5. Only then begin product-event + Playwright foundation before auth/billing work.
