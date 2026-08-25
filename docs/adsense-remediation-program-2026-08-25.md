# NovaTools AdSense Remediation Program

Date: 2026-08-25
Status: active; do not request a new AdSense review until the final gate is satisfied.

## Purpose

This program exists to correct the product/content quality profile that can cause a Google AdSense **low-value content** rejection. It is not an SEO word-count exercise and must never be used to make a check pass while leaving the underlying user-facing problem unchanged.

The public product must satisfy all three at the same time:

1. the tool actually performs the job it claims to perform;
2. the page explains that real behavior, inputs, outputs, limitations, privacy boundary, and verification steps accurately;
3. only pages that meet that standard are indexable and eligible for advertising.

## Official Google policy basis

Primary sources used by this program:

- Google Publisher Policies — inventory value, low-value screens, replicated content, deceptive representations: https://support.google.com/publisherpolicies/answer/10502938
- Google Search people-first content guidance — original value, satisfying experience, clear focus, Who/How/Why; explicitly no preferred word count: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google Search spam policies — misleading functionality and scaled content abuse: https://developers.google.com/search/docs/essentials/spam-policies
- AdSense program policies: https://support.google.com/adsense/answer/48182

Policy interpretation rule: internal checks are implementation aids, not substitutes for Google policy. If a check conflicts with the real user-facing product, fix the product or the check transparently; never hide the behavior from the check.

## Non-negotiable six-test gate

Every indexable tool must pass all six tests.

### 1. Functional truth

The tool performs the primary job described by its name, title, metadata, UI and explanatory content. Placeholder data, decorative output or a fake backend does not pass.

### 2. Unique utility

The route allows a user to complete a concrete task or make a better decision. A page whose only value is generic explanatory copy does not qualify as a tool page.

### 3. Tool-specific content

Explanatory copy must be derived from this tool's actual implementation. If a sentence can be copied unchanged to an unrelated tool, it is a candidate for removal or rewriting.

### 4. Implementation evidence

Claims about processing, algorithms, libraries, data sources, precision, supported formats and network behavior must have a corresponding implementation or authoritative source.

### 5. Explicit limitations and privacy boundary

The page must explain material failure modes and whether work is local, third-party network based, or NovaTools-server based. Generic "privacy-first" wording is not sufficient when a route makes network requests.

### 6. No filler or unsupported claims

No off-topic SEO article, generic file-upload boilerplate, fake rating, fake urgency, unverifiable superlative or unsupported guarantee may be used to increase apparent content volume.

## Classification

### A — Salvageable

The tool is functional but its content, claims, related links or trust explanation are weak/mismatched.

Action: rewrite only from implementation evidence; preserve working business logic.

### B — Not currently publishable as an indexable tool

The tool does not perform its advertised job, depends on placeholder/mock behavior, or cannot meet the accuracy requirement for its subject matter.

Action: fail closed. Remove from sitemap/discovery/advertising and apply noindex until repaired or retire it. Do not mask the problem with copy.

### C — Certified clean

The tool implementation and public explanation pass all six tests and representative browser QA.

Action: preserve; use as a reference. Certification is per current implementation, not permanent.

## Current high-confidence classifications

| Route | Class | Evidence | Current action |
| --- | --- | --- | --- |
| `/tools/social/url-shortener/` | B | Client code generates a decorative `novalink.co/<code>` value; no redirect service exists. | Noindex, sitemap exclusion, ads blocked, public manifest disabled until a real redirect service exists or route is retired. |
| `/tools/news/summarizer/` | B | Source contains `News API Placeholder`, TODO API integration, hard-coded `mockNews` and static trending counts while UI presents news/AI summary behavior. | Noindex, sitemap exclusion and ads blocked until it uses a truthful, licensed/source-attributed product implementation. |
| `/tools/religious/islamic-calendar/` | B-temporary | Calendar engine contains approximate/hard-coded 2026 religious dates and a simplified arithmetic Hijri conversion. | Noindex, sitemap exclusion and ads blocked until authoritative date sourcing/algorithm, regional caveats and QA are implemented. |
| `/tools/request/` | B/legacy duplicate | Form posts to `formspree.io/f/YOUR_FORM_ID` and has an invalid legacy `_next` host. | 301 to the honest `/request-tool.html` mailto-draft workflow. |
| `/request-tool.html` | A/C candidate | Explicitly says there is no backend and opens a prefilled email draft. | Keep indexed; validate links, accessibility and copy. |
| #209 group | A | 66 tool pages were identified with a mismatched generic file-workflow description. | 63 rewrites carried into remediation branch; remaining risky routes are handled fail-closed rather than filled with invented copy. |
| PDF Compressor | A+ reference core | Implementation-specific explanation of pdf-lib/object-stream behavior and limitations is materially stronger than the old generic pattern. | Preserve the evidence-led core; separately remove any unsupported absolute claims/duplicate legacy blocks found during inventory. |

No page is called C solely because an automated audit passes.

## Layer 1 — discovery and inventory

For every public/indexable URL, capture:

- canonical route and sitemap presence;
- title, meta description, robots directive and structured-data type;
- visible H1/H2/H3 and user-facing explanatory sections;
- actual input controls and output behavior;
- implementation file(s), functions and libraries;
- external requests/data sources;
- supported formats/precision/ranges;
- failure modes and browser limits;
- privacy boundary;
- related-tool links;
- advertising eligibility;
- mismatches between public claim and implementation.

Evidence hierarchy:

1. actual source/runtime behavior;
2. live/preview page;
3. authoritative external source when the tool relies on external facts/data.

At least three evidence surfaces should be used for a material policy diagnosis when available: implementation, rendered/public behavior, and relevant official policy/data source.

## Layer 2 — diagnosis and treatment

For every inventoried page:

1. classify A/B/C;
2. record the exact failing six-test items;
3. select the smallest reversible treatment;
4. do not redesign or add dependencies merely to improve appearance;
5. if B, remove it from Search/ads before attempting feature work;
6. if A, rewrite from implementation evidence, not a generic template;
7. if C, avoid unnecessary edits.

### Golden content architecture for A pages

This is an information architecture, **not a reusable prose template**:

- honest one-line task statement;
- exact inputs;
- exact processing method/implementation fact that matters to the user;
- exact outputs;
- material limitations/failure modes;
- privacy/network boundary;
- tool-specific use steps or worked example only when useful;
- how to verify the result;
- genuinely related next tools/workflows.

A section should be omitted when it adds no user value. No minimum word count applies.

## Layer 3 — implementation and self-validation

Before an A page is eligible to remain indexable:

- [ ] Functional truth verified from code/runtime.
- [ ] Copy reviewed against implementation.
- [ ] No cross-tool generic boilerplate remains.
- [ ] No unsupported absolute/superlative claim remains.
- [ ] Limitations are visible and specific.
- [ ] Privacy/network statement is correct.
- [ ] Related links are task-adjacent.
- [ ] Canonical/robots/sitemap agree.
- [ ] Advertising eligibility agrees with product state.
- [ ] Desktop/mobile/keyboard/browser smoke test passes.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] `npm run audit:adsense` passes.
- [ ] public-route/sitemap/a11y gates pass when relevant.

## Automated quality gates

The AdSense audit intentionally does **not** enforce an arbitrary minimum word count.

It does enforce/should continue to enforce:

- unresolved public placeholders;
- duplicate top-level page headings where they are real DOM content;
- known generic cross-tool boilerplate fingerprints;
- non-indexable B routes excluded from sitemap;
- non-indexable B routes protected by Cloudflare `X-Robots-Tag`;
- B routes excluded from AdSense bootstrap;
- legacy broken request route redirected to the honest canonical workflow;
- fabricated/example AdSense slot IDs rejected;
- ad experience/security/CMP contracts.

Future gates should add evidence-backed duplicate-content similarity and unsupported-claim detection carefully. They must report real problems and must not become a gameable proxy for quality.

## Original-value roadmap

Do not create many new indexable routes while the existing inventory is not certified. Increase product value inside strong existing tools first.

Preferred additions when justified by the tool implementation:

1. **Input preflight** — show real file type, size, dimensions/page count/metadata/browser compatibility before processing.
2. **Result verification card** — show measurable before/after facts and what changed or did not change.
3. **Local-processing receipt** — copyable factual summary of processing location and output characteristics; no tracking required.
4. **Context-specific limitations** — JPEG limitations on image tools, precision/rounding on calculators, rate source/timestamp on market tools, etc.
5. **Source + timestamp** — mandatory for changing finance/current-data tools.

These features should use existing browser-local logic and shared components where possible.

## Re-review gate

Do **not** click AdSense "request review" merely because CI is green.

A re-review is allowed only after:

- all known B pages are noindex/retired or truly repaired;
- all indexable tool pages pass the six-test inventory;
- representative manual QA has been completed across every category;
- production (not only preview) reflects the approved commit;
- production sitemap/robots/canonicals have been rechecked;
- Search Console recrawl/index inspection has been performed for representative changed URLs;
- stale generic snippets are no longer the dominant Google-visible representation;
- the residual low-value-content rejection risk is judged below 5% based on observable evidence, not optimism.

If that final risk cannot be defended, repeat the inventory/remediation loop instead of resubmitting.
