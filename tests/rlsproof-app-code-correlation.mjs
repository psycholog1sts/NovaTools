import assert from 'node:assert/strict';
import { buildMigrationState } from '../src/tools/security/rlsproof/core/sql/migration-state.mjs';
import { correlateAppCode } from '../src/tools/security/rlsproof/core/correlation/app-code.mjs';

const sql = (text) => [{ path: 'supabase/migrations/001.sql', text }];
const js = (path, text) => [{ path, text }];

const state = buildMigrationState(sql(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_read" on public.docs for select to authenticated using (auth.uid() = owner_id);
create table public.audit_log (id uuid);
`));

const report = correlateAppCode(state, js('src/data.mjs', `
await supabase.from('docs').select('*');
await supabase.from('docs').insert({ owner_id: user.id });
await supabase.from('audit_log').select('*');
await supabase.rpc('admin_task');
const table = 'docs';
await supabase.from(table).select('*');
`));

assert.equal(report.schemaVersion, 1);
assert.equal(report.calls.length, 5);
assert.deepEqual(report.calls.map((call) => call.kind), ['table', 'table', 'table', 'rpc', 'dynamic-table']);

const docsRead = report.calls.find((call) => call.object === 'public.docs' && call.operation === 'select');
assert.equal(docsRead?.graphNodeId, 'table:public.docs');
assert.equal(docsRead?.boundary, 'guarded');

const docsInsert = report.calls.find((call) => call.object === 'public.docs' && call.operation === 'insert');
assert.equal(docsInsert?.boundary, 'missing-policy');

const auditRead = report.calls.find((call) => call.object === 'public.audit_log');
assert.equal(auditRead?.boundary, 'rls-disabled');

const rpc = report.calls.find((call) => call.kind === 'rpc');
assert.equal(rpc?.boundary, 'unresolved-rpc');

const dynamic = report.calls.find((call) => call.kind === 'dynamic-table');
assert.equal(dynamic?.boundary, 'requires-review');

assert.deepEqual(report.summary, {
  guarded: 1,
  weak: 2,
  requiresReview: 2,
});
assert.equal(report.verdict, 'REQUIRES_REVIEW');

const deterministic = correlateAppCode(state, js('src/data.mjs', `await supabase.from('docs').select('*');`));
const deterministicAgain = correlateAppCode(state, js('src/data.mjs', `await supabase.from('docs').select('*');`));
assert.deepEqual(deterministic.calls, deterministicAgain.calls);

console.log('RLSProof app-code correlation contract: PASS');
