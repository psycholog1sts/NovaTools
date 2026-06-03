# Google Search Console coverage and indexing workflow

Last updated: 2026-06-03

This repository supports the operational Google Search Console (GSC) workflow for `mc-novatools.com`, but it cannot complete GSC-only actions such as DNS verification, URL Inspection requests, Rich Results Test screenshots, GA4 linking, removals, or disavow submission. Those items must be performed by a verified site owner in Google's products and recorded with the templates below.

## Official operating references

- Search Console ownership verification: https://support.google.com/webmasters/answer/9008080
- Search Console owners, users, and permissions: https://support.google.com/webmasters/answer/7687615
- URL Inspection and request indexing: https://support.google.com/webmasters/answer/9012289
- Sitemap submission: https://support.google.com/webmasters/answer/7451001
- Google sitemap guidance: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Robots `noindex` guidance: https://developers.google.com/search/docs/crawling-indexing/block-indexing
- Canonicalization guidance: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Soft 404 guidance: https://developers.google.com/search/docs/crawling-indexing/http-network-errors
- Google-supported structured data gallery: https://developers.google.com/search/docs/appearance/structured-data/search-gallery
- Article structured data recommendations: https://developers.google.com/search/docs/appearance/structured-data/article
- Rich Results Test: https://search.google.com/test/rich-results
- Schema Markup Validator: https://validator.schema.org

## Repository-generated sitemap endpoints

Run this whenever public routes, blog articles, or tool pages change:

```bash
npm run build:sitemap
npm run lint:site-links
```

The build-time sitemap generator writes all sitemap files to both the repository root and `public/` so they deploy as static assets:

| Endpoint | Purpose | Source of URLs |
| --- | --- | --- |
| `https://mc-novatools.com/sitemap.xml` | Full site sitemap and backward-compatible primary sitemap. | Static pages, pillar/category pages, tools, blog archives, blog posts, author pages. |
| `https://mc-novatools.com/sitemap-blog.xml` | Blog-focused sitemap variant for GSC monitoring. | Blog category archives, blog posts, author pages. |
| `https://mc-novatools.com/sitemap-tools.xml` | Tool-focused sitemap variant for GSC monitoring. | Tool pillar/category pages and individual tool pages. |

`robots.txt` advertises all three sitemap endpoints. Submit all three in GSC after deployment.

## Task 9.1 — GSC property setup checklist

Use `docs/templates/gsc-setup-checklist.md` for the sign-off record and screenshots.

1. Add a **Domain property** for `mc-novatools.com`.
   - Preferred verification: DNS TXT record.
   - Keep the TXT record active permanently unless ownership is transferred intentionally.
2. Add a **URL-prefix property** for `https://mc-novatools.com/`.
   - Preferred verification: inherited Domain verification or the same DNS method.
   - Fallback only if DNS is blocked: HTML verification file supplied by GSC. Do not invent the filename or token; only deploy the exact file from GSC.
3. Submit sitemap variants in both properties where GSC accepts them:
   - `/sitemap.xml`
   - `/sitemap-blog.xml`
   - `/sitemap-tools.xml`
4. Add team members in **Settings → Users and permissions**.
   - Use **Owner** for people accountable for verification, removals, user management, and fix validation.
   - Use **Full user** for people who need inspections, reports, and most operational actions without ownership control.
   - Avoid broad owner access for users who only need reporting.
5. Screenshot evidence to capture:
   - Domain property verified screen.
   - URL-prefix property verified screen.
   - Each submitted sitemap showing success or discovered URLs.
   - Users and permissions table with emails redacted if needed.

## Task 9.2 — Indexing requests

Use `docs/templates/gsc-indexing-status.csv` as the working spreadsheet.

### Priority URL queue

#### Homepage

- `https://mc-novatools.com/`

#### 4 pillar pages

- `https://mc-novatools.com/tools/pdf/`
- `https://mc-novatools.com/tools/image/`
- `https://mc-novatools.com/tools/developer/`
- `https://mc-novatools.com/tools/finance/`

#### 10 priority tool pages

These are selected from the current generated tool sitemap with a mix of PDF, image, developer, finance, security, and data workflows:

- `https://mc-novatools.com/tools/pdf/pdf-to-word/`
- `https://mc-novatools.com/tools/pdf/pdf-to-text/`
- `https://mc-novatools.com/tools/pdf/compress/`
- `https://mc-novatools.com/tools/image/background-remover/`
- `https://mc-novatools.com/tools/image/image-resizer/`
- `https://mc-novatools.com/tools/dev/json-formatter/`
- `https://mc-novatools.com/tools/security/jwt-decoder/`
- `https://mc-novatools.com/tools/security/password-generator/`
- `https://mc-novatools.com/tools/finance/compound-interest/`
- `https://mc-novatools.com/tools/finance/mortgage-refinance/`

#### 5 latest blog posts

These are the latest English blog posts in `src/i18n/blog/en.json` as of 2026-06-03:

- `https://mc-novatools.com/blog/articles/browser-based-tools-vs-desktop-software-privacy-comparison.html`
- `https://mc-novatools.com/blog/articles/edit-pdf-without-adobe-acrobat-free-methods.html`
- `https://mc-novatools.com/blog/articles/lazy-loading-images-implementation-guide-2026.html`
- `https://mc-novatools.com/blog/articles/rule-of-72-estimate-investment-doubling-time.html`
- `https://mc-novatools.com/blog/articles/understanding-json-web-tokens-structure-security.html`

### URL Inspection procedure

For each URL:

1. Open the correct `https://mc-novatools.com/` URL-prefix property.
2. Paste the full URL into the URL Inspection search bar.
3. Record the current GSC verdict exactly:
   - `Indexed`
   - `Not Indexed`
   - `Crawled - Currently Not Indexed`
   - `Discovered - Currently Not Indexed`
   - Other exact GSC label if shown.
4. If GSC says the URL is not on Google, click **Request indexing** only after the live test confirms the URL is indexable.
5. Record action taken and set a 24-hour recheck date.
6. Recheck after 24 hours; continue monitoring weekly for at least 14 days before AdSense reapplication.

## Task 9.3 — Coverage issue remediation playbook

Use `docs/templates/gsc-coverage-remediation-log.csv` for evidence.

| GSC issue | Repository check | Fix policy |
| --- | --- | --- |
| Excluded by `noindex` tag | Run `rg -n "noindex" --glob '!node_modules/**' --glob '!dist/**' .` and inspect every match. | Keep `noindex` only for intentional non-public routes such as `404.html`, admin pages, or unavailable localized content. Remove accidental `noindex` from valuable public pages. |
| Duplicate without user-selected canonical | Build the site and inspect the rendered canonical. | Every indexed route must render a self-referencing canonical without query strings. Parameterized URLs such as `?theme=dark` should canonicalize to the clean route. |
| Soft 404 | Check pages flagged by GSC and confirm production HTTP status. | True missing content should return 404 or redirect to a relevant replacement. Do not leave a “not found” message on an HTTP 200 page. |
| Page with redirect | Check production redirect chains with `curl -I -L`. | Keep redirects direct, update internal links to final URLs, and avoid chains longer than one necessary hop. |
| Crawled - Currently not indexed | Review content depth, uniqueness, canonical, internal links, and structured data. | Improve useful content and link from indexed hub/pillar pages. Do not add thin or duplicated SEO copy. |
| Discovered - Currently not indexed | Review sitemap inclusion, internal links, and crawl priority. | Add contextual internal links from relevant indexed pages and ensure the page is in the correct sitemap variant. |

## Task 9.4 — Structured data testing

Use `docs/templates/rich-results-test-report.csv`.

1. Run repository validation first:

   ```bash
   npm run build
   npm run validate:structured-data
   ```

2. Test representative page types manually in both tools:
   - Homepage.
   - Tool page.
   - Tool category/pillar page.
   - Blog article.
   - Blog archive.
   - Author page.
   - About/contact/legal page.
3. Fix all red errors.
4. Review yellow warnings. Fix warnings when the field is truthful and available. Do not fabricate `author`, `image`, dates, ratings, reviews, or organization facts.
5. Common fields to verify for article-like pages:
   - `author` with name and stable URL when available.
   - `image` that is crawlable, representative, and not a fake article image.
   - `datePublished` and `dateModified` in ISO 8601 format.

## Task 9.5 — Removals and disavow

Use removals and disavow only when there is confirmed evidence.

- For old spammy pages that still appear in Google:
  1. Use GSC Removals for temporary hiding.
  2. Deploy the permanent fix: 404/410 for deleted pages, or `noindex` for intentionally accessible but non-indexable pages.
  3. Record the URL, reason, temporary removal date, and permanent fix in the remediation log.
- For toxic backlinks:
  1. Export backlink evidence from GSC and any approved backlink audit tool.
  2. Only create `disavow.txt` for links/domains that are clearly manipulative and cannot be removed.
  3. Keep the file out of the public site unless intentionally uploading to Google's disavow tool; do not add speculative domains.

## Task 9.6 — Performance monitoring

Use `docs/templates/gsc-weekly-monitoring-template.md`.

Weekly metrics to record:

- Clicks.
- Impressions.
- CTR.
- Average position.
- Indexed pages trend.
- New `Not indexed` reasons.
- Sitemap discovered URL counts.
- Branded query performance:
  - `mc novatools`
  - `mc-novatools pdf converter`

GA4 linking must be completed in Google products by an account with the required permissions. Do not add GA4 secrets or private configuration to this repository.

## Task 9.7 — Pre-reapplication indexing verification

Use `docs/templates/adsense-indexing-verification-checklist.md`.

Before AdSense reapplication, confirm these groups are indexed in GSC and document the check date:

- Homepage.
- About Us.
- Contact.
- Privacy Policy.
- Terms of Service.
- Disclaimer.
- 4 pillar guide/category pages.
- 10 priority tool pages.
- 5 latest blog posts.

Wait at least 14 days after deploying coverage fixes and sitemap updates before reapplying.

## Google Indexing API helper note

The repository includes `indexing.cjs` for controlled URL notification batches based on `site-links.txt`, but Google's Indexing API is officially scoped to JobPosting pages and livestream pages with BroadcastEvent inside VideoObject structured data. For this general utility website, GSC sitemap submission and URL Inspection are the primary workflows. Use the API helper only if the site owner accepts Google's product-scope limitation and any quota/API errors returned by Google.
