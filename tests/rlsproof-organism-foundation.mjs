import assert from 'node:assert/strict';

async function mustImport(specifier, contractName) {
  try {
    return await import(specifier);
  } catch (error) {
    assert.fail(`${contractName} must be implemented and importable: ${error?.message ?? error}`);
  }
}

const splitter = await mustImport(
  '../src/tools/security/rlsproof/core/sql/splitter.mjs',
  'SQL statement splitter',
);
const migrationState = await mustImport(
  '../src/tools/security/rlsproof/core/sql/migration-state.mjs',
  'migration state engine',
);
const rules = await mustImport(
  '../src/tools/security/rlsproof/core/rules/registry.mjs',
  'rule registry',
);
const analysis = await mustImport(
  '../src/tools/security/rlsproof/core/analysis/analyze.mjs',
  'analysis orchestrator',
);
const filePolicy = await mustImport(
  '../src/tools/security/rlsproof/core/ingestion/file-policy.mjs',
  'local file policy',
);

assert.equal(typeof splitter.splitSqlStatements, 'function');
assert.equal(typeof migrationState.buildMigrationState, 'function');
assert.equal(typeof rules.runRules, 'function');
assert.ok(Array.isArray(rules.RULES));
assert.equal(typeof analysis.analyzeVirtualFiles, 'function');
assert.equal(typeof filePolicy.safeRelativePath, 'function');

const functionSql = `
create or replace function public.demo()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1;
  perform 2;
end;
$$;

alter table public.accounts enable row level security;
`;
const statements = splitter.splitSqlStatements(functionSql, 'supabase/migrations/001.sql');
assert.equal(statements.length, 2, 'dollar-quoted function bodies must not be split at internal semicolons');
assert.match(statements[0].text, /security\s+definer/i);
assert.match(statements[1].text, /enable\s+row\s+level\s+security/i);
assert.ok(statements[1].line > statements[0].line);

const state = migrationState.buildMigrationState([
  {
    path: 'supabase/migrations/001.sql',
    text: `
      create table public.accounts (id uuid, owner_id uuid);
      alter table public.accounts enable row level security;
      create policy accounts_read on public.accounts for select to authenticated using ((select auth.uid()) = owner_id);
      grant select on table public.accounts to authenticated;
    `,
  },
  {
    path: 'supabase/migrations/002.sql',
    text: `alter table public.accounts disable row level security;`,
  },
]);
const accounts = state.tables.get('public.accounts');
assert.ok(accounts, 'created table must exist in final state');
assert.equal(accounts.rlsEnabled, false, 'later DISABLE must override earlier ENABLE');
assert.ok(state.policies.has('public.accounts::accounts_read'));
assert.ok(state.grants.some((grant) => grant.object === 'public.accounts' && grant.grantee === 'authenticated'));
assert.ok(state.transitions.some((transition) => transition.type === 'rls-disable'));

assert.ok(rules.RULES.length >= 20, `expected at least 20 deterministic rules, got ${rules.RULES.length}`);
assert.equal(new Set(rules.RULES.map((rule) => rule.id)).size, rules.RULES.length, 'rule ids must be unique');
for (const rule of rules.RULES) {
  assert.equal(typeof rule.id, 'string');
  assert.equal(typeof rule.title, 'string');
  assert.equal(typeof rule.severity, 'string');
  assert.equal(typeof rule.evaluate, 'function');
}

const report = analysis.analyzeVirtualFiles([
  {
    path: 'supabase/migrations/001.sql',
    text: `
      create table public.accounts (id uuid, owner_id uuid);
      alter table public.accounts enable row level security;
      create policy accounts_read on public.accounts for select to authenticated using ((select auth.uid()) = owner_id);
    `,
  },
  {
    path: 'supabase/migrations/002.sql',
    text: `alter table public.accounts disable row level security;`,
  },
]);
assert.equal(report.schemaVersion, 2);
assert.equal(report.coverage.complete, false, 'Wave 1 static analysis must not claim complete security coverage');
assert.ok(Array.isArray(report.coverage.reasons));
assert.ok(['blocked', 'incomplete'].includes(report.releaseGate));
assert.equal(report.releaseGate, 'blocked', 'explicit RLS disable regression must block the gate');
assert.ok(report.summary.high + report.summary.critical >= 1);
assert.ok(report.findings.some((finding) => finding.rule === 'supabase-rls-explicitly-disabled'));

const safeReport = analysis.analyzeVirtualFiles([
  {
    path: 'supabase/migrations/001.sql',
    text: `
      create table public.notes (id uuid primary key, owner_id uuid not null);
      alter table public.notes enable row level security;
      alter table public.notes force row level security;
      create policy notes_select on public.notes for select to authenticated using ((select auth.uid()) = owner_id);
      create policy notes_insert on public.notes for insert to authenticated with check ((select auth.uid()) = owner_id);
    `,
  },
]);
assert.equal(safeReport.releaseGate, 'incomplete', 'a clean bounded static result must remain incomplete, never PASS');
assert.equal(safeReport.findings.some((finding) => ['critical', 'high'].includes(finding.severity)), false);

assert.equal(filePolicy.safeRelativePath('../private.sql'), false);
assert.equal(filePolicy.safeRelativePath('/absolute/private.sql'), false);
assert.equal(filePolicy.safeRelativePath('src/../private.sql'), false);
assert.equal(filePolicy.safeRelativePath('supabase/migrations/001.sql'), true);
assert.equal(filePolicy.isCandidatePath('supabase/migrations/001.sql'), true);
assert.equal(filePolicy.isCandidatePath('node_modules/pkg/index.js'), false);
assert.equal(filePolicy.isCandidatePath('.env.production'), true, '.env files must be visible to the security engine as existence-only findings');

const legacy = await import('../src/tools/security/rlsproof/core/content-scan.mjs');
const legacyFindings = legacy.scanVirtualFiles([
  { path: 'supabase/migrations/001.sql', text: 'create table public.legacy_demo (id uuid);' },
]);
assert.ok(
  legacyFindings.some((finding) => finding.rule === 'supabase-public-table-without-rls'),
  'legacy public-table-without-RLS rule id must remain compatible',
);

console.log('RLSProof security organism foundation contract: PASS');
