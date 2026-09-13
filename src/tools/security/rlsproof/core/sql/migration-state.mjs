import { normalizeQualifiedName, normalizeRole, parseQualifiedName, splitCommaList, unquoteIdentifier } from './normalize.mjs';
import { splitSqlStatements } from './splitter.mjs';

const IDENT = '(?:"[^"]+"|[A-Za-z_][A-Za-z0-9_$]*)';
const QUALIFIED = `(${IDENT})(?:\\.(${IDENT}))?`;

function stripLeadingComments(value) {
  let text = String(value ?? '');
  let previous;
  do {
    previous = text;
    text = text.replace(/^\s*(?:--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)/, '');
  } while (text !== previous);
  return text.trim();
}

function qualifiedFromMatch(first, second) {
  if (second) return normalizeQualifiedName(unquoteIdentifier(first), unquoteIdentifier(second));
  return normalizeQualifiedName('public', unquoteIdentifier(first));
}

function tableRecord(tables, name, location) {
  let table = tables.get(name);
  if (!table) {
    table = {
      name,
      createdAt: location,
      dropped: false,
      rlsEnabled: false,
      rlsForced: false,
      policies: new Set(),
    };
    tables.set(name, table);
  }
  return table;
}

function expressionAt(text, clausePattern) {
  const match = clausePattern.exec(text);
  if (!match) return null;
  const open = text.indexOf('(', match.index + match[0].length - 1);
  if (open < 0) return null;

  let depth = 0;
  let state = 'normal';
  let dollarTag = null;
  for (let index = open; index < text.length; index += 1) {
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
    if (state === 'dollar') {
      if (dollarTag && text.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        state = 'normal';
        dollarTag = null;
      }
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
    if (char === '$') {
      const tagMatch = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.exec(text.slice(index));
      if (tagMatch) {
        dollarTag = tagMatch[0];
        state = 'dollar';
        index += dollarTag.length - 1;
        continue;
      }
    }
    if (char === '(') depth += 1;
    if (char === ')') {
      depth -= 1;
      if (depth === 0) return text.slice(open + 1, index).trim();
    }
  }
  return null;
}

function parsePolicy(statement, location) {
  const policyRegex = new RegExp(`^create\\s+policy\\s+(${IDENT})\\s+on\\s+${QUALIFIED}`, 'i');
  const match = policyRegex.exec(statement);
  if (!match) return null;

  const name = unquoteIdentifier(match[1]);
  const table = qualifiedFromMatch(match[2], match[3]);
  const command = /\bfor\s+(select|insert|update|delete|all)\b/i.exec(statement)?.[1]?.toLowerCase() ?? 'all';
  const mode = /\bas\s+(restrictive|permissive)\b/i.exec(statement)?.[1]?.toLowerCase() ?? 'permissive';
  const roleMatch = /\bto\s+([\s\S]*?)(?=\s+using\s*\(|\s+with\s+check\s*\(|\s*;?\s*$)/i.exec(statement);
  const roles = roleMatch
    ? splitCommaList(roleMatch[1]).map(normalizeRole).filter(Boolean)
    : [];
  const using = expressionAt(statement, /\busing\s*\(/i);
  const withCheck = expressionAt(statement, /\bwith\s+check\s*\(/i);

  return {
    key: `${table}::${name}`,
    name,
    table,
    command,
    mode,
    roles,
    using,
    withCheck,
    path: location.path,
    line: location.line,
    raw: statement,
  };
}

function parseGrant(statement, location, revoke = false) {
  const schemaWide = new RegExp(`^(?:grant|revoke)\\s+([\\s\\S]+?)\\s+on\\s+all\\s+tables\\s+in\\s+schema\\s+(${IDENT})\\s+(?:to|from)\\s+([\\s\\S]*?);?$`, 'i').exec(statement);
  if (schemaWide) {
    const privileges = splitCommaList(schemaWide[1]).map((value) => value.toLowerCase());
    const schema = unquoteIdentifier(schemaWide[2]);
    const grantees = splitCommaList(schemaWide[3]).map(normalizeRole).filter(Boolean);
    return grantees.map((grantee) => ({
      privileges,
      object: `${schema}.*`,
      objectType: 'all-tables-in-schema',
      grantee,
      revoke,
      path: location.path,
      line: location.line,
      raw: statement,
    }));
  }

  const objectGrant = new RegExp(`^(?:grant|revoke)\\s+([\\s\\S]+?)\\s+on\\s+(?:table\\s+)?${QUALIFIED}\\s+(?:to|from)\\s+([\\s\\S]*?);?$`, 'i').exec(statement);
  if (!objectGrant) return null;
  const privileges = splitCommaList(objectGrant[1]).map((value) => value.toLowerCase());
  const object = qualifiedFromMatch(objectGrant[2], objectGrant[3]);
  const grantees = splitCommaList(objectGrant[4]).map(normalizeRole).filter(Boolean);
  return grantees.map((grantee) => ({
    privileges,
    object,
    objectType: 'table',
    grantee,
    revoke,
    path: location.path,
    line: location.line,
    raw: statement,
  }));
}

function applyRevoke(grants, revocation) {
  const revokeAll = revocation.privileges.some((item) => item === 'all' || item === 'all privileges');
  for (let index = grants.length - 1; index >= 0; index -= 1) {
    const grant = grants[index];
    if (grant.object !== revocation.object || grant.grantee !== revocation.grantee) continue;
    if (revokeAll) {
      grants.splice(index, 1);
      continue;
    }
    grant.privileges = grant.privileges.filter((item) => !revocation.privileges.includes(item));
    if (grant.privileges.length === 0) grants.splice(index, 1);
  }
}

function parseFunction(statement, location) {
  const regex = new RegExp(`^create\\s+(?:or\\s+replace\\s+)?function\\s+${QUALIFIED}\\s*\\(`, 'i');
  const match = regex.exec(statement);
  if (!match) return null;
  const name = qualifiedFromMatch(match[1], match[2]);
  const securityDefiner = /\bsecurity\s+definer\b/i.test(statement);
  const searchPathMatch = /\bset\s+(?:local\s+)?search_path\s*(?:=|to)\s*((?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*)(?:\s*,\s*(?:"(?:[^"]|"")*"|[A-Za-z_][A-Za-z0-9_$]*))*)/i.exec(statement);
  return {
    name,
    securityDefiner,
    searchPath: searchPathMatch?.[1]?.trim().replace(/\s*,\s*/g, ', ') ?? null,
    path: location.path,
    line: location.line,
    raw: statement,
  };
}

function parseView(statement, location, materialized = false) {
  const prefix = materialized ? 'materialized\\s+view' : 'view';
  const regex = new RegExp(`^create\\s+(?:or\\s+replace\\s+)?${prefix}\\s+${QUALIFIED}`, 'i');
  const match = regex.exec(statement);
  if (!match) return null;
  return {
    name: qualifiedFromMatch(match[1], match[2]),
    securityInvoker: /security_invoker\s*=\s*(?:true|on)/i.test(statement),
    referencesAuthUsers: /\bauth\s*\.\s*users\b/i.test(statement),
    path: location.path,
    line: location.line,
    raw: statement,
  };
}

function securityRelevant(statement) {
  return /row\s+level\s+security|\bpolicy\b|\bgrant\b|\brevoke\b|security\s+definer|\b(?:materialized\s+)?view\b/i.test(statement);
}

export function buildMigrationState(sqlFiles) {
  const tables = new Map();
  const policies = new Map();
  const functions = new Map();
  const views = new Map();
  const materializedViews = new Map();
  const grants = [];
  const transitions = [];
  const parseWarnings = [];

  const orderedFiles = [...(Array.isArray(sqlFiles) ? sqlFiles : [])]
    .filter((file) => file && typeof file.path === 'string')
    .sort((a, b) => a.path.localeCompare(b.path));

  for (const file of orderedFiles) {
    for (const fragment of splitSqlStatements(file.text, file.path)) {
      const statement = stripLeadingComments(fragment.text);
      if (!statement) continue;
      const location = { path: fragment.path, line: fragment.line };
      let recognized = false;

      const createTable = new RegExp(`^create\\s+(?:unlogged\\s+)?table\\s+(?:if\\s+not\\s+exists\\s+)?${QUALIFIED}`, 'i').exec(statement);
      if (createTable) {
        const name = qualifiedFromMatch(createTable[1], createTable[2]);
        tables.set(name, {
          name,
          createdAt: location,
          dropped: false,
          rlsEnabled: false,
          rlsForced: false,
          policies: new Set(),
        });
        transitions.push({ type: 'table-create', object: name, ...location });
        recognized = true;
      }

      const dropTable = new RegExp(`^drop\\s+table\\s+(?:if\\s+exists\\s+)?${QUALIFIED}`, 'i').exec(statement);
      if (dropTable) {
        const name = qualifiedFromMatch(dropTable[1], dropTable[2]);
        const table = tableRecord(tables, name, location);
        table.dropped = true;
        transitions.push({ type: 'table-drop', object: name, ...location });
        recognized = true;
      }

      const alterRls = new RegExp(`^alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:only\\s+)?${QUALIFIED}\\s+(enable|disable|force|no\\s+force)\\s+row\\s+level\\s+security`, 'i').exec(statement);
      if (alterRls) {
        const name = qualifiedFromMatch(alterRls[1], alterRls[2]);
        const action = alterRls[3].toLowerCase().replace(/\s+/g, ' ');
        const table = tableRecord(tables, name, location);
        if (action === 'enable') table.rlsEnabled = true;
        else if (action === 'disable') table.rlsEnabled = false;
        else if (action === 'force') table.rlsForced = true;
        else if (action === 'no force') table.rlsForced = false;
        transitions.push({ type: `rls-${action.replace(' ', '-')}`, object: name, ...location });
        recognized = true;
      }

      const policy = parsePolicy(statement, location);
      if (policy) {
        policies.set(policy.key, policy);
        const table = tableRecord(tables, policy.table, location);
        table.policies.add(policy.key);
        transitions.push({ type: 'policy-create', object: policy.key, ...location });
        recognized = true;
      }

      const dropPolicy = new RegExp(`^drop\\s+policy\\s+(?:if\\s+exists\\s+)?(${IDENT})\\s+on\\s+${QUALIFIED}`, 'i').exec(statement);
      if (dropPolicy) {
        const policyName = unquoteIdentifier(dropPolicy[1]);
        const tableName = qualifiedFromMatch(dropPolicy[2], dropPolicy[3]);
        const key = `${tableName}::${policyName}`;
        policies.delete(key);
        tables.get(tableName)?.policies.delete(key);
        transitions.push({ type: 'policy-drop', object: key, ...location });
        recognized = true;
      }

      if (/^grant\b/i.test(statement)) {
        const parsed = parseGrant(statement, location, false);
        if (parsed) {
          grants.push(...parsed);
          transitions.push(...parsed.map((grant) => ({ type: 'grant', object: grant.object, grantee: grant.grantee, ...location })));
          recognized = true;
        }
      }

      if (/^revoke\b/i.test(statement)) {
        const parsed = parseGrant(statement, location, true);
        if (parsed) {
          for (const revocation of parsed) applyRevoke(grants, revocation);
          transitions.push(...parsed.map((grant) => ({ type: 'revoke', object: grant.object, grantee: grant.grantee, ...location })));
          recognized = true;
        }
      }

      const fn = parseFunction(statement, location);
      if (fn) {
        functions.set(fn.name, fn);
        recognized = true;
      }

      const materialized = parseView(statement, location, true);
      if (materialized) {
        materializedViews.set(materialized.name, materialized);
        recognized = true;
      } else {
        const view = parseView(statement, location, false);
        if (view) {
          views.set(view.name, view);
          recognized = true;
        }
      }

      if (!recognized && securityRelevant(statement)) {
        parseWarnings.push({
          code: 'security_statement_unparsed',
          message: 'A security-relevant SQL statement was not fully modeled by the Wave 1 parser.',
          path: location.path,
          line: location.line,
        });
      }
    }
  }

  return {
    tables,
    policies,
    functions,
    views,
    materializedViews,
    grants,
    transitions,
    parseWarnings,
  };
}

export function stateSummary(state) {
  return {
    tables: [...state.tables.values()].filter((table) => !table.dropped).length,
    policies: state.policies.size,
    functions: state.functions.size,
    views: state.views.size,
    materializedViews: state.materializedViews.size,
    grants: state.grants.length,
    transitions: state.transitions.length,
    parseWarnings: state.parseWarnings.length,
  };
}

export function findTable(state, value) {
  const name = parseQualifiedName(value);
  return name ? state.tables.get(name) ?? null : null;
}
