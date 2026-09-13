import { makeFinding } from '../finding.mjs';

function locationFinding(rule, policy, title, evidence, remediation, fingerprintSource = policy.key) {
  return makeFinding({
    engine: 'native',
    rule: rule.id,
    severity: rule.severity,
    title,
    path: policy.path,
    line: policy.line,
    evidence,
    fingerprintSource,
    remediation,
  });
}

function normalizedExpression(value) {
  return String(value ?? '').trim().replace(/^\((.*)\)$/s, '$1').trim();
}

function expressionIsTrue(value) {
  const normalized = normalizedExpression(value).replace(/[()\s]/g, '').toLowerCase();
  return normalized === 'true' || normalized === 'true::boolean';
}

function rolesForComparison(policy) {
  return policy.roles.length > 0 ? policy.roles : ['public'];
}

function commandsOverlap(a, b) {
  return a === 'all' || b === 'all' || a === b;
}

function rolesOverlap(a, b) {
  const left = new Set(rolesForComparison(a));
  const right = new Set(rolesForComparison(b));
  if (left.has('public') || right.has('public')) return true;
  for (const role of left) if (right.has(role)) return true;
  return false;
}

export const policyRules = Object.freeze([
  {
    id: 'supabase-policy-without-rls',
    title: 'Policy exists while RLS is disabled',
    severity: 'high',
    evaluate({ state }) {
      const findings = [];
      for (const policy of state.policies.values()) {
        const table = state.tables.get(policy.table);
        if (!table || table.dropped || table.rlsEnabled) continue;
        findings.push(locationFinding(
          this,
          policy,
          `Policy ${policy.name} is inert because RLS is disabled on ${policy.table}`,
          `${policy.table} has policy ${policy.name}, but final modeled RLS state is disabled`,
          `Enable ROW LEVEL SECURITY on ${policy.table}; a CREATE POLICY statement alone does not activate RLS.`,
        ));
      }
      return findings;
    },
  },
  {
    id: 'supabase-policy-using-true',
    title: 'Permissive policy uses USING (true)',
    severity: 'high',
    evaluate({ state }) {
      return [...state.policies.values()]
        .filter((policy) => expressionIsTrue(policy.using))
        .map((policy) => locationFinding(
          this,
          policy,
          `Policy ${policy.name} has an unconditional USING predicate`,
          'USING expression resolves to unconditional true',
          'Replace the unconditional predicate with explicit owner/tenant/role scoping, or document and isolate intentionally public data.',
        ));
    },
  },
  {
    id: 'supabase-policy-with-check-true',
    title: 'Write policy uses WITH CHECK (true)',
    severity: 'critical',
    evaluate({ state }) {
      return [...state.policies.values()]
        .filter((policy) => ['insert', 'update', 'all'].includes(policy.command) && expressionIsTrue(policy.withCheck))
        .map((policy) => locationFinding(
          this,
          policy,
          `Write policy ${policy.name} allows unrestricted new row values`,
          'WITH CHECK expression resolves to unconditional true',
          'Scope WITH CHECK to the authenticated owner/tenant boundary so inserts and updates cannot write rows outside the caller\'s authority.',
        ));
    },
  },
  {
    id: 'supabase-policy-missing-to',
    title: 'Policy omits explicit TO roles',
    severity: 'medium',
    evaluate({ state }) {
      return [...state.policies.values()]
        .filter((policy) => policy.roles.length === 0)
        .map((policy) => locationFinding(
          this,
          policy,
          `Policy ${policy.name} applies to PUBLIC because no TO role is declared`,
          'CREATE POLICY does not include an explicit TO role list',
          'Add an explicit TO authenticated/anon/custom-role clause matching the intended audience.',
        ));
    },
  },
  {
    id: 'supabase-policy-deprecated-auth-role',
    title: 'Policy uses auth.role()',
    severity: 'medium',
    evaluate({ state }) {
      return [...state.policies.values()]
        .filter((policy) => /\bauth\.role\s*\(\s*\)/i.test(policy.raw))
        .map((policy) => locationFinding(
          this,
          policy,
          'RLS policy uses deprecated auth.role()',
          'RLS policy calls auth.role(); policy text intentionally omitted',
          'Target Postgres roles with the policy TO clause and keep authorization predicates focused on row ownership/tenancy.',
        ));
    },
  },
  {
    id: 'supabase-policy-user-metadata-authorization',
    title: 'Policy trusts user-editable JWT metadata',
    severity: 'high',
    evaluate({ state }) {
      return [...state.policies.values()]
        .filter((policy) => /auth\.jwt\s*\(\s*\)[\s\S]*?(?:user_metadata|raw_user_meta_data)/i.test(policy.raw))
        .map((policy) => locationFinding(
          this,
          policy,
          'RLS policy may trust user-editable metadata for authorization',
          'Policy references user-editable JWT metadata; value intentionally omitted',
          'Authorize with server-controlled app_metadata/raw_app_meta_data or protected relational data instead of user-editable metadata.',
        ));
    },
  },
  {
    id: 'supabase-policy-auth-null-bypass',
    title: 'Policy contains auth function NULL bypass',
    severity: 'critical',
    evaluate({ state }) {
      const bypass = /(?:auth\.(?:uid|jwt)\s*\([^)]*\)\s+is\s+null\s+or\b|\bor\s+auth\.(?:uid|jwt)\s*\([^)]*\)\s+is\s+null)/i;
      return [...state.policies.values()]
        .filter((policy) => bypass.test(policy.using ?? ''))
        .map((policy) => locationFinding(
          this,
          policy,
          `Policy ${policy.name} can become true when auth context is NULL`,
          'USING predicate contains an auth function IS NULL disjunct joined with OR',
          'Remove the NULL-accepting OR branch and require an explicit authenticated ownership/tenant predicate.',
        ));
    },
  },
  {
    id: 'supabase-write-policy-missing-with-check',
    title: 'Write policy omits WITH CHECK',
    severity: 'medium',
    evaluate({ state }) {
      return [...state.policies.values()]
        .filter((policy) => ['insert', 'update', 'all'].includes(policy.command) && policy.withCheck == null)
        .map((policy) => locationFinding(
          this,
          policy,
          `Write-capable policy ${policy.name} has no explicit WITH CHECK predicate`,
          `Policy command is ${policy.command} and WITH CHECK was not modeled`,
          'Add an explicit WITH CHECK predicate that constrains the new row to the caller\'s owner/tenant boundary.',
        ));
    },
  },
  {
    id: 'supabase-policy-auth-function-per-row',
    title: 'Auth function may be evaluated per row',
    severity: 'low',
    evaluate({ state }) {
      const findings = [];
      for (const policy of state.policies.values()) {
        for (const [clause, expression] of [['USING', policy.using], ['WITH CHECK', policy.withCheck]]) {
          if (!expression || !/\bauth\.(?:uid|jwt)\s*\(/i.test(expression)) continue;
          if (/\(\s*select\s+auth\.(?:uid|jwt)\s*\(/i.test(expression)) continue;
          findings.push(locationFinding(
            this,
            policy,
            `${policy.name} may evaluate an auth function per row in ${clause}`,
            `${clause} uses auth.uid()/auth.jwt() without the cached SELECT form`,
            'For stable auth values, prefer `(select auth.uid())` / `(select auth.jwt())` where appropriate to avoid repeated per-row evaluation.',
            `${policy.key}:${clause}`,
          ));
        }
      }
      return findings;
    },
  },
  {
    id: 'supabase-duplicate-permissive-policy',
    title: 'Multiple permissive policies overlap',
    severity: 'medium',
    evaluate({ state }) {
      const policies = [...state.policies.values()].filter((policy) => policy.mode === 'permissive');
      const findings = [];
      const emitted = new Set();
      for (let leftIndex = 0; leftIndex < policies.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < policies.length; rightIndex += 1) {
          const left = policies[leftIndex];
          const right = policies[rightIndex];
          if (left.table !== right.table || !commandsOverlap(left.command, right.command) || !rolesOverlap(left, right)) continue;
          const key = `${left.table}:${[left.name, right.name].sort().join('+')}`;
          if (emitted.has(key)) continue;
          emitted.add(key);
          findings.push(locationFinding(
            this,
            right,
            `Permissive policies ${left.name} and ${right.name} overlap on ${left.table}`,
            'Postgres combines overlapping permissive policies with OR semantics',
            'Review whether both policies are necessary; use restrictive policies or narrower role/command scopes when every condition must hold.',
            key,
          ));
        }
      }
      return findings;
    },
  },
]);
