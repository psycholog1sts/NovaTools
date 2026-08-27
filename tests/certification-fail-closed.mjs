import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('tools-manifest.json', 'utf8'));
const matrix = JSON.parse(readFileSync('src/data/tool-certification.json', 'utf8'));
const runtimeFinalizer = readFileSync('scripts/finalize-runtime-contracts.mjs', 'utf8');
const records = new Map(matrix.records.map((record) => [record.Route, record]));

for (const tool of manifest.tools) {
  const route = `/tools${tool.path}/`;
  const record = records.get(route);
  if (record) {
    assert.equal(tool.certificationStatus, record.CertificationStatus, `${route} must inherit its matrix status`);
    continue;
  }
  assert.equal(tool.certificationStatus, 'UNAVAILABLE', `${route} must fail closed without a matrix row`);
  assert.equal(tool.indexable, false, `${route} must not be indexable while unclassified`);
  assert.equal(tool.adsEligible, false, `${route} must not be monetized while unclassified`);
}

assert.match(runtimeFinalizer, /injectUnavailableToolRobots/);
assert.match(runtimeFinalizer, /injectUnavailableToolSurface/);
assert.match(runtimeFinalizer, /content="noindex,nofollow"/);
assert.match(runtimeFinalizer, /This tool is currently unavailable/);
assert.match(runtimeFinalizer, /certificationStatus\s*===\s*'CERTIFIED'/);

console.log('certification fail-closed contract: pass');
