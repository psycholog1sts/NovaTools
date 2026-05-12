#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputFiles = [
  path.join(rootDir, 'content', 'blog-outlines.json'),
  path.join(rootDir, 'src', 'data', 'blog-outlines.json')
];
const mode = process.argv.includes('--check') ? 'check' : 'write';

const existingArticleSlugs = new Set(
  fs.existsSync(path.join(rootDir, 'src', 'blog', 'articles'))
    ? fs.readdirSync(path.join(rootDir, 'src', 'blog', 'articles')).filter((file) => file.endsWith('.html')).map((file) => file.replace(/\.html$/, ''))
    : []
);

const clusters = {
  'pdf-workflows': {
    category: 'PDF Workflows',
    audience: 'operations, finance, legal, and client-service teams',
    outcome: 'a reviewable PDF workflow with fewer handoff mistakes',
    tools: ['/tools/pdf/merge/', '/tools/pdf/split/', '/tools/pdf/compress/', '/tools/pdf/pdf-to-text/', '/tools/pdf/pdf-ocr/', '/tools/pdf/pdf-page-number/', '/tools/pdf/pdf-watermark/'],
    topics: [
      ['client-contract-pdf-review-checklist', 'Client Contract PDF Review Checklist Before Sending', 'prepare a contract packet for client review', ['/tools/pdf/merge/', '/tools/pdf/pdf-page-number/', '/tools/pdf/pdf-watermark/']],
      ['monthly-invoice-pdf-packaging-workflow', 'Monthly Invoice PDF Packaging Workflow for Small Teams', 'package invoices, receipts, and notes for approval', ['/tools/pdf/merge/', '/tools/pdf/compress/', '/tools/design/invoice-generator/']],
      ['scan-to-searchable-pdf-office-workflow', 'Scan to Searchable PDF Office Workflow Without Losing Context', 'turn scanned office records into searchable documents', ['/tools/pdf/pdf-ocr/', '/tools/pdf/pdf-to-text/', '/tools/pdf/compress/']],
      ['split-sensitive-pdf-before-sharing', 'Split Sensitive PDF Sections Before Sharing Externally', 'share only the pages another person needs', ['/tools/pdf/split/', '/tools/pdf/pdf-page-number/', '/tools/pdf/pdf-watermark/']],
      ['compress-large-pdf-for-portal-upload', 'Compress a Large PDF for Portal Upload Without Guesswork', 'reduce a PDF for portals with file-size limits', ['/tools/pdf/compress/', '/tools/pdf/pdf-to-text/']],
      ['pdf-to-word-editing-decision-guide', 'PDF to Word Editing Decision Guide for Client Documents', 'decide when conversion is safer than rebuilding content', ['/tools/pdf/pdf-to-word/', '/tools/pdf/pdf-to-text/']],
      ['pdf-page-numbering-report-workflow', 'PDF Page Numbering Workflow for Long Reports', 'number long reports before review and signoff', ['/tools/pdf/pdf-page-number/', '/tools/pdf/merge/']],
      ['pdf-watermark-client-review-process', 'PDF Watermark Process for Client Review Copies', 'mark review drafts without changing the source file', ['/tools/pdf/pdf-watermark/', '/tools/pdf/compress/']],
      ['pdf-to-image-evidence-prep-workflow', 'PDF to Image Evidence Prep Workflow for Support Tickets', 'turn selected pages into clear image evidence', ['/tools/pdf/pdf-to-jpg/', '/tools/pdf/pdf-to-png/', '/tools/pdf/split/']],
      ['merge-scanned-receipts-tax-folder', 'Merge Scanned Receipts Into a Tax Folder PDF', 'prepare receipt bundles before tax review', ['/tools/pdf/merge/', '/tools/pdf/pdf-ocr/', '/tools/finance/tax/']],
      ['pdf-table-extraction-quality-check', 'PDF Table Extraction Quality Check Before Spreadsheet Import', 'review extracted PDF table text before analysis', ['/tools/pdf/pdf-to-excel/', '/tools/pdf/pdf-to-text/', '/tools/data/csv-viewer/']],
      ['presentation-pdf-to-powerpoint-rebuild', 'Presentation PDF to PowerPoint Rebuild Workflow', 'decide how to rebuild slide content from a PDF', ['/tools/pdf/pdf-to-powerpoint/', '/tools/pdf/pdf-to-jpg/']],
      ['html-export-from-pdf-review-flow', 'HTML Export From PDF Review Flow for Web Publishing', 'review PDF-to-HTML output before publishing', ['/tools/pdf/pdf-to-html/', '/tools/dev/html-to-markdown/']]
    ]
  },
  'image-optimization': {
    category: 'Image Optimization',
    audience: 'marketers, creators, support teams, and site owners',
    outcome: 'image assets that are smaller, clearer, and safer to share',
    tools: ['/tools/image/compress/', '/tools/image/image-resizer/', '/tools/image/convert/', '/tools/image/metadata-remover/', '/tools/image/image-to-webp/', '/tools/image/background-remover/'],
    topics: [
      ['webp-conversion-for-landing-pages', 'WebP Conversion Workflow for Faster Landing Pages', 'convert marketing images without hurting visual clarity', ['/tools/image/image-to-webp/', '/tools/image/compress/']],
      ['social-image-resize-quality-checklist', 'Social Image Resize Quality Checklist Before Posting', 'resize campaign images for social channels', ['/tools/social/social-image-resizer/', '/tools/image/image-resizer/']],
      ['remove-image-metadata-before-client-share', 'Remove Image Metadata Before Client Sharing', 'strip hidden file details before external review', ['/tools/image/metadata-remover/', '/tools/image/exif-viewer/']],
      ['background-removal-product-photo-workflow', 'Background Removal Workflow for Product Photos', 'prepare cleaner product images for catalogs', ['/tools/image/background-remover/', '/tools/image/image-cropper/']],
      ['batch-crop-images-for-email-campaigns', 'Batch Crop Images for Email Campaign Layouts', 'prepare consistent newsletter visuals', ['/tools/image/image-cropper/', '/tools/image/image-resizer/']],
      ['compress-screenshots-for-help-center', 'Compress Screenshots for Help Center Articles', 'reduce support screenshots while preserving labels', ['/tools/image/compress/', '/tools/image/image-resizer/']],
      ['png-to-jpg-decision-guide', 'PNG to JPG Decision Guide for Non-Designers', 'choose the right format for practical image tasks', ['/tools/image/convert/', '/tools/image/image-to-webp/']],
      ['image-watermark-review-copy-process', 'Image Watermark Review Copy Process', 'add review marks to images without overwriting originals', ['/tools/image/image-watermark/', '/tools/image/metadata-remover/']],
      ['avif-vs-webp-small-site-assets', 'AVIF vs WebP for Small Site Assets', 'choose modern formats for small websites', ['/tools/image/image-to-avif/', '/tools/image/image-to-webp/']],
      ['rotate-flip-image-intake-checklist', 'Rotate and Flip Image Intake Checklist', 'correct orientation issues before publishing', ['/tools/image/image-rotator/', '/tools/image/image-flipper/']],
      ['collage-maker-event-recap-workflow', 'Collage Maker Workflow for Event Recaps', 'combine event images into a clean recap asset', ['/tools/image/collage-maker/', '/tools/image/compress/']],
      ['thumbnail-prep-for-video-publishing', 'Thumbnail Prep Workflow for Video Publishing', 'prepare clear thumbnails before upload', ['/tools/social/youtube-thumbnail/', '/tools/image/image-resizer/']],
      ['image-alt-text-file-name-workflow', 'Image Alt Text and File Name Workflow for SEO Reviews', 'prepare accessible image assets for publishing', ['/tools/text/text-to-slug/', '/tools/image/metadata-remover/']]
    ]
  },
  'finance-calculators': {
    category: 'Finance Calculators',
    audience: 'households, freelancers, and small business operators',
    outcome: 'clearer financial assumptions before making a decision',
    tools: ['/tools/finance/mortgage-refinance/', '/tools/finance/compound-interest/', '/tools/finance/student-loan/', '/tools/finance/tax/', '/tools/finance/retirement/', '/tools/finance/cloud-cost/'],
    topics: [
      ['mortgage-refinance-break-even-review', 'Mortgage Refinance Break-Even Review Workflow', 'compare refinance assumptions before calling a lender', ['/tools/finance/mortgage-refinance/', '/tools/finance/compound-interest/']],
      ['student-loan-payment-scenario-planning', 'Student Loan Payment Scenario Planning Guide', 'compare repayment options with clear assumptions', ['/tools/finance/student-loan/', '/tools/finance/compound-interest/']],
      ['compound-interest-goal-tracking-template', 'Compound Interest Goal Tracking Template for Savers', 'model savings growth with regular contributions', ['/tools/finance/compound-interest/', '/tools/converters/percentage-calculator/']],
      ['retirement-inputs-sanity-check', 'Retirement Calculator Inputs Sanity Check', 'review retirement assumptions before saving a result', ['/tools/finance/retirement/', '/tools/finance/compound-interest/']],
      ['tax-document-prep-before-estimate', 'Tax Document Prep Before Running an Estimate', 'organize documents before using tax estimates', ['/tools/finance/tax/', '/tools/pdf/merge/']],
      ['cloud-cost-estimate-review-workflow', 'Cloud Cost Estimate Review Workflow for Small Teams', 'estimate cloud spend with transparent inputs', ['/tools/finance/cloud-cost/', '/tools/data/csv-json-summarizer/']],
      ['life-insurance-estimate-context-checklist', 'Life Insurance Estimate Context Checklist', 'prepare coverage assumptions for review', ['/tools/finance/life-insurance/', '/tools/finance/compound-interest/']],
      ['crypto-tax-record-prep-workflow', 'Crypto Tax Record Prep Workflow Before Filing', 'organize crypto activity records before tax review', ['/tools/finance/crypto-tax/', '/tools/data/csv-viewer/']],
      ['currency-converter-budget-estimate-flow', 'Currency Converter Budget Estimate Flow for Trips', 'estimate travel costs without treating rates as final', ['/tools/converters/currency-converter/', '/tools/finance/live-exchange/']],
      ['stock-watchlist-research-notes-workflow', 'Stock Watchlist Research Notes Workflow', 'capture assumptions before comparing securities', ['/tools/finance/stock-lookup/', '/tools/productivity/notes/']],
      ['large-purchase-budget-scenario-check', 'Large Purchase Budget Scenario Check', 'compare financing and cash assumptions before buying', ['/tools/finance/compound-interest/', '/tools/converters/percentage-calculator/']],
      ['freelancer-quarterly-tax-planning', 'Freelancer Quarterly Tax Planning Workflow', 'prepare estimated tax inputs for independent work', ['/tools/finance/tax/', '/tools/design/invoice-generator/']],
      ['subscription-cost-annualization-workflow', 'Subscription Cost Annualization Workflow', 'turn monthly costs into annual planning inputs', ['/tools/converters/percentage-calculator/', '/tools/finance/compound-interest/']]
    ]
  },
  'developer-utilities': {
    category: 'Developer Utilities',
    audience: 'developers, QA reviewers, and technical support teams',
    outcome: 'cleaner inputs, safer debugging, and more reviewable technical handoffs',
    tools: ['/tools/dev/json-formatter/', '/tools/dev/json-validator/', '/tools/dev/regex-tester/', '/tools/dev/code-formatter/', '/tools/dev/url-encoder/', '/tools/dev/base64-converter/'],
    topics: [
      ['json-api-debugging-response-workflow', 'JSON API Debugging Response Workflow', 'inspect API responses without losing context', ['/tools/dev/json-formatter/', '/tools/dev/json-validator/']],
      ['regex-review-before-production-release', 'Regex Review Checklist Before Production Release', 'test regular expressions with safer sample cases', ['/tools/dev/regex-tester/', '/tools/dev/code-formatter/']],
      ['url-encoding-query-string-debug-flow', 'URL Encoding Debug Flow for Query Strings', 'review encoded URLs before sharing or testing', ['/tools/dev/url-encoder/', '/tools/text/url-encoder/']],
      ['base64-payload-inspection-checklist', 'Base64 Payload Inspection Checklist', 'decode payloads for review without overtrusting content', ['/tools/dev/base64-converter/', '/tools/security/jwt-decoder/']],
      ['markdown-to-html-publishing-preflight', 'Markdown to HTML Publishing Preflight Workflow', 'convert markdown content for web publishing review', ['/tools/dev/markdown-to-html/', '/tools/dev/html-to-markdown/']],
      ['css-minify-release-safety-check', 'CSS Minify Release Safety Check', 'minify CSS while keeping rollback options', ['/tools/dev/css-minifier/', '/tools/dev/code-formatter/']],
      ['javascript-minify-release-checklist', 'JavaScript Minify Release Checklist', 'prepare JavaScript assets for release review', ['/tools/dev/js-minifier/', '/tools/dev/code-formatter/']],
      ['code-formatting-pr-review-workflow', 'Code Formatting PR Review Workflow', 'make code diffs easier to review', ['/tools/dev/code-formatter/', '/tools/productivity/kanban-board/']],
      ['color-token-conversion-guide', 'Color Token Conversion Guide for Design Systems', 'convert and document color values consistently', ['/tools/dev/color-converter/', '/tools/design/wireframe-tool/']],
      ['html-to-markdown-migration-workflow', 'HTML to Markdown Migration Workflow', 'move web content into cleaner editorial formats', ['/tools/dev/html-to-markdown/', '/tools/text/text-diff/']],
      ['sql-formatting-query-review-flow', 'SQL Formatting Query Review Flow', 'format SQL before sharing it for review', ['/tools/data/sql-formatter/', '/tools/dev/code-formatter/']],
      ['checksum-file-verification-workflow', 'Checksum File Verification Workflow', 'verify files before and after transfer', ['/tools/data/checksum-calculator/', '/tools/security/hash-generator/']],
      ['jwt-decoder-support-ticket-workflow', 'JWT Decoder Support Ticket Workflow', 'inspect token claims without exposing secrets', ['/tools/security/jwt-decoder/', '/tools/dev/json-formatter/']]
    ]
  },
  'text-utilities': {
    category: 'Text Utilities',
    audience: 'writers, editors, marketers, and support teams',
    outcome: 'cleaner copy that is easier to publish, compare, and review',
    tools: ['/tools/text/word-counter/', '/tools/text/character-counter/', '/tools/text/case-converter/', '/tools/text/text-to-slug/', '/tools/text/text-diff/', '/tools/text/html-entity-encoder/'],
    topics: [
      ['word-count-editing-client-copy', 'Word Count Editing Workflow for Client Copy', 'trim copy to fit review and publishing limits', ['/tools/text/word-counter/', '/tools/text/text-diff/']],
      ['character-count-meta-description-workflow', 'Character Count Workflow for Meta Descriptions', 'draft search snippets within practical limits', ['/tools/text/character-counter/', '/tools/text/text-to-slug/']],
      ['case-converter-data-cleanup-checklist', 'Case Converter Data Cleanup Checklist', 'normalize labels before import or publishing', ['/tools/text/case-converter/', '/tools/data/csv-viewer/']],
      ['slug-generator-url-review-process', 'Slug Generator URL Review Process', 'create readable slugs that can stay stable', ['/tools/text/text-to-slug/', '/tools/dev/url-encoder/']],
      ['text-diff-client-revision-review', 'Text Diff Client Revision Review Workflow', 'compare edits before accepting a revision', ['/tools/text/text-diff/', '/tools/productivity/notes/']],
      ['html-entity-encoding-publishing-check', 'HTML Entity Encoding Publishing Check', 'prepare snippets that include special characters', ['/tools/text/html-entity-encoder/', '/tools/dev/markdown-to-html/']],
      ['lorem-ipsum-real-layout-testing', 'Lorem Ipsum Workflow for Real Layout Testing', 'test layout without mistaking placeholder text for content', ['/tools/text/lorem-ipsum-generator/', '/tools/design/mockup-generator/']],
      ['plain-text-cleanup-before-import', 'Plain Text Cleanup Before Spreadsheet Import', 'clean pasted text before structured import', ['/tools/text/text-analysis/', '/tools/data/csv-viewer/']],
      ['translation-draft-review-workflow', 'Translation Draft Review Workflow for Small Teams', 'review translated drafts before publication', ['/tools/text/simple-translator/', '/tools/text/text-diff/']],
      ['ascii-text-conversion-teaching-guide', 'ASCII Text Conversion Teaching Guide', 'explain character encoding with practical examples', ['/tools/text/text-to-ascii/', '/tools/dev/base64-converter/']],
      ['palindrome-checker-string-logic-lesson', 'Palindrome Checker String Logic Lesson Plan', 'teach string comparison with visible examples', ['/tools/text/palindrome-checker/', '/tools/dev/code-formatter/']],
      ['text-summarizer-human-review-workflow', 'Text Summarizer Human Review Workflow', 'use summaries as drafts that require verification', ['/tools/text/text-summarizer/', '/tools/text/word-counter/']]
    ]
  },
  'privacy-workflows': {
    category: 'Privacy Workflows',
    audience: 'privacy-conscious individuals, support teams, and small businesses',
    outcome: 'safer handling of files, screenshots, tokens, and shared records',
    tools: ['/tools/image/metadata-remover/', '/tools/security/password-generator/', '/tools/security/hash-generator/', '/tools/security/encrypt-decrypt/', '/tools/security/jwt-decoder/', '/tools/data/checksum-calculator/'],
    topics: [
      ['private-document-share-without-signup', 'Private Document Share Workflow Without Signup', 'prepare documents before sending them externally', ['/tools/pdf/compress/', '/tools/image/metadata-remover/']],
      ['screenshot-redaction-prep-checklist', 'Screenshot Redaction Prep Checklist for Support Tickets', 'prepare screenshots with less accidental exposure', ['/tools/image/image-cropper/', '/tools/image/metadata-remover/']],
      ['password-generation-team-handoff', 'Password Generation Team Handoff Workflow', 'create and hand off credentials more safely', ['/tools/security/password-generator/', '/tools/security/password-strength/']],
      ['hash-check-before-file-transfer', 'Hash Check Before File Transfer Workflow', 'compare file hashes during transfer review', ['/tools/security/hash-generator/', '/tools/data/checksum-calculator/']],
      ['jwt-claim-review-without-secret-sharing', 'JWT Claim Review Without Secret Sharing', 'inspect token structure without exposing private values', ['/tools/security/jwt-decoder/', '/tools/dev/json-formatter/']],
      ['metadata-cleanup-before-publishing', 'Metadata Cleanup Before Publishing Files', 'remove hidden details from assets before release', ['/tools/image/metadata-remover/', '/tools/image/exif-viewer/']],
      ['encrypted-note-temporary-share-process', 'Encrypted Note Temporary Share Process', 'protect short-lived text during handoff', ['/tools/security/encrypt-decrypt/', '/tools/productivity/notes/']],
      ['uuid-generation-test-data-boundaries', 'UUID Generation and Test Data Boundaries', 'use identifiers without leaking real records', ['/tools/security/uuid-generator/', '/tools/data/csv-to-json/']],
      ['ssl-check-before-client-launch', 'SSL Check Before Client Launch Workflow', 'review certificate status before launch day', ['/tools/security/ssl-checker/', '/tools/productivity/kanban-board/']],
      ['user-agent-parser-support-triage', 'User Agent Parser Support Triage Workflow', 'understand browser details in support reports', ['/tools/security/user-agent-parser/', '/tools/data/csv-json-summarizer/']],
      ['ad-blocker-test-consent-review', 'Ad Blocker Test and Consent Review Workflow', 'check ad visibility without bypassing user choice', ['/tools/security/ad-blocker-tester/', '/tools/social/utm-builder/']],
      ['local-processing-vs-upload-decision-guide', 'Local Processing vs Upload Tool Decision Guide', 'decide when browser-first processing is appropriate', ['/tools/image/metadata-remover/', '/tools/pdf/pdf-to-text/']]
    ]
  },
  productivity: {
    category: 'Productivity',
    audience: 'remote workers, operators, and project leads',
    outcome: 'repeatable workflows with clearer next actions and fewer missed handoffs',
    tools: ['/tools/productivity/todo-list/', '/tools/productivity/kanban-board/', '/tools/productivity/time-tracker/', '/tools/productivity/pomodoro-timer/', '/tools/productivity/notes/', '/tools/productivity/world-clock/'],
    topics: [
      ['remote-team-file-handoff-checklist', 'Remote Team File Handoff Checklist', 'prepare files and notes for async teammates', ['/tools/productivity/kanban-board/', '/tools/data/file-organizer/']],
      ['meeting-timezone-planning-workflow', 'Meeting Timezone Planning Workflow for Distributed Teams', 'schedule meetings across time zones', ['/tools/productivity/world-clock/', '/tools/converters/timezone-converter/']],
      ['time-tracking-weekly-review-flow', 'Time Tracking Weekly Review Flow', 'review logged work without overcomplicating reporting', ['/tools/productivity/time-tracker/', '/tools/productivity/notes/']],
      ['pomodoro-writing-sprint-workflow', 'Pomodoro Writing Sprint Workflow for Drafts', 'finish focused writing sessions with review checkpoints', ['/tools/productivity/pomodoro-timer/', '/tools/text/word-counter/']],
      ['kanban-intake-board-small-team', 'Kanban Intake Board Setup for Small Teams', 'organize incoming requests with visible states', ['/tools/productivity/kanban-board/', '/tools/request/']],
      ['todo-list-priority-cleanup-method', 'Todo List Priority Cleanup Method', 'turn a messy task list into next actions', ['/tools/productivity/todo-list/', '/tools/productivity/notes/']],
      ['habit-tracker-monthly-reset-guide', 'Habit Tracker Monthly Reset Guide', 'review habits without turning data into guilt', ['/tools/productivity/habit-tracker/', '/tools/productivity/countdown-timer/']],
      ['countdown-launch-readiness-checklist', 'Countdown Launch Readiness Checklist', 'track deadlines before publishing or launch', ['/tools/productivity/countdown-timer/', '/tools/productivity/kanban-board/']],
      ['notes-to-action-items-workflow', 'Notes to Action Items Workflow', 'convert meeting notes into accountable tasks', ['/tools/productivity/notes/', '/tools/productivity/todo-list/']],
      ['expense-tracker-receipt-routine', 'Expense Tracker Receipt Routine for Freelancers', 'record expenses before receipts pile up', ['/tools/productivity/expense-tracker/', '/tools/pdf/merge/']],
      ['stopwatch-process-measurement-guide', 'Stopwatch Process Measurement Guide', 'measure repeated work before improving it', ['/tools/productivity/stopwatch/', '/tools/productivity/time-tracker/']],
      ['file-organizer-weekly-digital-cleanup', 'File Organizer Weekly Digital Cleanup Workflow', 'reduce clutter with a repeatable file routine', ['/tools/data/file-organizer/', '/tools/data/duplicate-finder/']]
    ]
  },
  education: {
    category: 'Education',
    audience: 'teachers, tutors, students, and training teams',
    outcome: 'clear learning materials with practical examples and review steps',
    tools: ['/tools/converters/unit-converter/', '/tools/converters/scientific-calculator/', '/tools/dev/json-formatter/', '/tools/text/palindrome-checker/', '/tools/design/mind-map-tool/', '/tools/design/diagram-maker/'],
    topics: [
      ['unit-converter-classroom-lab-workflow', 'Unit Converter Classroom Lab Workflow', 'teach conversions with visible assumptions', ['/tools/converters/unit-converter/', '/tools/converters/scientific-calculator/']],
      ['scientific-calculator-homework-check', 'Scientific Calculator Homework Check Workflow', 'review calculation steps before submitting work', ['/tools/converters/scientific-calculator/', '/tools/converters/percentage-calculator/']],
      ['json-formatter-teaching-api-basics', 'JSON Formatter Lesson for Teaching API Basics', 'make API response structure easier to understand', ['/tools/dev/json-formatter/', '/tools/dev/json-validator/']],
      ['number-base-converter-computer-science-lesson', 'Number Base Converter Computer Science Lesson', 'teach binary, decimal, and hexadecimal conversions', ['/tools/converters/number-base-converter/', '/tools/text/text-to-ascii/']],
      ['roman-numerals-history-math-activity', 'Roman Numerals History and Math Activity', 'connect historical notation to conversion practice', ['/tools/converters/roman-numerals/', '/tools/design/mind-map-tool/']],
      ['bmi-calculator-health-literacy-discussion', 'BMI Calculator Health Literacy Discussion Guide', 'discuss calculator limits and context responsibly', ['/tools/converters/bmi-calculator/', '/tools/text/text-summarizer/']],
      ['age-calculator-records-lesson', 'Age Calculator Records Lesson for Forms and Timelines', 'teach date differences with real form examples', ['/tools/converters/age-calculator/', '/tools/productivity/countdown-timer/']],
      ['mind-map-study-guide-workflow', 'Mind Map Study Guide Workflow', 'turn course notes into visible study structure', ['/tools/design/mind-map-tool/', '/tools/productivity/notes/']],
      ['diagram-maker-process-explanation-lesson', 'Diagram Maker Process Explanation Lesson', 'teach workflows with simple visual diagrams', ['/tools/design/diagram-maker/', '/tools/design/wireframe-tool/']],
      ['barcode-qr-code-classroom-activity', 'Barcode and QR Code Classroom Activity', 'explain codes with safe classroom examples', ['/tools/design/barcode-generator/', '/tools/design/qr-code-designer/']],
      ['weather-data-reading-classroom-workflow', 'Weather Data Reading Classroom Workflow', 'practice interpreting live-style data responsibly', ['/tools/data/weather-lookup/', '/tools/data/chart-builder/']],
      ['audio-spectrum-science-demo-outline', 'Audio Spectrum Science Demo Outline', 'teach sound frequency with visual inspection', ['/tools/data/audio-spectrum/', '/tools/design/diagram-maker/']]
    ]
  }
};

const requiredSectionIds = ['introduction', 'decision-points', 'step-by-step-workflow', 'failure-points', 'expected-outcome', 'faq-plan'];
const wordPlan = [
  ['introduction', 'Introduction and user intent', 180],
  ['decision-points', 'Entry decision points', 180],
  ['step-by-step-workflow', 'Step-by-step workflow', 380],
  ['failure-points', 'Common failure points and safeguards', 190],
  ['expected-outcome', 'Expected result and handoff checklist', 160],
  ['faq-plan', 'FAQ plan', 160]
];

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function titleCaseFromTool(pathname) {
  return pathname.split('/').filter(Boolean).at(-1).split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(' ');
}

function routeExists(href) {
  if (!href.startsWith('/')) return false;
  const clean = href.split('#')[0].split('?')[0].replace(/^\//, '');
  const candidates = [];
  if (clean.endsWith('/')) candidates.push(`${clean}index.html`);
  else if (path.extname(clean)) candidates.push(clean);
  else candidates.push(`${clean}.html`, `${clean}/index.html`);
  return candidates.some((candidate) => fs.existsSync(path.join(rootDir, candidate.startsWith('tools/') ? `src/${candidate}` : candidate)));
}

function buildArticle(topic, clusterKey, clusterConfig, index) {
  const [slug, title, userTaskIntent, relatedToolLinks] = topic;
  const primaryTool = relatedToolLinks[0] || clusterConfig.tools[0];
  const toolNames = relatedToolLinks.map(titleCaseFromTool);
  const targetWordCount = 1250;
  const summary = [
    `Clarify whether the user needs ${userTaskIntent} or a lighter preparation step before opening a tool.`,
    `Capture inputs, assumptions, and file states so the ${clusterConfig.category.toLowerCase()} workflow can be reviewed later.`,
    `Use ${toolNames.slice(0, 2).join(' and ')} as preparation aids, not as replacements for final judgment.`,
    `Close with a handoff checklist that explains what changed, what still needs review, and where the output should go next.`
  ];

  return {
    schemaVersion: 'blog-outline-v1',
    slug,
    title,
    excerpt: `${title} helps ${clusterConfig.audience} ${userTaskIntent} with decision points, repeatable steps, safeguards, and a clear handoff path.`,
    cluster: clusterKey,
    category: clusterConfig.category,
    searchIntent: {
      primary: 'task-completion',
      secondary: ['tool-selection', 'workflow-review', 'error-prevention'],
      userTaskIntent,
      toolIntent: `Use ${toolNames.join(', ')} when the inputs are ready and the output needs a browser-based preparation step.`
    },
    targetWordCount,
    wordCountPlan: Object.fromEntries(wordPlan.map(([id, , words]) => [id, words])),
    summary,
    outline: wordPlan.map(([id, heading, minWords]) => ({
      id,
      heading,
      minWords,
      purpose: sectionPurpose(id, userTaskIntent, clusterConfig.outcome),
      keyPoints: sectionPoints(id, userTaskIntent, toolNames, clusterConfig.outcome)
    })),
    faq: buildFaq(userTaskIntent, toolNames, clusterConfig.category),
    cta: {
      label: `Open ${titleCaseFromTool(primaryTool)}`,
      href: primaryTool,
      text: `Start with ${titleCaseFromTool(primaryTool)} after the inputs and review criteria are clear.`
    },
    relatedToolLinks,
    relatedArticleLinks: [],
    localizationNotes: {
      preserveToolNames: toolNames,
      avoidClaims: ['guaranteed savings', 'legal advice', 'tax advice', 'medical advice', 'instant ranking gains'],
      translationContext: `${clusterConfig.category} practical workflow for ${clusterConfig.audience}.`
    },
    editorialChecks: {
      minWordCount: 1000,
      requiresHumanReview: true,
      noKeywordStuffing: true,
      thinContentRisk: 'low when each section follows the planned decision, workflow, failure, outcome, and FAQ structure.'
    },
    priority: index + 1
  };
}

function sectionPurpose(id, task, outcome) {
  const map = {
    introduction: `Frame the real user task: ${task}, including who needs the output and why it matters.`,
    'decision-points': 'Help the reader decide whether to use a tool now, prepare inputs first, or choose a different workflow.',
    'step-by-step-workflow': 'Give a practical sequence from input preparation through tool use, review, and handoff.',
    'failure-points': 'Identify common mistakes, missing context, unsafe assumptions, and quality checks before sharing.',
    'expected-outcome': `Define what a successful result looks like: ${outcome}.`,
    'faq-plan': 'Answer practical implementation questions without repeating marketing claims or overpromising.'
  };
  return map[id];
}

function sectionPoints(id, task, toolNames, outcome) {
  const primary = toolNames[0] || 'the related tool';
  const secondary = toolNames[1] || 'a supporting tool';
  const map = {
    introduction: [`Name the task in plain language: ${task}.`, 'Describe the reader, input type, and desired handoff.', 'Set boundaries around what the tool can and cannot decide.'],
    'decision-points': ['List the inputs that must exist before starting.', `Explain when ${primary} is the right first step.`, `Explain when ${secondary} or a manual review should happen first.`],
    'step-by-step-workflow': ['Prepare source files or text before using a browser tool.', `Run the first pass with ${primary}.`, 'Review output against the original input.', 'Save or share the result with assumptions and next actions.'],
    'failure-points': ['Watch for copied template text, stale numbers, hidden metadata, missing pages, or malformed data.', 'Avoid presenting estimates as final decisions.', 'Create a rollback copy before overwriting anything.'],
    'expected-outcome': [`Confirm the reader has ${outcome}.`, 'Document what changed and what remains unresolved.', 'Point to the next related article or tool only when it supports the task.'],
    'faq-plan': ['Include one tool-selection question.', 'Include one data-quality or file-quality question.', 'Include one privacy or review question.', 'Include one handoff or maintenance question.']
  };
  return map[id];
}

function buildFaq(task, toolNames, category) {
  const primary = toolNames[0] || 'the related tool';
  return [
    { question: `When should I use ${primary} for this workflow?`, answer: `Use ${primary} after the inputs are clear and you know what output is needed for ${task}.` },
    { question: 'What should I check before trusting the output?', answer: 'Compare the result with the original input, confirm assumptions, and look for missing pages, malformed data, or context that a browser tool cannot infer.' },
    { question: `Can this ${category.toLowerCase()} workflow replace professional review?`, answer: 'No. It is a preparation and review workflow. Legal, financial, medical, or compliance decisions still need qualified human review when applicable.' },
    { question: 'How should I hand off the final result?', answer: 'Include the source context, the tool used, the assumptions, unresolved questions, and the next person responsible for review.' }
  ];
}

function buildDataset() {
  const articles = [];
  Object.entries(clusters).forEach(([clusterKey, clusterConfig]) => {
    clusterConfig.topics.forEach((topic) => {
      articles.push(buildArticle(topic, clusterKey, clusterConfig, articles.length));
    });
  });

  const byCluster = articles.reduce((acc, article) => {
    (acc[article.cluster] ||= []).push(article);
    return acc;
  }, {});

  articles.forEach((article) => {
    const peers = byCluster[article.cluster].filter((peer) => peer.slug !== article.slug);
    const existing = [...existingArticleSlugs].filter((slug) => slug !== article.slug).slice(0, 2);
    article.relatedArticleLinks = [...peers.slice(0, 3).map((peer) => peer.slug), ...existing].slice(0, 5);
  });

  return {
    schemaVersion: 'blog-outline-v1',
    generatedBy: 'scripts/generate-blog-outlines.mjs',
    description: 'Structured 100-article outline and metadata backlog for future long-form static blog generation and localization.',
    articleCount: articles.length,
    clusterDistribution: Object.fromEntries(Object.entries(byCluster).map(([cluster, items]) => [cluster, items.length])),
    acceptanceCriteria: {
      targetArticleCount: 100,
      minimumTargetWordCount: 1000,
      requiredSections: requiredSectionIds,
      requiredMetadata: ['slug', 'title', 'excerpt', 'summary', 'category', 'faq', 'cta', 'relatedToolLinks', 'relatedArticleLinks']
    },
    articles
  };
}

function validateDataset(dataset) {
  const failures = [];
  const slugs = new Set();
  const titles = new Set();
  const articleSlugs = new Set(dataset.articles.map((article) => article.slug));

  if (dataset.articles.length !== 100) failures.push(`Expected 100 outlines, found ${dataset.articles.length}.`);

  for (const [cluster, count] of Object.entries(dataset.clusterDistribution)) {
    if (count < 12 || count > 13) failures.push(`Cluster ${cluster} must contain 12 or 13 outlines, found ${count}.`);
  }

  dataset.articles.forEach((article, index) => {
    const prefix = `${index + 1}/${article.slug || 'missing-slug'}`;
    if (!article.slug || slugify(article.slug) !== article.slug) failures.push(`${prefix}: invalid slug.`);
    if (slugs.has(article.slug)) failures.push(`${prefix}: duplicate slug.`);
    slugs.add(article.slug);
    if (!article.title || titles.has(article.title)) failures.push(`${prefix}: missing or duplicate title.`);
    titles.add(article.title);
    if (!article.excerpt || article.excerpt.length < 120) failures.push(`${prefix}: excerpt is too thin.`);
    if (!Array.isArray(article.summary) || article.summary.length < 4) failures.push(`${prefix}: summary must contain at least 4 bullets.`);
    if (!article.searchIntent?.userTaskIntent || !article.searchIntent?.toolIntent) failures.push(`${prefix}: missing user/tool intent.`);
    if (article.targetWordCount < 1000) failures.push(`${prefix}: targetWordCount must be at least 1000.`);
    const plannedWords = Object.values(article.wordCountPlan || {}).reduce((sum, value) => sum + Number(value || 0), 0);
    if (plannedWords < 1000) failures.push(`${prefix}: wordCountPlan totals ${plannedWords}, expected at least 1000.`);
    const sectionIds = new Set((article.outline || []).map((section) => section.id));
    requiredSectionIds.forEach((id) => {
      if (!sectionIds.has(id)) failures.push(`${prefix}: missing outline section ${id}.`);
    });
    if ((article.outline || []).some((section) => !Array.isArray(section.keyPoints) || section.keyPoints.length < 3)) failures.push(`${prefix}: every outline section needs at least 3 key points.`);
    if (!Array.isArray(article.faq) || article.faq.length < 4) failures.push(`${prefix}: FAQ must contain at least 4 entries.`);
    if (!article.cta?.href || !routeExists(article.cta.href)) failures.push(`${prefix}: CTA route is missing: ${article.cta?.href}`);
    if (!Array.isArray(article.relatedToolLinks) || article.relatedToolLinks.length < 2) failures.push(`${prefix}: needs at least 2 related tool links.`);
    (article.relatedToolLinks || []).forEach((href) => {
      if (!routeExists(href)) failures.push(`${prefix}: related tool route is missing: ${href}`);
    });
    if (!Array.isArray(article.relatedArticleLinks) || article.relatedArticleLinks.length < 3) failures.push(`${prefix}: needs at least 3 related article links.`);
    (article.relatedArticleLinks || []).forEach((slug) => {
      if (!articleSlugs.has(slug) && !existingArticleSlugs.has(slug)) failures.push(`${prefix}: related article slug is unknown: ${slug}`);
    });
  });

  return failures;
}

const dataset = buildDataset();
const failures = validateDataset(dataset);
if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exit(1);
}

const serialized = `${JSON.stringify(dataset, null, 2)}\n`;

if (mode === 'check') {
  const stale = outputFiles.filter((file) => !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== serialized);
  if (stale.length) {
    stale.forEach((file) => console.error(`FAIL: ${path.relative(rootDir, file)} is not up to date. Run npm run build:blog-outlines.`));
    process.exit(1);
  }
  console.log(`✅ Blog outline dataset is valid and up to date (${dataset.articleCount} outlines).`);
} else {
  outputFiles.forEach((file) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, serialized);
  });
  console.log(`✅ Generated ${dataset.articleCount} blog outlines across ${Object.keys(dataset.clusterDistribution).length} clusters.`);
}
