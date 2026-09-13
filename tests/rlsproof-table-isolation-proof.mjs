import assert from 'node:assert/strict';
import { buildMigrationState } from '../src/tools/security/rlsproof/core/sql/migration-state.mjs';
import { proveTableIsolation } from '../src/tools/security/rlsproof/core/proof/table-isolation.mjs';

function state(sql) {
  return buildMigrationState([{ path: 'supabase/migrations/001.sql', text: sql }]);
}

const base = `
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
`;

const exactOwner = proveTableIsolation(state(`${base}
create policy "owner_read" on public.docs for select to authenticated using (auth.uid() = owner_id);
`), {
  table: 'public.docs', operation: 'select', role: 'authenticated', identity: 'auth.uid()', column: 'owner_id',
});
assert.equal(exactOwner.status, 'PROVEN');
assert.equal(exactOwner.reason, 'all-permissive-policies-proven');

const widened = proveTableIsolation(state(`${base}
create policy "owner_read" on public.docs for select to authenticated using (auth.uid() = owner_id);
create policy "public_read" on public.docs for select to authenticated using (true);
`), {
  table: 'public.docs', operation: 'select', role: 'authenticated', identity: 'auth.uid()', column: 'owner_id',
});
assert.equal(widened.status, 'LEAK');

const restrictiveBarrier = proveTableIsolation(state(`${base}
create policy "public_read" on public.docs for select to authenticated using (true);
create policy "owner_guard" on public.docs as restrictive for select to authenticated using (auth.uid() = owner_id);
`), {
  table: 'public.docs', operation: 'select', role: 'authenticated', identity: 'auth.uid()', column: 'owner_id',
});
assert.equal(restrictiveBarrier.status, 'PROVEN');
assert.equal(restrictiveBarrier.reason, 'restrictive-owner-barrier-proven');

const uncertainRestrictive = proveTableIsolation(state(`${base}
create policy "public_read" on public.docs for select to authenticated using (true);
create policy "membership_guard" on public.docs as restrictive for select to authenticated using (is_member(auth.uid(), owner_id));
`), {
  table: 'public.docs', operation: 'select', role: 'authenticated', identity: 'auth.uid()', column: 'owner_id',
});
assert.equal(uncertainRestrictive.status, 'UNVERIFIED');

const uncertainPermissive = proveTableIsolation(state(`${base}
create policy "owner_or_public" on public.docs for select to authenticated using (auth.uid() = owner_id or is_public = true);
`), {
  table: 'public.docs', operation: 'select', role: 'authenticated', identity: 'auth.uid()', column: 'owner_id',
});
assert.equal(uncertainPermissive.status, 'UNVERIFIED');

const noApplicablePermissive = proveTableIsolation(state(base), {
  table: 'public.docs', operation: 'select', role: 'authenticated', identity: 'auth.uid()', column: 'owner_id',
});
assert.equal(noApplicablePermissive.status, 'UNVERIFIED');
assert.equal(noApplicablePermissive.reason, 'no-applicable-permissive-policy');

const wrongRole = proveTableIsolation(state(`${base}
create policy "anon_read" on public.docs for select to anon using (true);
`), {
  table: 'public.docs', operation: 'select', role: 'authenticated', identity: 'auth.uid()', column: 'owner_id',
});
assert.equal(wrongRole.status, 'UNVERIFIED');
assert.equal(wrongRole.reason, 'no-applicable-permissive-policy');

const disabled = proveTableIsolation(state(`
create table public.docs (id uuid, owner_id uuid);
create policy "owner_read" on public.docs for select to authenticated using (auth.uid() = owner_id);
`), {
  table: 'public.docs', operation: 'select', role: 'authenticated', identity: 'auth.uid()', column: 'owner_id',
});
assert.equal(disabled.status, 'UNVERIFIED');
assert.equal(disabled.reason, 'rls-disabled-or-table-missing');

const uncertainParser = state(`${base}
create policy "owner_read" on public.docs for select to authenticated using (auth.uid() = owner_id);
alter policy "owner_read" on public.docs rename to "owner_read_v2";
`);
const parserResult = proveTableIsolation(uncertainParser, {
  table: 'public.docs', operation: 'select', role: 'authenticated', identity: 'auth.uid()', column: 'owner_id',
});
assert.equal(parserResult.status, 'UNVERIFIED');
assert.equal(parserResult.reason, 'parser-uncertainty');

const runA = proveTableIsolation(state(`${base}
create policy "owner_read" on public.docs for select to authenticated using (auth.uid() = owner_id);
`), {
  table: 'public.docs', operation: 'select', role: 'authenticated', identity: 'auth.uid()', column: 'owner_id',
});
const runB = proveTableIsolation(state(`${base}
create policy "owner_read" on public.docs for select to authenticated using (auth.uid() = owner_id);
`), {
  table: 'public.docs', operation: 'select', role: 'authenticated', identity: 'auth.uid()', column: 'owner_id',
});
assert.deepEqual(runA, runB, 'table isolation proof output must be deterministic');

console.log('RLSProof table isolation proof contract: PASS');
