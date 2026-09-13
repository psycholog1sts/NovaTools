import assert from 'node:assert/strict';
import { buildMigrationState } from '../src/tools/security/rlsproof/core/sql/migration-state.mjs';
import { buildAuthorizationGraph } from '../src/tools/security/rlsproof/core/graph/authorization-graph.mjs';

const state = buildMigrationState([{ path: 'supabase/migrations/001.sql', text: `
create table public.docs (id uuid, owner_id uuid);
alter table public.docs enable row level security;
create policy "docs_owner" on public.docs for select to authenticated using (auth.uid() = owner_id);
grant select on public.docs to authenticated;
create policy "docs_public" on public.docs for select using (published = true);
` }]);

const graph = buildAuthorizationGraph(state);
assert.equal(graph.schemaVersion, 1);
assert.ok(graph.nodes.some((node) => node.id === 'role:authenticated' && node.type === 'role'));
assert.ok(graph.nodes.some((node) => node.id === 'role:public' && node.type === 'role'));
assert.ok(graph.nodes.some((node) => node.id === 'table:public.docs' && node.type === 'table' && node.rlsEnabled === true));
assert.ok(graph.nodes.some((node) => node.id === 'policy:public.docs::docs_owner' && node.type === 'policy'));
assert.ok(graph.nodes.some((node) => node.id === 'policy:public.docs::docs_public' && node.type === 'policy'));

assert.ok(graph.edges.some((edge) => edge.from === 'role:authenticated' && edge.to === 'policy:public.docs::docs_owner' && edge.type === 'policy-applies'));
assert.ok(graph.edges.some((edge) => edge.from === 'role:public' && edge.to === 'policy:public.docs::docs_public' && edge.type === 'policy-applies'));
assert.ok(graph.edges.some((edge) => edge.from === 'policy:public.docs::docs_owner' && edge.to === 'table:public.docs' && edge.type === 'guards' && edge.operation === 'select'));
assert.ok(graph.edges.some((edge) => edge.from === 'role:authenticated' && edge.to === 'table:public.docs' && edge.type === 'grant' && edge.operation === 'select'));

const ids = graph.nodes.map((node) => node.id);
assert.deepEqual(ids, [...ids].sort(), 'graph nodes must be deterministic');
const edgeKeys = graph.edges.map((edge) => `${edge.from}|${edge.type}|${edge.to}|${edge.operation ?? ''}`);
assert.deepEqual(edgeKeys, [...edgeKeys].sort(), 'graph edges must be deterministic');

console.log('RLSProof authorization graph tests passed');
