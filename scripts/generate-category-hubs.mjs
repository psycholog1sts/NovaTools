import { writeFileSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const manifest = JSON.parse(readFileSync(resolve('tools-manifest.json'), 'utf8'));
const origin = 'https://mc-novatools.com';
const year = 2026;

const baseNav = [
  ['Categories', '/categories/index.html'],
  ['PDF', '/categories/pdf-tools.html'],
  ['Image', '/categories/image-tools.html'],
  ['Finance', '/categories/finance-tools.html'],
  ['Developer', '/categories/developer-tools.html'],
  ['Blog', '/blog/index.html']
];

const languageOptions = [
  ['en', '🇬🇧 English'], ['tr', '🇹🇷 Türkçe'], ['de', '🇩🇪 Deutsch'], ['fr', '🇫🇷 Français'], ['es', '🇪🇸 Español'],
  ['pt', '🇵🇹 Português'], ['ru', '🇷🇺 Русский'], ['zh', '🇨🇳 中文'], ['ja', '🇯🇵 日本語'], ['ko', '🇰🇷 한국어'],
  ['ar', '🇸🇦 العربية'], ['hi', '🇮🇳 हिंदी'], ['it', '🇮🇹 Italiano'], ['pl', '🇵🇱 Polski'], ['nl', '🇳🇱 Nederlands']
];

const categoryHubs = [
  {
    slug: 'pdf-tools', key: 'pdf', icon: '📄', accent: '#ef4444', name: 'PDF Tools', short: 'Merge, compress, split, convert, watermark and extract PDF content with clear document workflows.',
    intro: 'PDF work is usually about preparing a document for a recipient: smaller files for email, combined packets for review, extracted pages for privacy, or converted text for editing. This hub maps common PDF jobs to the right NovaTools utility and adds checks so the final file is easier to trust before you share it.',
    audiences: [['Office teams', 'Prepare proposals, contracts and reports before sending them to clients or internal reviewers.'], ['Students', 'Organize scanned notes, assignment attachments and exported pages without hunting through separate menus.'], ['Freelancers', 'Add watermarks, page numbers and format conversions before a client review.']],
    tasks: [['Compress a PDF for email', 'Reduce file size, then check readability before sending.', 'pdf-compress'], ['Merge documents in order', 'Combine related files into one review packet.', 'pdf-merge'], ['Split sensitive pages', 'Export only the pages that need to be shared.', 'pdf-split'], ['Extract readable text', 'Use OCR or text extraction before copying content elsewhere.', 'pdf-ocr']],
    decisions: [['Need to send one clean packet', 'PDF Merger', 'Best when order and completeness matter more than editing.'], ['Need a smaller attachment', 'PDF Compressor', 'Use before email or portal upload limits, then verify readability.'], ['Need only selected pages', 'PDF Splitter', 'Reduces accidental over-sharing.'], ['Need editable or searchable content', 'PDF OCR / converters', 'Use when a scanned or locked-looking file needs text review.']],
    articles: [['PDF email readability checklist', '/blog/articles/compress-pdf-for-email-without-ruining-readability.html', 'Balance file size with readability before sending.'], ['Client document merge checklist', '/blog/articles/merge-pdf-files-client-documents-checklist.html', 'Review ordering and naming before merging.'], ['Prepare PDF records for tax season', '/blog/articles/prepare-pdf-records-for-tax-season.html', 'Keep financial PDFs organized before filing.']]
  },
  {
    slug: 'image-tools', key: 'image', icon: '🖼️', accent: '#22c55e', name: 'Image Tools', short: 'Compress, resize, convert and prepare images for web, email, support and publishing workflows.',
    intro: 'Image tasks often fail when file size, format and visual quality are handled separately. This hub helps you choose the right utility for web publishing, email attachments, support tickets, product images and social assets while keeping review steps visible.',
    audiences: [['Content teams', 'Prepare lighter visuals for websites, newsletters and social posts.'], ['Support teams', 'Reduce screenshots and remove metadata before sharing evidence.'], ['Small businesses', 'Resize product images and convert formats without a heavy design app.']],
    tasks: [['Compress a web image', 'Reduce size while preserving enough quality for the destination.', 'image-compress'], ['Resize for a layout', 'Set dimensions before uploading to CMS, email or social channels.', 'image-resizer'], ['Convert to modern formats', 'Move between JPG, PNG, WebP or AVIF depending on the use case.', 'image-to-webp'], ['Remove metadata', 'Strip EXIF details before sharing sensitive images.', 'metadata-remover']],
    decisions: [['Need faster pages', 'Image Compressor', 'Start with compression before changing dimensions.'], ['Need exact dimensions', 'Image Resizer', 'Use when layout size is known.'], ['Need transparent or web output', 'Image converters', 'Choose format based on transparency and browser support.'], ['Need safer sharing', 'Metadata Remover', 'Use before publishing screenshots or location-sensitive photos.']],
    articles: [['Image compressor vs image resizer', '/blog/articles/image-compressor-vs-image-resizer.html', 'Know whether size or dimensions is the real problem.'], ['Resize images for social platforms', '/blog/articles/resize-images-for-social-platforms.html', 'Prepare visuals for platform-specific constraints.'], ['Image alt text and file names', '/blog/articles/image-alt-text-and-file-names-workflow.html', 'Improve publishing quality before upload.']]
  },
  {
    slug: 'finance-tools', key: 'finance', icon: '💸', accent: '#10b981', name: 'Finance Tools', short: 'Estimate rates, loans, savings, taxes and cloud costs with transparent calculator workflows.',
    intro: 'Finance utilities should support planning, not pretend to be personal financial advice. This hub groups calculators and lookup tools with context so you can compare scenarios, check assumptions and keep records organized before making a real-world decision.',
    audiences: [['Households', 'Compare loan, savings and budgeting scenarios with visible assumptions.'], ['Small teams', 'Estimate cloud or project costs before committing budget.'], ['Record keepers', 'Prepare numbers and documents before speaking with a professional advisor.']],
    tasks: [['Compare loan scenarios', 'Estimate payments and break-even points with clear assumptions.', 'mortgage-refinance'], ['Check compounding', 'Model contributions, rates and time horizons.', 'compound-interest'], ['Estimate currency values', 'Use exchange estimates while noting that final rates may differ.', 'live-exchange'], ['Review cloud cost options', 'Compare provider assumptions before procurement.', 'cloud-cost']],
    decisions: [['Need a rough monthly payment', 'Mortgage / loan calculators', 'Useful for planning, not final approval.'], ['Need a long-term savings scenario', 'Compound Interest Calculator', 'Shows the effect of time and contributions.'], ['Need an estimate in another currency', 'Live Exchange Converter', 'Use as an estimate and verify final transaction rates.'], ['Need infrastructure planning', 'Cloud Cost Comparison', 'Compares assumptions before purchase.']],
    articles: [['Compound interest scenarios', '/blog/articles/compound-interest-scenarios-guide.html', 'Compare contributions, rates and time.'], ['Cloud cost comparison', '/blog/articles/cloud-cost-comparison.html', 'Review assumptions before choosing providers.'], ['Monthly finance document routine', '/blog/articles/monthly-finance-document-routine.html', 'Keep source documents organized around estimates.']]
  },
  {
    slug: 'developer-tools', key: 'dev', icon: '💻', accent: '#3b82f6', name: 'Developer Tools', short: 'Format, validate, encode, compare and inspect code or data snippets in the browser.',
    intro: 'Developer utilities are most useful when they make review easier without hiding the source. This hub maps API debugging, formatting, encoding, regex testing and minification tasks to focused browser tools that keep inputs visible.',
    audiences: [['Developers', 'Debug payloads, regular expressions and encoded strings during daily work.'], ['QA teams', 'Review copied snippets and sample data before filing an issue.'], ['Technical writers', 'Prepare readable examples for documentation or support replies.']],
    tasks: [['Format API JSON', 'Make nested data readable before debugging or sharing.', 'json-formatter'], ['Validate a pattern', 'Test regex with visible sample matches.', 'regex-tester'], ['Encode or decode data', 'Handle Base64 or URL strings before pasting into another system.', 'base64-converter'], ['Minify assets carefully', 'Reduce CSS or JS after review, not before.', 'css-minifier']],
    decisions: [['Unreadable API response', 'JSON Formatter', 'Start here before editing values.'], ['Pattern does not match', 'Regex Tester', 'Use visible samples to avoid guessing.'], ['String needs transport encoding', 'Base64 / URL Encoder', 'Use when moving data through URLs or configs.'], ['Asset is ready for production', 'CSS / JS Minifier', 'Minify after review and source backup.']],
    articles: [['Developer debugging tool chain', '/blog/articles/developer-debugging-tool-chain.html', 'Build a repeatable browser utility workflow.'], ['JSON formatter debugging responses', '/blog/articles/json-formatter-debugging-api-responses.html', 'Read API responses before changing code.'], ['Code formatter review before sharing', '/blog/articles/code-formatter-review-before-sharing.html', 'Prepare snippets before tickets or docs.']]
  },
  {
    slug: 'text-writing', key: 'text', icon: '✍️', accent: '#a855f7', name: 'Text & Writing Tools', short: 'Count, clean, compare, slugify and transform text before publishing or handing work to clients.',
    intro: 'Text workflows need more than a blank box. This hub helps writers, editors and support teams count length, clean copied content, generate safe slugs and compare revisions before content leaves the browser.',
    audiences: [['Writers', 'Check length, readability and structure before publishing.'], ['Editors', 'Compare revisions and clean pasted text before client delivery.'], ['Support teams', 'Prepare concise replies and evidence text without extra formatting noise.']],
    tasks: [['Count words and characters', 'Check limits for briefs, captions and forms.', 'word-counter'], ['Clean copied text', 'Remove hidden spacing and formatting before spreadsheet or CMS import.', 'text-cleaner'], ['Generate a URL slug', 'Create readable paths for titles and articles.', 'text-to-slug'], ['Compare two drafts', 'Spot changed lines before approval.', 'text-diff']],
    decisions: [['Need length limits', 'Word / Character Counter', 'Use before forms, posts or metadata fields.'], ['Pasted text looks messy', 'Text Cleaner', 'Use before importing into spreadsheets or CMS.'], ['Need a clean URL path', 'Slug Generator', 'Use before publishing.'], ['Need revision review', 'Text Diff', 'Use before accepting edits.']],
    articles: [['Word counter vs character counter', '/blog/articles/word-counter-vs-character-counter.html', 'Choose the right length check.'], ['Clean text before spreadsheet import', '/blog/articles/clean-text-before-spreadsheet-import.html', 'Avoid hidden formatting problems.'], ['Content review before client delivery', '/blog/articles/content-review-before-client-delivery.html', 'Add a final text QA step.']]
  },
  {
    slug: 'converters', key: 'converters', icon: '🔁', accent: '#06b6d4', name: 'Converters', short: 'Convert units, currencies, time zones, dates and number bases with context for planning work.',
    intro: 'Conversion tools are best when the input, output and assumption are all visible. This hub groups everyday conversion tasks and explains which tool to use for estimates, project planning and technical checks.',
    audiences: [['Project planners', 'Convert units and dates while preparing specs or schedules.'], ['Remote teams', 'Plan meetings and handoffs across time zones.'], ['Developers', 'Convert number bases and encoded values during implementation.']],
    tasks: [['Convert units', 'Move between length, weight, temperature or volume values.', 'unit-converter'], ['Check time zones', 'Plan meetings with less confusion.', 'timezone-converter'], ['Convert currencies', 'Estimate amounts before checking final transaction rates.', 'currency-converter'], ['Convert number bases', 'Move between binary, decimal, hex and octal.', 'number-base-converter']],
    decisions: [['Measurement mismatch', 'Unit Converter', 'Best for planning and specs.'], ['Remote meeting planning', 'Timezone Converter', 'Use before calendar invites.'], ['Budget estimate in another currency', 'Currency Converter', 'Use as an estimate, not a final rate.'], ['Technical numeric format', 'Number Base Converter', 'Use for debugging and teaching.']],
    articles: [['Unit converter for project planning', '/blog/articles/unit-converter-for-project-planning.html', 'Use conversions without losing context.'], ['Currency converter estimates', '/blog/articles/currency-converter-for-estimates-not-final-prices.html', 'Understand estimate limitations.'], ['Timezone converter meeting workflow', '/blog/articles/timezone-converter-meeting-workflow.html', 'Plan remote meetings more carefully.']]
  },
  {
    slug: 'calculator-tools', key: 'calculators', icon: '🧮', accent: '#f59e0b', name: 'Calculator Tools', short: 'Run practical percentage, scientific, BMI, age and planning calculations with visible assumptions.',
    intro: 'A calculator page should help you understand the inputs, not just output a number. This hub brings together everyday calculators for forms, planning, estimates and quick checks while keeping limitations visible.',
    audiences: [['Students', 'Use scientific and percentage calculators for coursework checks.'], ['Everyday users', 'Calculate age, BMI or percent changes for forms and planning.'], ['Operators', 'Run quick estimates before moving data into a formal system.']],
    tasks: [['Calculate percentages', 'Check discounts, growth, margins and changes.', 'percentage-calculator'], ['Use scientific functions', 'Run advanced math without a desktop calculator.', 'scientific-calculator'], ['Calculate age', 'Get exact age for forms and records.', 'age-calculator'], ['Check BMI context', 'Estimate BMI as a general screening number only.', 'bmi-calculator']],
    decisions: [['Need a rate or discount', 'Percentage Calculator', 'Best for business copy and quick checks.'], ['Need advanced functions', 'Scientific Calculator', 'Use for formulas and coursework.'], ['Need form-ready age', 'Age Calculator', 'Use exact dates for records.'], ['Need a health screening estimate', 'BMI Calculator', 'Use cautiously and avoid personal medical conclusions.']],
    articles: [['BMI result context', '/blog/articles/bmi-calculator-result-context.html', 'Read BMI estimates carefully.'], ['Scientific calculator browser workflow', '/blog/articles/scientific-calculator-browser-workflow.html', 'Use browser math tools cleanly.'], ['Percentage calculator business copy', '/blog/articles/percentage-calculator-business-copy.html', 'Avoid percentage mistakes in copy.']]
  },
  {
    slug: 'security-tools', key: 'security', icon: '🛡️', accent: '#6366f1', name: 'Security Tools', short: 'Generate passwords, UUIDs and hashes or inspect tokens and connection details with safety notes.',
    intro: 'Security utilities should make checks clearer without claiming to replace a security program. This hub groups password, hash, JWT, SSL and lookup tools with plain-language notes about careful handling.',
    audiences: [['Developers', 'Inspect tokens, hashes and identifiers during implementation.'], ['Admins', 'Check SSL or IP context before escalating an issue.'], ['Everyday users', 'Generate stronger passwords and understand strength feedback.']],
    tasks: [['Generate a password', 'Create a strong value, then store it in a trusted manager.', 'password-generator'], ['Check password strength', 'Understand length and variety signals before reuse.', 'password-strength'], ['Generate a hash', 'Create checksums for comparison and verification.', 'hash-generator'], ['Inspect JWT content', 'Decode token payloads without treating them as verified authorization.', 'jwt-decoder']],
    decisions: [['Need a new secret', 'Password Generator', 'Generate, then store safely.'], ['Need to review a password', 'Password Strength', 'Use as a signal, not a guarantee.'], ['Need file or text comparison', 'Hash Generator', 'Useful for integrity checks.'], ['Need to read token claims', 'JWT Decoder', 'Decode only; do not treat decode as trust.']],
    articles: [['Browser-first tools', '/blog/articles/browser-first-tools-what-it-means.html', 'Understand local utility limits.'], ['Share files with less metadata risk', '/blog/articles/share-files-with-less-metadata-risk.html', 'Reduce accidental exposure before sharing.'], ['Local processing vs upload tools', '/blog/articles/local-processing-vs-upload-tools-comparison.html', 'Know when browser-first is enough.']]
  },
  {
    slug: 'productivity-tools', key: 'productivity', icon: '✅', accent: '#84cc16', name: 'Productivity Tools', short: 'Plan tasks, track time, take notes and manage routines with lightweight browser utilities.',
    intro: 'Productivity tools work best when they reduce friction instead of becoming another project. This hub maps common planning, timing and note workflows to focused tools for daily work.',
    audiences: [['Students', 'Plan study sessions, countdowns and task lists.'], ['Freelancers', 'Track time, notes and project routines without a large app.'], ['Teams', 'Use simple boards and timers for lightweight coordination.']],
    tasks: [['Focus with a timer', 'Use Pomodoro or stopwatch tools to structure work blocks.', 'pomodoro-timer'], ['Manage tasks', 'Create a small task list or board for the next work session.', 'todo-list'], ['Take notes', 'Capture decisions and next steps quickly.', 'notes'], ['Track time', 'Record work intervals for review.', 'time-tracker']],
    decisions: [['Need focus blocks', 'Pomodoro Timer', 'Use for structured sessions.'], ['Need a simple task queue', 'Todo List / Kanban', 'Use before a full project system.'], ['Need quick capture', 'Notes', 'Use for temporary decisions and reminders.'], ['Need duration review', 'Time Tracker', 'Use for estimates and billing prep.']],
    articles: [['Remote team meeting workflow', '/blog/articles/remote-team-meeting-and-file-workflow.html', 'Connect meetings and file prep.'], ['Tool selection map', '/blog/articles/tool-selection-map-for-new-users.html', 'Choose lightweight tools by task.'], ['File organizer architecture', '/blog/articles/file-organizer-folder-architecture.html', 'Keep outputs easy to find.']]
  },
  {
    slug: 'data-tools', key: 'data', icon: '🧾', accent: '#14b8a6', name: 'Data Tools', short: 'Clean, convert, summarize and inspect CSV, JSON, SQL, checksums and file organization tasks.',
    intro: 'Data preparation is easier when cleaning, conversion and review happen before import. This hub connects CSV, JSON, SQL, checksum and file utilities to practical dashboard, spreadsheet and handoff workflows.',
    audiences: [['Analysts', 'Prepare CSV or JSON before dashboards and spreadsheets.'], ['Developers', 'Format SQL, convert JSON and verify checksums.'], ['Operations teams', 'Rename, split or organize files before sharing.']],
    tasks: [['Convert CSV and JSON', 'Move between tabular and structured formats for import.', 'csv-to-json'], ['Format SQL', 'Make queries readable before review.', 'sql-formatter'], ['Verify checksums', 'Compare values before trusting a file transfer.', 'checksum-calculator'], ['Organize files', 'Rename, merge or split files for delivery.', 'file-organizer']],
    decisions: [['Need spreadsheet import', 'CSV / JSON tools', 'Clean data before upload.'], ['Need query review', 'SQL Formatter', 'Make intent readable.'], ['Need file integrity check', 'Checksum Calculator', 'Compare hashes after transfer.'], ['Need handoff cleanup', 'File Organizer / Renamer', 'Make files understandable.']],
    articles: [['Data cleanup before dashboard import', '/blog/articles/data-cleanup-before-dashboard-import.html', 'Review data before visualization.'], ['CSV to JSON conversion guide', '/blog/articles/csv-to-json-clean-conversion-guide.html', 'Convert cleanly without losing structure.'], ['JSON to CSV export workflow', '/blog/articles/json-to-csv-export-workflow.html', 'Prepare exports for spreadsheets.']]
  },
  {
    slug: 'design-tools', key: 'design', icon: '🎨', accent: '#d946ef', name: 'Design Tools', short: 'Create quick brand, QR, invoice, mockup and layout assets with practical review steps.',
    intro: 'Design utilities are useful for lightweight preparation, not for replacing a full brand system. This hub maps quick visual tasks to tools and adds checks for readability, export quality and context.',
    audiences: [['Small businesses', 'Prepare quick invoices, cards and visual assets.'], ['Content creators', 'Generate lightweight visuals and QR assets for campaigns.'], ['Developers', 'Create placeholder visuals, mockups and layout assets during builds.']],
    tasks: [['Create a logo draft', 'Generate a lightweight starting point before brand review.', 'logo-maker'], ['Create a QR code', 'Generate and test before print or publishing.', 'qr-code-designer'], ['Prepare an invoice', 'Create clear billing documents for review.', 'invoice-generator'], ['Build quick mockups', 'Use placeholders to test layout and hierarchy.', 'mockup-generator']],
    decisions: [['Need a quick brand draft', 'Logo Maker', 'Use as a starting point, not final identity proof.'], ['Need scannable links', 'QR Code Designer', 'Test on devices before print.'], ['Need billing paperwork', 'Invoice Generator', 'Review legal and tax details before sending.'], ['Need layout preview', 'Mockup / Wireframe tools', 'Use before final design production.']],
    articles: [['Image alt text and file names', '/blog/articles/image-alt-text-and-file-names-workflow.html', 'Improve visual publishing quality.'], ['Lorem ipsum layout checks', '/blog/articles/lorem-ipsum-with-real-layout-checks.html', 'Use placeholders responsibly.'], ['Transparent background workflow', '/blog/articles/transparent-background-image-workflow.html', 'Prepare assets for compositing.']]
  },
  {
    slug: 'social-media-tools', key: 'social', icon: '📣', accent: '#ec4899', name: 'Social Media Tools', short: 'Prepare UTM links, thumbnails, hashtags and social assets with campaign-ready checks.',
    intro: 'Social media utilities should help you prepare assets without hiding campaign context. This hub links social tools with checks for tracking, visual quality, naming and platform fit.',
    audiences: [['Marketers', 'Prepare UTM links and campaign assets before launch.'], ['Creators', 'Generate thumbnails, captions and hashtags for publishing.'], ['Small teams', 'Keep social links, visuals and naming consistent.']],
    tasks: [['Build a UTM link', 'Create trackable campaign URLs with consistent parameters.', 'utm-builder'], ['Generate hashtags', 'Draft platform-aware hashtag sets for review.', 'hashtag-generator'], ['Prepare thumbnails', 'Create visual previews before upload.', 'youtube-thumbnail'], ['Create favicon/social assets', 'Prepare small brand assets for web channels.', 'favicon-generator']],
    decisions: [['Need trackable traffic', 'UTM Builder', 'Use naming conventions before publishing.'], ['Need discovery tags', 'Hashtag Generator', 'Review relevance and platform tone.'], ['Need a video visual', 'Thumbnail tools', 'Check readability at small sizes.'], ['Need site/social icons', 'Favicon / asset tools', 'Test sizes before launch.']],
    articles: [['Resize images for social platforms', '/blog/articles/resize-images-for-social-platforms.html', 'Prepare visuals for platform constraints.'], ['Image alt text and file names', '/blog/articles/image-alt-text-and-file-names-workflow.html', 'Name assets before publishing.'], ['Browser tool empty states', '/blog/articles/browser-tool-empty-state-loading-success.html', 'Make campaign prep tools easier to use.']]
  }
];

const calculatorIds = new Set(['percentage-calculator', 'scientific-calculator', 'bmi-calculator', 'age-calculator', 'number-base-converter']);
const converterOnlyIds = new Set(['unit-converter', 'currency-converter', 'timezone-converter', 'date-calculator']);

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function toolUrl(tool) {
  return `/tools${tool.path || tool.entry.replace(/^\/src\/tools/, '').replace(/\/$/, '')}/`;
}

function toolDescription(tool) {
  return typeof tool.description === 'string' ? tool.description : (tool.description?.en || tool.description?.tr || 'Focused browser utility for this workflow.');
}

function toolsForHub(hub) {
  let tools = manifest.tools.filter((tool) => tool.category === hub.key);
  if (hub.slug === 'calculator-tools') tools = manifest.tools.filter((tool) => calculatorIds.has(tool.id));
  if (hub.slug === 'converters') tools = manifest.tools.filter((tool) => tool.category === 'converters' && (!calculatorIds.has(tool.id) || converterOnlyIds.has(tool.id)));
  return tools.sort((a, b) => (a.tier || 9) - (b.tier || 9) || (a.nameEn || a.name || '').localeCompare(b.nameEn || b.name || '')).slice(0, 18);
}

function findToolById(id) {
  return manifest.tools.find((tool) => tool.id === id) || manifest.tools.find((tool) => tool.path?.endsWith(`/${id}`));
}

function categoryUrl(slug) {
  return `/categories/${slug}.html`;
}

function hreflang(path) {
  const langs = ['en', 'tr', 'de', 'fr', 'es', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'it', 'pl', 'nl'];
  return langs.map((lang) => {
    const href = lang === 'tr' || lang === 'ar' ? `${origin}/${lang}${path}` : `${origin}${path}${lang === 'en' ? '' : `?lang=${lang}`}`;
    return `  <link rel="alternate" hreflang="${lang}" href="${href}">`;
  }).join('\n') + `\n  <link rel="alternate" hreflang="x-default" href="${origin}${path}">`;
}

function renderHeader() {
  return `<header class="guide-header"><div class="container guide-header__inner"><a class="logo" href="/" aria-label="MC NovaTools home"><span class="logo-text">MC NovaTools</span></a><nav class="guide-nav" aria-label="Main navigation">${baseNav.map(([label, href]) => `<a href="${href}">${label}</a>`).join('')}</nav><div class="header-actions"><select id="language-selector" class="language-selector" aria-label="Select Language">${languageOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join('')}</select></div></div></header>`;
}

function renderFooter() {
  return `<footer class="guide-footer"><div class="container guide-footer__grid"><div><strong>MC NovaTools</strong><p>Professional browser-based utilities with practical decision guides.</p></div><nav aria-label="Footer"><a href="/categories/index.html">Categories</a><a href="/blog/index.html">Blog</a><a href="/gizlilik-politikasi.html">Privacy Policy</a><a href="/iletisim.html">Contact</a></nav></div><div class="container guide-footer__bottom">NovaTools © ${year} - All rights reserved.</div></footer>`;
}

function renderCategoryPage(hub) {
  const path = categoryUrl(hub.slug);
  const tools = toolsForHub(hub);
  const other = categoryHubs.filter((item) => item.slug !== hub.slug).slice(0, 4);
  const itemList = tools.map((tool, index) => ({ '@type': 'ListItem', position: index + 1, url: `${origin}${toolUrl(tool)}`, name: tool.nameEn || tool.name || tool.id }));
  const schema = {
    '@context': 'https://schema.org', '@graph': [
      { '@type': 'CollectionPage', name: `${hub.name} | MC NovaTools`, description: hub.short, url: `${origin}${path}`, inLanguage: 'en' },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` }, { '@type': 'ListItem', position: 2, name: 'Categories', item: `${origin}/categories/index.html` }, { '@type': 'ListItem', position: 3, name: hub.name, item: `${origin}${path}` }] },
      { '@type': 'ItemList', name: hub.name, itemListElement: itemList },
      { '@type': 'FAQPage', mainEntity: [
        { '@type': 'Question', name: `Which ${hub.name.toLowerCase()} should I start with?`, acceptedAnswer: { '@type': 'Answer', text: 'Start with the use-case cards and decision table, then open the tool mapped to your specific task.' } },
        { '@type': 'Question', name: 'Are these tools free to start?', acceptedAnswer: { '@type': 'Answer', text: 'The category links to free online NovaTools utilities. Some tools may rely on browser resources or external data as stated on the tool page.' } },
        { '@type': 'Question', name: 'What should I check before sharing an output?', acceptedAnswer: { '@type': 'Answer', text: 'Review file names, input assumptions, privacy needs, readability and output format before sending or publishing.' } }
      ] }
    ]
  };
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(hub.name)} | Decision Guide, Tools & Workflows | MC NovaTools</title>
  <meta name="description" content="${escapeHtml(hub.short)}">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#0A0A0C">
  <meta name="author" content="Metehan ÇETİN, LPC">
  <link rel="canonical" href="${origin}${path}">
${hreflang(path)}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/src/styles/critical.css">
  <link rel="stylesheet" href="/src/styles/design-system.css">
  <link rel="stylesheet" href="/src/styles/component-library.css">
  <link rel="stylesheet" href="/src/styles/layout.css">
  <link rel="stylesheet" href="/src/styles/category-guides.css">
  <script src="/i18n.js" defer></script>
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body class="category-guide-page">
  ${renderHeader()}
  <main class="category-guide-main">
    <nav class="guide-breadcrumb" aria-label="Breadcrumb"><div class="container"><ol><li><a href="/">Home</a></li><li><a href="/categories/index.html">Categories</a></li><li aria-current="page">${escapeHtml(hub.name)}</li></ol></div></nav>
    <article>
      <header class="category-guide-hero"><div class="container category-guide-hero__grid"><div class="category-guide-hero__icon" style="--category-accent: ${hub.accent};"><span>${hub.icon}</span></div><div><p class="section-eyebrow">Category decision hub</p><h1>${escapeHtml(hub.name)} for practical browser workflows</h1><p class="category-guide-intro">${escapeHtml(hub.intro)}</p><div class="category-hero-actions"><a class="btn btn-primary" href="#tools">Open tools</a><a class="btn btn-secondary" href="#decision-table">Choose by task</a></div></div></div></header>
      <section class="guide-section" aria-labelledby="audienceTitle"><div class="container"><div class="section-header"><span class="section-eyebrow">Who it helps</span><h2 id="audienceTitle" class="section-title">Start from your role</h2><p class="section-description">Each block maps a common audience to a concrete first step.</p></div><div class="persona-grid">${hub.audiences.map(([title, text]) => `<article class="persona-card"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></article>`).join('')}</div></div></section>
      <section class="guide-section" aria-labelledby="taskTitle"><div class="container"><div class="section-header"><span class="section-eyebrow">Popular tasks</span><h2 id="taskTitle" class="section-title">Task-based entry points</h2><p class="section-description">Open the closest workflow first, then review the output before sharing.</p></div><ol class="task-steps">${hub.tasks.map(([name, text, id]) => { const tool = findToolById(id); return `<li><div><strong>${escapeHtml(name)}</strong><p>${escapeHtml(text)}</p></div><a class="btn btn-primary" href="${tool ? toolUrl(tool) : '#tools'}">Open tool</a></li>`; }).join('')}</ol></div></section>
      <section class="guide-section" id="decision-table" aria-labelledby="decisionTitle"><div class="container"><div class="section-header"><span class="section-eyebrow">Decision table</span><h2 id="decisionTitle" class="section-title">Choose the right tool faster</h2></div><div class="decision-table-wrap"><table class="decision-table"><thead><tr><th>Need</th><th>Recommended tool</th><th>Why this fits</th></tr></thead><tbody>${hub.decisions.map(([need, tool, why]) => `<tr><td>${escapeHtml(need)}</td><td>${escapeHtml(tool)}</td><td>${escapeHtml(why)}</td></tr>`).join('')}</tbody></table></div></div></section>
      <section class="guide-section" id="tools" aria-labelledby="toolsTitle"><div class="container"><div class="section-header"><span class="section-eyebrow">Tools</span><h2 id="toolsTitle" class="section-title">${escapeHtml(hub.name)} tool map</h2><p class="section-description">Cards use consistent descriptions, workflow labels and direct links so the category works as a real hub.</p></div><div class="guide-tools-grid">${tools.map((tool) => `<article class="guide-tool-card nt-card nt-card--tool"><div class="guide-tool-card__icon" style="--category-accent: ${hub.accent};"><span>${hub.icon}</span></div><div class="guide-tool-card__body"><h3><a href="${toolUrl(tool)}">${escapeHtml(tool.nameEn || tool.name || tool.id)}</a></h3><p>${escapeHtml(toolDescription(tool))}</p></div><div class="guide-tool-card__meta"><span>Browser-first where practical</span><span>${escapeHtml(hub.name)}</span></div><a class="btn btn-primary" href="${toolUrl(tool)}">Use tool</a></article>`).join('')}</div></div></section>
      <section class="guide-section" aria-labelledby="articlesTitle"><div class="container"><div class="section-header"><span class="section-eyebrow">Guides</span><h2 id="articlesTitle" class="section-title">Related guides</h2><p class="section-description">Use these articles as quality checks around the tools.</p></div><div class="related-article-grid">${hub.articles.map(([title, url, summary]) => `<article class="related-article-card"><h3><a href="${url}">${escapeHtml(title)}</a></h3><p>${escapeHtml(summary)}</p><a href="${url}">Read guide →</a></article>`).join('')}</div></div></section>
      <section class="guide-section" aria-labelledby="faqTitle"><div class="container"><div class="section-header"><span class="section-eyebrow">FAQ</span><h2 id="faqTitle" class="section-title">Category FAQ</h2></div><div class="faq-accordion"><details><summary>Which ${escapeHtml(hub.name.toLowerCase())} should I start with?</summary><p>Start with the use-case cards and decision table, then open the tool mapped to your specific task.</p></details><details><summary>Are these tools free to start?</summary><p>The category links to free online NovaTools utilities. Some tools may rely on browser resources or external data as stated on the tool page.</p></details><details><summary>What should I check before sharing an output?</summary><p>Review file names, input assumptions, privacy needs, readability and output format before sending or publishing.</p></details></div></div></section>
      <aside class="guide-section other-categories" aria-labelledby="otherCategoriesTitle"><div class="container"><div class="section-header"><span class="section-eyebrow">Next</span><h2 id="otherCategoriesTitle" class="section-title">Related categories</h2></div><div class="other-category-grid">${other.map((item) => `<a class="other-category-card" href="${categoryUrl(item.slug)}"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.short)}</span></a>`).join('')}</div></div></aside>
    </article>
  </main>
  ${renderFooter()}
</body>
</html>
`;
}

function renderIndexPage() {
  const path = '/categories/index.html';
  const schema = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: 'All Tool Categories | MC NovaTools', description: 'Browse every MC NovaTools category as a decision hub for tools, workflows and guides.', url: `${origin}${path}`, inLanguage: 'en' };
  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>All Tool Categories | Decision Hubs & Workflow Maps | MC NovaTools</title>
  <meta name="description" content="Browse every MC NovaTools category as a professional decision hub for PDF, image, finance, developer, text, converter, security, data, design, social and productivity tools.">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta name="theme-color" content="#0A0A0C">
  <meta name="author" content="Metehan ÇETİN, LPC">
  <link rel="canonical" href="${origin}${path}">
${hreflang(path)}
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/src/styles/critical.css">
  <link rel="stylesheet" href="/src/styles/design-system.css">
  <link rel="stylesheet" href="/src/styles/component-library.css">
  <link rel="stylesheet" href="/src/styles/layout.css">
  <link rel="stylesheet" href="/src/styles/category-guides.css">
  <script src="/i18n.js" defer></script>
  <script type="application/ld+json">${JSON.stringify(schema)}</script>
</head>
<body class="category-guide-page">
  ${renderHeader()}
  <main class="category-guide-main">
    <section class="category-guide-hero"><div class="container category-guide-hero__grid"><div class="category-guide-hero__icon"><span>🧭</span></div><div><p class="section-eyebrow">All categories</p><h1>Find the right NovaTools workflow by task</h1><p class="category-guide-intro">Each category is a professional hub: start with a use case, compare the decision table, open the right tool, then use related guides as quality checks before sharing an output.</p></div></div></section>
    <section class="guide-section"><div class="container"><div class="section-header"><span class="section-eyebrow">Browse</span><h2 class="section-title">Category hubs</h2><p class="section-description">Every hub connects tools, related guides, FAQ and neighboring categories.</p></div><div class="other-category-grid">${categoryHubs.map((hub) => `<a class="other-category-card category-index-card" href="${categoryUrl(hub.slug)}" style="--category-accent: ${hub.accent};"><span class="category-index-card__icon">${hub.icon}</span><strong>${escapeHtml(hub.name)}</strong><span>${escapeHtml(hub.short)}</span></a>`).join('')}</div></div></section>
    <section class="guide-section"><div class="container"><div class="section-header"><span class="section-eyebrow">How to choose</span><h2 class="section-title">Use task language first</h2></div><ol class="task-steps"><li><div><strong>Describe the job</strong><p>Start with the real task: compress, convert, compare, calculate, format or prepare.</p></div><a class="btn btn-secondary" href="/blog/articles/tool-selection-map-for-new-users.html">Read guide</a></li><li><div><strong>Open the category hub</strong><p>Use the decision table to choose the closest tool before uploading, pasting or entering data.</p></div><a class="btn btn-secondary" href="#top">Browse hubs</a></li><li><div><strong>Check the result</strong><p>Review output quality, privacy needs and next-step links before sending or publishing.</p></div><a class="btn btn-secondary" href="/blog/index.html">Open guides</a></li></ol></div></section>
  </main>
  ${renderFooter()}
</body>
</html>
`;
}

for (const hub of categoryHubs) {
  writeFileSync(resolve('categories', `${hub.slug}.html`), renderCategoryPage(hub));
}
writeFileSync(resolve('categories/index.html'), renderIndexPage());
console.log(`Generated ${categoryHubs.length + 1} category hub pages.`);
