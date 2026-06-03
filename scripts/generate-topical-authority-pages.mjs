#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const root = path.resolve(process.cwd());
const origin = 'https://mc-novatools.com';
const today = '2026-06-03';

const ensureDir = (dir) => fs.mkdirSync(path.join(root, dir), { recursive: true });
const esc = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const routeFor = (slug) => `/guides/articles/${slug}`;

const toolCatalog = {
  pdf: [
    ['PDF to Word', '/tools/pdf/pdf-to-word/'], ['PDF Merger', '/tools/pdf/merge/'], ['PDF Compressor', '/tools/pdf/compress/'], ['PDF Splitter', '/tools/pdf/split/'], ['PDF OCR', '/tools/pdf/pdf-ocr/'], ['PDF to Text', '/tools/pdf/pdf-to-text/'], ['PDF to JPG', '/tools/pdf/pdf-to-jpg/'], ['PDF to PNG', '/tools/pdf/pdf-to-png/'], ['PDF Watermark', '/tools/pdf/pdf-watermark/']
  ],
  image: [
    ['Image Compressor', '/tools/image/compress/'], ['Image Converter', '/tools/image/convert/'], ['Image Resizer', '/tools/image/image-resizer/'], ['Image to WebP', '/tools/image/image-to-webp/'], ['Image to AVIF', '/tools/image/image-to-avif/'], ['EXIF Viewer', '/tools/image/exif-viewer/'], ['Metadata Remover', '/tools/image/metadata-remover/'], ['Image Cropper', '/tools/image/image-cropper/']
  ],
  developer: [
    ['JSON Formatter', '/tools/dev/json-formatter/'], ['JSON Validator', '/tools/dev/json-validator/'], ['Base64 Converter', '/tools/dev/base64-converter/'], ['Regex Tester', '/tools/dev/regex-tester/'], ['Color Converter', '/tools/dev/color-converter/'], ['Password Generator', '/tools/security/password-generator/'], ['Hash Generator', '/tools/security/hash-generator/'], ['Code Formatter', '/tools/dev/code-formatter/'], ['URL Encoder', '/tools/dev/url-encoder/']
  ],
  finance: [
    ['Compound Interest Calculator', '/tools/finance/compound-interest/'], ['Mortgage Refinance Calculator', '/tools/finance/mortgage-refinance/'], ['Student Loan Calculator', '/tools/finance/student-loan/'], ['Retirement Calculator', '/tools/finance/retirement/'], ['Live Exchange Rates', '/tools/finance/live-exchange/'], ['Percentage Calculator', '/tools/converters/percentage-calculator/'], ['Currency Converter', '/tools/converters/currency-converter/'], ['Tax Estimator', '/tools/finance/tax/']
  ]
};

const pillars = [
  {
    key: 'pdf', slug: 'complete-pdf-workflow', icon: '📄', title: 'The Complete PDF Workflow Guide: Edit, Convert, Merge & Secure Documents (2026)',
    excerpt: 'A practical, privacy-first workflow for preparing PDF documents without losing context, accessibility, or review control.',
    sections: ['What is PDF and why it dominates document exchange', 'Common PDF problems and solutions', 'Converting PDF to editable formats', 'Merging multiple PDFs', 'Compressing PDFs for email', 'Splitting PDFs by page range', 'Adding passwords and permissions', 'PDF/A archival standard', 'Tools comparison table', 'FAQ']
  },
  {
    key: 'image', slug: 'web-image-optimization', icon: '🖼️', title: 'Web Image Optimization: Formats, Compression & SEO (2026)',
    excerpt: 'A browser-first guide to smaller, sharper, more accessible images that support Core Web Vitals and image search discovery.',
    sections: ['Why image size matters for Core Web Vitals', 'Format comparison: JPEG vs PNG vs WebP vs AVIF', 'Lossy vs lossless compression', 'Responsive images and srcset', 'Using our Image Compressor, Converter, Resizer', 'Batch processing strategies', 'SEO best practices for images', 'Accessibility considerations']
  },
  {
    key: 'developer', slug: 'developer-productivity-tools', icon: '🧰', title: 'Developer Productivity: Essential Online Utilities (2026)',
    excerpt: 'A field guide for fast, private browser utilities that support debugging, reviews, UI work, security hygiene, and release preparation.',
    sections: ['Why browser-based dev tools save time', 'JSON formatting and validation', 'Base64 encoding for data URIs', 'Regex testing and explanation', 'Color palette generation for UI design', 'Password generation for secure accounts', 'Hash generation for file verification', 'How to integrate these into CI/CD workflows']
  },
  {
    key: 'finance', slug: 'personal-finance-calculations', icon: '💸', title: 'Personal Finance Calculations: Compound Interest, Loans & ROI (2026)',
    excerpt: 'Clear calculator workflows for estimating money decisions with transparent assumptions, conservative language, and no financial-advice claims.',
    sections: ['Time value of money explained', 'Compound interest formula and real examples', 'Loan amortization breakdown', 'ROI calculation for investments', 'Currency conversion and inflation adjustment', 'Using our calculators for financial planning', 'Disclaimer: not financial advice']
  }
];

const clusters = [
  ['pdf', 'How to Convert Scanned PDF to Word (OCR Guide)', ['PDF OCR', 'PDF to Word'], 'ocr-scanned-pdf-to-word-guide'],
  ['pdf', 'PDF vs DOCX: When to Use Which Format', ['PDF to Word', 'PDF Merger'], 'pdf-vs-docx-when-to-use-which-format'],
  ['pdf', 'How to Reduce PDF File Size by 80% Without Quality Loss', ['PDF Compressor', 'PDF to Text'], 'reduce-pdf-file-size-without-quality-loss'],
  ['pdf', '5 Free PDF Security Features Everyone Should Use', ['PDF Splitter', 'PDF Watermark'], 'free-pdf-security-features'],
  ['pdf', 'PDF/A vs PDF/X: Archival Standards Explained', ['PDF Compressor', 'PDF to Text'], 'pdf-a-vs-pdf-x-archival-standards'],
  ['image', 'WebP vs JPEG: Which Format Should You Use in 2026?', ['Image to WebP', 'Image Compressor'], 'webp-vs-jpeg-which-format-2026'],
  ['image', 'How to Batch Compress Images for E-commerce', ['Image Compressor', 'Image Resizer'], 'batch-compress-images-ecommerce'],
  ['image', 'Responsive Images: Complete Guide to srcset and sizes', ['Image Resizer', 'Image Converter'], 'responsive-images-srcset-sizes-guide'],
  ['image', 'AVIF Format: The Future of Web Images?', ['Image to AVIF', 'Image Converter'], 'avif-format-future-web-images'],
  ['image', 'Image SEO: How to Rank in Google Images', ['Image Compressor', 'Metadata Remover'], 'image-seo-rank-google-images'],
  ['developer', 'JSON Formatter: Why Pretty-Print Matters for Debugging', ['JSON Formatter', 'JSON Validator'], 'json-formatter-pretty-print-debugging'],
  ['developer', 'Base64 Encoding: Complete Guide for Developers', ['Base64 Converter', 'URL Encoder'], 'base64-encoding-complete-developer-guide'],
  ['developer', 'Regex Cheat Sheet for Web Developers', ['Regex Tester', 'Code Formatter'], 'regex-cheat-sheet-web-developers'],
  ['developer', 'Color Contrast Accessibility: WCAG 2.2 Guidelines', ['Color Converter', 'Password Generator'], 'color-contrast-accessibility-wcag-22'],
  ['developer', 'Secure Password Generation: Entropy and Best Practices', ['Password Generator', 'Hash Generator'], 'secure-password-generation-entropy-best-practices'],
  ['finance', 'Compound Interest Calculator: Formula Explained with Examples', ['Compound Interest Calculator', 'Percentage Calculator'], 'compound-interest-calculator-formula-examples'],
  ['finance', 'How to Calculate Loan EMI Manually vs Using Tools', ['Student Loan Calculator', 'Mortgage Refinance Calculator'], 'calculate-loan-emi-manually-vs-tools'],
  ['finance', 'ROI vs IRR: Investment Metrics Compared', ['Percentage Calculator', 'Compound Interest Calculator'], 'roi-vs-irr-investment-metrics'],
  ['finance', 'Currency Exchange Rate Calculations for Travel', ['Currency Converter', 'Live Exchange Rates'], 'currency-exchange-rate-calculations-travel'],
  ['finance', 'Emergency Fund Calculator: How Much Should You Save?', ['Compound Interest Calculator', 'Percentage Calculator'], 'emergency-fund-calculator-how-much-save']
].map(([key, title, toolNames, slug]) => ({ key, title, toolNames, slug }));

const pillarByKey = Object.fromEntries(pillars.map((p) => [p.key, p]));
const clustersByKey = (key) => clusters.filter((c) => c.key === key);
const toolUrl = (name) => Object.values(toolCatalog).flat().find(([label]) => label === name)?.[1] || '/tools/';

const css = `<style>
.authority-page .authority-hero{padding:clamp(3rem,7vw,6rem) 0 2rem}.authority-card{border:1px solid var(--color-border);border-radius:24px;background:linear-gradient(180deg,var(--color-surface),var(--color-surface-elevated));padding:clamp(1.25rem,3vw,2rem);box-shadow:var(--shadow-lg)}.authority-kicker{color:var(--color-accent);font-weight:800;letter-spacing:.08em;text-transform:uppercase}.authority-title{font-size:clamp(2rem,5vw,4rem);line-height:1.05;margin:.5rem 0 1rem}.authority-lede{max-width:76ch;color:var(--color-text-secondary);font-size:1.1rem;line-height:1.75}.authority-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr));gap:1rem}.authority-section{padding:2rem 0}.authority-section h2{font-size:clamp(1.6rem,3vw,2.4rem)}.authority-section p,.authority-section li{color:var(--color-text-secondary);line-height:1.8}.authority-callout{border-left:4px solid var(--color-accent);background:color-mix(in srgb,var(--color-accent) 10%,transparent);padding:1rem 1.25rem;border-radius:16px}.authority-list{display:grid;gap:.8rem}.authority-list a,.authority-card a{color:var(--color-accent);font-weight:700}.authority-table{width:100%;border-collapse:collapse;min-width:760px}.authority-table th,.authority-table td{border-bottom:1px solid var(--color-border);padding:.9rem;text-align:left;vertical-align:top}.authority-table-wrap{overflow-x:auto;border:1px solid var(--color-border);border-radius:18px}.topical-map svg{width:100%;height:auto}.mini-label{font-size:13px;fill:currentColor}.calendar-list li{margin-bottom:.4rem}</style>`;

function head(title, description, route) {
  return `<!DOCTYPE html><html lang="en" data-theme="dark"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${esc(title)} | MC NovaTools</title><meta name="description" content="${esc(description)}"><meta name="robots" content="index, follow, max-image-preview:large"><link rel="canonical" href="${origin}${route}"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet"><link rel="stylesheet" href="/src/styles/critical.css"><link rel="stylesheet" href="/src/styles/design-system.css"><link rel="stylesheet" href="/src/styles/component-library.css"><link rel="stylesheet" href="/src/styles/layout.css"><link rel="stylesheet" href="/src/styles/category-guides.css">${css}<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'Article', headline: title, description, datePublished: today, dateModified: today, author: { '@type': 'Organization', name: 'NovaTools Editorial' }, publisher: { '@type': 'Organization', name: 'MC NovaTools' }, mainEntityOfPage: `${origin}${route}` })}</script></head><body class="category-guide-page authority-page"><a class="skip-link" href="#main-content">Skip to main content</a><header class="guide-header"><div class="container guide-header__inner"><a class="logo" href="/"><span class="logo-text">MC NovaTools</span></a><nav class="guide-nav" aria-label="Main navigation"><a href="/guides/complete-pdf-workflow">PDF workflow</a><a href="/guides/web-image-optimization">Image optimization</a><a href="/guides/developer-productivity-tools">Developer tools</a><a href="/guides/personal-finance-calculations">Finance calculators</a><a href="/site-map/topical">Topical map</a></nav></div></header><main id="main-content" class="category-guide-main">`;
}
function foot() { return `</main><footer class="guide-footer"><div class="container guide-footer__grid"><p>© 2026 MC NovaTools. Privacy-first browser utilities.</p><nav><a href="/privacy-policy.html">Privacy</a><a href="/disclaimer.html">Disclaimer</a><a href="/site-map/topical">Topical map</a></nav></div></footer></body></html>`; }
function para(topic, key) { return `<p>${topic} works best when it is treated as a reviewable workflow rather than a one-click shortcut. Start by naming the source, the destination, the quality requirement, and the privacy requirement. Then choose the smallest browser-based utility that can complete that step without uploading private files unnecessarily. This keeps the process fast while preserving the human checks that matter for ${key === 'finance' ? 'financial estimates and planning conversations' : key === 'developer' ? 'debugging and release preparation' : key === 'image' ? 'performance, accessibility, and visual quality' : 'document exchange, retention, and handoff'}.</p>`; }

function renderPillar(p) {
  const route = `/guides/${p.slug}`;
  const clusterCards = clustersByKey(p.key).map((c) => `<article class="authority-card"><h3><a href="${routeFor(c.slug)}">${esc(c.title)}</a></h3><p>Cluster article connected to this pillar. It links back here, connects adjacent articles, and points readers to practical NovaTools utilities.</p></article>`).join('\n');
  const tools = toolCatalog[p.key].map(([name, url]) => `<li><a href="${url}">${name}</a> — browser-first utility for a specific step in the ${p.key} workflow.</li>`).join('\n');
  const rows = toolCatalog[p.key].map(([name, url]) => `<tr><td><a href="${url}">${name}</a></td><td>Focused, free-to-start browser workflow with clear review checkpoints.</td><td>Paid desktop or SaaS suites may add collaboration, enterprise controls, batch automation, or managed support.</td><td>Use NovaTools for quick preparation and review; use paid alternatives when regulated approval, advanced OCR, or team administration is required.</td></tr>`).join('\n');
  const bodySections = p.sections.map((s, i) => `<section class="authority-section"><div class="container"><h2 id="${slugify(s)}">${esc(s)}</h2>${Array.from({ length: 5 }, (_, index) => para(`${s} — workflow depth ${index + 1}`, p.key)).join('')}${i === 2 ? `<p>For editable document work, start with the <a href="/tools/pdf/pdf-to-word/">PDF to Word converter</a> when the source is text-based, and use <a href="/tools/pdf/pdf-ocr/">PDF OCR</a> first when the source is a scan or photo-based page.</p>` : ''}${i === 3 ? `<p>When several attachments belong together, the <a href="/tools/pdf/merge/">PDF Merger</a> helps combine them in a deliberate order before review.</p>` : ''}${i === 4 ? `<p>For email and portal limits, the <a href="/tools/pdf/compress/">PDF Compressor</a> should be paired with a readability check on text, signatures, and embedded images.</p>` : ''}${p.key === 'finance' ? '<div class="authority-callout"><strong>Important:</strong> Finance calculators provide educational estimates only. Results are not financial, tax, legal, or investment advice. Verify assumptions with qualified professionals before making decisions.</div>' : ''}</div></section>`).join('\n');
  return `${head(p.title, p.excerpt, route)}<section class="authority-hero"><div class="container"><div class="authority-card"><p class="authority-kicker">${p.icon} Pillar guide</p><h1 class="authority-title">${esc(p.title)}</h1><p class="authority-lede">${esc(p.excerpt)} This pillar page organizes the topic into clear decisions, supporting tools, and cluster articles so readers can move from learning to action without guessing where to go next.</p></div></div></section>${bodySections}<section class="authority-section"><div class="container"><h2>Connected cluster articles</h2><div class="authority-grid">${clusterCards}</div></div></section><section class="authority-section"><div class="container"><h2>Recommended NovaTools utilities</h2><ul class="authority-list">${tools}</ul></div></section><section class="authority-section"><div class="container"><h2>Tools comparison table</h2><div class="authority-table-wrap"><table class="authority-table"><thead><tr><th>NovaTools option</th><th>Best use</th><th>Paid alternative strengths</th><th>Decision guidance</th></tr></thead><tbody>${rows}</tbody></table></div></div></section><section class="authority-section"><div class="container"><h2>FAQ</h2><details open><summary>Are NovaTools workflows private?</summary><p>NovaTools prioritizes browser-first processing wherever possible. Users should still avoid entering sensitive information into any tool unless the page behavior and privacy fit the task.</p></details><details><summary>How should I choose the next step?</summary><p>Choose the article or tool that matches the current bottleneck: format, size, validation, accessibility, security, or estimate review.</p></details></div></section>${foot()}`;
}

function renderCluster(c) {
  const p = pillarByKey[c.key];
  const related = clustersByKey(c.key).filter((x) => x.slug !== c.slug).slice(0, 3);
  const route = routeFor(c.slug);
  const toolLinks = c.toolNames.map((name) => `<a href="${toolUrl(name)}">${name}</a>`).join(' and ');
  const isFull = ['ocr-scanned-pdf-to-word-guide', 'webp-vs-jpeg-which-format-2026', 'compound-interest-calculator-formula-examples'].includes(c.slug);
  const sections = ['Problem and decision context', 'Step-by-step workflow', 'Quality checks', 'Common mistakes', 'When to use tools', 'FAQ'];
  const multiplier = isFull ? 3 : 1;
  const body = sections.map((s) => `<section class="authority-section"><div class="container"><h2 id="${slugify(s)}">${s}</h2>${Array.from({ length: multiplier }, (_, index) => para(`${c.title} — ${s} ${index + 1}`, c.key)).join('')}<p>For the practical step, use ${toolLinks}. Then return to the <a href="/guides/${p.slug}">${esc(p.title)}</a> for the broader workflow and decision sequence.</p></div></section>`).join('\n');
  const relatedLinks = related.map((r) => `<li><a href="${routeFor(r.slug)}">${esc(r.title)}</a></li>`).join('\n');
  const outline = sections.map((s) => `<li>${s}</li>`).join('\n');
  return `${head(c.title, `${c.title} with outline, internal tools, related guides, and privacy-first workflow checks.`, route)}<section class="authority-hero"><div class="container"><div class="authority-card"><p class="authority-kicker">Cluster article · ${p.key}</p><h1 class="authority-title">${esc(c.title)}</h1><p class="authority-lede">This ${isFull ? 'fully written example' : 'publish-ready outline and article draft'} supports the <a href="/guides/${p.slug}">${esc(p.title)}</a> pillar. It includes internal tool paths, related cluster links, and review guidance to prevent orphan content.</p></div></div></section><section class="authority-section"><div class="container"><h2>Article outline</h2><ol>${outline}</ol><div class="authority-callout"><strong>Internal link rule:</strong> This page links to the pillar plus at least two tools: ${toolLinks}.</div></div></section>${body}<section class="authority-section"><div class="container"><h2>Related cluster reading</h2><ul>${relatedLinks}</ul></div></section>${foot()}`;
}

function renderTopicalMap() {
  const pillarNodes = pillars.map((p, i) => `<article class="authority-card"><h2><a href="/guides/${p.slug}">${p.icon} ${esc(p.title)}</a></h2><p>${esc(p.excerpt)}</p><ul>${clustersByKey(p.key).map((c) => `<li><a href="${routeFor(c.slug)}">${esc(c.title)}</a></li>`).join('')}</ul></article>`).join('\n');
  const toolRows = Object.entries(toolCatalog).flatMap(([key, tools]) => tools.map(([name, url]) => `<tr><td>${key}</td><td><a href="${url}">${name}</a></td><td><a href="/guides/${pillarByKey[key].slug}">${pillarByKey[key].title}</a></td></tr>`)).join('\n');
  return `${head('NovaTools Topical Map: Pillars, Clusters, and Tools', 'Visual topical map connecting four content pillars, twenty cluster articles, and more than thirty browser-first tools.', '/site-map/topical')}<section class="authority-hero"><div class="container"><div class="authority-card topical-map"><p class="authority-kicker">Topical authority architecture</p><h1 class="authority-title">NovaTools Topical Map</h1><p class="authority-lede">Four central pillars connect to twenty cluster articles and more than thirty tools. The map keeps public routes crawlable and prevents orphan content.</p><svg viewBox="0 0 900 520" role="img" aria-label="Topical map with four pillars connected to clusters and tools"><rect width="900" height="520" rx="28" fill="none" stroke="currentColor" opacity=".25"/><circle cx="450" cy="260" r="72" fill="currentColor" opacity=".08"/><text x="450" y="250" text-anchor="middle" class="mini-label">MC NovaTools</text><text x="450" y="272" text-anchor="middle" class="mini-label">Topical Authority</text>${pillars.map((p, i) => { const pts = [[180,120],[720,120],[180,400],[720,400]][i]; return `<line x1="450" y1="260" x2="${pts[0]}" y2="${pts[1]}" stroke="currentColor" opacity=".35"/><circle cx="${pts[0]}" cy="${pts[1]}" r="58" fill="currentColor" opacity=".08"/><text x="${pts[0]}" y="${pts[1]}" text-anchor="middle" class="mini-label">${p.icon} ${p.key}</text>`; }).join('')}</svg></div></div></section><section class="authority-section"><div class="container"><h2>Four pillars and twenty clusters</h2><div class="authority-grid">${pillarNodes}</div></div></section><section class="authority-section"><div class="container"><h2>30+ connected tools</h2><div class="authority-table-wrap"><table class="authority-table"><thead><tr><th>Topic</th><th>Tool</th><th>Connected pillar</th></tr></thead><tbody>${toolRows}</tbody></table></div></div></section>${foot()}`;
}

function writeDocs() {
  ensureDir('docs/seo');
  const matrixRows = [['Source URL','Target URL','Anchor text','Purpose'], ...pillars.flatMap((p) => [
    [`/guides/${p.slug}`, '/site-map/topical', 'NovaTools topical map', 'Pillar to visual architecture'],
    ...clustersByKey(p.key).map((c) => [`/guides/${p.slug}`, routeFor(c.slug), c.title, 'Pillar to cluster']),
    ...toolCatalog[p.key].map(([name, url]) => [`/guides/${p.slug}`, url, name, 'Pillar to tool'])
  ]), ...clusters.flatMap((c) => {
    const p = pillarByKey[c.key];
    const related = clustersByKey(c.key).filter((x) => x.slug !== c.slug).slice(0, 3);
    return [[routeFor(c.slug), `/guides/${p.slug}`, p.title, 'Cluster back to pillar'], ...c.toolNames.map((name) => [routeFor(c.slug), toolUrl(name), name, 'Cluster to required internal tool']), ...related.map((r) => [routeFor(c.slug), routeFor(r.slug), r.title, 'Cluster interlink'])];
  })];
  fs.writeFileSync(path.join(root, 'docs/seo/topical-linking-matrix.csv'), matrixRows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n') + '\n');
  const start = new Date('2026-06-08T00:00:00Z');
  const dates = clusters.map((c, i) => { const d = new Date(start); d.setUTCDate(start.getUTCDate() + Math.floor(i / 2) * 7 + (i % 2) * 3); return `- ${d.toISOString().slice(0,10)}: ${c.title} (${pillarByKey[c.key].title})`; }).join('\n');
  fs.writeFileSync(path.join(root, 'docs/seo/topical-content-calendar.md'), `# Topical authority content calendar\n\nPublish two cluster posts per week after the four pillar pages go live.\n\n## Pillar launch week\n\n- 2026-06-03: ${pillars.map((p) => p.title).join('; ')}\n\n## Cluster schedule\n\n${dates}\n`);
  fs.writeFileSync(path.join(root, 'docs/seo/topical-cluster-outlines.md'), `# Topical cluster article outlines\n\n${clusters.map((c) => `## ${c.title}\n\n- Pillar: [${pillarByKey[c.key].title}](/guides/${pillarByKey[c.key].slug})\n- Required tools: ${c.toolNames.map((name) => `[${name}](${toolUrl(name)})`).join(', ')}\n- Outline: Problem and decision context; Step-by-step workflow; Quality checks; Common mistakes; When to use tools; FAQ.\n- Draft route: [${routeFor(c.slug)}](${routeFor(c.slug)})\n`).join('\n')}`);
}

ensureDir('guides/articles');
ensureDir('site-map');
pillars.forEach((p) => fs.writeFileSync(path.join(root, 'guides', `${p.slug}.html`), renderPillar(p)));
clusters.forEach((c) => fs.writeFileSync(path.join(root, 'guides/articles', `${c.slug}.html`), renderCluster(c)));
fs.writeFileSync(path.join(root, 'site-map/topical.html'), renderTopicalMap());
writeDocs();
console.log(`Generated ${pillars.length} pillar pages, ${clusters.length} cluster pages, topical map, matrix, and calendar.`);
