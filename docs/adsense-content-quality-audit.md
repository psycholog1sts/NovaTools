# MC-NovaTools — AdSense İçerik Kalitesi Denetimi ve Uygulanan Düzeltmeler

**Tarih:** 2026-11-04
**Dal:** `feat/adsense-content-quality` (taban: `main` @ `76777bf2`)
**Kapsam:** Sitemap'teki tüm indekslenebilir sayfalar (önce 91, sonra 87 URL), bunları üreten build betikleri, araç çalışma zamanları ve TR/EN çeviri katmanı.
**İlişkili program:** [`adsense-remediation-program-2026-08-25.md`](adsense-remediation-program-2026-08-25.md). Bu rapor onun "Layer 1–3" döngüsünün bir turudur ve oradaki yeniden inceleme kapısını değiştirmez.

---

## 1. Yöntem

1. **Envanter:** Canlı `sitemap.xml`, `sitemap-tools.xml` ve `sitemap-blog.xml` dosyalarındaki her URL için şu bilgiler toplandı:
   - HTTP durumu, `X-Robots-Tag`, meta robots, canonical, `hreflang`
   - `<title>`, meta description, H1
   - `<main>` içindeki görünür kelime sayısı
   - İngilizce sayfada geçen Türkçe cümle sayısı

   "Önce" ölçümü canlı siteden, "sonra" ölçümü bu dalın build çıktısından (`dist/`) alındı ve ikisi aynı betikle yapıldı.
2. **Tarayıcı kontrolü:** 26 sertifikalı araç sayfası canlıda İngilizce modda tek tek açıldı. Değişen sayfalar yerel build önizlemesinde İngilizce ve Türkçe olarak ayrı ayrı test edildi:
   - Form gönderme, sonuç ve hata metinleri
   - Sayfa yeniden yüklenmeden dil değiştirme
   - 375 px mobil görünüm ve yatay kaydırma
   - Konsol hataları
3. **Kod doğrulaması:** Sayfalardaki her iddia, ilgili aracın kaynak koduyla karşılaştırıldı (ör. Unix zaman damgası UTC davranışı, mortgage vergi varsayılanları, görsel çeviricinin yeniden kodlaması).
4. **Resmî kaynaklar (2026-11-04'te okundu):**
   - AdSense program politikaları ve düşük değerli içerik: https://support.google.com/adsense/answer/81904
   - Faydalı ve insan odaklı içerik: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
   - Spam politikaları (doorway, ölçekli içerik, yanıltıcı işlevsellik): https://developers.google.com/search/docs/essentials/spam-policies
   - Üretken yapay zekâ içeriği: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content

**Erişilemeyenler:** AdSense hesabına ve ret bildirimine erişimim yok. Bu yüzden belirli bir ret gerekçesi kesinleşmiş gibi sunulmuyor; aşağıdaki riskler Google'ın yayımlanmış ölçütlerine ve sitede gözlenen kanıtlara dayanıyor. Search Console verisine de erişilmedi ve hiçbir indeksleme verisi uydurulmadı.

## 2. Özet: önce ve sonra

| Ölçüt (sitemap URL'leri) | Önce (canlı) | Sonra (bu dal) |
|---|---|---|
| Sitemap'teki URL sayısı | 91 | 87 |
| 200 dışı yanıt / noindex / canonical uyuşmazlığı | 0 / 0 / 0 | 0 / 0 / 0 |
| `<main>` içinde 150 kelimeden az sayfa | 13 | 5 |
| Türkçe cümle içeren İngilizce sayfa | 15 | **0** |
| Başlığını başka bir sayfayla paylaşan sayfa | 13 | **0** |
| Her deploy'da "bugün değişti" diyen `lastmod` | 91 / 91 | 0 (tarih = kaynak dosyanın son commit'i) |
| İçeriği aynı olan ikinci URL (hub kopyası, yazar taslağı) | 6 | 0 |
| Yanlış `hreflang` etiketli Türkçe sayfa | 4 | 0 |

Gerçek araç sayfaları zaten büyük ölçüde özgündü. Ortak (şablon) cümlelerin metne oranı sayfa başına %0–9 arasındaydı; araçların kopya içerik sorunu yoktu. Asıl sorunlar şunlardı:
- İngilizce sayfalarda Türkçe metin
- Aynı içeriğin iki URL'de yayımlanması
- JavaScript olmadan boş görünen makaleler
- Sahte görünen meta veriler: her makalede aynı tarih ve okuma süresi, her deploy'da güncellenen `lastmod`

## 3. Bulunan sorunlar ve yapılan düzeltmeler

### 3.1 Aynı içeriğin iki URL'de yayımlanması (doorway/kopya riski)
- **Bulgu:**
  - `/tools/{pdf,image,developer,finance}/`, `/categories/*-tools` sayfalarının bire bir kopyasıydı; metin %95 aynıydı ve başlık da aynıydı.
  - Kopyaların her biri kendini canonical gösteriyordu ve sitemap'te listeleniyordu.
- **Kök neden:** `scripts/post-build-fix.mjs` içindeki `publishCleanCategoryAliases()`, kopyalara kendi rotalarını canonical olarak basıyordu.
- **Düzeltme:**
  - Kopyalar artık asıl kategori sayfasını canonical gösteriyor.
  - Sitemap'ten çıkarıldılar. URL'ler çalışmaya devam ediyor, kırık bağlantı oluşmadı.
  - `tests/site-regressions.mjs` bunu koruyor.

### 3.2 Yazar sayfaları
- **Bulgu:**
  - Sitemap'te 29–31 kelimelik `/author/metehan/` ve `/author/editorial/` taslakları vardı.
  - Makalelerin bağlantı verdiği 479 ve 493 kelimelik asıl profiller (`/author/metehan-cetin`, `/author/novatools-editorial`) sitemap'te yoktu.
- **Düzeltme:**
  - Sitemap, `authors.json` içindeki `profileUrl` alanından tam profilleri listeliyor.
  - Taslaklar `public/_redirects` ile 301 yönlendiriliyor.

### 3.3 Sitemap `lastmod`
- **Bulgu:** Bütün URL'lerin `lastmod` değeri build zamanıydı. Bu, her deploy'da "her sayfa değişti" demek. Google bunu "içerik değişmeden tarihi güncel göstermek" olarak sayıyor.
- **Düzeltme:**
  - `scripts/generate-localized-sitemap.mjs`, her URL için kaynak dosyasının son commit tarihini kullanıyor (deploy iş akışı `fetch-depth: 0` ile tam git geçmişini çekiyor).
  - Kaynak dosyası bulunamazsa alan hiç yazılmıyor.
  - Üretilen dosya iki çalıştırma arasında birebir aynı kalıyor.

### 3.4 Türkçe sayfaların `hreflang` değeri
- **Bulgu:** `iletisim`, `gizlilik-politikasi`, `kullanim-kosullari` ve `kvkk-aydinlatma-metni` sayfaları Türkçe ama kendilerini `hreflang="en"` olarak işaretliyordu.
- **Düzeltme:** İki ayrı noktada düzeltildi ve her ikisi de testle korunuyor (`tests/gsc-canonical-query-regressions.mjs`):
  - `src/js/locale-seo-normalizer.mjs`: i18n çalışma zamanını yükleyen sayfalar için.
  - `src/components/Analytics.mjs` (`applySeoHead`): yüklemeyen sayfalar için.

### 3.5 JavaScript olmadan boş görünen 5 blog makalesi
- **Bulgu:**
  - Yalnızca manifestte bulunan 5 makale (`rule-of-72…`, `understanding-json-web-tokens…`, `edit-pdf-without-adobe…`, `lazy-loading-images…`, `browser-based-tools-vs-desktop…`) ortak şablondan üretiliyordu.
  - Ham HTML'de Türkçe bir yer tutucu H1 ("Tarayıcı Öncelikli Araçlar Ne Anlama Gelir?"), sabit tarihler ve boş bir gövde vardı.
  - SEO adımı `<title>`'ı bu H1'den türettiği için beşi de aynı Türkçe başlıkla ve 32 kelimeyle yayındaydı.
- **Düzeltme:** `prerenderTemplateArticle()` her makalenin şu öğelerini build sırasında HTML'e yazıyor:
  - Başlık, özet, kategori ve breadcrumb
  - Tarihler ve okuma süresi
  - İçerik blokları (yaklaşık 1.070–1.190 kelime)
  - Şablonun arayüz metinleri

  Tarayıcıdaki JavaScript aynı veriyi yeniden çizdiği için kullanıcı tarafında bir şey değişmedi.

### 3.6 Her makaleye basılan sabit yazarlık bloğu
- **Bulgu:**
  - Bütün makalelere aynı blok basılıyordu: "Published 2026-04-17 · Last modified 2026-06-03 · 11 min read · Reviewed by Metehan Çetin, LPC".
  - Bu bilgi makalelerin kendi verisiyle çelişiyordu; örneğin Rule of 72'nin yayın tarihi 2026-06-03 ve okuma süresi 9 dakika.
  - Yazar profili açıkça hiçbir lisans iddia etmediğini söylüyor. Projenin `public-claim-policy` kuralı "LPC"yi zaten siliyordu, ama sabit inceleyen satırı her makalede kalıyordu.
- **Düzeltme:**
  - Tarihler makalenin kendi JSON-LD verisinden, okuma süresi metninden hesaplanıyor.
  - Genel "Reviewed by" satırı kaldırıldı. Makale başına gerçek `reviewedBy` verisi olan şablon makalelerde şablon bunu zaten kendisi gösteriyor.
  - Sayfanın kendi tarihli yazar satırı varsa blok hiç eklenmiyor.

### 3.7 İngilizce finans sayfalarının Türkçe çalışması (en büyük dil sorunu)
- **Bulgu:** `lang="en"` olarak yayımlanan 7 sertifikalı finans sayfasında aşağıdaki öğelerin hepsi Türkçeydi; İngilizce modda bile değişmiyordu:
  - Giriş paragrafı ve veri notu
  - "Hazır." durum metni ve "nasıl çalışır" bölümü
  - Form etiketleri, sonuçlar, hata mesajları ve grafik etiketleri
  - Build'in eklediği yasal uyarı

  Canlı ölçümde bu sayfalarda 3–13 Türkçe cümle vardı. Sayfalar: retirement, student-loan, live-exchange, stock-lookup, crypto-prices, mortgage-refinance, compound-interest.
- **Düzeltme:**
  - Yeni `src/tools/finance/finance-i18n.mjs`, i18n katmanının ayarladığı sayfa dilini okuyor ve `languageChanged` olayında arayüzü yeniden çiziyor.
  - Üç çalışma zamanı modülü (`live-market-tools.mjs`, `mortgage-refinance.mjs` ve `p0-batch2.mjs` içindeki emeklilik ve öğrenci kredisi yolları) EN/TR metin tablolarıyla çalışıyor.
  - Node ortamında modüller eskisi gibi Türkçe çıktı veriyor, böylece mevcut test sözleşmeleri bozulmadı.
  - Sayfa metinleri İngilizce kaynak artı `data-i18n` anahtarı olarak yazıldı; Türkçesi `public/locales/tr` dosyasına taşındı.
  - Türkçe "nasıl çalışır" paragrafları girişi tekrar ediyordu; artık kodun gerçekte uyguladığı formülü anlatıyor.
- **Tarayıcı doğrulaması:**
  - İngilizcede formlar, sonuçlar ve hatalar İngilizce.
  - Türkçede her şey Türkçe ve tutarlar ₺ biçiminde.
  - Dil değiştirildiğinde girilen değer korunuyor. Konsolda hata yok.

### 3.8 Doğruluk hataları (sayfanın söylediği ile kodun yaptığı uyuşmuyordu)

| Sayfa | Önce | Gerçek davranış ve düzeltme |
|---|---|---|
| Mortgage refinance | "KKDF %15 ve BSMV %5 dahil" | Varsayılanlar 0 ve oranları kullanıcı giriyor (bunu test de doğruluyor). Metin düzeltildi. |
| Mortgage refinance | `parseMoneyInput("3500.75")` sonucu 350075 | Sayı inputundan gelen nokta ondalığı binlik ayracı sanılıyordu; başabaş süresi 23 yerine 2.292 ay çıkıyordu. Düz ondalık sayılar artık doğru okunuyor; "1.250.000,50" biçimi de çalışmaya devam ediyor. |
| Yaş hesaplayıcı | "eğlence amaçlı yaş tahmini" | Araç iki tarihten tam yaşı hesaplıyor; uyarı düzeltildi. |
| Unix zaman damgası | "cihazın yerel saat ayarına göre hesaplanır" | Zaman damgası UTC tabanlı; yalnızca gösterilen yerel tarih cihazın saat dilimini kullanıyor. |
| Görsel çevirici | "verileriniz işlenmez", "tahmini değerler sunar" | Görsel tarayıcıda işleniyor ve yüklenmiyor; çevirme enterpolasyonsuz, indirilen dosya tarayıcıda yeniden kodlanıyor. |
| Saat dilimi, sayı tabanı (TR) | Türkçe metin İngilizcenin eski sürümüydü | İki dil artık aynı şeyi söylüyor. |

### 3.9 İki dilli "English / Türkçe" uyarı blokları
- **Bulgu:**
  - 10 dönüştürücü sayfasında, fatura oluşturucuda ve görsel çeviricide uyarılar "Legal Disclaimer / Yasal Uyarı: <EN> / <TR>" biçimindeydi.
  - Bu blok her iki dil sürümünde de iki dili birden gösteriyordu.
  - Ayrıca build sırasında finans sayfalarına yalnızca Türkçe bir uyarı ekleniyordu.
- **Düzeltme:** Hepsi İngilizce kaynak metin artı `data-i18n-html` anahtarına taşındı; Türkçesi locale dosyasında.

### 3.10 Keşfedilemeyen sertifikalı araçlar ve Türkçe araç adları
- **Bulgu:**
  - Emeklilik ve öğrenci kredisi araçları sertifikalı ve sitemap'teydi, ama `meta.json` dosyaları yoktu. Bu yüzden manifestte yer almıyor, ana sayfada, aramada ve ilgili araç listelerinde görünmüyorlardı. Başlıkları da URL'den üretiliyordu ("student loan – Free Online Finance Tool").
  - `toolName()` İngilizce sayfalarda da Türkçe `name` alanını döndürüyordu ("PDF Bölme").
- **Düzeltme:**
  - İki araç için `meta.json` eklendi; manifest 131'den 133 araca çıktı.
  - `toolName()` sayfa Türkçe değilse `nameEn` döndürüyor.
  - Ana sayfanın mobil yükseklik testi, eklenen iki kart nedeniyle 12.900 px'e çıkarıldı (yerelde ölçülen 12.653 px).

### 3.11 Blog kategori arşivleri
- **Bulgu:**
  - Beş arşivin her biri yalnızca 1 makale listeliyordu (yaklaşık 90 kelime).
  - Giriş metinleri kalıp bir ifadeydi ("Publication-ready MC NovaTools guides for …").
  - Nedeni, blog manifestindeki kategorilerin tutarsız olması; örneğin `emergency-fund-guide` "artificial-intelligence" altında.
- **Düzeltme:**
  - Arşivler konu bazında listeleniyor: Finance 24, PDF 2, Developer 2 makale.
  - Giriş ve meta açıklamaları somut birer konu tanımı oldu.
  - `CollectionPage` ItemList kartlarla eşleşiyor.
  - Manifestin kendisi korunan i18n yolunda olduğu için değiştirilmedi.

### 3.12 İçeriğin nasıl üretildiğinin açıklanması
- **Bulgu:** Google, okuyucunun merak edeceği durumlarda otomasyon ve yapay zekâ kullanımının açıklanmasını öneriyor. Sitede böyle bir açıklama yoktu, oysa depo içeriğin yapay zekâ ajanlarıyla üretildiğini açıkça gösteriyor.
- **Düzeltme:** `about-us.html` dosyasına "How tools and guides are made" bölümü eklendi. Bölüm yalnızca depodan doğrulanabilen ifadeler içeriyor:
  - İçerik yapay zekâ destekli hazırlanıyor.
  - Bir araç ancak sertifikasyon testlerinden geçtikten sonra listeleniyor.
  - Sertifikasız sayfalar noindex ve sitemap dışında. Build'de 107/107 sertifikasız araç sayfasının noindex olduğu doğrulandı.
- **Sahibin onayı gerekiyor:** Bu bölüm site sahibi adına yapılmış kamuya açık bir beyandır.

## 4. Sayfa bazında envanter

Kelime sayısı, ham HTML'deki `<main>` öğesinin görünür metnidir (yani JavaScript çalıştırmayan bir tarayıcının gördüğü metin).

**Ana sayfa uyarısı:** "Sonra" değeri (241), yerel build'de ana sayfanın ön render adımı Playwright tarayıcısı olmadığı için atlandığından düşük çıkıyor. Bu adım CI'da çalışıyor; canlıdaki 953 kelime ana sayfanın gerçek değeridir ve bu dal ana sayfa içeriğini değiştirmiyor.

| URL | Tür | Kelime (önce → sonra) | EN sayfada Türkçe cümle (önce → sonra) | Sonraki başlık |
|---|---|---|---|---|
| /author/editorial | Yazar | 31 → kaldırıldı (301) | 0 → — | — |
| /author/metehan | Yazar | 29 → kaldırıldı (301) | 0 → — | — |
| /author/metehan-cetin | Yazar | — → 250 (sitemap'e eklendi) | – → 0 | Metehan Çetin |
| /author/novatools-editorial | Yazar | — → 246 (sitemap'e eklendi) | – → 0 | NovaTools Editorial Review |
| /blog/articles/401k-rollover-guide | Blog | 1706 → 1698 | 0 → 0 | 401k Rollover Guide 2026 |
| /blog/articles/auto-insurance-savings | Blog | 1608 → 1600 | 0 → 0 | Auto Insurance Savings Guide 2026 |
| /blog/articles/best-credit-cards-2026 | Blog | 1900 → 1892 | 0 → 0 | Best Credit Cards for Rewards in 2026 |
| /blog/articles/browser-based-tools-vs-desktop-software-privacy-comparison | Blog | **32 → 1106** | 3 → 0 | Browser-Based Tools vs Desktop Software: Privacy Comparison |
| /blog/articles/cloud-cost-comparison | Blog | 1837 → 1829 | 0 → 0 | AWS vs Azure vs GCP: Cloud Cost Comparison 2026 |
| /blog/articles/credit-score-hacks | Blog | 1556 → 1548 | 0 → 0 | Credit Score Hacks: Boost Your FICO Fast |
| /blog/articles/crypto-tax-guide | Blog | 2734 → 2726 | 0 → 0 | Crypto Tax Guide: Everything You Need to Know |
| /blog/articles/debt-consolidation-guide | Blog | 2028 → 2020 | 0 → 0 | Debt Consolidation: Is It Right for You? |
| /blog/articles/edit-pdf-without-adobe-acrobat-free-methods | Blog | **32 → 1194** | 3 → 0 | How to Edit a PDF Without Adobe Acrobat: 5 Free Methods |
| /blog/articles/emergency-fund-guide | Blog | 2256 → 2248 | 0 → 0 | Building an Emergency Fund: The Complete 2026 Guide |
| /blog/articles/first-time-home-buyer | Blog | 2510 → 2502 | 0 → 0 | First-Time Home Buyer's Complete Checklist |
| /blog/articles/halal-mortgage-usa | Blog | 1820 → 1812 | 0 → 0 | Halal Mortgage Alternatives in the USA |
| /blog/articles/health-insurance-marketplace | Blog | 1687 → 1679 | 0 → 0 | Health Insurance Marketplace Guide 2026 |
| /blog/articles/high-yield-savings-guide | Blog | 1403 → 1395 | 0 → 0 | Best High-Yield Savings Accounts 2026 |
| /blog/articles/index-funds-vs-etfs | Blog | 2010 → 2002 | 0 → 0 | Index Funds vs ETFs |
| /blog/articles/islamic-finance-investing | Blog | 2276 → 2268 | 0 → 0 | Islamic Finance Principles for Modern Ethical Investing |
| /blog/articles/lazy-loading-images-implementation-guide-2026 | Blog | **32 → 1097** | 3 → 0 | Lazy Loading Images: Implementation Guide for 2026 |
| /blog/articles/life-insurance-coverage-guide | Blog | 1824 → 1816 | 0 → 0 | How Much Life Insurance Do You Really Need? |
| /blog/articles/mortgage-refinancing-guide | Blog | 2168 → 2160 | 0 → 0 | Complete Guide to Mortgage Refinancing in 2026 |
| /blog/articles/nft-tax-guide | Blog | 1891 → 1883 | 0 → 0 | NFT Taxes: What Crypto Investors Must Know in 2025 |
| /blog/articles/pdf-financial-records | Blog | 1979 → 1971 | 0 → 0 | Managing PDF Documents for Financial Records |
| /blog/articles/personal-loan-vs-credit-card | Blog | 1728 → 1720 | 0 → 0 | Personal Loan vs Credit Card |
| /blog/articles/pmi-removal-guide | Blog | 1875 → 1867 | 0 → 0 | Private Mortgage Insurance (PMI) Removal Guide |
| /blog/articles/retirement-planning-millennials | Blog | 1781 → 1773 | 0 → 0 | Retirement Planning for Millennials & Gen Z |
| /blog/articles/rule-of-72-estimate-investment-doubling-time | Blog | **32 → 1067** | 3 → 0 | Rule of 72: How to Estimate Investment Doubling Time |
| /blog/articles/student-loan-repayment | Blog | 2022 → 2014 | 0 → 0 | Student Loan Repayment Strategies That Actually Work in 2026 |
| /blog/articles/tax-deductions-homeowners | Blog | 1454 → 1446 | 0 → 0 | Tax Deductions Homeowners Forget to Claim |
| /blog/articles/term-vs-whole-life | Blog | 2279 → 2271 | 0 → 0 | Term vs Whole Life Insurance: Which Is Better for You? |
| /blog/articles/understanding-json-web-tokens-structure-security | Blog | **32 → 1066** | 3 → 0 | Understanding JSON Web Tokens (JWT): Structure and Security |
| /blog/articles/zakat-investments-guide | Blog | 1981 → 1973 | 0 → 0 | Understanding Zakat on Investments |
| /blog | Blog hub | 168 → 160 | 1 → 0 | NovaTools Blog – Improve Your Digital Productivity |
| /blog/categories/finance-calculators | Arşiv | **91 → 1013** | 0 → 0 | Finance & Calculators Archives |
| /blog/categories/pdf-document-management | Arşiv | 101 → 141 | 0 → 0 | PDF & Document Management Archives |
| /blog/categories/developer-tools-coding | Arşiv | 91 → 131 | 0 → 0 | Developer Tools & Coding Archives |
| /blog/categories/image-processing-web-performance | Arşiv | 95 → 95 | 0 → 0 | Image Processing & Web Performance Archives |
| /blog/categories/productivity-tool-guides | Arşiv | 94 → 90 | 0 → 0 | Productivity & Tool Guides Archives |
| /categories/ | Kategori | 406 → 406 | 0 → 0 | Find the right NovaTools workflow by task |
| /categories/converters | Kategori | 512 → 512 | 0 → 0 | Converters for practical browser workflows |
| /categories/design-tools | Kategori | 423 → 423 | 0 → 0 | Design Tools for practical browser workflows |
| /categories/developer-tools | Kategori | 444 → 444 | 0 → 0 | Developer Tools for practical browser workflows |
| /categories/finance-tools | Kategori | 457 → 457 | 0 → 0 | Finance Tools for practical browser workflows |
| /categories/image-tools | Kategori | 472 → 472 | 0 → 0 | Image Tools for practical browser workflows |
| /categories/pdf-tools | Kategori | 612 → 612 | 0 → 0 | PDF Tools for practical browser workflows |
| /categories/security-tools | Kategori | 404 → 404 | 0 → 0 | Security Tools for practical browser workflows |
| /tools/{pdf,image,developer,finance}/ | Hub kopyası | 481–897 → sitemap dışı, canonical = kategori | 0 → — | — |
| /tools/converters/age-calculator | Araç | 1203 → 1196 | 0 → 0 | Age Calculator |
| /tools/converters/bmi-calculator | Araç | 1232 → 1212 | 0 → 0 | BMI Calculator |
| /tools/converters/number-base-converter | Araç | 941 → 921 | 0 → 0 | Number Base Converter |
| /tools/converters/percentage-calculator | Araç | 551 → 538 | 0 → 0 | Percentage Calculator |
| /tools/converters/roman-numerals | Araç | 1003 → 986 | 0 → 0 | Roman Numerals Converter |
| /tools/converters/scientific-calculator | Araç | 863 → 848 | 0 → 0 | Scientific Calculator |
| /tools/converters/timezone-converter | Araç | 1007 → 989 | 0 → 0 | Time Zone Converter |
| /tools/converters/unit-converter | Araç | 545 → 529 | 0 → 0 | Unit Converter |
| /tools/converters/unix-timestamp | Araç | 991 → 978 | 0 → 0 | Unix Timestamp Converter |
| /tools/design/invoice-generator | Araç | 1205 → 1177 | 3 → 0 | Invoice Generator |
| /tools/dev/geo-compliance-inspector | Araç | 549 → 549 | 0 → 0 | GEO & Schema Compliance Inspector |
| /tools/finance/compound-interest | Araç | 968 → 969 | 3 → 0 | Compound Interest Calculator |
| /tools/finance/crypto-prices | Araç | 465 → 493 | **13 → 0** | Crypto Price Tracker |
| /tools/finance/live-exchange | Araç | 543 → 579 | **12 → 0** | Live Exchange Converter |
| /tools/finance/mortgage-refinance | Araç | 952 → 969 | 6 → 0 | Mortgage Refinance Calculator |
| /tools/finance/retirement | Araç | 523 → 574 | **10 → 0** | Retirement Calculator |
| /tools/finance/roi-calculator | Araç | 724 → 724 | 0 → 0 | ROI Calculator |
| /tools/finance/stock-lookup | Araç | 450 → 480 | **11 → 0** | Stock Quote Lookup |
| /tools/finance/student-loan | Araç | 525 → 568 | **10 → 0** | Student Loan Payoff Calculator |
| /tools/image/compress | Araç | 353 → 353 | 0 → 0 | Image Compressor |
| /tools/image/image-flipper | Araç | 762 → 728 | 5 → 0 | 🔀 Image Flipper |
| /tools/pdf/compress | Araç | 547 → 547 | 0 → 0 | PDF Compressor |
| /tools/pdf/merge | Araç | 1166 → 1166 | 0 → 0 | 📎 PDF Merge Tool |
| /tools/pdf/redact | Araç | 821 → 821 | 0 → 0 | PDF Redact & PII Check |
| /tools/pdf/split | Araç | 892 → 892 | 0 → 0 | ✂️ PDF Split Tool |
| /tools/security/rlsproof | Araç | 570 → 570 | 0 → 0 | Prove your Supabase data boundaries before release. |
| / | Ana sayfa | 953 (canlı, ön render'lı) | 0 → 0 | Everyday tools that show their work |
| /about-us | Güven | 966 → 1125 | 0 → 0 | About MC NovaTools |
| /contact, /privacy-policy, /terms-of-service, /cookie-policy, /disclaimer, /security, /refund-policy | Güven | 304–1093 (değişmedi) | 0 → 0 | — |
| /iletisim, /gizlilik-politikasi, /kullanim-kosullari, /kvkk-aydinlatma-metni | Güven (TR) | 112–352 (değişmedi) | – | hreflang en → **tr** |
| /pricing, /request-tool | Site | 418, 255 (değişmedi) | 0 → 0 | — |

Kaynak makalelerdeki 8 kelimelik düşüş bilinçli: her sayfaya basılan "Reviewed by …, 11 min read" satırı kaldırıldı. Dönüştürücü sayfalarındaki düşüş de bilinçli: uyarının İngilizce sayfada görünen Türkçe yarısı kaldırıldı.

## 5. Değişen dosyalar

- **SEO/build:**
  - `scripts/post-build-fix.mjs`: hub canonical, şablon makale ön render, gerçek yazarlık bloğu, İngilizce finans uyarısı
  - `scripts/generate-localized-sitemap.mjs`: git tabanlı `lastmod`, hub kopyalarının kaldırılması, tam yazar profilleri
  - `src/js/locale-seo-normalizer.mjs`, `src/components/Analytics.mjs`: Türkçe sayfa hreflang
  - `public/_redirects`: yazar taslakları için 301
  - Yeniden üretilen sitemap'ler (`public/sitemap*.xml`, `sitemap*.xml`) ve `site-links.txt`
- **Finans:**
  - `src/tools/finance/finance-i18n.mjs` (yeni)
  - `live-market-tools.mjs`, `mortgage-refinance.mjs`, `p0-batch2.mjs`
  - Yedi finans sayfasının `index.html` dosyası
  - `retirement/meta.json` ve `student-loan/meta.json` (yeni)
  - `tools-manifest.json`
- **i18n ve içerik:**
  - `public/locales/en/translation.json`, `public/locales/tr/translation.json` (yalnızca anahtar ekleme)
  - 10 dönüştürücü sayfası, `design/invoice-generator`, `image/image-flipper`
  - `src/blog/index.html`, `blog/categories/*.html`, `about-us.html`
  - `src/components/engagement-widgets.mjs`
- **Testler:**
  - `tests/site-regressions.mjs`
  - `tests/gsc-canonical-query-regressions.mjs`
  - `tests/e2e/accessibility.spec.mjs` (ana sayfa yükseklik sınırı)

## 6. Komutlar ve sonuçlar

| Komut | Sonuç |
|---|---|
| `npm test` (tam zincir) | ✅ geçti |
| `npm run lint` | ✅ 0 hata (5 uyarı önceden de vardı) |
| `npm run lint:i18n` | ✅ 4.115 sayfa düzeyi anahtar (EN/TR) |
| `npm run audit:public-routes` | ✅ |
| `npm run lint:blog-outlines` | ✅ 100 outline |
| `npm run audit:adsense` | ✅ |
| `npm run build:sitemap` | ✅ ve iki çalıştırma arasında birebir aynı |
| `npm run build` | ⚠️ Son adım `build:csp`, Windows'ta "vercel.json CSP out of sync" hatası veriyor. Bu `main`'de de aynı ve bilinen bir yerel hash farkı; CI (Linux) yetkili kaynak. Önceki bütün adımlar çalışıyor ve `dist` üretiliyor. |
| `prerender-home` | ⚠️ Yerelde atlanıyor (Playwright tarayıcısı kurulu değil); CI'da çalışıyor. |
| Playwright e2e ve Lighthouse | Yerelde çalıştırılmadı (tarayıcı yok); PR CI'ında çalışacak. |

## 7. Çözülmeyen sorunlar ve kalan riskler

1. **Blog konu dağılımı:** 30 yayımlanmış makalenin 24'ü ABD odaklı kişisel finans konusu (kredi kartı, sigorta, NFT vergisi). Araç sitesinin odağıyla zayıf bağlantılı ve YMYL (para/sağlık) içerik; Google bu konularda uzmanlık sinyali bekliyor. Makaleler özgün ve uzun, ama "araç sitesi" kimliğiyle uyumu zayıf. Bu bir ürün kararı; içerik budaması önerilir ama sahibin onayı olmadan yapılmadı.
2. **Blog manifestindeki kategoriler yanlış:** Örneğin `emergency-fund-guide` "artificial-intelligence" altında. Arşivler konu bazında düzeltildi, ama `/blog/?category=` filtresi hâlâ manifesti kullanıyor. Düzeltme korunan `src/i18n/blog/*.json` dosyasında yapılmalı.
3. **Hâlâ zayıf olan sayfalar:** Image Processing ve Productivity arşivleri tek makale listeliyor (90–95 kelime). Ya yeni makale eklenmeli ya da bu iki arşiv noindex yapılmalı.
4. **Başlıklarda emoji:** `🔀 Image Flipper`, `📎 PDF Merge Tool`, `✂️ PDF Split Tool`. Zararsız ama profesyonel görünümü zayıflatıyor; dokunulmadı.
5. **"Converter" kategori etiketi:** Yaş ve VKİ hesaplayıcıları çalışma zamanında "Free Online Converter Tool" başlığı alıyor (kategori = converters). Ayrı bir küçük düzeltme gerekiyor.
6. **Ayrı PR'lar:**
   - [#285](https://github.com/psycholog1sts/NovaTools/pull/285): Enhancer başlığında `nameEn` kullanımı. CI yeşil, onayınızı bekliyor.
   - Bu daldaki `toolName()` değişikliği aynı sorunu ilgili araç listeleri için de çözüyor; iki PR birbiriyle çakışmıyor.
7. **Finans footer'ındaki "Metehan ÇETİN, LPC" ve `psk.dan.…` e-postası:** Kaynak HTML'de duruyor. Build global footer'ı koyduğu için canlıda görünmüyor, ama kaynakta bu iddia kalıyor.
8. **Sitemap'in kaydedilmiş kopyası:** `lastmod` commit tarihinden geldiği için kaydedilen kopya bir commit geride kalıyor. CI her build'de yeniden ürettiği için canlıdaki doğru oluyor.
9. **Canlı veri araçları:** Hata davranışı testle korunuyor, ama yerel önizlemede `/api/live-data` olmadığı için bu araçlar uçtan uca test edilemedi.

## 8. Sonuç: düşük içerik kalitesi gerekçesiyle ret riski azaldı mı?

**Evet, ölçülebilir biçimde azaldı. Ama "riski %5'in altına indirdik" demek için yeterli kanıt yok.** Programın yeniden inceleme kapısı da bunu henüz karşılamıyor.

**Riskin azaldığını gösteren kanıtlar:**
- İngilizce sayfalarda Türkçe cümle 15 sayfadan 0'a indi. AdSense incelemesi tutarsız dil kalitesini doğrudan görür.
- Aynı başlığı paylaşan sayfa sayısı 13'ten 0'a indi. Aynı içeriğin ikinci URL'si 6'dan 0'a indi. Bu, doorway ve kopya içerik sinyalini ortadan kaldırıyor.
- JavaScript olmadan 32 kelime görünen 5 makale artık yaklaşık 1.100 kelimelik gerçek içerik sunuyor.
- Sahte görünen tarih sinyalleri kaldırıldı: her makalede aynı tarih ve okuma süresi, her deploy'da "değişti" diyen `lastmod`.
- Altı sayfa-iddia uyuşmazlığı ve bir hesaplama hatası (mortgage) düzeltildi. Bu, "yanıltıcı işlevsellik" riskini azaltıyor.
- İçeriğin nasıl üretildiği Google'ın önerdiği biçimde ve doğrulanabilir ifadelerle açıklandı.
- Sertifikasız 107 araç sayfasının tamamı noindex ve sitemap dışında. Yani incelemeye açık yüzey yalnızca test edilmiş araçlardan oluşuyor.

**Devam eden riskler:**
- Blogun ağırlıklı olarak ABD kişisel finans (YMYL) içeriğinden oluşması ve araçlarla zayıf bağlantısı.
- Zayıf kalan 2 arşiv sayfası.
- Değişikliklerin henüz canlıda olmaması, Search Console'da yeniden taranmamış olması ve Google'ın gördüğü eski snippet'lerin hâlâ dolaşımda olması.

**Yeniden başvurmadan önce:**
1. Bu PR'ı ve #285'i inceleyip onaylayın.
2. Merge ve canlı doğrulama yapılsın.
3. Search Console'da değişen URL'ler için yeniden tarama isteyin.
4. Blog konu odağı (madde 7.1) için karar verin.

Bu adımlar tamamlanmadan "request review" yapılmaması önerilir.
