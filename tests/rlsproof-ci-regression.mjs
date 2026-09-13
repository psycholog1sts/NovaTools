import assert from 'node:assert/strict';
import {
  buildCiRegressionReport,
  createRegressionBaseline,
  derivePrVerdict,
  toSarif,
} from '../src/tools/security/rlsproof/core/ci/regression-ci.mjs';

const report = {
  schemaVersion: 1,
  generatedAt: '2026-09-13T00:00:00.000Z',
  verdict: 'DANGEROUS',
  summary: { safe: 0, breaking: 0, requiresReview: 1, dangerous: 1 },
  baseState: {},
  headState: {},
  changes: [
    {
      id: 'rdc_111111111111111111111111',
      kind: 'rls-disabled',
      classification: 'dangerous',
      object: 'public.docs',
      message: 'RLS disabled.',
      before: true,
      after: false,
    },
    {
      id: 'rdc_222222222222222222222222',
      kind: 'grant-added',
      classification: 'requires_review',
      object: 'public.docs::anon::select',
      message: 'Client-visible grant added.',
      before: null,
      after: { privilege: 'select' },
    },
  ],
};

const baseline = createRegressionBaseline({ ...report, changes: [report.changes[0]] });
assert.equal(baseline.schemaVersion, 1);
assert.deepEqual(baseline.changeIds, ['rdc_111111111111111111111111']);

const ci = buildCiRegressionReport(report, baseline);
assert.equal(ci.originalVerdict, 'DANGEROUS');
assert.equal(ci.verdict, 'REQUIRES_REVIEW');
assert.equal(ci.summary.existing.dangerous, 1);
assert.equal(ci.summary.new.requiresReview, 1);
assert.equal(ci.changes[0].baselineState, 'existing');
assert.equal(ci.changes[1].baselineState, 'new');

const fullyBaselined = buildCiRegressionReport(report, createRegressionBaseline(report));
assert.equal(fullyBaselined.verdict, 'SAFE');

const stale = buildCiRegressionReport(report, {
  schemaVersion: 1,
  changeIds: ['rdc_111111111111111111111111', 'rdc_999999999999999999999999'],
});
assert.deepEqual(stale.baseline.staleChangeIds, ['rdc_999999999999999999999999']);

assert.throws(
  () => buildCiRegressionReport(report, { schemaVersion: 99, changeIds: [] }),
  /baseline/i,
);

const sarif = toSarif(ci);
assert.equal(sarif.version, '2.1.0');
assert.equal(sarif.runs[0].tool.driver.name, 'RLSProof');
assert.equal(sarif.runs[0].results.length, 1);
assert.equal(sarif.runs[0].results[0].level, 'warning');
assert.equal(sarif.runs[0].results[0].partialFingerprints.rlsproofChangeId, 'rdc_222222222222222222222222');

assert.deepEqual(derivePrVerdict(ci), {
  verdict: 'REQUIRES_REVIEW',
  checkConclusion: 'action_required',
  mergePolicy: 'block',
});
assert.deepEqual(derivePrVerdict(fullyBaselined), {
  verdict: 'SAFE',
  checkConclusion: 'success',
  mergePolicy: 'allow',
});

console.log('RLSProof CI regression contract: PASS');
