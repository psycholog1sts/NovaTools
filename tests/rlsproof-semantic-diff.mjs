import assert from 'node:assert/strict';
import { analyzeSecurityDiff } from '../src/tools/security/rlsproof/core/diff/semantic-diff.mjs';

const sql = (text) => [{ path: 'supabase/migrations/001.sql', text }];

function findChange(report, kind, object) {
  return report.changes.find((change) => change.kind === kind && (!object || change.object === object));
}

const baseProtected = sql(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs for select to authenticated using (auth.uid() = owner_id);
`);

const disabled = analyzeSecurityDiff(baseProtected, sql(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs for select to authenticated using (auth.uid() = owner_id);
alter table public.docs disable row level security;
`));
assert.equal(disabled.verdict, 'DANGEROUS');
assert.equal(findChange(disabled, 'rls-disabled', 'public.docs')?.classification, 'dangerous');

const restrictiveAdded = analyzeSecurityDiff(baseProtected, sql(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs for select to authenticated using (auth.uid() = owner_id);
create policy "tenant_guard" on public.docs as restrictive for select to authenticated using (tenant_id = 42);
`));
assert.equal(findChange(restrictiveAdded, 'policy-added', 'public.docs::tenant_guard')?.classification, 'safe');

const permissiveAdded = analyzeSecurityDiff(baseProtected, sql(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs for select to authenticated using (auth.uid() = owner_id);
create policy "support_read" on public.docs for select to authenticated using (support = true);
`));
assert.equal(permissiveAdded.verdict, 'DANGEROUS');
assert.equal(findChange(permissiveAdded, 'policy-added', 'public.docs::support_read')?.classification, 'dangerous');

const permissiveRemoved = analyzeSecurityDiff(sql(`
create table public.docs (id uuid);
alter table public.docs enable row level security;
create policy "read_a" on public.docs for select to authenticated using (a = true);
create policy "read_b" on public.docs for select to authenticated using (b = true);
`), sql(`
create table public.docs (id uuid);
alter table public.docs enable row level security;
create policy "read_a" on public.docs for select to authenticated using (a = true);
`));
assert.equal(permissiveRemoved.verdict, 'BREAKING');
assert.equal(findChange(permissiveRemoved, 'policy-removed', 'public.docs::read_b')?.classification, 'breaking');

const restrictiveRemoved = analyzeSecurityDiff(sql(`
create table public.docs (id uuid);
alter table public.docs enable row level security;
create policy "read_a" on public.docs for select to authenticated using (a = true);
create policy "tenant_guard" on public.docs as restrictive for select to authenticated using (tenant_id = 42);
`), sql(`
create table public.docs (id uuid);
alter table public.docs enable row level security;
create policy "read_a" on public.docs for select to authenticated using (a = true);
`));
assert.equal(restrictiveRemoved.verdict, 'DANGEROUS');
assert.equal(findChange(restrictiveRemoved, 'policy-removed', 'public.docs::tenant_guard')?.classification, 'dangerous');

const loosenedPredicate = analyzeSecurityDiff(baseProtected, sql(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs for select to authenticated using (true);
`));
assert.equal(loosenedPredicate.verdict, 'DANGEROUS');
assert.equal(findChange(loosenedPredicate, 'policy-predicate-changed', 'public.docs::docs_owner')?.classification, 'dangerous');

const tightenedPredicate = analyzeSecurityDiff(sql(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs for select to authenticated using (true);
`), baseProtected);
assert.equal(tightenedPredicate.verdict, 'BREAKING');
assert.equal(findChange(tightenedPredicate, 'policy-predicate-changed', 'public.docs::docs_owner')?.classification, 'breaking');

const uncertainPredicate = analyzeSecurityDiff(baseProtected, sql(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs for select to authenticated using (auth.uid() = owner_id and archived_at is null);
`));
assert.equal(uncertainPredicate.verdict, 'REQUIRES_REVIEW');
assert.equal(findChange(uncertainPredicate, 'policy-predicate-changed', 'public.docs::docs_owner')?.classification, 'requires_review');

const grantAdded = analyzeSecurityDiff(sql(`
create table public.docs (id uuid);
alter table public.docs enable row level security;
create policy "read_docs" on public.docs for select to authenticated using (true);
`), sql(`
create table public.docs (id uuid);
alter table public.docs enable row level security;
create policy "read_docs" on public.docs for select to authenticated using (true);
grant insert on public.docs to anon;
`));
assert.equal(grantAdded.verdict, 'DANGEROUS');
assert.equal(findChange(grantAdded, 'grant-added', 'public.docs::anon::insert')?.classification, 'dangerous');

const grantRemoved = analyzeSecurityDiff(sql(`
create table public.docs (id uuid);
alter table public.docs enable row level security;
create policy "read_docs" on public.docs for select to authenticated using (true);
grant insert on public.docs to anon;
`), sql(`
create table public.docs (id uuid);
alter table public.docs enable row level security;
create policy "read_docs" on public.docs for select to authenticated using (true);
`));
assert.equal(grantRemoved.verdict, 'BREAKING');
assert.equal(findChange(grantRemoved, 'grant-removed', 'public.docs::anon::insert')?.classification, 'breaking');

const roleBroadened = analyzeSecurityDiff(sql(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs for select to authenticated using (auth.uid() = owner_id);
`), sql(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs for select to authenticated, anon using (auth.uid() = owner_id);
`));
assert.equal(roleBroadened.verdict, 'DANGEROUS');
assert.equal(findChange(roleBroadened, 'policy-shape-changed', 'public.docs::docs_owner')?.classification, 'dangerous');

const roleNarrowed = analyzeSecurityDiff(sql(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs for select to authenticated, anon using (auth.uid() = owner_id);
`), baseProtected);
assert.equal(roleNarrowed.verdict, 'BREAKING');
assert.equal(findChange(roleNarrowed, 'policy-shape-changed', 'public.docs::docs_owner')?.classification, 'breaking');

const modeLoosened = analyzeSecurityDiff(sql(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs as restrictive for select to authenticated using (auth.uid() = owner_id);
`), baseProtected);
assert.equal(modeLoosened.verdict, 'DANGEROUS');
assert.equal(findChange(modeLoosened, 'policy-shape-changed', 'public.docs::docs_owner')?.classification, 'dangerous');

const forceRemoved = analyzeSecurityDiff(sql(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
alter table public.docs force row level security;
create policy "docs_owner" on public.docs for select to authenticated using (auth.uid() = owner_id);
`), baseProtected);
assert.equal(forceRemoved.verdict, 'REQUIRES_REVIEW');
assert.equal(findChange(forceRemoved, 'rls-force-removed', 'public.docs')?.classification, 'requires_review');

const parserUncertainty = analyzeSecurityDiff(baseProtected, sql(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs for select to authenticated using (auth.uid() = owner_id);
alter policy "docs_owner" on public.docs rename to "docs_owner_v2";
`));
assert.equal(parserUncertainty.verdict, 'REQUIRES_REVIEW');
assert.equal(findChange(parserUncertainty, 'parser-uncertainty', 'analysis')?.classification, 'requires_review');

const fingerprintRunA = analyzeSecurityDiff(baseProtected, sql(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs for select to authenticated using (true);
`));
const fingerprintRunB = analyzeSecurityDiff(baseProtected, sql(`
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs for select to authenticated using (true);
`));
assert.ok(fingerprintRunA.changes.length > 0);
assert.ok(fingerprintRunA.changes.every((item) => /^rdc_[a-f0-9]{24}$/.test(item.id)), 'every semantic diff change must have a stable id');
assert.deepEqual(
  fingerprintRunA.changes.map((item) => item.id),
  fingerprintRunB.changes.map((item) => item.id),
  'semantic diff change ids must be stable across runs with identical inputs',
);

const unchanged = analyzeSecurityDiff(baseProtected, baseProtected);
assert.equal(unchanged.verdict, 'SAFE');
assert.deepEqual(unchanged.changes, []);
assert.deepEqual(unchanged.summary, { safe: 0, breaking: 0, requiresReview: 0, dangerous: 0 });

console.log('RLSProof semantic diff tests passed');
