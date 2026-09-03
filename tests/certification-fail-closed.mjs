import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('tools-manifest.json', 'utf8'));
const matrix = JSON.parse(readFileSync('src/data/tool-certification.json', 'utf8'));
const runtimeFinalizer = readFileSync('scripts/finalize-runtime-contracts.mjs', 'utf8');
const records = new Map(matrix.records.map((record) => [record.Route, record]));
assert.ok(records.size >= manifest.tools.length, 'Master certification matrix must contain every manifest tool.');

for (const tool of manifest.tools) {
  const route = `/tools${tool.path}/`;
  const record = records.get(route);
  assert.ok(record, `${route} is missing from the master matrix`);
  assert.equal(tool.certificationStatus, record.CertificationStatus, `${route} must inherit its matrix status`);
  for (const field of ['ImplementationStatus', 'RuntimeStatus', 'SEOStatus', 'DiscoveryStatus', 'SitemapStatus', 'TestStatus']) {
    assert.ok(record[field], `${route} is missing ${field}`);
  }
}

assert.match(runtimeFinalizer, /injectUnavailableToolRobots/);
assert.match(runtimeFinalizer, /injectUnavailableToolSurface/);
assert.match(runtimeFinalizer, /content="noindex,nofollow"/);
assert.match(runtimeFinalizer, /This tool is currently unavailable/);
assert.match(runtimeFinalizer, /certificationStatus\s*===\s*'CERTIFIED'/);

console.log('certification fail-closed contract: pass');
