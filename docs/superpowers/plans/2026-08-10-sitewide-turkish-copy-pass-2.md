# Site-wide Turkish Copy Pass 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove English copy generated at runtime on Turkish homepage and tool pages without changing tool behavior.

**Architecture:** Keep the existing i18n runtime and rendering architecture. Add translation keys to the English and Turkish public bundles for homepage dynamic cards, make `src/main.js` render those keys, and give the late-running tool-page enhancer a small language-aware copy dictionary because it executes after the page-wide i18n pass.

**Tech Stack:** Vanilla JavaScript, static HTML, JSON locale bundles, Node.js regression tests, GitHub Actions.

## Global Constraints

- Preserve existing routes and tool calculations.
- Add no framework, service, or runtime dependency.
- English remains the default language; Turkish is selected through `?lang=tr` or saved preference.
- Only copy generation and regression coverage change in this pass.
- The full `npm run ci:validate` gate must pass before merge.

---

### Task 1: Add failing regression coverage

**Files:**
- Modify: `tests/site-regressions.mjs`
- Test: `tests/site-regressions.mjs`

**Interfaces:**
- Consumes: `src/main.js`, `src/js/tool-page-enhancer.js`, `public/locales/en/translation.json`, `public/locales/tr/translation.json`
- Produces: regression assertions for dynamic homepage keys and language-aware tool-enhancer copy.

- [ ] **Step 1: Write failing assertions**

Add assertions requiring homepage category-link and blog-card keys in both locale bundles. Add assertions requiring `tool-page-enhancer.js` to select Turkish copy from `document.documentElement.lang` and to avoid emitting the known English professional-layer sentences directly in Turkish mode.

- [ ] **Step 2: Verify RED**

Run: `npm run test:site-regressions`

Expected: FAIL because the new homepage keys and the tool-enhancer locale dictionary do not exist.

### Task 2: Localize homepage dynamic cards

**Files:**
- Modify: `src/main.js`
- Modify: `public/locales/en/translation.json`
- Modify: `public/locales/tr/translation.json`
- Test: `tests/site-regressions.mjs`

**Interfaces:**
- Consumes: existing `t(key, fallback)` helper.
- Produces: `home.categoryPopularTools.*` and `home.blogCards.*` keys used by `renderCategories()` and `renderBlogCards()`.

- [ ] **Step 1: Add English and Turkish values**

Add explicit keys for every homepage category shortcut label, blog title, excerpt, category and reading-time suffix.

- [ ] **Step 2: Render through `t()`**

Give each category shortcut and blog card a stable key and call `t()` at render time. Localize the category-card aria-label and reading-time suffix.

- [ ] **Step 3: Verify GREEN for homepage tests**

Run: `npm run test:site-regressions`

Expected: homepage locale assertions pass; tool-enhancer assertions remain failing until Task 3.

### Task 3: Localize the late tool-page enhancer

**Files:**
- Modify: `src/js/tool-page-enhancer.js`
- Test: `tests/site-regressions.mjs`

**Interfaces:**
- Consumes: `document.documentElement.lang`.
- Produces: `getEnhancerCopy()` returning the complete `en` or `tr` shared UI dictionary.

- [ ] **Step 1: Add one shared copy dictionary**

Create `ENHANCER_COPY` with matching English and Turkish fields for breadcrumbs, hero kicker, privacy note, how-to instructions, workspace support, state messages, three-step guide, benefits, limits, common issues, scenarios, related tools and FAQ.

- [ ] **Step 2: Replace hardcoded shared UI strings**

Use the selected copy in `createStickyHeader()`, `createHero()`, `createHowToUse()`, `createWorkspaceCompanion()`, `createGuides()`, counters and FAQ schema generation. Keep tool-specific names and descriptions unchanged.

- [ ] **Step 3: Verify GREEN**

Run: `npm run test:site-regressions`

Expected: PASS.

### Task 4: Full validation and live smoke

**Files:**
- No production files beyond Tasks 2–3.
- Validate: generated build and live preview.

**Interfaces:**
- Consumes: branch head.
- Produces: CI evidence and browser observations.

- [ ] **Step 1: Run full validation**

Run: `npm run ci:validate`

Expected: exit 0 with lint, i18n audit, tests, build, sitemap, structured data, link and route audits passing.

- [ ] **Step 2: Open a draft PR and inspect CI**

Create a draft PR against `main`; require GitHub Actions validation and security jobs to succeed.

- [ ] **Step 3: Smoke-test Turkish pages**

Open `/?lang=tr`, `/tools/pdf/merge/?lang=tr`, `/tools/image/compress/?lang=tr`, and `/tools/dev/json-formatter/?lang=tr`. Confirm shared professional-layer English phrases are absent, Turkish controls are visible, and no site-origin console error is introduced.

- [ ] **Step 4: Integrate**

Mark the PR ready and squash-merge only after the full checks and smoke test pass.
