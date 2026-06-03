# Core Web Vitals audit checklist

## LCP under 2.5s

- Keep above-the-fold HTML server/static-rendered for all tool landing pages.
- Preload or mark the first hero/featured image as high priority when a page has a visual hero.
- Avoid blocking scripts before primary content; defer non-critical JavaScript.
- Keep font loading predictable with preconnects and stable fallbacks.

## CLS under 0.1

- Reserve space for upload panels, result panels, ads, notices, and dynamic tool output.
- Never inject ads, banners, or result containers above existing content after load.
- Set image dimensions or CSS aspect-ratio for meaningful images.
- Keep breadcrumb, heading, and first tool controls visible and stable at load.

## INP under 200ms

- Debounce heavy calculations and validation handlers.
- Use Web Workers for large file processing where practical.
- Split long-running client work into chunks and update progress without blocking input.
- Avoid synchronous parsing/conversion of large files on the main thread.

## Mobile usability

- Validate tool layouts at 320px width.
- Maintain minimum 48x48px touch targets for buttons, file controls, and key links.
- Avoid horizontal scrolling; test long labels, localized text, and result tables.
- Confirm visible breadcrumb navigation does not wrap into an unusable control row.

## External validation still required

- Run Google Mobile-Friendly Test against production URLs after deployment.
- Run PageSpeed Insights or Lighthouse CI on representative tool, category, blog, and author pages.
- Check Search Console coverage after the sitemap is submitted.
