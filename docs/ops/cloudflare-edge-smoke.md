# Cloudflare production smoke policy

## Purpose

NovaTools separates application-origin health from custom-domain edge policy so CI does not confuse a healthy Pages deployment with a Cloudflare Managed Challenge applied at the custom domain.

## Blocking checks

After each `main` deployment, CI checks the Cloudflare Pages production origin at:

- `https://${CLOUDFLARE_PROJECT_NAME}.pages.dev/`
- `https://${CLOUDFLARE_PROJECT_NAME}.pages.dev/api/health`

Both checks are blocking. `/api/health` must return only `{ "status": "ok" }` plus a syntactically valid `X-Request-ID` response header.

## Custom-domain diagnostic

CI separately probes `https://mc-novatools.com/api/health`.

- HTTP 200 with the expected health contract passes.
- HTTP 403 with `cf-mitigated: challenge` is reported as an explicit workflow warning. This identifies a Cloudflare WAF/Bot policy dependency rather than an application deployment failure.
- Any other response remains blocking and fails the production job.

The warning is not a waiver of the edge-policy issue. The Cloudflare dashboard must be configured so intended health monitors and search crawlers are not unnecessarily challenged while abusive traffic remains protected.

## Security boundary

CI does not bypass, disable, or weaken WAF/Bot protections. Cloudflare edge policy changes require dashboard/API authority and should be scoped to the smallest necessary path or verified bot/monitor class.
