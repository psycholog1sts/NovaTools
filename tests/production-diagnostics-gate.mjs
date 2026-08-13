import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const script = fileURLToPath(new URL('../scripts/enforce-production-diagnostics-gate.mjs', import.meta.url));
const run = (env) => spawnSync(process.execPath, [script], {
  encoding: 'utf8',
  env: { ...process.env, ...env },
});

const success = run({ RECONCILE_OUTCOME: 'success', APEX_EDGE_OUTCOME: 'success', WWW_EDGE_OUTCOME: 'success' });
assert.equal(success.status, 0, success.stderr);

const failure = run({ RECONCILE_OUTCOME: 'failure', APEX_EDGE_OUTCOME: 'success', WWW_EDGE_OUTCOME: 'failure' });
assert.equal(failure.status, 1);
assert.match(failure.stderr, /reconcile_hosts=failure/);
assert.match(failure.stderr, /www_edge=failure/);

console.log('production diagnostics gate: pass');
