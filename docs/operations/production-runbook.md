# NovaTools production runbook

This runbook covers the public NovaTools production surface at `https://mc-novatools.com` and the Cloudflare Pages control-plane functions shipped from `main`.

## Production invariants

- `main` is deployable only after the security audit succeeds.
- CI must run lint, regression tests, Cloudflare Pages Functions compilation, the production build, sitemap/site-link validation, and the public-route audit before deployment.
- Wrangler is pinned in CI. Upgrade it deliberately in a dedicated change after validation; do not return deploy commands to `@latest`.
- `/api/health` is a liveness endpoint only. It must not depend on Supabase, billing, user data, or secret configuration and must return only `{ "status": "ok" }` on GET.
- `/api/account/entitlements` is fail-closed. Missing configuration, upstream failures, invalid sessions, malformed upstream data, timeouts, and forbidden entitlement reads must never grant Pro access.
- Entitlement responses are `no-store` and must not expose the authenticated user subject, bearer token, Supabase response details, service-role credentials, or database internals.
- Every health and entitlement response carries a bounded `X-Request-ID`. An incoming ID is accepted only when it matches the application allowlist; otherwise a fresh UUID is generated.

## Required production bindings

The entitlement control plane requires these Cloudflare runtime values:

- `SUPABASE_URL`: the HTTPS URL for the intended production Supabase project.
- `SUPABASE_PUBLISHABLE_KEY`: a Supabase publishable key beginning with `sb_publishable_`.

Do not use or expose a Supabase secret/service-role key in the browser, Pages source, public CI output, or the entitlement endpoint. Payment-provider secrets, if added later, must also be server-only and are outside the current interest-only pricing surface.

## Health checks

Expected liveness contract:

- `GET /api/health` -> HTTP 200, JSON body exactly representing `status: ok`, `Cache-Control: no-store`, and a valid `X-Request-ID`.
- `HEAD /api/health` -> HTTP 200 with no response body.
- Other methods -> HTTP 405 with `Allow: GET, HEAD`.

The production workflow performs a blocking smoke test against both the homepage and `/api/health` after a Cloudflare deploy. A deploy job that fails this smoke step is not considered operationally healthy even if upload completed.

## Cloudflare security policy

Do not disable Cloudflare security globally to make API calls pass.

If Managed Challenge or bot protection intercepts machine-to-machine requests, create the narrowest rule needed for the affected first-party API path. Preserve rate limiting, method restrictions, TLS, application authentication, and applicable managed WAF protections. In particular:

- `/api/health` must be reachable by production monitoring without an interactive challenge.
- `/api/account/entitlements` must be reachable by the NovaTools application without an interactive challenge, but it must still require its Bearer session and retain application-level fail-closed behavior.
- Never create a blanket `/api/*` security bypass unless a separate security review establishes that it is necessary.

## Entitlement activation checklist

Do not advertise or enable live Pro access until all items below are true:

1. The intended Supabase production project is identified without guessing.
2. `supabase/migrations/20260810210000_user_entitlements.sql` is reviewed against the live schema and applied without conflicting objects or policies.
3. RLS is verified using real test identities: a user can read only their own entitlement row; another user's row is denied; client INSERT/UPDATE/DELETE is denied.
4. Cloudflare has the correct production `SUPABASE_URL` and publishable key bindings.
5. `/api/account/entitlements` no longer receives an interactive Cloudflare challenge.
6. Anonymous/missing/invalid sessions and control-plane failures demonstrably resolve to Free, never Pro.
7. If paid checkout is introduced, payment webhooks are authenticated and idempotent, entitlement writes are server-authoritative, customer self-service/cancellation paths exist, and refund/cancellation behavior is documented and tested.

Until that checklist passes, pricing remains an interest/value-test surface and no payment-success or live-Pro claim should be made.

## Incident triage

When production is unhealthy:

1. Record the failing URL, UTC timestamp, HTTP status, and `X-Request-ID` when present. Do not record bearer tokens, query-string secrets, uploaded filenames/content, or private provider/database payloads.
2. Check the GitHub production workflow for the exact `main` SHA and identify the first failing gate rather than rerunning blindly.
3. If build/tests fail, fix forward on a branch and re-run the complete validation chain.
4. If deploy succeeds but smoke fails, distinguish DNS/TLS/WAF/routing issues from application failures before changing code.
5. If entitlement upstreams fail, preserve fail-closed Free behavior. Do not create a client-side emergency Pro override.
6. If secret exposure is suspected, rotate the affected credential at the provider, remove it from source/history/logging where applicable, and redeploy before considering the incident closed.

## Rollback

Prefer a Git revert of the specific production change over force-pushing or rewriting `main` history. The rollback must pass the same security/build/test/deploy gates as a normal production change.

If an urgent Cloudflare rollback is performed from the provider dashboard, follow it with a repository revert so source control and production converge again. Do not leave an untracked dashboard-only rollback as the steady state.

Database migrations require separate rollback analysis. Do not automatically drop entitlement tables or policies merely because application code is reverted; preserve user/billing records and use an explicit, reviewed compensating migration when database rollback is necessary.

## Definition of operationally complete

A production change is complete only when:

- CI validation and security audit are green.
- Cloudflare deploy succeeds.
- Homepage and `/api/health` smoke checks succeed from outside the application process.
- The deployed SHA is known.
- No production blocker is being hidden by `continue-on-error` except the explicitly informational local Lighthouse job.
- Any external dependency that could not be configured with available access is recorded as an open go-live dependency rather than described as complete.
