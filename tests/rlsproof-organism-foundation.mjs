import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import JSZip from 'jszip';

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
const localFiles = await mustImport(
  '../src/tools/security/rlsproof/core/ingestion/local-files.mjs',
  'local folder ingestion',
);
const zipIngestion = await mustImport(
  '../src/tools/security/rlsproof/core/ingestion/zip.mjs',
  'local ZIP ingestion',
);
const browserScan = await mustImport(
  '../src/tools/security/rlsproof/core/browser-quick-scan.mjs',
  'browser GitHub scan',
);

assert.equal(typeof splitter.splitSqlStatements, 'function');
assert.equal(typeof migrationState.buildMigrationState, 'function');
assert.equal(typeof rules.runRules, 'function');
assert.ok(Array.isArray(rules.RULES));
assert.equal(typeof analysis.analyzeVirtualFiles, 'function');
assert.equal(typeof filePolicy.safeRelativePath, 'function');
assert.equal(typeof localFiles.virtualFilesFromFileList, 'function');
assert.equal(typeof zipIngestion.virtualFilesFromZipBytes, 'function');

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

const folderResult = await localFiles.virtualFilesFromFileList([
  {
    name: '001.sql',
    webkitRelativePath: 'private-project/supabase/migrations/001.sql',
    size: 48,
    text: async () => 'create table public.local_demo (id uuid);',
  },
  {
    name: '.env',
    webkitRelativePath: 'private-project/.env',
    size: 30,
    text: async () => 'SHOULD_NOT_BE_READ=secret',
  },
  {
    name: 'index.js',
    webkitRelativePath: 'private-project/node_modules/pkg/index.js',
    size: 10,
    text: async () => 'ignored',
  },
]);
assert.deepEqual(folderResult.files.map((file) => file.path), [
  'private-project/.env',
  'private-project/supabase/migrations/001.sql',
]);
assert.equal(folderResult.files.find((file) => file.path.endsWith('/.env'))?.text, '', 'environment file contents must not be read into analysis evidence');
assert.equal(folderResult.scope.skippedFiles, 1);

const zip = new JSZip();
zip.file('private-project/supabase/migrations/001.sql', 'create table public.zip_demo (id uuid);');
zip.file('private-project/.env.production', 'SHOULD_NOT_BE_READ=secret');
zip.file('private-project/node_modules/pkg/index.js', 'ignored');
const zipBytes = await zip.generateAsync({ type: 'uint8array' });
const zipResult = await zipIngestion.virtualFilesFromZipBytes(zipBytes);
assert.ok(zipResult.files.some((file) => file.path.endsWith('/supabase/migrations/001.sql')));
assert.equal(zipResult.files.find((file) => file.path.endsWith('/.env.production'))?.text, '', 'ZIP environment files must be represented without reading secret contents');
assert.equal(zipResult.files.some((file) => file.path.includes('/node_modules/')), false);

function response(status, body, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  };
}

await assert.rejects(
  () => browserScan.browserQuickScanGithubRepo('acme/private-or-missing', {
    fetchImpl: async () => response(404, {}),
  }),
  (error) => error instanceof browserScan.BrowserQuickScanError
    && error.code === 'github_not_found'
    && /private/i.test(error.message)
    && /local|zip|folder/i.test(error.message),
  'GitHub 404 must explain private-repository ambiguity and point to local scanning',
);

const remoteResult = await browserScan.browserQuickScanGithubRepo('acme/demo', {
  fetchImpl: async (url) => {
    if (url.endsWith('/repos/acme/demo')) {
      return response(200, { private: false, default_branch: 'main', size: 1, html_url: 'https://github.com/acme/demo' });
    }
    if (url.includes('/git/trees/')) return response(200, { truncated: false, tree: [] });
    throw new Error(`unexpected URL ${url}`);
  },
});
assert.equal(remoteResult.schemaVersion, 2, 'remote Quick Scan must use the unified versioned analysis contract');
assert.equal(remoteResult.coverage.complete, false);
assert.equal(remoteResult.releaseGate, 'incomplete');
assert.equal(remoteResult.scope.mode, 'remote-quick');
assert.deepEqual(remoteResult.scope.requestedEngines, ['native']);
assert.ok(remoteResult.state && typeof remoteResult.state === 'object');

const toolHtml = readFileSync('src/tools/security/rlsproof/index.html', 'utf8');
const toolLogic = readFileSync('src/tools/security/rlsproof/logic.mjs', 'utf8');
assert.match(toolHtml, /data-rlsproof-local-zip/i, 'RLSProof UI must expose a local ZIP control for private repositories');
assert.match(toolHtml, /data-rlsproof-local-folder/i, 'RLSProof UI must expose a local folder control for private repositories');
assert.match(toolHtml, /stay(?:s)? in (?:your )?browser|never (?:leave|upload)/i, 'local scan copy must clearly state the privacy boundary');
assert.match(toolLogic, /virtualFilesFromZip/i);
assert.match(toolLogic, /virtualFilesFromFileList/i);
assert.match(toolLogic, /analyzeVirtualFiles/i);

const legacy = await import('../src/tools/security/rlsproof/core/content-scan.mjs');
const legacyFindings = legacy.scanVirtualFiles([
  { path: 'supabase/migrations/001.sql', text: 'create table public.legacy_demo (id uuid);' },
]);
assert.ok(
  legacyFindings.some((finding) => finding.rule === 'supabase-public-table-without-rls'),
  'legacy public-table-without-RLS rule id must remain compatible',
);

console.log('RLSProof security organism foundation contract: PASS');
