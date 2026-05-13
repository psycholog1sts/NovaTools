
# NovaTools MC

> High-CPC Utility Tools Platform. Privacy-first. USD Optimized. AdSense Ready.

[![Lighthouse](https://img.shields.io/badge/Lighthouse-CI%20local-brightgreen)](./lighthouserc.cjs)
[![Zero Server](https://img.shields.io/badge/Server-Zero%20Processing-blue)](https://novatools.mc)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![AdSense](https://img.shields.io/badge/AdSense-Optimized-green)](https://novatools.mc)

## 🎯 Overview

**NovaTools MC** is a high-CPC, privacy-first utility tools platform designed for maximum AdSense revenue. All processing happens in the browser—your data never leaves your device.

### Key Features

- 💰 **High-CPC Tools** - Mortgage, Insurance, Cloud Cost calculators ($2-8 CPC)
- 🔒 **Zero Data Transmission** - Everything processes client-side (GDPR compliant)
- 🎨 **Matrix Theme** - Hacker/cyber aesthetic with neon accents
- 📱 **PWA Ready** - Works offline
- ♿ **Accessible** - WCAG 2.1 AA compliant
- 🌍 **Global English** - USD-focused, AdSense optimized

## 🚀 High-CPC Tool Portfolio

### Finance Tools (Premium CPC: $3-8)

| Tool | CPC (US) | Description |
|------|----------|-------------|
| **Mortgage Refinance Calculator** | $5.50 | Compare rates & calculate savings |
| **Life Insurance Estimator** | $8.50 | Payout & premium calculator |
| **Cloud Cost Estimator** | $4.50 | AWS/GCP/Azure comparison |
| **Retirement Planner** | $3.20 | 401k & IRA projections |
| **Tax Estimator** | $3.80 | Federal & state tax calculator |
| **Compound Interest** | $2.50 | Investment growth projection |

### PDF Tools (CPC: $2-2.50)

- PDF Merger
- PDF Compressor
- PDF Splitter

### Image Tools (CPC: $1.2-1.8)

- Image Compressor (WebP/AVIF)
- Format Converter

### Developer Tools (CPC: $1-1.50)

- JSON Validator & Formatter
- Regex Tester & Debugger

## 🎨 Matrix Theme Design

### Color Palette

```css
--matrix-dark: #0a0a0a;        /* Deep black background */
--matrix-green: #00FF41;        /* Primary accent (Matrix Green) */
--matrix-cyan: #00F3FF;         /* Cyber Blue */
--matrix-blue: #0080FF;         /* Electric Blue */
--matrix-purple: #BD00FF;       /* Neon Purple */
--matrix-yellow: #FFD700;       /* Gold */
--matrix-red: #FF0040;          /* Neon Red */
--matrix-gray: #6B7280;         /* Text gray */
```

### Typography

- **Primary Font:** JetBrains Mono
- **Backup:** Roboto Mono, monospace
- **Style:** Terminal-inspired, code-like aesthetics

## 📺 Ad Placement Strategy

### Ad Slots

| Placement | Size | Device | CPC Optimization |
|-----------|------|--------|------------------|
| **Top Banner** | 728x90 / Responsive | All | Finance tools ($3-5) |
| **Sidebar** | 336x280 | Desktop | All tools (sticky) |
| **Medium Rectangle** | 300x250 | All | Between tool cards |
| **Anchor** | 320x50 | Mobile | Fixed bottom |

### AdSense Integration

```html
<!-- Top Banner -->
<ins class="adsbygoogle"
     style="display:block"
     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
     data-ad-slot="BANNER_SLOT_ID"
     data-ad-format="horizontal"
     data-full-width-responsive="true"></ins>

<!-- Sidebar (336x280) -->
<ins class="adsbygoogle"
     style="display:inline-block;width:336px;height:280px"
     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
     data-ad-slot="SIDEBAR_SLOT_ID"></ins>

<!-- Anchor (320x50) -->
<ins class="adsbygoogle"
     style="display:inline-block;width:320px;height:50px"
     data-ad-client="ca-pub-XXXXXXXXXXXXXXXX"
     data-ad-slot="ANCHOR_SLOT_ID"></ins>
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run the same pre-merge validation sequence used by PR checks
npm run ci:validate

# Lighthouse CI
npm run lighthouse
```

## 📁 Project Structure

```
zero-tools-platform/
├── src/
│   ├── components/          # Reusable Web Components
│   │   └── ui/
│   │       ├── file-dropzone.mjs
│   │       └── index.mjs
│   ├── core/                # Core utilities
│   │   ├── ads/             # AdSense configuration
│   │   ├── ai/              # AI & Machine Learning
│   │   ├── auth/            # WebAuthn & passkeys
│   │   ├── compute/         # WebGPU acceleration
│   │   ├── crypto/          # Post-quantum cryptography
│   │   ├── monetization/    # Header bidding
│   │   ├── optimization/    # Self-healing
│   │   ├── router.mjs
│   │   └── index.mjs
│   ├── styles/
│   │   ├── critical.css     # Matrix theme critical CSS
│   │   └── main.css
│   └── tools/               # Tool implementations
│       ├── finance/         # High-CPC finance tools
│       │   ├── mortgage-refinance/
│       │   ├── life-insurance/
│       │   ├── cloud-cost/
│       │   ├── compound-interest/
│       │   ├── retirement/
│       │   └── tax/
│       ├── pdf/
│       ├── image/
│       └── dev/
├── static/                  # Static assets
├── dist/                    # Build output
├── tools-manifest.json      # CPC data, ad config
├── tailwind.config.js       # Matrix theme colors
├── vite.config.js           # Build configuration
└── vercel.json              # Static deployment
```

## 🏗️ Architecture

### Zero-Server Design

```
┌─────────────────────────────────────┐
│           Client Browser            │
│  ┌─────────────────────────────┐   │
│  │  Vite-built Static Assets   │   │
│  │  ├── HTML Entry Points      │   │
│  │  ├── JS Chunks (vendor/*)   │   │
│  │  ├── CSS (Matrix Theme)     │   │
│  │  └── WASM (pdf-lib, etc)    │   │
│  └─────────────────────────────┘   │
│              ↓                      │
│  ┌─────────────────────────────┐   │
│  │  Service Worker (PWA)       │   │
│  │  └── Caches assets offline  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
              │
              │ NO DATA TRANSMISSION
              ▼
┌─────────────────────────────────────┐
│         CDN (Vercel/CF)             │
│  └── Only serves static files       │
└─────────────────────────────────────┘
```

## 🎨 Styling

### CSS Architecture

```css
/* critical.css - Matrix theme, inline in <head> */
/* 10KB budget - Above-fold only */

/* Component styles - Lazy loaded */
/* Matrix card glow effects */

/* Tailwind - Purged and minified */
/* Matrix color utilities */
```

### Matrix Card Component

```html
<a href="/tools/finance/mortgage-refinance/" 
   class="card matrix-card hover:glow-green transition-all">
  <div class="card-body">
    <h3 class="font-mono text-white">Mortgage Refinance</h3>
    <p class="text-matrix-gray">Compare rates & calculate savings</p>
  </div>
</a>
```

## 📊 Performance Budgets

| Metric | Budget | Current |
|--------|--------|---------|
| FCP | < 1.2s | ~0.8s |
| LCP | < 2.5s | ~1.5s |
| CLS | < 0.1 | ~0.02 |
| TTI | < 3.5s | ~2.1s |
| CSS | < 10KB | ~8KB |
| JS (initial) | < 100KB | ~85KB |

## 🧪 Testing

```bash
# Unit tests
npm run test:unit

# Coverage
npm run test:coverage

# Lighthouse CI
npm run lighthouse

# Manual testing
npm run preview
```

## 📈 Analytics

Privacy-first, cookie-free Fathom Analytics:

- No cookies
- No personal data
- GDPR compliant
- Event tracking only

```html
<script src="https://cdn.usefathom.com/script.js" data-site="NOVATOOLS" defer></script>
```


## 🔎 Search indexing operations

The public sitemap and one-URL-per-line export are generated from the current route sources:

```bash
npm run build:sitemap
npm run lint:site-links
```

- `sitemap.xml` and `public/sitemap.xml` are the XML files to deploy and submit once in Google Search Console.
- `site-links.txt` is the matching plain-text URL export for audits and controlled batch workflows.
- `indexing.cjs` can dry-run or submit selected URL chunks to Google Indexing API without storing credentials in the repository.

See [Google Search Console sitemap and Indexing API workflow](./docs/google-search-console-indexing.md) for setup, quota-safe chunking, and the official Indexing API scope warning.

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Deploy to Vercel
vercel --prod
```

### Cloudflare Pages

```bash
# Build
npm run build

# Deploy
cd dist && npx wrangler pages deploy .
```

## 📊 Revenue Optimization

### Header Bidding (Optional)

```javascript
// Prebid.js integration for higher CPM
import { initHeaderBidding } from './src/core/monetization/header-bidding.mjs';

initHeaderBidding({
  bidders: ['appnexus', 'openx', 'rubicon'],
  timeout: 2000
});
```

### Ad Refresh Strategy

- Refresh ads every 60 seconds on active tools
- Higher CPM for finance tool impressions
- Sticky sidebar for maximum viewability

## 📝 License

[MIT License](./LICENSE) © NovaTools MC

## ⚠️ Disclaimer

This platform provides calculators for informational purposes only. Results are estimates and should not be considered financial advice. Consult a qualified professional for financial decisions.

---

<p align="center">
  <strong>🔒 Your data stays in your browser. Always.</strong><br>
  <span class="font-mono">$ echo "Privacy is not a feature, it's a foundation."</span>
</p>
# Deploy Trigger
