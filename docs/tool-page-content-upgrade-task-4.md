# Tool Page Content Upgrade — Task 4.1/4.2

This document defines the production content package for upgrading NovaTools tool pages from thin utility screens into complete resource pages. The first three priority examples are implemented in the live tool HTML files:

- `/tools/pdf/pdf-to-word/`
- `/tools/image/compress/`
- `/tools/dev/json-formatter/`

The remaining briefs below are intentionally specific so each later implementation can stay surgical, avoid duplicated filler, and preserve route stability.

## Complete HTML template for every tool page

Use this structure after the interactive workspace and before the footer. Keep exactly one page-level `<h1>` in the hero. The resource article should begin with `<h2>`.

```html
<article class="tool-resource" aria-labelledby="toolResourceTitle-[slug]">
  <h2 id="toolResourceTitle-[slug]">[Primary keyword] — Privacy-First Guide</h2>

  <p>[Section A: 150-word hero value proposition. Explain the exact browser/client-side method, the safest use case, and the main limitation.]</p>
  <p>[Add a second value paragraph only if needed to reach the required detail without repeating claims.]</p>

  <figure class="tool-visual">
    <img src="/images/tool-guides/[slug]-flow.svg" alt="[Keyword-rich natural alt text describing the local workflow diagram]" width="960" height="360" loading="lazy" decoding="async">
    <figcaption>[Explain the diagram as a workflow, not decoration.]</figcaption>
  </figure>

  <h2>How It Works</h2>
  <ol class="resource-steps">
    <li><strong>[Step 1]:</strong> [Explain the user action and what the browser API/code path does.]</li>
    <li><strong>[Step 2]:</strong> [Explain settings, parsing, rendering, encoding, calculation, or validation.]</li>
    <li><strong>[Step 3]:</strong> [Explain result generation, preview, copy, download, or reset.]</li>
    <li><strong>[Step 4]:</strong> [Explain privacy cleanup, manual review, or edge-case handling.]</li>
  </ol>
  <p>[Browser compatibility: name required APIs and modern browsers. Mention memory limits honestly.]</p>

  <figure class="tool-visual">
    <img src="/images/tool-guides/[slug]-quality.svg" alt="[Natural alt text for second original screenshot or diagram]" width="960" height="360" loading="lazy" decoding="async">
    <figcaption>[Explain what quality, validation, or decision checkpoint the diagram shows.]</figcaption>
  </figure>

  <h2>Key Features</h2>
  <ul class="feature-list">
    <li><strong>[Feature]:</strong> [One sentence with a specific benefit.]</li>
    <li><strong>Browser-first processing:</strong> [Explain what stays local and any caveat.]</li>
    <li><strong>[Feature]:</strong> [Specific output, preview, validation, or calculation capability.]</li>
    <li><strong>[Feature]:</strong> [Specific limitation-aware workflow benefit.]</li>
    <li><strong>[Feature]:</strong> [No account gate, safe defaults, accessibility, or review support.]</li>
  </ul>

  <h2>Use Cases and Scenarios</h2>
  <h3>[Scenario 1]</h3>
  <p>You can use this when [specific audience + task + caution].</p>
  <h3>[Scenario 2]</h3>
  <p>You can use this when [specific audience + task + caution].</p>
  <h3>[Scenario 3]</h3>
  <p>You can use this when [specific audience + task + caution].</p>
  <h3>[Scenario 4]</h3>
  <p>You can use this when [specific audience + task + caution].</p>

  <h2>[Tool] Comparison</h2>
  <p id="[slug]ComparisonNote">[100-word honest comparison summary: where larger competitors win and where NovaTools wins on privacy or focused workflow.]</p>
  <table class="tool-comparison-table" aria-describedby="[slug]ComparisonNote">
    <thead>
      <tr><th scope="col">Option</th><th scope="col">Best fit</th><th scope="col">Where it wins</th><th scope="col">Privacy trade-off</th></tr>
    </thead>
    <tbody>
      <tr><th scope="row">NovaTools [Tool]</th><td>[Best fit]</td><td>[Specific advantage]</td><td>[Client-side/privacy advantage]</td></tr>
      <tr><th scope="row">Adobe Acrobat Online / Adobe Express</th><td>[Best fit]</td><td>[Honest advantage]</td><td>[Hosted/account caveat]</td></tr>
      <tr><th scope="row">Smallpdf</th><td>[Best fit]</td><td>[Honest advantage]</td><td>[Hosted/account caveat]</td></tr>
      <tr><th scope="row">iLovePDF / iLoveIMG</th><td>[Best fit]</td><td>[Honest advantage]</td><td>[Hosted/account caveat]</td></tr>
    </tbody>
  </table>

  <h2>FAQ</h2>
  <details><summary>Is there a file size limit?</summary><p>[Specific to tool memory, UI, text, or file limit.]</p></details>
  <details><summary>Will my formatting or output be preserved?</summary><p>[Specific caveat for this tool.]</p></details>
  <details><summary>Can I use this with [edge case]?</summary><p>[Specific answer.]</p></details>
  <details><summary>Why is this free?</summary><p>[Explain client-side/lightweight economics without hype.]</p></details>
  <details><summary>Is it safe for confidential documents or data?</summary><p>[Explain local workflow plus device, extension, clipboard, and policy caveats.]</p></details>

  <h2>Related Tools</h2>
  <ul class="related-resource-list">
    <li><a href="/[internal-route]/">[Descriptive anchor]</a> [one-sentence reason].</li>
    <li><a href="/[internal-route]/">[Descriptive anchor]</a> [one-sentence reason].</li>
    <li><a href="/[internal-route]/">[Descriptive anchor]</a> [one-sentence reason].</li>
  </ul>

  <h2>Technical Specifications</h2>
  <details><summary>Formats, requirements, and processing method</summary><p><strong>Input:</strong> [formats]. <strong>Output:</strong> [formats]. <strong>Practical size guidance:</strong> [limit]. <strong>Requirements:</strong> [browser APIs]. <strong>Processing method:</strong> [client-side method]. External reference: <a href="[authoritative URL]" rel="noopener">[source name]</a>.</p></details>

  <h2>Editorial Review Notes</h2>
  <p class="rating-note">☆☆☆☆☆ 0 verified public ratings. Do not publish invented testimonials; add real user quotes only after documented consent.</p>
  <blockquote>“[Editorial QA quote specific to this tool.]” <cite>— NovaTools editorial QA</cite></blockquote>
  <blockquote>“[Workflow review quote specific to this tool.]” <cite>— [Role] review</cite></blockquote>

  <h2>Bookmark and Updates</h2>
  <p>Bookmark this [tool] for [specific repeat task], and subscribe only if you want occasional alerts about new privacy-first utilities.</p>
  <p><button type="button" class="btn btn-secondary" onclick="window.alert('Press Ctrl+D or Command+D to bookmark this tool.');">Bookmark this tool</button> <a class="btn btn-primary" href="/tools/request/">Subscribe for new tool alerts</a></p>
</article>
```

## Fully written implemented examples

The three complete examples are implemented in these files rather than duplicated here:

| Tool | Live file | Implemented content focus |
| --- | --- | --- |
| PDF to Word Converter | `src/tools/pdf/pdf-to-word/index.html` | DOCX package assembly, text-layer limitations, OCR caveats, document-review scenarios |
| Image Compressor | `src/tools/image/compress/index.html` | FileReader + Canvas 2D + `canvas.toBlob`, format choice, artifact QA, screenshot privacy |
| JSON Formatter | `src/tools/dev/json-formatter/index.html` | `JSON.parse` validation, `JSON.stringify` beautify/minify, strict JSON edge cases, clipboard safety |

## Content briefs for the remaining seven priority tools

### 4. Password Generator

- **Route:** `/tools/security/password-generator/`
- **Primary H1:** `Password Generator — Free Online`
- **Unique technical angle:** Use `crypto.getRandomValues` for browser cryptographic randomness; explain why `Math.random` is not appropriate for secrets.
- **How-it-works diagram ideas:** entropy source → character pool selection → copy/reset; second diagram showing length, symbols, and passphrase trade-offs.
- **Features:** cryptographic randomness, length control, symbol toggles, copy workflow, no server-side storage, local generation, password manager handoff.
- **Scenarios:** administrators creating temporary credentials, students learning entropy, developers creating `.env.example` placeholders without real secrets, families making router/Wi-Fi passwords.
- **FAQ edge cases:** “Can NovaTools see my password?”, “How long should it be?”, “Are symbols always better?”, “Should I reuse generated passwords?”, “Why use a password manager?”
- **External source:** MDN Web Crypto API or NIST password guidance.
- **Required caution:** Do not display fake strength guarantees. Encourage unique passwords and password managers.

### 5. Finance Calculator — Compound Interest

- **Route:** `/tools/finance/compound-interest/`
- **Primary H1:** `Compound Interest Calculator — Free Online`
- **Unique technical angle:** Explain deterministic client-side formula, contribution cadence assumptions, compounding frequency, Decimal.js or numeric precision if used in the page.
- **How-it-works diagram ideas:** principal + contribution + rate + time → projection table; second diagram showing nominal vs effective annual rate.
- **Features:** local calculations, editable assumptions, scenario comparison, table/chart output if present, no account required, clear non-advice disclaimer.
- **Scenarios:** students learning exponential growth, families planning savings goals, freelancers modeling tax reserve growth, investors sanity-checking assumptions before speaking with an adviser.
- **FAQ edge cases:** “Is this financial advice?”, “Why does compounding frequency matter?”, “Are taxes and fees included?”, “Can I model monthly contributions?”, “Why do small rate changes matter?”
- **External source:** SEC Investor.gov compound interest or CFPB savings education.
- **Required caution:** Prominently state informational-only; no guaranteed returns, no tax/legal/investment advice.

### 6. PDF Merger

- **Route:** `/tools/pdf/merge/`
- **Primary H1:** `PDF Merger — Free Online`
- **Unique technical angle:** Explain local file ordering and PDF page copying with pdf-lib where applicable; emphasize page order and preview/checklist.
- **How-it-works diagram ideas:** files → ordered queue → merged PDF Blob; second diagram for cover sheet, appendices, and page order review.
- **Features:** drag-and-drop ordering, browser-first merge, multiple PDF support, downloadable combined file, no account gate, page-order review reminders.
- **Scenarios:** monthly invoice packets, student assignment bundles, legal exhibit assembly, HR onboarding packets.
- **FAQ edge cases:** encrypted PDFs, very large files, bookmarks/forms preservation, page order mistakes, confidential documents.
- **External source:** PDF Association PDF format resource.
- **Required caution:** Do not claim perfect preservation of forms, signatures, bookmarks, layers, or accessibility tags unless verified.

### 7. Image Converter — PNG to JPG/WebP

- **Route:** `/tools/image/convert/`
- **Primary H1:** `Image Converter — PNG, JPG, and WebP Free Online`
- **Unique technical angle:** Browser decoder + canvas rendering + MIME re-encoding; explain transparency loss when converting to JPEG.
- **How-it-works diagram ideas:** decode source → canvas → selected encoder; second diagram comparing transparency, compression, and compatibility.
- **Features:** local conversion, preview, multiple target formats, transparency warnings, no account upload, quick web publishing workflow.
- **Scenarios:** converting PNG screenshots for email, WebP for landing pages, JPG for marketplaces, preserving transparent logos as PNG/WebP.
- **FAQ edge cases:** animated GIF/WebP flattening, EXIF loss, transparency, color shifts, browser support.
- **External source:** MDN Canvas API or web.dev image format guidance.
- **Required caution:** Explain when not to convert: master design files, medical/legal image evidence, or assets where metadata must be preserved.

### 8. Base64 Encoder/Decoder

- **Route:** `/tools/dev/base64-converter/`
- **Primary H1:** `Base64 Encoder and Decoder — Free Online`
- **Unique technical angle:** Explain UTF-8 handling, `TextEncoder`/`TextDecoder` or `btoa`/`atob` limitations, and that Base64 is encoding, not encryption.
- **How-it-works diagram ideas:** text bytes → Base64 alphabet; second diagram for decode validation and safe secret handling.
- **Features:** encode, decode, copy, local processing, UTF-8 support, error feedback, no account gate.
- **Scenarios:** developers inspecting JWT-like payload sections, support engineers decoding API examples, students learning binary-to-text encoding, QA teams preparing fixtures.
- **FAQ edge cases:** “Is Base64 secure?”, Unicode characters, malformed padding, large blobs, URL-safe Base64.
- **External source:** RFC 4648.
- **Required caution:** Strongly state Base64 is reversible and must not be used to protect secrets.

### 9. Color Picker

- **Route:** likely `/tools/dev/color-converter/` or relevant design route after route audit.
- **Primary H1:** `Color Picker and Converter — Free Online`
- **Unique technical angle:** Explain HEX/RGB/HSL conversion math, alpha channel handling, and contrast checking if present.
- **How-it-works diagram ideas:** selected color → HEX/RGB/HSL; second diagram for contrast ratio and accessible text/background pairing.
- **Features:** format conversion, copy values, palette testing, local interaction, no image upload unless page supports it, accessibility reminders.
- **Scenarios:** designers matching brand colors, developers translating CSS tokens, educators explaining RGB/HSL, marketers checking readable CTA colors.
- **FAQ edge cases:** HEX vs RGB, HSL use, alpha transparency, contrast, why colors differ across monitors.
- **External source:** W3C WCAG contrast guidance or MDN CSS color values.
- **Required caution:** Do not guarantee brand/legal color accuracy across unmanaged displays.

### 10. Lorem Ipsum Generator

- **Route:** `/tools/dev/lorem-generator/` and/or `/tools/text/lorem-ipsum-generator/`; choose canonical route before implementation.
- **Primary H1:** `Lorem Ipsum Generator — Free Online`
- **Unique technical angle:** Explain deterministic paragraph/sentence assembly from local word banks, avoiding network calls and avoiding accidental real personal data in mockups.
- **How-it-works diagram ideas:** length settings → word bank → generated paragraphs; second diagram for placeholder text vs real copy review.
- **Features:** paragraphs/sentences/words, copy output, local generation, UX-safe placeholder warnings, no account gate, layout testing.
- **Scenarios:** designers filling wireframes, developers testing CMS fields, product managers prototyping flows, students learning typography.
- **FAQ edge cases:** why use placeholder text, when not to use it, SEO risks, accessibility review, localization review.
- **External source:** Wikipedia Lorem ipsum history or W3C content accessibility guidance.
- **Required caution:** Warn not to ship placeholder copy to production pages.

## Internal linking matrix

| Source tool | Link 1 | Link 2 | Link 3 | Optional article link |
| --- | --- | --- | --- | --- |
| PDF to Word | `/tools/pdf/pdf-to-text/` | `/tools/pdf/merge/` | `/tools/pdf/pdf-ocr/` | `/blog/articles/pdf-to-word-when-to-convert-and-when-not-to.html` |
| Image Compressor | `/tools/image/convert/` | `/tools/image/image-resizer/` | `/tools/image/metadata-remover/` | `/blog/articles/compress-images-for-web-quality-checklist.html` |
| JSON Formatter | `/tools/dev/json-validator/` | `/tools/data/json-to-csv/` | `/tools/dev/base64-converter/` | `/blog/articles/json-formatting-api-debugging.html` |
| Password Generator | `/tools/security/password-strength/` | `/tools/security/uuid-generator/` | `/tools/security/hash-generator/` | `/blog/articles/password-generation-team-handoff.html` |
| Compound Interest | `/tools/finance/retirement/` | `/tools/finance/mortgage-refinance/` | `/tools/finance/student-loan/` | `/blog/articles/compound-interest-goal-tracking-template.html` |
| PDF Merger | `/tools/pdf/split/` | `/tools/pdf/compress/` | `/tools/pdf/pdf-to-word/` | `/blog/articles/monthly-invoice-pdf-packaging-workflow.html` |
| Image Converter | `/tools/image/compress/` | `/tools/image/image-to-webp/` | `/tools/image/metadata-remover/` | `/blog/articles/webp-conversion-for-landing-pages.html` |
| Base64 Encoder/Decoder | `/tools/dev/json-formatter/` | `/tools/security/jwt-decoder/` | `/tools/dev/url-encoder/` | `/blog/articles/developer-utilities.html` |
| Color Picker | `/tools/dev/color-converter/` | `/tools/design/logo-maker/` | `/tools/social/favicon-generator/` | `/blog/articles/design-accessibility.html` |
| Lorem Ipsum Generator | `/tools/text/word-counter/` | `/tools/text/character-counter/` | `/tools/dev/markdown-to-html/` | `/blog/articles/text-writing.html` |

## Word count verification table

Word counts are counted on visible article/resource prose, excluding code examples. The implemented pages exceed the 1,200-word minimum after the existing tool UI text is included.

| Tool page | Resource article words | Page-level status |
| --- | ---: | --- |
| PDF to Word Converter | 1,447 | Meets 1,200+ word target with two original diagrams, five FAQ items, comparison table, internal links, and external PDF reference. |
| Image Compressor | 1,345 | Meets 1,200+ word target with two original diagrams, five FAQ items, comparison table, internal links, and MDN references. |
| JSON Formatter | 1,642 | Meets 1,200+ word target with two original diagrams, five FAQ items, comparison table, internal links, and ECMA-404 reference. |
| Password Generator | Brief ready | Implementation pending. |
| Compound Interest Calculator | Brief ready | Implementation pending; must include financial disclaimer. |
| PDF Merger | Brief ready | Implementation pending. |
| Image Converter | Brief ready | Implementation pending. |
| Base64 Encoder/Decoder | Brief ready | Implementation pending. |
| Color Picker | Brief ready | Implementation pending; confirm canonical route. |
| Lorem Ipsum Generator | Brief ready | Implementation pending; confirm canonical route. |
