# SEO URL routing table

Production origin: `https://mc-novatools.com`.

| Surface | Canonical pattern | Examples | Notes |
| --- | --- | --- | --- |
| Static pages | `/`, `/*.html` | `/`, `/about-us.html`, `/contact.html`, `/privacy-policy.html`, `/terms-of-service.html`, `/disclaimer.html`, `/blog/index.html` | Static HTML pages are included in the XML sitemap static section. |
| Clean category pages | `/tools/[category]/` | `/tools/pdf/`, `/tools/image/`, `/tools/developer/`, `/tools/finance/` | These clean aliases are generated from the existing category hubs during post-build so they return static HTML 200 responses. |
| Legacy category hubs | `/categories/[category-name].html` | `/categories/pdf-tools.html`, `/categories/developer-tools.html` | Preserved for backward compatibility and internal route stability. |
| Tool landing pages | `/tools/[category]/[tool-name]/` | `/tools/pdf/pdf-to-word/`, `/tools/image/compress/`, `/tools/dev/json-formatter/`, `/tools/finance/compound-interest/` | Kebab-case paths, no underscores. Existing `dev` category is preserved; clean `/tools/developer/` is a category alias only. |
| Blog index | `/blog/index.html` | `/blog/index.html` | Blog hub route. |
| Blog posts | `/blog/articles/[slug].html` | `/blog/articles/pdf-to-word-when-to-convert-and-when-not-to.html` | Existing `/blog/[slug].html` legacy article routes remain buildable for compatibility. |
| Author pages | `/author/[name]/` | `/author/editorial/`, `/author/metehan/` | Author profile pages are included in the XML sitemap author section. |
| Localized alternates | `/en/[path]`, `/tr/[path]` | `/en/tools/pdf/pdf-to-word/`, `/tr/tools/pdf/pdf-to-word/` | Canonical tags are self-referencing for the current path; `x-default` points to the unprefixed route. |

## Pagination policy

Current public category and blog surfaces are not paginated. If pagination is added later:

- Use `rel="next"` and `rel="prev"` for substantial paginated result sets.
- If page 2+ is thin or duplicative, keep canonical pointing at page 1 and avoid indexing low-value pages.
- Do not put query-parameter tool state URLs in the sitemap; use hash routing for client-side tool state.
