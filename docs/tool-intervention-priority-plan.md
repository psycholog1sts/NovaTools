# Tool Intervention Priority Plan (P0 → P3)

This document turns the latest inventory into an execution-ready intervention plan.

## Scope and intent
- Keep changes phased and isolated.
- Protect i18n, routing, SEO, and build stability while improving tool reliability.
- Prioritize user trust, privacy, and legal sensitivity first.

## Execution order
1. Baseline validation: `npm run lint`, `npm test`, `npm run build`, `npm run audit:public-routes`.
2. P0 global shell checks (home/shared JS/CSS/i18n/nav).
3. P0 finance + security/privacy tools.
4. P1 PDF + image tools.
5. P1 category pages and cross-links.
6. P2 converters/dev/data/text tools.
7. P3 productivity/social/design tools.
8. Blog/legal/localized route QA pass.

## Priority groups

### P0 — Finance, tax, insurance, live-data, money tools
- `/finance/mortgage-refinance`
- `/finance/compound-interest`
- `/finance/live-exchange`
- `/finance/stock-lookup`
- `/finance/crypto-prices`
- `/finance/cloud-cost`
- Manifest-dışı source routes:
  - `src/tools/finance/crypto-tax/index.html`
  - `src/tools/finance/tax/index.html`
  - `src/tools/finance/life-insurance/index.html`
  - `src/tools/finance/retirement/index.html`
  - `src/tools/finance/student-loan/index.html`

### P0 — Security & privacy tools
- `/security/encrypt-decrypt`
- `/security/password-generator`
- `/security/password-strength`
- `/security/ssl-checker`
- `/security/hash-generator`
- `/security/jwt-decoder`
- `/security/ip-lookup`
- `/security/user-agent-parser`
- `/security/uuid-generator`
- `/security/ad-blocker-tester`

### P1 — PDF / file processing tools
- `/pdf/merge`, `/pdf/compress`, `/pdf/split`
- `/pdf/pdf-ocr`, `/pdf/pdf-page-number`
- `/pdf/pdf-to-excel`, `/pdf/pdf-to-html`, `/pdf/pdf-to-jpg`, `/pdf/pdf-to-png`
- `/pdf/pdf-to-powerpoint`, `/pdf/pdf-to-text`, `/pdf/pdf-to-word`, `/pdf/pdf-watermark`

### P1 — Image tools
- `/image/compress`, `/image/convert`, `/image/image-resizer`
- `/image/metadata-remover`, `/image/exif-viewer`
- `/image/image-to-webp`, `/image/image-to-avif`
- `/image/image-cropper`, `/image/image-watermark`
- `/image/image-rotator`, `/image/image-flipper`
- `/image/collage-maker`, `/image/background-remover`

### P1 — Converters/calculators
- `/converters/currency-converter`
- `/converters/scientific-calculator`
- `/converters/percentage-calculator`
- `/converters/unit-converter`
- `/converters/bmi-calculator`
- `/converters/age-calculator`
- `/converters/timezone-converter`
- `/converters/unix-timestamp`
- `/converters/number-base-converter`
- `/converters/roman-numerals`

### P2 — Developer, data/file utility, text/writing tools
- Developer: `/dev/*` listed in inventory.
- Data/file: `/data/*` listed in inventory.
- Text/writing: `/text/*` listed in inventory.

### P3 — Productivity, social, design tools
- Productivity: `/productivity/*` listed in inventory.
- Social: `/social/*` listed in inventory.
- Design: `/design/*` listed in inventory.

### P3 — Manifest-dışı tool-like pages
- `src/tools/news/summarizer/index.html`
- `src/tools/religious/islamic-calendar/index.html`
- `src/tools/request/index.html`

## Non-tool public pages priority

### P0 — Main / legal / trust pages
`/`, `/404.html`, `/about-us.html`, `/contact.html`, `/iletisim.html`, `/privacy-policy.html`, `/gizlilik-politikasi.html`, `/terms-of-service.html`, `/kullanim-kosullari.html`, `/cookie-policy.html`, `/security.html`, `/kvkk-aydinlatma-metni.html`, `/request-tool.html`

### P1 — Category pages
All `categories/*.html` routes, including localized variants.

### P1 — Localized surfaces
`/tr/*`, `/ar/*`, including root/category/tool localized copies.

### P2 — Blog & admin surfaces
- Blog index/template/articles and localized blog routes.
- Admin entry points: `/admin/`, `/admin/dashboard.html`.

## Risk register (carry-forward)
- Manifest/public-route mismatch risk (inventory noted 121 manifest tools vs 129 source public tool-like pages).
- Dirty `dist/` state can hide regressions and stale references.
- Finance/tax/insurance disclaimer and accuracy checks are mandatory.
- Live data tools require fallback/rate-limit/network failure QA.
- Social downloader copy must avoid misleading claims.

## Per-phase checklist template
For each phase:
1. Confirm scoped route list.
2. Verify imports and runtime errors.
3. Verify i18n keys and localized route behavior.
4. Verify SEO metadata/canonical/sitemap impact.
5. Run validations (`lint`, `test`, `build`, route audit).
6. Log risks + manual QA notes before moving to next phase.

## Execution status (2026-05-21)
- ✅ Baseline validation completed: `npm run lint`, `npm test`, `npm run build`, `npm run audit:public-routes`.
- ✅ P0 finance + security surface build/runtime verification completed via full production build outputs and route audit.
- ✅ P1 PDF/image and category/localized surfaces verified in production build outputs.
- ✅ P2/P3 tool groups included in production build and public-route audit pass.
- ⚠️ Manual browser QA for every individual tool route remains recommended as a follow-up for UX-level verification.
