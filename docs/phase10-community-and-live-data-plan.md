# Phase 10 Community and Live Data Plan

## Live data architecture

- Browser pages call `/api/live-data` only; API keys and upstream provider URLs are not embedded in tool pages.
- The production endpoint is implemented as a Vercel Edge Function in `api/live-data.js`.
- Client API modules live under `src/js/api/` and provide a small wrapper for TTL caching, rate-limit checks, error handling, and stale-cache fallback.
- Cache TTLs are intentionally conservative: exchange and weather data use one hour, crypto uses five minutes, and stocks use fifteen minutes.
- If an upstream request fails, the UI shows a user-friendly status. If the same query exists in localStorage and is still inside TTL, the tool renders cached data and labels it as fallback.

## API-key handling

- Current Phase 10 integrations use public upstreams that do not require secrets: Frankfurter, CoinGecko public simple price, Open-Meteo, and Yahoo Finance chart data.
- Future providers that require keys, such as OpenWeatherMap, hosted LibreTranslate, Gemini, or OpenAI, must be called from `/api/*` server-side code using environment variables only.
- Do not expose `VITE_*` variables for provider secrets because Vite embeds them into client bundles.

## Community module feasibility

### Ratings and comments

Recommended first implementation:

1. Store aggregate ratings and comments in a managed database table keyed by canonical tool path.
2. Validate submissions through a serverless endpoint with spam throttling, moderation status, and per-IP/user cooldown.
3. Render only approved comments on tool pages.
4. Keep schema.org rating markup disabled until there is real moderated data; do not publish fabricated aggregate ratings.

Minimum fields:

- `id`, `tool_path`, `rating`, `comment`, `display_name`, `locale`, `status`, `created_at`, `moderated_at`.

### Q&A section

Recommended first implementation:

1. Add question list pages at `/questions/` and individual SEO-safe pages at `/questions/{slug}/`.
2. Link each question to one or more tool paths.
3. Store accepted answer state separately from all answers.
4. Generate canonical URLs and metadata from approved content only.

Minimum fields:

- `questions`: `id`, `slug`, `title`, `body`, `tool_path`, `status`, `created_at`.
- `answers`: `id`, `question_id`, `body`, `status`, `is_accepted`, `created_at`.

### Temporary file/result storage

Recommended first implementation:

1. Use object storage with signed upload/download URLs.
2. Set a hard 24-hour lifecycle deletion policy at the bucket level.
3. Store only metadata in the database and never mark temporary files as indexed content.
4. Require clear user consent before uploading any generated output.

Security baseline:

- MIME sniffing and extension allowlists.
- Per-file and per-user size limits.
- Malware scanning if executable/archive uploads are ever allowed.
- Automatic deletion independent of application cron jobs.
