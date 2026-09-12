# RLSProof → NovaTools Integration Design

## Goal
Integrate RLSProof as a first-class NovaTools security tool at `https://mc-novatools.com/tools/security/rlsproof/` without changing existing tool behavior, while making the NovaTools domain the canonical public surface for RLSProof Quick Scan and Paddle review.

## Research basis
- Google Search Central SEO Starter Guide: logical directory structure, descriptive URLs, unique titles/descriptions, internal links, canonical URLs, accessible crawlable resources, and sitemap discovery.
- Google people-first guidance: original, useful, trustworthy content with clear expertise, scope, limitations, and no search-first filler.
- Google structured data guidance: only truthful visible data; JSON-LD is preferred; no fabricated ratings/reviews.
- Core Web Vitals: target LCP <= 2.5s, INP <= 200ms, CLS <= 0.1 at the 75th percentile.
- Existing NovaTools architecture: each tool is isolated under `src/tools/<category>/<slug>/`, `meta.json` feeds the manifest, certification controls indexability/ads, and existing Cloudflare/Vite/SEO/CSP build gates remain authoritative.

## Architecture
RLSProof becomes an isolated browser micro-tool under `src/tools/security/rlsproof/`. It does not iframe or proxy the old GitHub Pages site. The browser Quick Scan logic is ported from the verified `psycholog1sts/personal-app` implementation into focused local modules under the new tool directory and keeps the same bounded public-GitHub-only behavior.

Existing NovaTools components, global styles, analytics/consent, routing, finance tools, PDF/image tools, and other security tools are not refactored. Integration is additive: new tool files, certification record, discovery metadata, tests, and a refund policy route required for paid-service readiness.

## Public product surface
Canonical URL: `https://mc-novatools.com/tools/security/rlsproof/`.

The page includes:
- clear RLSProof positioning as a Supabase authorization/RLS release-check tool;
- public GitHub repository input and bounded browser Quick Scan;
- explicit coverage limitations and fail-closed language;
- visible finding severity, evidence and remediation;
- Launch Verification at `$149 USD`, one-time, with checkout/payment activation clearly marked unavailable until Paddle is approved;
- links to NovaTools Privacy, Terms, Contact, Security, and Refund Policy;
- links to the RLSProof source repository and GitHub Action documentation;
- no certification, customer-count, testimonial, review-rating, or compliance claims.

## Quick Scan behavior
The browser talks only to `https://api.github.com` and only for public repositories supplied by the user. No GitHub token is accepted. Limits remain:
- max 18 files;
- max 128 KiB per file;
- max 1 MiB scanned content;
- max 5,000 tree entries;
- max repository size 50,000 KiB.

The result is never presented as a complete security assessment. Coverage remains `complete: false`; high/critical findings produce `blocked`, otherwise the release gate remains `incomplete`. GitHub API/rate-limit/size/encoding failures are surfaced as errors rather than converted into PASS.

## Data/privacy boundary
The tool sends no repository contents to NovaTools servers. Public repository metadata and selected public blobs are fetched directly by the visitor browser from GitHub's public API. Scan evaluation runs in-browser. The page states this accurately and does not use absolute privacy wording such as “100% secure/private.”

Certification truth:
- `PrivacyTruth`: `EXTERNAL_API`;
- `ExternalNetwork`: `true`;
- `DataSource`: user-supplied public GitHub repository plus GitHub REST API;
- `SyntheticData`: `NONE`;
- known limitations enumerate unauthenticated GitHub API rate limits, bounded files/bytes/tree size, native rules only, and no private repositories.

## SEO / Google
The tool has one canonical URL on `mc-novatools.com`; the old GitHub Pages URL is not canonical. Metadata is unique and descriptive. The route is discoverable through the generated manifest/category/search/sitemap machinery once certified.

JSON-LD uses `SoftwareApplication`/`WebApplication` truthfully with a free Quick Scan offer only; the paid human-reviewed service is described visibly in page content instead of fabricating a SoftwareApplication rating/review. No `aggregateRating` or `review` fields are added.

## Design
Use existing NovaTools global CSS/layout so the tool visually belongs to the site. RLSProof-specific CSS is scoped to `.rlsproof-*` classes and adds only the minimum product-specific command-center UI: input, status strip, coverage summary, findings list, pricing panel, and trust notes. No new font, animation library, UI framework, or runtime dependency is introduced.

Desktop and mobile must avoid overflow, retain 44px+ interactive targets, visible focus, semantic headings, labels, status text independent of color, `aria-live` for scan progress/results, and reduced-motion compatibility through the existing site system.

## Commercial / Paddle readiness
Add `public/refund-policy.html` as an indexed, canonical, English policy page linked directly from the RLSProof paid-service section. It describes the Launch Verification refund/cancellation handling conservatively and defers mandatory consumer rights to applicable law; it does not claim an active Paddle checkout before approval.

Existing Privacy/Terms/Contact pages remain intact. The RLSProof page links to them rather than duplicating legal text.

## Testing and release gates
Add focused source/runtime tests for:
- GitHub URL parsing and file selection limits;
- fail-closed API/error behavior;
- finding generation/redaction/scoring;
- no token/private-repo support;
- canonical/metadata/schema/legal/pricing truth;
- certification record and discovery metadata;
- no fabricated ratings/reviews/certification claims;
- refund-policy route and internal link.

Then run the existing NovaTools test/build/SEO/CSP/public-route/performance gates. Merge only from an isolated branch after exact-head checks are green. After merge, verify the live Cloudflare route and Paddle-facing domain URL.