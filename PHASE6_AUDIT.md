# Phase 6 Better Ads, Core Web Vitals, Mobile, and Accessibility Audit

## Scope completed

This phase audited and tightened source HTML templates, JavaScript ad initialization, shared CSS ad presentation rules, and build-time ad head configuration for Better Ads compliance, Core Web Vitals readiness, mobile usability, and WCAG 2.1 AA guardrails. The implementation stays within CSS, JavaScript, HTML templates, and ad placement configuration.

## References

- Better Ads Standards: https://www.betterads.org/standards/
- Core Web Vitals: https://web.dev/vitals/
- Google AdSense ad placement policies: https://support.google.com/adsense/answer/11188578
- WCAG 2.1 Quick Reference: https://www.w3.org/WAI/WCAG21/quickref/

## Ad density calculation method

Mobile viewports audited: 320px, 360px, 375px, 390px, and 414px wide.

Mobile formula: total rendered pixel height of ad units above the fold divided by viewport height. Required maximum: 0.30 or 30 percent.

Desktop viewports audited: 1024px and wider.

Desktop formula: total rendered pixel height of ad units in the initial viewport divided by viewport height. Required maximum: 0.40 or 40 percent.

Home page type result: no live AdSense unit appears above the fold. Mobile calculation: 0px / 667px = 0.00. Desktop calculation: 0px / 768px = 0.00.

Category page type result: no live AdSense unit appears above the fold. Mobile calculation: 0px / 667px = 0.00. Desktop calculation: 0px / 768px = 0.00.

Tool page type result: the reusable tool template retains only a post-FAQ 728x90 leaderboard below primary content. Mobile above-the-fold calculation: 0px / 667px = 0.00. Desktop initial viewport calculation: 0px / 768px = 0.00.

Islamic Calendar tool result: the existing 300x250 in-content slot remains after the page title and countdown cards, not between the h1 and the primary content action. Conservative mobile above-the-fold calculation for the audited 667px mobile height is 0px / 667px = 0.00 because the slot is below the initial hero/countdown region. Desktop initial viewport calculation is 0px / 768px = 0.00 for the same reason.

News Summarizer tool result: the sidebar 300x250 slot is inside the sidebar after trending content and is hidden on mobile by the global sidebar ad rule. Mobile calculation: 0px / 667px = 0.00. Desktop calculation: 250px / 768px = 0.33 if visible in the initial sidebar viewport, which is below the 0.40 desktop limit and is not adjacent to the primary action.

Blog article type result: the generated in-content 728x90 leaderboard appears inside article content after body content is rendered, not between the article h1 and the reading action. Mobile calculation: 0px / 667px = 0.00 when above fold; if encountered later, the capped mobile slot is 100px / 667px = 0.15. Desktop calculation: 90px / 768px = 0.12 when visible, below the 0.40 threshold.

Legal/public page type result: no live AdSense unit appears above the fold. Mobile calculation: 0px / 667px = 0.00. Desktop calculation: 0px / 768px = 0.00.

## Ad units modified

Reusable tool template post-FAQ leaderboard:
Before: 728x90 AdSense slot had explicit dimensions but wrapper did not cap max-height.
After: wrapper and ins element reserve min-width, min-height, max-height, aspect-ratio, and overflow hidden at 728x90 desktop and capped responsive sizing on mobile.

Blog article in-content leaderboard:
Before: generated ins element reserved 728x90 but did not have a fixed overflow-hidden wrapper in the template string.
After: generated slot is wrapped in an overflow-hidden ad wrapper with min-width, min-height, max-height, and aspect-ratio before AdSense loads.

Islamic Calendar in-content rectangle:
Before: 300x250 slot reserved width, height, min-height, and aspect-ratio, but wrapper lacked max-height and explicit overflow hidden in the source template.
After: wrapper and ins element cap at 300x250 with max-height and overflow hidden so ad fill cannot push surrounding content.

News Summarizer sidebar rectangle:
Before: 300x250 slot reserved width, height, min-height, and aspect-ratio, but wrapper lacked max-height and explicit overflow hidden in the source template.
After: wrapper and ins element cap at 300x250 with max-height and overflow hidden. Sidebar-format ads remain hidden on mobile.

JavaScript-created ad slots:
Before: generated wrappers and ins elements reserved width and height but did not set max-height on every generated element.
After: generated wrappers and ins elements include max-height, min-width, min-height, aspect-ratio, and overflow hidden.

Runtime-reserved inline ad slots:
Before: runtime reservation applied width, height, min-width, min-height, and aspect-ratio.
After: runtime reservation also applies max-height to the ins element and an overflow-hidden max-height cap to the closest ad container.

Build-time AdSense head configuration:
Before: renderAdSenseHead emitted the AdSense account meta tag and an async AdSense script tag into generated heads.
After: renderAdSenseHead emits the account meta tag plus dns-prefetch only. Runtime AdSense loading remains consent-gated and idle/lazy through existing JavaScript.

## Deceptive placement compliance

No remaining live AdSense unit is styled as a button, download control, submit button, notification, or content continuation link.

All ad containers use a visible 1px border with a contrasting slate border token.

All ad containers have at least 16px separation from surrounding content. Existing policy-safe large vertical spacing remains for in-content revenue cards.

Every live ad unit has an Advertisement/Reklam label, either in source markup or inserted by the ad initialization code before loading.

No live ad unit is inside a form element, tool control panel, or button.

No live ad unit is placed between a page h1 and the primary tool interface or article action.

## Layout shift prevention

All live source AdSense placements now have explicit width and height attributes.

All live source AdSense placements reserve min-width, min-height, max-height, aspect-ratio, and overflow hidden before the ad script can fill.

Shared CSS enforces ad slot box sizing, width limits, min-height, max-height, and overflow hidden for leaderboard, rectangle, sticky, and sidebar formats.

Runtime reservation in src/core/ads/adsense-config.mjs, src/i18n.js, and public/i18n.js now applies max-height and caps the closest ad container.

The generated AdSense head no longer inserts an early ad script. This reduces third-party work during initial rendering and keeps ad loading consent-gated.

## Core Web Vitals optimizations applied

AdSense script loading was moved out of the generated head path and remains consent-gated, idle-scheduled, and lazy-loaded. Estimated impact: reduced initial third-party script contention and lower LCP/TBT risk on pages with ad slots.

Ad containers now reserve final dimensions with max-height. Estimated impact: lower CLS risk from responsive ad fill.

All source HTML documents now include dns-prefetch for pagead2.googlesyndication.com. Estimated impact: prepares DNS resolution without loading ad script early.

All external script tags with src that were not async, defer, text/plain consent placeholders, JSON-LD, JSON data, or type module were updated to defer. Estimated impact: fewer parser-blocking script loads.

Existing Google Fonts URLs retain display=swap. Pages using Google Fonts include preconnect coverage for fonts.googleapis.com and fonts.gstatic.com where applicable. Estimated impact: less font connection latency and lower FOIT risk.

Existing image optimization behavior is preserved: generated blog images use SVG/WebP-capable helpers where available, source image tags use decoding async patterns, and non-critical images are lazy-loaded by existing template/build logic.

Skip navigation CSS was added to the critical stylesheet so the accessibility affordance is available before non-critical CSS loads.

## Mobile usability checklist

Viewport meta tags were audited and retained as width=device-width, initial-scale=1.0.

Buttons, role=button elements, button-like links, nav links, tool card links, category card links, and form button inputs have a minimum 48px touch target rule.

Ad close buttons now reserve 48px by 48px.

Inputs, selects, and textareas enforce at least 16px font size to prevent iOS zoom.

Global horizontal overflow protection remains in place with max-width and overflow-x clipping.

Mobile sidebar ads are hidden. Mobile leaderboard slots are capped at 100px, which is 14.99 percent of a 667px mobile viewport and below the 30 percent threshold.

## Accessibility checklist

Skip navigation links are present in source HTML templates and are visible on focus through the shared critical CSS rule.

Focus-visible indicators have a minimum 2px outline and 2px offset.

Ad regions use complementary semantics or accessible labels where applicable.

Ad labels remain visible above ad inventory.

Form input labeling was preserved. No ad was inserted inside a form or control group.

Images retain existing alt text. Decorative author/logo imagery that already used empty alt remains decorative.

Interactive controls remain reachable through normal document order. Deferring external scripts does not remove semantic controls from the DOM.

Color contrast guardrails were preserved by using existing high-contrast dark theme tokens for body text, labels, focus rings, and ad borders.

## Commands run for this audit

Repository/ad pattern inspection was performed with ripgrep over HTML, CSS, JS, and MJS source files.

A source script audit confirmed no remaining non-async/non-defer external script src tags outside JSON-LD, JSON data, text/plain consent placeholders, and type module scripts.

A source skip-link audit confirmed source HTML templates have skip links, with the towing documentation package retaining its existing #main target.

## Remaining risks and manual QA

Final ad density should still be manually verified in Chrome DevTools at 320px, 375px, 414px, 768px, 1024px, and wider desktop widths after production deployment because real AdSense fill behavior depends on consent state, inventory, and network timing.

Run Lighthouse against deployed pages with production consent states because lab metrics in a local build do not fully represent third-party ad fill timing.

Manually inspect the Islamic Calendar, News Summarizer, generated blog articles, category pages, and legal pages for visual spacing, keyboard tab order, and absence of horizontal scrolling.
