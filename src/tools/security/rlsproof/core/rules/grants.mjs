import { makeFinding } from '../finding.mjs';

const WRITE_PRIVILEGES = new Set(['insert', 'update', 'delete', 'truncate']);
const CLIENT_ROLES = new Set(['anon', 'authenticated', 'public']);

function hasWrite(grant) {
  return grant.privileges.some((item) => WRITE_PRIVILEGES.has(item) || item === 'all' || item === 'all privileges');
}

function hasAll(grant) {
  return grant.privileges.some((item) => item === 'all' || item === 'all privileges');
}

function finding(rule, grant, title, evidence, remediation, suffix = '') {
  return makeFinding({
    engine: 'native',
    rule: rule.id,
    severity: rule.severity,
    title,
    path: grant.path,
    line: grant.line,
    evidence,
    fingerprintSource: `${grant.object}:${grant.grantee}:${grant.privileges.join(',')}:${suffix}`,
    remediation,
  });
}

export const grantRules = Object.freeze([
  {
    id: 'supabase-anon-write-grant',
    title: 'Anonymous role has direct write grant',
    severity: 'critical',
    evaluate({ state }) {
      return state.grants
        .filter((grant) => grant.grantee === 'anon' && hasWrite(grant))
        .map((grant) => finding(
          this,
          grant,
          `anon has direct write privileges on ${grant.object}`,
          `Privileges: ${grant.privileges.join(', ')}`,
          'Revoke unnecessary direct write privileges from anon and expose writes only through narrowly scoped RLS policies or trusted server paths.',
        ));
    },
  },
  {
    id: 'supabase-public-write-grant',
    title: 'PUBLIC role has direct write grant',
    severity: 'critical',
    evaluate({ state }) {
      return state.grants
        .filter((grant) => grant.grantee === 'public' && hasWrite(grant))
        .map((grant) => finding(
          this,
          grant,
          `PUBLIC has direct write privileges on ${grant.object}`,
          `Privileges: ${grant.privileges.join(', ')}`,
          'Revoke write privileges from PUBLIC and grant only the minimum privileges to explicit application roles.',
        ));
    },
  },
  {
    id: 'supabase-grant-all-client-role',
    title: 'Client-reachable role receives GRANT ALL',
    severity: 'high',
    evaluate({ state }) {
      return state.grants
        .filter((grant) => CLIENT_ROLES.has(grant.grantee) && hasAll(grant))
        .map((grant) => finding(
          this,
          grant,
          `${grant.grantee} receives ALL privileges on ${grant.object}`,
          'GRANT ALL includes broader privileges than typical Data API use requires',
          'Replace GRANT ALL with an explicit least-privilege list such as SELECT/INSERT/UPDATE/DELETE only where required and protected by RLS.',
        ));
    },
  },
  {
    id: 'supabase-schema-wide-client-grant',
    title: 'Client role receives schema-wide table privileges',
    severity: 'high',
    evaluate({ state }) {
      return state.grants
        .filter((grant) => grant.objectType === 'all-tables-in-schema' && CLIENT_ROLES.has(grant.grantee))
        .map((grant) => finding(
          this,
          grant,
          `${grant.grantee} receives privileges on all tables in ${grant.object}`,
          `Schema-wide privileges: ${grant.privileges.join(', ')}`,
          'Avoid schema-wide grants for client-reachable roles; grant only required privileges on reviewed objects so future tables are not exposed automatically.',
        ));
    },
  },
]);
