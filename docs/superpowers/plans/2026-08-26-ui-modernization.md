# UI Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Modernize NovaTools into a restrained, accessible developer/SaaS utility interface using 21st.dev interaction/design patterns translated into the existing vanilla HTML/CSS/MJS architecture.

**Architecture:** Introduce a canonical token layer, harden existing shared primitives, then roll the visual system out progressively: homepage/navigation → PDF Compressor gold standard → 3–5 route category batches. No framework migration and no duplicated component systems.

**Tech Stack:** CSS custom properties, vanilla HTML/CSS/JS/MJS, Vite, existing NovaTools components, Chromium E2E/a11y/Lighthouse/route gates.

**Spec:** `docs/superpowers/specs/2026-08-26-novatools-remediation-wave-2-design.md`

## Global Constraints

- No React, Next.js, shadcn, Radix, Framer Motion, lucide-react, CVA or clsx merely for UI.
- Existing business logic and native controls remain authoritative.
- Every touched route must be source-truth reviewed in the same batch.
- WCAG AA text contrast and visible keyboard focus are required.
- Motion must respect `prefers-reduced-motion`.
- No fake progress, fake social proof, fake ratings, fake urgency or unsupported claims.
- Each rollout batch must finish with green CI and browser/a11y verification.

---

### Task 1: Create the canonical token layer

**Files:**
- Create: `src/styles/tokens.css`
- Modify: `src/styles/design-system.css`
- Modify: `src/styles/critical.css` only for compatibility/import order when required
- Add/modify: CSS/design-system contract test in the existing tests directory

**Interfaces:**
- Produces canonical CSS variables consumed by all later UI work.

- [ ] **Step 1: Add a failing token-contract test**

Assert that `src/styles/tokens.css` exists and defines at minimum:

```css
--color-bg-canvas
--color-bg-surface
--color-bg-elevated
--color-text-primary
--color-text-secondary
--color-border
--color-primary
--color-focus-ring
--color-success
--color-warning
--color-error
--space-1
--space-2
--space-3
--space-4
--space-6
--space-8
--radius-sm
--radius-md
--radius-lg
--shadow-sm
--shadow-lg
--duration-fast
--duration-normal
```

Also assert that `design-system.css` imports/aliases the token layer rather than redefining conflicting primary values.

- [ ] **Step 2: Verify RED**

Run the focused test; expected failure because `tokens.css` does not exist yet.

- [ ] **Step 3: Implement restrained AA-safe tokens**

Use a dark-first neutral palette with high-contrast text, a restrained blue/violet primary accent, semantic success/warning/error colors, and a single clear focus ring. Avoid neon-on-black as the dominant visual language.

- [ ] **Step 4: Add compatibility aliases**

Map legacy variables such as existing surface/text/border/primary names to the new canonical variables so untouched routes continue to render.

- [ ] **Step 5: Add reduced-motion global behavior**

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    scroll-behavior: auto !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

Apply narrowly enough not to hide state changes.

- [ ] **Step 6: Verify GREEN and build**

Run token contract, lint, tests and build; spot-check representative untouched routes through existing browser gates.

- [ ] **Step 7: Commit**

```text
ui: add canonical design tokens
```

---

### Task 2: Harden shared Button/Form/Card/Toast/Modal primitives

**Files:**
- Modify: `src/components/Button/**`
- Modify: `src/components/Form/**`
- Modify: `src/components/Card/**`
- Modify: `src/components/toast.mjs`
- Modify: `src/components/Toast/Toast.css`
- Modify: `src/components/Modal/Modal.css`
- Add/modify focused component tests/E2E fixtures

**Interfaces:**
- Consumes Task 1 tokens.
- Produces consistent focus/hover/disabled/error/success/elevation states without changing tool APIs.

- [ ] **Step 1: Add failing interaction/a11y tests for touched behavior**

Require:

- visible `:focus-visible` treatment;
- 44px minimum actionable close/button target where applicable;
- toast live-region semantics and no inline `onclick` close handler after refactor;
- modal/dialog labels/focus behavior only if a JS modal controller is touched;
- disabled/error states not conveyed by color alone.

- [ ] **Step 2: Verify RED**
- [ ] **Step 3: Implement minimal token-based visual states**
- [ ] **Step 4: Refactor toast DOM creation to safe event listeners when touched**
- [ ] **Step 5: Keep existing public component APIs stable**
- [ ] **Step 6: Verify targeted tests, full tests, lint, build and browser a11y**
- [ ] **Step 7: Commit**

```text
ui: modernize shared interaction primitives
```

---

### Task 3: Modernize homepage hero, tool discovery cards, header and footer

**Files:**
- Modify: `index.html`
- Modify: shared/global header/footer modules/styles actually used by the homepage
- Modify: Navbar/Card/Button styles from Task 2 only as needed
- Add/modify homepage E2E/a11y/visual tests

**Interfaces:**
- Consumes Tasks 1–2.
- Produces a modern homepage/navigation surface without altering canonical routes or i18n contracts.

- [ ] **Step 1: Extract and source-verify homepage product claims**

Every hero/subhead/privacy statement must match the actual product: browser-local where true, external/live-data requests disclosed where relevant. Do not state that every tool is fully local.

- [ ] **Step 2: Add failing homepage regression assertions**

Test heading hierarchy, primary CTA destinations, navigation keyboard access, mobile nav toggling, and no unsupported absolute privacy claim.

- [ ] **Step 3: Verify RED for the intended changed contract**
- [ ] **Step 4: Implement the 21st-inspired developer/SaaS hero**

Use:

- one specific H1;
- short evidence-led subtitle;
- primary CTA to tool/category discovery;
- secondary CTA to categories/about only when useful;
- factual trust chips such as browser processing, source timestamps, or no-account use only when globally true/qualified.

Do not use fake user counts, ratings or customer logos.

- [ ] **Step 5: Modernize cards/navigation/footer with token primitives**

Preserve existing destination URLs, canonical paths, mobile menu semantics and language behavior.

- [ ] **Step 6: Add deterministic visual snapshots**

Fixed desktop/mobile viewport, dark theme, reduced motion, stable content state.

- [ ] **Step 7: Run full CI-equivalent gates**

Lint, tests, build, browser E2E, accessibility, public route and performance/Lighthouse gates.

- [ ] **Step 8: Commit**

```text
ui: modernize homepage and navigation
```

---

### Task 4: Build PDF Compressor gold-standard tool UI

**Files:**
- Modify: the canonical PDF Compressor HTML/MJS/CSS files discovered in the repo
- Modify: `src/components/dropzone.mjs` only if the gold-standard workflow requires a verified reusable enhancement
- Modify: `src/components/loading.mjs` only if real progress semantics can be improved without fabrication
- Add/modify: PDF Compressor focused tests and E2E/visual snapshots

**Interfaces:**
- Produces the approved information/interaction architecture for later A-route migrations.

- [ ] **Step 1: Complete a source-truth audit of PDF Compressor before visual edits**

Verify library/algorithm, supported inputs, actual compression behavior, output format, browser/network boundary, file limits, measurable result data and known non-compressible cases.

- [ ] **Step 2: Add failing tests for any corrected behavior/copy contract**
- [ ] **Step 3: Verify RED where behavior changes are required**
- [ ] **Step 4: Implement gold-standard regions**

Task hero, factual privacy badge, input/dropzone, validation, honest processing state, result verification, limitations note, related next action.

- [ ] **Step 5: Port 21st file-upload/progress visual ideas without moving away from native input or inventing progress**
- [ ] **Step 6: Add desktop/mobile/keyboard/result-state visual snapshots**
- [ ] **Step 7: Run PDF tests + full CI/a11y/build/performance gates**
- [ ] **Step 8: Commit**

```text
ui: establish PDF compressor gold standard
```

---

### Task 5: Roll out 3–5 A routes per category batch

**Files:**
- Modify only the 3–5 selected route files plus shared primitives proven necessary.
- Update source-truth certification records in the same commit/batch.

**Interfaces:**
- Consumes PDF Compressor visual architecture without copying tool-specific prose/controls.
- Produces progressively consistent A/C routes.

- [ ] **Step 1: Select 3–5 verified A routes**
- [ ] **Step 2: Complete source-truth evidence for all selected routes first**
- [ ] **Step 3: Add behavior/regression tests for any bug/copy contract being changed**
- [ ] **Step 4: Apply tokens/shared primitives while preserving unique inputs/outputs**
- [ ] **Step 5: Verify dropzone/buttons/results/keyboard/mobile states**
- [ ] **Step 6: Run full CI/a11y/build/route gates**
- [ ] **Step 7: Record short batch report in the certification artifact/changelog**
- [ ] **Step 8: Commit using category batch naming**

```text
ui: modernize <category> batch <n>
```

Recommended order: finance → image/file → converters → productivity → social → design → text → remaining categories.

---

### Task 6: Add search modal only after stable global UI

**Files:**
- Modify/create the existing search module identified during implementation
- Modify: `src/components/Modal/Modal.css`
- Modify: Navbar trigger slot only after search is independently working
- Add keyboard E2E tests

**Interfaces:**
- Reuses the existing public tool/route dataset; no second route database.

- [ ] **Step 1: Write failing keyboard/dialog tests**

Require Ctrl/Cmd+K trigger, Escape close, intentional initial focus, arrow navigation, Enter activation, labelled dialog, focus restoration and no route duplication.

- [ ] **Step 2: Verify RED**
- [ ] **Step 3: Implement vanilla search modal with current route data**
- [ ] **Step 4: Add trigger to existing header without replacing the header architecture**
- [ ] **Step 5: Verify browser/a11y/performance and reduced-motion behavior**
- [ ] **Step 6: Commit**

```text
ui: add keyboard tool search
```

---

### Task 7: UI rollout completion gate

- [ ] **Step 1: Verify no framework/dependency inflation in package manifest/lockfile**
- [ ] **Step 2: Verify all migrated routes have matching source-truth certification records**
- [ ] **Step 3: Verify homepage/global/PDF representative visual snapshots are stable**
- [ ] **Step 4: Run final lint/test/build/E2E/a11y/sitemap/public-route/security/Release Readiness gates**
- [ ] **Step 5: Compare performance against pre-Wave-2 baseline and fix material regressions before merge**
- [ ] **Step 6: Keep PR draft until source-truth and UI gates are simultaneously satisfied**
