import { buildAuthorizationGraph } from '../graph/authorization-graph.mjs';

const TABLE_METHOD = '(select|insert|update|delete|upsert)';

function normalizeObjectName(value) {
  const name = String(value ?? '').trim().toLowerCase();
  if (!name) return null;
  return name.includes('.') ? name : `public.${name}`;
}

function appFiles(files) {
  if (!Array.isArray(files)) throw new TypeError('files must be an array');
  return files
    .filter((file) => file && typeof file.path === 'string' && /\.(?:[cm]?[jt]sx?)$/i.test(file.path))
    .map((file) => ({ path: file.path, text: typeof file.text === 'string' ? file.text : '' }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

function extractCalls(files) {
  const calls = [];

  for (const file of appFiles(files)) {
    const direct = new RegExp(`\\.from\\(\\s*(['"\\x60])([^'"\\x60]+)\\1\\s*\\)\\s*\\.\\s*${TABLE_METHOD}\\s*\\(`, 'gi');
    const dynamic = new RegExp(`\\.from\\(\\s*([A-Za-z_$][A-Za-z0-9_$]*)\\s*\\)\\s*\\.\\s*${TABLE_METHOD}\\s*\\(`, 'gi');
    const rpc = /\.rpc\(\s*(['"`])([^'"`]+)\1/gi;

    let match;
    while ((match = direct.exec(file.text))) {
      calls.push({
        path: file.path,
        index: match.index,
        kind: 'table',
        object: normalizeObjectName(match[2]),
        operation: String(match[3]).toLowerCase() === 'upsert' ? 'insert' : String(match[3]).toLowerCase(),
      });
    }
    while ((match = rpc.exec(file.text))) {
      calls.push({
        path: file.path,
        index: match.index,
        kind: 'rpc',
        object: String(match[2]).toLowerCase(),
        operation: 'execute',
      });
    }
    while ((match = dynamic.exec(file.text))) {
      calls.push({
        path: file.path,
        index: match.index,
        kind: 'dynamic-table',
        object: match[1],
        operation: String(match[2]).toLowerCase() === 'upsert' ? 'insert' : String(match[2]).toLowerCase(),
      });
    }
  }

  return calls.sort((a, b) => a.path.localeCompare(b.path) || a.index - b.index || a.kind.localeCompare(b.kind));
}

function policyApplies(policy, operation) {
  const command = String(policy?.command ?? 'all').toLowerCase();
  return command === 'all' || command === operation;
}

function tableBoundary(state, graphNodes, object, operation) {
  const table = state.tables.get(object);
  const graphNodeId = `table:${object}`;
  const graphNode = graphNodes.get(graphNodeId);

  if (!table || table.dropped || !graphNode) {
    return { graphNodeId: graphNode ? graphNodeId : null, boundary: 'requires-review' };
  }
  if (!table.rlsEnabled) {
    return { graphNodeId, boundary: 'rls-disabled' };
  }

  const guarded = [...state.policies.values()].some((policy) => policy.table === object && policyApplies(policy, operation));
  return { graphNodeId, boundary: guarded ? 'guarded' : 'missing-policy' };
}

function classify(call, state, graphNodes) {
  if (call.kind === 'rpc') return { ...call, graphNodeId: null, boundary: 'unresolved-rpc' };
  if (call.kind === 'dynamic-table') return { ...call, graphNodeId: null, boundary: 'requires-review' };
  return { ...call, ...tableBoundary(state, graphNodes, call.object, call.operation) };
}

function summarize(calls) {
  const summary = { guarded: 0, weak: 0, requiresReview: 0 };
  for (const call of calls) {
    if (call.boundary === 'guarded') summary.guarded += 1;
    else if (call.boundary === 'rls-disabled' || call.boundary === 'missing-policy') summary.weak += 1;
    else summary.requiresReview += 1;
  }
  return summary;
}

export function correlateAppCode(state, files) {
  if (!state || !(state.tables instanceof Map) || !(state.policies instanceof Map) || !Array.isArray(state.grants)) {
    throw new TypeError('migration state is invalid');
  }

  const graph = buildAuthorizationGraph(state);
  const graphNodes = new Map(graph.nodes.map((node) => [node.id, node]));
  const calls = extractCalls(files).map((call, index) => ({
    id: `appcall_${String(index + 1).padStart(4, '0')}`,
    ...classify(call, state, graphNodes),
  }));
  const summary = summarize(calls);

  return {
    schemaVersion: 1,
    verdict: summary.weak > 0 || summary.requiresReview > 0 ? 'REQUIRES_REVIEW' : 'SAFE',
    summary,
    calls,
  };
}
