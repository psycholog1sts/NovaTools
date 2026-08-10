# NovaTools Public Delivery Contract Stabilization Design

**Date:** 2026-08-10  
**Status:** Approved  
**Owner:** NovaTools engineering  
**Target repository:** `psycholog1sts/NovaTools`  
**Target branch:** `agent/public-delivery-contract-stabilization`

## 1. Purpose

Stabilize the public delivery contract before broader content, growth, advertising, and visual work. The release makes English the global default at root URLs, publishes Turkish as first-class static pages under `/tr/`, restores tools whose runtime dependencies conflict with the live Content Security Policy, and replaces source-string CI checks with behavior-oriented release gates.

This package preserves the existing Vite multi-page architecture. It does not introduce a new framework, database, account system, analytics vendor, or production-only service.

## 2. Verified Baseline

The August 10 live crawl covered 303 unique sitemap URLs and 606 English/Turkish variants.

- 322 audited requests redirected before reaching their final URL.
- 244 Turkish variants contained detectable English interface fragments.
- `robots.txt` blocked all query-string URLs even though Turkish was exposed through `?lang=tr`.
- `/tr/` returned 404 while source pages advertised `/tr/` alternates.
- sitemap entries used `.html` URLs that Vercel redirected to extensionless URLs.
- every audited variant included the unsupported `data-adsense` attribute.
- PDF Merge, PDF Split, and QR Code Designer referenced dependency hosts forbidden by the live CSP.
- Resume Builder emitted four `h1` elements.
- the runtime contained three divergent internationalization implementations.
- tests asserted the presence of implementation strings but did not execute the failing localization behavior.
- the live response path was Cloudflare in front of Vercel, while GitHub Actions also deployed `main` to Cloudflare Pages.

## 3. Goals

1. Keep existing English root URLs stable and indexable.
2. Publish Turkish pages at deterministic `/tr/...` URLs with complete visible Turkish content.
3. Emit canonical, `hreflang`, metadata, structured data, and HTML language attributes in generated HTML rather than repairing them after load.
4. Redirect legacy locale URLs to one final canonical URL without chains.
5. Serve production tool dependencies from the same origin without weakening CSP.
6. Make sitemap, robots, routes, and internal links agree on the same URL contract.
7. Add executable tests that fail on the verified live regressions.
8. Deliver through an isolated branch, CI, and preview; do not update production in this package without the production release gate.

## 4. Non-Goals

- Rewriting the site in React, Next.js, or another framework.
- Publishing any locale other than `en` and `tr`.
- Automatically translating editorial content.
- Rewriting the full blog catalogue in this package.
- Changing Cloudflare DNS, SSL, WAF, or Vercel environment variables.
- Enabling additional advertising formats or changing AdSense account settings.
- Deleting the historical Cloudflare Pages workflow before deployment ownership is separately verified.
- Redesigning tool interfaces unrelated to the delivery contract.

## 5. Selected Architecture

### 5.1 Locale URL Contract

| Content | English URL | Turkish URL | Indexing |
|---|---|---|---|
| Home | `/` | `/tr/` | Both indexable |
| Public page | `/<slug>` | `/tr/<slug>` | Both when localized |
| Category | `/categories/<slug>` | `/tr/categories/<slug>` | Both when localized |
| Tool | `/tools/<category>/<tool>/` | `/tr/tools/<category>/<tool>/` | Both when localized |
| Blog hub | `/blog` | `/tr/blog` | Both when localized |
| Article | `/blog/articles/<slug>` | `/tr/blog/articles/<localized-or-shared-slug>` | Only when editorially approved |

English remains the global default. `/en/...` permanently redirects to the equivalent root URL. `?lang=tr` permanently redirects to the equivalent `/tr/...` URL. Unsupported locale prefixes redirect to the English canonical page only when an exact public route exists; otherwise they return the normal 404.

### 5.2 Single Source of Truth

A locale contract module owns:

- supported locales: exactly `en` and `tr`;
- default locale: `en`;
- path normalization and locale-prefix handling;
- canonical and alternate URL generation;
- route-level locale availability;
- language-switch destinations;
- sitemap alternate records.

The source runtime and the public build artifact consume the same contract. The three current internationalization implementations may retain compatibility entry points temporarily, but route, metadata, and locale decisions must delegate to the single contract. No duplicated supported-language array may remain authoritative.

### 5.3 Build-Time Page Generation

The build emits separate HTML documents for English and Turkish. Each document contains before JavaScript executes:

- the correct `html[lang]` and direction;
- translated visible navigation, headings, controls, errors, and footer;
- self-referencing canonical URL;
- reciprocal `en`, `tr`, and `x-default` alternates only when both versions exist;
- localized title, description, Open Graph, and social metadata;
- structured data that matches visible content and uses the page language;
- internal links to final canonical URLs.

JavaScript may manage language selection, theme, tools, and dynamic states. It must not be required to make the primary document language-correct or indexable.

### 5.4 Dynamic Tool UI

`tool-page-enhancer.js` renders copy directly from the active locale dictionary. The implementation must not create English content and then walk text nodes to translate it. The current whitespace-regex defect and event-order dependency are removed with the post-processing approach.

Tool-specific names and user-provided values are not translated by substring replacement. Each generated component receives stable copy keys and locale-aware values. Language switching navigates to the alternate static page and preserves only explicitly allowlisted non-locale query parameters.

### 5.5 Tool Dependencies and CSP

PDF and QR libraries already declared by the project are bundled into same-origin assets. Runtime fallback arrays that load jsDelivr, unpkg, or esm.sh are removed from affected production tools. CSP remains fail-closed and is not expanded merely to make blocked third-party scripts work.

The build must fail when a public HTML or JavaScript artifact references an unapproved executable dependency host.

### 5.6 URL, Redirect, Robots, and Sitemap Consistency

- sitemaps list only final 200 canonical URLs;
- `.html` URLs permanently redirect to extensionless canonical URLs;
- redirects are single hop;
- `robots.txt` allows canonical locale routes and does not broadly disallow every query string;
- private/admin/test/API paths remain disallowed or noindexed as appropriate;
- every sitemap URL must resolve with status 200 and a self-canonical;
- every `hreflang` target must resolve with status 200, identify itself, and return a reciprocal alternate;
- internal links use final canonical URLs rather than relying on redirects.

### 5.7 AdSense Head Integration

The unsupported `data-adsense` attribute is removed from the injected head script. The account metadata and script remain single-instance. Ad rendering is excluded from 404, admin, test, and other non-content surfaces. Consent behavior remains privacy-first and no new tracker is introduced.

## 6. Data Flow

1. English source content and editorially approved Turkish content enter the route catalogue.
2. The build resolves locale availability for each route.
3. The page renderer produces locale-specific HTML and SEO data.
4. post-build validation checks route, locale, canonical, structured-data, and dependency-host invariants.
5. Vite emits immutable hashed assets plus public HTML documents.
6. Vercel preview serves the build as the target origin.
7. automated smoke tests crawl preview in English and Turkish.
8. production remains unchanged until the release gate is approved.

## 7. Error and Fallback Behavior

- A missing required translation fails the build for navigation, tool controls, metadata, legal links, and other critical UI.
- An optional untranslated editorial route is not emitted under `/tr/`; it is never published as English text with `lang="tr"`.
- An unknown locale returns or redirects to the English route only when the normalized route exists; invalid paths remain 404.
- A dependency import failure produces an explicit localized tool error and never silently reports success.
- duplicate `h1`, canonical, AdSense script, or structured-data entities fail CI.
- invalid JSON-LD fails the structured-data validator.
- redirect loops or chains fail the route audit.
- a sitemap or `hreflang` target that is not 200 fails CI.

## 8. Testing Strategy

### 8.1 Unit Tests

- locale-prefix parsing and normalization;
- English and Turkish canonical URL generation;
- legacy query-to-path redirect generation;
- route locale availability;
- localized tool enhancer component rendering;
- metadata and structured-data language selection;
- preservation of allowlisted query parameters.

### 8.2 Integration Tests

- build emits paired English/Turkish documents for representative home, legal, category, tool, blog hub, and article routes;
- generated HTML is language-correct without running JavaScript;
- English/Turkish alternates are reciprocal and self-referential;
- sitemap entries match final clean URLs;
- robots permits canonical locale paths;
- affected PDF and QR tools contain no blocked executable host references;
- Resume Builder contains exactly one `h1`;
- AdSense head integration has exactly one script and no unsupported attribute.

### 8.3 Browser and Preview Tests

- English and Turkish navigation, language switch, keyboard access, and mobile layout;
- PDF Merge, PDF Split, and QR generation happy paths plus invalid input;
- 404 language correctness and no ad script;
- no CSP violation from application dependencies;
- no mixed-language enhancer UI;
- canonical, `hreflang`, title, description, and JSON-LD inspection on representative routes;
- no redirect chain from legacy URL to final page.

### 8.4 Release Gates

- lint passes with no new errors;
- type checking passes where configured;
- unit and integration tests pass;
- production build passes;
- route, sitemap, robots, i18n, structured-data, dependency, and secret audits pass;
- mobile and desktop preview smoke tests pass;
- Lighthouse regression does not exceed the repository budgets;
- preview crawl reports zero 4xx/5xx canonical or alternate targets;
- all changes are confined to the isolated branch and preview.

## 9. Security and Privacy

- Do not expose or read secret values.
- Do not relax CSP to allow arbitrary CDN execution.
- Do not add client fingerprinting, cross-site tracking, or server-side recent-tool history.
- Continue escaping user-controlled values rendered into HTML.
- Preserve the browser-local task history contract.
- Admin and API surfaces are outside public caching and indexing.
- Security claims must distinguish static client review from unverified account/server controls.

## 10. Rollout and Rollback

1. Create the isolated branch from current `main`.
2. Add failing behavior tests and capture baseline failures.
3. Implement the smallest contract changes task by task.
4. Open a draft PR and require CI plus Vercel preview.
5. Crawl preview and compare with the August 10 baseline.
6. Do not merge or deploy production without the production gate.

Rollback is branch or PR reversion. Redirect changes are kept in a dedicated commit so they can be reverted independently. No database or persistent user-data migration is part of this package.

## 11. Acceptance Criteria

- `/` serves English and `/tr/` serves Turkish with status 200.
- representative Turkish pages contain no unapproved English UI fragments in source HTML.
- legacy `?lang=tr` and `/en/` URLs redirect in one hop to the correct final URL.
- every emitted page has one canonical and one `h1`.
- every emitted alternate resolves and reciprocates.
- sitemap URLs return 200 without redirect.
- robots does not block `/tr/`.
- affected tool dependencies load from the same origin under the current CSP.
- PDF Merge, PDF Split, and QR Designer complete their primary workflow in preview.
- Resume Builder has one `h1`.
- unsupported AdSense attributes are absent and non-content surfaces do not load ads.
- build and all defined release gates pass.
- production remains unchanged until the final release gate.

## 12. Follow-On Packages

After this stabilization package:

1. editorial quality and AdSense readiness, including removal or rewrite of mixed-language and low-value articles;
2. UX, accessibility, performance, and task-journey optimization;
3. deployment ownership, Cloudflare/Vercel simplification, monitoring, dependency upgrades, repository hygiene, and broader security assessment.
