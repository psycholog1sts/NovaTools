# NovaTools Remediation Wave 2 Design

Date: 2026-08-26
Status: approved continuation of the active AdSense remediation program.
Parent program: `docs/adsense-remediation-program-2026-08-25.md`
21st reference plan: `docs/21st-component-port-plan-2026-08-25.md`
Working PR: #211 (`adsense/remediation-wave-1`), intentionally draft and not merge-ready until the gates below are satisfied.

## Goal

Transform NovaTools into a truthful, people-first, professional browser-utility platform by running two coupled workstreams:

1. **UI/UX modernization** using selected 21st.dev interaction/design patterns translated into NovaTools' existing vanilla HTML/CSS/MJS architecture.
2. **Full source-truth certification** so every indexable tool claim matches the real implementation and every misleading/incomplete tool fails closed until repaired.

The governing rule is **truth before aesthetics**. A visually improved route remains ineligible for Search/ads if its functionality or claims are misleading.

## Policy basis

The existing program remains authoritative. Wave 2 adds an explicit misleading-functionality gate based on Google Search spam policy: a site must not lead users to expect functionality that it does not actually provide. Google Publisher Policies also prohibit misleading representation/deceptive claims and Google-served ads on screens with low-value or under-construction content.

Operational interpretation:

- a tool name, title, metadata, CTA, output, chart, status, source label, privacy claim, supported-format claim, algorithm claim, live-data claim, AI claim, or accuracy statement is a product claim;
- each material claim must be backed by source/runtime evidence;
- mock, decorative, synthetic, placeholder, stale-as-live, fake-backend, or non-functional behavior must be removed, explicitly reframed, or classified B;
- B routes must be noindex, absent from sitemap/public discovery, and blocked from AdSense bootstrap.

## Non-negotiable architecture constraints

- Preserve Vite + vanilla HTML/CSS/JS/MJS.
- Do not migrate to React, Next.js, shadcn, Radix, Framer Motion, lucide-react, CVA, clsx, or another UI framework merely to reproduce 21st.dev styling.
- Preserve working tool business logic unless a verified product bug is being fixed.
- Prefer existing `src/components/*` primitives and strengthen them rather than introducing parallel component systems.
- Global UI changes must be token-based and progressively adopted.
- No new external dependency is allowed without a concrete capability that cannot be implemented safely with the current stack.
- No new indexable tool routes are added during certification.

## Work package A — UI/UX modernization

### A1. Selected 21st.dev patterns

The following patterns are the primary references. Exact upstream source must be inspected when available; when only public usage/metadata is available, NovaTools may port only the observed interaction/design concept, never an invented reconstruction.

| Pattern | Why it is selected | NovaTools counterpart |
| --- | --- | --- |
| SaaS/developer hero | Clarifies value proposition and primary actions above the fold without heavy JS | `index.html`, shared hero/card CSS |
| Header/navigation with integrated discovery | Improves findability while preserving existing route/i18n behavior | `src/components/Navbar/`, current header/mobile nav |
| Feature/tool card | Gives consistent scan hierarchy for categories and popular tools | `src/components/Card/`, category/home cards |
| Button/input/form controls | Consistent focus, disabled, error and touch states improve task completion | `src/components/Button/`, `src/components/Form/` |
| Ruixen/advanced file upload pattern | Better file selection state and validation feedback while native input stays authoritative | `src/components/dropzone.mjs` |
| Progress card | Makes real processing state legible and accessible without fabricated percentages | `src/components/loading.mjs` |
| Toast with action | Provides non-blocking result/error feedback with optional safe next action | `src/components/toast.mjs`, `src/components/Toast/Toast.css` |
| Dialog/search modal | Enables keyboard-first tool discovery when current route data can be reused | `src/components/Modal/Modal.css` + existing search data |
| Warning/note/empty state | Makes limitations, no-result conditions and remediation guidance explicit | shared card/trust styles |
| Footer | Improves trust/navigation hierarchy without duplicating content | shared/global footer implementation |

### A2. Design tokens

Create `src/styles/tokens.css` as the canonical shared token layer. Existing styles may temporarily alias old variable names to the new tokens during migration.

Required token families:

- accessible neutral background/surface hierarchy;
- restrained primary/accent colors with WCAG AA text contrast;
- success/warning/error/info semantic colors;
- text primary/secondary/muted;
- borders/focus ring;
- spacing scale;
- radius scale;
- shadow/elevation scale;
- typography size/line-height/weight scale;
- motion duration/easing with `prefers-reduced-motion` override;
- content-width/container tokens.

The visual direction is modern developer/SaaS utility: dark-first but not neon-heavy, restrained gradients, clear white-space, crisp focus states, low-noise surfaces, and meaningful motion only.

### A3. Progressive rollout

1. Shared tokens and compatibility aliases.
2. `index.html` + global navigation/footer.
3. PDF Compressor as the **gold-standard tool page**.
4. High-traffic A routes, 3–5 pages per batch.
5. Remaining A routes category by category.
6. Search modal and higher-risk global interactions only after the stable primitives and navigation are proven.

No category rollout proceeds unless the previous batch passes CI, browser/a11y checks, and source-truth review.

### A4. Gold-standard tool-page contract

PDF Compressor becomes the reusable information/visual architecture, not a prose template. Each adapted tool must retain unique controls and copy.

Required regions when applicable:

- concise task hero;
- factual privacy/network/source badge;
- primary input/workflow card;
- explicit validation/error area;
- honest progress state;
- measurable result/verification card;
- specific limitations note;
- source/timestamp for changing data;
- related next actions that are genuinely task-adjacent;
- author/review/trust information only when truthful and useful.

## Work package B — source-truth certification

### B1. Evidence record per tool

For every tool in finance, social, design, productivity, image, text, converters, and then remaining categories, capture:

1. three material public technical/product claims;
2. source file(s) and function(s) that prove/disprove each claim;
3. external provider/library/algorithm evidence when applicable;
4. runtime/network/privacy boundary;
5. actual input/output behavior and failure modes;
6. classification A/B/C;
7. exact treatment.

Certification evidence must live in a machine-readable inventory or deterministic audit artifact so the process is repeatable rather than conversational memory.

### B2. Misleading-functionality scan

Search code and public HTML for indicators including:

- `mock`, `placeholder`, `TODO`, `fake`, `demo`, `sample`, `simulate`, `random`;
- hard-coded current/market/news/weather/religious/financial values presented as live/current;
- deterministic/synthetic chart series presented as historical data;
- unconfigured form/action/backend endpoints;
- generated URLs that are not resolvable services;
- unsupported AI/ML claims;
- unsupported algorithm/library/provider claims;
- absolute privacy/security/accuracy guarantees;
- output generated without the advertised transformation.

Every candidate is manually verified before classification; string matches alone never auto-condemn a route.

### B3. Live Exchange decision

`/tools/finance/live-exchange/` is an A route requiring correction, not B, because the primary conversion works and `/api/live-data` obtains USD/EUR reference values from `https://www.tcmb.gov.tr/kurlar/today.xml` and returns `provider: 'tcmb.gov.tr'`.

The current seven-point chart is not historical data; it is generated from the current rate through `deterministicSeries(rate, 1.2, 7)`. Wave 2 must:

- remove that synthetic chart from the Live Exchange result;
- remove all public wording that calls it a recent/historical trend;
- keep source/provider and fetched timestamp visible;
- describe fallback behavior accurately: client cache first, then static approximate fallback only when no numeric rate is available;
- never label static fallback as TCMB/current/live;
- preserve the existing conversion calculation and provider endpoint.

Do not add a historical-rate service merely to keep a chart.

## Cross-workstream protocol

### Double validation per touched route

A route is changed only when both are true in the same batch:

- UI behavior is regression-tested;
- public copy/metadata is source-verified.

### Test-first behavior changes

Behavioral bug fixes and shared-component behavior changes use red→green tests before production code. Pure documentation and CSS-token configuration do not require artificial unit tests, but browser/a11y/visual regression checks remain mandatory for UI changes.

### CI and deployment safety

- PR #211 stays draft.
- Production is not modified from this work until the branch is explicitly merge-ready.
- Every stable batch must pass lint, tests, build, production-output contract, browser E2E, accessibility, sitemap/public-route audits, security audit and Release Readiness where applicable.
- A failing batch is fixed before beginning the next batch.
- No AdSense re-review is requested while any known material source-truth mismatch remains.

## Visual regression strategy

Existing functional E2E/a11y gates remain mandatory. Wave 2 will add deterministic screenshot coverage for the small set of global/gold-standard surfaces before broad rollout:

- homepage desktop/mobile;
- global header/nav open/closed states;
- PDF Compressor idle/file-selected/result states where fixture-safe;
- one representative form-only tool;
- one representative file tool.

Screenshots must use fixed viewport, reduced motion, stable theme and deterministic fixture state. Visual tests protect layout; they do not replace semantic/accessibility tests.

## Batch order

### Batch 0 — program + truth blocker

- persist this spec and two implementation plans;
- fix Live Exchange synthetic trend/copy with regression tests;
- add/extend truth audit to prevent the claim from returning.

### Batch 1 — design-system foundation

- add `src/styles/tokens.css`;
- map existing design-system variables to the new tokens without breaking routes;
- modernize shared Button/Form/Card/Toast/Modal states only where regression-safe;
- create baseline screenshot harness if one does not already exist.

### Batch 2 — homepage/navigation

- modernize homepage hero, category/tool cards, header and footer;
- verify all public claims against actual inventory/privacy behavior;
- preserve canonical navigation and i18n contracts.

### Batch 3 — PDF Compressor gold standard

- source-audit PDF Compressor end to end;
- modernize UI with the shared primitives;
- add deterministic browser/visual tests;
- use it as the tool-page reference only after all gates pass.

### Batch 4+ — 3–5 route category waves

Priority: high-traffic/high-policy-risk finance → image/file flows → converters → productivity → social → design → text → remaining categories.

After every 3–5 routes, record:

- routes modernized;
- claims verified/corrected;
- new B routes;
- CI state.

## Definition of done

Wave 2 is not complete until:

- every indexable tool has a source-truth evidence record;
- every known misleading/non-functional route is repaired or fail-closed;
- all A/C routes use truthful metadata/visible copy;
- homepage/navigation and the tool-page system use the new shared tokens/primitives;
- selected A routes have been migrated category-by-category without functional regressions;
- representative visual regression tests exist for global/gold-standard surfaces;
- all required CI gates are green on the final head;
- production is deployed from the reviewed commit and rechecked;
- the parent program's <5% residual-risk AdSense review gate can be defended with evidence.
