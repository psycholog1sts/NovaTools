# RLSProof Security Organism Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the RLSProof MVP core with a modular, privacy-preserving security-analysis foundation that supports local/private source ingestion, cumulative migration state, a rule registry with 20+ high-value checks, versioned reports and fail-closed coverage.

**Architecture:** Preserve `/tools/security/rlsproof/` and legacy exports while introducing ingestion, analysis, SQL-state and rule modules. The browser GitHub path and new local ZIP/folder path both normalize into virtual files and flow through a single deterministic analysis pipeline.

**Tech Stack:** Node.js 22, native ES modules, Vite 5, browser File APIs, existing `jszip` dependency, Node assert tests.

**Spec:** `docs/superpowers/specs/2026-09-12-rlsproof-security-organism-design.md`

## Global Constraints

- No GitHub personal access token collection in browser Quick Scan.
- Private/local repository source must not be uploaded to MC NovaTools by this feature.
- Existing `scanVirtualFiles`, `browserQuickScanGithubRepo`, scoring and redaction imports remain compatible.
- Incomplete coverage never yields PASS; gates remain `blocked` or `incomplete` in Wave 1.
- Do not add a new dependency in Wave 1; use existing `jszip`.
- Do not auto-apply database or repository security changes.
- Keep production route and legal/commercial surfaces unchanged except for truthful local-scan copy.

---

### Task 1: Foundation contract tests

**Files:**
- Create: `tests/rlsproof-organism-foundation.mjs`
- Modify: `package.json`

**Interfaces:**
- Consumes existing `scanVirtualFiles(files)`.
- Produces test contract for `splitSqlStatements`, `buildMigrationState`, `analyzeVirtualFiles`, `RULES`, `virtualFilesFromZip`, `virtualFilesFromFileList`.

- [ ] **Step 1: Write failing tests** covering cumulative ENABLE/DISABLE transitions, policy state, grant state, statement splitting with dollar-quoted function bodies, report schema, 20+ registered rules, traversal rejection and local file limits.
- [ ] **Step 2: Add `node tests/rlsproof-organism-foundation.mjs` to the start of `npm test`.**
- [ ] **Step 3: Push and confirm PR CI fails because the new modules do not exist yet.**

### Task 2: Shared file policy and local ingestion

**Files:**
- Create: `src/tools/security/rlsproof/core/ingestion/file-policy.mjs`
- Create: `src/tools/security/rlsproof/core/ingestion/local-files.mjs`
- Create: `src/tools/security/rlsproof/core/ingestion/zip.mjs`

**Interfaces:**
- Produces `DEFAULT_LOCAL_LIMITS`, `isCandidatePath(path)`, `safeRelativePath(path)`, `virtualFilesFromFileList(fileList, options)`, `virtualFilesFromZip(file, options)`.
- Each ingestion result returns `{ files, scope }` where each file is `{ path, text }` and scope contains selected/skipped/bytes/truncated/reasons.

- [ ] **Step 1: Implement path normalization, skipped directory policy, extensions and `.env*` handling.**
- [ ] **Step 2: Implement browser folder/FileList ingestion with per-file, total-byte and count limits.**
- [ ] **Step 3: Implement ZIP expansion with existing JSZip, directory filtering and path-traversal rejection.**
- [ ] **Step 4: Ensure binary/unsupported entries are skipped and coverage reasons are recorded.**

### Task 3: SQL statement splitter and cumulative migration state

**Files:**
- Create: `src/tools/security/rlsproof/core/sql/splitter.mjs`
- Create: `src/tools/security/rlsproof/core/sql/normalize.mjs`
- Create: `src/tools/security/rlsproof/core/sql/migration-state.mjs`

**Interfaces:**
- `splitSqlStatements(text, path)` → ordered `{ text, path, line }[]`.
- `buildMigrationState(sqlFiles)` → `{ tables, policies, functions, views, materializedViews, grants, transitions, parseWarnings }`.

- [ ] **Step 1: Implement quote/comment/dollar-quote aware statement splitting with starting line numbers.**
- [ ] **Step 2: Implement qualified identifier normalization.**
- [ ] **Step 3: Fold lexically ordered SQL files into final table RLS/FORCE/drop state.**
- [ ] **Step 4: Track policies and policy command/roles/USING/WITH CHECK text.**
- [ ] **Step 5: Track GRANT/REVOKE, exposed views/materialized views and SECURITY DEFINER functions.**
- [ ] **Step 6: Record unsupported/ambiguous statements as parse warnings instead of silently claiming complete coverage.**

### Task 4: Rule registry and 20+ deterministic rules

**Files:**
- Create: `src/tools/security/rlsproof/core/rules/registry.mjs`
- Create: `src/tools/security/rlsproof/core/rules/tables.mjs`
- Create: `src/tools/security/rlsproof/core/rules/policies.mjs`
- Create: `src/tools/security/rlsproof/core/rules/grants.mjs`
- Create: `src/tools/security/rlsproof/core/rules/functions-views.mjs`
- Create: `src/tools/security/rlsproof/core/rules/code.mjs`

**Interfaces:**
- Each rule is `{ id, title, severity, evaluate(context) }`.
- `RULES` is a frozen ordered array.
- `runRules(context)` returns normalized findings through existing `makeFinding`.

- [ ] **Step 1: Add table rules for no RLS, explicit DISABLE, FORCE missing advisory and RLS-without-policy.**
- [ ] **Step 2: Add policy rules for inert policy, `USING(true)`, `WITH CHECK(true)`, missing TO, auth metadata, auth NULL bypass, missing write WITH CHECK, duplicate permissive policy.**
- [ ] **Step 3: Add grants rules for anon/PUBLIC writes, GRANT ALL and schema-wide grants.**
- [ ] **Step 4: Add function/view rules for SECURITY DEFINER, unsafe/missing search_path, security-invoker, auth.users view and public materialized view.**
- [ ] **Step 5: Add code rules for service-role identifiers, `.env*`, eval and client-exposed service-role env patterns.**
- [ ] **Step 6: Keep legacy finding ids required by current tests or map them explicitly in compatibility rules.**

### Task 5: Unified analysis report and compatibility adapter

**Files:**
- Create: `src/tools/security/rlsproof/core/analysis/coverage.mjs`
- Create: `src/tools/security/rlsproof/core/analysis/gate.mjs`
- Create: `src/tools/security/rlsproof/core/analysis/analyze.mjs`
- Modify: `src/tools/security/rlsproof/core/content-scan.mjs`
- Modify: `src/tools/security/rlsproof/core/browser-quick-scan.mjs`

**Interfaces:**
- `analyzeVirtualFiles(files, options)` → schema-versioned report.
- `scanVirtualFiles(files)` → `analyzeVirtualFiles(...).findings` for backward compatibility.
- Browser GitHub result reuses analysis findings/summary while preserving existing top-level fields.

- [ ] **Step 1: Build report with source, scope, coverage, state summary, findings and severity summary.**
- [ ] **Step 2: Derive `blocked` on unresolved high/critical findings; otherwise `incomplete`.**
- [ ] **Step 3: Mark parse warnings, truncation and skipped supported-looking files as explicit coverage reasons.**
- [ ] **Step 4: Replace old content-scan internals with compatibility wrapper.**
- [ ] **Step 5: Improve GitHub 404 message to explain that a repository may be private and offer local scan instead of implying certainty.**

### Task 6: Browser UX for public and private/local scanning

**Files:**
- Modify: `src/tools/security/rlsproof/index.html`
- Modify: `src/tools/security/rlsproof/logic.mjs`
- Modify: `src/tools/security/rlsproof/rlsproof.css`

**Interfaces:**
- Existing public GitHub form remains.
- Add ZIP input and folder input with local-only privacy copy.
- Both flows call the same renderer using normalized analysis results.

- [ ] **Step 1: Add a local/private scan panel with ZIP and folder controls.**
- [ ] **Step 2: State explicitly that selected local files stay in the browser.**
- [ ] **Step 3: Wire ZIP/folder ingestion to `analyzeVirtualFiles`.**
- [ ] **Step 4: Render coverage reasons and rule count in addition to findings.**
- [ ] **Step 5: On GitHub not-found/private ambiguity, show a direct local-scan recommendation.**

### Task 7: Regression fixtures and full verification

**Files:**
- Create: `tests/fixtures/rlsproof/safe/001_schema.sql`
- Create: `tests/fixtures/rlsproof/broken/001_schema.sql`
- Create: `tests/fixtures/rlsproof/broken/002_regression.sql`
- Modify: `tests/rlsproof-organism-foundation.mjs` as needed.

**Interfaces:**
- Safe fixture must not produce high/critical RLS findings from supported rules.
- Broken fixture must deterministically trigger multiple table/policy/grant/function/view findings.

- [ ] **Step 1: Add cumulative safe fixture.**
- [ ] **Step 2: Add broken fixture including an explicit later `DISABLE ROW LEVEL SECURITY` regression.**
- [ ] **Step 3: Run PR CI and inspect failing job logs.**
- [ ] **Step 4: Fix all regressions without weakening tests.**
- [ ] **Step 5: Require green tests/lint/build/release-readiness before merge.**

## Self-review

- Spec coverage: Wave 1 ingestion, state, registry, report, coverage, UX and tests are all mapped to tasks.
- Placeholder scan: no TBD/TODO implementation steps.
- Type consistency: virtual files are consistently `{ path, text }`; analysis report is the sole new orchestration contract; `scanVirtualFiles` remains findings-only.
- Scope: semantic diff, authorization graph, SMT proof, SARIF and DAST are explicitly deferred to later independently testable waves.
