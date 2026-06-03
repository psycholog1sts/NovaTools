# Structured Data Implementation Guide

MC NovaTools structured data is generated as a build artifact so the public HTML output has one consistent Schema.org graph per page type while source pages keep their existing route structure.

## Page templates

The reusable JSON-LD builders live in `src/seo/structured-data-templates.mjs`:

- `buildHomeSchema()` creates the canonical `WebSite`, `Organization`, home `WebPage`, and site-level `SoftwareApplication` graph.
- `buildToolPageSchema()` creates a combined tool graph with `WebPage`, `SoftwareApplication`, `FAQPage`, and `HowTo` nodes.
- `buildBlogPostSchema()` creates `WebPage` + `TechArticle` for article routes.
- `buildCategoryPageSchema()` creates `CollectionPage` + `ItemList` for category hubs.
- `buildAuthorPageSchema()` creates `ProfilePage` + `Person` for named author pages.
- `buildEditorialAuthorPageSchema()` creates `ProfilePage` + editorial `Organization` for editorial-profile pages.

## Graph consistency rules

- The canonical organization ID is `https://mc-novatools.com/#organization`.
- The canonical website ID is `https://mc-novatools.com/#website`.
- Non-home pages reference those IDs instead of redefining `Organization` or `WebSite`.
- Page nodes use canonical URL fragments such as `#webpage`, tool software nodes use `#software`, FAQ nodes use `#faq`, HowTo nodes use `#howto`, and article nodes use `#article`.
- Rating and review markup is intentionally omitted because no verified rating/review UI is visible across every generated tool page.
- `sameAs` is intentionally omitted from generated graphs until social profiles are verified and stable.
- `dateModified` is set by the build-time schema injection step using `NOVATOOLS_SCHEMA_DATE` when provided, otherwise the current UTC build date.

## Build-time injection workflow

`npm run build` now runs:

1. Vite multi-page build.
2. Existing post-build path fixes.
3. `npm run build:structured-data`.
4. `scripts/inject-structured-data.mjs` removes existing JSON-LD scripts from built HTML and injects one generated graph for supported page types.
5. `npm run validate:structured-data` validates generated graphs in `dist/` and writes `docs/structured-data-validation.md`.

This keeps dynamic schema generation isolated from source route files and avoids broad rewrites of the static HTML pages.

## Template data sources

- Tool pages use `src/tools/**/meta.json` for stable tool name, description, category, keywords, version, and client-side processing hints.
- Blog posts use built HTML metadata: canonical URL, description, `<h1>`, `<time datetime>`, visible article text word count, first image/Open Graph image, and visible section tag.
- Category pages use built HTML metadata plus visible `/tools/.../` links to build `ItemList` entries.
- Author pages use canonical URL, `<h1>`, meta description, and Open Graph image where present.
- Home pages use existing home metadata plus centralized site identity constants.

## Validation

Run after a build:

```bash
npm run validate:structured-data
```

The validator checks:

- JSON-LD syntax in built HTML.
- Unique `@id` collection.
- Local `@id` references resolve somewhere in the built site graph.
- Page-type nodes use fragment IDs.
- Shared `Organization` and `WebSite` definitions stay centralized.

## Google Rich Results Test screenshots

Google Rich Results Test screenshots are not generated automatically by this repository because the test requires either public deployed URLs or manual code submission in Google's external UI. After deployment, manually test one representative URL for each template type:

- Home: `https://mc-novatools.com/`
- Tool: `https://mc-novatools.com/tools/pdf/pdf-to-word/`
- Blog post: `https://mc-novatools.com/blog/articles/compress-images-for-web-quality-checklist.html`
- Category: `https://mc-novatools.com/categories/pdf-tools.html`
- Author: `https://mc-novatools.com/author/metehan-cetin.html`

Save screenshots from the Google Rich Results Test UI into the project documentation or release evidence folder used by the deployment workflow.
