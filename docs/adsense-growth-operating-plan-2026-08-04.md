# NovaTools AdSense ve 100K/Gün Organik Büyüme İşletim Planı

**Tarih:** 4 Ağustos 2026  
**Durum:** Kod tarafı uygulanmış; Google AdSense ve Search Console hesap içi adımları operatör onayı gerektirir.  
**Hedef:** AdSense başvuru risklerini azaltmak, kullanıcı deneyimini korumak ve gerçek organik talep üzerinden ölçeklenebilir trafik sistemi kurmak.

## 1. Gerçekçi hedef tanımı

Günde 100.000 sayfa görüntüleme bir kod ayarıyla garanti edilemez. Bu seviye yaklaşık ayda 3 milyon sayfa görüntüleme demektir. Oturum başına 1,8 sayfa varsayımında günde yaklaşık 55.600 oturum gerekir. Organik sonuçlarda ortalama %4 tıklama oranı varsayılırsa yaklaşık 1,39 milyon günlük arama gösterimi gerekir.

Bu rakamlar taahhüt değil, kapasite hesabıdır. Hedef; bot, satın alınmış gösterim, tıklama değişimi veya teşvikli trafik olmadan şu dört kaldıraçla büyütülmelidir:

1. Arama talebi olan kaliteli araçlar.
2. Her araç etrafında özgün rehber ve gerçek kullanım örnekleri.
3. Güçlü iç bağlantı ve sonraki işlem akışları.
4. Search Console verisine göre sürekli iyileştirme.

Google, insanlara yardımcı olmak yerine sıralama manipülasyonu amacıyla çok sayıda düşük değerli sayfa üretmeyi “scaled content abuse” olarak değerlendirebilir. Bu nedenle otomatik olarak binlerce benzer sayfa üretmek bu planın parçası değildir.

## 2. Resmî Google gereksinimlerinden çıkan kararlar

### AdSense içerik ve envanter değeri

- Sayfalar özgün, anlamlı ve kullanıcıya gerçek değer sağlamalıdır.
- Boş, yapım aşamasında, hata veren veya yalnız gezinme amacı taşıyan sayfalarda reklam gösterilmemelidir.
- Reklam ve ücretli tanıtım miktarı yayıncı içeriğini aşmamalıdır.
- Reklamlar menü, indirme, kopyalama veya araç çalıştırma düğmesi gibi görünmemelidir.
- Kullanıcı reklama tıklamaya veya sayfayı yenilemeye teşvik edilmemelidir.
- Bot, autosurf, paid-to-click, click-exchange ve teşvikli trafik yasaktır.
- Araç, oyun ve uygulama benzeri yüzeyler özgün açıklama, örnek, sınırlama ve rehber olmadan “düşük değerli” görülebilir.

### Consent/CMP

Site içindeki özel çerez paneli Google sertifikalı reklam CMP’si değildir. EEA, Birleşik Krallık ve İsviçre’de AdSense reklamları için Google sertifikalı, IAB TCF entegre CMP kullanılmalıdır. TCF v2.3, 1 Mart 2026’dan sonra üretilen TC string’leri için zorunludur.

Kod değişikliğiyle site çerez paneli yalnız analitik ve fonksiyonel tercihlere ayrıldı. Reklam tercihi Google’ın sertifikalı CMP mesajına bırakıldı. Bu, kullanıcının iki farklı panelde aynı reklam tercihini vermesi gibi amatör ve hukuken belirsiz bir akışı önler.

### AdSense kodu ve ads.txt

- `google-adsense-account` meta etiketi ve tek AdSense bağlantı script’i tüm build edilmiş sayfalara eklenir.
- `ads.txt` kök alan adında yayınlanır.
- Publisher ID: `pub-5738022526587953`.
- Yetkili satıcı satırı:

~~~txt
google.com, pub-5738022526587953, DIRECT, f08c47fec0942fa0
~~~

- Örnek/fabrikasyon manuel reklam slot kimlikleri kaldırıldı.
- Manuel reklam birimleri gerçek AdSense hesabından kopyalanan slotlar girilene kadar kapalıdır.
- İlk onay ve trafik öğrenme döneminde Auto Ads, hesap içinden kontrollü biçimde yönetilmelidir.

## 3. Kod tarafında uygulanan profesyonelleştirme

| Alan | Uygulama |
|---|---|
| Site bağlantısı | Her build sayfasında tek AdSense meta + bağlantı script’i |
| ads.txt | Kök ve public kopyalarda aynı yetkili satıcı satırı |
| Manuel slotlar | Örnek slot ID’leri kaldırıldı; doğrulanmış ID yoksa container gizleniyor |
| Çift yükleyici | `src/i18n.js` ve `public/i18n.js` içindeki ikinci AdSense bootstrap kaldırıldı |
| Consent | Özel panelden reklam kategorisi kaldırıldı; Google sertifikalı CMP’ye ayrıldı |
| Mobil UX | Consent paneli küçültüldü; açıkken site rehberi düğmesi gizlenerek çakışma önlendi |
| CI | AdSense readiness denetimi artık standart `ci:validate` akışının parçası |
| Politika koruması | Sahte slot, çift script, eksik ads.txt, yanlış CMP iddiası ve duplicate H1 build’i engeller |

## 4. AdSense hesabında yapılması zorunlu adımlar

Bu adımlar kaynak kodundan yapılamaz; `https://www.google.com/adsense/` hesabında site sahibi tarafından uygulanmalıdır.

### Site ve kimlik

1. AdSense → Sites → `https://mc-novatools.com`.
2. Publisher ID’nin `pub-5738022526587953` olduğunu doğrula.
3. Site bağlantı yöntemi olarak AdSense kodu/meta algılamasının başarılı olduğunu kontrol et.
4. Ads.txt durumunun `Authorized` olmasını bekle.
5. Başvuruda yalnız production alan adını kullan; Vercel preview veya başka alt alan adı ekleme.

### Google sertifikalı CMP

1. Privacy & messaging → European regulations.
2. Google CMP mesajı oluştur.
3. EEA, UK ve Switzerland kapsamını etkinleştir.
4. “Consent / Do not consent / Manage options” seçeneklerini görünür tut.
5. Google CMP Consent Mode entegrasyon seçeneklerini Analytics ve reklam depolaması için değerlendirip etkinleştir.
6. Mesajı yayınla.
7. AdSense Policy Center’da `No CMP`, `CMP not certified` veya `Low coverage` uyarısı kalmadığını doğrula.
8. TCF v2.3 desteğinin aktif olduğunu doğrula.

### İlk reklam ayarı

Onay gelmeden agresif reklam yerleşimi yapılmamalıdır. Onaydan sonra:

1. Ads → By site → MC NovaTools → Edit.
2. Auto Ads’i aç.
3. Başlangıçta düşük/orta ad load kullan.
4. Önce in-page banner ve sınırlı Multiplex deneyi kullan.
5. Anchor, vignette, side rail ve intent-driven formatları ilk aşamada kapalı tut.
6. Aşağıdaki sayfaları Page exclusions ile reklamsız bırak:
   - 404
   - contact / iletisim
   - privacy-policy / gizlilik-politikasi
   - cookie-policy
   - terms-of-service / kullanim-kosullari
   - disclaimer
   - security
   - request-tool ve teşekkür sayfası
7. Araç input, dropzone, kopyala, indir ve çalıştır düğmelerinin yakınına reklam yerleştirme.
8. İki hafta veri topladıktan sonra yalnız engagement ve CWV bozulmuyorsa bir formatı deney olarak aç.
9. Her deneyi tek değişkenli yap; trafik bölme özelliği varsa kullan.

## 5. AdSense başvuru öncesi go/no-go kapısı

Aşağıdakilerin tamamı sağlanmadan başvuru yapılmamalı:

- [ ] PR #149 birleştirilmiş ve production’a yayınlanmış.
- [ ] Canlı clean URL’lerde soft 404 yok.
- [ ] 128 araçta bir adet H1 var.
- [ ] Kırık dahili link yok.
- [ ] Sitemap Search Console’da `Success`.
- [ ] Ads.txt `Authorized`.
- [ ] Google sertifikalı CMP mesajı yayınlanmış.
- [ ] Policy Center’da CMP coverage sorunu yok.
- [ ] Contact e-posta/form teslimatı gerçekten çalışıyor.
- [ ] About, author, privacy, cookie, terms ve disclaimer bilgileri doğru.
- [ ] Yazar adları ve uzmanlık iddiaları gerçek ve doğrulanabilir.
- [ ] Telif hakkı belirsiz görsel/metin yok.
- [ ] Araçlarda örnek, sınırlama, gizlilik ve hata durumları var.
- [ ] Blog içerikleri editoryal kontrolden geçmiş ve kaynakları doğru.
- [ ] Mobil consent ve araç kontrolleri çakışmıyor.
- [ ] LCP ≤ 2,5 sn, INP < 200 ms, CLS < 0,1 hedefleri saha verisinde izleniyor.
- [ ] Trafik kaynakları organik ve meşru; satın alınmış/bot trafik yok.
- [ ] Canlı reklam veya Auto Ads denemesinde accidental-click riski yok.

## 6. 100K/gün büyüme sistemi

### Aşama A — Temel güven ve indeksleme: 0–1.000 görüntüleme/gün

- Search Console domain property doğrula.
- Sitemap’leri gönder: `/sitemap.xml`, `/sitemap-tools.xml`, `/sitemap-blog.xml`.
- Pages, Core Web Vitals, HTTPS, Security Issues ve Manual Actions raporlarını temizle.
- Her kategori için bir ana workflow rehberi belirle.
- En güçlü ilk 20 araç için özgün ekran görüntüsü, örnek girdi/çıktı, hata senaryosu ve FAQ ekle.
- Aynı amaca hizmet eden duplicate araçları birleştir veya canonical/noindex kararı ver.
- Türkçe ve İngilizceyi aynı URL’de tarayıcı durumuna göre değiştirmek yerine deterministik locale modeli kur.

### Aşama B — Konu otoritesi: 1.000–10.000/gün

Her yüksek potansiyelli araç için bir küme:

- Araç sayfası.
- “Nasıl yapılır?” rehberi.
- Gerçek kullanım senaryosu.
- Sorun giderme rehberi.
- Format/alternatif karşılaştırması.
- Bir sonraki işlem aracı.

Örnek PDF kümesi:

~~~mermaid
flowchart TD
  A["PDF birleştir"] --> B["Dosya sırasını kontrol et"]
  B --> C["PDF sıkıştır"]
  C --> D["Boyut ve kaliteyi doğrula"]
  D --> E["İndir veya dönüştür"]
~~~

Her rehber ilgili araca; her araç yalnız gerçekten ilgili 3–5 rehbere bağlanmalıdır. Rastgele related tools listeleri kullanılmamalıdır.

### Aşama C — Kazanan sorguları ölçekleme: 10.000–30.000/gün

Search Console’da her hafta şu dört segment çıkarılır:

1. Pozisyon 4–15, yüksek gösterim: içeriği ve snippet’i geliştir.
2. Yüksek pozisyon, düşük CTR: title/description niyet uyumunu düzelt.
3. Yüksek tıklama, düşük engagement: sayfa hızını ve ilk ekranı düzelt.
4. Yüksek engagement, düşük gösterim: ilgili rehber ve meşru dış bağlantı dağıtımı yap.

Yeni içerik fikirleri yalnız gerçek query verisi, kullanıcı araması ve araç kullanım verisinden üretilmelidir. Trend olduğu için alakasız konu eklenmemelidir.

### Aşama D — 30.000–100.000+/gün

- En iyi 20 sayfanın dil ve ülke talebine göre profesyonel yerelleştirmesi.
- Eğitim kurumları, geliştirici toplulukları ve kaynak sayfalarından editoryal backlink.
- Araç sonuçlarından sonraki mantıklı işlem akışı.
- Kaydedilebilir workflow koleksiyonları; zorunlu üyelik yok.
- Gerçek veriyle karşılaştırma sayfaları ve özgün araştırma.
- Kullanıcıların geri döneceği güvenli yerel geçmiş/favori özellikleri.
- Search Console API/Looker Studio ile günlük anomali, indeks ve CTR paneli.
- Trafik yoğunlaştıkça CDN cache, asset bütçesi ve RUM örnekleme.

## 7. Kullanıcının sitede kalma süresini artırma

Kalma süresi içeriği gereksiz uzatarak değil, görevi tamamlatıp doğru sonraki adıma geçirerek artırılmalıdır:

- Araç üstünde kısa amaç açıklaması.
- İlk ekranda input ve ana işlem.
- Çalışan örnek düğmesi.
- Sonuçtan sonra doğrulama checklist’i.
- “Şimdi ne yapmalıyım?” altında en fazla üç ilgili işlem.
- Büyük dosya/yanlış format için açık hata çözümü.
- Kullanıcının girdisini sunucuya göndermediğini açıklayan gerçek gizlilik notu.
- Blog içinde içindekiler, ilerleme, örnek ve doğrudan araca dönüş.
- Mobilde yapışkan reklam veya banner ile işlem düğmesini kapatmama.

Ana KPI’lar:

| KPI | Amaç |
|---|---|
| Tool completion rate | Araç gerçekten işe yarıyor mu? |
| Error rate | Hangi araçlarda kullanıcı takılıyor? |
| Related workflow CTR | Kullanıcı sonraki mantıklı adıma geçiyor mu? |
| Engaged sessions | Sayfa yalnız açılıp kapanıyor mu? |
| Scroll 75% | Rehber gerçekten okunuyor mu? |
| Organic CTR | Arama snippet’i niyetle uyumlu mu? |
| Returning users | Site tekrar kullanılmaya değer mi? |
| CWV good URL % | Büyüme deneyimi bozuyor mu? |

## 8. Haftalık işletim rutini

- **Pazartesi:** Search Console clicks, impressions, CTR, position; indeks ve sitemap hataları.
- **Salı:** Pozisyon 4–15 fırsatları; düşük CTR snippet testi; cannibalization kontrolü.
- **Çarşamba:** Bir kazanan araca özgün örnek, hata ve doğrulama içeriği; bir eski rehber güncellemesi.
- **Perşembe:** Tool completion/error, workflow CTR, mobil UX ve Core Web Vitals.
- **Cuma:** Telif, politika, yazar doğruluğu, Policy Center ve ads.txt kontrolü.

## 9. Yasak yöntemler

- Bot veya otomatik sayfa görüntüleme.
- Paid-to-click, autosurf, click-exchange.
- Kullanıcıdan reklama tıklamasını isteme.
- Reklamı indirme veya araç düğmesi gibi gösterme.
- Çok sayıda yapay zekâ metnini incelemeden yayınlama.
- Arama talebi var diye site odağı dışına çıkma.
- Satın alınmış spam backlink paketleri.
- Sahte yazar, diploma, uzmanlık, yorum veya puan.
- Telifli içeriği yeniden yazıp özgünmüş gibi sunma.
- Sırf reklam göstermek için boş/ince sayfa oluşturma.

## 10. Resmî kaynaklar

- AdSense Program policies: https://support.google.com/adsense/answer/48182
- Invalid traffic and common closure reasons: https://support.google.com/adsense/answer/2660562
- Google-certified CMP requirements: https://support.google.com/adsense/answer/13554116
- TCF integration and Purpose 1 guidance: https://support.google.com/adsense/answer/9804260
- TCF v2.3 troubleshooting: https://support.google.com/adsense/answer/9999955
- Google CMP consent mode: https://support.google.com/adsense/answer/16088460
- Auto Ads overview/settings: https://support.google.com/adsense/answer/9261805
- Page exclusions: https://support.google.com/adsense/answer/9262311
- Helpful, reliable, people-first content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Generative AI content guidance: https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- Core Web Vitals: https://developers.google.com/search/docs/appearance/core-web-vitals
- Search Console setup: https://developers.google.com/search/docs/monitor-debug/search-console-start
- Search Console + Analytics monitoring: https://developers.google.com/search/docs/monitor-debug/google-analytics-search-console
