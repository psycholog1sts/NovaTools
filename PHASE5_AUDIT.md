# PHASE 5 Audit - Structured Data, Social Metadata, and Sitemap Coverage

Scope implemented:
- src/components/Analytics.mjs now centralizes Phase 5 JSON-LD generation through generateSchemaJsonLd(pageType, pageData, route).
- public legal/trust HTML templates now include Phase 5 JSON-LD and complete Open Graph/Twitter image metadata.
- scripts/generate-localized-sitemap.mjs now emits W3C datetime lastmod values and the requested priority tiers for home, tools, categories/blog, and legal/trust pages.

Schema types implemented:
- home: WebSite with SearchAction targeting https://mc-novatools.com/search?q={search_term_string}.
- tool: SoftwareApplication with name, description, applicationCategory, Web Browser operatingSystem, free USD Offer, aggregateRating, and Organization author.
- category: ItemList with ListItem entries collected from category tool links.
- blog: Article with headline, author, datePublished, dateModified, publisher, image, description, and canonical URL.
- about: AboutPage plus Organization graph with logo, sameAs, and contactPoint.
- contact: ContactPage with Organization publisher and ContactPoint mainEntity.
- legal: WebPage with name, description, canonical URL, and Organization publisher.

Meta tags verified by implementation:
- canonical URL is absolute and normalized to https://mc-novatools.com.
- og:title mirrors the HTML title.
- og:description mirrors the page meta description and is capped under 200 characters.
- og:url mirrors the canonical URL.
- og:type is article for blog pages and website for non-blog pages.
- og:image is absolute: https://mc-novatools.com/og-image.svg.
- og:image:width is 1200.
- og:image:height is 630.
- og:site_name is MC NovaTools.
- og:locale is en_US by default and tr_TR for Turkish-prefixed routes.
- twitter:card is summary_large_image.
- twitter:title mirrors the HTML title.
- twitter:description mirrors the page meta description and is capped under 200 characters.
- twitter:image is absolute: https://mc-novatools.com/og-image.svg.

Sitemap coverage verified by implementation:
- Home priority: 1.0.
- Tool priority: 0.8.
- Category priority: 0.6.
- Blog priority: 0.6.
- Legal/trust priority: 0.4.
- Phase 3 pages included: about.html, about-us.html, contact.html, privacy-policy.html, terms-of-service.html, cookie-policy.html, disclaimer.html, security.html, Turkish legal/contact routes.
- lastmod values use new Date().toISOString(), which produces W3C datetime format.
- URLs are canonical and absolute under https://mc-novatools.com.

Google references:
- https://developers.google.com/search/docs/appearance/structured-data/intro
- https://developers.google.com/search/docs/appearance/structured-data/software-app
- https://developers.google.com/search/docs/appearance/sitemaps/build-sitemap
