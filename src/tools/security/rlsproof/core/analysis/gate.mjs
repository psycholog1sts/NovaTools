export function releaseGateForFindings(findings) {
  const unresolved = (Array.isArray(findings) ? findings : [])
    .filter((finding) => finding?.verification !== 'resolved');
  return unresolved.some((finding) => finding.severity === 'critical' || finding.severity === 'high')
    ? 'blocked'
    : 'incomplete';
}

export function severitySummary(findings) {
  const summary = { critical: 0, high: 0, medium: 0, low: 0, info: 0, total: 0 };
  for (const finding of Array.isArray(findings) ? findings : []) {
    if (Object.hasOwn(summary, finding.severity)) summary[finding.severity] += 1;
    summary.total += 1;
  }
  return summary;
}
