# MC NovaTools E-E-A-T Trust Page Checklist

Last verified in source: 2026-06-03

## Mandatory trust pages

- [x] `/about-us` and `/about-us.html` render the MC NovaTools story, mission, team/reviewer cards, browser-first architecture, and author credentials.
- [x] `/contact` and `/contact.html` render a browser-validated mailto contact form, support email, remote-first address note, official social links, response-time promise, and privacy guidance.
- [x] `/privacy-policy` and `/privacy-policy.html` explain browser-side processing, localStorage, cookies, Google AdSense, Google Analytics, retention, GDPR/CCPA rights, and Google privacy resources.
- [x] `/terms-of-service` and `/terms-of-service.html` explain acceptable use, output responsibility, prohibited uses, intellectual property, liability limits, and governing-law language.
- [x] `/disclaimer` and `/disclaimer.html` explain tool accuracy limits, finance calculator warnings, third-party links, advertising, affiliate disclosure, and no-professional-advice limits.

## Author entity pages

- [x] `/author/metehan-cetin` and `/author/metehan-cetin.html` include visible biography, avatar, areas of expertise, and Person schema.
- [x] `/author/novatools-editorial` and `/author/novatools-editorial.html` include visible editorial review scope and Person schema.

## Global structured data

Every built HTML page receives the Organization + WebSite graph root through `applySeoHead()`.

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://mc-novatools.com/#organization",
      "name": "MC NovaTools",
      "url": "https://mc-novatools.com",
      "logo": {
        "@type": "ImageObject",
        "url": "https://mc-novatools.com/logo-brand-520.png",
        "width": 512,
        "height": 512
      },
      "sameAs": [
        "https://github.com/mc-novatools",
        "https://twitter.com/mcnovatools",
        "https://linkedin.com/company/mc-novatools"
      ],
      "contactPoint": {
        "@type": "ContactPoint",
        "contactType": "customer support",
        "email": "support@mc-novatools.com",
        "availableLanguage": ["English", "Turkish", "German"]
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://mc-novatools.com/#website",
      "url": "https://mc-novatools.com",
      "name": "MC NovaTools — All-in-One Browser Utilities",
      "publisher": { "@id": "https://mc-novatools.com/#organization" },
      "potentialAction": {
        "@type": "SearchAction",
        "target": {
          "@type": "EntryPoint",
          "urlTemplate": "https://mc-novatools.com/search?q={search_term_string}"
        },
        "query-input": "required name=search_term_string"
      }
    }
  ]
}
</script>
```

## Footer interlinking

- [x] The reusable global footer uses semantic `<footer>`, `<nav>`, and `<ul>` markup.
- [x] Footer links include About Us, Contact, Privacy Policy, Terms, Disclaimer, Blog, and Sitemap.
- [x] Post-build processing applies the semantic footer to every built HTML page.

## Manual screenshot checklist

After deployment or local preview, capture screenshots showing:

1. `/about-us` visible title, author/team card, footer trust links.
2. `/contact` validated form fields, `support@mc-novatools.com`, social links, footer trust links.
3. `/privacy-policy` AdSense/Analytics/localStorage sections and Google resource links.
4. `/terms-of-service` output-liability and prohibited-use sections.
5. `/disclaimer` finance disclaimer and advertising/affiliate disclosure.
6. `/author/metehan-cetin` avatar, expertise list, schema present in page source.
7. A representative blog post with author link, published date, modified date, read time, and reviewed-by line.
8. A representative tool page with last-updated and visible author/review content.
