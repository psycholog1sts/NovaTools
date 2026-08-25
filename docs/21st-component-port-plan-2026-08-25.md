# 21st.dev → NovaTools Port Plan

Date: 2026-08-25
Architecture constraint: preserve NovaTools Vite + vanilla JS/MJS + CSS. No React/ReactDOM/Next.js/shadcn migration.

## Porting policy

21st.dev is a design/interaction reference, not a framework migration source.

For each candidate:

1. inspect the supplied 21st page and exposed Usage/Component information;
2. record external dependencies and UI anatomy;
3. find the existing NovaTools equivalent first;
4. preserve NovaTools business logic;
5. port only the interaction/visual behavior that adds user value;
6. translate React state/events to vanilla JS only when needed;
7. translate Tailwind/component styling to NovaTools design-system tokens;
8. replace decorative Framer Motion with CSS transitions/keyframes or omit it;
9. use existing SVG/icon approach rather than `lucide-react`;
10. use existing Modal/Button/Form/Card/Toast primitives rather than Radix/shadcn when equivalent accessible behavior can be provided;
11. run lint/test/build and relevant browser/a11y/performance checks;
12. reject the component when dependency/performance/product-truth cost exceeds its value.

**Source-truth rule:** when the crawler exposes Usage and dependency information but not the full `Component.tsx`, this plan records only what is visible. Unseen source is never reconstructed as if it had been inspected. A future exact-copy request must first obtain the full official source through an available 21st registry/CLI/MCP surface.

## Existing NovaTools primitives found

- `src/components/dropzone.mjs` — drag/drop + native file input, MIME/size validation, multiple/single mode, `onDrop`, `onError`.
- `src/components/loading.mjs` — loading overlays, button loading and progress bars.
- `src/components/toast.mjs` + `src/components/Toast/Toast.css` — shared toast manager and token-based toast styles.
- `src/components/Modal/Modal.css` — existing modal/search-modal overlay/dialog styles and 44px close target.
- `src/components/Button/`, `Card/`, `Form/`, `Navbar/` — existing design-system component counterparts.

The existence of these primitives is a strong reason **not** to install React/Radix/lucide/Framer dependencies.

## Candidate matrix

| # | 21st component | Source visibility / upstream traits | Existing NovaTools counterpart | Likely files changed | Business logic that must remain | Adopt | Discard | New dependency | Performance | Accessibility | Risk | Order |
|---|---|---|---|---|---|---|---|---|---|---|---|---:|
| 1 | Ruixen `file-upload/default` | Page/usage describe React client uploader built around `useFileUpload`; drag/drop/browse, file validation/list/preview/search/sort. `lucide-react` visible. Full component source not exposed by current crawler. | `src/components/dropzone.mjs`, file-tool native inputs, existing Form/Card CSS | `dropzone.mjs`, shared CSS only after route sample is selected | Actual file selection, type/size rules, tool-specific parser/processor and output callbacks | Better file summary, visible validation, keyboard-equivalent browse, optional removable selected-file row | React hooks, lucide, generic file search/sort where not useful | No | Native input must remain reachable; errors tied to control; drag-drop cannot be the only path | Medium | 7 |
| 2 | `uniquesonu/advanced-file-upload` | Page description exposes React `useState/useRef/useCallback`, controlled file input, drag/drop, type/size validation, IDs, previews/remove and preview URL cleanup. Full source not exposed. | `dropzone.mjs` | same as #1; possibly tool-local preview code | Tool acceptance rules and all processing remain untouched | Preview lifecycle discipline, remove action, clearer selected-file state | React state/ref/callback scaffolding | No | Neutral/slight improvement if object URLs are revoked | Remove buttons named per file; errors announced; focus not lost | Medium | 8 |
| 3 | `kavikatiyar/progress-card/default` | Usage exposes `UploadProgressCard` with filename/size/progress/status/cancel; upstream demo simulates progress using React state/effect; deps include `lucide-react`, `framer-motion`, `class-variance-authority`. | `src/components/loading.mjs` | `loading.mjs` + token CSS; later selected processing routes | Only real progress/events from current processing logic | File/result identity, actual percentage/status/cancel when the underlying task really supports cancellation | Simulated/random progress, React, Framer Motion, CVA, lucide | No | Better if CSS only and no simulation timers | `role=progressbar` or native `<progress>`, value text, reduced motion, status text not color-only | Low-Medium | **3** |
| 4 | `reui/stepper/inline-title` | Usage exposes compound Stepper API and completed/current/loading visual states with lucide icons. | Existing form/card/button patterns; no need for framework primitive | New tiny CSS/JS helper only when an actual multi-step workflow is selected | Existing multi-step business rules/navigation | Ordered step semantics, current/completed state, inline title | React compound component API and lucide | No | Tiny | ordered list; `aria-current="step"`; status text/icons redundant | Medium | 9 |
| 5 | `sshahaider/search-modal` | Usage exposes `SearchModal`, categorized `CommandItem[]`, trigger and lucide icons. 21st guidance describes Cmd/Ctrl+K, Escape, arrows, Enter, `aria-activedescendant`, focus return. Full component source not exposed by crawler. | `Modal.css`, existing site search/discovery data; existing Navbar styles | search module + modal CSS only after current search source is mapped | Current route/tool inventory and navigation URLs | Keyboard command palette behavior, category grouping, query filtering, focus restoration | React, lucide, any duplicated route database | No | Keep dataset small/lazy; no large search library | dialog labelling, focus trap, Escape, arrow navigation, active descendant, focus restoration | Medium | 10 |
| 6 | `@sshahaider/header-with-search` | Usage/reference shows header integrated with search modal/mobile drawer; `lucide-react`. Full component internals not exposed. | Current production header/Navbar and mobile navigation | Prefer **no replacement**; possibly only trigger slot after #5 | Canonical navigation/i18n/mobile behavior | Only search-trigger ideas that fit current header | Full header replacement, React/mobile drawer rewrite | No | Full replacement creates CLS/CWV/regression risk | Existing nav landmarks/labels must be preserved | High | **Last / likely reject** |
| 7 | `shugar/toast/with-a-link` | Usage exposes `useToasts().message` with text containing an action link; upstream dependency shows `clsx`. | `src/components/toast.mjs`, `src/components/Toast/Toast.css` | those two files | Existing toast API and app-error integration | Optional safe action `{label, href}` / callback, token CSS, non-blocking feedback | React hook, Next Link/JSX, clsx, inline `onclick` | No | Improvement: remove large inline-style generation; no framework | live region, severity-aware announcement, 44px close, no focus steal, pause/usable action | Low | **2** |
| 8 | `shugar/note/warning` | Usage exposes warning Note, optional action/fill/link; dependency `clsx`. | Card/alert/trust sections and design-system tokens | small shared CSS/markup helper if repeated use is proven | None | Semantic warning/callout for tool-specific limitation/safety facts | React/clsx; `role=alert` for static informational copy | No | Negligible | normal semantic section for static warning; reserve `alert` for dynamic urgent errors | Very low | **1** |
| 9 | `sshahaider/dialog` | Upstream uses Radix dialog primitives, lucide and responsive/blurred overlay. | `src/components/Modal/Modal.css`; existing modal patterns | existing modal CSS + a tiny vanilla controller only if current JS behavior lacks focus management | Current modal actions/business flows | backdrop/layout ideas, labelled title/description, reliable focus lifecycle | `@radix-ui/react-dialog`, React, lucide | No | Avoids significant dependency cost | labelled dialog, initial focus, trap/inert behavior, Escape, restore trigger focus, non-pointer-only close | Medium | 11 |
| 10 | `serafim/empty-state` | Usage exposes title, description, icon list and optional action. `lucide-react` upstream. | Card/Button/token system and route-specific empty/result states | shared CSS/markup helper or direct route markup | Existing empty-data decision logic | concise reason + next valid action + optional illustration using existing SVG | React/lucide, decorative complexity | No | Negligible | heading hierarchy; action is real button/link; `role=status` only for dynamic state | Very low | **4** |
| 11 | `tailark/pricing/pricing-plans` | Exposed usage uses React/Next `Link`, lucide Check and shadcn Card/Button with example Free/Pro plans. | Existing `/pricing/` and billing sandbox contracts | **None in current remediation** | Existing fail-closed billing truth; no live checkout claims | Later: spacing/comparison ideas only after live plan/entitlement truth is verified | Example prices/features, Next/React/shadcn/lucide, fake checkout CTA | No | Avoid unnecessary bundle growth | standard heading/list/table/button semantics | **High policy/product risk** | **Hold** |
| 12 | `ruixen.ui/comparison-table` | Page describes row comparison with per-row Compare/Remove state and shadcn-style UI. Full source/dependency detail not exposed by current crawler. | native tables/cards in finance/category surfaces | route-specific HTML/CSS/JS if a genuine comparison task exists | Real comparison data/calculations | semantic side-by-side comparison and explicit row actions | React/shadcn assumptions, decorative state not backed by data | No | Small if native table, responsive overflow | real `<table>` headers/captions; buttons named; mobile horizontal-scroll affordance | Medium | 12 |

## Recommended implementation order

### Wave UI-1 — low risk and independent

1. **Warning Note** — only where a specific limitation already exists and deserves better visibility.
2. **Toast with Link** — enhance the existing ToastManager instead of adding a second toast system.
3. **Progress Card semantics** — enhance `LoadingManager.createProgress()` with real ARIA/native progress semantics; never simulate progress.
4. **Empty State** — introduce only in a real no-input/no-result flow.

These four can deliver product clarity without changing tool business logic.

### Wave UI-2 — workflow components

5. file upload visual enhancement and advanced-file-upload lifecycle improvements, based on the existing `DropZone`;
6. Stepper only for an actual existing multi-step workflow;
7. Search Modal, then optionally a search trigger in the existing header.

### Wave UI-3 — defer/high risk

- Dialog hardening only if existing focus behavior is proven insufficient.
- Comparison Table only with real comparison data.
- Pricing Plans is blocked until product/billing truth is live and independently verified.
- Header replacement is rejected by default because the current header is part of route/i18n/CWV stability.

## Exact implementation requirements

### File upload

- Native `<input type="file">` remains the source of truth and keyboard fallback.
- No upload is moved server-side.
- Existing tool accept/size/parser rules remain authoritative.
- Object URL previews must be revoked when removed/replaced.
- Error message identifies file and exact reason.
- Do not add a generic feature (search/sort/multiselect) unless the selected tool genuinely benefits.

### Progress

- Never generate fake/random progress for real processing.
- If only indeterminate progress is technically knowable, show an honest indeterminate state instead of fabricated percentages.
- Prefer native `<progress>` or `role="progressbar"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`.
- Preserve `prefers-reduced-motion`.

### Toast

- Replace inline `onclick` close wiring with an event listener when touched.
- Use a live region (`status`/polite for normal success/info; assertive only for errors that require immediate attention).
- Optional link/action must be created safely without interpolating untrusted HTML.
- Toast must not steal focus; keyboard users must be able to reach any actionable link.

### Modal/search

- `Escape` closes.
- focus enters the dialog intentionally and returns to the trigger.
- Tab is contained while modal is active or background is inert.
- search list keyboard navigation and selected item are announced.
- no new search framework; use the current public tool/route data.

## Validation checklist per component PR

- [ ] Upstream behavior actually inspected from available official source/usage; unseen source not guessed.
- [ ] Existing NovaTools counterpart inspected first.
- [ ] No React/Next/Radix/shadcn/lucide/Framer/CVA/clsx dependency added merely for UI.
- [ ] Business logic unchanged unless the PR explicitly fixes a verified product bug.
- [ ] Browser-only/privacy boundary unchanged.
- [ ] Desktop behavior checked.
- [ ] Mobile behavior checked.
- [ ] Keyboard behavior checked.
- [ ] Accessible name/role/state checked.
- [ ] Reduced-motion behavior checked when animation exists.
- [ ] `npm run lint` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` passes.
- [ ] touched route smoke test passes.
- [ ] Lighthouse/performance regression checked for header/search or other globally loaded changes.

## Decision principle

A 21st component is accepted only when it improves task completion, error prevention, result verification or accessibility. Decorative similarity alone is not sufficient reason to add code.
