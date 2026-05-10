# Phase 9 Ad and Revenue Strategy

Last updated: 2026-05-10

## Production rule

Advertising, sponsored, affiliate, and premium plan surfaces must stay visually and functionally separate from tool inputs, form controls, download/copy buttons, and primary CTAs. The implementation baseline is a minimum `150px` separation; shared revenue styles reserve `9.5rem` vertical spacing so the rule remains true at a normal `16px` root font size.

## Ad layout map

| Surface | Desktop placement | Mobile placement | Guardrail |
| --- | --- | --- | --- |
| Home/category pages | Optional leaderboard below the hero and above non-critical content | Optional 320x100 top banner below hero copy | Do not place ads between a heading and its primary CTA. |
| Tool pages | One slot below the workspace card or above related reading; optional sidebar only when a real sidebar layout exists | One in-flow slot below the workspace card or above related tools | Never place ads beside, above, or inside input/dropzone/form controls. |
| Blog articles | In-content responsive slot between content sections or after FAQ | 300x250/responsive in-flow slot between paragraphs/sections | Keep the slot at least 150px away from article CTA blocks. |
| Sticky/anchor | Disabled by default for manual components | If enabled later, show only after scroll, provide a visible close button, and keep it clear of navigation/form controls | Prefer official AdSense anchor formats and re-check policy before launch. |

## AdSense technical plan

- Publisher ID: `ca-pub-5738022526587953`.
- Authorized sellers record is kept in `ads.txt` and `public/ads.txt`.
- AdSense bootstrap is asynchronous and must be gated by:
  - production host (`mc-novatools.com`),
  - valid numeric slot IDs,
  - no Do Not Track / Global Privacy Control block,
  - advertising consent from the future CMP.
- `data-ad-status="unfilled"` or `fallback` hides the nearest ad container to prevent empty skeletons from degrading UX.
- Placeholder space is reserved before script load to reduce CLS.

## Alternative revenue channels

### Sponsored content

Use `sponsored-content-card` / `createSponsoredContentCard()` only with a visible `Sponsored` label and a different surface color from editorial cards. Sponsored blocks must not mimic article recommendations.

### Affiliate links

Affiliate links must include:

```html
<a class="nt-affiliate-link" rel="sponsored noopener" data-affiliate="true" data-affiliate-placement="article" href="https://example.com">Partner link</a>
```

`src/js/affiliate.js` normalizes the relationship attributes and emits aggregate click metadata through `window.umami.track()` when available, otherwise through a local `novatools:affiliate-click` event.

### Premium API plans

Premium API CTAs use `premium-plan-cta` / `createPremiumPlanCta()` and must be styled separately from ad inventory. Do not imply that a premium API exists until the actual product and terms are ready.

## AdSense application readiness checklist

- Legal pages include advertising data and third-party ad cookie disclosures.
- Navigation, category pages, blog pages, and tool routes build successfully.
- Blog/content quality cleanup is complete before application.
- Site runs for at least 2-4 weeks with stable, high-quality content before applying.
- If ad serving is limited after approval, keep manual slot count conservative and monitor fill states.
