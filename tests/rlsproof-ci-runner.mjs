import assert from 'node:assert/strict';
import { runRegressionGate, toGithubAnnotations } from '../src/tools/security/rlsproof/core/ci/runner.mjs';

const files = (sql) => [{ path: 'supabase/migrations/001.sql', text: sql }];

const base = files(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs for select to authenticated using (auth.uid() = owner_id);
`);

const dangerousHead = files(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs for select to authenticated using (true);
`);

const dangerous = runRegressionGate({ baseFiles: base, headFiles: dangerousHead });
assert.equal(dangerous.semanticReport.verdict, 'DANGEROUS');
assert.equal(dangerous.ciReport.verdict, 'DANGEROUS');
assert.equal(dangerous.prVerdict.mergePolicy, 'block');
assert.equal(dangerous.exitCode, 1);
assert.ok(dangerous.sarif.runs[0].results.length > 0);

const annotations = toGithubAnnotations(dangerous.ciReport);
assert.ok(annotations.length > 0);
assert.equal(annotations[0].level, 'error');
assert.match(annotations[0].title, /RLSProof/i);
assert.ok(annotations[0].message.length > 0);

const baseline = {
  schemaVersion: 1,
  changeIds: dangerous.semanticReport.changes
    .filter((change) => change.classification !== 'safe')
    .map((change) => change.id),
};
const suppressed = runRegressionGate({ baseFiles: base, headFiles: dangerousHead, baseline });
assert.equal(suppressed.ciReport.verdict, 'SAFE');
assert.equal(suppressed.exitCode, 0);
assert.equal(suppressed.sarif.runs[0].results.length, 0);
assert.equal(toGithubAnnotations(suppressed.ciReport).length, 0);

const breaking = runRegressionGate({
  baseFiles: files(`
create table public.docs (id uuid);
alter table public.docs enable row level security;
create policy "public_read" on public.docs for select to authenticated using (true);
`),
  headFiles: files(`
create table public.docs (id uuid);
alter table public.docs enable row level security;
`),
});
assert.equal(breaking.ciReport.verdict, 'BREAKING');
assert.equal(breaking.prVerdict.mergePolicy, 'review');
assert.equal(breaking.exitCode, 0);
assert.ok(toGithubAnnotations(breaking.ciReport).every((annotation) => annotation.level === 'warning'));

assert.throws(
  () => runRegressionGate({ baseFiles: base, headFiles: dangerousHead, baseline: { schemaVersion: 999, changeIds: [] } }),
  /baseline schema is invalid/,
);

console.log('RLSProof CI runner tests passed');
