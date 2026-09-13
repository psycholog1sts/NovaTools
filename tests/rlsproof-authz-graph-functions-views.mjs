import assert from 'node:assert/strict';
import { buildMigrationState } from '../src/tools/security/rlsproof/core/sql/migration-state.mjs';
import { buildAuthorizationGraph } from '../src/tools/security/rlsproof/core/graph/authorization-graph.mjs';

const state = buildMigrationState([{ path: 'supabase/migrations/001.sql', text: `
create table public.docs (id uuid);
alter table public.docs enable row level security;
create view public.docs_view as select id from public.docs;
create materialized view public.docs_rollup as select count(*) from public.docs;
create function public.admin_task() returns void language sql security definer set search_path = public as $$ select 1; $$;
` }]);

const graph = buildAuthorizationGraph(state);
const nodes = new Map(graph.nodes.map((node) => [node.id, node]));

assert.equal(nodes.get('function:public.admin_task')?.type, 'function');
assert.equal(nodes.get('function:public.admin_task')?.securityDefiner, true);
assert.equal(nodes.get('function:public.admin_task')?.searchPath, 'public as $$ select 1');

assert.equal(nodes.get('view:public.docs_view')?.type, 'view');
assert.equal(nodes.get('view:public.docs_view')?.securityInvoker, false);
assert.equal(nodes.get('materialized-view:public.docs_rollup')?.type, 'materialized-view');

const again = buildAuthorizationGraph(state);
assert.deepEqual(graph, again, 'authorization graph must remain deterministic');

console.log('RLSProof function/view authorization graph contract: PASS');
