import { findTable } from '../sql/migration-state.mjs';
import { proveSinglePolicyIsolation } from './symbolic-policy.mjs';

const SUPPORTED_OPERATIONS = new Set(['select', 'insert', 'update', 'delete']);

function normalizeRole(value) {
  return String(value ?? '').trim().toLowerCase();
}

function normalizeOperation(value) {
  return String(value ?? '').trim().toLowerCase();
}

function policyAppliesToRole(policy, role) {
  const roles = Array.isArray(policy?.roles) ? policy.roles.map(normalizeRole).filter(Boolean) : [];
  return roles.length === 0 || roles.includes('public') || roles.includes(role);
}

function policyAppliesToOperation(policy, operation) {
  const command = normalizeOperation(policy?.command ?? 'all');
  return command === 'all' || command === operation;
}

function policyResult(policy, options) {
  return {
    key: policy.key,
    name: policy.name,
    mode: String(policy.mode ?? 'permissive').toLowerCase(),
    command: normalizeOperation(policy.command ?? 'all'),
    proof: proveSinglePolicyIsolation(policy, options),
  };
}

function result(status, table, operation, role, policies, reason) {
  return { schemaVersion: 1, status, table, operation, role, policies, reason };
}

export function proveTableIsolation(state, options = {}) {
  if (!state || typeof state !== 'object') throw new TypeError('state must be an object');

  const tableName = String(options.table ?? '').trim().toLowerCase();
  const operation = normalizeOperation(options.operation);
  const role = normalizeRole(options.role);
  const identity = options.identity ?? 'auth.uid()';
  const column = String(options.column ?? '').trim();

  if (!tableName) throw new TypeError('options.table is required');
  if (!SUPPORTED_OPERATIONS.has(operation)) throw new TypeError('options.operation must be select, insert, update, or delete');
  if (!role) throw new TypeError('options.role is required');
  if (!column) throw new TypeError('options.column is required');

  const table = findTable(state, tableName);
  if (!table || table.dropped || !table.rlsEnabled) {
    return result('UNVERIFIED', tableName, operation, role, [], 'rls-disabled-or-table-missing');
  }

  if (Array.isArray(state.parseWarnings) && state.parseWarnings.length > 0) {
    return result('UNVERIFIED', tableName, operation, role, [], 'parser-uncertainty');
  }

  const applicable = [...table.policies]
    .map((key) => state.policies.get(key))
    .filter(Boolean)
    .filter((policy) => policyAppliesToOperation(policy, operation) && policyAppliesToRole(policy, role))
    .sort((a, b) => a.key.localeCompare(b.key));

  const proofs = applicable.map((policy) => policyResult(policy, { identity, column }));
  const permissive = proofs.filter((entry) => entry.mode !== 'restrictive');
  const restrictive = proofs.filter((entry) => entry.mode === 'restrictive');

  if (restrictive.some((entry) => entry.proof.status === 'UNVERIFIED')) {
    return result('UNVERIFIED', tableName, operation, role, proofs, 'restrictive-policy-unverified');
  }

  if (restrictive.some((entry) => entry.proof.status === 'PROVEN')) {
    return result('PROVEN', tableName, operation, role, proofs, 'restrictive-owner-barrier-proven');
  }

  if (permissive.length === 0) {
    return result('UNVERIFIED', tableName, operation, role, proofs, 'no-applicable-permissive-policy');
  }

  if (permissive.some((entry) => entry.proof.status === 'UNVERIFIED')) {
    return result('UNVERIFIED', tableName, operation, role, proofs, 'permissive-policy-unverified');
  }

  if (permissive.some((entry) => entry.proof.status === 'LEAK')) {
    return result('LEAK', tableName, operation, role, proofs, 'permissive-policy-widens-access');
  }

  if (permissive.every((entry) => entry.proof.status === 'PROVEN')) {
    return result('PROVEN', tableName, operation, role, proofs, 'all-permissive-policies-proven');
  }

  return result('UNVERIFIED', tableName, operation, role, proofs, 'policy-composition-unverified');
}
