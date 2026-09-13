const RANK = { safe: 0, breaking: 1, requires_review: 2, dangerous: 3 };
const VERDICT = { safe: 'SAFE', breaking: 'BREAKING', requires_review: 'REQUIRES_REVIEW', dangerous: 'DANGEROUS' };

function assertReport(report) {
  if (!report || !Array.isArray(report.changes)) throw new TypeError('semantic report must contain changes');
  for (const change of report.changes) {
    if (!/^rdc_[a-f0-9]{24}$/.test(change?.id ?? '')) throw new TypeError('semantic report contains an invalid change id');
    if (!(change.classification in RANK)) throw new TypeError('semantic report contains an invalid classification');
  }
}

function normalizeBaseline(baseline) {
  if (baseline == null) return { provided: false, changeIds: [] };
  if (baseline.schemaVersion !== 1 || !Array.isArray(baseline.changeIds)) throw new TypeError('baseline schema is invalid');
  const ids = [...new Set(baseline.changeIds)];
  if (ids.some((id) => !/^rdc_[a-f0-9]{24}$/.test(id))) throw new TypeError('baseline contains an invalid change id');
  return { provided: true, changeIds: ids };
}

function empty() {
  return { safe: 0, breaking: 0, requiresReview: 0, dangerous: 0 };
}

function verdict(changes) {
  let worst = 'safe';
  for (const change of changes) if (RANK[change.classification] > RANK[worst]) worst = change.classification;
  return VERDICT[worst];
}

export function createRegressionBaseline(report) {
  assertReport(report);
  return {
    schemaVersion: 1,
    sourceReportVersion: report.schemaVersion ?? null,
    generatedAt: new Date().toISOString(),
    changeIds: report.changes.filter((c) => c.classification !== 'safe').map((c) => c.id).sort(),
  };
}

export function buildCiRegressionReport(report, baseline = null) {
  assertReport(report);
  const normalized = normalizeBaseline(baseline);
  const baselineIds = new Set(normalized.changeIds);
  const reportIds = new Set(report.changes.map((c) => c.id));
  const changes = report.changes.map((c) => ({ ...c, baselineState: baselineIds.has(c.id) ? 'existing' : 'new' }));
  const summary = { new: empty(), existing: empty() };
  for (const change of changes) {
    const bucket = summary[change.baselineState];
    const key = change.classification === 'requires_review' ? 'requiresReview' : change.classification;
    bucket[key] += 1;
  }
  return {
    schemaVersion: 1,
    sourceReportVersion: report.schemaVersion ?? null,
    generatedAt: new Date().toISOString(),
    originalVerdict: report.verdict ?? verdict(report.changes),
    verdict: verdict(changes.filter((c) => c.baselineState === 'new')),
    summary,
    baseline: {
      provided: normalized.provided,
      matchedChangeIds: normalized.changeIds.filter((id) => reportIds.has(id)),
      staleChangeIds: normalized.changeIds.filter((id) => !reportIds.has(id)),
    },
    changes,
  };
}

export function toSarif(ciReport) {
  const active = (ciReport?.changes ?? []).filter((c) => c.baselineState === 'new' && c.classification !== 'safe');
  const rules = [...new Map(active.map((c) => [`rlsproof.diff.${c.kind}`, {
    id: `rlsproof.diff.${c.kind}`,
    name: c.kind,
    shortDescription: { text: `RLSProof semantic regression: ${c.kind}` },
  }])).values()];
  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [{
      tool: { driver: { name: 'RLSProof', rules } },
      results: active.map((c) => ({
        ruleId: `rlsproof.diff.${c.kind}`,
        level: c.classification === 'dangerous' ? 'error' : c.classification === 'safe' ? 'note' : 'warning',
        message: { text: String(c.message ?? c.kind) },
        partialFingerprints: { rlsproofChangeId: c.id },
        properties: { classification: c.classification, object: c.object ?? null, baselineState: c.baselineState },
      })),
    }],
  };
}

export function derivePrVerdict(ciReport) {
  if (ciReport?.verdict === 'SAFE') return { verdict: 'SAFE', checkConclusion: 'success', mergePolicy: 'allow' };
  if (ciReport?.verdict === 'BREAKING') return { verdict: 'BREAKING', checkConclusion: 'neutral', mergePolicy: 'review' };
  if (ciReport?.verdict === 'DANGEROUS') return { verdict: 'DANGEROUS', checkConclusion: 'failure', mergePolicy: 'block' };
  return { verdict: 'REQUIRES_REVIEW', checkConclusion: 'action_required', mergePolicy: 'block' };
}
