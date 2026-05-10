import manifest from '../../tools-manifest.json';
import { ToolController, setupDropzones } from './tool-base.js';

const CATEGORY_LABELS = {
  pdf: 'PDF', image: 'Görsel', finance: 'Finans', dev: 'Geliştirici', text: 'Metin',
  converters: 'Dönüştürücü', data: 'Veri', design: 'Tasarım', productivity: 'Verimlilik',
  security: 'Güvenlik', social: 'Sosyal Medya', news: 'Haber', religious: 'Takvim'
};

function activeScript() {
  return document.querySelector('script[data-tool-slug][src*="tool-page-enhancer"]');
}

function slugFromPath() {
  const match = window.location.pathname.match(/\/tools\/([^/]+)\/([^/]+)\/?/);
  return match ? `${match[1]}/${match[2]}` : '';
}

function findTool(slug) {
  const entry = `/tools/${slug}/`;
  return manifest.tools?.find((tool) => tool.entry === entry) || null;
}

function textDescription(tool) {
  const description = tool?.description;
  if (typeof description === 'string') return description;
  return description?.tr || description?.en || 'Bu araç, seçili işlemi hızlı ve anlaşılır bir iş akışıyla tamamlamanıza yardımcı olur.';
}

function categoryName(category) {
  return CATEGORY_LABELS[category] || category || 'Araç';
}

function toolName(tool, slug) {
  return tool?.name || tool?.nameEn || slug.split('/').pop().replace(/-/g, ' ');
}

function relatedTools(tool, slug) {
  const category = tool?.category || slug.split('/')[0];
  return (manifest.tools || [])
    .filter((candidate) => candidate.category === category && candidate.id !== tool?.id)
    .slice(0, 4);
}

function appendSchema(tool, slug) {
  if (!tool || document.querySelector('script[data-premium-schema="software"]')) return;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: toolName(tool, slug),
    description: textDescription(tool),
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Web',
    url: `https://mc-novatools.com/tools/${slug}/`,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
  };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.dataset.premiumSchema = 'software';
  script.textContent = JSON.stringify(schema);
  document.head.append(script);
}

function updateMeta(tool, slug) {
  if (!tool) return;
  const name = toolName(tool, slug);
  const category = categoryName(tool.category);
  document.title = `${name} – Ücretsiz Online ${category} Aracı | NovaTools`;
  let meta = document.querySelector('meta[name="description"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'description';
    document.head.append(meta);
  }
  meta.content = `${name} ile ${textDescription(tool)} Adım adım rehber, gizlilik notu, hata çözümleri ve ilgili araçlar tek sayfada.`.slice(0, 157);
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement('link');
    canonical.rel = 'canonical';
    document.head.append(canonical);
  }
  canonical.href = `https://mc-novatools.com/tools/${slug}/`;
}

function createHero(tool, slug) {
  const name = toolName(tool, slug);
  const category = categoryName(tool?.category || slug.split('/')[0]);
  const breadcrumb = document.createElement('section');
  breadcrumb.className = 'premium-tool-hero';
  breadcrumb.innerHTML = `
    <div class="container">
      <nav class="premium-tool-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Ana Sayfa</a><span>›</span><a href="/categories/${tool?.category || slug.split('/')[0]}-tools.html">${category}</a><span>›</span><span aria-current="page">${name}</span>
      </nav>
      <div class="premium-tool-hero__grid">
        <div>
          <span class="premium-tool-kicker">Premium workflow</span>
          <h1>${name} – Hızlı ve Güvenli Kullanım</h1>
          <p>${textDescription(tool)} Bu sayfa kullanım adımlarını, gizlilik notlarını, sınırları ve hata çözümlerini aynı iş akışında gösterir.</p>
          <div class="premium-privacy-badge premium-privacy-badge--client">🔒 Verileriniz tarayıcı öncelikli iş akışında ele alınır; harici servis gereken araçlarda sayfa içi notları kontrol edin.</div>
        </div>
      </div>
    </div>`;
  return breadcrumb;
}

function createWorkspaceCompanion(tool, slug) {
  const name = toolName(tool, slug);
  const panel = document.createElement('aside');
  panel.className = 'premium-workspace-companion';
  panel.innerHTML = `
    <h2>İşlem Kontrolü</h2>
    <p>Girişleri ekleyin, ayarları gözden geçirin ve aracın kendi birincil butonuyla işlemi başlatın.</p>
    <div class="premium-workspace-actions">
      <button class="btn btn-primary btn-lg" type="button" data-premium-demo-success>${name} akışını kontrol et</button>
      <button class="btn btn-secondary" type="button" data-premium-reset>Sıfırla</button>
    </div>
    <div class="premium-state premium-state--success" tabindex="-1" hidden data-premium-success>
      <strong>✅ İşlem tamamlandı!</strong>
      <p data-tool-success-message>Sonuç hazır olduğunda indirme veya kopyalama seçenekleri aracın sonuç alanında görünür.</p>
      <a class="btn btn-secondary" href="${relatedTools(tool, slug)[0]?.entry || '/categories/index.html'}">Sonraki önerilen araç</a>
    </div>
    <div class="premium-state premium-state--error" tabindex="-1" hidden data-premium-error>
      <strong>⚠️ İşlem tamamlanamadı</strong>
      <p data-tool-error-message>Dosya boyutu, zorunlu alanlar veya format ayarlarını kontrol edip tekrar deneyin.</p>
      <button class="btn btn-secondary" type="button" data-premium-retry>Tekrar Dene</button>
    </div>`;
  return panel;
}

function createGuides(tool, slug) {
  const name = toolName(tool, slug);
  const related = relatedTools(tool, slug);
  const section = document.createElement('section');
  section.className = 'premium-tool-guides';
  section.innerHTML = `
    <div class="container">
      <section class="premium-guide-block" aria-labelledby="premiumStepsTitle">
        <h2 id="premiumStepsTitle">3 Adımda Kullanım</h2>
        <ol class="premium-stepper">
          <li><strong>Girdiyi ekleyin</strong><span>Dosya, metin veya sayı alanlarını doldurun; dosya araçlarında sürükle-bırak kullanabilirsiniz.</span></li>
          <li><strong>Ayarları kontrol edin</strong><span>Çıktı formatı, sıralama, ölçü veya hesaplama seçeneklerini işlemden önce gözden geçirin.</span></li>
          <li><strong>Sonucu alın</strong><span>İşlem tamamlandığında sonucu indirin, kopyalayın veya ilgili sonraki araca geçin.</span></li>
        </ol>
      </section>
      <section class="premium-guide-grid" aria-label="Avantajlar ve sınırlar">
        <div class="premium-guide-card"><h2>Avantajlar</h2><ul><li>✅ Ücretsiz ve kayıtsız başlangıç</li><li>✅ Net giriş → işlem → sonuç akışı</li><li>✅ Mobil ve masaüstü kullanımına uygun arayüz</li></ul></div>
        <div class="premium-guide-card"><h2>Sınırlar / Limitler</h2><ul><li>⚠️ Büyük dosyalarda tarayıcı performansı düşebilir.</li><li>⚠️ Hassas verilerde çıktıyı paylaşmadan önce mutlaka kontrol edin.</li><li>⚠️ Harici veri gerektiren araçlarda üçüncü taraf kaynak notlarını inceleyin.</li></ul></div>
      </section>
      <section class="premium-guide-block"><h2>Sık Karşılaşılan Hatalar ve Çözümleri</h2><div class="premium-accordion">
        <details><summary>Dosya yüklenmiyorsa ne yapmalıyım?</summary><p>Dosya tipini, boyutunu ve tarayıcı izinlerini kontrol edin. 50MB üzerindeki dosyaları küçültmeyi deneyin.</p></details>
        <details><summary>Çıktı beklediğim gibi değilse?</summary><p>Ayarları sıfırlayın, girdiyi tekrar kontrol edin ve küçük bir örnekle yeniden deneyin.</p></details>
        <details><summary>İşlem uzun sürüyorsa?</summary><p>Çok büyük dosyaları parçalara ayırın veya tarayıcı sekmelerini azaltarak tekrar deneyin.</p></details>
      </div></section>
      <section class="premium-guide-block"><h2>Örnek Kullanım Senaryoları</h2><div class="premium-scenario-grid">
        <article><h3>Öğrenciler</h3><p>Ödev, not veya veri çıktısını teslim öncesi tek akışta düzenleyin.</p></article>
        <article><h3>Profesyoneller</h3><p>Teklif, rapor veya operasyon çıktısını paylaşmadan önce kontrol edin.</p></article>
        <article><h3>İçerik ekipleri</h3><p>Yayın öncesi format, kalite ve hızlı düzenleme kontrollerini tamamlayın.</p></article>
      </div></section>
      <section class="premium-guide-block"><h2>İlgili Araçlar</h2><div class="premium-related-grid">${related.map((item) => `<a href="${item.entry}"><strong>${item.name || item.nameEn}</strong><span>${categoryName(item.category)}</span></a>`).join('')}</div></section>
      <section class="premium-guide-block"><h2>Sık Sorulan Sorular</h2><div class="premium-accordion">
        <details><summary>${name} ücretsiz mi?</summary><p>Evet. Bu sayfa ilgili aracı ücretsiz online iş akışı olarak kullanmanız için hazırlanmıştır.</p></details>
        <details><summary>Verilerim nereye gidiyor?</summary><p>NovaTools araçları tarayıcı öncelikli çalışacak şekilde tasarlanır; harici servis gereken durumlarda sayfa içi notları kontrol edin.</p></details>
        <details><summary>Hata alırsam ne yapmalıyım?</summary><p>Girdileri, dosya boyutunu ve formatı kontrol edin. Ardından “Tekrar Dene” veya “Sıfırla” seçeneklerini kullanın.</p></details>
      </div></section>
    </div>`;
  return section;
}

function appendFaqSchema(tool, slug) {
  const name = toolName(tool, slug);
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: `${name} ücretsiz mi?`, acceptedAnswer: { '@type': 'Answer', text: 'Evet. Bu araç ücretsiz online kullanım için hazırlanmıştır.' } },
      { '@type': 'Question', name: 'Verilerim nereye gidiyor?', acceptedAnswer: { '@type': 'Answer', text: 'Araçlar tarayıcı öncelikli çalışacak şekilde tasarlanır; harici servis gereken durumlarda sayfa içi notlar kontrol edilmelidir.' } },
      { '@type': 'Question', name: 'Hata alırsam ne yapmalıyım?', acceptedAnswer: { '@type': 'Answer', text: 'Girdileri, dosya boyutunu ve formatı kontrol edip tekrar deneyin.' } }
    ]
  };
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.dataset.premiumSchema = 'faq';
  script.textContent = JSON.stringify(schema);
  document.head.append(script);
}

function enhanceWorkspace(tool, slug) {
  const main = document.querySelector('main') || document.querySelector('.tool-wrapper') || document.body;
  main.classList.add('premium-tool-workspace');
  const statusRegion = document.createElement('div');
  statusRegion.className = 'sr-only';
  statusRegion.setAttribute('aria-live', 'polite');
  statusRegion.setAttribute('data-premium-status', '');
  main.prepend(statusRegion);

  const companion = createWorkspaceCompanion(tool, slug);
  main.append(companion);
  setupDropzones(main);

  const controller = new ToolController({
    form: main.querySelector('form'),
    statusRegion,
    successPanel: companion.querySelector('[data-premium-success]'),
    errorPanel: companion.querySelector('[data-premium-error]')
  }).init();

  companion.querySelector('[data-premium-demo-success]')?.addEventListener('click', () => controller.runDemo());
  companion.querySelector('[data-premium-reset]')?.addEventListener('click', () => controller.reset());
  companion.querySelector('[data-premium-retry]')?.addEventListener('click', () => controller.showError('Lütfen alanları kontrol edin ve aracın işlem butonuyla tekrar deneyin.'));
}

function init() {
  const slug = activeScript()?.dataset.toolSlug || slugFromPath();
  if (!slug || document.body.dataset.premiumToolReady === 'true') return;
  const tool = findTool(slug) || { category: slug.split('/')[0], name: slug.split('/').pop().replace(/-/g, ' ') };
  document.body.dataset.premiumToolReady = 'true';

  updateMeta(tool, slug);
  appendSchema(tool, slug);
  appendFaqSchema(tool, slug);
  document.body.prepend(createHero(tool, slug));
  enhanceWorkspace(tool, slug);
  document.body.append(createGuides(tool, slug));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
