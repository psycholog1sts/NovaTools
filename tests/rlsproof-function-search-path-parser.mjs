import assert from 'node:assert/strict';
import { buildMigrationState } from '../src/tools/security/rlsproof/core/sql/migration-state.mjs';

function functionState(sql) {
  return buildMigrationState([{ path: 'supabase/migrations/001.sql', text: sql }]);
}

const sameLine = functionState(`
create function public.admin_task() returns void language sql security definer set search_path = public as $$ select 1; $$;
`);
assert.equal(sameLine.functions.get('public.admin_task')?.searchPath, 'public');

const multipleSchemas = functionState(`
create function public.lookup_task() returns void
language sql
security definer
set search_path to pg_catalog, public
as $body$
  select 1;
$body$;
`);
assert.equal(multipleSchemas.functions.get('public.lookup_task')?.searchPath, 'pg_catalog, public');

const quotedSchema = functionState(`
create function public.quoted_task() returns void language sql set search_path = "Tenant Schema", public as $$ select 1; $$;
`);
assert.equal(quotedSchema.functions.get('public.quoted_task')?.searchPath, '"Tenant Schema", public');

const noSearchPath = functionState(`
create function public.plain_task() returns void language sql as $$ select 1; $$;
`);
assert.equal(noSearchPath.functions.get('public.plain_task')?.searchPath, null);

console.log('RLSProof function search_path parser contract: PASS');
