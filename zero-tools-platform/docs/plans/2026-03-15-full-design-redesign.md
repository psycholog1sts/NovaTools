# NovaTools MC — Full Design Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete visual redesign of all 50+ pages with dual light/dark theme, professional layout, fixed logo rendering, 3-column ad grid, and consistent header/footer across every page.

**Architecture:** CSS-First Cascade approach — rewrite `critical.css` with `[data-theme]` + `prefers-color-scheme` dual-mode tokens, then batch-update all HTML files via PowerShell for structural consistency (header/footer/ad-rails). No JS framework changes; tool calculation logic untouched.

**Tech Stack:** Pure CSS custom properties, HTML5, PowerShell batch scripts, vanilla JS (theme toggle only)

---

## Critical Context

### File Inventory
- **Root entry:** `index.html` (920 lines — Vite entry point, committed to git)
- **CSS:** `src/styles/critical.css` (1548 lines), `src/styles/main.css` (277 lines), `src/styles/index.css` (8 lines — imports)
- **Layout JS:** `src/components/layout/index.mjs` (256 lines)
- **Tool pages (17 files):**
  - `src/tools/finance/mortgage-refinance/index.html`
  - `src/tools/finance/life-insurance/index.html`
  - `src/tools/finance/cloud-cost/index.html`
  - `src/tools/finance/compound-interest/index.html`
  - `src/tools/finance/crypto-tax/index.html`
  - `src/tools/finance/retirement/index.html`
  - `src/tools/finance/student-loan/index.html`
  - `src/tools/finance/tax/index.html`
  - `src/tools/pdf/compress/index.html`
  - `src/tools/pdf/merge/index.html`
  - `src/tools/pdf/split/index.html`
  - `src/tools/image/compress/index.html`
  - `src/tools/image/convert/index.html`
  - `src/tools/dev/json-formatter/index.html`
  - `src/tools/dev/regex-tester/index.html`
  - `src/tools/religious/islamic-calendar/index.html`
  - `src/tools/news/summarizer/index.html`
  - `src/tools/request/index.html`
- **Blog pages (4 hub files):**
  - `src/blog/index.html`
  - `src/blog/cloud-cost-optimization.html`
  - `src/blog/life-insurance-guide.html`
  - `src/blog/mortgage-refinance-guide.html`
- **Blog articles (25 files):** `src/blog/articles/*.html`
- **Public assets:** `public/` (favicons, logos, manifest.json)
- **Static assets:** `static/` (icons, WASM, robots, sitemap)
- **Logo files:**
  - `logolar/image.png` (574×516, bird-only, no text) → favicon/tab/PWA
  - `logolar/mclogo.png` (1024×1024, bird + "NovaTools MC" text) → site interior
- **Build:** Vite + Tailwind + PostCSS → `dist/` (gitignored)
- **Deploy:** Vercel auto-deploys from `main` branch

### Current Problems (from user screenshots)
1. Hero logo shows black square background (PNG on dark bg with no crop/blend)
2. Header logo tiny and barely visible ("Nova" text cut off)
3. No light theme — only dark mode exists
4. Google Search Console shows old/broken favicon
5. Tool pages have inconsistent headers (some minimal, some with nav)
6. No 3-column ad layout (reference design shows left rail + content + right rail)
7. Footer inconsistent across pages
8. "Sponsored" text appears naked without styled ad frame
9. Inline `<style>` blocks in tool pages use hardcoded dark colors that won't adapt to light theme

### Design Decisions (confirmed by user)
- **Theme:** Dual mode, system preference default (`prefers-color-scheme`), manual toggle
- **Scope:** Full rewrite of all 50+ pages
- **Approach:** CSS-First Cascade (Approach 1)
- **Reference:** User provided white-background mockup showing clean cards, teal accents, 3-col ad layout

### Key Constraints
- DO NOT modify any tool JS calculation logic, input names, form `data-*` attributes, or event handlers
- DO NOT add React/Vue/Tailwind framework — keep pure CSS + existing Tailwind setup
- Preserve all existing `id` and `class` attributes used as JS hooks
- Keep all AdSense `<ins>` tags and their `data-ad-*` attributes intact
- Keep all Schema.org structured data, meta tags, and canonical URLs
- Keep all Google Analytics tracking code

---

## Task 1: Create Light Theme CSS Variables

**Files:**
- Modify: `src/styles/critical.css:66-114` (`:root` block)

**Step 1: Add light theme variables alongside dark**

Replace the existing `:root` block (lines 66-114) with a dual-mode system:

```css
/* ============================================
   DESIGN TOKENS - DUAL THEME
   ============================================ */

/* Dark theme (default fallback) */
:root {
  /* Backgrounds */
  --bg-primary: #0A0A0C;
  --bg-secondary: #0F0F12;
  --bg-tertiary: #141416;
  --bg-elevated: #1A1A1E;
  --bg-hover: #222228;

  /* Surfaces */
  --surface-default: rgba(255, 255, 255, 0.03);
  --surface-hover: rgba(255, 255, 255, 0.06);
  --surface-active: rgba(255, 255, 255, 0.09);

  /* Text */
  --text-primary: #FAFAFA;
  --text-secondary: #A1A1AA;
  --text-tertiary: #71717A;
  --text-muted: #52525B;

  /* Accent */
  --accent-primary: #6366F1;
  --accent-hover: #818CF8;
  --accent-glow: rgba(99, 102, 241, 0.3);
  --accent-subtle: rgba(99, 102, 241, 0.1);

  /* Semantic */
  --success: #22C55E;
  --warning: #F59E0B;
  --error: #EF4444;
  --info: #3B82F6;

  /* Borders */
  --border-default: rgba(255, 255, 255, 0.06);
  --border-hover: rgba(255, 255, 255, 0.12);
  --border-accent: rgba(99, 102, 241, 0.5);

  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.5);
  --shadow-glow: 0 0 40px rgba(99, 102, 241, 0.15);

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* Card */
  --card-bg: rgba(255, 255, 255, 0.03);
  --card-border: rgba(255, 255, 255, 0.06);
  --card-hover-bg: rgba(255, 255, 255, 0.06);
  --card-hover-border: rgba(255, 255, 255, 0.12);

  /* Ad frame */
  --ad-bg: rgba(255, 255, 255, 0.02);
  --ad-border: rgba(255, 255, 255, 0.06);
  --ad-label-color: #52525B;

  /* Header */
  --header-bg: rgba(10, 10, 12, 0.85);
  --header-border: rgba(255, 255, 255, 0.06);

  /* Footer */
  --footer-bg: rgba(10, 10, 14, 0.95);
  --footer-border: rgba(0, 217, 255, 0.1);
}

/* Light theme */
[data-theme="light"] {
  --bg-primary: #F8F9FA;
  --bg-secondary: #FFFFFF;
  --bg-tertiary: #F1F3F5;
  --bg-elevated: #FFFFFF;
  --bg-hover: #E9ECEF;

  --surface-default: rgba(0, 0, 0, 0.02);
  --surface-hover: rgba(0, 0, 0, 0.04);
  --surface-active: rgba(0, 0, 0, 0.06);

  --text-primary: #1A1A2E;
  --text-secondary: #4A5568;
  --text-tertiary: #718096;
  --text-muted: #A0AEC0;

  --accent-primary: #4F46E5;
  --accent-hover: #6366F1;
  --accent-glow: rgba(79, 70, 229, 0.15);
  --accent-subtle: rgba(79, 70, 229, 0.08);

  --success: #16A34A;
  --warning: #D97706;
  --error: #DC2626;
  --info: #2563EB;

  --border-default: rgba(0, 0, 0, 0.08);
  --border-hover: rgba(0, 0, 0, 0.15);
  --border-accent: rgba(79, 70, 229, 0.4);

  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
  --shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.12);
  --shadow-glow: 0 0 40px rgba(79, 70, 229, 0.08);

  --card-bg: #FFFFFF;
  --card-border: rgba(0, 0, 0, 0.08);
  --card-hover-bg: #FFFFFF;
  --card-hover-border: rgba(79, 70, 229, 0.3);

  --ad-bg: #F7F7F8;
  --ad-border: rgba(0, 0, 0, 0.06);
  --ad-label-color: #A0AEC0;

  --header-bg: rgba(255, 255, 255, 0.9);
  --header-border: rgba(0, 0, 0, 0.06);

  --footer-bg: #F1F3F5;
  --footer-border: rgba(0, 0, 0, 0.06);
}

/* System preference auto-detection */
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) {
    --bg-primary: #F8F9FA;
    --bg-secondary: #FFFFFF;
    --bg-tertiary: #F1F3F5;
    --bg-elevated: #FFFFFF;
    --bg-hover: #E9ECEF;

    --surface-default: rgba(0, 0, 0, 0.02);
    --surface-hover: rgba(0, 0, 0, 0.04);
    --surface-active: rgba(0, 0, 0, 0.06);

    --text-primary: #1A1A2E;
    --text-secondary: #4A5568;
    --text-tertiary: #718096;
    --text-muted: #A0AEC0;

    --accent-primary: #4F46E5;
    --accent-hover: #6366F1;
    --accent-glow: rgba(79, 70, 229, 0.15);
    --accent-subtle: rgba(79, 70, 229, 0.08);

    --success: #16A34A;
    --warning: #D97706;
    --error: #DC2626;
    --info: #2563EB;

    --border-default: rgba(0, 0, 0, 0.08);
    --border-hover: rgba(0, 0, 0, 0.15);
    --border-accent: rgba(79, 70, 229, 0.4);

    --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.08);
    --shadow-lg: 0 8px 30px rgba(0, 0, 0, 0.12);
    --shadow-glow: 0 0 40px rgba(79, 70, 229, 0.08);

    --card-bg: #FFFFFF;
    --card-border: rgba(0, 0, 0, 0.08);
    --card-hover-bg: #FFFFFF;
    --card-hover-border: rgba(79, 70, 229, 0.3);

    --ad-bg: #F7F7F8;
    --ad-border: rgba(0, 0, 0, 0.06);
    --ad-label-color: #A0AEC0;

    --header-bg: rgba(255, 255, 255, 0.9);
    --header-border: rgba(0, 0, 0, 0.06);

    --footer-bg: #F1F3F5;
    --footer-border: rgba(0, 0, 0, 0.06);
  }
}
```

**Step 2: Update body and bg-ambient to use variables**

In `critical.css`, update `body` (line 34-42):

```css
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

Update `.bg-ambient` (line 119+) and `.bg-ambient::before` / `::after`:
- Wrap in `[data-theme="dark"] .bg-ambient` or keep but add light override:

```css
[data-theme="light"] .bg-ambient,
[data-theme="light"] .noise-overlay {
  display: none;
}
@media (prefers-color-scheme: light) {
  :root:not([data-theme="dark"]) .bg-ambient,
  :root:not([data-theme="dark"]) .noise-overlay {
    display: none;
  }
}
```

**Step 3: Commit**

```bash
git add src/styles/critical.css
git commit -m "feat: add dual light/dark theme CSS variables with system preference detection"
```

---

## Task 2: Update All Component Styles to Use Variables

**Files:**
- Modify: `src/styles/critical.css` (multiple sections)

**Step 1: Update header styles (lines 195-403)**

Replace hardcoded colors with variables:

```css
.main-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: var(--header-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--header-border);
  transition: background 0.3s ease;
}
```

**Step 2: Update card styles (lines 632-714)**

```css
.card {
  background: var(--card-bg);
  border: 1px solid var(--card-border);
  border-radius: var(--radius-lg);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  position: relative;
}

.card:hover {
  background: var(--card-hover-bg);
  border-color: var(--card-hover-border);
  transform: translateY(-4px);
  box-shadow: var(--shadow-lg), var(--shadow-glow);
}
```

For light theme, card top gradient border should be subtle:

```css
.card::before {
  /* keep existing gradient but make it theme-aware */
  background: linear-gradient(90deg, transparent, var(--border-hover), transparent);
}
```

**Step 3: Update button styles (lines 565-627)**

Keep gradient buttons as-is (they work on both themes). Update `.btn-secondary`:

```css
.btn-secondary {
  background: var(--surface-default);
  color: var(--text-primary);
  border: 1px solid var(--border-default);
}
.btn-secondary:hover {
  background: var(--surface-hover);
  border-color: var(--border-hover);
}
```

**Step 4: Update ad slot styles (lines 880-1135)**

Replace all hardcoded `rgba(10, 10, 12, 0.98)` backgrounds with `var(--header-bg)`, `rgba(255, 255, 255, 0.06)` borders with `var(--border-default)`, etc.

Add `.ad-frame` component class:

```css
.ad-frame {
  background: var(--ad-bg);
  border: 1px solid var(--ad-border);
  border-radius: var(--radius-lg);
  padding: 0.75rem;
  text-align: center;
}
.ad-frame .ad-label {
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ad-label-color);
  margin-bottom: 0.5rem;
}
```

**Step 5: Update footer styles**

The footer in `index.html` uses inline `<style>`. These need to be moved to `critical.css` and use variables:

```css
.site-footer {
  background: var(--footer-bg);
  border-top: 1px solid var(--footer-border);
  padding: 3rem 1rem 1.5rem;
  margin-top: 4rem;
}
.footer-container { max-width: 1200px; margin: 0 auto; }
.footer-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 2.5rem; margin-bottom: 2.5rem; }
.footer-brand { color: var(--accent-hover); font-size: 1.1rem; font-weight: 700; margin-bottom: 0.75rem; }
.footer-about { color: var(--text-tertiary); font-size: 0.875rem; line-height: 1.7; margin-bottom: 0.75rem; }
.footer-privacy-badge { display: inline-block; padding: 3px 10px; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.3); border-radius: 12px; color: var(--success); font-size: 0.75rem; }
.footer-heading { color: var(--text-primary); font-size: 0.875rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 0.875rem; }
.footer-links a { color: var(--text-tertiary); font-size: 0.875rem; transition: color 0.15s; }
.footer-links a:hover { color: var(--accent-hover); }
.footer-tips { padding-left: 1.25rem; color: var(--text-tertiary); font-size: 0.8125rem; line-height: 1.7; margin-bottom: 1.25rem; }
.footer-contact { color: var(--text-tertiary); font-size: 0.8125rem; }
.footer-contact a { color: var(--accent-hover); }
.footer-bottom { border-top: 1px solid var(--border-default); padding-top: 1.25rem; text-align: center; }
.footer-bottom p { color: var(--text-muted); font-size: 0.8125rem; line-height: 1.6; }
```

**Step 6: Update all remaining hardcoded colors**

Search and replace throughout `critical.css`:
- `#0A0A0C` → `var(--bg-primary)`
- `#0F0F12` → `var(--bg-secondary)`
- `#FAFAFA` (in non-gradient contexts) → `var(--text-primary)`
- `rgba(255, 255, 255, 0.03)` → `var(--surface-default)`
- `rgba(255, 255, 255, 0.06)` → used in borders → `var(--border-default)` or `var(--surface-hover)`
- `rgba(255, 255, 255, 0.12)` → `var(--border-hover)`

**Step 7: Commit**

```bash
git add src/styles/critical.css
git commit -m "feat: convert all component styles to use theme-aware CSS variables"
```

---

## Task 3: Fix Logo Rendering

**Files:**
- Modify: `src/styles/critical.css` (`.header-logo-img`, `.hero-brand-img`)
- Modify: `index.html` (hero section)

**Step 1: Fix header logo — remove black background via CSS**

The PNG logos (`image.png`, `brand-logo.png`) have black backgrounds. Two approaches:

**Option A (preferred):** Create cropped/transparent versions using sharp/canvas. But this requires image editing tools.

**Option B (CSS-only):** Use `border-radius` + `object-fit` to make logo circular/rounded, hiding black corners. Plus `filter: drop-shadow` for glow.

Update `.header-logo-img` in critical.css:

```css
.header-logo-img {
  width: 44px;
  height: 44px;
  object-fit: contain;
  border-radius: var(--radius-md);
  filter: drop-shadow(0 0 6px rgba(57, 255, 20, 0.3))
          drop-shadow(0 0 12px rgba(0, 207, 255, 0.2));
  transition: all 0.3s ease;
  flex-shrink: 0;
}

/* In light mode, logo needs darker shadow for contrast */
[data-theme="light"] .header-logo-img {
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.15));
}
```

**Step 2: Fix hero logo — remove black square background**

Update `.hero-brand-img`:

```css
.hero-brand-img {
  width: 200px;
  height: 200px;
  object-fit: contain;
  border-radius: var(--radius-xl);
  filter: drop-shadow(0 0 20px rgba(57, 255, 20, 0.3))
          drop-shadow(0 0 40px rgba(0, 207, 255, 0.2));
  animation: float 6s ease-in-out infinite;
  display: block;
  margin: 0 auto 1.5rem;
}
@media (min-width: 768px) {
  .hero-brand-img {
    width: 260px;
    height: 260px;
  }
}

/* Light mode: subtle shadow, no neon glow */
[data-theme="light"] .hero-brand-img {
  filter: drop-shadow(0 4px 20px rgba(0, 0, 0, 0.1));
}
```

**Step 3: Create transparent-background logo versions**

Use Node.js sharp (already a devDependency) to create transparent versions:

```bash
# Create script at scripts/crop-logos.mjs
node scripts/crop-logos.mjs
```

Script content:
```javascript
import sharp from 'sharp';

// Remove black background from bird logo
await sharp('logolar/image.png')
  .removeAlpha()
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(({ data, info }) => {
    // Replace pure black pixels with transparent
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      if (r < 15 && g < 15 && b < 15) {
        data[i+3] = 0; // Set alpha to 0
      }
    }
    return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toFile('public/logo-bird.png');
  });

// Same for brand logo
await sharp('logolar/mclogo.png')
  .removeAlpha()
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true })
  .then(({ data, info }) => {
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2];
      if (r < 15 && g < 15 && b < 15) {
        data[i+3] = 0;
      }
    }
    return sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
      .png()
      .toFile('public/logo-brand.png');
  });

console.log('Transparent logos created in public/');
```

Then update HTML references:
- `image.png` → `logo-bird.png`
- `brand-logo.png` → `logo-brand.png`

**Step 4: Commit**

```bash
git add scripts/crop-logos.mjs public/logo-bird.png public/logo-brand.png src/styles/critical.css
git commit -m "fix: create transparent-background logos and fix rendering on both themes"
```

---

## Task 4: Add Theme Toggle Button & JS

**Files:**
- Modify: `index.html` (header area, line ~138)
- Create: `src/theme-toggle.mjs`
- Modify: `src/styles/critical.css` (add `.theme-toggle` styles)

**Step 1: Create theme toggle JS**

Create `src/theme-toggle.mjs`:

```javascript
// Theme toggle — respects system preference, persists choice
(function initTheme() {
  const stored = localStorage.getItem('theme');
  if (stored) {
    document.documentElement.setAttribute('data-theme', stored);
  }
  // If no stored preference, leave as default (system preference handled by CSS)
})();

export function setupThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) return;

  function getEffectiveTheme() {
    const stored = localStorage.getItem('theme');
    if (stored) return stored;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }

  function updateIcon() {
    const theme = getEffectiveTheme();
    const sunIcon = btn.querySelector('.icon-sun');
    const moonIcon = btn.querySelector('.icon-moon');
    if (sunIcon && moonIcon) {
      sunIcon.style.display = theme === 'light' ? 'none' : 'block';
      moonIcon.style.display = theme === 'dark' ? 'none' : 'block';
    }
    btn.setAttribute('aria-label', `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`);
  }

  btn.addEventListener('click', () => {
    const current = getEffectiveTheme();
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateIcon();
  });

  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (!localStorage.getItem('theme')) {
      updateIcon();
    }
  });

  updateIcon();
}
```

**Step 2: Add toggle button HTML to header**

In `index.html`, after the language switcher (line ~152), before the mobile menu button:

```html
<!-- Theme Toggle -->
<button type="button" id="themeToggle" class="theme-toggle" aria-label="Toggle theme">
  <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
  <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
</button>
```

**Step 3: Add theme toggle CSS**

```css
.theme-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: var(--surface-default);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-full);
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
}
.theme-toggle:hover {
  background: var(--surface-hover);
  border-color: var(--border-hover);
  color: var(--text-primary);
}
```

**Step 4: Wire up theme toggle in app initialization**

Add to the bottom `<script>` section of `index.html` or import in `src/app.mjs`:

```javascript
import { setupThemeToggle } from '/src/theme-toggle.mjs';
document.addEventListener('DOMContentLoaded', setupThemeToggle);
```

**Step 5: Add FOUC prevention**

Add this inline script to `<head>` of `index.html` (before CSS load, after charset):

```html
<script>
  (function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t)})();
</script>
```

**Step 6: Commit**

```bash
git add src/theme-toggle.mjs src/styles/critical.css index.html
git commit -m "feat: add theme toggle button with system preference detection and localStorage persistence"
```

---

## Task 5: Redesign Home Page Layout

**Files:**
- Modify: `index.html` (lines 100-920)
- Modify: `src/styles/critical.css`

**Step 1: Restructure hero section**

Current hero is centered with logo above text. Reference design shows:
- Logo centered, reasonably sized (not 280×280 with black bg)
- Clean typography
- CTA buttons prominent

Update hero in `index.html` (lines 177-220):

```html
<section class="hero">
  <div class="container">
    <div class="hero-content">
      <!-- Logo -->
      <div class="hero-logo-display">
        <img src="/logo-brand.png" alt="NovaTools MC" class="hero-brand-img" width="200" height="200" loading="eager">
      </div>

      <div class="hero-badge">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
        Zero Data Collection
      </div>
      <h1 class="hero-title">Professional Tools.<br>Complete Privacy.</h1>
      <p class="hero-description">
        Powerful calculators for mortgage, insurance, and cloud costs.
        All processing happens in your browser — your data never leaves your device.
      </p>
      <div class="hero-cta">
        <a href="#finance" class="btn btn-primary">
          Explore Tools
          <svg class="btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
        <a href="#privacy" class="btn btn-secondary">How It Works</a>
      </div>
    </div>
  </div>
</section>
```

**Step 2: Add 3-column ad layout grid**

Replace the current tools-layout (lines 688-706 `<style>` block) with CSS in critical.css:

```css
/* 3-Column Ad Layout */
.page-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 1200px) {
  .page-layout {
    grid-template-columns: 160px 1fr 160px;
    padding: 0 2rem;
  }
}

@media (min-width: 1400px) {
  .page-layout {
    grid-template-columns: 300px 1fr 300px;
  }
}

.ad-rail {
  display: none;
}

@media (min-width: 1200px) {
  .ad-rail {
    display: block;
    position: sticky;
    top: 100px;
    align-self: start;
  }
}

.ad-rail .ad-frame {
  margin-bottom: 1.5rem;
}

.page-center {
  min-width: 0;
}
```

**Step 3: Wrap main content in 3-column grid**

In `index.html`, wrap the tools sections:

```html
<div class="page-layout">
  <!-- Left Ad Rail -->
  <aside class="ad-rail" role="complementary" aria-label="Advertisement">
    <div class="ad-frame">
      <div class="ad-label">Advertisement</div>
      <div class="ad-slot" style="min-height: 600px;">
        <ins class="adsbygoogle" style="display:inline-block;width:160px;height:600px" data-ad-client="__ADSENSE_CLIENT__" data-ad-slot="LEFT_RAIL_SLOT"></ins>
      </div>
    </div>
  </aside>

  <!-- Center Content -->
  <div class="page-center">
    <!-- All tool sections go here -->
    ...existing finance/pdf/image/dev sections...

    <!-- Mid-Content Ad (between sections) -->
    <div class="ad-frame" style="margin: 2rem 0;">
      <div class="ad-label">Advertisement</div>
      <div class="ad-slot" style="min-height: 250px;">
        <ins class="adsbygoogle" ...></ins>
      </div>
    </div>
  </div>

  <!-- Right Ad Rail -->
  <aside class="ad-rail" role="complementary" aria-label="Advertisement">
    <div class="ad-frame">
      <div class="ad-label">Advertisement</div>
      <div class="ad-slot" style="min-height: 600px;">
        <ins class="adsbygoogle" style="display:inline-block;width:160px;height:600px" data-ad-client="__ADSENSE_CLIENT__" data-ad-slot="RIGHT_RAIL_SLOT"></ins>
      </div>
    </div>

    <!-- Privacy Card moved to right rail -->
    ...privacy card sidebar...
    ...stats card sidebar...
  </aside>
</div>
```

**Step 4: Remove old fixed sidebar ad slots**

Remove the `<aside class="ad-sidebar-left">` and `<aside class="ad-sidebar-right">` elements (lines 776-790) since they're replaced by the grid-based ad rails.

**Step 5: Remove inline footer `<style>` from index.html**

Delete the `<style>` block at lines 747-766 (`.site-footer` styles) since these are now in `critical.css` (Task 2, Step 5).

**Step 6: Update `<meta name="theme-color">`**

```html
<meta name="theme-color" content="#0A0A0C" media="(prefers-color-scheme: dark)">
<meta name="theme-color" content="#F8F9FA" media="(prefers-color-scheme: light)">
```

**Step 7: Commit**

```bash
git add index.html src/styles/critical.css
git commit -m "feat: redesign home page with 3-column ad grid and clean hero layout"
```

---

## Task 6: Create Standard Tool Page Template

**Files:**
- Modify: `src/tools/pdf/compress/index.html` (example template)
- Modify: `src/styles/critical.css` (add tool page styles)

**Step 1: Define standard tool page structure**

Every tool page should follow this structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <!-- Analytics, meta, fonts, CSS — same as now -->
  <script>(function(){var t=localStorage.getItem('theme');if(t)document.documentElement.setAttribute('data-theme',t)})();</script>
  <link rel="stylesheet" href="/src/styles/critical.css">
  <link rel="stylesheet" href="/src/styles/main.css">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <!-- ...meta, favicon, schema... -->
  <style>
    /* Tool-specific styles only — using CSS variables for theme compatibility */
    .dropzone { border: 2px dashed var(--border-default); background: var(--surface-default); }
    .dropzone:hover { border-color: var(--border-accent); background: var(--surface-hover); }
    /* ...etc... */
  </style>
</head>
<body>
  <div class="bg-ambient" aria-hidden="true"></div>
  <div class="noise-overlay" aria-hidden="true"></div>

  <div id="app" class="app">
    <!-- Standard Header -->
    <header class="main-header">
      <div class="container">
        <div class="header-inner">
          <a href="/" class="logo" aria-label="NovaTools MC Home">
            <img src="/logo-bird.png" alt="NovaTools MC" class="header-logo-img" width="44" height="44">
            <span class="logo-text">NovaTools <span class="logo-mc">MC</span></span>
          </a>
          <nav class="nav-desktop" aria-label="Main navigation">
            <a href="/#finance" class="nav-link">Finance</a>
            <a href="/#pdf" class="nav-link">PDF Tools</a>
            <a href="/#image" class="nav-link">Images</a>
            <a href="/#dev" class="nav-link">Developers</a>
          </nav>
          <div class="privacy-badge" title="Your data never leaves your browser">
            <span class="privacy-badge-dot"></span>
            <span>Privacy First</span>
          </div>
          <button type="button" id="themeToggle" class="theme-toggle" aria-label="Toggle theme">
            <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <button type="button" id="mobileMenuBtn" class="menu-btn" aria-label="Toggle menu" aria-expanded="false">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
        <nav id="mobileMenu" class="mobile-menu" aria-label="Mobile navigation" hidden>
          <a href="/#finance" class="mobile-nav-link">Finance Tools</a>
          <a href="/#pdf" class="mobile-nav-link">PDF Tools</a>
          <a href="/#image" class="mobile-nav-link">Image Tools</a>
          <a href="/#dev" class="mobile-nav-link">Developer Tools</a>
        </nav>
      </div>
    </header>

    <main class="main-content">
      <!-- Breadcrumb -->
      <div class="container" style="padding-top: 1.5rem;">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Home</a>
          <span class="breadcrumb-sep">/</span>
          <a href="/#pdf">PDF Tools</a>
          <span class="breadcrumb-sep">/</span>
          <span aria-current="page">Compress</span>
        </nav>
      </div>

      <!-- 3-Column Layout -->
      <div class="page-layout">
        <aside class="ad-rail" role="complementary" aria-label="Advertisement">
          <div class="ad-frame">
            <div class="ad-label">Advertisement</div>
            <div class="ad-slot" style="min-height: 600px;">
              <ins class="adsbygoogle" ...></ins>
            </div>
          </div>
        </aside>

        <div class="page-center">
          <div class="tool-container">
            <!-- Tool Header + Workspace (existing content) -->
            ...tool form, results, etc...
          </div>

          <!-- Mid-Content Ad -->
          <div class="ad-frame" style="margin: 2rem auto; max-width: 900px;">
            <div class="ad-label">Advertisement</div>
            <div class="ad-slot" style="min-height: 250px;">
              <ins class="adsbygoogle" ...></ins>
            </div>
          </div>

          <!-- About/FAQ in accordion -->
          <div class="tool-container">
            <details class="tool-accordion">
              <summary>About This Tool</summary>
              <div class="accordion-content">...SEO content...</div>
            </details>
            <details class="tool-accordion">
              <summary>Frequently Asked Questions</summary>
              <div class="accordion-content">...FAQ content...</div>
            </details>
          </div>
        </div>

        <aside class="ad-rail" role="complementary" aria-label="Advertisement">
          <div class="ad-frame">
            <div class="ad-label">Advertisement</div>
            <div class="ad-slot" style="min-height: 600px;">
              <ins class="adsbygoogle" ...></ins>
            </div>
          </div>
        </aside>
      </div>
    </main>

    <!-- Standard Footer -->
    <footer class="site-footer">...</footer>
  </div>

  <!-- Theme Toggle JS -->
  <script>
    document.addEventListener('DOMContentLoaded', function() {
      // Mobile menu
      var menuBtn = document.getElementById('mobileMenuBtn');
      var mobileMenu = document.getElementById('mobileMenu');
      if (menuBtn && mobileMenu) {
        menuBtn.addEventListener('click', function() {
          var isExpanded = menuBtn.getAttribute('aria-expanded') === 'true';
          menuBtn.setAttribute('aria-expanded', !isExpanded);
          mobileMenu.hidden = isExpanded;
          mobileMenu.classList.toggle('active', !isExpanded);
        });
      }
      // Theme toggle
      var themeBtn = document.getElementById('themeToggle');
      if (themeBtn) {
        function getTheme() {
          var s = localStorage.getItem('theme');
          if (s) return s;
          return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
        }
        function updateIcon() {
          var t = getTheme();
          themeBtn.querySelector('.icon-sun').style.display = t === 'light' ? 'none' : 'block';
          themeBtn.querySelector('.icon-moon').style.display = t === 'dark' ? 'none' : 'block';
        }
        themeBtn.addEventListener('click', function() {
          var next = getTheme() === 'dark' ? 'light' : 'dark';
          document.documentElement.setAttribute('data-theme', next);
          localStorage.setItem('theme', next);
          updateIcon();
        });
        updateIcon();
      }
    });
  </script>
</body>
</html>
```

**Step 2: Add breadcrumb + accordion CSS to critical.css**

```css
/* Breadcrumb */
.breadcrumb {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: var(--text-muted);
  margin-bottom: 1rem;
}
.breadcrumb a {
  color: var(--text-tertiary);
  transition: color 0.2s;
}
.breadcrumb a:hover {
  color: var(--accent-hover);
}
.breadcrumb-sep {
  color: var(--text-muted);
}

/* Tool Accordion */
.tool-accordion {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  margin-bottom: 1rem;
  overflow: hidden;
}
.tool-accordion summary {
  padding: 1rem 1.5rem;
  font-weight: 600;
  cursor: pointer;
  background: var(--surface-default);
  color: var(--text-primary);
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.tool-accordion summary::after {
  content: '+';
  font-size: 1.25rem;
  color: var(--text-muted);
  transition: transform 0.2s;
}
.tool-accordion[open] summary::after {
  content: '−';
}
.tool-accordion .accordion-content {
  padding: 1.5rem;
  color: var(--text-secondary);
  line-height: 1.7;
}
```

**Step 3: Update tool page inline styles to use CSS variables**

In each tool page's `<style>` block, replace hardcoded dark colors:
- `rgba(255, 255, 255, 0.1)` → `var(--border-default)` or `var(--surface-hover)`
- `rgba(255, 255, 255, 0.03)` → `var(--surface-default)`
- `rgba(255, 255, 255, 0.05)` → `var(--surface-default)`
- `rgba(255, 255, 255, 0.08)` → `var(--border-default)`
- `rgba(99, 102, 241, ...)` → `var(--accent-primary)` / `var(--accent-subtle)`
- `#6366F1` → `var(--accent-primary)`
- `var(--text-muted)` already uses variable ✓
- `var(--surface-default)` already uses variable ✓

**Step 4: Commit**

```bash
git add src/tools/pdf/compress/index.html src/styles/critical.css
git commit -m "feat: create standard tool page template with breadcrumb, 3-col layout, accordion"
```

---

## Task 7: Batch-Update All Tool Pages

**Files:**
- Modify: All 17 `src/tools/*/index.html` files
- Script: PowerShell batch replacement

**Step 1: Write PowerShell script for header replacement**

Create `scripts/batch-update-tools.ps1`:

This script must:
1. Replace the minimal header in each tool page with the full standard header (nav, privacy badge, theme toggle)
2. Add FOUC prevention script to `<head>`
3. Add breadcrumb navigation
4. Wrap tool content in `page-layout` 3-column grid
5. Add standard footer
6. Replace hardcoded dark-mode colors in inline `<style>` with CSS variables
7. Add theme toggle + mobile menu JS at bottom

**Key regex patterns:**
- Header replacement: Match from `<header class="main-header">` to `</header>` and replace with standard template
- Footer: Add standard footer before closing `</div>` (the #app div)
- Inline style fixes: Replace `rgba(255, 255, 255, 0.1)` → `var(--border-hover)`, etc.

**Step 2: Run script**

```bash
powershell -File scripts/batch-update-tools.ps1
```

**Step 3: Manually verify 3 representative pages**

- Check `src/tools/pdf/compress/index.html` (PDF tool)
- Check `src/tools/finance/mortgage-refinance/index.html` (Finance tool)
- Check `src/tools/dev/json-formatter/index.html` (Dev tool)

Verify:
- [ ] Full header with nav, privacy badge, theme toggle
- [ ] Breadcrumb correct for each tool's category
- [ ] 3-column layout wrapping tool content
- [ ] Footer present and styled
- [ ] No broken JS hooks (form submit, data-tool attributes preserved)
- [ ] Inline styles use CSS variables

**Step 4: Commit**

```bash
git add src/tools/
git commit -m "feat: batch-update all 17 tool pages with standard layout, theme support, 3-col ads"
```

---

## Task 8: Batch-Update All Blog Pages

**Files:**
- Modify: All 4 `src/blog/*.html` files
- Modify: All 25 `src/blog/articles/*.html` files
- Script: PowerShell batch replacement

**Step 1: Write PowerShell script for blog pages**

Similar to Task 7 but for blog layout:
1. Standard header with nav, theme toggle
2. FOUC prevention
3. 3-column grid: ad-rail + article content + ad-rail
4. Mid-content ad between article sections
5. Standard footer
6. Replace hardcoded colors in inline styles

**Step 2: Run and verify**

**Step 3: Commit**

```bash
git add src/blog/
git commit -m "feat: batch-update all 29 blog pages with standard layout and theme support"
```

---

## Task 9: Update main.css for Light Theme Compatibility

**Files:**
- Modify: `src/styles/main.css`

**Step 1: Update Tailwind component overrides**

The `main.css` uses `@apply` with hardcoded dark-mode Tailwind classes. Update:

```css
.input-field {
  @apply w-full h-12 px-4 text-current border rounded-lg
         placeholder:text-gray-500
         focus:outline-none
         transition-all duration-200;
  background: var(--bg-secondary);
  border-color: var(--border-default);
}
.input-field:hover {
  border-color: var(--border-hover);
}
.input-field:focus {
  border-color: var(--accent-primary);
  box-shadow: 0 0 0 2px var(--accent-glow);
}
```

Similarly update `.glass`, `.feature-card`, `.stat-card`, `.alert-*`, `.tag`, `.tag-accent`, `.ad-container-refined` to use CSS variables.

**Step 2: Commit**

```bash
git add src/styles/main.css
git commit -m "feat: update main.css Tailwind components for dual theme compatibility"
```

---

## Task 10: Update PWA Manifest & Meta Tags

**Files:**
- Modify: `public/manifest.json`
- Modify: `index.html` (meta tags)

**Step 1: Update manifest.json**

```json
{
  "background_color": "#F8F9FA",
  "theme_color": "#4F46E5"
}
```

(Changed from black background to light, and from neon green to indigo accent — matches both themes better)

**Step 2: Update favicon references**

After creating transparent logos (Task 3), update favicon references to use the transparent version:
- `public/apple-touch-icon.png` → copy from transparent `logo-bird.png`
- All PWA icons in `static/icons/` → regenerate from transparent source

**Step 3: Commit**

```bash
git add public/manifest.json static/icons/ index.html
git commit -m "feat: update PWA manifest and favicon for dual theme support"
```

---

## Task 11: Update layout/index.mjs Component

**Files:**
- Modify: `src/components/layout/index.mjs`

**Step 1: Update createHeader() to include theme toggle**

Add theme toggle button to the header HTML generated by `createHeader()`.

**Step 2: Update createFooter() to use standard footer**

Replace the minimal Turkish footer with the standard English footer matching `index.html`.

**Step 3: Ensure all generated HTML uses CSS variable-compatible classes**

**Step 4: Commit**

```bash
git add src/components/layout/index.mjs
git commit -m "feat: update layout component with theme toggle and standard footer"
```

---

## Task 12: Final Testing & Polish

**Files:**
- All modified files

**Step 1: Run Vite dev server**

```bash
cd zero-tools-platform && npm run dev
```

**Step 2: Test checklist**

- [ ] Home page loads in light mode (system preference light)
- [ ] Home page loads in dark mode (system preference dark)
- [ ] Theme toggle switches correctly
- [ ] Theme persists across page navigation
- [ ] Logo renders without black background on both themes
- [ ] Header is consistent on all tool pages
- [ ] Footer is consistent on all pages
- [ ] 3-column ad grid displays on desktop (1200px+)
- [ ] Ad rails collapse on mobile
- [ ] Tool forms still function (submit, calculate, download)
- [ ] Blog articles render correctly
- [ ] Breadcrumb navigation works
- [ ] About/FAQ accordion opens/closes
- [ ] Mobile menu works
- [ ] Language switcher works
- [ ] Text contrast ≥ 4.5:1 on both themes
- [ ] Focus rings visible on both themes
- [ ] No console errors

**Step 3: Run build**

```bash
npm run build
```

Verify no build errors.

**Step 4: Commit all final fixes**

```bash
git add -A
git commit -m "polish: final testing fixes for dual theme redesign"
```

---

## Task 13: Deploy

**Step 1: Push to main**

```bash
git push origin main
```

**Step 2: Verify Vercel deployment**

Wait for Vercel build to complete, then check:
- https://www.mc-novatools.com/ — light/dark toggle works
- https://www.mc-novatools.com/tools/pdf/compress/ — tool page layout
- https://www.mc-novatools.com/blog/ — blog layout
- Google Search Console — submit URL for re-indexing to pick up new favicon

---

## Execution Order Summary

| Task | Description | Est. Complexity |
|------|-------------|----------------|
| 1 | Light theme CSS variables | Medium |
| 2 | Convert component styles to variables | Large |
| 3 | Fix logo rendering (transparent PNGs) | Medium |
| 4 | Theme toggle button + JS | Small |
| 5 | Redesign home page layout | Large |
| 6 | Standard tool page template | Medium |
| 7 | Batch-update 17 tool pages | Large (scripted) |
| 8 | Batch-update 29 blog pages | Large (scripted) |
| 9 | Update main.css for dual theme | Small |
| 10 | Update PWA manifest & meta | Small |
| 11 | Update layout/index.mjs | Small |
| 12 | Final testing & polish | Medium |
| 13 | Deploy | Small |

**Total: 13 tasks, ~50+ files modified**
