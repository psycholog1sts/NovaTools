import manifest from '../../tools-manifest.json';
import { setupDropzones } from './tool-base.js';
import {
  applySeo,
  buildBreadcrumbSchema,
  buildFAQSchema,
  buildSoftwareApplicationSchema,
  upsertJsonLd
} from './seo.js';
import {
  bindEngagementWidgets,
  categoryLabel,
  getSimilarTools,
  recordToolUse,
  renderBlogSuggestions,
  renderCompareTools,
  renderProgressIndicator,
  renderRecentlyUsed,
  renderRelatedTools,
  renderToolEngagementPanel,
  toolHref,
  toolName
} from '../components/engagement-widgets.mjs';
import { setupThemePreference } from '../components/navigation.mjs';

const CATEGORY_LABELS = {
  pdf: 'PDF', image: 'Image', finance: 'Finance', dev: 'Developer', text: 'Text',
  converters: 'Converter', data: 'Data', design: 'Design', productivity: 'Productivity',
  security: 'Security', social: 'Social Media', news: 'News', religious: 'Calendar'
};

const CATEGORY_ROUTES = {
  pdf: 'pdf-tools',
  image: 'image-tools',
  finance: 'finance-tools',
  dev: 'developer-tools',
  text: 'text-writing',
  converters: 'converters',
  data: 'data-tools',
  design: 'design-tools',
  productivity: 'productivity-tools',
  security: 'security-tools',
  social: 'social-media-tools'
};

const ENHANCER_COPY = {
  en: {},
  tr: {
    Home: 'Ana Sayfa',
    Breadcrumb: 'İçerik yolu',
    Image: 'Görsel',
    Finance: 'Finans',
    Developer: 'Geliştirici',
    Text: 'Metin',
    Converter: 'Dönüştürücü',
    Data: 'Veri',
    Design: 'Tasarım',
    Productivity: 'Üretkenlik',
    Security: 'Güvenlik',
    'Social Media': 'Sosyal Medya',
    News: 'Haberler',
    Calendar: 'Takvim',
    Tool: 'Araç',
    'Open tool': 'Aracı aç',
    'Professional utility workflow': 'Profesyonel araç iş akışı',
    'Use this page as an input → action → result workflow with privacy notes, limitations and related next steps kept visible.': 'Bu sayfayı; gizlilik notları, sınırlar ve ilgili sonraki adımlar görünür kalacak şekilde girdi → işlem → sonuç akışı olarak kullanın.',
    'Browser-first where practical; review page notes for tools that need live data or external services.': 'Uygun olduğunda önce tarayıcıda çalışır; canlı veri veya harici servis gerektiren araçlar için sayfa notlarını inceleyin.',
    'Add input:': 'Girdi ekleyin:',
    'Paste text, enter values, or choose files as required by the tool.': 'Aracın gerektirdiği metni yapıştırın, değerleri girin veya dosyaları seçin.',
    'Review settings:': 'Ayarları inceleyin:',
    'Confirm format, order, units, naming, and privacy needs.': 'Biçim, sıra, birim, adlandırma ve gizlilik ihtiyaçlarını doğrulayın.',
    'Run and verify:': 'Çalıştırın ve doğrulayın:',
    'Use the primary action, then review the output before copying, downloading, or sharing.': 'Ana işlemi çalıştırın; ardından çıktıyı kopyalamadan, indirmeden veya paylaşmadan önce inceleyin.',
    'This guide is visible without JavaScript. Remember/collapse preference requires localStorage.': 'Bu kılavuz JavaScript olmadan da görünür. Açık/kapalı tercihini hatırlamak için yerel depolama gerekir.',
    'Workflow support': 'İş akışı desteği',
    'Add input, review settings, use the tool’s own primary action, then inspect the result before download, copy or sharing.': 'Girdiyi ekleyin, ayarları inceleyin, aracın ana işlemini çalıştırın ve indirmeden, kopyalamadan veya paylaşmadan önce sonucu kontrol edin.',
    'Review tool panel': 'Araç panelini incele',
    'Related tool': 'İlgili araç',
    'Result review': 'Sonuç kontrolü',
    'When a result appears, confirm format, readability, file name and privacy needs before using it elsewhere.': 'Sonuç oluştuğunda başka yerde kullanmadan önce biçimi, okunabilirliği, dosya adını ve gizlilik gereksinimlerini doğrulayın.',
    'If something fails': 'Bir şey ters giderse',
    'Check required fields, file type, file size and browser memory. Try a smaller sample when troubleshooting.': 'Zorunlu alanları, dosya türünü, dosya boyutunu ve tarayıcı belleğini kontrol edin. Sorunu incelerken daha küçük bir örnek deneyin.',
    'How to use it in 3 steps': '3 adımda nasıl kullanılır?',
    'Add input': 'Girdi ekleyin',
    'Add the file, text or values needed by the tool. File tools may support drag and drop.': 'Aracın ihtiyaç duyduğu dosyayı, metni veya değerleri ekleyin. Dosya araçları sürükleyip bırakmayı destekleyebilir.',
    'Review settings': 'Ayarları inceleyin',
    'Check output format, order, measurement or calculation settings before running.': 'Çalıştırmadan önce çıktı biçimini, sırayı, ölçüm veya hesaplama ayarlarını kontrol edin.',
    'Review the result': 'Sonucu inceleyin',
    'When processing finishes, download, copy or move to a related next tool.': 'İşlem tamamlandığında çıktıyı indirin, kopyalayın veya ilgili sonraki araca geçin.',
    'Benefits and limits': 'Avantajlar ve sınırlar',
    Benefits: 'Avantajlar',
    '✅ Free start without forced signup': '✅ Zorunlu kayıt olmadan ücretsiz başlangıç',
    '✅ Clear input → action → result flow': '✅ Açık girdi → işlem → sonuç akışı',
    '✅ Designed for mobile and desktop use': '✅ Mobil ve masaüstü kullanım için tasarlandı',
    Limits: 'Sınırlar',
    '⚠️ Very large files can be limited by browser memory.': '⚠️ Çok büyük dosyalar tarayıcı belleğiyle sınırlı olabilir.',
    '⚠️ Review sensitive outputs before sharing.': '⚠️ Hassas çıktıları paylaşmadan önce inceleyin.',
    '⚠️ Tools requiring live data may depend on third-party sources.': '⚠️ Canlı veri gerektiren araçlar üçüncü taraf kaynaklara bağlı olabilir.',
    'Common issues and fixes': 'Yaygın sorunlar ve çözümleri',
    'What if a file does not load?': 'Dosya yüklenmezse ne yapmalıyım?',
    'Check file type, size and browser permissions. Try a smaller sample for very large files.': 'Dosya türünü, boyutunu ve tarayıcı izinlerini kontrol edin. Çok büyük dosyalarda daha küçük bir örnek deneyin.',
    'What if the output looks wrong?': 'Çıktı yanlış görünürse ne yapmalıyım?',
    'Reset settings, review the input and test with a smaller sample.': 'Ayarları sıfırlayın, girdiyi inceleyin ve daha küçük bir örnekle test edin.',
    'What if processing is slow?': 'İşlem yavaşsa ne yapmalıyım?',
    'Split large files or reduce open browser tabs before trying again.': 'Yeniden denemeden önce büyük dosyaları bölün veya açık tarayıcı sekmelerini azaltın.',
    'Example use cases': 'Örnek kullanım alanları',
    Students: 'Öğrenciler',
    'Prepare assignments, notes or data exports before submission.': 'Teslimden önce ödevleri, notları veya veri dışa aktarımlarını hazırlayın.',
    Professionals: 'Profesyoneller',
    'Review proposals, reports or operational outputs before sharing.': 'Teklifleri, raporları veya operasyonel çıktıları paylaşmadan önce inceleyin.',
    'Content teams': 'İçerik ekipleri',
    'Complete format, quality and quick-edit checks before publishing.': 'Yayımlamadan önce biçim, kalite ve hızlı düzenleme kontrollerini tamamlayın.',
    'Related tools': 'İlgili araçlar',
    FAQ: 'Sık Sorulan Sorular',
    'Yes. This page is prepared as a free online workflow for the related tool.': 'Evet. Bu sayfa, ilgili araç için ücretsiz bir çevrim içi iş akışı olarak hazırlanmıştır.',
    'Where does my data go?': 'Verilerim nereye gider?',
    'NovaTools tools are designed browser-first where practical; check page notes when external services are required.': 'NovaTools araçları uygun olduğunda önce tarayıcıda çalışacak şekilde tasarlanır; harici servis gerektiğinde sayfa notlarını kontrol edin.',
    'What should I do if I get an error?': 'Hata alırsam ne yapmalıyım?',
    'Check inputs, file size and format, then retry with adjusted settings.': 'Girdileri, dosya boyutunu ve biçimini kontrol edin; ardından ayarları düzenleyip yeniden deneyin.'
  }
};

const originalEnhancerText = new WeakMap();

function enhancerLanguage() {
  return document.documentElement.lang === 'tr' ? 'tr' : 'en';
}

function translateEnhancerText(value, language = enhancerLanguage()) {
  if (language !== 'tr') return value;
  const exact = ENHANCER_COPY.tr[value];
  if (exact) return exact;
  if (value.startsWith('How to Use ')) return `Nasıl Kullanılır: ${value.slice('How to Use '.length)}`;
  if (value.startsWith('Is ') && value.endsWith(' free to use?')) {
    return `${value.slice('Is '.length, -' free to use?'.length)} ücretsiz mi?`;
  }
  if (value.endsWith(' free to use?')) {
    return `${value.slice(0, -' free to use?'.length)} ücretsiz mi?`;
  }
  const workflowSentence = 'Use this page as an input → action → result workflow with privacy notes, limitations and related next steps kept visible.';
  if (value.includes(workflowSentence)) {
    return value.replace(workflowSentence, ENHANCER_COPY.tr[workflowSentence]);
  }
  return value;
}

function localizeEnhancerSubtree(root = document) {
  const language = enhancerLanguage();
  const selector = '.nt-sticky-tool-header, .premium-tool-hero, .nt-howto, .premium-workspace-companion, .premium-tool-guides';
  root.querySelectorAll(selector).forEach((container) => {
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const initial = originalEnhancerText.get(node) ?? node.nodeValue;
      originalEnhancerText.set(node, initial);
      const leading = initial.match(/^\\s*/)?.[0] || '';
      const trailing = initial.match(/\\s*$/)?.[0] || '';
      const core = initial.slice(leading.length, initial.length - trailing.length);
      node.nodeValue = `${leading}${translateEnhancerText(core, language)}${trailing}`;
    }
    container.querySelectorAll('[aria-label]').forEach((element) => {
      const original = element.dataset.originalAriaLabel || element.getAttribute('aria-label');
      if (!element.dataset.originalAriaLabel) element.dataset.originalAriaLabel = original;
      element.setAttribute('aria-label', translateEnhancerText(original, language));
    });
  });
}

function activeScript() {
  return document.querySelector('script[data-tool-slug][src*="tool-page-enhancer"]');
}

function slugFromPath() {
  const match = window.location.pathname.match(/\/(?:src\/)?tools\/([^/]+)\/([^/]+)\/?/);
  return match ? `${match[1]}/${match[2]}` : '';
}

function findTool(slug) {
  const publicEntry = `/tools/${slug}/`;
  const sourceEntry = `/src/tools/${slug}/`;
  return manifest.tools?.find((tool) => tool.entry === publicEntry || tool.entry === sourceEntry || tool.path === `/${slug}`) || null;
}

function textDescription(tool) {
  const description = tool?.description;
  if (typeof description === 'string') return description;
  const language = enhancerLanguage();
  return description?.[language] || description?.en || description?.tr || 'This tool helps you complete the selected workflow with clear input, action and result steps.';
}

function categoryName(category) {
  return translateEnhancerText(CATEGORY_LABELS[category] || category || 'Tool');
}

function categoryRoute(category) {
  return CATEGORY_ROUTES[category] || `${category || 'index'}-tools`;
}

function displayToolName(tool, slug) {
  return toolName(tool) || slug.split('/').pop().replace(/-/g, ' ');
}

function relatedTools(tool, slug) {
  const category = tool?.category || slug.split('/')[0];
  return getSimilarTools(tool || { category }, 4);
}

function setLocalFlag(key, value) {
  try {
    window.localStorage?.setItem(key, value);
  } catch {
    // localStorage may be unavailable in strict privacy contexts; the UI still works.
  }
}

function getLocalFlag(key) {
  try {
    return window.localStorage?.getItem(key) || '';
  } catch {
    return '';
  }
}

function appendSchema(tool, slug) {
  if (!tool) return;
  const name = displayToolName(tool, slug);
  const category = categoryName(tool.category);
  upsertJsonLd('tool-software-jsonld', buildSoftwareApplicationSchema({
    name,
    description: textDescription(tool),
    category: 'UtilityApplication',
    url: `/tools/${slug}/`,
    features: enhancerLanguage() === 'tr'
      ? [category, 'Ücretsiz çevrim içi iş akışı', 'Tarayıcı tabanlı işlem rehberi']
      : [category, 'Free online workflow', 'Browser-based processing guidance']
  }));
  upsertJsonLd('tool-breadcrumb-jsonld', buildBreadcrumbSchema([
    { name: translateEnhancerText('Home'), url: '/' },
    { name: category, url: `/categories/${categoryRoute(tool?.category || slug.split('/')[0])}.html` },
    { name, url: `/tools/${slug}/` }
  ]));
}

function updateMeta(tool, slug) {
  if (!tool) return;
  const name = displayToolName(tool, slug);
  const category = categoryName(tool.category);
  applySeo({
    type: 'tool',
    path: `/tools/${slug}/`,
    toolName: name,
    category,
    action: textDescription(tool).replace(/\.$/, '').toLowerCase(),
    advantages: enhancerLanguage() === 'tr'
      ? ['tarayıcı tabanlı iş akışı', 'açık kullanım rehberi']
      : ['browser-based workflow', 'clear usage guidance']
  });
}

function createStickyHeader(tool, slug) {
  const name = displayToolName(tool, slug);
  const categoryKey = tool?.category || slug.split('/')[0];
  const category = categoryName(categoryKey);
  const header = document.createElement('div');
  header.className = 'nt-sticky-tool-header';
  header.innerHTML = `<div class="nt-sticky-tool-header__inner">
    <nav aria-label="Breadcrumb"><a href="/">Home</a><span aria-hidden="true">›</span><a href="/categories/${categoryRoute(categoryKey)}.html" data-enhancer-category="${categoryKey}">${category}</a></nav>
    <strong>${name}</strong>
    <a href="#tool-workspace">Open tool</a>
  </div>`;
  return header;
}

function createHero(tool, slug) {
  const name = displayToolName(tool, slug);
  const categoryKey = tool?.category || slug.split('/')[0];
  const category = categoryName(categoryKey);
  const breadcrumb = document.createElement('section');
  breadcrumb.className = 'premium-tool-hero';
  breadcrumb.innerHTML = `
    <div class="container">
      <nav class="premium-tool-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a><span>›</span><a href="/categories/${categoryRoute(categoryKey)}.html" data-enhancer-category="${categoryKey}">${category}</a><span>›</span><span aria-current="page">${name}</span>
      </nav>
      <div class="premium-tool-hero__grid">
        <div>
          <span class="premium-tool-kicker">Professional utility workflow</span>
          <h1>${name}</h1>
          <p><span data-enhancer-description>${textDescription(tool)}</span> Use this page as an input → action → result workflow with privacy notes, limitations and related next steps kept visible.</p>
          <div class="premium-privacy-badge premium-privacy-badge--client">🔒 Browser-first where practical; review page notes for tools that need live data or external services.</div>
        </div>
      </div>
    </div>`;
  return breadcrumb;
}

function createHowToUse(tool, slug) {
  const name = displayToolName(tool, slug);
  const storageKey = `novatools-howto-seen:${slug}`;
  const seen = getLocalFlag(storageKey) === 'true';
  const section = document.createElement('section');
  section.className = 'nt-howto';
  section.innerHTML = `<details ${seen ? '' : 'open'}>
    <summary>How to Use ${name}</summary>
    <ol>
      <li><strong>Add input:</strong> Paste text, enter values, or choose files as required by the tool.</li>
      <li><strong>Review settings:</strong> Confirm format, order, units, naming, and privacy needs.</li>
      <li><strong>Run and verify:</strong> Use the primary action, then review the output before copying, downloading, or sharing.</li>
    </ol>
    <noscript><p>This guide is visible without JavaScript. Remember/collapse preference requires localStorage.</p></noscript>
  </details>`;
  section.querySelector('details')?.addEventListener('toggle', () => setLocalFlag(storageKey, 'true'));
  return section;
}

function createWorkspaceCompanion(tool, slug) {
  const related = relatedTools(tool, slug)[0];
  const panel = document.createElement('aside');
  panel.className = 'premium-workspace-companion';
  panel.innerHTML = `
    <h2>Workflow support</h2>
    <p>Add input, review settings, use the tool’s own primary action, then inspect the result before download, copy or sharing.</p>
    <div class="premium-workspace-actions">
      <a class="btn btn-primary" href="#tool-workspace">Review tool panel</a>
      <a class="btn btn-secondary" href="${related ? toolHref(related) : '/categories/index.html'}">Related tool</a>
    </div>
    ${renderProgressIndicator(tool)}
    ${renderRecentlyUsed()}
    <div class="premium-state premium-state--success">
      <strong>Result review</strong>
      <p>When a result appears, confirm format, readability, file name and privacy needs before using it elsewhere.</p>
    </div>
    <div class="premium-state premium-state--error">
      <strong>If something fails</strong>
      <p>Check required fields, file type, file size and browser memory. Try a smaller sample when troubleshooting.</p>
    </div>`;
  return panel;
}

function createGuides(tool, slug) {
  const name = displayToolName(tool, slug);
  const related = relatedTools(tool, slug);
  const section = document.createElement('section');
  section.className = 'premium-tool-guides';
  section.innerHTML = `
    <div class="container">
      <section class="premium-guide-block" aria-labelledby="premiumStepsTitle">
        <h2 id="premiumStepsTitle">How to use it in 3 steps</h2>
        <ol class="premium-stepper">
          <li><strong>Add input</strong><span>Add the file, text or values needed by the tool. File tools may support drag and drop.</span></li>
          <li><strong>Review settings</strong><span>Check output format, order, measurement or calculation settings before running.</span></li>
          <li><strong>Review the result</strong><span>When processing finishes, download, copy or move to a related next tool.</span></li>
        </ol>
      </section>
      <section class="premium-guide-grid" aria-label="Benefits and limits">
        <div class="premium-guide-card"><h2>Benefits</h2><ul><li>✅ Free start without forced signup</li><li>✅ Clear input → action → result flow</li><li>✅ Designed for mobile and desktop use</li></ul></div>
        <div class="premium-guide-card"><h2>Limits</h2><ul><li>⚠️ Very large files can be limited by browser memory.</li><li>⚠️ Review sensitive outputs before sharing.</li><li>⚠️ Tools requiring live data may depend on third-party sources.</li></ul></div>
      </section>
      <section class="premium-guide-block"><h2>Common issues and fixes</h2><div class="premium-accordion">
        <details><summary>What if a file does not load?</summary><p>Check file type, size and browser permissions. Try a smaller sample for very large files.</p></details>
        <details><summary>What if the output looks wrong?</summary><p>Reset settings, review the input and test with a smaller sample.</p></details>
        <details><summary>What if processing is slow?</summary><p>Split large files or reduce open browser tabs before trying again.</p></details>
      </div></section>
      <section class="premium-guide-block"><h2>Example use cases</h2><div class="premium-scenario-grid">
        <article><h3>Students</h3><p>Prepare assignments, notes or data exports before submission.</p></article>
        <article><h3>Professionals</h3><p>Review proposals, reports or operational outputs before sharing.</p></article>
        <article><h3>Content teams</h3><p>Complete format, quality and quick-edit checks before publishing.</p></article>
      </div></section>
      <section class="premium-guide-block"><h2>Related tools</h2><div class="premium-related-grid">${related.map((item) => `<a href="${toolHref(item)}"><strong>${toolName(item)}</strong><span>${categoryLabel(item.category)}</span></a>`).join('')}</div></section>
      ${renderRelatedTools(tool)}
      ${renderBlogSuggestions(tool)}
      ${renderCompareTools(tool)}
      ${renderToolEngagementPanel(tool)}
      <section class="premium-guide-block"><h2>FAQ</h2><div class="premium-accordion">
        <details><summary>${name} free to use?</summary><p>Yes. This page is prepared as a free online workflow for the related tool.</p></details>
        <details><summary>Where does my data go?</summary><p>NovaTools tools are designed browser-first where practical; check page notes when external services are required.</p></details>
        <details><summary>What should I do if I get an error?</summary><p>Check inputs, file size and format, then retry with adjusted settings.</p></details>
      </div></section>
    </div>`;
  return section;
}

function appendFaqSchema(tool, slug) {
  const name = displayToolName(tool, slug);
  const questions = enhancerLanguage() === 'tr'
    ? [
        { question: `${name} ücretsiz mi?`, answer: 'Evet. Bu araç ücretsiz çevrim içi kullanım için hazırlanmıştır.' },
        { question: 'Verilerim nereye gider?', answer: 'Araçlar uygun olduğunda önce tarayıcıda çalışacak şekilde tasarlanır; harici servis gerektiğinde sayfa notlarını kontrol edin.' },
        { question: 'Hata alırsam ne yapmalıyım?', answer: 'Girdileri, dosya boyutunu ve biçimini kontrol edin; ardından ayarları düzenleyip yeniden deneyin.' }
      ]
    : [
        { question: `Is ${name} free to use?`, answer: 'Yes. This tool is prepared for free online use.' },
        { question: 'Where does my data go?', answer: 'Tools are designed browser-first where practical; check page notes when external services are required.' },
        { question: 'What should I do if I get an error?', answer: 'Check inputs, file size and format, then try again with adjusted settings.' }
      ];
  upsertJsonLd('tool-faq-jsonld', buildFAQSchema(questions));
}

function addTextCounters(workspace) {
  workspace.querySelectorAll('textarea, input[type="text"], input[type="search"], input[type="url"], input[type="email"]').forEach((field, index) => {
    if (field.dataset.ntCounterReady === 'true') return;
    field.dataset.ntCounterReady = 'true';
    const counter = document.createElement('p');
    counter.className = 'nt-live-counter';
    counter.id = field.id ? `${field.id}-counter` : `nt-live-counter-${index}`;
    counter.setAttribute('aria-live', 'polite');
    const describedBy = [field.getAttribute('aria-describedby'), counter.id].filter(Boolean).join(' ');
    field.setAttribute('aria-describedby', describedBy);
    const update = () => {
      const value = field.value || '';
      const words = value.trim() ? value.trim().split(/\s+/).length : 0;
      const bytes = new TextEncoder().encode(value).length;
      counter.textContent = enhancerLanguage() === 'tr'
        ? `${value.length} karakter • ${words} kelime • ${bytes} bayt`
        : `${value.length} characters • ${words} words • ${bytes} bytes`;
    };
    update();
    field.addEventListener('input', update);
    window.addEventListener('languageChanged', update);
    field.insertAdjacentElement('afterend', counter);
  });
}

function addKeyboardHints(workspace) {
  workspace.querySelectorAll('button, input[type="submit"], a.btn').forEach((element) => {
    if (element.dataset.ntShortcutReady === 'true') return;
    const label = element.textContent || element.value || '';
    if (!/convert|format|merge|compress|calculate|generate|validate|process|run/i.test(label)) return;
    element.dataset.ntShortcutReady = 'true';
    const hint = document.createElement('span');
    hint.className = 'nt-shortcut-hint';
    hint.textContent = 'Ctrl+Enter';
    element.insertAdjacentElement('afterend', hint);
  });
}

function addProgressHooks(workspace) {
  const progress = workspace.querySelector('.nt-progress-bar');
  if (!progress) return;
  const fill = progress.querySelector('span');
  workspace.addEventListener('click', (event) => {
    const trigger = event.target.closest('button, input[type="submit"], a.btn');
    if (!trigger || !/convert|format|merge|compress|calculate|generate|validate|process|run/i.test(trigger.textContent || trigger.value || '')) return;
    progress.setAttribute('aria-valuenow', '35');
    if (fill) fill.style.width = '35%';
    window.setTimeout(() => {
      progress.setAttribute('aria-valuenow', '70');
      if (fill) fill.style.width = '70%';
    }, 500);
  });
}

function addSkeletonState(workspace) {
  if (workspace.dataset.ntSkeletonReady === 'true') return;
  workspace.dataset.ntSkeletonReady = 'true';
  workspace.classList.add('nt-tool-loading');
  window.requestAnimationFrame(() => workspace.classList.remove('nt-tool-loading'));
}

function enhanceWorkspace(tool, slug, { augmentContent = true } = {}) {
  const main = document.querySelector('main') || document.querySelector('.tool-wrapper') || document.body;
  const workspace = document.querySelector('.tool-wrapper, .tool-container, .main-content > section, main > section') || main;
  workspace.id = workspace.id || 'tool-workspace';
  workspace.classList.add('premium-tool-workspace');

  if (augmentContent) {
    workspace.insertAdjacentElement('afterbegin', createHowToUse(tool, slug));
    const companion = createWorkspaceCompanion(tool, slug);
    workspace.append(companion);
  }
  setupDropzones(workspace);
  addSkeletonState(workspace);
  addTextCounters(workspace);
  addKeyboardHints(workspace);
  addProgressHooks(workspace);

  main.querySelectorAll('input, textarea, select, button, a').forEach((element) => {
    element.classList.add('premium-focusable');
    const alreadyNamed = element.getAttribute('aria-label')
      || element.getAttribute('aria-labelledby')
      || element.labels?.length
      || element.closest('label');
    if (!alreadyNamed) {
      const rawLabel = element.getAttribute('placeholder')
        || element.getAttribute('name')
        || element.id
        || element.textContent?.trim()
        || element.value;
      const label = rawLabel
        ?.replace(/[-_]+/g, ' ')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .trim();
      if (label) element.setAttribute('aria-label', label);
    }
  });
  workspace.querySelectorAll('.result, .results, .result-panel, .results-panel, .output, .output-area').forEach((element) => {
    element.classList.add('premium-result-panel');
  });
}

function refreshLocalizedMetadata() {
  const slug = activeScript()?.dataset.toolSlug || slugFromPath();
  if (!slug) return;
  const tool = findTool(slug) || { id: slug.replace('/', '-'), category: slug.split('/')[0], name: slug.split('/').pop().replace(/-/g, ' '), entry: `/tools/${slug}/` };
  document.querySelectorAll('[data-enhancer-description]').forEach((element) => {
    element.textContent = textDescription(tool);
  });
  document.querySelectorAll('[data-enhancer-category]').forEach((element) => {
    element.textContent = categoryName(element.dataset.enhancerCategory);
  });
  updateMeta(tool, slug);
  appendSchema(tool, slug);
  appendFaqSchema(tool, slug);
  localizeEnhancerSubtree(document);
}

function init() {
  const slug = activeScript()?.dataset.toolSlug || slugFromPath();
  if (!slug || document.body.dataset.premiumToolReady === 'true') return;
  const tool = findTool(slug) || { id: slug.replace('/', '-'), category: slug.split('/')[0], name: slug.split('/').pop().replace(/-/g, ' '), entry: `/tools/${slug}/` };
  document.body.dataset.premiumToolReady = 'true';

  setupThemePreference('#themeToggle');
  recordToolUse(tool);
  updateMeta(tool, slug);
  appendSchema(tool, slug);
  appendFaqSchema(tool, slug);
  const hasExistingHeading = Boolean(document.querySelector('h1'));
  const hasExistingHeader = Boolean(document.querySelector('header, [role="banner"]'));
  if (!hasExistingHeader) document.body.prepend(createStickyHeader(tool, slug));
  if (!hasExistingHeading) document.body.prepend(createHero(tool, slug));
  enhanceWorkspace(tool, slug, { augmentContent: !hasExistingHeading });
  if (!hasExistingHeading && !document.querySelector('.premium-tool-guides')) {
    document.body.append(createGuides(tool, slug));
  }
  bindEngagementWidgets(document);
  localizeEnhancerSubtree(document);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

window.addEventListener('languageChanged', refreshLocalizedMetadata);
