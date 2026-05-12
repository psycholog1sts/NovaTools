# AGENTS.md

Repository working rules for Codex contributors in `psycholog1sts/NovaTools`.

## Project role
You are working on NovaTools, a privacy-first client-side utility tools website. Prioritize performance, accessibility, SEO, AdSense readiness, clean UX, route stability, i18n safety, and safe browser-only processing.

## Core workflow
- Use **surgical edits** only; avoid broad rewrites.
- **Plan first** for any multi-step work before changing files.
- Preserve current architecture and maintain backward compatibility whenever reasonably possible.
- Do not broaden scope beyond the requested phase/task.
- Keep each phase minimal and isolated.
- Avoid framework migration unless explicitly requested.
- Avoid speculative refactors.
- Prefer explicit, reversible changes with clear diffs.
- Reuse existing components and utilities before adding new abstractions.
- Prefer readable, dependency-light code.

## Privacy and security rules
- Do not hardcode API keys, tokens, secrets, analytics secrets, AdSense private data, deployment credentials, or private configuration.
- Preserve the privacy-first principle: user files and inputs should stay in the browser whenever possible.
- Do not introduce server-side processing unless explicitly requested.
- Do not invent fake backend behavior.
- Do not log private user data, file contents, tokens, or sensitive inputs.
- Do not add third-party tracking or external calls without clear purpose and review.

## Stability guardrails high-priority
- Protect i18n behavior:
  - `src/i18n.js`
  - `src/i18n/*`
  - `/locales/*`
- Protect static HTML route stability:
  - root pages
  - category pages
  - tool `index.html` routes
- Protect category routing integrity, especially:
  - `/categories/*.html`
  - links to `/tools/.../`
- Protect build stability:
  - Vite multi-page input config
  - post-build path fixes
- Preserve canonical URLs, sitemap logic, robots behavior, metadata, and structured content.
- Keep public pages fast, crawlable, accessible, and user-friendly.

## SEO, content, and monetization rules
- Do not add unverifiable claims, inflated numbers, fake ratings, fake reviews, fake testimonials, or speculative marketing copy.
- Do not add spammy doorway pages or duplicated low-value SEO content.
- Avoid deceptive ad placement, misleading CTAs, or accidental-click patterns.
- AdSense placements must not block core functionality.
- Finance calculators must include clear informational disclaimers and must not present results as financial advice.
- Keep content useful, specific, and honest.
- Maintain responsive design, accessibility, and good Core Web Vitals.

## Code style
- Follow the existing JavaScript, CSS, and module structure.
- Keep changes consistent with the current Vite/web architecture.
- Prefer existing project conventions over introducing new patterns.
- Avoid large dependency additions unless clearly necessary.
- Keep UI changes accessible, mobile-safe, and performance-conscious.

## Project commands detected
- Package manager: `npm`
- Lockfile: `package-lock.json`
- Package manager version: `npm@10.2.4`
- Install: `npm ci` preferred for reproducible CI, or `npm install`
- Dev server: `npm run dev`
- Lint: `npm run lint`
- Build: `npm run build`
- Test: `npm test`
- Public route audit: `npm run audit:public-routes`
- Blog outline check: `npm run lint:blog-outlines`
- Lighthouse CI when relevant: `npm run lighthouse:ci`

## Validation expectations after edits
Run the relevant checks for touched areas. At minimum, use what is available and reasonable:

- `npm run lint`
- `npm test`
- `npm run build`

For routing, SEO, blog, or public-page changes, also run when relevant:

- `npm run audit:public-routes`
- `npm run lint:blog-outlines`
- `npm run build:sitemap`
- `npm run lighthouse:ci`

If a command cannot run due to environment limits, report that explicitly.

## Reporting expectations in every handoff
Always report:

1. Changed files
2. Commands run
3. Commands not run and why
4. Remaining risks
5. Manual QA still needed
6. Suggested next step

## Notes for phase-by-phase cleanup work
- Keep each phase minimal and isolated.
- Avoid framework migration.
- Avoid speculative refactors.
- Prefer explicit, reversible changes with clear diffs.
- Do not silently change URL structure, i18n behavior, category routing, or build output behavior.
