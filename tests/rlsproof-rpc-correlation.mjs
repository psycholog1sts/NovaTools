import assert from 'node:assert/strict';
import { buildMigrationState } from '../src/tools/security/rlsproof/core/sql/migration-state.mjs';
import { correlateAppCode } from '../src/tools/security/rlsproof/core/correlation/app-code.mjs';

const state = buildMigrationState([{ path: 'supabase/migrations/001.sql', text: `
create function public.safe_rpc() returns void language sql set search_path = pg_catalog, public as $$ select 1; $$;
create function public.admin_rpc() returns void language sql security definer set search_path = public as $$ select 1; $$;
create function public.unsafe_rpc() returns void language sql security definer as $$ select 1; $$;
` }]);

const files = [{ path: 'src/api.ts', text: `
await supabase.rpc('safe_rpc');
await supabase.rpc("admin_rpc");
await supabase.rpc(\`unsafe_rpc\`);
await supabase.rpc('missing_rpc');
await supabase.rpc(rpcName);
// await supabase.rpc('commented_rpc');
const note = "supabase.rpc('string_rpc')";
` }];

const report = correlateAppCode(state, files);
const byObject = new Map(report.calls.map((call) => [call.object, call]));

assert.equal(byObject.get('safe_rpc')?.graphNodeId, 'function:public.safe_rpc');
assert.equal(byObject.get('safe_rpc')?.boundary, 'resolved-rpc-review');

assert.equal(byObject.get('admin_rpc')?.graphNodeId, 'function:public.admin_rpc');
assert.equal(byObject.get('admin_rpc')?.boundary, 'security-definer-review');

assert.equal(byObject.get('unsafe_rpc')?.graphNodeId, 'function:public.unsafe_rpc');
assert.equal(byObject.get('unsafe_rpc')?.boundary, 'security-definer-unsafe');

assert.equal(byObject.get('missing_rpc')?.graphNodeId, null);
assert.equal(byObject.get('missing_rpc')?.boundary, 'unresolved-rpc');
assert.equal(byObject.has('commented_rpc'), false);
assert.equal(byObject.has('string_rpc'), false);

const dynamic = report.calls.find((call) => call.kind === 'dynamic-rpc');
assert.equal(dynamic?.object, 'rpcName');
assert.equal(dynamic?.graphNodeId, null);
assert.equal(dynamic?.boundary, 'requires-review');

assert.equal(report.verdict, 'REQUIRES_REVIEW');
assert.ok(report.summary.requiresReview >= 4);
assert.ok(report.summary.weak >= 1, 'unsafe SECURITY DEFINER RPC must be counted as a weak boundary');

const again = correlateAppCode(state, files);
assert.deepEqual(report, again, 'RPC correlation output must be deterministic');

console.log('RLSProof RPC correlation contract: PASS');
