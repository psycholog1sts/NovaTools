# Phase 2 AdSense Technical Integration Audit

Modified functions:

src/components/Analytics.mjs
- removeLegacyAdSenseHead(html): removes existing AdSense account meta tags and existing adsbygoogle.js bootstrap script tags before reinjection so the final HTML head cannot contain duplicate AdSense head tags.
- renderAdSenseHead(adsenseClient = DEFAULT_ADSENSE_CLIENT): validates the client ID with ^ca-pub-[0-9]{16}$, HTML-escapes the client ID and script src attribute value, and returns exactly two lines: the google-adsense-account meta tag and the async AdSense script tag.
- applySeoHead(html, route, options): now calls removeLegacyAdSenseHead first, then removeLegacyGaSnippets, then applies canonical, Open Graph, Twitter, AdSense, and analytics head tags. The AdSense block is injected before the analytics block.

vite.config.js
- optionalHtmlEnv transformIndexHtml passes adsenseClient to applySeoHead.
- googleAdSenseClient reads process.env.PUBLIC_ADSENSE_CLIENT, then process.env.VITE_ADSENSE_CLIENT, then falls back to ca-pub-5738022526587953.

src/i18n.js
- ensureAdSenseBootstrap(): checks document.querySelector('script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="]') before creating a runtime bootstrap script, sets window.__mcAdSenseLoaded = true, and returns immediately when the script already exists.

public/i18n.js
- ensureAdSenseBootstrap(): mirrors the source i18n runtime duplicate guard using the exact AdSense script src selector.

src/blog/article-template.html
- renderInContentAd(labels): added data-ad-slot="2852963074" to the blog in-content ins.adsbygoogle element so every static ins.adsbygoogle template has a valid numeric data-ad-slot attribute.

scripts/post-build-fix.mjs
- stampAdSenseHead(html): applies removeLegacyAdSenseHead and renderAdSenseHead to post-build blog article files that are copied or stamped after Vite HTML transforms, preserving exactly one AdSense head block in generated article output.
- stampBlogFile(filePath, block, locale): now applies stampAdSenseHead after blog SEO stamping so post-build article routes keep the AdSense account meta tag and bootstrap script.

Regex patterns used:
- Client validation: ^ca-pub-[0-9]{16}$
- AdSense account meta removal: /\n?\s*<meta\b(?=[^>]*\bname=["']google-adsense-account["'])[^>]*\/?>/gi
- Closed AdSense script removal: /\n?\s*<script\b(?=[^>]*\bsrc=["']https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=[^"']*["'])[^>]*>\s*<\/script>/gi
- Self-closing AdSense script removal: /\n?\s*<script\b(?=[^>]*\bsrc=["']https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=[^"']*["'])[^>]*\/?>/gi
- Runtime duplicate guard selector: script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="]
- Ad slot validation: /^\d{8,20}$/

Google references:
- AdSense script placement: https://support.google.com/adsense/answer/9274516
- ads.txt authorized sellers: https://support.google.com/adsense/answer/12171612

Verification performed:
- Confirmed every source HTML ins.adsbygoogle element has a data-ad-slot attribute containing 8 to 20 digits.
- Confirmed renderAdSenseHead returns one google-adsense-account meta tag and one AdSense bootstrap script for ca-pub-5738022526587953.
- Confirmed removeLegacyAdSenseHead removes duplicate legacy AdSense head tags before reinjection.
- Confirmed built HTML output contains exactly one google-adsense-account meta tag and exactly one AdSense bootstrap script per generated HTML page.
