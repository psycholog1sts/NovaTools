# Phase 2 AdSense Technical Integration Audit

Modified functions:

src/components/Analytics.mjs
- renderAdSenseHead(adsenseClient = DEFAULT_ADSENSE_CLIENT): validates the publisher client with ^ca-pub-[0-9]{16}$, trims the input, HTML-entity-encodes the client ID with escapeHtml for both the meta content attribute and the script src client parameter, and returns exactly two newline-separated lines: one google-adsense-account meta tag and one properly closed async AdSense script tag.
- removeLegacyAdSenseHead(html): removes existing google-adsense-account meta tags and existing AdSense adsbygoogle.js script tags before reinjection so duplicate build-time head tags cannot survive.
- applySeoHead(html, route, options): starts by calling removeLegacyAdSenseHead(html), then removeLegacyGaSnippets(nextHtml), then applies the canonical link, Open Graph tags, Twitter Card tags, the AdSense head block, and finally the analytics head block. The AdSense head is injected immediately before </head> and analytics is injected after AdSense while still before </head>.

vite.config.js
- optionalHtmlEnv.transformIndexHtml(html, context): passes the validated googleAdSenseClient value to applySeoHead through the adsenseClient option.
- googleAdSenseClient initialization: reads process.env.PUBLIC_ADSENSE_CLIENT, then process.env.VITE_ADSENSE_CLIENT, then falls back to ca-pub-5738022526587953. Each candidate value is trimmed and validated with ^ca-pub-[0-9]{16}$ before being passed to applySeoHead; invalid values are skipped and the final fallback is ca-pub-5738022526587953.

src/i18n.js
- ensureAdSenseBootstrap(): keeps the script[data-adsense-bootstrap="true"] and script[data-adsense="true"] duplicate guards, adds the build-time head script guard script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="], sets window.__mcAdSenseLoaded = true when any guard matches, and returns without creating a new runtime script element.

public/i18n.js
- ensureAdSenseBootstrap(): mirrors the src/i18n.js duplicate prevention behavior so the public runtime bootstrap also recognizes an existing build-time AdSense script and does not inject a duplicate script element.

Ad slot template audit:
- docs/tool-template.html: replaced the placeholder ad client and placeholder data-ad-slot on the template ins.adsbygoogle element with ca-pub-5738022526587953 and 3963074185. The element already had explicit width, height, min-height, and aspect-ratio dimensions.
- src/blog/article-template.html: audited the generated ins.adsbygoogle element and confirmed data-ad-slot="2852963074" is 10 digits and dimensions are reserved with width="728", height="90", min-height:90px, and aspect-ratio:728/90.
- src/tools/news/summarizer/index.html: audited the static ins.adsbygoogle element and confirmed data-ad-slot="7418529630" is 10 digits and dimensions are reserved with width="300", height="250", min-width, min-height, and aspect-ratio.
- src/tools/religious/islamic-calendar/index.html: audited the static ins.adsbygoogle element and confirmed data-ad-slot="8529630741" is 10 digits and dimensions are reserved with width="300", height="250", min-width, min-height, and aspect-ratio.
- src/components/ads/AdSlot.mjs: audited the JavaScript-generated ins.adsbygoogle element and confirmed it sets data-ad-slot from the slotId parameter and reserves dimensions with width, height, max-width, and width/height attributes.
- src/i18n.js, public/i18n.js, and src/core/ads/adsense-config.mjs: audited runtime reservation logic and confirmed invalid data-ad-slot values are detected with /^\d{8,20}$/ and valid ad slots receive reserved width, height, min-width, min-height, and aspect-ratio safeguards.

Regex patterns used:
- Client validation: ^ca-pub-[0-9]{16}$
- AdSense account meta removal: /\n?\s*<meta\b(?=[^>]*\bname\s*=\s*["']google-adsense-account["'])(?=[^>]*\bcontent\s*=\s*["']ca-pub-[0-9]{16}["'])[^>]*\/?\s*>/gi
- AdSense script removal: /\n?\s*<script\b(?=[^>]*\bsrc\s*=\s*["']https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-[0-9]{16}[^"']*["'])(?=[^>]*(?:\basync\b|>))(?=[^>]*(?:\bcrossorigin\s*=\s*["']anonymous["']|>))[^>]*>\s*<\/script>/gi
- Google site verification cleanup: /\s*<meta name="google-site-verification" content="[^"]*"\s*\/?>/i
- Runtime duplicate guard selector: script[data-adsense-bootstrap="true"]
- Runtime duplicate guard selector: script[data-adsense="true"]
- Runtime duplicate guard selector: script[src^="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="]
- Ad slot validation: /^\d{8,20}$/

Injection order:
- removeLegacyAdSenseHead(html)
- removeLegacyGaSnippets(nextHtml)
- canonical link tag
- Open Graph tags
- Twitter Card tags
- renderAdSenseHead(adsenseClient)
- renderAnalyticsHead({ gaId, gscId })

Google references:
- AdSense script placement: https://support.google.com/adsense/answer/9274516
- ads.txt authorized sellers: https://support.google.com/adsense/answer/12171612
- AdSense ad placement policies: https://support.google.com/adsense/answer/11188578

Verification performed:
- Source audit confirmed every tracked non-dist HTML, JS, and MJS file containing ins.adsbygoogle has a data-ad-slot value containing exactly 8 to 20 digits and explicit dimensions or runtime dimension reservation.
- Build verification confirmed generated HTML pages contain exactly one google-adsense-account meta tag and exactly one pagead2.googlesyndication.com/pagead/js/adsbygoogle.js AdSense script tag per HTML page.
- Runtime bootstrap review confirmed src/i18n.js and public/i18n.js set window.__mcAdSenseLoaded = true and return before creating a script when a build-time AdSense script, data-adsense bootstrap script, or data-adsense script already exists.
