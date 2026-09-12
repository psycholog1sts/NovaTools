export function buildCoverage({ state, scope, source = 'virtual-files' } = {}) {
  const reasons = ['bounded-static-analysis'];

  if (Array.isArray(state?.parseWarnings) && state.parseWarnings.length > 0) {
    reasons.push('security-relevant-sql-not-fully-modeled');
  }
  if (scope?.truncated === true) reasons.push('input-truncated-by-safety-limits');
  for (const reason of scope?.reasons ?? []) {
    if (!reasons.includes(reason)) reasons.push(reason);
  }

  return {
    complete: false,
    source,
    reasons,
    parser: {
      backend: 'wave1-deterministic-state-machine',
      warnings: state?.parseWarnings?.length ?? 0,
    },
    limitations: [
      'No live database catalog introspection is performed.',
      'No symbolic tenant-isolation proof is performed in Wave 1.',
      'No full interprocedural application-code dataflow analysis is performed.',
    ],
  };
}
