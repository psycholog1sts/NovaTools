import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('tools-manifest.json', 'utf8'));
const matrix = JSON.parse(readFileSync('src/data/tool-certification.json', 'utf8'));
const runtimeFinalizer = readFileSync('scripts/finalize-runtime-contracts.mjs', 'utf8');
const todoSource = readFileSync('src/tools/productivity/todo-list/index.html', 'utf8');
const phase10Source = readFileSync('src/js/phase10-tools.js', 'utf8');
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

// Unavailable source code is still security-sensitive because it may later be
// certified. Persisted localStorage records must not be rehydrated through an
// HTML sink or event-handler attribute.
assert.doesNotMatch(todoSource, /taskList\.innerHTML\s*=\s*filteredTasks\.map/);
assert.doesNotMatch(todoSource, /\$\{task\.text\}/);
assert.doesNotMatch(todoSource, /data-nv-(?:change-args|args)='\["\$\{task\.id\}"\]'/);
assert.match(todoSource, /document\.createElement\(['"]div['"]\)/);
assert.match(todoSource, /\.textContent\s*=\s*task\.text/);
assert.match(todoSource, /const VALID_PRIORITIES = new Set\(\['low', 'medium', 'high'\]\)/);
assert.match(todoSource, /function normalizeTask\(/);
assert.match(todoSource, /function loadTasks\(/);

// Phase-10 source remains unreachable while these routes are uncertified, but
// its latent implementations must already fail safely before any future
// certification can expose them.
assert.match(phase10Source, /buffer\.byteLength < 4/);
assert.match(phase10Source, /JPEG metadata segment is truncated or invalid/);
assert.match(phase10Source, /Unable to inspect this JPEG image/);
assert.match(phase10Source, /audioContext\.decodeAudioData/);
assert.match(phase10Source, /Unable to decode this audio file/);
assert.match(phase10Source, /Enter chart data as label,value rows first/);
assert.match(phase10Source, /No valid chart rows found\. Use label,value rows with numeric values/);
assert.match(phase10Source, /small built-in English–Turkish phrasebook/);
assert.doesNotMatch(phase10Source, /production-grade translation/);
assert.doesNotMatch(phase10Source, /Phase 10/);

console.log('certification fail-closed contract: pass');
