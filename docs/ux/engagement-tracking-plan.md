# Engagement Tracking Plan

## Privacy baseline

NovaTools should continue to prioritize browser-first processing. Engagement features added in Task 7 use localStorage and do not send user inputs, file names, file contents, ratings, favorites, or helpful votes to a server.

## Google Search Console signals to monitor

- Tool page clicks and impressions by URL group (`/tools/pdf/`, `/tools/image/`, `/tools/dev/`, etc.).
- Query growth for tool + guide combinations such as “compress pdf checklist”.
- Average position changes after related-tool and guide modules are indexed.
- Page indexing issues for injected tool pages.
- Core Web Vitals: LCP, INP, CLS by tool template.

## GA4 events to consider after consent review

Only emit these after analytics consent and without private payloads:

| Event | Trigger | Parameters |
| --- | --- | --- |
| `tool_open` | Tool page loaded | `tool_id`, `category` |
| `how_to_toggle` | How-to details opened/closed | `tool_id`, `state` |
| `tool_primary_action` | Primary action clicked | `tool_id`, `action_type` |
| `tool_result_ready` | Existing tool code confirms completion | `tool_id`, `result_type` only |
| `related_tool_click` | Related/compare card clicked | `source_tool_id`, `target_tool_id` |
| `blog_suggestion_click` | Suggested guide clicked | `tool_id`, `post_slug` |
| `favorite_toggle` | Favorite button used | `tool_id`, `state` |
| `rating_set` | Star rating selected | `tool_id`, `rating_value` |
| `helpful_feedback` | Helpful Yes/No selected | `tool_id`, `value` |
| `share_result_click` | Share/copy result button clicked | `tool_id`, `share_mode` |
| `search_autocomplete_select` | Autocomplete result selected | `result_type`, `result_id` |

## Events intentionally not tracked

- Raw text input, file names, file contents, pasted data, output contents, user comments, email addresses, or private URLs.
- Per-user cross-device identifiers.
- Favorites list contents beyond a consented aggregate event count.

## Comment-system recommendation

Do not add Facebook comments. If comments are required later, evaluate a lightweight option such as Giscus or Remark42 behind consent controls, with clear disclosure that comments are third-party/public and not part of browser-only tool processing.
