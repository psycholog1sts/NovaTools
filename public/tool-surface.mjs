const CATEGORY_CONFIG = {
  pdf: {
    label: 'PDF tools', route: '/categories/pdf-tools.html', guide: '/blog/articles/five-minute-pdf-cleanup-workflow.html',
    tools: [['Compress PDF', '/tools/pdf/compress/'], ['Merge PDF', '/tools/pdf/merge/'], ['Split PDF', '/tools/pdf/split/']],
    helper: 'Review page order, readability, file size and sensitive pages before sharing a document.'
  },
  image: {
    label: 'Image tools', route: '/categories/image-tools.html', guide: '/blog/articles/compress-images-for-web-quality-checklist.html',
    tools: [['Compress image', '/tools/image/compress/'], ['Resize image', '/tools/image/image-resizer/'], ['Remove metadata', '/tools/image/metadata-remover/']],
    helper: 'Check dimensions, format, visual quality and metadata before publishing or sending an image.'
  },
  finance: {
    label: 'Finance tools', route: '/categories/finance-tools.html', guide: '/blog/articles/monthly-finance-document-routine.html',
    tools: [['Live exchange', '/tools/finance/live-exchange/'], ['Compound interest', '/tools/finance/compound-interest/'], ['Cloud cost', '/tools/finance/cloud-cost/']],
    helper: 'Treat outputs as estimates, keep assumptions visible and verify important decisions with source records.'
  },
  dev: {
    label: 'Developer tools', route: '/categories/developer-tools.html', guide: '/blog/articles/developer-debugging-tool-chain.html',
    tools: [['JSON formatter', '/tools/dev/json-formatter/'], ['Regex tester', '/tools/dev/regex-tester/'], ['Base64 converter', '/tools/dev/base64-converter/']],
    helper: 'Format or validate copied snippets before sharing, committing or pasting into another system.'
  },
  text: {
    label: 'Text & writing tools', route: '/categories/text-writing.html', guide: '/blog/articles/content-review-before-client-delivery.html',
    tools: [['Word counter', '/tools/text/word-counter/'], ['Text diff', '/tools/text/text-diff/'], ['Text to slug', '/tools/text/text-to-slug/']],
    helper: 'Check length, formatting, readability and revision differences before publishing text.'
  },
  converters: {
    label: 'Converters', route: '/categories/converters.html', guide: '/blog/articles/unit-converter-for-project-planning.html',
    tools: [['Unit converter', '/tools/converters/unit-converter/'], ['Currency converter', '/tools/converters/currency-converter/'], ['Timezone converter', '/tools/converters/timezone-converter/']],
    helper: 'Confirm units, assumptions and destination format before using converted values in a plan.'
  },
  data: {
    label: 'Data tools', route: '/categories/data-tools.html', guide: '/blog/articles/data-cleanup-before-dashboard-import.html',
    tools: [['CSV to JSON', '/tools/data/csv-to-json/'], ['JSON to CSV', '/tools/data/json-to-csv/'], ['SQL formatter', '/tools/data/sql-formatter/']],
    helper: 'Validate structure, headers and sample rows before importing or handing off data.'
  },
  design: {
    label: 'Design tools', route: '/categories/design-tools.html', guide: '/blog/articles/image-alt-text-and-file-names-workflow.html',
    tools: [['Logo maker', '/tools/design/logo-maker/'], ['QR designer', '/tools/design/qr-code-designer/'], ['Invoice generator', '/tools/design/invoice-generator/']],
    helper: 'Review visual hierarchy, export format and small-screen readability before publishing assets.'
  },
  productivity: {
    label: 'Productivity tools', route: '/categories/productivity-tools.html', guide: '/blog/articles/tool-selection-map-for-new-users.html',
    tools: [['Pomodoro timer', '/tools/productivity/pomodoro-timer/'], ['Todo list', '/tools/productivity/todo-list/'], ['Notes', '/tools/productivity/notes/']],
    helper: 'Keep the workflow lightweight: capture the task, run the session and review the next action.'
  },
  security: {
    label: 'Security tools', route: '/categories/security-tools.html', guide: '/blog/articles/local-processing-vs-upload-tools-comparison.html',
    tools: [['Password generator', '/tools/security/password-generator/'], ['Hash generator', '/tools/security/hash-generator/'], ['JWT decoder', '/tools/security/jwt-decoder/']],
    helper: 'Use security utilities for inspection and preparation; do not treat decoded or generated values as verified authorization.'
  },
  social: {
    label: 'Social media tools', route: '/categories/social-media-tools.html', guide: '/blog/articles/resize-images-for-social-platforms.html',
    tools: [['UTM builder', '/tools/social/utm-builder/'], ['Hashtag generator', '/tools/social/hashtag-generator/'], ['YouTube thumbnail', '/tools/social/youtube-thumbnail/']],
    helper: 'Check campaign naming, visual size and platform context before publishing social assets.'
  }
};

const DEFAULT_CONFIG = {
  label: 'Tool category', route: '/categories/index.html', guide: '/blog/articles/tool-selection-map-for-new-users.html',
  tools: [['Browse categories', '/categories/index.html'], ['Read guides', '/blog/index.html']],
  helper: 'Use a clear input, action and review habit before relying on any output.'
};

function inferTool() {
  const match = window.location.pathname.match(/\/tools\/([^/]+)\/([^/]+)\/?/);
  const category = match?.[1] || 'tools';
  const slug = match?.[2] || '';
  const title = document.querySelector('h1')?.textContent?.trim() || document.title.replace(/\s*[|–-].*$/, '').trim() || slug.replace(/-/g, ' ');
  const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || 'Complete this browser utility workflow with clear input, action and result review steps.';
  return { category, slug, title, description, config: CATEGORY_CONFIG[category] || DEFAULT_CONFIG };
}

function injectStyles() {
  if (document.getElementById('novatools-tool-surface-style')) return;
  const style = document.createElement('style');
  style.id = 'novatools-tool-surface-style';
  style.textContent = `
    .nt-tool-surface { color: var(--color-text-primary, #f8fafc); }
    .nt-tool-surface .tool-wrapper,
    .nt-tool-surface .tool-container,
    .nt-tool-surface main > section,
    .nt-tool-panel-standard {
      border-radius: 22px;
    }
    .nt-tool-hero-note,
    .nt-tool-helper,
    .nt-tool-state-guide {
      width: min(1120px, calc(100% - 32px));
      margin: 1rem auto 1.5rem;
    }
    .nt-tool-hero-note {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr));
      gap: 1rem;
    }
    .nt-tool-card,
    .nt-tool-helper,
    .nt-tool-state-guide {
      border: 1px solid rgba(148, 163, 184, 0.22);
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(15, 23, 42, 0.78), rgba(15, 23, 42, 0.54));
      box-shadow: 0 16px 48px rgba(2, 6, 23, 0.22);
    }
    .nt-tool-card { padding: 1rem; }
    .nt-tool-card strong,
    .nt-tool-helper h2,
    .nt-tool-state-guide h2 { color: #f8fafc; }
    .nt-tool-card strong {
      display: block;
      margin-bottom: .35rem;
      font-size: .82rem;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .nt-tool-card p,
    .nt-tool-helper p,
    .nt-tool-state-guide p { color: #cbd5e1; line-height: 1.65; margin: 0; }
    .nt-tool-workspace {
      width: min(1120px, calc(100% - 32px));
      margin-inline: auto;
    }
    .nt-tool-workspace form,
    .nt-tool-workspace .tool-card,
    .nt-tool-workspace .tool-panel,
    .nt-tool-workspace .converter-card,
    .nt-tool-workspace .calculator-card {
      border-color: rgba(148, 163, 184, 0.22) !important;
      box-shadow: 0 14px 42px rgba(2, 6, 23, 0.18);
    }
    .nt-tool-workspace input:not([type="checkbox"]):not([type="radio"]),
    .nt-tool-workspace textarea,
    .nt-tool-workspace select {
      min-height: 44px;
      border-radius: 12px;
    }
    .nt-tool-focus:focus-visible,
    .nt-tool-helper a:focus-visible,
    .nt-tool-state-guide button:focus-visible {
      outline: 3px solid rgba(34, 211, 238, 0.7) !important;
      outline-offset: 3px;
    }
    .nt-tool-dropzone {
      border-color: rgba(34, 211, 238, 0.36) !important;
      box-shadow: inset 0 0 0 1px rgba(34, 211, 238, 0.12);
    }
    .nt-tool-result {
      border-radius: 16px !important;
      min-height: 56px;
    }
    .nt-tool-helper { padding: clamp(1rem, 3vw, 1.35rem); }
    .nt-tool-helper__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }
    .nt-tool-link-list { display: grid; gap: .6rem; margin: .85rem 0 0; }
    .nt-tool-link-list a {
      display: flex;
      justify-content: space-between;
      gap: .75rem;
      padding: .75rem .85rem;
      border: 1px solid rgba(34, 211, 238, 0.18);
      border-radius: 12px;
      background: rgba(34, 211, 238, 0.08);
      color: #67e8f9;
      font-weight: 800;
      text-decoration: none;
    }
    .nt-tool-state-guide { padding: 1rem; }
    .nt-tool-state-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
      gap: .75rem;
      margin-top: .85rem;
    }
    .nt-tool-state-grid div {
      padding: .85rem;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.045);
    }
    .nt-tool-state-grid strong { display: block; margin-bottom: .25rem; color: #f8fafc; }
    @media (max-width: 720px) {
      .nt-tool-hero-note,
      .nt-tool-helper,
      .nt-tool-state-guide,
      .nt-tool-workspace { width: min(100% - 20px, 1120px); }
    }
  `;
  document.head.appendChild(style);
}

function addClassToAll(selector, className) {
  document.querySelectorAll(selector).forEach((element) => element.classList.add(className));
}

function markWorkspace() {
  const main = document.querySelector('main, .main-content, .tool-wrapper') || document.body;
  const workspace = document.querySelector('.tool-wrapper, .tool-container, .tool-card, .tool-panel, main > section') || main;
  main.classList.add('nt-tool-surface');
  workspace.classList.add('nt-tool-workspace', 'nt-tool-panel-standard');
  addClassToAll('input, textarea, select, button, a[href], [tabindex]', 'nt-tool-focus');
  addClassToAll('.dropzone, [data-dropzone], .upload-area, .file-upload, input[type="file"]', 'nt-tool-dropzone');
  addClassToAll('.result, .results, .result-panel, .results-panel, .output, .output-area, [id*="result" i], [class*="result" i]', 'nt-tool-result');
  return { main, workspace };
}

function createHeroNote(tool) {
  const section = document.createElement('section');
  section.className = 'nt-tool-hero-note';
  section.setAttribute('aria-label', 'Tool workflow overview');
  section.innerHTML = `
    <article class="nt-tool-card"><strong>Workflow</strong><p>Add input, review settings, run the primary action, then inspect the result before using it elsewhere.</p></article>
    <article class="nt-tool-card"><strong>Privacy note</strong><p>Browser-first where practical. Live-data or external-service tools should be reviewed in their page context.</p></article>
    <article class="nt-tool-card"><strong>Best used for</strong><p>${tool.config.helper}</p></article>
  `;
  return section;
}

function createStateGuide() {
  const section = document.createElement('section');
  section.className = 'nt-tool-state-guide';
  section.setAttribute('aria-label', 'Tool result states');
  section.innerHTML = `
    <h2>Result states to expect</h2>
    <div class="nt-tool-state-grid">
      <div><strong>Empty</strong><p>Add the required input or file first.</p></div>
      <div><strong>Loading</strong><p>The browser is processing; large inputs may take longer.</p></div>
      <div><strong>Success</strong><p>Review output quality, name and format before download or copy.</p></div>
      <div><strong>Error</strong><p>Check file type, size, required fields and settings, then try again.</p></div>
    </div>
  `;
  return section;
}

function createHelper(tool) {
  const section = document.createElement('section');
  section.className = 'nt-tool-helper';
  section.setAttribute('aria-label', 'Related tools, guides and FAQ');
  const relatedTools = tool.config.tools.filter(([, href]) => href !== window.location.pathname).slice(0, 3);
  section.innerHTML = `
    <h2>Workflow help for ${tool.title}</h2>
    <p>${tool.description}</p>
    <div class="nt-tool-helper__grid">
      <article>
        <h3>Related tools</h3>
        <div class="nt-tool-link-list">
          <a href="${tool.config.route}">Browse ${tool.config.label}<span>Category</span></a>
          ${relatedTools.map(([label, href]) => `<a href="${href}">${label}<span>Tool</span></a>`).join('')}
        </div>
      </article>
      <article>
        <h3>Guide links</h3>
        <div class="nt-tool-link-list">
          <a href="${tool.config.guide}">Read the workflow guide<span>Guide</span></a>
          <a href="/blog/articles/browser-first-tools-what-it-means.html">Browser-first tools<span>Guide</span></a>
        </div>
      </article>
      <article>
        <h3>FAQ</h3>
        <details open><summary>What should I check before using the result?</summary><p>Confirm the source input, output format, privacy needs and whether the result still fits the recipient or destination.</p></details>
        <details><summary>What if the tool does not respond?</summary><p>Check required fields, reduce large files where possible, refresh the page and try a smaller sample.</p></details>
      </article>
    </div>
  `;
  return section;
}

function upsertFaqSchema(tool) {
  if (document.getElementById('nt-tool-surface-faq-jsonld')) return;
  const script = document.createElement('script');
  script.id = 'nt-tool-surface-faq-jsonld';
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      { '@type': 'Question', name: `How do I use ${tool.title}?`, acceptedAnswer: { '@type': 'Answer', text: 'Add the required input, review settings, run the primary action and inspect the result before download, copy or sharing.' } },
      { '@type': 'Question', name: 'What should I do if processing fails?', acceptedAnswer: { '@type': 'Answer', text: 'Check required fields, file type, file size and browser memory. Try a smaller sample when troubleshooting.' } }
    ]
  });
  document.head.appendChild(script);
}

export function initToolSurface() {
  if (!/\/tools\//.test(window.location.pathname) || document.body.dataset.ntToolSurface === 'ready') return;
  document.body.dataset.ntToolSurface = 'ready';
  injectStyles();
  const tool = inferTool();
  const { workspace } = markWorkspace();
  const hero = document.querySelector('.tool-hero, .hero, h1');
  const heroAnchor = hero?.closest('section, .tool-hero, .hero, .tool-wrapper') || hero;
  heroAnchor?.insertAdjacentElement('afterend', createHeroNote(tool));
  workspace.insertAdjacentElement('afterend', createStateGuide());
  document.querySelector('main')?.append(createHelper(tool));
  upsertFaqSchema(tool);
}
