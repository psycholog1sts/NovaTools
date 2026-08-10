# NovaTools Pro Platform Baseline

**Date:** 2026-08-10
**Pre-change baseline commit:** `2996bb108388e778b564c46e8bedc7f64f6d261b`
**Production domain:** `https://mc-novatools.com/`
**Repository:** `psycholog1sts/NovaTools` (private)

## Scope

This document records the verified pre-monetization baseline and the first Phase 1 findings before introducing auth, billing, entitlements, Pro workflows, or a dynamic control plane. Repository and production behavior are treated as source of truth; historical plans are not.

## Verified architecture

- Vite 5 multi-page application with static HTML route inputs.
- Node contract in `package.json`: Node `>=22 <23`, npm `>=10`.
- Browser-first tool execution remains the primary product model.
- GitHub Actions deploys `dist/` to Cloudflare Pages on pushes to `main`.
- Cloudflare delivery config is represented in-repo by `wrangler.toml`, `public/_headers`, and `public/_redirects`.
- The live custom domain is actively proxied through Cloudflare: live HTTP responses expose Cloudflare edge headers including `server: cloudflare` and `cf-ray`; an automated request was also subject to a Cloudflare Managed Challenge.
- Vercel also has a `novatools-mc` project connected to the same GitHub repository and currently has production/preview deployments.
- Because both delivery systems exist, the origin behind the Cloudflare proxy must still be verified from DNS/Cloudflare project configuration before either platform is removed or repurposed.
- `api/live-data.js` is a Vercel-style Edge handler and is also imported into Vite dev middleware. Its production execution path behind the Cloudflare-proxied custom domain is not yet proven.

## Baseline validation evidence

The original `main` GitHub Actions baseline for commit `2996bb108388e778b564c46e8bedc7f64f6d261b` completed successfully and ran:

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

1. PDF Compressor exposed High Quality, Balanced, and Maximum presets with percentage reduction/quality claims while its `imageQuality` settings were unused and `pdf-lib` did not downsample page images.
2. The same false quality abstraction also existed in the shared PDF tool-controller implementation, where compression settings were calculated and never applied.
3. PDF Compressor hid output growth by presenting non-negative “savings” and published 10–80% reduction claims in UI/schema copy.
4. PDF Compressor had duplicate `Last updated` content, contradictory SEO/help sections, and inconsistent canonical host copy.
5. Public author/about/schema sources asserted an `LPC` credential, multi-year experience and social ownership that were not established by the repository evidence reviewed in this audit; the named GitHub social URL currently returns 404.
6. Build-time blog authorship and structured-data sources could reintroduce stale identity/social claims even after individual static pages were edited.
7. `README.md` contained stale/unverified CPC values, AdSense revenue language, absolute privacy statements, old `novatools.mc` links, Matrix-theme documentation, and a Vercel-first deployment recommendation that did not match the current product/architecture.
8. `package.json` pointed `repository.url` to the unrelated/stale `zero-tools/platform.git` repository.
9. `src/js/seo.js` declared `SUPPORTED_LOCALES = ['en', 'tr']` while also carrying Arabic homepage copy; Vite built `en/tr/ar` localized roots/tools/categories. Locale/canonical work is isolated in draft PR #157.
10. `buildSoftwareApplicationSchema()` accepts aggregate rating data. Production must never pass rating data unless it is sourced from real, visible user ratings.

### P1 — Delivery / operations

11. `main` is not branch-protected and has no required status checks configured.
12. GitHub Actions production deployment uses `npx wrangler@latest`, reducing deployment reproducibility.
13. Production dependency audit is `continue-on-error`; high/critical findings do not block deployment.
14. Lighthouse CI is `continue-on-error`; material regressions can ship without blocking production.
15. Vercel and Cloudflare Pages both deploy the repository. The authoritative DNS/origin path must be documented and redundant production delivery should be intentionally retained or removed.
16. Vercel project runtime is Node 24.x while repository runtime contract is Node 22.x.
17. Vercel has the custom domain configured even though GitHub Actions also deploys production to Cloudflare Pages.
18. The Cloudflare edge is actively challenging some automated requests. Monitoring/smoke design must account for this without weakening the production security posture.

### P2 — Repository hygiene

19. Repository search results include tracked `.venv` contents despite `.gitignore` excluding `.venv/`.
20. `.gitignore` intentionally does not ignore `dist/`, so generated build output can remain tracked and create repository noise/stale artifacts.
21. Multiple old open PRs remain based on significantly stale commits and are not necessarily mergeable.

### P2 — Security / headers

22. CSP currently permits `'unsafe-inline'` for scripts and styles. Removing it requires an inventory/report-only migration, not a blind hardening change.
23. `public/_headers` sets static cache rules but there is not yet an authenticated/API no-store policy because the control plane does not exist. Any future `/api/*` and account surface must explicitly prevent shared caching.
24. The Vite development/preview security header definition duplicates the Cloudflare `_headers` policy, creating two sources that can drift.

### P2 — Live data

25. `api/live-data.js` proxies TCMB, CoinGecko, Open-Meteo, and a Yahoo Finance-style endpoint. Provider terms, attribution, rate limits and the actual production route still need verification.
26. Baseline upstream calls lacked explicit abort timeouts.
27. Baseline upstream errors could be returned to clients and unsuccessful responses were cacheable.
28. Baseline exchange handling could label unsupported base currencies incorrectly.

## Phase 1 changes isolated in draft PR #158

The current work remains off production/main and is intentionally reviewable/rollbackable.

- Replaced stale README product/revenue/privacy architecture claims.
- Corrected package repository metadata.
- Hardened live-data timeout, error sanitization, error-cache policy and supported base behavior; added focused regression tests.
- Added public trust-claim policy and runtime legal-data sanitation.
- Removed unverified credential/social claims from the primary about/author metadata surfaces.
- Added final build-output trust normalization so known stale credential/social claims inserted by older build steps cannot reach the public `dist/` output; build fails if blocked claims remain.
- Reworked PDF Compressor into one truthful structural-optimization mode across route UI, route logic, shared controller implementation, registry and metadata.
- PDF Compressor now reports signed size change and explicitly allows smaller/similar/larger results instead of hiding growth.
- PDF Compressor product-event metadata now uses coarse file-size buckets instead of exact file sizes.
- Added PDF Compressor trust-contract regression coverage.

## Production observations

- The public site is crawlable via ordinary public web discovery, but Search Console data has not been inspected.
- The live PDF Compressor on the production baseline still contains the old contradictory claims until the isolated PR is intentionally merged/deployed.
- The production domain is behind Cloudflare proxy/security.
- The latest verified `main` Cloudflare Pages deployment after the accidental placeholder rollback completed lint/test/build/route checks and deployment successfully; the resulting Git tree was identical to the previous verified baseline tree.
- Vercel reported no production runtime error clusters in the inspected seven-day window; runtime log counts were empty for that period.

## Not verified in this baseline

- Cloudflare dashboard DNS record targets, zone settings, cache rules, WAF rule inventory, Bot Management settings, analytics, Pages custom-domain binding and current nameservers: the Cloudflare plugin was installed but its callable dashboard tools were not exposed in this chat session.
- Google Search Console property data: no Search Console connector is available in this session.
- A local interactive worktree `git status` / `npm ci` run: repository command execution is not exposed in the current connector environment; GitHub Actions is used as executable validation evidence.
- Field Core Web Vitals (CrUX/Search Console) and real-user p75 measurements.

## Guardrails for next phases

- Preserve the Vite MPA and public static route model.
- Do not require login for existing Free tools.
- Do not introduce billing/auth dependencies into initial Free page bundles.
- Keep user file/content processing local wherever technically practical.
- Do not enable live billing before signed webhook, idempotency, normalized subscription state, entitlement, RLS, reconciliation, sandbox E2E, privacy/terms updates, and rollback runbooks are verified.
- Do not modify production DNS, SSL, billing credentials, secrets, or destructive database state without the appropriate production gate.

## Immediate next targets

1. Make PR #158 fully green after the PDF/trust build changes and smoke its English/Turkish preview routes.
2. Keep PR #157 green and isolated for locale/public-delivery contract work.
3. Verify Cloudflare dashboard origin/DNS/project settings when callable tools become available.
4. Pin Wrangler and strengthen CI/branch protection in a separate, low-blast-radius delivery change.
5. Add browser E2E/product-event privacy foundations before auth/billing implementation.
