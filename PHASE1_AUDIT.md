# Phase 1 Infrastructure Audit

Modified files:

public/robots.txt
- Replaced the existing generic crawler policy with the required plain UTF-8 robots.txt directives for Googlebot, Googlebot-Image, AdsBot-Google, Mediapartners-Google, and all crawlers.
- Added explicit disallow rules for /admin/, /api/, /private/, and /staging/.
- Added Allow: / and the canonical sitemap directive: Sitemap: https://mc-novatools.com/sitemap.xml.
- Reference: https://developers.google.com/search/reference/robots_txt

public/ads.txt
- Replaced the file with the single authorized Google AdSense seller record for publisher ID pub-5738022526587953.
- Final content is exactly: google.com, pub-5738022526587953, DIRECT, f08c47fec0942fa0
- Reference: https://support.google.com/adsense/answer/12171612

public/.htaccess
- Created Apache-compatible HTTPS enforcement using a 301 redirect from HTTP to HTTPS.
- Added HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection, and Content-Security-Policy headers with Header always set so headers are emitted on every Apache response when mod_headers is enabled.
- Reference: https://developers.google.com/search/docs/appearance/safe-browsing

public/_headers
- Replaced the static host header configuration with the required /* path pattern and the exact security headers for all paths.
- Added HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, X-XSS-Protection, and Content-Security-Policy for every static response handled by platforms that support _headers.
- Reference: https://developers.google.com/search/docs/appearance/safe-browsing

Verification performed:
- Confirmed public/robots.txt has no HTML markup, no leading empty line, and ends with a final newline.
- Confirmed public/ads.txt contains exactly one authorized seller line and ends with a final newline.
- Confirmed public/.htaccess contains the required HTTPS redirect and all required security headers.
- Confirmed public/_headers contains the /* path pattern and all required security headers.
- Confirmed the modified scoped files do not contain unfinished-work markers, placeholder prose, sample domains, or artificial data indicators.
