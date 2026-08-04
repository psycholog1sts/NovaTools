# AdSense Final Reapplication Protocol

> **4 Ağustos 2026 güncellemesi:** Güncel CMP, reklam kodu, sahte slot önleme,
> Auto Ads ve organik büyüme kuralları için
> [adsense-growth-operating-plan-2026-08-04.md](./adsense-growth-operating-plan-2026-08-04.md)
> esas alınmalıdır. Site içi özel çerez paneli Google sertifikalı reklam CMP'si
> değildir; EEA, UK ve İsviçre reklam trafiği için Google AdSense hesabındaki
> sertifikalı IAB TCF mesajı yayınlanmalıdır.
 — Phase 10

**Site:** `https://mc-novatools.com`  
**Prepared for:** Final pre-submission QA, AdSense compliance review, and rejection recovery planning  
**Prepared on:** 2026-06-03  
**Submission rule:** Do **not** apply or reapply until every item marked **Manual required** is verified by the site owner in production tools such as Google Search Console, AdSense, and an external duplicate-content scanner.

## Audit status legend

- `[x] Automated pass` — verified in this repository with a deterministic command or file inspection.
- `[ ] Manual required` — cannot be truthfully verified from the local repository because it depends on live production, third-party accounts, traffic history, or human editorial review.
- `[~] Conditional / review note` — repository evidence exists, but a human reviewer must confirm the production value or business decision before submission.

## Evidence collected in this pass

| Area | Evidence | Current result |
| --- | --- | --- |
| AdSense readiness script | `npm run audit:adsense` | Passed: 12 category pages and 129 tool pages detected |
| Tool content depth spot audit | Local word-count scan over `src/tools/**/index.html` | 131 tool pages found; minimum observed page length: 1,252 words |
| Blog content depth spot audit | Local word-count scan over `src/blog/articles/*.html` | 125 blog posts found; minimum observed article length: 1,417 words |
| Pillar guides | Local word-count scan over `guides/*.html` | 4 pillar guides found; minimum observed guide length: 3,553 words |
| Placeholder scan | Local scan for `Lorem ipsum`, `Coming soon`, and `Under construction` | No generic launch placeholders found; `Lorem ipsum` matches are legitimate generator/tool/article content and should be manually reviewed, not removed blindly |
| ads.txt | `public/ads.txt` | Live repository line present: `google.com, pub-5738022526587953, DIRECT, f08c47fec0942fa0` |
| Consent manager | `src/core/consent-manager.mjs` | Banner supports necessary, analytics, advertising, and functional choices; non-essential scripts load only after consent |

## Task 10.1 — Pre-submission audit checklist

### Content quality

| Status | Requirement | Verification notes |
| --- | --- | --- |
| [x] Automated pass | Minimum 30 indexed pages with substantial content | Repository has 131 tool pages, 125 blog article pages, 4 pillar guides, 12 category pages, and legal/trust pages. Confirm actual indexed count in Google Search Console before applying. |
| [x] Automated pass | Zero thin pages under 300 words of unique text | Local scans of tool, blog, and guide content found no pages below 300 words in those groups. |
| [ ] Manual required | Zero duplicate content; target maximum 15% similarity | Run Copyscape, Siteliner, or an equivalent external duplicate-content scanner against the live domain. Local word counts cannot prove originality or cross-site duplication. |
| [x] Automated pass | All tool pages have 1,200+ words | Local scan found minimum observed tool page length of 1,252 words. |
| [x] Automated pass | All blog posts have 1,000+ words | Local scan found minimum observed blog article length of 1,417 words. |
| [x] Automated pass | 4 pillar guides have 3,000+ words | Local scan found 4 guides, all above 3,000 words. |
| [~] Conditional / review note | Content is 100% original and not unedited AI-only content | Requires editorial attestation. Sample-check drafts, author notes, examples, screenshots, and any source history before submission. |
| [~] Conditional / review note | No placeholder text such as “Lorem ipsum,” “Coming soon,” or “Under construction” | No launch placeholders were found. `Lorem ipsum` appears in legitimate lorem generator pages and related explanatory content; review those pages manually so AdSense reviewers do not interpret them as unfinished content. |

### Trust signals and E-E-A-T

| Status | Requirement | Verification notes |
| --- | --- | --- |
| [~] Conditional / review note | About Us page live with real team information | Repository includes `about-us.html`; confirm live route returns HTTP 200 and team information is accurate. |
| [~] Conditional / review note | Contact page with working form or email | Repository includes `contact.html` and `iletisim.html`; confirm email delivery or form handling in production. |
| [x] Automated pass | Privacy Policy mentions AdSense and DoubleClick cookies explicitly | `privacy-policy.html` and generated legal content include Google AdSense, cookies, and opt-out language; confirm production deployment is current. |
| [x] Automated pass | Terms of Service live | `public/terms-of-service.html` and `kullanim-kosullari.html` exist in the repository. Confirm live HTTP 200. |
| [x] Automated pass | Disclaimer live | `public/disclaimer.html` and root `disclaimer.html` exist in the repository. Confirm live HTTP 200. |
| [~] Conditional / review note | Author pages with Person schema for all content creators | Author pages exist; manually verify every published content creator has an accurate public author profile and schema. |
| [~] Conditional / review note | Organization schema on every page | Structured-data scripts exist; run production rich-results spot checks after deployment. |

### Technical compliance

| Status | Requirement | Verification notes |
| --- | --- | --- |
| [ ] Manual required | All pages return HTTP 200 with no soft 404s | Run production crawl after deployment. Local static files do not prove CDN/hosting status. |
| [ ] Manual required | Sitemap submitted and validated in Google Search Console | Must be checked in GSC for `https://mc-novatools.com`. |
| [~] Conditional / review note | `robots.txt` not blocking important pages | `public/robots.txt` exists; verify live file and GSC robots tester. |
| [~] Conditional / review note | Canonical tags correct on every page | Local audit checks key public surfaces; perform live crawl for every production URL. |
| [ ] Manual required | Mobile usability: 0 errors in GSC | Must be checked in Google Search Console. |
| [ ] Manual required | Core Web Vitals: all “Good” in GSC | Must be checked in Google Search Console field data. |
| [ ] Manual required | HTTPS with valid SSL | Verify from production browser and SSL checker. |
| [ ] Manual required | No broken internal links | Run Screaming Frog, `npm run lint:site-links`, and `npm run audit:public-routes` after a fresh build/deploy. |

### Policy compliance

| Status | Requirement | Verification notes |
| --- | --- | --- |
| [ ] Manual required | No copyrighted material without permission | Requires human review of text, images, icons, and any third-party assets. |
| [x] Automated pass | No adult, gambling, or violence content detected in scoped scan | Local project category/content structure is utility, productivity, developer, image, PDF, and finance focused. Human review still recommended. |
| [x] Automated pass | No incentivized clicks or “please click ads” text | No such copy was identified in the scoped review. |
| [~] Conditional / review note | No deceptive navigation or ads disguised as content | Existing ad components should remain clearly labeled and disabled/gated until approval. Review production placement after AdSense approval. |
| [~] Conditional / review note | No aggressive pop-ups | Cookie banner is legal/consent related; verify it does not block core tool use on mobile. |
| [ ] Manual required | No malware or unwanted software | Run dependency/security checks and external safe-browsing checks before submission. |
| [ ] Manual required | Traffic is organic; no paid, bot, or incentivized traffic | Requires analytics, logs, and campaign review by the site owner. |

### AdSense-specific requirements

| Status | Requirement | Verification notes |
| --- | --- | --- |
| [x] Automated pass | Privacy Policy includes AdSense, cookies, DoubleClick-style advertising-cookie disclosure, and opt-out path | Policy text should be spot-checked live. Keep wording aligned with Google’s current required content guidance. |
| [x] Automated pass | Cookie consent banner implemented for EU traffic | Consent manager supports category-level consent and prevents non-essential script execution until accepted. Confirm banner appears for first-time visitors. |
| [x] Automated pass | `ads.txt` file created at root | `public/ads.txt` contains the active Google seller line. `docs/templates/ads.txt.template` provides a placeholder template for future account changes. |
| [~] Conditional / review note | Ad placement test pages prepared, but no ads live before approval | Ad components and gating exist. Confirm no production pages render live ads before approval or without valid consent where required. |

## Task 10.2 — AdSense application strategy

Apply only after all open manual items are resolved.

1. Go to `https://www.google.com/adsense/start`.
2. Sign in with the **exact same Google account email** that will own the AdSense account.
3. Enter the site URL exactly as: `https://mc-novatools.com`
   - Include `https`.
   - Do not add a trailing slash.
   - Do not submit a staging, preview, or alternate host.
4. Select the primary site language:
   - Recommended default: **English**, if English is the primary public content and application target.
   - Use Turkish only if Turkish becomes the primary reviewed language and content corpus.
5. Recommended site category:
   - Primary: **Tools & Utilities** when available.
   - Fallback: **Computers & Electronics**.
6. Recommended description:

> MC NovaTools provides free browser-based utilities for PDF processing, image optimization, developer tools, and finance calculations. All tools run client-side for maximum privacy. We publish in-depth guides and technical tutorials alongside our tools.

### Application screenshot guide

Use this as a capture checklist for the owner/operator. Do not include private account IDs or email addresses in shared screenshots.

| Step | Screenshot to capture | Acceptance criteria |
| --- | --- | --- |
| 1 | AdSense landing/sign-in screen | Shows the correct Google account selected; redact email before sharing externally. |
| 2 | Site URL field | URL is exactly `https://mc-novatools.com`, no trailing slash. |
| 3 | Language/category screen | Primary language and category match the strategy above. |
| 4 | Site description or business info screen | Description matches the approved copy and avoids exaggerated claims. |
| 5 | Review/submit screen | No staging URL, typo, or extra domain appears. |
| 6 | Post-submit confirmation | Shows application submitted or review pending; capture date and status. |
| 7 | AdSense home status page | Daily screenshot during review window with date visible or logged separately. |

## Task 10.3 — Post-application monitoring

- Check status daily at `https://www.google.com/adsense/new/u/0/home`.
- Typical review planning window: **7–21 days**. Treat this as an operational estimate, not a guarantee.
- Keep a dated log with:
  - Status text.
  - Screenshot filename.
  - Any policy or readiness messages.
  - Any site changes made during review.
- If rejected, do **not** immediately reapply.
  - Wait 3–4 weeks for ordinary remediation.
  - Wait 30 days if this is a repeat rejection or if the reason is broad/unclear.
  - Fix the specific issue category before resubmitting.

### Rejection triage map

| Rejection reason | Immediate response | Evidence to gather |
| --- | --- | --- |
| Low value content | Re-run content depth checks, compare thin pages, add edited examples/screenshots, strengthen internal links. | Word-count report, editorial review notes, list of expanded pages. |
| Site not ready | Re-run production crawl, route audit, sitemap/GSC checks, SSL checks, and robots/canonical checks. | Crawl export, GSC screenshots, build/audit logs. |
| Policy violation | Review prohibited content, deceptive layout, ad behavior, copyright, consent, and privacy disclosures. | Policy checklist, legal-page screenshots, asset/source review. |
| Duplicate/scraped content | Run external duplicate scanner and rewrite or remove overlapping sections. | Copyscape/Siteliner export, rewrite log. |
| Navigation or broken pages | Fix internal links, orphan pages, soft 404s, and category/tool route consistency. | Screaming Frog export, route audit output. |

## Task 10.4 — Contingency plan if rejected again

1. Wait **30 days** before reapplying.
2. Add **10 more edited blog posts** using the recovery calendar in `docs/templates/adsense-post-rejection-content-calendar.csv`.
3. Expand **5 more tool pages** to at least 1,200 words with examples, limitations, FAQs, and privacy notes.
4. Build **5 relevant backlinks** from legitimate developer forums, tool directories, educational resources, or partner pages.
   - Do not buy links.
   - Do not use bot traffic.
   - Do not use irrelevant anchors or spam directories.
5. Reapply only after a fresh production crawl and checklist review.
6. Optional reapplication note:

> Site completely rebuilt with expanded content, stronger editorial review, verified public routes, updated legal disclosures, and a professional browser-first utility structure.

## ads.txt template

The live repository file is `public/ads.txt`. For a new or changed AdSense publisher account, use the template in `docs/templates/ads.txt.template` and replace the placeholder with the approved publisher ID:

```txt
google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0
```

Current repository value:

```txt
google.com, pub-5738022526587953, DIRECT, f08c47fec0942fa0
```

## Cookie consent banner implementation reference

The production consent manager is implemented in `src/core/consent-manager.mjs`. It stores a category-based choice, keeps necessary storage enabled, and dispatches consent-update events that AdSense bootstrap code can listen for.

Minimal standalone implementation pattern for review or future templates:

```html
<section id="novatools-consent-banner" class="consent-banner" aria-label="Cookie choices">
  <div>
    <strong>Cookie choices</strong>
    <p>Necessary storage is always on. Analytics, advertising, and functional storage load only after consent.</p>
  </div>
  <button type="button" data-consent="settings">Cookie Settings</button>
  <button type="button" data-consent="reject">Reject non-essential</button>
  <button type="button" data-consent="accept">Accept all</button>
</section>
<script type="module">
  const defaultConsent = { necessary: true, analytics: false, advertising: false, functional: false };
  const saveConsent = (consent) => {
    localStorage.setItem('novatools_cookie_consent', JSON.stringify({ ...defaultConsent, ...consent }));
    window.dispatchEvent(new CustomEvent('novatools:consent-updated', { detail: consent }));
  };
  document.querySelector('[data-consent="reject"]')?.addEventListener('click', () => saveConsent(defaultConsent));
  document.querySelector('[data-consent="accept"]')?.addEventListener('click', () => saveConsent({ necessary: true, analytics: true, advertising: true, functional: true }));
</script>
```

Implementation checklist:

- Necessary storage remains enabled.
- Advertising and analytics are disabled by default.
- User can reject non-essential categories without losing access to core tools.
- User can reopen settings from legal footer links.
- Consent choices are not treated as permission to upload private tool inputs.

## Rejection response templates

### Template A — Low value content

Subject: AdSense re-review request after content expansion

Hello Google AdSense team,

Thank you for reviewing MC NovaTools. We reviewed the low-value-content feedback and completed a remediation pass before requesting another review. We expanded tool explanations, strengthened original examples, reviewed article depth, improved internal links, and confirmed that the site contains substantial browser-based utility pages, guides, and tutorials. We also checked for placeholder text and thin pages before resubmission.

Please re-review `https://mc-novatools.com` when eligible.

### Template B — Site not ready

Subject: AdSense re-review request after readiness fixes

Hello Google AdSense team,

Thank you for the site-readiness feedback. We completed a production readiness review for MC NovaTools, including route availability, sitemap/robots checks, canonical review, mobile usability checks, broken-link checks, and legal/trust page verification. The site is now ready for another review at `https://mc-novatools.com`.

### Template C — Policy violation

Subject: AdSense re-review request after policy compliance review

Hello Google AdSense team,

Thank you for identifying policy concerns. We completed a policy compliance review covering prohibited content, copyright risk, deceptive navigation, ad placement behavior, cookie consent, privacy disclosures, and user trust pages. We corrected the issues identified and verified that the site remains a privacy-first browser utility platform.

Please re-review `https://mc-novatools.com` when eligible.

### Template D — Duplicate or insufficient originality

Subject: AdSense re-review request after originality review

Hello Google AdSense team,

Thank you for the feedback. We completed an originality review, removed or rewrote overlapping sections, strengthened examples based on MC NovaTools workflows, and verified the updated pages with duplicate-content checks before resubmission. The revised content is intended to be practical, original, and useful for visitors using browser-based tools.

### Template E — Broken pages or navigation

Subject: AdSense re-review request after navigation and route fixes

Hello Google AdSense team,

Thank you for reviewing MC NovaTools. We audited internal navigation, category links, tool URLs, sitemap entries, canonical tags, and broken routes. We fixed the readiness issues found and verified that public pages are reachable on the production domain.

Please re-review `https://mc-novatools.com` when eligible.

## Final go/no-go gate

Do not apply until these production-only checks are marked complete by the site owner:

- [ ] GSC indexed pages comfortably exceed 30 substantial pages.
- [ ] GSC sitemap status is valid.
- [ ] GSC mobile usability has 0 unresolved errors.
- [ ] GSC Core Web Vitals are Good or any non-Good URLs have documented fixes in progress.
- [ ] External duplicate-content scan is acceptable.
- [ ] Live crawl returns 0 internal 404s and no soft 404s.
- [ ] Contact route works and support email/form delivery is verified.
- [ ] Live privacy/cookie/legal pages match the repository version.
- [ ] No live ads are displayed before approval, except approved AdSense verification snippets if required by Google.
- [ ] Traffic sources have been reviewed for organic legitimacy.

## Official references used

- Google AdSense Help — Required content / privacy-policy disclosures: `https://support.google.com/adsense/answer/1348695`
- Google AdSense Help — ads.txt guide and example line format: `https://support.google.com/adsense/answer/12171612`
- Google AdSense Help — Privacy & messaging for privacy regulations: `https://support.google.com/adsense/answer/10924669`
