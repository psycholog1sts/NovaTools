import { makeFinding } from '../finding.mjs';

function activeTables(state) {
  return [...state.tables.values()].filter((table) => !table.dropped && table.name.startsWith('public.'));
}

export const tableRules = Object.freeze([
  {
    id: 'supabase-public-table-without-rls',
    title: 'Public table without Row Level Security',
    severity: 'high',
    evaluate({ state }) {
      return activeTables(state)
        .filter((table) => !table.rlsEnabled)
        .map((table) => makeFinding({
          engine: 'native',
          rule: this.id,
          severity: this.severity,
          title: `Public Supabase table may be exposed without RLS: ${table.name}`,
          path: table.createdAt?.path,
          line: table.createdAt?.line,
          evidence: `${table.name} exists in final migration state with RLS disabled`,
          fingerprintSource: table.name,
          remediation: `Enable ROW LEVEL SECURITY on ${table.name} and define least-privilege policies before exposing it through the Data API.`,
        }));
    },
  },
  {
    id: 'supabase-rls-explicitly-disabled',
    title: 'RLS explicitly disabled by a migration',
    severity: 'critical',
    evaluate({ state }) {
      const findings = [];
      for (const table of activeTables(state)) {
        if (table.rlsEnabled) continue;
        const transition = [...state.transitions]
          .reverse()
          .find((item) => item.object === table.name && (item.type === 'rls-disable' || item.type === 'rls-enable'));
        if (transition?.type !== 'rls-disable') continue;
        findings.push(makeFinding({
          engine: 'native',
          rule: this.id,
          severity: this.severity,
          title: `A later migration disables RLS on ${table.name}`,
          path: transition.path,
          line: transition.line,
          evidence: `Final RLS transition for ${table.name} is DISABLE ROW LEVEL SECURITY`,
          fingerprintSource: `${table.name}:disable`,
          remediation: `Remove the RLS disable regression or add a later verified ENABLE ROW LEVEL SECURITY migration for ${table.name}.`,
        }));
      }
      return findings;
    },
  },
  {
    id: 'supabase-rls-enabled-without-policy',
    title: 'RLS enabled without an active policy',
    severity: 'medium',
    evaluate({ state }) {
      return activeTables(state)
        .filter((table) => table.rlsEnabled && table.policies.size === 0)
        .map((table) => makeFinding({
          engine: 'native',
          rule: this.id,
          severity: this.severity,
          title: `RLS is enabled but no policy is modeled for ${table.name}`,
          path: table.createdAt?.path,
          line: table.createdAt?.line,
          evidence: `${table.name} has RLS enabled with zero active modeled policies`,
          fingerprintSource: `${table.name}:no-policy`,
          remediation: 'Confirm deny-by-default is intentional or add explicit least-privilege policies for the operations the application requires.',
        }));
    },
  },
  {
    id: 'supabase-public-table-without-force-rls',
    title: 'Public table does not force RLS for table owners',
    severity: 'info',
    evaluate({ state }) {
      return activeTables(state)
        .filter((table) => table.rlsEnabled && !table.rlsForced)
        .map((table) => makeFinding({
          engine: 'native',
          rule: this.id,
          severity: this.severity,
          title: `RLS is not forced for table owners on ${table.name}`,
          path: table.createdAt?.path,
          line: table.createdAt?.line,
          evidence: `${table.name} is RLS-enabled but FORCE ROW LEVEL SECURITY was not observed`,
          fingerprintSource: `${table.name}:no-force`,
          remediation: 'Consider FORCE ROW LEVEL SECURITY when owner-bypass is not required, especially in test and service-role threat models.',
        }));
    },
  },
]);
