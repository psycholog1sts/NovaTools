# CLAUDE.md

@AGENTS.md

The import above is this project's full rule set (workflow, privacy/security rules,
stability guardrails, SEO rules, code style, commands, and reporting expectations).
It applies to Claude Code exactly as written for any other coding agent.

Global inspect → root cause → minimal change → test → fix → retest → verified
completion discipline (`~/.claude/CLAUDE.md`) applies here too and is not repeated.

Notes specific to this workspace:

- This repo has no `.env` locally; do not create one with real values, and never
  print or commit AdSense/analytics/deployment secrets.
- Some entries in `.claude/settings.local.json` reference a prior Windows path
  (`C:/Users/meteh/Desktop/web-projem/...`). That project has since moved to this
  WSL checkout — treat those entries as historical and this repo's paths as
  authoritative; no action needed unless they cause a permission mismatch.

## Autonomous engineering (Claude Jarvis, added 2026-08-16)

This repo has no self-hosted runner (unlike metehan-binance-bot's Codex-based
`.jarvis/`), so its autonomous loop runs on GitHub-hosted runners via the
official `anthropics/claude-code-action`, not the Codex pattern. See
`.github/workflows/claude-jarvis-cycle.yml` for the scheduled/issue-driven
engineering cycle, `claude-jarvis-ci-watchdog.yml` for CI-failure follow-up,
and `claude.yml` for `@claude`-mention responses. All three read this file
and `AGENTS.md` automatically before doing anything.

Protected paths (never edit these as part of an autonomous cycle, no
exceptions, enforced by both tool permissions and a post-hoc diff guard in
`claude-jarvis-cycle.yml`): `.github/workflows/**`, `src/i18n.js`,
`src/i18n/**`, `public/locales/**`, `categories/**`, `vite.config.js`,
`scripts/**`, `wrangler.toml`, `vercel.json`, `nginx.conf`, `supabase/**`,
`functions/**`, `api/**`, `.env*`. Everything else in this file and
`AGENTS.md` (surgical edits, no framework migration, no fake backend
behavior, no unverifiable marketing claims, `npm run ci:validate` must pass)
applies to every autonomous cycle exactly as it applies to a human
contributor.

Requires the `ANTHROPIC_API_KEY` repository secret and the Claude GitHub App
to be installed on this repo — until both exist these workflows fail at the
auth step and do nothing else.
