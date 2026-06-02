# Phase 6 Better Ads and Core Web Vitals Audit

## Scope completed

This phase audited source HTML templates, JavaScript ad initialization, CSS ad presentation rules, and static public page heads for Better Ads compliance, ad layout stability, mobile usability, accessibility guardrails, and Core Web Vitals readiness.

## Google and Coalition references used

- Better Ads Standards: https://www.betterads.org/standards/
- Core Web Vitals: https://web.dev/vitals/
- Google AdSense placement policies reference requested for this phase: https://support.google.com/adsense/answer/11188578

## Ad density calculation method

Mobile audit method:

- Viewports considered: 320px, 360px, 375px, 390px, 414px wide.
- Above-the-fold height baseline: first viewport height before scroll.
- Maximum allowed mobile ad area above the fold: 30 percent of viewport height.
- Formula used for a rendered ad slot: visible ad slot height above fold divided by viewport height.
- Conservative mobile threshold example: 100px leaderboard / 667px viewport = 14.99 percent; 250px rectangle / 667px viewport = 37.48 percent and is therefore not allowed above the fold.

Desktop audit method:

- Desktop above-the-fold content area is the visible main content viewport excluding browser chrome.
- Maximum allowed desktop ad area above the fold: 40 percent of visible content area for this phase.
- Formula used for desktop placements: visible ad slot area above fold divided by visible content area above fold.
- Sidebar and rail placements before the title or primary action were treated as non-compliant regardless of area because they could appear before the user reaches the tool controls.

Result:

- Removed all three-up 336x280 placeholder rows that appeared inside converter/text tool control cards before primary controls.
- Removed disabled ad placeholders and rail shells from PDF/blog pages and the reusable tool template.
- Left only post-content or sidebar content ads that are clearly labeled, separated, and dimension-reserved.
- Mobile sidebar-format ad slots are hidden by CSS, and mobile leaderboard slots are capped at 100px reserved height.

## Ad units modified

- Removed the three 336x280 placeholder ad boxes from every converter and text tool page that placed ads inside the tool card before the primary input/action. Affected source routes include all `src/tools/converters/*/index.html` and all `src/tools/text/*/index.html` pages that used `.ads-row`.
- Restyled and dimension-reserved the Islamic Calendar in-content AdSense slot. It now uses an `Advertisement` label, a bordered wrapper, at least 8px separation through the global ad spacing rules, explicit `width` and `height` attributes, `min-height`, and `aspect-ratio`.
- Restyled and dimension-reserved the News Summarizer sidebar AdSense slot. It now uses an `Advertisement` label, a bordered wrapper, explicit `width` and `height` attributes, `min-height`, and `aspect-ratio`.
- Updated the blog article template in-content ad to a 728x90 leaderboard reservation with explicit `width`, `height`, `min-height`, and `aspect-ratio`.
- Updated the reusable `docs/tool-template.html` ad example by removing left and right ad rails and retaining only a post-FAQ leaderboard slot after primary content.
- Removed disabled ad placeholders from PDF converter pages and legacy finance blog articles so empty ad-looking boxes no longer appear in article headers, inline article bodies, or side rails.
- Changed the ad-blocker tester bait element so it no longer uses the production `adsbygoogle` class; it now uses a non-AdSense test class and remains separate from real ad inventory.
- Updated the JavaScript ad slot factory to default labels to `Advertisement`, always reserve dimensions, keep a visible border, and avoid unlabeled header slots.
- Updated ad initialization to reserve dimensions and insert a localized `Advertisement` or `Reklam` label when an existing slot lacks one.

## Deceptive placement audit result

- No remaining live ad unit is styled as a download button, next-page button, system notification, or content continuation link.
- No remaining live ad unit is placed between a page title and the primary content action.
- No remaining live ad unit is placed inside a tool form/control panel.
- Ad labels are visible above ad inventory through `.ad-label` and JavaScript label enforcement.
- Ad wrappers use a visible border and enforced spacing.

## Layout shift prevention applied

- All remaining `ins.adsbygoogle` source placements now include explicit `width` and `height` attributes or are generated with those attributes.
- Global ad CSS reserves expected dimensions with `min-height` and `aspect-ratio` before ad scripts load.
- JavaScript ad bootstrap applies missing width, height, `min-height`, and `aspect-ratio` values before lazy-loading ads.
- Empty or fallback ad status no longer collapses reserved ad containers in the core AdSense observer, preventing late upward layout shift.

## Core Web Vitals optimizations applied

- Added a build-time inline critical CSS block for above-the-fold shell, header, hero, image sizing, typography inheritance, and focus visibility.
- Deferred non-critical stylesheets in the post-build HTML pass by converting non-critical CSS links to preload plus noscript stylesheet fallback.
- Removed direct AdSense script injection from generated heads. Production AdSense now loads lazily after consent and only when valid ad slots exist.
- Added AdSense DNS prefetch metadata instead of a render-blocking or early third-party ad script.
- Preserved Google Fonts `display=swap` usage and added build-time font preconnect tags.
- Added `decoding="async"` to image tags across source HTML.
- Added lazy loading to non-logo, non-hero images across source HTML.
- Added `fetchpriority="high"` to eager article hero images and build-time enforcement that only the first hero image keeps high priority.
- Reused existing WebP logo variants where already available and wrapped raster logo references with WebP `picture` fallbacks without adding new binary image assets to the PR diff.
- Replaced the static cache-only service worker with a Workbox-powered service worker that precaches critical shell assets and applies cache-first handling for same-origin styles, scripts, fonts, and images plus network-first handling for navigations.

## Mobile usability improvements applied

- Added global horizontal overflow protection with `overflow-x: clip` and `max-width: 100%`.
- Added minimum 48px touch target sizing to buttons, button-like links, nav links, task chips, tool card links, and form submit/reset/button inputs.
- Enforced at least 16px font size for inputs, selects, and textareas to avoid iOS form zoom.
- Existing viewport meta tags were preserved; build/static routes continue using `width=device-width, initial-scale=1.0`.

## Accessibility improvements applied

- Added global visible `:focus-visible` outlines.
- Added or preserved image `alt` text and `decoding="async"` attributes across source HTML.
- Preserved semantic ad containers as complementary regions with explicit labels where applicable.
- Kept interactive ad-close controls keyboard operable and gave them accessible labels.
- Removed ad-looking disabled boxes that could be mistaken for content or controls.

## Remaining risks and manual QA

- Automated source checks verify placement patterns, dimensions, and labels, but final ad density should still be manually validated in Chrome DevTools at 320px, 360px, 375px, 390px, and 414px widths after production build deployment.
- The Workbox service worker is copied from `public/sw.js` during build; verify the final `dist/sw.js` in deployment and confirm service worker update behavior in a clean browser profile.
- Run a production Lighthouse pass after deploy because real AdSense fill behavior and field Core Web Vitals depend on network, consent state, and third-party response timing.
