# Phase 3: SEO Migration Master Map

## Executive Summary

Bu belge, ZeroTools Platform için **Semantic Authority Transfer** stratejisini detaylandırır. Tüm legacy URL'ler, en alakalı yeni araçlara 301 redirect ile yönlendirilecektir.

## 🎯 Core Strategy: Semantic Vector Similarity

### Redirect Philosophy
```
Legacy Blog Post ──[Semantic Score 0.98]──→ Target Tool
     ↓                                          ↓
"/blog/konut-kredisi-nasil-hesaplanir"  →  "/tools/finance/mortgage-tr/"
```

### Tracking Strategy
- **Parameter:** `?ref=legacy_` (NOT `utm_source`)
- **Reason:** UTM parametreleri backlink equity'sini azaltabilir
- **Format:** `?ref=legacy_{source}_{identifier}`

## 📊 Redirect Map Summary

| Category | Count | Example Legacy | Target |
|----------|-------|----------------|--------|
| Blog Posts → Tools | 10 | `/blog/pdf-birlestirme` | `/tools/pdf/merge/` |
| Legacy Tools | 6 | `/hesap-makinesi/kredi` | `/tools/finance/mortgage-tr/` |
| English Versions | 2 | `/en/tools/*` | `/tools/*` |
| Tag Consolidation | 5 | `/tag/kredi-hesaplama` | Tool page |
| Category Archives | 3 | `/category/finans` | `/#finance` |
| Low Value | 6 | `/author/*`, `/page/*` | `/` |
| Feeds | 4 | `/feed`, `/rss` | `/` |
| **GONE FOREVER** | **6** | WordPress paths | **410 Gone** |

## 🔗 Zero-Chain Policy

### ❌ BAD: Redirect Chain
```
/blog/kredi → /category/finance → /tools/mortgage → /tools/finance/mortgage-tr/
(A → B → C → D) ❌ 3 redirect, crawl budget waste
```

### ✅ GOOD: Direct Redirect
```
/blog/kredi → /tools/finance/mortgage-tr/
(A → D) ✅ Direct, equity preserved
```

## 🗂️ Implementation Files

### 1. vercel.json (Primary)
**Location:** `zero-tools-platform/vercel.json`
- Vercel deployment için 301 redirect kuralları
- Wildcard pattern matching
- Security headers
- Cache control

### 2. .htaccess (Apache Alternative)
**Location:** `zero-tools-platform/seo-migration/.htaccess`
- Apache sunucuları için rewrite kuralları
- WordPress remnant blocking (410 Gone)
- Compression ve caching headers

### 3. redirect-map.json (Reference)
**Location:** `zero-tools-platform/seo-migration/redirect-map.json`
- Tüm redirect'lerin JSON formatında kaydı
- Semantic score'lar ve tracking parametreleri
- Migration audit için kullanılır

## 📝 Content Scaffolding

### Minimum Content Requirements

| Tool | Word Count | Schema Types |
|------|------------|--------------|
| Mortgage TR | 800+ | SoftwareApplication, FAQPage, HowTo |
| PDF Merge | 800+ | SoftwareApplication, FAQPage, HowTo |
| All Others | 500+ | SoftwareApplication, FAQPage |

### noscript Fallback
```html
<noscript>
  <section class="content-scaffold">
    <h1>Tool Name</h1>
    <p>800+ words of semantic HTML content...</p>
    <!-- Full FAQ and methodology -->
  </section>
</noscript>
```

**Purpose:** Googlebot JavaScript'sız sayfayı indeksleyebilir.

## 🏷️ Schema.org Implementation

### Schema Types by Tool

| Tool | Primary | Secondary |
|------|---------|-----------|
| Mortgage TR | SoftwareApplication | FAQPage, HowTo, BreadcrumbList |
| PDF Merge | SoftwareApplication | FAQPage, HowTo, BreadcrumbList |
| Compound Interest | SoftwareApplication | FAQPage, BreadcrumbList |
| Image Compress | SoftwareApplication | FAQPage, BreadcrumbList |
| JSON Formatter | SoftwareApplication | FAQPage, BreadcrumbList |

### Schema Generator
**File:** `src/core/seo/schema-generator.mjs`

```javascript
// Usage in tool logic
import { generateToolPageSchemas, injectMultipleSchemas } from '@core/seo/schema-generator.mjs';

const schemas = generateToolPageSchemas(
  toolMeta,           // From meta.json
  breadcrumbs,        // [{name, url}, ...]
  faqs,               // [{question, answer}, ...]
  howTo               // {name, description, steps}
);

injectMultipleSchemas(schemas);
```

### Rich Snippet Targets

1. **SoftwareApplication** → App rich results
2. **FAQPage** → FAQ accordion in SERP
3. **HowTo** → Step-by-step rich results
4. **BreadcrumbList** → Breadcrumb navigation in SERP

## 🗺️ Sitemap Structure

```
sitemap-index.xml
├── sitemap-main.xml (Home, categories, legal)
└── sitemap-tools.xml (8 tool pages)
```

**Priority Distribution:**
- Home: 1.0
- Tier 1 Tools: 1.0
- Tier 2 Tools: 0.9
- Tier 3 Tools: 0.8
- Categories: 0.9
- Legal: 0.3

## 🔒 robots.txt

**Key Directives:**
- Block: `/wp-*`, `/xmlrpc.php`, `/feed`, `/author/`, `/page/`
- Allow: Tools, static assets
- Sitemap: `sitemap-index.xml`

## 📈 Post-Migration Monitoring

### 1. Google Search Console
- **Coverage Report:** Soft 404 detection
- **Performance Report:** Click/impression tracking
- **Core Web Vitals:** LCP, FID, CLS monitoring

### 2. Redirect Verification
```bash
# Check redirect chain
curl -I -L "https://zerotools.dev/blog/konut-kredisi-nasil-hesaplanir"

# Expected: 301 → 200 (no intermediate redirects)
```

### 3. Index Status
- Submit sitemaps to GSC
- Request indexing for priority pages
- Monitor index coverage weekly

## ✅ Migration Checklist

### Pre-Launch
- [ ] All 301 redirects tested
- [ ] No redirect chains detected
- [ ] Content scaffolding 800+ words
- [ ] Schema validation passed
- [ ] Sitemaps submitted
- [ ] robots.txt validated

### Post-Launch
- [ ] 404 errors monitored
- [ ] Redirect analytics tracked
- [ ] SERP appearance verified
- [ ] Rich snippet eligibility checked
- [ ] Core Web Vitals passed

## 📚 Reference

### Content Scaffolding Templates
- `seo-migration/content-scaffold-mortgage.html`
- `seo-migration/content-scaffold-pdf-merge.html`

### Schema Templates
- `seo-migration/schema-templates.json`

### FAQ
**Q: Neden `?ref=` yerine `utm_source` kullanmıyoruz?**
A: UTM parametreleri backlink authority'sini azaltabilir. `ref` parametresi tracking için yeterlidir.

**Q: 410 Gone ne zaman kullanılır?**
A: WordPress kalıntıları ve asla geri dönmeyecek URL'ler için. Google'a "bu sayfa kalıcı olarak silindi" mesajı verir.

**Q: Content scaffolding zorunlu mu?**
A: Tier 1 araçlar (Mortgage, PDF Merge) için 800+ kelime zorunlu. Diğerleri için 500+ kelime önerilir.

---

**Migration Lead:** ZeroTools SEO Team  
**Last Updated:** 2024-01-15  
**Status:** Phase 3 Complete → Awaiting Phase 4 (Tool Coding)
