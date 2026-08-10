# MC NovaTools

Privacy-first, browser-oriented utility tools for PDF, image, text, developer, finance, conversion, productivity, and related workflows.

Production site: `https://mc-novatools.com/`

## Product principles

- **Browser-first processing:** user files and sensitive tool inputs should stay on the device wherever the tool can reasonably operate locally.
- **No forced signup for Free:** existing public tools remain directly usable without an account.
- **Utility before monetization:** tools should solve the user task first; advertising or future Pro surfaces must not block the core workflow.
- **Honest claims:** no fabricated ratings, user counts, revenue/CPC claims, guarantees, or unsupported performance claims.
- **Stable public routes:** preserve the existing Vite MPA URL, canonical, sitemap, hreflang, and category/tool routing contracts.
- **Progressive architecture:** do not migrate the site to a SPA/framework rewrite merely to add monetization or account features.

## Current architecture

```text
Public site
  |
  +-- Vite multi-page application
  |     +-- static root/category/blog/tool HTML routes
  |     +-- browser-side JavaScript modules
  |     +-- browser-local file/tool processing where practical
  |
  +-- Cloudflare Pages production deploy
        +-- dist/ build output
        +-- public/_headers security/cache policy
        +-- public/_redirects static rewrite/404 policy

Development / auxiliary delivery
  +-- Vercel project connected to the same repository
  +-- api/live-data.js Vercel-style Edge handler
```

The authoritative DNS/origin path is operational configuration and must be verified before changing Cloudflare or Vercel production settings. The repository currently has both Cloudflare Pages and Vercel delivery surfaces, so they should not be treated as interchangeable without verification.

## Privacy boundary

NovaTools is not accurately described by a global “no data ever leaves the device” statement.

- File-processing tools are designed to keep user files in the browser where technically practical.
- Some tools use external/live-data providers and therefore make network requests for the requested public data.
- Google Analytics/AdSense-related code is consent-controlled where configured.
- Future account, entitlement, and billing features will necessarily process limited account/billing metadata server-side while keeping user file contents local by default.

Do not log or send file contents, filenames, pasted document content, generated secrets, tokens, passwords, or other sensitive tool inputs to product analytics.

## Technology

- Node.js 22 contract
- npm
- Vite 5
- Vanilla JavaScript / ES modules
- Multi-page application (MPA)
- Tailwind/PostCSS
- `pdf-lib`
- `decimal.js`
- `zod`
- Lighthouse CI
- custom build, SEO, sitemap, RSS, performance, route, and AdSense-readiness scripts

See `package.json` for the current dependency and script source of truth.

## Development

Use Node 22 and the repository npm version contract.

```bash
npm ci --include=optional
npm run dev
```

Core validation:

```bash
npm run lint
npm test
npm run build
npm run audit:public-routes
npm run lint:site-links
npm run ci:validate
```

Additional checks are available for sitemap, RSS, structured data, media dimensions, blog routes/content, performance budgets, critical CSS, algorithm resilience, and AdSense readiness. Do not remove existing quality gates without a measured replacement.

## Build and routing

The site is a Vite MPA. Static routes are explicit build inputs and are post-processed by repository scripts.

Important route constraints:

- Do not convert navigation to a generic client-side SPA router.
- Do not silently change clean URL behavior.
- Preserve canonical host and sitemap contracts.
- Treat locale route behavior as a coordinated SEO/routing concern rather than a runtime-only translation feature.

## Deployment

### Cloudflare Pages

The GitHub Actions production workflow builds and deploys `dist/` to Cloudflare Pages on `main`.

Relevant files:

```text
.github/workflows/deploy.yml
wrangler.toml
public/_headers
public/_redirects
```

Production DNS, SSL/TLS, WAF, cache rules, domain routing, and nameserver changes are operationally sensitive and should be verified in the Cloudflare dashboard before modification.

### Vercel

A Vercel project is also connected to this repository and has production/preview deployments. This is an auxiliary/duplicated delivery surface until the authoritative domain path is explicitly documented.

Do not introduce behavior that works only on Vercel while assuming it also works on Cloudflare Pages. In particular, verify the production execution path of `api/live-data.js` before treating it as a Cloudflare API route.

## Live data

`api/live-data.js` currently contains adapters for public data sourced from providers such as TCMB, CoinGecko, Open-Meteo, and a Yahoo Finance endpoint.

Before expanding this surface, verify:

- provider terms and attribution
- rate limits
- explicit upstream timeouts
- caching/freshness requirements
- error sanitization
- production runtime/routing on the actual origin

Finance outputs are informational estimates and are not investment advice.

## SEO and content rules

- Prioritize helpful, accurate user-facing content over keyword volume.
- Do not create doorway pages or thousands of thin parameter variants.
- Structured data must match visible, real content.
- Do not publish `aggregateRating` without real, visible rating data.
- Claims such as percentages, performance improvements, security guarantees, and tool counts require evidence or a reliable source of truth.
- Core Web Vitals work should use current metrics: LCP, INP, and CLS. Lighthouse is lab data, not field performance proof.

## Security

Current Cloudflare static header policy is maintained in `public/_headers`; Vite dev/preview also defines security headers.

Security changes should be incremental and tested. In particular, CSP currently relies on inline-script/style allowances, so removing `'unsafe-inline'` requires an inventory and staged migration rather than a blind enforcement change.

Never commit:

- API tokens
- private keys
- database passwords
- service-role credentials
- billing secrets
- webhook secrets
- production `.env` files

## Testing expectations

For changes that touch public routes, SEO, tool behavior, or deployment, run the relevant subset of:

```bash
npm run lint
npm test
npm run build
npm run ci:validate
npm run audit:public-routes
npm run lint:site-links
npm run lighthouse:ci
```

A change is not considered verified merely because the workflow UI is green when a step is configured with `continue-on-error`. Record the actual result and threshold.

## Monetization direction

The intended evolution is Free + Pro without breaking the Free product.

Free remains focused on direct single-task utility workflows. Pro should add workflow value such as batch processing, saved presets, workflow chaining, bulk export, practical higher limits, and an ad-free experience.

The public Vite MPA should remain isolated from the future authenticated control plane so an auth/billing outage does not take down Free tools.

Planned control-plane responsibilities may include:

- identity verification
- checkout/portal creation
- subscription normalization
- entitlements
- safe usage counters
- consent-aware product events
- health checks
- webhook ingestion and reconciliation

User file contents should not be moved into this control plane by default.

## Documentation

Key repository guidance:

- `AGENTS.md` — contributor and stability guardrails
- `docs/revenue/pro-platform-baseline.md` — monetization/control-plane baseline
- `docs/` — architecture, SEO, performance, operations, and project plans

## License

MIT. The repository is currently private; the presence of an MIT license does not by itself mean the source repository is publicly distributed.

## Disclaimer

Calculators and live-data tools provide informational or planning-oriented outputs. Users should independently verify results where financial, legal, medical, or other high-stakes decisions are involved.
