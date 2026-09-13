const SUPPORTED_COMMANDS = new Set(['select', 'insert', 'update', 'delete', 'all']);

function stripOuterParens(value) {
  let text = String(value ?? '').trim();
  let changed = true;

  while (changed && text.startsWith('(') && text.endsWith(')')) {
    changed = false;
    let depth = 0;
    let state = 'normal';
    let enclosesWholeExpression = true;

    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];
      const next = text[index + 1];

      if (state === 'single') {
        if (char === "'" && next === "'") index += 1;
        else if (char === "'") state = 'normal';
        continue;
      }
      if (state === 'double') {
        if (char === '"' && next === '"') index += 1;
        else if (char === '"') state = 'normal';
        continue;
      }
      if (char === "'") {
        state = 'single';
        continue;
      }
      if (char === '"') {
        state = 'double';
        continue;
      }
      if (char === '(') depth += 1;
      else if (char === ')') depth -= 1;

      if (depth === 0 && index < text.length - 1) {
        enclosesWholeExpression = false;
        break;
      }
    }

    if (enclosesWholeExpression && depth === 0) {
      text = text.slice(1, -1).trim();
      changed = true;
    }
  }

  return text;
}

function normalizeExpression(value) {
  if (value == null) return null;
  let text = stripOuterParens(value).toLowerCase().replace(/\s+/g, ' ').trim();
  text = text.replace(/\(\s*select\s+auth\s*\.\s*uid\s*\(\s*\)\s*\)/gi, 'auth.uid()');
  text = text.replace(/\s*=\s*/g, '=');
  return stripOuterParens(text);
}

function normalizeIdentity(value) {
  const normalized = normalizeExpression(value ?? 'auth.uid()');
  return normalized || 'auth.uid()';
}

function normalizeColumn(value) {
  return String(value ?? '').trim().toLowerCase();
}

function isAlwaysTrue(value) {
  const normalized = normalizeExpression(value);
  return normalized === 'true' || normalized === '1=1';
}

function isExactIdentityEquality(value, identity, column) {
  const normalized = normalizeExpression(value);
  if (!normalized || !identity || !column) return false;
  return normalized === `${identity}=${column}` || normalized === `${column}=${identity}`;
}

function effectivePredicates(policy) {
  const command = String(policy?.command ?? 'all').trim().toLowerCase();
  const using = policy?.using ?? null;
  const withCheck = policy?.withCheck ?? null;

  if (command === 'select' || command === 'delete') {
    return [{ kind: 'using', value: using ?? 'true' }];
  }

  if (command === 'insert') {
    return [{ kind: 'withCheck', value: withCheck ?? 'true' }];
  }

  if (command === 'update' || command === 'all') {
    const effectiveUsing = using ?? 'true';
    return [
      { kind: 'using', value: effectiveUsing },
      { kind: 'withCheck', value: withCheck ?? effectiveUsing },
    ];
  }

  return [];
}

function result(status, operation, identity, column, checks, reason) {
  return {
    schemaVersion: 1,
    status,
    operation,
    identity,
    column,
    checks,
    reason,
  };
}

export function proveSinglePolicyIsolation(policy, options = {}) {
  if (!policy || typeof policy !== 'object') throw new TypeError('policy must be an object');

  const operation = String(policy.command ?? 'all').trim().toLowerCase();
  const identity = normalizeIdentity(options.identity);
  const column = normalizeColumn(options.column);

  if (!column) throw new TypeError('options.column is required');

  if (!SUPPORTED_COMMANDS.has(operation)) {
    return result('UNVERIFIED', operation, identity, column, [], 'unsupported-command');
  }

  const predicates = effectivePredicates(policy);
  const checks = predicates.map((predicate) => {
    const normalized = normalizeExpression(predicate.value);
    let outcome = 'unsupported';
    if (isAlwaysTrue(predicate.value)) outcome = 'open';
    else if (isExactIdentityEquality(predicate.value, identity, column)) outcome = 'identity-equality';
    return {
      kind: predicate.kind,
      expression: normalized,
      outcome,
    };
  });

  if (checks.some((check) => check.outcome === 'open')) {
    return result('LEAK', operation, identity, column, checks, 'required-predicate-is-open');
  }

  if (checks.length > 0 && checks.every((check) => check.outcome === 'identity-equality')) {
    return result('PROVEN', operation, identity, column, checks, 'exact-identity-equality');
  }

  return result('UNVERIFIED', operation, identity, column, checks, 'predicate-outside-symbolic-subset');
}
