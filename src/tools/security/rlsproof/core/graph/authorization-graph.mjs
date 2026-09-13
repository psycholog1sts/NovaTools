function nodeId(type, value) {
  return `${type}:${value}`;
}

function addNode(nodes, node) {
  if (!nodes.has(node.id)) nodes.set(node.id, node);
}

function normalizeRoles(policy) {
  const roles = Array.isArray(policy?.roles) ? policy.roles.filter(Boolean) : [];
  return roles.length ? roles.map((role) => String(role).toLowerCase()) : ['public'];
}

function normalizePrivilege(value) {
  const privilege = String(value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  return privilege === 'all privileges' ? 'all' : privilege;
}

function edgeKey(edge) {
  return `${edge.from}|${edge.type}|${edge.to}|${edge.operation ?? ''}`;
}

export function buildAuthorizationGraph(state) {
  if (!state || !(state.tables instanceof Map) || !(state.policies instanceof Map) || !Array.isArray(state.grants)) {
    throw new TypeError('migration state is invalid');
  }

  const nodes = new Map();
  const edges = new Map();

  for (const table of state.tables.values()) {
    if (table.dropped) continue;
    addNode(nodes, {
      id: nodeId('table', table.name),
      type: 'table',
      name: table.name,
      rlsEnabled: Boolean(table.rlsEnabled),
      rlsForced: Boolean(table.rlsForced),
    });
  }

  for (const policy of state.policies.values()) {
    const policyNode = {
      id: nodeId('policy', policy.key),
      type: 'policy',
      name: policy.name,
      table: policy.table,
      command: policy.command,
      mode: policy.mode,
      using: policy.using,
      withCheck: policy.withCheck,
    };
    addNode(nodes, policyNode);
    addNode(nodes, {
      id: nodeId('table', policy.table),
      type: 'table',
      name: policy.table,
      rlsEnabled: Boolean(state.tables.get(policy.table)?.rlsEnabled),
      rlsForced: Boolean(state.tables.get(policy.table)?.rlsForced),
    });

    for (const role of normalizeRoles(policy)) {
      addNode(nodes, { id: nodeId('role', role), type: 'role', name: role });
      const applies = { from: nodeId('role', role), to: policyNode.id, type: 'policy-applies', operation: policy.command };
      edges.set(edgeKey(applies), applies);
    }

    const guards = { from: policyNode.id, to: nodeId('table', policy.table), type: 'guards', operation: policy.command };
    edges.set(edgeKey(guards), guards);
  }

  for (const grant of state.grants) {
    const role = String(grant.grantee ?? '').toLowerCase();
    if (!role || !grant.object) continue;
    addNode(nodes, { id: nodeId('role', role), type: 'role', name: role });
    addNode(nodes, {
      id: nodeId('table', grant.object),
      type: 'table',
      name: grant.object,
      rlsEnabled: Boolean(state.tables.get(grant.object)?.rlsEnabled),
      rlsForced: Boolean(state.tables.get(grant.object)?.rlsForced),
    });
    for (const privilege of grant.privileges ?? []) {
      const edge = {
        from: nodeId('role', role),
        to: nodeId('table', grant.object),
        type: 'grant',
        operation: normalizePrivilege(privilege),
      };
      edges.set(edgeKey(edge), edge);
    }
  }

  if (state.functions instanceof Map) {
    for (const fn of state.functions.values()) {
      addNode(nodes, {
        id: nodeId('function', fn.name),
        type: 'function',
        name: fn.name,
        securityDefiner: Boolean(fn.securityDefiner),
        searchPath: fn.searchPath ?? null,
      });
    }
  }

  if (state.views instanceof Map) {
    for (const view of state.views.values()) {
      addNode(nodes, {
        id: nodeId('view', view.name),
        type: 'view',
        name: view.name,
        securityInvoker: Boolean(view.securityInvoker),
        referencesAuthUsers: Boolean(view.referencesAuthUsers),
      });
    }
  }

  if (state.materializedViews instanceof Map) {
    for (const view of state.materializedViews.values()) {
      addNode(nodes, {
        id: nodeId('materialized-view', view.name),
        type: 'materialized-view',
        name: view.name,
        securityInvoker: Boolean(view.securityInvoker),
        referencesAuthUsers: Boolean(view.referencesAuthUsers),
      });
    }
  }

  return {
    schemaVersion: 1,
    nodes: [...nodes.values()].sort((a, b) => a.id.localeCompare(b.id)),
    edges: [...edges.values()].sort((a, b) => edgeKey(a).localeCompare(edgeKey(b))),
  };
}
