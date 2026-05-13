# Google Search Console sitemap and Indexing API workflow

This project is a static, privacy-first Vite site. There is no production database or server route that can generate `/sitemap.xml` at request time. Instead, the repository keeps the sitemap dynamic at build time: every build regenerates `sitemap.xml`, `public/sitemap.xml`, and `site-links.txt` from the current route files and blog manifests.

## Method 1: Sitemap submission in Google Search Console

Use this as the primary, policy-aligned indexing workflow.

1. Build or update the sitemap locally:

   ```bash
   npm run build:sitemap
   npm run lint:site-links
   ```

2. Commit the regenerated files when routes change:

   ```bash
   git add sitemap.xml public/sitemap.xml site-links.txt
   git commit -m "Update sitemap and site link export"
   ```

3. Deploy the site so the public sitemap is available at:

   ```text
   https://mc-novatools.com/sitemap.xml
   ```

4. In Google Search Console, open the `mc-novatools.com` property, go to **Sitemaps**, and submit only:

   ```text
   sitemap.xml
   ```

5. Keep `robots.txt` pointing to the same sitemap URL. The current file already advertises:

   ```text
   Sitemap: https://mc-novatools.com/sitemap.xml
   ```

After this one-time submission, Google can periodically recrawl the sitemap. New pages should be added to the generated sitemap instead of being pasted into Search Console one by one.

## Method 2: Google Indexing API helper

The repository includes `indexing.cjs` for controlled URL notification batches based on `site-links.txt`.

> Important policy note: Google's official Indexing API documentation says the API is for `JobPosting` pages and livestream pages with `BroadcastEvent` inside `VideoObject` structured data. For a general utility-tools website, sitemap submission should remain the main discovery mechanism. Use the Indexing API helper only when you intentionally accept that product-scope limitation and any quota/API errors Google returns.

### Required Google setup

1. In Google Cloud Console, enable the **Indexing API** for your project.
2. Create a service account.
3. Download the service-account JSON key. Do not commit it.
4. Copy the service account email address.
5. In Google Search Console, add that service-account email as a user on the verified `mc-novatools.com` property. Use owner/full access only if your process requires it.
6. Store the full JSON key in GitHub Actions as a repository secret named:

   ```text
   GOOGLE_INDEXING_KEY
   ```

### Local dry run

```bash
npm run indexing:dry-run -- --input=site-links.txt --limit=10
```

### Local send

Use either an environment variable containing the full JSON string:

```bash
GOOGLE_INDEXING_KEY='{"type":"service_account",...}' npm run indexing:send -- --input=site-links.txt --limit=200 --offset=0
```

Or a local file path that is never committed:

```bash
GOOGLE_INDEXING_KEY_FILE=/secure/path/service-account.json npm run indexing:send -- --input=site-links.txt --limit=200 --offset=0
```

### GitHub Actions send

1. Open **Actions** → **Sitemap and Google Indexing**.
2. Click **Run workflow**.
3. Set `send_to_google` to `true`.
4. Keep `limit` within your current Google quota.
5. Increase `offset` for the next chunk. Examples:
   - `limit=200`, `offset=0`
   - `limit=200`, `offset=200`
   - `limit=200`, `offset=400`

The workflow always validates that `site-links.txt` exactly matches `sitemap.xml` before any optional Indexing API submission.

## Operational rules

- Never commit service-account JSON keys, `.env` files, OAuth tokens, or Google credentials.
- Do not rotate through multiple service accounts to bypass Google limits.
- Prefer sitemap submission for all standard pages.
- Use `site-links.txt` for audits, exports, and controlled API chunks; regenerate it with `npm run build:sitemap` whenever routes change.
- If Google returns quota, permission, or unsupported-use errors, stop and resolve the Search Console/API configuration instead of retrying aggressively.

## Official references

- Google Search Central: Build and submit a sitemap — https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Search Console Help: Manage your sitemaps using the Sitemaps report — https://support.google.com/webmasters/answer/7451001
- Google Search Central: Indexing API quickstart — https://developers.google.com/search/apis/indexing-api/v3/quickstart
- Google Search Central: How to use the Indexing API — https://developers.google.com/search/apis/indexing-api/v3/using-api
