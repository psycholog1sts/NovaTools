import { analyzeSecurityDiff } from '../diff/semantic-diff.mjs';
import { buildCiRegressionReport, derivePrVerdict, toSarif } from './regression-ci.mjs';

const LEVEL = Object.freeze({ dangerous: 'error', requires_review: 'warning', breaking: 'warning', safe: 'notice' });

export function toGithubAnnotations(ciReport) {
  const changes = Array.isArray(ciReport?.changes) ? ciReport.changes : [];
  return changes
    .filter((change) => change.baselineState === 'new' && change.classification !== 'safe')
    .map((change) => ({
      level: LEVEL[change.classification] ?? 'warning',
      title: `RLSProof ${String(change.classification ?? 'review').toUpperCase()}: ${String(change.kind ?? 'change')}`,
      message: String(change.message ?? change.kind ?? 'RLSProof change detected.'),
      changeId: change.id,
      classification: change.classification,
      object: change.object ?? null,
    }));
}

export function runRegressionGate({ baseFiles, headFiles, baseline = null } = {}) {
  if (!Array.isArray(baseFiles) || !Array.isArray(headFiles)) {
    throw new TypeError('baseFiles and headFiles must be arrays');
  }
  const semanticReport = analyzeSecurityDiff(baseFiles, headFiles);
  const ciReport = buildCiRegressionReport(semanticReport, baseline);
  const prVerdict = derivePrVerdict(ciReport);
  return {
    schemaVersion: 1,
    semanticReport,
    ciReport,
    prVerdict,
    sarif: toSarif(ciReport),
    annotations: toGithubAnnotations(ciReport),
    exitCode: prVerdict.mergePolicy === 'block' ? 1 : 0,
  };
}
