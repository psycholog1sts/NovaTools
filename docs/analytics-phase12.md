# Phase 12 analytics and behavior tracking plan

This document records the production configuration needed around the consent-gated analytics code in `src/js/analytics.js`.

## Runtime configuration

- GA4 measurement ID: `G-Y896L63239` (existing repository value).
- GA4 loads only after the `analytics` consent category is granted.
- GA4 config uses IP anonymization, two-year cookie expiry (`63072000` seconds), and cookie updates.
- Microsoft Clarity is optional and disabled unless `window.NOVATOOLS_CLARITY_PROJECT_ID` is set before analytics initialization.
- Search Console verification uses the root HTML meta value `%VITE_GOOGLE_SITE_VERIFICATION%`; set `VITE_GOOGLE_SITE_VERIFICATION` during the production build.

## Search Console operations

Manual production steps:

1. Build and deploy with `VITE_GOOGLE_SITE_VERIFICATION` set to the exact token from Google Search Console.
2. Verify the `https://mc-novatools.com/` property in Search Console.
3. Submit `https://mc-novatools.com/sitemap.xml` in Search Console.
4. Re-submit after major route/category/tool URL changes.

Optional API reporting script requirements:

- Use a service account or OAuth client with Search Console API access.
- Pull query, page, country, device, clicks, impressions, CTR, and average position.
- Store reports outside the public static bundle.
- Do not expose API credentials or raw exports in `/admin/dashboard.html`.

## GA4 event taxonomy

| Area | Event | Key parameters |
| --- | --- | --- |
| Content | `content_view` | `content_type`, `content_event`, `page_path`, `page_title` |
| Tools | `tool_task_start` | `tool_id`, `action_label` |
| Tools | `tool_task_complete` | tool-specific non-PII detail |
| Tools | `tool_task_error` | `error_message` |
| Tools | `tool_input_method` | `input_method` |
| Blog | `blog_article_read` | `read_trigger` |
| Blog | `blog_scroll_depth` | `percent_scrolled` |
| Navigation | `cta_click` | `cta_text`, `cta_location`, `link_url` |
| Navigation | `nav_click` | `nav_text`, `nav_location`, `link_url` |
| Search | `search_query` | `query_hash`, `query_length` |
| Preferences | `language_change` | `old_language`, `new_language` |
| Preferences | `theme_change` | `old_theme`, `new_theme` |
| Ads | `ad_impression` | placement metadata if available |
| Ads | `ad_click` | placement metadata if available |
| Performance | `web_vital` | `metric_name`, `metric_value`, `metric_rating`, `metric_id` |

Search query text is hashed client-side before sending. Sensitive parameter keys are removed by the analytics module.

## Funnel definitions for GA4 Explore

### Main tool funnel

1. `content_view` where `content_type = home`
2. `content_view` where `content_type = category`
3. `content_view` where `content_type = tool`
4. `tool_task_start`
5. `tool_task_complete`

Report drop-off as `1 - users_current_step / users_previous_step` for each transition.

### Blog funnel

1. `content_view` where `content_type = blog_index`
2. `content_view` where `content_type = blog`
3. `blog_article_read`
4. `cta_click` where `cta_location = blog`

Report drop-off as `1 - users_current_step / users_previous_step` for each transition.

## Dashboard approach

The static `/admin/dashboard.html` route is intentionally not connected to live data. Use one of these protected approaches before showing production metrics:

- Looker Studio report with access limited to authorized Google accounts.
- Edge-authenticated route that queries GA4/Search Console server-side.
- IP allowlisted internal route if the hosting platform supports it.

Required dashboard widgets:

- Top 10 tools by `tool_task_start` and completion rate.
- Top 10 blog articles by `blog_article_read`.
- Main and blog funnel completion/drop-off.
- Average LCP, CLS, INP, FCP, and TTFB from `web_vital` events.

## A/B testing technical plan

- Keep variants client-side and consent-aware; do not load third-party experiment scripts before consent.
- Define experiments in a static config with `experiment_id`, `variant_id`, target selector, and reversible DOM change.
- Assign variants using a functional-consent-gated storage key; without functional consent, use control.
- Send `ab_exposure` and downstream CTA/tool events only when analytics consent is granted.
- Limit experiments to copy, CTA color, and layout placement; avoid SEO-critical title/canonical changes.
- Document each experiment hypothesis, start/end date, target metric, and rollback plan.
