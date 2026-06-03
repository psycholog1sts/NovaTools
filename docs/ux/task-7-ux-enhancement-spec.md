# Task 7 UX Enhancement Specification

## Scope and principles

Task 7 improves tool-page engagement, content discovery, navigation clarity, loading feedback, and WCAG 2.1 AA readiness without adding server tracking or changing public URLs. All persistent engagement state is stored in `localStorage` on the user's device.

## 7.1 Tool page UX enhancements

- **Sticky tool header:** Shows tool name and breadcrumb while users scroll. Links remain normal anchors without JavaScript.
- **How to Use section:** Uses native `<details>`/`<summary>` so it works without JavaScript. JavaScript only remembers whether the visitor has seen the section before.
- **Real-time counters:** Text-like fields receive character, word, and UTF-8 byte counters where applicable.
- **Progress indicators:** Multi-step/file-oriented tools receive a four-step workflow indicator and an ARIA progress bar. Existing tool-specific progress bars remain authoritative for actual processing.
- **Recently Used sidebar:** Uses `localStorage` only. If storage is unavailable, the page continues normally.
- **Compare with Similar Tools:** Renders category/manifest-based comparisons near the bottom of tool pages.
- **Keyboard shortcut hints:** Primary convert/format/process actions receive `Ctrl+Enter` hints where labels indicate an actionable tool command.
- **Dark mode toggle:** Shared helper persists both `novatools-theme` and legacy `theme` keys for compatibility.

## 7.2 Content discovery

- **Related Tools carousel:** Renders 3–4 same-category or manifest-related items with thumbnail badges and titles.
- **Blog suggestions:** Tool pages suggest relevant blog posts using title/category/slug matching from the local blog manifest.
- **Popular This Week:** Homepage renders a local-only popularity list based on tool opens recorded in `localStorage`; when empty, it falls back to starter tools.
- **Category filter sidebar:** Navigation component exposes grouped tool counts for category menus and footer links.
- **Search autocomplete:** Homepage search suggestions now include tool names and blog post titles.

## 7.3 Engagement mechanisms

- **5-star rating:** Per-tool rating is stored locally and labeled as device-only.
- **Helpful feedback:** Yes/No feedback is stored locally and does not imply server analytics.
- **Comments on blog posts:** Specification recommends a privacy-reviewed lightweight provider only after consent gating. No third-party comments were added in this code change to avoid unreviewed tracking.
- **Favorites:** Per-tool favorites are stored locally.
- **Share Result:** Copies a detected output field when available, otherwise copies the current URL.

## 7.4 Readability and accessibility

- Body text baseline: 16px and 1.6 line-height.
- Paragraph/list measure: max 75ch.
- Focus indicators: visible 3px focus outline for enhanced interactive elements.
- ARIA: dynamic widgets use labels, `aria-pressed`, `aria-live`, `radiogroup`, and `progressbar` semantics.
- Skip link: navigation component includes a skip-to-content link, and the homepage already includes one.

## 7.5 Navigation structure

A reusable semantic navigation component is available with:

- Tools mega-menu grouped by category with counts.
- Guides dropdown by pillar.
- Blog dropdown with latest local manifest posts.
- About dropdown with About, Contact, and Team links.
- Four-column footer: Tools by Category, Guides & Resources, Company, Legal.

## 7.6 Loading states

- Tool workspace receives a short skeleton state during enhancement initialization.
- File/multi-step workflows receive progress-step UI.
- Existing tool-specific success/error messages remain primary; the engagement layer avoids replacing tool logic.
- Large-file copy guidance is included in workflow support and documentation.

## Graceful degradation

- Native links, forms, `<details>`, and page content remain usable without JavaScript.
- JavaScript-only widgets include `noscript` messaging where persistence is required.
- If `localStorage` is blocked, the page still renders; state simply is not persisted.

## Implementation notes

- The Vite HTML transform injects the enhancement stylesheet and module only into tool pages.
- Public route structure is not changed.
- No server-side processing, external comments provider, or analytics event emitter was added.
