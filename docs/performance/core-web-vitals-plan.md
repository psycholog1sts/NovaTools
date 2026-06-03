# Core Web Vitals and Security Measurement Plan

NovaTools is a static multi-page Vite application. Tool landing pages are generated as crawlable HTML entries during `npm run build`, then served from the CDN edge with immutable caching for fingerprinted assets.

## Targets

- Lighthouse Performance: 95+
- Lighthouse Accessibility: 100
- Lighthouse Best Practices: 100
- Lighthouse SEO: 100
- LCP: < 2.5s
- CLS: < 0.1
- INP: < 200ms field target
- TTFB: < 800ms at CDN edge

## Performance budget

The CI budget is enforced with `npm run lint:performance-budget` after a production build:

- First-load JavaScript transfer: < 200KB per HTML route
- Linked CSS transfer: < 50KB per HTML route
- HTML image candidates: < 500KB per route

Lighthouse CI also carries matching resource budgets in `lighthouserc.cjs` for script, stylesheet, and image bytes.

## Measurement workflow

1. Run `npm ci` on Node 22.
2. Run `npm run build` to generate static HTML, sitemap, structured data, optimized chunks, and copied public assets.
3. Run `npm run lint:performance-budget` to catch oversized JavaScript, CSS, or image assets.
4. Run `npm run lighthouse:ci` to audit the built `dist` directory with assertions for the target categories and Web Vitals thresholds.
5. In production, verify security headers and TLS with an external SSL Labs scan before HSTS preload submission.
6. Run a mixed-content crawl against the deployed HTTPS site; the target is zero `http://` subresources.

## Manual checks

- Confirm the homepage hero image uses the lightweight SVG preview with explicit dimensions and no layout shift.
- Confirm tool pages reserve at least 600px of workspace height before interaction.
- Confirm no ad container is injected above primary content after load.
- Confirm PWA installability, offline navigation fallback, and same-origin static asset caching.
- Confirm browser DevTools Security tab shows HTTPS only and no mixed content.

## Deployment notes

- `vercel.json`, `public/_headers`, and `nginx.conf` contain the requested HSTS, CSP, referrer, frame, MIME, and permissions headers.
- `nginx.conf` disables TLS 1.0/1.1/1.2 by allowing TLS 1.3 only. Vercel TLS policy is controlled by Vercel's edge platform, so TLS version enforcement must be verified in the deployment provider dashboard or by SSL Labs.
- HSTS preload submission should only happen after the production domain and all subdomains have valid HTTPS and the preload header has been observed in production.
