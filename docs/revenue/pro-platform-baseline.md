# NovaTools Pro Platform Baseline

**Date:** 2026-08-10
**Baseline commit:** `2996bb108388e778b564c46e8bedc7f64f6d261b`
**Production domain:** `https://mc-novatools.com/`
**Repository:** `psycholog1sts/NovaTools` (private)

## Scope

This document records the verified pre-monetization baseline before introducing auth, billing, entitlements, Pro workflows, or a dynamic control plane. Repository and production behavior are treated as source of truth; historical plans are not.

## Verified architecture

- Vite 5 multi-page application with static HTML route inputs.
- Node contract in `package.json`: Node `>=22 <23`, npm `>=10`.
- Browser-first tool execution remains the primary product model.
- GitHub Actions deploys `dist/` to Cloudflare Pages on pushes to `main`.
- Cloudflare Pages config is represented by `wrangler.toml`, `public/_headers`, and `public/_redirects`.
- Vercel also has a `novatools-mc` project connected to the same GitHub repository and currently has production/preview deployments. This is a duplicated delivery surface and must not be treated as the authoritative origin without DNS verification.
- `api/live-data.js` is a Vercel-style Edge handler and is also imported into Vite dev middleware. Its production execution path on the Cloudflare Pages deployment is not yet proven.

## Baseline validation evidence

The latest `main` GitHub Actions run for commit `2996bb108388e778b564c46e8bedc7f64f6d261b` completed successfully and ran:

- dependency install
- ESLint
- media-dimension audit
- blog-outline check
- tests
- production build
- site-link validation
- public-route audit
- Cloudflare Pages deploy
- Lighthouse CI

Important caveat: the dependency security audit and Lighthouse step are configured with `continue-on-error`, so a green workflow does not currently make either check a hard quality gate.

## Known baseline risks

### P1 — Trust / product truth

1. PDF Compressor exposes High Quality, Balanced, and Maximum presets with percentage reduction/quality claims, but the implementation does not apply its `imageQuality` values. The meaningful implementation difference is metadata removal. Static copy therefore overstates actual behavior.
2. The PDF Compressor page contains duplicate `Last updated` text and repeated SEO/help sections.
3. `README.md` contains stale/unverified CPC values, AdSense revenue language, absolute privacy statements, old `novatools.mc` links, Matrix-theme documentation, and a Vercel-first deployment recommendation that do not match the current product/architecture.
4. `package.json` points `repository.url` to the unrelated/stale `zero-tools/platform.git` repository.
5. `src/js/seo.js` declares `SUPPORTED_LOCALES = ['en', 'tr']` while also carrying Arabic homepage copy; Vite builds `en/tr/ar` localized roots/tools/categories. Locale/canonical work is already isolated in draft PR #157 and should be resolved there rather than duplicated in this phase.
6. `buildSoftwareApplicationSchema()` accepts aggregate rating data. Production must never pass rating data unless it is sourced from real visible user ratings.

### P1 — Delivery / operations

7. `main` is not branch-protected and has no required status checks configured.
8. GitHub Actions production deployment uses `npx wrangler@latest`, reducing deployment reproducibility.
9. Production dependency audit is `continue-on-error`; high/critical findings do not block deployment.
10. Lighthouse CI is `continue-on-error`; material regressions can ship without blocking production.
11. Vercel and Cloudflare Pages both deploy the repository. The authoritative DNS/origin path must be documented and redundant production delivery should be intentionally retained or removed.
12. Vercel project runtime is Node 24.x while repository runtime contract is Node 22.x.
13. Vercel has the custom domain configured even though GitHub Actions also deploys production to Cloudflare Pages.

### P2 — Repository hygiene

14. Repository search results include tracked `.venv` contents despite `.gitignore` excluding `.venv/`.
15. `.gitignore` intentionally does not ignore `dist/`, so generated build output can remain tracked and create repository noise/stale artifacts.
16. Multiple old open PRs remain based on significantly stale commits and are not necessarily mergeable.

### P2 — Security / headers

17. CSP currently permits `'unsafe-inline'` for scripts and styles. Removing it requires an inventory/report-only migration, not a blind hardening change.
18. `public/_headers` sets static cache rules but there is not yet an authenticated/API no-store policy because the control plane does not exist. Any future `/api/*` and account surface must explicitly prevent shared caching.
19. The Vite development/preview security header definition duplicates the Cloudflare `_headers` policy, creating two sources that can drift.

### P2 — Live data

20. `api/live-data.js` proxies TCMB, CoinGecko, Open-Meteo, and an unofficial Yahoo Finance endpoint. Provider terms, timeout behavior, rate limiting, attribution, and the actual Cloudflare production route need verification before the endpoint is treated as production-grade.
21. External fetches do not use explicit abort timeouts.
22. Upstream error messages can be returned to clients through the generic error payload.

## Production observations

- The public site is crawlable and the homepage is indexed by web search.
- `/tools/pdf/compress/` is live and currently exposes the contradictory preset claims described above.
- The latest main Cloudflare Pages deployment job succeeded.
- Vercel reports no production runtime error clusters in the last seven days; runtime log counts were empty for that period.

## Not verified in this baseline

- Cloudflare dashboard DNS records, zone settings, cache rules, WAF, Bot Management, analytics, Pages project settings, and current nameservers: the Cloudflare plugin was installed but its callable tools were not exposed in this chat session.
- Google Search Console property data: no Search Console connector is available in this session.
- A local `git status` / `npm ci` execution from a checked-out worktree: repository command execution is not available in the current connector context. CI results are therefore recorded as the executable baseline evidence.
- Field Core Web Vitals (CrUX/Search Console) and real-user p75 measurements.

## Guardrails for next phases

- Preserve the Vite MPA and public static route model.
- Do not require login for existing Free tools.
- Do not introduce billing/auth dependencies into initial Free page bundles.
- Keep user file/content processing local wherever technically practical.
- Do not enable live billing before signed webhook, idempotency, normalized subscription state, entitlement, RLS, reconciliation, sandbox E2E, privacy/terms updates, and rollback runbooks are verified.
- Do not modify production DNS, SSL, billing credentials, secrets, or destructive database state without the appropriate production gate.

## Immediate Phase 1 targets

1. Replace stale README/product claims with the current architecture and privacy boundary.
2. Correct stale package repository metadata.
3. Remove or correct misleading PDF Compressor preset/percentage claims after implementation-level regression coverage is added.
4. Preserve PR #157 as the isolated locale/public-delivery change stream rather than creating conflicting locale changes.
5. Add hard evidence/reporting for deployment reproducibility and security gate improvements before changing production CI behavior.
