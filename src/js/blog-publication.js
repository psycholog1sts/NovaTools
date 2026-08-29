/**
 * Blog publication record.
 *
 * Part of the article corpus was produced from a template, so the same
 * paragraphs appear verbatim across dozens of posts. Those pages are scaled
 * near-duplicate content and are withheld from the build, the sitemap, the
 * feed and every internal listing rather than shipped as thin pages.
 *
 * The record is generated and enforced by scripts/audit-blog-originality.mjs,
 * which measures the duplication rather than trusting a hand-maintained list.
 */
import record from '../data/blog-publication.json' with { type: 'json' };

const PUBLISHED = new Set(
  record.articles.filter((article) => article.status === 'PUBLISHED').map((article) => article.slug)
);

const WITHHELD = new Map(
  record.articles
    .filter((article) => article.status !== 'PUBLISHED')
    .map((article) => [article.slug, article])
);

export function isPublishedBlogSlug(slug) {
  return PUBLISHED.has(String(slug || '').trim());
}

export function withheldBlogReason(slug) {
  return WITHHELD.get(String(slug || '').trim())?.reason || null;
}

export function publishedBlogSlugs() {
  return [...PUBLISHED].sort();
}

export function withheldBlogSlugs() {
  return [...WITHHELD.keys()].sort();
}

export function blogPublicationRecord() {
  return record;
}
