# Professional Site Master Checklist — 2026-08-04

This document separates what the repository now enforces automatically from what requires production data or access to Google accounts. No checklist can guarantee rankings under unknown future algorithms; the durable strategy is useful original functionality, crawlable pages, honest metadata, fast interaction, accessible controls and policy-safe monetization.

## Automatically enforced in CI

### Build and route integrity

- [x] ESLint.
- [x] Unit and site regression tests.
- [x] Production build.
- [x] Public route audit.
- [x] Sitemap and internal-link validation.
- [x] Blog route, outline, seed and image checks.
- [x] RSS freshness.
- [x] Critical CSS present in every built HTML page.
- [x] Structured data build validation.

### Performance and page experience

- [x] First-load JavaScript transfer budget: at most 200 KB per page.
- [x] Linked CSS transfer budget: at most 50 KB per page.
- [x] HTML image-candidate budget: at most 500 KB per page.
- [x] Static media dimension audit.
- [x] Reserved advertising space to reduce layout shifts.
- [x] No added dependency for task journeys.
- [x] Core Web Vitals targets documented: LCP ≤2.5s, INP <200ms, CLS <0.1 at the 75th percentile.

### Search and algorithm resilience

- [x] No automatic meta-refresh redirect.
- [x] No forced browser-history forward navigation.
- [x] No push/replace-state trap inside a popstate handler.
- [x] No viewport setting that disables zoom.
- [x] No blocking copy or text selection.
- [x] Canonical and sitemap route regression checks.
- [x] Structured data must reflect visible content.
- [x] No fake ratings, testimonials or traffic claims allowed by repository rules.
- [x] No scaled low-value/doorway content allowed by repository rules.
- [x] Back-button freedom protected for Google’s June 2026 enforcement.

### Accessibility and retention

- [x] Existing page H1 is preserved; duplicate page chrome is blocked.
- [x] Shared accessible-name coverage for tool controls.
- [x] Keyboard focus styling.
- [x] Drop-zone and result-state normalization.
- [x] Turkish and English task-journey instructions.
- [x] Category-specific three-step next actions.
- [x] Recent-tool continuity stored only in validated browser-local data.
- [x] Stored text escaped before HTML insertion.
- [x] No user file/input content is logged by the journey layer.

### AdSense and privacy

- [x] AdSense readiness audit is required in CI.
- [x] Fake/manual slot identifiers removed.
- [x] Manual inventory remains disabled until verified slot IDs exist.
- [x] Duplicate loader detection.
- [x] Site cookie UI does not pretend to be Google ad consent.
- [x] Security dependency audit.
- [x] Intrusive or accidental-click ad placement prohibited by repository rules.

## Production-account checklist

These cannot be truthfully completed from source code alone.

### Google Search Console

- [ ] Verify all domain variants and select the canonical HTTPS property.
- [ ] Submit the current sitemap.
- [ ] Inspect the homepage, four flagship tools, categories and legal pages.
- [ ] Check Page Indexing, Manual Actions and Security Issues weekly.
- [ ] Review Core Web Vitals by mobile and desktop template.
- [ ] Export query/page performance monthly and consolidate zero-value pages.

### GA4 privacy-safe measurement

- [ ] Confirm consent mode and country behavior.
- [ ] Measure only tool_start, tool_success, workflow_step_click, return_visit and error state.
- [ ] Never send filenames, document content, pasted text, calculator inputs or generated output.
- [ ] Create funnels for entrance → tool start → success → next tool.
- [ ] Segment organic, direct and returning visitors.
- [ ] Retain only the data necessary for product decisions.

### AdSense

- [ ] Publish a Google-certified CMP message for required regions.
- [ ] Verify TCF v2.3 signals.
- [ ] Exclude legal, 404, accountless status and thin helper pages from Auto Ads.
- [ ] Preview mobile placements and protect the main tool action.
- [ ] Monitor policy center and invalid traffic.
- [ ] Change one placement variable at a time and compare viewability, RPM, tool success and CWV.

## Monthly human review

- [ ] Test the ten highest-traffic landing pages on a real mobile device.
- [ ] Complete the primary task and one next-step journey on each.
- [ ] Review internal search/site-guide queries for missing tools.
- [ ] Update or consolidate pages with declining impressions and no unique value.
- [ ] Verify all claims, dates, screenshots and disclaimers.
- [ ] Review third-party scripts and remove anything without measured value.
- [ ] Check broken links, redirect chains and orphan pages.
- [ ] Review revenue per successful journey—not revenue per raw pageview alone.

## Release rule

A release is eligible to merge only when security audit and the full `ci:validate` pipeline succeed. Production launch still requires a mobile visual check and account dashboards must show no policy, consent, manual-action or security error.
