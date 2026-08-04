# NovaTools Kapsamlı Site Denetimi ve Müdahale Raporu

**Tarih:** 4 Ağustos 2026  
**Canlı site:** https://mc-novatools.com/  
**Kaynak depo:** `psycholog1sts/NovaTools`  
**Denetim türü:** canlı sayfa taraması, sitemap/robots incelemesi, örnek işlev testi ve kaynak kod kök neden analizi

## Yönetici özeti

NovaTools'un araç kataloğu geniş ve temel araç rotaları erişilebilir; ancak sitenin güven veren, tutarlı ve üretim olgunluğunda görünmesini engelleyen iki kritik mimari kusur bulundu:

1. Çok sayfalı (MPA) siteye eklenen genel istemci yönlendiricisi, temiz URL ile açılan şirket, iletişim, yasal ve kategori sayfalarının sunucudan gelen içeriğini JavaScript çalışınca 404 gövdesiyle değiştiriyor.
2. Araç sayfası iyileştiricisi mevcut sayfa kabuğunu algılamadan ikinci bir başlık, breadcrumb, hero, rehber ve yardımcı panel ekliyor. Denetlenen 128 aracın 126'sında iki adet `h1` oluştu.

Bu dalda kritik rotalama sorunu, yinelenen araç kabuğu, eksik temiz URL kuralları, sitemap üretimindeki önemli boşluklar, 404 sayfasındaki hatalı finans bağlantıları ve erişilebilir adlandırma kapsamı düzeltildi. Regresyonların CI'da yakalanması için ayrıca bir test eklendi.

## Kapsam ve yöntem

| Alan | Kapsam | Sonuç |
|---|---:|---|
| Araç manifesti | 128 araç | 128 rota yüklendi; ilk paralel geçişte tarayıcı istemcisine bağlı geçici engeller seri yeniden denemede aşıldı |
| Sitemap | 283 benzersiz URL | Yinelenen URL yok; sitemap ve `site-links.txt` aynı 283 URL'yi içeriyor |
| Araç SEO yüzeyi | 128 sayfa | 128 açıklama, canonical ve indexlenebilir robots meta; 126 sayfada yinelenen `h1` |
| Form erişilebilirliği | Araç sayfaları | 3 sayfada toplam 35 etiketsiz kontrol: invoice-generator 18, resume-builder 15, robots-txt-generator 2 |
| İşlev duman testi | JSON Formatter | Geçerli JSON girdisi doğru biçimlendirildi |
| Kurumsal/yasal rotalar | about, contact, privacy, terms, disclaimer | `.html` rotaları temiz URL'ye geçtikten sonra istemci tarafında 404 gövdesi gösterdi |
| Kaynak inceleme | router, enhancer, redirect, sitemap, 404, paket/CI | Canlı bulguların kök nedenleri kaynakta doğrulandı |

> Sınır: 128 aracın tüm etkileşim kombinasyonları ve dosya türleri uçtan uca çalıştırılmadı. Bu çalışma tüm araç rotalarını ve ortak sayfa altyapısını tarar, seçili temel işlevi çalıştırır ve kaynak seviyesinde ortak hata sınıflarını düzeltir. Araç algoritmalarının tamamı için aşağıdaki test matrisi uygulanmalıdır.

## Bulgular

### P0 — Temiz URL'lerde istemci tarafı sahte 404

**Belirti:** `/about-us.html`, `/contact.html`, `/privacy-policy.html`, `/terms-of-service.html` ve `/disclaimer.html` temiz URL'ye geçtikten sonra doğru title/meta/canonical korunmasına rağmen gövde `404 - Page Not Found` oluyor.

**Kök neden:** `src/core/router.mjs` yapıcısı rotalar kaydedilmeden `init()` çağırıyor. İlk yüklemede `/tools/`, `/blog/` ve `/admin/` dışındaki her yolu boş route tablosuyla çözmeye çalışıp `document.body` içeriğini 404 ile değiştiriyor. Aynı yönlendirici, sıradan dahili bağlantıları da SPA bağlantısı gibi yakalıyor.

**Müdahale:** Yönlendirme yalnız `data-router-link` ile açıkça işaretlenen bağlantılar için çalışacak şekilde opt-in yapıldı; MPA dokümanının ilk render'ı sunucuya bırakıldı.

**Kabul kriteri:** Şirket, yasal, iletişim ve kategori temiz URL'leri JavaScript açıkken ve kapalıyken aynı ana içeriği göstermeli; gövdede 404 bulunmamalı.

### P1 — Araç sayfalarında yinelenen kabuk, H1 ve içerik

**Belirti:** 128 aracın 126'sında iki `h1` var. JSON Formatter örneğinde beyaz bir “Professional Utility Workflow” hero'su, ayrı sticky breadcrumb, ardından özgün koyu header ve özgün araç sayfası art arda gösteriliyor. Araç çalışma alanı ilk ekranın çok altına itiliyor; sayfa dili ve görsel tema bölünüyor.

**Kök neden:** `tool-page-enhancer.js`, sayfada zaten header, `h1`, kullanım rehberi ve yardımcı içerik bulunup bulunmadığını kontrol etmeden hepsini tekrar ekliyor.

**Müdahale:** Mevcut `h1` ve banner algılanıyor. Olgun araç sayfalarında yalnız meta/schema, davranış ve erişilebilirlik iyileştirmeleri uygulanıyor; ikinci hero/header/rehber katmanı eklenmiyor. Boş/basit araç şablonlarında önceki zenginleştirme davranışı korunuyor.

**Kabul kriteri:** Her araç sayfasında tam bir adet `h1`; tek global header/breadcrumb; temel işlem paneli mobilde ilk anlamlı ekranlara yakın olmalı.

### P1 — Form kontrollerinde erişilebilir ad eksikliği

**Belirti:** Invoice Generator'da 18, Resume Builder'da 15, Robots.txt Generator'da 2 kontrolün programatik etiketi yok.

**Müdahale:** Ortak iyileştirici yalnız seçilen alt çalışma alanı yerine tüm `main` alanını kapsıyor; gerçek label/aria adı olmayan kontrollere placeholder, name veya id üzerinden okunabilir `aria-label` üretiyor.

**Takip:** Sayfa kaynaklarında gerçek `<label for>` ilişkileri tercih edilmelidir. Otomatik `aria-label`, yapısal form düzeltmesinin güvenlik ağıdır.

### P1 — Dil ve içerik tutarsızlığı

Türkçe görünümde ana sayfada “Quick Start”, “Popular This Week”, “Tools You Can Start With Today” ve “Open” gibi İngilizce metinler bulunuyor. Araç iyileştiricisindeki İngilizce genel metinler Türkçe sayfaların üstüne ekleniyordu. Ayrıca “JSON ila CSV”, “HTML hedefine indirim”, “PDF ila …” gibi makine çevirisi izleri ve büyük harfte yanlış Türkçe `İ` kullanımları görüldü.

**Bu PR'nin etkisi:** Yinelenen İngilizce hero/rehber katmanı mevcut araç sayfalarından kaldırıldı.

**Takip:** Tüm UI metinleri tek i18n sözlüğünden gelmeli; Türkçe için editoryal kalite kontrol ve terim sözlüğü uygulanmalı. Eksik locale içeriği aynı URL'de sessizce dile göre değişmemeli.

### P1 — Sitemap ve temiz rota kapsamı

Mevcut sitemap 283 benzersiz URL içeriyor ve kendi içinde tutarlı. Buna karşılık üretici yalnız dört araç kategori merkezi ekliyor; kullanıcı arayüzünde bulunan 13 kategori sayfası ile bazı kamu/yasal yüzeyler üretim listesinde yok. `disclaimer` temiz URL rewrite'ı da eksikti.

**Müdahale:** 13 kategori merkezi, request-tool, cookie/security ve Türkçe yasal sayfalar sitemap üretimine eklendi. Disclaimer, kategori ve blog clean-route rewrite kuralları tamamlandı.

**Takip:** Canlı ortamın `.html` URL'lerini uzantısız URL'lere yönlendirmesi ile canonical etiketlerin `.html` göstermesi tek bir URL standardında birleştirilmeli. Tercihen uzantısız canonical + 301 redirect kullanılmalı; sitemap yalnız final canonical URL'leri içermeli.

### P1 — 404 sayfasında bozuk öneri bağlantıları

404 sayfasındaki Mortgage Refinance, Compound Interest ve Live Exchange kısayolları `/finance/...` altına gidiyordu; gerçek araç namespace'i `/tools/finance/...`.

**Müdahale:** Üç bağlantı doğru namespace'e taşındı.

### P2 — Ana sayfa ve güven algısı

- Cookie banner ilk ekranın önemli bölümünü kaplıyor.
- Sabit “Site rehberini aç” kontrolü cookie alanıyla çakışıyor.
- Koyu header'da bazı linklerin kontrastı zayıf.
- “Hakkımızda” ve “Trust” aynı hedefe giderek bilgi mimarisini tekrar ediyor.
- Türkçe ve İngilizce kart/başlıklar aynı sayfada karışıyor.

**Plan:** Consent arayüzünü kompakt, WCAG uyumlu ve mobil safe-area kullanan tek katmana indir; rehber düğmesini consent açıkken yukarı taşı veya gizle; header token'larını kontrast testinden geçir; navigasyon etiketlerini tekilleştir.

### P2 — SEO ve içerik yönetişimi

- Developer ve Text kategorilerindeki URL Encoder sayfalarının title'ı aynı.
- Blog fallback dili bazı tarayıcı durumlarında `?lang=tr` canonical ve `noindex, follow` üretiyor; aynı URL'nin SEO sinyali localStorage/tarayıcı diline göre değişebiliyor.
- Mevcut `PHASE5_AUDIT.md` 4.159 URL iddia ederken güncel sitemap 283 URL.
- README eski `novatools.mc` alan adına ve farklı bir depo URL'sine referans veriyor; ölçülmemiş performans iddiaları içeriyor.

**Plan:** Her indexlenebilir sayfa için deterministik dil/canonical üret; benzersiz title matrisi kur; raporları build çıktısından otomatik üret; README ve operasyon dokümanını canlı kaynaklarla eşitle.

### P2 — Depo hijyeni ve teslimat riski

Depoda takip edilen `.venv/Lib/site-packages` içeriği bulunuyor; depo boyutu yaklaşık 133 MB. Bu durum clone, güvenlik taraması ve diff kalitesini kötüleştirir.

**Müdahale:** `.venv/`, `venv/`, `__pycache__/` ve Python bytecode kalıpları `.gitignore` dosyasına eklendi.

**Takip:** Halihazırda izlenen sanal ortam dosyaları ayrı, kontrollü bir PR'de Git indeksinden çıkarılmalı; gerekirse geçmiş BFG/filter-repo ile temizlenmeli. Geçmiş yeniden yazımı ekip koordinasyonu olmadan yapılmamalı.

## Uygulanan değişiklikler

| Dosya | Değişiklik |
|---|---|
| `src/core/router.mjs` | MPA ilk yükünü koruma; SPA linklerini opt-in yapma |
| `src/js/tool-page-enhancer.js` | Var olan header/H1 algılama, yinelenen içerik önleme, a11y kapsamını genişletme |
| `public/_redirects` | Disclaimer, kategori ve blog clean-route kuralları |
| `scripts/generate-localized-sitemap.mjs` | Eksik kategori ve kamu/yasal sayfaları üretime ekleme |
| `404.html` | Üç bozuk finans bağlantısını düzeltme |
| `.gitignore` | Python sanal ortam ve cache kalıpları |
| `tests/site-regressions.mjs` | Kritik rotalama, enhancer, sitemap, redirect ve 404 regresyon kontrolleri |
| `package.json` | Yeni regresyon testini standart test akışına bağlama |

## Müdahale yol haritası

### Aşama 0 — Bu PR / yayın engelleyici düzeltmeler

- Router, enhancer, redirect, sitemap ve 404 yamalarını incele.
- CI'da lint, test, build, link audit ve public route audit çalıştır.
- Preview ortamında aşağıdaki kabul rotalarını kontrol et.
- Başarılıysa düşük trafikli pencerede yayınla ve 30 dakika hata/404 izle.

### Aşama 1 — 1–3 gün

- 128 araçta tek `h1`, tek header ve erişilebilir ad taraması.
- Invoice, Resume ve Robots.txt formlarına gerçek label ilişkileri ekleme.
- Ana sayfa consent/rehber çakışmasını ve header kontrastını düzeltme.
- Türkçe ana sayfa ve en çok kullanılan ilk 20 araç için editoryal dil düzeltmesi.
- Redirect/canonical/sitemap URL standardını tekilleştirme.

### Aşama 2 — 1–2 hafta

- Araçları kategori bazında uçtan uca test et:
  - metin/veri: geçerli, boş, büyük ve hatalı girdi;
  - PDF/görüntü: desteklenen, bozuk, şifreli, çok büyük dosya;
  - finans: sınır değer, para birimi ve ondalık doğruluğu;
  - güvenlik: üretim, kopyalama, entropy/format kontrolleri;
  - sosyal/üretkenlik: kopyalama, indirme ve state sıfırlama.
- Playwright ile ana akışlar, klavye navigasyonu ve mobil viewport testleri.
- Lighthouse bütçelerini ana sayfa + her kategori temsilcisine uygula.
- Blog dil/canonical fallback modelini deterministik yap.
- README ve denetim belgelerini gerçek build metriklerinden üret.

### Aşama 3 — Sürekli kalite kapısı

- Her PR'de sitemap/manifest farkı, duplicate title/H1, kırık dahili link ve canonical/redirect döngüsü testi.
- Haftalık canlı rota duman testi ve 404 trend raporu.
- Aylık bağımlılık, erişilebilirlik ve performans bütçesi incelemesi.
- Yeni araç şablonunda label, locale, schema ve hata durumu kabul listesi.

## Yayın kabul listesi

1. `/about-us`, `/contact`, `/privacy-policy`, `/terms-of-service`, `/disclaimer` ve kategori clean URL'leri 200 içerik göstermeli.
2. 128 araçta `h1` sayısı 1 olmalı.
3. 404 finans önerileri doğru araç sayfalarına ulaşmalı.
4. Yeni sitemap üretiminde 13 kategori ve ek kamu/yasal yüzeyler bulunmalı; yinelenen URL olmamalı.
5. `npm test`, `npm run build`, `npm run lint:site-links` ve `npm run audit:public-routes` başarılı olmalı.
6. Mobilde cookie banner ile sabit rehber kontrolü çakışmamalı.
7. Preview ve canlı ortamda canonical hedefleri redirect sonrası final URL standardıyla aynı olmalı.

## Riskler ve geri alma

- Router değişikliği yalnız açıkça `data-router-link` kullanan SPA geçişlerini yakalar. Kod tabanında yalnız `/` ve `/404` kayıtlı olduğundan bu, mevcut MPA davranışıyla uyumludur.
- Enhancer değişikliği mevcut `h1` bulunan sayfalarda dekoratif içerik enjeksiyonunu azaltır; araç fonksiyon koduna dokunmaz.
- Sitemap URL sayısı artacaktır. Search Console'a göndermeden önce build çıktısı ve canonical standardı doğrulanmalıdır.
- Her değişiklik ayrı dosya commit'i olarak bu dalda bulunduğundan PR kapatılarak veya ilgili commit geri alınarak güvenli rollback yapılabilir.
