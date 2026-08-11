# NovaTools production-readiness status

This document records the production gates that must be true before NovaTools can claim a fully live Pro monetization lifecycle.

## Application and delivery

- Static/public Free surface: deployed through Cloudflare Pages.
- Cloudflare Pages Functions: compiled in CI before deployment.
- Pages production origin: blocking post-deploy smoke test.
- Custom domain: separately diagnosed because Cloudflare WAF/Bot policy can challenge external probes independently of application health.
- Production rollback: revert to last verified commit/deployment only when schema compatibility is preserved.

## Auth and entitlement

- Client auth configuration accepts only Supabase URL and publishable key.
- Pro entitlement is server-authoritative and fail-closed.
- Client-controlled state cannot grant Pro.
- Production Supabase project, migration execution and environment bindings are external activation gates until connected and verified.

## Billing

- Pricing remains truthful interest-only until checkout is explicitly enabled.
- Billing provider webhooks must verify the raw request body before parsing.
- Provider IDs are mapped to plan keys only from server-owned configuration.
- Duplicate/replayed and stale subscription events must not grant or restore invalid entitlements.
- Live billing cannot be enabled until provider credentials, legal/tax/customer-support readiness, sandbox lifecycle tests and rollback/reconciliation procedures are verified.

## Current external control-plane dependencies

The repository can prepare and validate the contracts, but these platform-side operations require their respective management authorities:

1. Cloudflare WAF/Bot policy for `mc-novatools.com`.
2. Supabase production project/migrations/secrets and RLS verification.
3. Merchant-of-record sandbox/live account, products/prices, webhook secret and portal configuration.
4. GitHub branch-protection/ruleset configuration if repository policy is to forbid direct production writes.

No code path should pretend these dependencies are configured when they are not. Missing production control-plane configuration must fail closed while the public Free site remains available.
