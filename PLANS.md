# PLANS.md

Template for phased Codex execution in `psycholog1sts/NovaTools`.

## How to use this file
- Duplicate the phase template for each new phase.
- Keep scope tightly bounded; no cross-phase implementation unless explicitly approved.
- Record exact commands, changed files, and risks for every phase.

---

## Phase Template

### Phase Name
`<phase-id>: <short title>`

### Objective
- What this phase must accomplish (specific and testable).

### In Scope
- Item 1
- Item 2

### Out of Scope
- Item 1
- Item 2

### Constraints
- No framework migration.
- No broad rewrites.
- Preserve architecture and backward compatibility.
- Protect i18n, static HTML routes, category routing, and build stability.

### Files Likely Touched
- `path/to/file-a`
- `path/to/file-b`

### Implementation Plan (before edits)
1. Step 1
2. Step 2
3. Step 3

### Validation Plan
- `npm run lint`
- `npm test`
- `npm run build`
- Any focused command relevant to this phase

### Execution Log
- [ ] Step 1 complete
- [ ] Step 2 complete
- [ ] Step 3 complete

### Results
- Summary of what changed.

### Risks / Regressions to Watch
- Risk 1
- Risk 2

### Manual QA Checklist
- [ ] Verify key static routes load (`/`, `/categories/*`, representative `/tools/*/`).
- [ ] Verify i18n switching still works where selector exists.
- [ ] Verify no broken navigation links introduced.
- [ ] Verify built output contains expected pages/assets.

### Handoff
- Changed files:
- Commands run:
- Remaining risks:
- Manual QA still needed:
