import manifest from '../../tools-manifest.json';
import { setupDropzones } from './tool-base.js';
import {
  applySeo,
  buildBreadcrumbSchema,
  buildFAQSchema,
  buildSoftwareApplicationSchema,
  upsertJsonLd
} from './seo.js';

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
  return description?.tr || description?.en || 'This tool helps you complete the selected workflow with clear input, action and result steps.';
}

function categoryName(category) {
  return CATEGORY_LABELS[category] || category || 'Tool';
}

function categoryRoute(category) {
  return CATEGORY_ROUTES[category] || `${category || 'index'}-tools`;
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
  if (!tool) return;
  const name = toolName(tool, slug);
  const category = categoryName(tool.category);
  upsertJsonLd('tool-software-jsonld', buildSoftwareApplicationSchema({
    name,
    description: textDescription(tool),
    category: 'UtilityApplication',
    url: `/tools/${slug}/`,
    features: [category, 'Free online workflow', 'Browser-based processing guidance']
  }));
  upsertJsonLd('tool-breadcrumb-jsonld', buildBreadcrumbSchema([
    { name: 'Home', url: '/' },
    { name: category, url: `/categories/${categoryRoute(tool?.category || slug.split('/')[0])}.html` },
    { name, url: `/tools/${slug}/` }
  ]));
}

function updateMeta(tool, slug) {
  if (!tool) return;
  const name = toolName(tool, slug);
  const category = categoryName(tool.category);
  applySeo({
    type: 'tool',
    path: `/tools/${slug}/`,
    toolName: name,
    category,
    action: textDescription(tool).replace(/\.$/, '').toLowerCase(),
    advantages: ['browser-based workflow', 'clear usage guidance']
  });
}

function createHero(tool, slug) {
  const name = toolName(tool, slug);
  const category = categoryName(tool?.category || slug.split('/')[0]);
  const breadcrumb = document.createElement('section');
  breadcrumb.className = 'premium-tool-hero';
  breadcrumb.innerHTML = `
    <div class="container">
      <nav class="premium-tool-breadcrumb" aria-label="Breadcrumb">
        <a href="/">Home</a><span>›</span><a href="/categories/${categoryRoute(tool?.category || slug.split('/')[0])}.html">${category}</a><span>›</span><span aria-current="page">${name}</span>
      </nav>
      <div class="premium-tool-hero__grid">
        <div>
          <span class="premium-tool-kicker">Professional utility workflow</span>
          <h1>${name}</h1>
          <p>${textDescription(tool)} Use this page as an input → action → result workflow with privacy notes, limitations and related next steps kept visible.</p>
          <div class="premium-privacy-badge premium-privacy-badge--client">🔒 Browser-first where practical; review page notes for tools that need live data or external services.</div>
        </div>
      </div>
    </div>`;
  return breadcrumb;
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
      <a class="btn btn-secondary" href="${related?.entry || '/categories/index.html'}">Related tool</a>
    </div>
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
  const name = toolName(tool, slug);
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
      <section class="premium-guide-block"><h2>Related tools</h2><div class="premium-related-grid">${related.map((item) => `<a href="${item.entry}"><strong>${item.name || item.nameEn}</strong><span>${categoryName(item.category)}</span></a>`).join('')}</div></section>
      <section class="premium-guide-block"><h2>FAQ</h2><div class="premium-accordion">
        <details><summary>${name} free to use?</summary><p>Yes. This page is prepared as a free online workflow for the related tool.</p></details>
        <details><summary>Where does my data go?</summary><p>NovaTools tools are designed browser-first where practical; check page notes when external services are required.</p></details>
        <details><summary>What should I do if I get an error?</summary><p>Check inputs, file size and format, then retry with adjusted settings.</p></details>
      </div></section>
    </div>`;
  return section;
}

function appendFaqSchema(tool, slug) {
  const name = toolName(tool, slug);
  upsertJsonLd('tool-faq-jsonld', buildFAQSchema([
    { question: `Is ${name} free to use?`, answer: 'Yes. This tool is prepared for free online use.' },
    { question: 'Where does my data go?', answer: 'Tools are designed browser-first where practical; check page notes when external services are required.' },
    { question: 'What should I do if I get an error?', answer: 'Check inputs, file size and format, then try again with adjusted settings.' }
  ]));
}

function enhanceWorkspace(tool, slug) {
  const main = document.querySelector('main') || document.querySelector('.tool-wrapper') || document.body;
  const workspace = document.querySelector('.tool-wrapper, .tool-container, .main-content > section, main > section') || main;
  workspace.id = workspace.id || 'tool-workspace';
  workspace.classList.add('premium-tool-workspace');

  const companion = createWorkspaceCompanion(tool, slug);
  workspace.append(companion);
  setupDropzones(workspace);

  workspace.querySelectorAll('input, textarea, select, button, a').forEach((element) => {
    element.classList.add('premium-focusable');
  });
  workspace.querySelectorAll('.result, .results, .result-panel, .results-panel, .output, .output-area').forEach((element) => {
    element.classList.add('premium-result-panel');
  });
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
