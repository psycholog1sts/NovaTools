# NovaTools MC — Phase 1 Implementation Plan

> **For Claude:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Fix all critical failures, complete all 20 tools, push to production.

**Root Causes:**
- CRASH: app.mjs calls router.addRoute() — Router only has router.register()
- LINKS: index.html cards link to /src/tools/ (dev paths) — 404 in production
- CORS: exchangerate-api.com/v4 blocks browser — switch to open.er-api.com/v6
- CORS: CoinGecko URL has trailing space — 422 error
- ICONS: static/icons/ empty — 8 PWA icon 404s
- ADS: ca-pub-XXXXXXXXXXXXXXXX placeholder — TagError flood
- MISSING: json-formatter and regex-tester have no index.html

---

## Task 1: Fix Router Crash

**File:** src/app.mjs (initRouter method)

Router class exposes register(path, handler, options) only.
app.mjs calls addRoute() and init() which do not exist.

Replace entire initRouter() method body:

```javascript
initRouter() {
  router.register('/', () => {}, { title: 'NovaTools MC' });
  router.register('/404', () => { document.title = '404 | NovaTools MC'; });
  router.onNavigate = (route) => {
    stateManager.set('app.currentRoute', route?.path || '/');
    this.handleRouteChange(route);
  };
  // Router self-initializes in constructor. Do NOT call router.init().
}
```

Verify: no "TypeError: n.addRoute is not a function" in console.

Commit: fix(router): replace addRoute() with register() - resolves total JS crash

---

## Task 2: Fix Index.html Tool Links

**File:** index.html

Find: href="/src/tools/
Replace: href="/tools/

Find: href="/src/blog/
Replace: href="/blog/

Verify: grep -c 'href="/src/' index.html -> Expected: 0

Commit: fix(nav): remove /src/ prefix from tool links - fixes all 404 navigation

---

## Task 3: Fix vercel.json Wildcard Routing

**File:** vercel.json

Replace all individual tool rewrites with single wildcard rule.

Rewrites array:
- /admin -> /admin/index.html
- /admin/:path* -> /admin/:path*
- /blog -> /blog/index.html
- /blog/articles/:path* -> /blog/articles/:path*
- /tools/:path* -> /tools/:path*/index.html  (THE WILDCARD)
- /(.*) -> /index.html

Security headers on all routes:
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: strict-origin-when-cross-origin
- Permissions-Policy: camera=(), microphone=(), geolocation=()

Cache headers on /assets/(.*) and /js/(.*): public, max-age=31536000, immutable

Commit: chore(deploy): wildcard routing + security headers in vercel.json

---

## Task 4: Fix CORS Exchange Rate API

**Files:** src/core/config.mjs, src/core/api/live-data.mjs

api.exchangerate-api.com/v4 blocks CORS. open.er-api.com/v6 is free + CORS-enabled.

config.mjs: change baseUrl to https://open.er-api.com/v6
live-data.mjs: change URL to https://open.er-api.com/v6/latest/USD

Test: fetch('https://open.er-api.com/v6/latest/USD').then(r=>r.json()).then(d=>console.log(d.rates.EUR))
Expected: decimal like 0.923

Commit: fix(api): switch to open.er-api.com/v6 - resolves CORS error

---

## Task 5: Fix CoinGecko 422 Error

**File:** src/core/api/live-data.mjs

URL has trailing space. Use URL constructor. Add fallback data.

Replace fetchCryptoPrices with URL constructor approach:
- const url = new URL('https://api.coingecko.com/api/v3/simple/price')
- url.searchParams.set('ids', 'bitcoin,ethereum')
- url.searchParams.set('vs_currencies', 'usd')
- url.searchParams.set('include_24hr_change', 'true')
- Fallback: btc price 88450, eth price 3250

Commit: fix(api): correct CoinGecko URL construction - resolves 422 error

---

## Task 6: Generate PWA Icons

**Files:** scripts/generate-icons.mjs (CREATE), package.json (add prebuild)

static/icons/ is empty. Sharp is already a devDependency.

Script resizes public/favicon.svg to 8 PNG sizes: 72, 96, 128, 144, 152, 192, 384, 512px
Output: static/icons/icon-NxN.png for each size

package.json add: "prebuild": "node scripts/generate-icons.mjs"

Verify: node scripts/generate-icons.mjs then ls static/icons/ shows 8 PNG files

Commit: feat(pwa): generate all 8 PWA icon sizes - fixes manifest 404s

---

## Task 7: Fix AdSense Environment Variable Loading

**Files:** index.html, vite.config.js, .env.example (CREATE)

Step 1: Remove ALL inline adsbygoogle.push() scripts from index.html
Step 2: Replace AdSense script tag with env-based lazy loader using __ADSENSE_CLIENT__
Step 3: Replace all ca-pub-XXXXXXXXXXXXXXXX with __ADSENSE_CLIENT__
Step 4: vite.config.js define add: __ADSENSE_CLIENT__: JSON.stringify(process.env.VITE_ADSENSE_CLIENT || 'ca-pub-XXXXXXXXXXXXXXXX')
Step 5: Create .env.example with VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX

Commit: feat(ads): env-var AdSense loading - eliminates TagError flood

---

## Task 8: Create JSON Formatter Tool

**File:** src/tools/dev/json-formatter/index.html (CREATE)

Core logic:
- processJSON(raw): parse, return ok/pretty/minified/type/count or error
- syntaxHighlight(json): color keys cyan, strings green, numbers orange

Features:
- Large textarea input
- Buttons: Format (Ctrl+Enter), Minify, Copy, Clear
- Syntax highlighted output in pre element
- Error display with character position
- Stats badge: type + count

SEO: title = JSON Formatter and Validator — Free Online Tool | NovaTools MC

Commit: feat(tool): complete JSON Formatter with syntax highlighting

---

## Task 9: Create Regex Tester Tool

**File:** src/tools/dev/regex-tester/index.html (CREATE)

Core logic:
- testRegex(pattern, flags, text): returns matches array with index/value/groups
- Infinite loop protection: if m[0].length === 0, regex.lastIndex++
- escapeHtml() for XSS-safe display

Features:
- Pattern input + flag toggles: g i m s
- Test string textarea — live update on input event
- Highlighted output: matches in amber mark elements
- Match table: number, index, match, groups
- Count badge
- Quick-insert: Email, URL, IPv4, Date, Phone

Commit: feat(tool): complete Regex Tester with live matching and groups

---

## Task 10: Fix Mortgage Refinance Remove app.mjs

**File:** src/tools/finance/mortgage-refinance/index.html

Only tool importing /src/app.mjs (crashes everything).
Logic module mortgage-refinance.mjs already exports refinanceCalculator().

Remove: script type="module" src="/src/app.mjs"

Add standalone import:
- import { refinanceCalculator } from '/src/tools/finance/mortgage-refinance.mjs'
- Wire form submit to call refinanceCalculator(Object.fromEntries(new FormData(form)))
- Display result.html in .results-panel

Verify form input names match: balance, currentRate, yearsRemaining, newRate, newTerm, closingCosts

Commit: fix(mortgage): replace broken app.mjs with standalone module import

---

## Task 11: Verify All Finance Tool Logic

Tools to verify: cloud-cost, compound-interest, crypto-tax, life-insurance, retirement, student-loan, tax

Test each with known values:
- Cloud Cost: AWS 4vCPU 16GB 100GB 730h -> ~$70-100/month
- Compound: $10000 7% 10yr monthly -> ~$20097
- Crypto Tax: 1 BTC at $30k sold at $50k FIFO -> $20000 gain
- Life Insurance: $80k/yr 20yr $200k mortgage 2 kids -> ~$2M coverage
- Retirement: $50k savings $500/mo 30yr 7% -> ~$600k+
- Tax: $75000 single 2024 -> ~$12000 federal
- Student Loan: US $30k 6% -> ~$333/month

Cloud Cost real 2024 rates:
- aws: cpuHour=0.048, ramGbHour=0.006, storageGbMonth=0.023
- gcp: cpuHour=0.047, ramGbHour=0.0063, storageGbMonth=0.020
- azure: cpuHour=0.048, ramGbHour=0.006, storageGbMonth=0.018

Each tool result MUST include: "Estimates only. Not financial advice."

Commit: fix(tools): all finance tools verified correct with disclaimers

---

## Task 12: Professional Footer All Pages

Files: index.html plus all 20 tool index.html files

Main footer 3 columns:
- Col 1: About NovaTools MC + privacy badge
- Col 2: Top 5 tool links
- Col 3: 3 financial recommendations + contact

Contact EXACT TEXT:
  Psk. Metehan CETIN
  proside2026@gmail.com

Copyright: 2026 NovaTools MC — Psk. Metehan CETIN. All rights reserved.
Disclaimer: All tools provide estimates only, not financial or professional advice.

Recommendations:
1. Build 6 months emergency fund before any major financial decision.
2. Refinance only if break-even point is under 36 months.
3. Diversify: index funds, real estate, and liquid savings.

Tool page footer compact:
  2026 NovaTools MC — Psk. Metehan CETIN | proside2026@gmail.com
  Estimates only — not financial, legal, or tax advice.

Commit: feat(footer): professional Psk. Metehan CETIN footer across all pages

---

## Task 13: Build Verification — Zero Errors Required

Run: npm run build
Check: dist/index.html exists, dist/tools/finance/mortgage-refinance/index.html exists, dist/icons/ has 8 PNGs

Local test: npx http-server dist -p 8080

Browser console must show ZERO:
- TypeError: n.addRoute is not a function
- CORS policy blocked
- 404 for icons
- TagError adsbygoogle

Test: click tool card -> navigates correctly, enter values -> result appears with disclaimer

If any test fails: STOP, fix, re-run before Task 14.

---

## Task 14: Push to Production

git add -A
git commit -m "feat(phase1): complete overhaul - router fixed, 20 tools working, CORS resolved, PWA icons, pro footer, zero console errors"
git push origin main

Wait 90 seconds then verify live:
- https://www.mc-novatools.com/ loads
- https://www.mc-novatools.com/tools/finance/mortgage-refinance/ calculates
- https://www.mc-novatools.com/tools/dev/json-formatter/ works
- Console on live site: zero errors

---

## Execution Rules

1. ONE commit per task. Never batch.
2. If npm run build fails: STOP, diagnose, fix, re-run.
3. .env NEVER committed. .env.example IS committed.
4. static/icons PNG files ARE committed.
5. dist/ is NOT committed.
6. All financial results MUST include disclaimer.
7. Zero placeholder text visible to users.
8. Test math with known values before committing.
