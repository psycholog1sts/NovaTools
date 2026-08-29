/**
 * Every converter that is NOT certified must carry a concrete, checkable reason
 * — not a boilerplate "pending certification" placeholder — and must be proven
 * to be contained by the fail-closed build (noindex + replaced surface, with the
 * uncertified implementation absent from the shipped page).
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('tools-manifest.json', 'utf8'));
const matrix = JSON.parse(readFileSync('src/data/tool-certification.json', 'utf8'));
const records = new Map(matrix.records.map((record) => [record.Route, record]));

const BOILERPLATE = /route remains disabled until implementation/i;

const converters = manifest.tools.filter((tool) => tool.category === 'converters');
assert.ok(converters.length >= 10, 'converter category must be fully enumerated');

let certified = 0;
let unavailable = 0;

for (const tool of converters) {
  const route = `/tools${tool.path}/`;
  const record = records.get(route);
  assert.ok(record, `${route} is missing from the master matrix`);

  // Every consumer of the manifest compares these with `=== true`, and one uses
  // a bare negation where the string "False" would read as truthy. They must be
  // real booleans, whatever the certification matrix stores them as.
  for (const flag of ['public', 'indexable', 'adsEligible']) {
    assert.equal(
      typeof tool[flag],
      'boolean',
      `${route} manifest flag "${flag}" must be a boolean, got ${JSON.stringify(tool[flag])}`
    );
  }

  if (record.CertificationStatus === 'CERTIFIED') {
    certified += 1;
    assert.doesNotMatch(
      String(record.KnownLimitations),
      BOILERPLATE,
      `${route} is certified but still carries the fail-closed placeholder as its limitations`
    );
    assert.equal(tool.limitations, record.KnownLimitations, `${route} manifest limitations must mirror the audit record`);
    assert.equal(tool.indexable, true, `${route} is certified and must be indexable`);
    continue;
  }

  unavailable += 1;
  assert.equal(record.CertificationStatus, 'UNAVAILABLE', `${route} must be CERTIFIED or UNAVAILABLE`);
  assert.equal(tool.indexable, false, `${route} is not certified and must not be indexable`);

  const reason = String(record.UnavailableReason || '');
  assert.ok(reason.length >= 80, `${route} must record a concrete UnavailableReason, not a placeholder`);
  assert.doesNotMatch(reason, BOILERPLATE, `${route} UnavailableReason is boilerplate, not a proven reason`);

  // The reason must be anchored to something a reader can check.
  assert.ok(
    Array.isArray(record.UnavailableEvidence) && record.UnavailableEvidence.length > 0,
    `${route} must cite evidence for its UnavailableReason`
  );
  for (const path of record.UnavailableEvidence) {
    assert.ok(existsSync(path), `${route} cites missing evidence path ${path}`);
  }
}

console.log(`converter availability contract: pass (${certified} certified, ${unavailable} unavailable with proven reasons)`);
