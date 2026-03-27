# AGENTS.md

Repository working rules for Codex contributors in `psycholog1sts/NovaTools`.

## Core workflow
- Use **surgical edits** only; avoid broad rewrites.
- **Plan first** for any multi-step work before changing files.
- Preserve current architecture and maintain backward compatibility whenever reasonably possible.
- Do not broaden scope beyond the requested phase/task.
- Do not invent fake backend behavior.
- Do not add unverifiable claims, inflated numbers, or speculative marketing copy.

## Stability guardrails (high-priority)
- Protect i18n behavior (`src/i18n.js`, `src/i18n/*`, `/locales/*`).
- Protect static HTML route stability (root pages, category pages, tool `index.html` routes).
- Protect category routing integrity (especially `/categories/*.html` and links to `/tools/.../`).
- Protect build stability (Vite multi-page input config and post-build path fixes).

## Project commands (detected)
- Package manager: `npm` (lockfile: `package-lock.json`, packageManager: `npm@10.2.4`).
- Install: `npm ci` (preferred for reproducible CI) or `npm install`.
- Lint: `npm run lint`.
- Build: `npm run build`.
- Test: `npm test` (alias of `vitest run`).
- Dev server: `npm run dev`.

## Validation expectations after edits
Run the relevant checks for touched areas (at minimum include what is available/reasonable):
- `npm run lint`
- `npm test`
- `npm run build`

If a command cannot run due to environment limits, report that explicitly.

## Reporting expectations in every handoff
Always report:
1. Changed files
2. Commands run
3. Remaining risks
4. Manual QA still needed

## Notes for phase-by-phase cleanup work
- Keep each phase minimal and isolated.
- Avoid framework migration.
- Avoid speculative refactors.
- Prefer explicit, reversible changes with clear diffs.
