# NovaTools MC — Full Overhaul Design Document
Date: 2026-03-15 | Status: Approved — Executing

## Phase 1 — Foundation & Current Tools (PUSH REQUIRED)

### Critical Issues & Fixes

**#1 Router Crash (root cause of total site failure)**
- app.mjs calls router.addRoute() — method does not exist in Router class
- Router class only has router.register()
- Fix: Rewrite app.mjs::initRouter() to use router.register() API, remove router.init() call

**#2 Index.html Tool Links Broken**
- All cards link to /src/tools/finance/mortgage-refinance/ (dev paths)
- Fix: Remove /src/ prefix from all 20 tool links

**#3 CORS API Failures**
- exchangerate-api.com/v4 blocks browser requests (no CORS headers)
- CoinGecko 422 error from malformed params
- Fix: Switch exchange to open.er-api.com/v6/latest/USD (CORS-enabled, free)
- Fix: Correct CoinGecko endpoint (remove URL trailing space, use proper params)
- Fallback: Hardcoded recent values if all APIs fail, shown with "Cached" badge

**#4 PWA Icons Missing**
- static/icons/ is empty, VitePWA manifest references 8 icon sizes that 404
- Fix: Generate all 8 PNG sizes from favicon.svg via Sharp in prebuild script

**#5 AdSense Placeholder**
- ca-pub-XXXXXXXXXXXXXXXX hardcoded, TagError flood
- Fix: VITE_ADSENSE_CLIENT env var, conditional lazy-load, single push guard

**#6 Vercel.json Missing Wildcard**
- Tools listed individually, new tools break
- Fix: { "source": "/tools/:path*", "destination": "/tools/:path*/index.html" }

### 20 Tools — Full Mathematical Logic

Finance (8):
- Mortgage Refinance: P*[r(1+r)^n]/[(1+r)^n-1], break-even = closing_cost/monthly_savings
- Life Insurance: needs = (income*years*multiplier) + debts + education - assets
- Cloud Cost: per-resource pricing table AWS/GCP/Azure with real 2024 rates
- Compound Interest: A = P(1+r/n)^(nt) with compound frequency options
- Retirement: FV = PMT*[(1+r)^n-1]/r, 4pct safe withdrawal rule
- Tax Estimator: 2024 US federal brackets 10/12/22/24/32/35/37pct, standard deduction $14,600
- Crypto Tax: FIFO/LIFO capital gains, short vs long term rates
- Student Loan: UK income-contingent 9pct above threshold + US standard 10-year amortization

PDF (3): pdf-lib merge/split/compress — full client-side processing
Image (2): Canvas API compress + format convert
Dev (2): JSON Formatter (parse+stringify+DOMPurify), Regex Tester (RegExp+match highlighting)
Religious (1): Islamic Calendar — algorithmic Hijri conversion, no external API
News (1): Tech/Finance news — curated static links, privacy-first
Request (1): HTTP request builder — client-side fetch, response display
Dev extras (2): JSON Validator + Regex Tester

### Design System
- Background: #0A0A0C, Accent: #00D9FF, Success: #00FF88
- Cards: rgba(15,15,20,0.7) + 1px rgba(0,217,255,0.15)
- Ad placements: leaderboard above fold, MPU after first section, sticky mobile anchor
- Footer: "Psychological Counselor Metehan CETIN | proside2026@gmail.com"

### Security
- DOMPurify on all user-rendered content
- CSP headers in vercel.json
- No eval(), no innerHTML with untrusted data
- All secrets in .env only

### SEO E-E-A-T
- title + meta description + canonical per page
- JSON-LD SoftwareApplication schema with aggregateRating
- Breadcrumb schema
- author meta = Metehan CETIN

## Phase 2 — 300 Tool Expansion (NO PUSH UNTIL COMPLETE)
- 280 additional tools committed locally one by one
- Same quality: full math logic, SEO, schema markup
- Categories: Finance+30, PDF+25, Image+20, Dev+60, Business+30, Health+20, Travel+25, Utilities+25, Conversion+45, Crypto+20
- Single push when all 300 are complete

## Non-Negotiables
1. Zero hardcoded secrets
2. Zero placeholder content — every tool calculates real results
3. Zero console errors in production
4. Zero 404s after deploy
5. All financial tools: "This tool provides estimates, not financial or legal advice."
