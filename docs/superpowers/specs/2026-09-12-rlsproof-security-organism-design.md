# RLSProof Security Organism — Architecture Design

## Goal

Evolve RLSProof from a bounded regex-heavy browser scanner into a modular security-analysis system for Supabase/Postgres applications. The system must grow layer-by-layer without breaking the existing public route or weakening fail-closed behavior.

## Design principles

- Deterministic first: security verdicts come from inspectable rules and evidence, not opaque AI decisions.
- Fail closed: incomplete input, parser uncertainty, truncated coverage, API limits, unsupported constructs, or analysis errors never produce PASS.
- Privacy first: private repositories can be scanned from local ZIP/folder input in the browser without uploading source code to MC NovaTools servers.
- Cumulative state: SQL migrations are evaluated as an ordered history and rules run against final/transition state, not isolated files.
- Stable contracts: findings, coverage and gates use versioned schemas so CI/report consumers can evolve safely.
- Extensible engines: ingestion, SQL state, rules, correlation, diff, proof and runtime probing are separate modules with narrow interfaces.
- No unsafe auto-remediation: RLSProof may generate proposed patches, but it never silently applies security changes to a target repository or database.

## Competitive lessons incorporated

Research of Supabase RLS Guard, pgrls, Aegis, ProdGuard and Supabase guidance shows the highest-value capabilities are: cumulative migration modeling, explicit coverage, rule registries, semantic diffs, SARIF/CI surfaces, app-code↔SQL correlation, local/private source ingestion and proof/testing layers. RLSProof will combine these patterns without copying implementation code.

## Target architecture

```text
RLSProof
├─ ingestion/
│  ├─ github-public.mjs        public GitHub metadata/tree/blob acquisition
│  ├─ local-files.mjs          browser FileList/folder acquisition
│  ├─ zip.mjs                  browser ZIP expansion
│  └─ file-policy.mjs          path, extension, size and skip rules
├─ analysis/
│  ├─ analyze.mjs              top-level orchestration + versioned report
│  ├─ coverage.mjs             coverage accounting and fail-closed reasons
│  └─ gate.mjs                 release-gate derivation
├─ sql/
│  ├─ splitter.mjs             statement splitter aware of quotes/comments/dollar quotes
│  ├─ normalize.mjs            identifiers and qualified names
│  ├─ migration-state.mjs      ordered schema/RLS/policy/grant state machine
│  └─ parser-backends/         future real Postgres AST backend adapter
├─ rules/
│  ├─ registry.mjs             metadata + runner contract
│  ├─ tables.mjs               RLS/table rules
│  ├─ policies.mjs             policy-shape/auth rules
│  ├─ grants.mjs               role/grant exposure rules
│  ├─ functions-views.mjs      SECURITY DEFINER/view/materialized-view rules
│  └─ code.mjs                 JS/TS secrets and unsafe client usage
├─ correlation/                future SQL↔application usage graph
├─ diff/                       future semantic snapshot/regression engine
├─ proof/                      future tenant-isolation symbolic/SMT proof
├─ ci/                         future SARIF/PR annotations/baseline
└─ report/                     future export/render adapters
```

## Wave 1 — foundation implemented in this change set

### 1. Local/private repository ingestion

The public GitHub scanner remains supported. A second path accepts a ZIP archive or folder selection. Files are read locally in the browser, filtered through the same policy and passed directly to analysis. No token is requested and no source code is sent to a NovaTools backend.

Hard limits are enforced before analysis: maximum file count, per-file bytes and total bytes. Unsupported/binary files are skipped and recorded in coverage. ZIP path traversal entries are rejected.

### 2. Ordered SQL migration state

A deterministic statement splitter handles SQL single/double quoted strings, line/block comments and PostgreSQL dollar-quoted bodies well enough to avoid naïve semicolon splitting. Statements are then folded in lexical file order into a state model.

The state model tracks at minimum:

- created/dropped tables
- ENABLE/DISABLE/FORCE/NO FORCE ROW LEVEL SECURITY
- policies, command, roles, USING and WITH CHECK presence
- grants/revokes relevant to anon/authenticated/PUBLIC
- public views/materialized views
- SECURITY DEFINER functions and search_path hints

The architecture deliberately exposes a parser-backend seam. Wave 1 is dependency-light; a real PostgreSQL AST/WASM backend can replace statement interpretation later without changing rule/report contracts.

### 3. Rule registry

Rules implement a common contract and are grouped by responsibility. Each rule has a stable id, title, default severity and evaluation function. Wave 1 targets at least 20 high-value checks, including:

- public table without RLS
- RLS explicitly disabled
- policy exists while RLS disabled
- RLS enabled with no policy
- permissive USING (true)
- permissive WITH CHECK (true)
- missing TO clause
- auth.uid/auth.jwt performance anti-pattern hint
- user-editable JWT metadata used for authorization
- auth.uid() IS NULL OR bypass pattern
- write policy missing WITH CHECK
- anon/PUBLIC write grants
- GRANT ALL to client-reachable roles
- schema-wide grants to client roles
- SECURITY DEFINER in exposed schema
- SECURITY DEFINER without safe search_path indication
- public view without security_invoker
- public view referencing auth.users
- materialized view in exposed schema
- service-role identifier in client/application code
- sensitive .env file present
- eval() dynamic execution

Legacy rule ids required by existing tests remain compatible through the analysis adapter.

### 4. Versioned report and coverage

`analyzeVirtualFiles(files, options)` returns a schema-versioned object with:

- target/source metadata
- scope counts and byte counts
- coverage completeness and reasons
- normalized state summary
- findings
- severity summary
- release gate: `blocked | incomplete`

A clean bounded/local static scan is still `incomplete`; it is never labeled secure/PASS. High or critical findings make the gate `blocked`.

`scanVirtualFiles(files)` remains as a compatibility wrapper returning findings only.

### 5. Test corpus

Tests cover statement splitting, cumulative migration behavior, rule positives/negatives, private/local ingestion limits, traversal rejection, report schema and legacy compatibility. Fixture inputs must include both intentionally safe and intentionally broken migrations.

## Later waves

### Wave 2 — semantic regression and CI

Snapshots, semantic policy/grant diffs, baseline support, SARIF, GitHub annotations and PR verdicts (`SAFE | BREAKING | REQUIRES_REVIEW | DANGEROUS`).

### Wave 3 — authorization graph and app-code correlation

Build an authorization graph of identities→roles→policies→objects→operations and correlate JS/TS Supabase calls, RPCs and views with weak database boundaries.

### Wave 4 — proof layer

Add symbolic tenant-isolation checks and optional SMT/Z3-backed proof. Results use `PROVEN | LEAK | UNVERIFIED`; unsupported constructs remain UNVERIFIED.

### Wave 5 — authorized runtime verification

Bounded, non-destructive DAST against localhost or explicitly attested owned targets. Static findings can be upgraded with runtime evidence but never by attacking third-party targets.

## Security boundaries

- Never request GitHub personal access tokens in the browser Quick Scan.
- Never upload local/private repository contents to NovaTools during local scan.
- Redact secret-like evidence before rendering/export.
- Never follow symlinks or ZIP traversal paths.
- Never claim certification, penetration-test equivalence or complete security coverage.
- No automatic database mutation in analysis mode.

## Compatibility

The canonical route remains `/tools/security/rlsproof/`. Existing public GitHub input remains functional. Existing integration tests that import `scanVirtualFiles`, `browserQuickScanGithubRepo`, scoring and redaction continue to work.

## Success criteria for Wave 1

- Existing RLSProof integration tests remain green.
- New foundation tests pass.
- `npm test`, lint and production build pass in CI.
- Local private-source analysis works without network submission of repository files.
- At least 20 deterministic rules are registered and report coverage explicitly.
- No production deployment is merged until branch CI is green.
