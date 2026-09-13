import assert from 'node:assert/strict';
import { proveSinglePolicyIsolation } from '../src/tools/security/rlsproof/core/proof/symbolic-policy.mjs';

const options = { identity: 'auth.uid()', column: 'owner_id' };

function prove(policy) {
  return proveSinglePolicyIsolation(policy, options);
}

const selectOwned = prove({
  command: 'select',
  using: '(select auth.uid()) = owner_id',
  withCheck: null,
});
assert.equal(selectOwned.status, 'PROVEN');
assert.equal(selectOwned.operation, 'select');

const insertOwned = prove({
  command: 'insert',
  using: null,
  withCheck: 'auth.uid() = owner_id',
});
assert.equal(insertOwned.status, 'PROVEN');

const updateOwned = prove({
  command: 'update',
  using: 'owner_id = auth.uid()',
  withCheck: null,
});
assert.equal(updateOwned.status, 'PROVEN', 'UPDATE without explicit WITH CHECK inherits USING semantics');

const allOwned = prove({
  command: 'all',
  using: 'auth.uid() = owner_id',
  withCheck: null,
});
assert.equal(allOwned.status, 'PROVEN');

const selectTrue = prove({ command: 'select', using: 'true', withCheck: null });
assert.equal(selectTrue.status, 'LEAK');

const insertNoCheck = prove({ command: 'insert', using: null, withCheck: null });
assert.equal(insertNoCheck.status, 'LEAK');

const widened = prove({
  command: 'select',
  using: 'auth.uid() = owner_id or is_public = true',
  withCheck: null,
});
assert.equal(widened.status, 'UNVERIFIED', 'unsupported boolean composition must fail closed rather than claim proof');

const wrongColumn = prove({
  command: 'select',
  using: 'auth.uid() = tenant_id',
  withCheck: null,
});
assert.equal(wrongColumn.status, 'UNVERIFIED');

const unsupportedFunction = prove({
  command: 'select',
  using: 'is_member(auth.uid(), owner_id)',
  withCheck: null,
});
assert.equal(unsupportedFunction.status, 'UNVERIFIED');

const unsupportedCommand = prove({
  command: 'truncate',
  using: 'auth.uid() = owner_id',
  withCheck: null,
});
assert.equal(unsupportedCommand.status, 'UNVERIFIED');

assert.deepEqual(
  prove({ command: 'select', using: 'auth.uid() = owner_id', withCheck: null }),
  prove({ command: 'select', using: 'auth.uid() = owner_id', withCheck: null }),
  'symbolic proof results must be deterministic',
);

console.log('RLSProof symbolic policy proof contract: PASS');
