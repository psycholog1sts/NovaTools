import { makeFinding } from '../finding.mjs';

function finding(rule, object, title, evidence, remediation, fingerprintSource = object.name) {
  return makeFinding({
    engine: 'native',
    rule: rule.id,
    severity: rule.severity,
    title,
    path: object.path,
    line: object.line,
    evidence,
    fingerprintSource,
    remediation,
  });
}

export const functionViewRules = Object.freeze([
  {
    id: 'supabase-public-security-definer',
    title: 'SECURITY DEFINER function in exposed schema',
    severity: 'high',
    evaluate({ state }) {
      return [...state.functions.values()]
        .filter((fn) => fn.name.startsWith('public.') && fn.securityDefiner)
        .map((fn) => finding(
          this,
          fn,
          `SECURITY DEFINER function is created in exposed public schema: ${fn.name}`,
          `${fn.name} executes with function-owner privileges`,
          'Prefer a non-exposed schema for privileged helpers, pin search_path, and revoke EXECUTE from roles that do not require the function.',
        ));
    },
  },
  {
    id: 'supabase-security-definer-search-path',
    title: 'SECURITY DEFINER function lacks pinned search_path',
    severity: 'high',
    evaluate({ state }) {
      return [...state.functions.values()]
        .filter((fn) => fn.securityDefiner && !fn.searchPath)
        .map((fn) => finding(
          this,
          fn,
          `SECURITY DEFINER function does not pin search_path: ${fn.name}`,
          'No SET search_path clause was modeled on the function definition',
          'Set an explicit trusted search_path (or empty search_path with fully qualified objects) to reduce object-shadowing privilege-escalation risk.',
          `${fn.name}:search-path`,
        ));
    },
  },
  {
    id: 'supabase-public-view-without-security-invoker',
    title: 'Public view may bypass caller RLS',
    severity: 'high',
    evaluate({ state }) {
      return [...state.views.values()]
        .filter((view) => view.name.startsWith('public.') && !view.securityInvoker)
        .map((view) => finding(
          this,
          view,
          `Public view may bypass underlying RLS policies: ${view.name}`,
          `${view.name} was created without security_invoker = true`,
          'On PostgreSQL 15+, use security_invoker = true when the caller\'s RLS must apply; otherwise revoke client access or move the view out of an exposed schema.',
        ));
    },
  },
  {
    id: 'supabase-public-view-auth-users',
    title: 'Public view references auth.users',
    severity: 'critical',
    evaluate({ state }) {
      return [...state.views.values()]
        .filter((view) => view.name.startsWith('public.') && view.referencesAuthUsers)
        .map((view) => finding(
          this,
          view,
          `Public view references auth.users: ${view.name}`,
          `${view.name} contains a reference to auth.users`,
          'Do not expose auth.users through a public view. Project only the minimum non-sensitive fields through a protected server path or tightly scoped security-invoker view.',
        ));
    },
  },
  {
    id: 'supabase-public-materialized-view',
    title: 'Materialized view in exposed public schema',
    severity: 'high',
    evaluate({ state }) {
      return [...state.materializedViews.values()]
        .filter((view) => view.name.startsWith('public.'))
        .map((view) => finding(
          this,
          view,
          `Materialized view is present in exposed public schema: ${view.name}`,
          `${view.name} is a public materialized view; PostgreSQL materialized views do not carry row-level policies like tables`,
          'Move sensitive materialized views out of exposed schemas or strictly revoke client roles and expose only a reviewed RLS-safe interface.',
        ));
    },
  },
]);
