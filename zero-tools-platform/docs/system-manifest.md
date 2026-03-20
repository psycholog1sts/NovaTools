# NovaTools MC - System Manifest

> **Sistem Manifestosu ve Bellek Yönetimi**  
> Versiyon: 2.0.0  
> Son Güncelleme: 2026-03-16  
> Kurucu: Psk. Metehan CETIN | psk.dan.metehancetin@mc-novatools.com

---

## 1. PROJE FELSEFESİ: "Zero Trust, Maximum Privacy"

### Temel İlkeler
1. **Privacy First**: Kullanıcı verisi asla sunuculara gitmez
2. **Client-Side Only**: Tüm işlemler tarayıcıda, WebAssembly ve Web Workers kullanılarak yapılır
3. **Offline-First**: Service Workers ile caching, internet bağlantısı olmasa bile çalışır
4. **No-Server**: 100% static hosting, 0 sunucu maliyeti
5. **Open Source**: Açık kaynak kodlu, topluluk odaklı

### Kesinlikle Uygulanacak Kurallar (Kırmızı Çizgiler)
- [x] ASLA kullanıcı verisini (dosya, metin, giriş) harici API'ye veya sunucuya gönderme
- [x] Tüm araçlar offline-first mantığında çalışmalı
- [x] Her araç sayfası <100KB total bundle size olmalı
- [x] Lighthouse Performance skoru her sayfa için >95 olmalı
- [x] Core Web Vitals: LCP <2.5s, FID <100ms, CLS <0.1
- [x] Tüm JavaScript modülleri tree-shakeable olmalı
- [x] CSS'te unused selector kalmamalı (PurgeCSS kullanılacak)
- [x] Her araç için unit test coverage >%80 olmalı

---

## 2. PROJE YAPISI VE TEKNOLOJİ STACK

### 2.1 Frontend Mimarisi
```
Frontend Stack:
├── Vanilla JavaScript ES2023+ (Framework kullanılmayacak - performans için)
├── State Management: Proxy-based custom store (Redux/Vuex benzeri ama lightweight)
├── Styling: CSS Custom Properties (Variables) + PostCSS + Tailwind
├── Build: Vite (Rollup.js tabanlı - Webpack yerine daha hızlı build)
├── Testing: Vitest + Puppeteer (E2E testing için)
└── Documentation: JSDoc standartlarında inline documentation
```

### 2.2 Dizin Yapısı
```
zero-tools-platform/
├── src/
│   ├── core/                    # Core infrastructure
│   │   ├── router.mjs           # History API router
│   │   ├── state-manager.mjs    # Proxy-based state management
│   │   ├── error-handler.mjs    # Global error handling
│   │   ├── pwa.mjs             # Service Worker management
│   │   ├── analytics.mjs       # Privacy-preserving analytics
│   │   └── utils/              # Utility functions
│   ├── components/             # Reusable UI components
│   │   ├── ads/                # Ad components
│   │   ├── ui/                 # UI components (dropzone, etc.)
│   │   ├── layout/             # Layout components
│   │   ├── toast.mjs           # Toast notifications
│   │   └── loading.mjs         # Loading states
│   ├── tools/                  # Tool implementations
│   │   ├── finance/            # Financial calculators (8 tools)
│   │   ├── pdf/                # PDF tools (3 tools)
│   │   ├── image/              # Image tools (2 tools)
│   │   ├── dev/                # Developer tools (2 tools)
│   │   ├── religious/          # Religious tools (1 tool)
│   │   └── news/               # News tools (1 tool)
│   ├── services/               # External data services
│   ├── i18n/                   # Internationalization
│   ├── styles/                 # Global styles
│   │   ├── critical.css        # Critical CSS (inline)
│   │   └── main.css            # Main stylesheet
│   ├── app.mjs                 # Main application
│   └── main.mjs                # Entry point
├── public/                     # Static assets
├── static/                     # Static files (icons, wasm, etc.)
├── docs/                       # Documentation
│   └── plans/                  # Implementation plans
├── admin/                      # Admin panel
├── index.html                  # Main entry
├── vite.config.js             # Vite configuration
└── package.json
```

### 2.3 Teknoloji Detayları

#### CSS Mimari
```css
/* Design Tokens - Dual Theme System */
:root {
  /* Dark theme (default) */
  --bg-primary: #0A0A0C;
  --bg-secondary: #0F0F12;
  --text-primary: #FAFAFA;
  --text-secondary: #A1A1AA;
  --accent-primary: #6366F1;
  --success: #22C55E;
  --warning: #F59E0B;
  --error: #EF4444;
  /* ... 40+ variables */
}

[data-theme="light"] {
  /* Light theme overrides */
  --bg-primary: #F8F9FA;
  --bg-secondary: #FFFFFF;
  /* ... */
}
```

#### State Management (Proxy-Based)
```javascript
// Lightweight Redux-like store without dependencies
class StateManager {
  constructor() {
    this.state = new Proxy({}, {
      set: (target, prop, value) => {
        target[prop] = value;
        this.notify(prop, value);
        return true;
      }
    });
    this.listeners = new Map();
  }
}
```

---

## 3. PWA VE OFFLINE-FIRST MİMARİSİ

### 3.1 Service Worker Stratejisi
```javascript
// vite.config.js - VitePWA configuration
VitePWA({
  registerType: 'autoUpdate',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,wasm,json}'],
    maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
    runtimeCaching: [
      {
        urlPattern: /\.wasm$/,
        handler: 'CacheFirst',
        options: {
          cacheName: 'wasm-cache',
          expiration: { maxEntries: 10, maxAgeSeconds: 30 * 24 * 60 * 60 }
        }
      },
      {
        urlPattern: /analytics\./,
        handler: 'NetworkOnly'
      }
    ],
    skipWaiting: true,
    clientsClaim: true
  }
})
```

### 3.2 Offline-First Prensipleri
1. **Cache First**: Tüm statik assets önce cache'den servis edilir
2. **Background Sync**: İşlemler offline yapılır, online olunca senkronize edilir
3. **IndexedDB**: Büyük veri setleri için client-side storage
4. **Lazy Loading**: Gerektiğinde chunk'lar yüklenir

---

## 4. MERKEZİ VARLIK (ASSETS) YÖNETİMİ

### 4.1 İkon Sistemi
- **Kütüphane**: Lucide Icons (tree-shakeable SVG)
- **Format**: SVG (inline veya sprite)
- **Boyut**: 24x24px default, 20x20px compact
- **Color**: currentColor (CSS variable ile kontrol)

### 4.2 Font Sistemi
- **Font Family**: Inter (Google Fonts - Variable Font)
- **Weights**: 400, 500, 600, 700
- **Display**: swap (FOUC önleme)
- **Subset**: Latin + Latin Extended

### 4.3 Image Sistemi
- **Format**: WebP (primary), AVIF (future), PNG/JPEG (fallback)
- **Lazy Loading**: loading="lazy" + Intersection Observer
- **Responsive**: srcset + sizes
- **Optimization**: Sharp.js ile build-time optimization

---

## 5. KOD YAPISI (SEPARATION OF CONCERNS)

### 5.1 Her Araç İçin Standart Dosya Yapısı
```
tools/[category]/[tool-name]/
├── index.html          # Template
├── index.js            # Main logic (entry point)
├── tool-logic.js       # Hesaplama ve işlem mantığı
├── tool-ui.js          # Arayüz ve DOM yönetimi
├── worker.js           # Web Worker (heavy tasks)
├── styles.css          # Scoped styles
├── schema.json         # SEO schema data
├── meta.json           # Tool metadata
└── README.md           # Dokümantasyon
```

### 5.2 Kod Yapısı Prensipleri
```javascript
// tool-logic.js - Pure calculation logic (no DOM)
export class ToolLogic {
  calculate(inputs) {
    // Pure function
    return { result, meta };
  }
  
  validate(inputs) {
    // Input validation
    return { valid, errors };
  }
}

// tool-ui.js - DOM interaction only
export class ToolUI {
  constructor(container) {
    this.container = container;
    this.logic = new ToolLogic();
  }
  
  init() {
    // Event listeners
    // Form handling
  }
  
  renderResult(data) {
    // DOM updates
  }
}
```

---

## 6. REKLAM YERLEŞİM VE ARAYÜZ KISITLAMALARI

### 6.1 Kırmızı Çizgi Kuralları
- [x] **Header (Başlık) alanı ASLA reklam/sponsor içeriği için kullanılamaz**
- [x] **Herhangi bir araç sayfasında reklam alanı toplam ekranın %30'unu ASLA geçemez**
- [x] **Ekranın %70'i her zaman ana fonksiyona ayrılmalıdır**

### 6.2 Reklam Yerleşim Standartları
```
Ad Slot Types:
├── Leaderboard (728x90) - Above the fold, max 1
├── MPU (300x250) - Sidebar, between content
├── Skyscraper (160x600) - Left/Right rail
├── Mobile Anchor (320x50) - Bottom sticky (mobile only)
└── Native - Content içinde organik
```

### 6.3 Ad Frame Styling
```css
.ad-frame {
  background: var(--ad-bg);
  border: 1px solid var(--ad-border);
  border-radius: var(--radius-lg);
  padding: 0.75rem;
  text-align: center;
}

.ad-frame .ad-label {
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--ad-label-color);
  margin-bottom: 0.5rem;
}
```

---

## 7. SEO VE "HELPFUL CONTENT" ENTEGRASYONU

### 7.1 Her Araç İçin Zorunlu SEO Bölümleri
1. **How to Use (Nasıl Kullanılır)** - Adım adım kullanım kılavuzu
2. **Practical Examples (Pratik Örnekler)** - Gerçek dünya kullanım senaryoları
3. **FAQ** - Sıkça sorulan sorular (accordion format)
4. **Related Tools** - İlgili araçlara internal linking

### 7.2 Schema.org Structured Data
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "Tool Name",
  "description": "Tool description",
  "applicationCategory": "UtilityApplication",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "1000"
  },
  "operatingSystem": "Any",
  "browserRequirements": "Requires JavaScript"
}
```

### 7.3 Meta Tag Standartları
```html
<!-- Primary Meta Tags -->
<title>Tool Name — Free Online Tool | NovaTools MC</title>
<meta name="title" content="Tool Name — Free Online Tool | NovaTools MC">
<meta name="description" content="150-160 karakter, call-to-action içeren description">

<!-- Open Graph / Facebook -->
<meta property="og:type" content="website">
<meta property="og:url" content="https://www.mc-novatools.com/tools/category/tool-name/">
<meta property="og:title" content="Tool Name — Free Online Tool | NovaTools MC">
<meta property="og:description" content="Description...">
<meta property="og:image" content="https://www.mc-novatools.com/og-image.png">

<!-- Twitter -->
<meta property="twitter:card" content="summary_large_image">
<meta property="twitter:url" content="https://www.mc-novatools.com/tools/category/tool-name/">
<meta property="twitter:title" content="Tool Name — Free Online Tool | NovaTools MC">
<meta property="twitter:description" content="Description...">
<meta property="twitter:image" content="https://www.mc-novatools.com/og-image.png">

<!-- Canonical -->
<link rel="canonical" href="https://www.mc-novatools.com/tools/category/tool-name/">
```

---

## 8. DİNAMİK YASAL UYARILAR

### 8.1 Her Araç İçin Legal Disclaimer
```html
<div class="legal-disclaimer">
  <p>
    <strong>Gizlilik ve Güvenlik:</strong> Bu araç kişisel kullanım içindir. 
    Verileriniz işlenmez ve hiçbir sunucuya gönderilmez. Tüm işlemler 
    tarayıcınızda client-side olarak gerçekleştirilir.
  </p>
  <p>
    <strong>Sorumluluk Reddi:</strong> Bu araç tahmini değerler sunar, 
    finansal, hukuki veya vergi danışmanlığı değildir.
  </p>
</div>
```

### 8.2 Footer Standardı
```
2026 NovaTools MC — Psk. Metehan CETIN | psk.dan.metehancetin@mc-novatools.com
Estimates only — not financial, legal, or tax advice.
```

---

## 9. PERFORMANS HEDEFLERİ

### 9.1 Core Web Vitals
| Metric | Target | Budget |
|--------|--------|--------|
| LCP (Largest Contentful Paint) | <2.5s | <2.0s ideal |
| FID (First Input Delay) | <100ms | <50ms ideal |
| CLS (Cumulative Layout Shift) | <0.1 | <0.05 ideal |
| TTFB (Time to First Byte) | <600ms | <200ms ideal |
| FCP (First Contentful Paint) | <1.8s | <1.5s ideal |
| TTI (Time to Interactive) | <3.8s | <3.5s ideal |

### 9.2 Bundle Size Budgets
| Resource | Budget |
|----------|--------|
| Per Tool Bundle | <50KB (gzipped) |
| Critical CSS | <14KB (inline) |
| Main JS | <100KB (gzipped) |
| Total Page | <100KB (initial) |

### 9.3 Lighthouse Targets
```
Performance: >95
Accessibility: >95
Best Practices: >95
SEO: >95
PWA: 100
```

---

## 10. GÜVENLİK PROTOKOLLERİ

### 10.1 Content Security Policy (CSP)
```http
Content-Security-Policy: 
  default-src 'self';
  script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://cdn.usefathom.com;
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src 'self' https://fonts.gstatic.com;
  img-src 'self' data: blob: https:;
  connect-src 'self' https://api.example.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
```

### 10.2 Security Headers
```http
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

### 10.3 Input Validation
- DOMPurify for HTML sanitization
- Zod for schema validation
- Native form validation

---

## 11. 300 ARAÇ YOL HARİTASI

### 11.1 Kategori Dağılımı
| Kategori | Araç Sayısı | Durum |
|----------|-------------|-------|
| PDF Araçları | 30 | 3 aktif |
| Görüntü Araçları | 40 | 2 aktif |
| Metin ve Yazarlık | 35 | 2 aktif |
| Geliştirici Araçları | 50 | 2 aktif |
| Hesaplama ve Dönüştürücüler | 35 | 8 aktif |
| Güvenlik ve Gizlilik | 25 | 0 aktif |
| Veri ve Dosya Araçları | 30 | 0 aktif |
| Sosyal Medya ve Web | 25 | 1 aktif |
| Grafik ve Tasarım | 20 | 0 aktif |
| Verimlilik ve Organizasyon | 10 | 1 aktif |
| **TOPLAM** | **300** | **19 aktif** |

### 11.2 Faz Planlaması
- **Faz 1** (Hafta 1-2): Foundation & Mevcut 20 aracı tamamla ✅
- **Faz 2** (Hafta 3-4): UI/UX ve Fonksiyonel Onarım 🔄
- **Faz 3-32** (Hafta 5-34): 300 araç üretim hattı (10 araç/hafta)
  - Her faz: Pazartesi-Cuma geliştirme, Cumartesi test, Pazar deploy

---

## 12. KALİTE KONTROL CHECKLIST

### Her Araç İçin Zorunlu Kontroller
- [ ] Kod review yapıldı
- [ ] Unit testler yazıldı ve geçti
- [ ] E2E testler yazıldı ve geçti
- [ ] Lighthouse skoru >95 (tüm kategorilerde)
- [ ] Cross-browser test: Chrome, Firefox, Safari, Edge
- [ ] Mobile test: iOS Safari, Android Chrome
- [ ] Accessibility audit: axe-core ile tarandı
- [ ] Security audit: XSS, CSRF kontrolleri yapıldı
- [ ] SEO audit: Schema valid, meta tags tam
- [ ] Performance audit: Bundle size <50KB, FCP <1.5s

---

## 13. VERSİYONLAMA VE COMMIT STANDARTLARI

### Conventional Commits
```
feat: Yeni özellik
fix: Hata düzeltmesi
docs: Dokümantasyon değişikliği
style: Kod formatı (boşluk, noktalı virgül, vb.)
refactor: Kod refactor (özellik veya fix değil)
perf: Performans iyileştirmesi
test: Test ekleme/güncelleme
chore: Build, config, bağımlılık değişiklikleri
```

### Semantic Versioning
```
MAJOR.MINOR.PATCH
1.0.0 -> İlk stabil sürüm
1.1.0 -> Yeni özellikler (minor)
1.1.1 -> Hata düzeltmeleri (patch)
2.0.0 -> Kırıcı değişiklikler (major)
```

---

## 14. İLETİŞİM VE SORUMLULUK

### Proje Sahibi
- **İsim**: Psk. Metehan CETIN
- **E-posta**: psk.dan.metehancetin@mc-novatools.com
- **Website**: https://www.mc-novatools.com

### Lisans
MIT License - Açık kaynak, özgür kullanım

---

> **NOT**: Bu manifesto projenin tüm aşamalarında rehber olarak kullanılır. Her yeni faza veya araç grubuna başlamadan önce bu dosyayı mutlaka okuyun ve ana hedeften sapmadığınızdan emin olun.
