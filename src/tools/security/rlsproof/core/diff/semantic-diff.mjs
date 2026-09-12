import { buildMigrationState, stateSummary } from '../sql/migration-state.mjs';

const CLIENT_ROLES = new Set(['anon', 'authenticated', 'public']);
const WRITE_PRIVILEGES = new Set(['insert', 'update', 'delete', 'truncate', 'references', 'trigger', 'all', 'all privileges']);
const CLASSIFICATION_RANK = Object.freeze({ safe: 0, breaking: 1, requires_review: 2, dangerous: 3 });

function sqlFiles(files) {
  if (!Array.isArray(files)) throw new TypeError('files must be an array');
  return files
    .filter((file) => file && typeof file.path === 'string' && file.path.toLowerCase().endsWith('.sql'))
    .map((file) => ({ path: file.path, text: typeof file.text === 'string' ? file.text : '' }));
}

function liveTables(state) {
  return new Map([...state.tables].filter(([, table]) => !table.dropped));
}

function normalizeExpression(value) {
  if (value == null) return null;
  let text = String(value).trim().replace(/\s+/g, ' ');
  let changed = true;
  while (changed && text.startsWith('(') && text.endsWith(')')) {
    changed = false;
    let depth = 0;
    let enclosesWholeExpression = true;
    for (let index = 0; index < text.length; index += 1) {
      if (text[index] === '(') depth += 1;
      else if (text[index] === ')') depth -= 1;
      if (depth === 0 && index < text.length - 1) {
        enclosesWholeExpression = false;
        break;
      }
    }
    if (enclosesWholeExpression && depth === 0) {
      text = text.slice(1, -1).trim().replace(/\s+/g, ' ');
      changed = true;
    }
  }
  return text.toLowerCase();
}

function isAlwaysTrue(value) {
  const normalized = normalizeExpression(value);
  return normalized === 'true' || normalized === '1 = 1' || normalized === '1=1';
}

function change(kind, classification, object, message, before = null, after = null) {
  return { kind, classification, object, message, before, after };
}

function worstClassification(...values) {
  return values.filter(Boolean).reduce((worst, value) => (
    CLASSIFICATION_RANK[value] > CLASSIFICATION_RANK[worst] ? value : worst
  ), 'safe');
}

function predicateClassification(before, after) {
  const left = normalizeExpression(before);
  const right = normalizeExpression(after);
  if (left === right) return null;

  if (!isAlwaysTrue(left) && isAlwaysTrue(right)) return 'dangerous';
  if (isAlwaysTrue(left) && !isAlwaysTrue(right)) return 'breaking';

  if (left == null && right != null) return 'breaking';
  if (left != null && right == null) return 'dangerous';
  return 'requires_review';
}

function compareTables(baseState, headState, changes) {
  const baseTables = liveTables(baseState);
  const headTables = liveTables(headState);
  const names = new Set([...baseTables.keys(), ...headTables.keys()]);

  for (const name of [...names].sort()) {
    const before = baseTables.get(name);
    const after = headTables.get(name);

    if (!before && after) {
      changes.push(change(
        'table-added',
        after.rlsEnabled ? 'safe' : 'dangerous',
        name,
        after.rlsEnabled
          ? `Table ${name} was added with RLS enabled.`
          : `Table ${name} was added without RLS enabled.`,
        null,
        { rlsEnabled: after.rlsEnabled, rlsForced: after.rlsForced },
      ));
      continue;
    }
    if (before && !after) {
      changes.push(change('table-removed', 'breaking', name, `Table ${name} was removed.`, {
        rlsEnabled: before.rlsEnabled,
        rlsForced: before.rlsForced,
      }, null));
      continue;
    }
    if (!before || !after) continue;

    if (before.rlsEnabled && !after.rlsEnabled) {
      changes.push(change(
        'rls-disabled',
        'dangerous',
        name,
        `RLS was disabled on ${name}; row policies no longer protect client access.`,
        true,
        false,
      ));
    } else if (!before.rlsEnabled && after.rlsEnabled) {
      changes.push(change('rls-enabled', 'safe', name, `RLS was enabled on ${name}.`, false, true));
    }

    if (before.rlsForced && !after.rlsForced) {
      changes.push(change(
        'rls-force-removed',
        'requires_review',
        name,
        `FORCE ROW LEVEL SECURITY was removed from ${name}; owner-bypass behavior requires review.`,
        true,
        false,
      ));
    } else if (!before.rlsForced && after.rlsForced) {
      changes.push(change('rls-force-added', 'safe', name, `FORCE ROW LEVEL SECURITY was enabled on ${name}.`, false, true));
    }
  }
}

function roleSet(policy) {
  return new Set((policy?.roles ?? []).map((role) => String(role).toLowerCase()));
}

function comparePolicyShape(before, after) {
  const classifications = [];
  const notes = [];

  if (before.mode !== after.mode) {
    if (before.mode === 'restrictive' && after.mode === 'permissive') classifications.push('dangerous');
    else if (before.mode === 'permissive' && after.mode === 'restrictive') classifications.push('breaking');
    else classifications.push('requires_review');
    notes.push(`mode ${before.mode} -> ${after.mode}`);
  }

  if (before.command !== after.command) {
    classifications.push('requires_review');
    notes.push(`command ${before.command} -> ${after.command}`);
  }

  const beforeRoles = roleSet(before);
  const afterRoles = roleSet(after);
  const addedRoles = [...afterRoles].filter((role) => !beforeRoles.has(role));
  const removedRoles = [...beforeRoles].filter((role) => !afterRoles.has(role));
  if (addedRoles.length) {
    classifications.push(addedRoles.some((role) => CLIENT_ROLES.has(role)) ? 'dangerous' : 'requires_review');
    notes.push(`roles added: ${addedRoles.join(', ')}`);
  }
  if (removedRoles.length) {
    classifications.push('breaking');
    notes.push(`roles removed: ${removedRoles.join(', ')}`);
  }

  return classifications.length
    ? { classification: worstClassification(...classifications), notes }
    : null;
}

function comparePolicies(baseState, headState, changes) {
  const keys = new Set([...baseState.policies.keys(), ...headState.policies.keys()]);
  for (const key of [...keys].sort()) {
    const before = baseState.policies.get(key);
    const after = headState.policies.get(key);

    if (!before && after) {
      const classification = after.mode === 'restrictive' ? 'safe' : 'dangerous';
      changes.push(change(
        'policy-added',
        classification,
        key,
        `${after.mode === 'restrictive' ? 'Restrictive' : 'Permissive'} policy ${key} was added.`,
        null,
        { mode: after.mode, command: after.command, roles: after.roles, using: after.using, withCheck: after.withCheck },
      ));
      continue;
    }
    if (before && !after) {
      const classification = before.mode === 'restrictive' ? 'dangerous' : 'breaking';
      changes.push(change(
        'policy-removed',
        classification,
        key,
        `${before.mode === 'restrictive' ? 'Restrictive' : 'Permissive'} policy ${key} was removed.`,
        { mode: before.mode, command: before.command, roles: before.roles, using: before.using, withCheck: before.withCheck },
        null,
      ));
      continue;
    }
    if (!before || !after) continue;

    const shape = comparePolicyShape(before, after);
    if (shape) {
      changes.push(change(
        'policy-shape-changed',
        shape.classification,
        key,
        `Policy ${key} shape changed: ${shape.notes.join('; ')}.`,
        { mode: before.mode, command: before.command, roles: before.roles },
        { mode: after.mode, command: after.command, roles: after.roles },
      ));
    }

    const usingClassification = predicateClassification(before.using, after.using);
    const checkClassification = predicateClassification(before.withCheck, after.withCheck);
    if (usingClassification || checkClassification) {
      const classification = worstClassification(usingClassification, checkClassification);
      changes.push(change(
        'policy-predicate-changed',
        classification,
        key,
        `Policy ${key} predicate changed; classification is ${classification}.`,
        { using: before.using, withCheck: before.withCheck },
        { using: after.using, withCheck: after.withCheck },
      ));
    }
  }
}

function canonicalPrivilege(privilege) {
  const value = String(privilege ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  return value === 'all privileges' ? 'all' : value;
}

function grantKeys(state) {
  const result = new Map();
  for (const grant of state.grants) {
    const grantee = String(grant.grantee ?? '').toLowerCase();
    for (const rawPrivilege of grant.privileges ?? []) {
      const privilege = canonicalPrivilege(rawPrivilege);
      const key = `${grant.object}::${grantee}::${privilege}`;
      result.set(key, { object: grant.object, objectType: grant.objectType, grantee, privilege });
    }
  }
  return result;
}

function addedGrantClassification(grant) {
  if (!CLIENT_ROLES.has(grant.grantee)) return 'requires_review';
  if (WRITE_PRIVILEGES.has(grant.privilege)) return 'dangerous';
  return grant.privilege === 'select' ? 'requires_review' : 'requires_review';
}

function compareGrants(baseState, headState, changes) {
  const base = grantKeys(baseState);
  const head = grantKeys(headState);
  const keys = new Set([...base.keys(), ...head.keys()]);

  for (const key of [...keys].sort()) {
    const before = base.get(key);
    const after = head.get(key);
    if (!before && after) {
      const classification = addedGrantClassification(after);
      changes.push(change(
        'grant-added',
        classification,
        key,
        `${after.privilege.toUpperCase()} grant on ${after.object} was added for ${after.grantee}.`,
        null,
        after,
      ));
    } else if (before && !after) {
      const classification = CLIENT_ROLES.has(before.grantee) ? 'breaking' : 'requires_review';
      changes.push(change(
        'grant-removed',
        classification,
        key,
        `${before.privilege.toUpperCase()} grant on ${before.object} was removed from ${before.grantee}.`,
        before,
        null,
      ));
    }
  }
}

function addParserUncertainty(baseState, headState, changes) {
  if (baseState.parseWarnings.length === 0 && headState.parseWarnings.length === 0) return;
  changes.push(change(
    'parser-uncertainty',
    'requires_review',
    'analysis',
    'One or both snapshots contain security-relevant SQL that the deterministic migration model could not fully parse.',
    { parseWarnings: baseState.parseWarnings.length },
    { parseWarnings: headState.parseWarnings.length },
  ));
}

function summarize(changes) {
  return changes.reduce((summary, item) => {
    if (item.classification === 'requires_review') summary.requiresReview += 1;
    else summary[item.classification] += 1;
    return summary;
  }, { safe: 0, breaking: 0, requiresReview: 0, dangerous: 0 });
}

function verdictFor(summary) {
  if (summary.dangerous > 0) return 'DANGEROUS';
  if (summary.requiresReview > 0) return 'REQUIRES_REVIEW';
  if (summary.breaking > 0) return 'BREAKING';
  return 'SAFE';
}

export function analyzeSecurityDiff(baseFiles, headFiles) {
  const baseState = buildMigrationState(sqlFiles(baseFiles));
  const headState = buildMigrationState(sqlFiles(headFiles));
  const changes = [];

  compareTables(baseState, headState, changes);
  comparePolicies(baseState, headState, changes);
  compareGrants(baseState, headState, changes);
  addParserUncertainty(baseState, headState, changes);

  changes.sort((left, right) => {
    const object = String(left.object).localeCompare(String(right.object));
    if (object !== 0) return object;
    const kind = String(left.kind).localeCompare(String(right.kind));
    if (kind !== 0) return kind;
    return CLASSIFICATION_RANK[right.classification] - CLASSIFICATION_RANK[left.classification];
  });

  const summary = summarize(changes);
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    verdict: verdictFor(summary),
    summary,
    baseState: stateSummary(baseState),
    headState: stateSummary(headState),
    changes,
  };
}
