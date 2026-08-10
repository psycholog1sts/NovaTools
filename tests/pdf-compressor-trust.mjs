import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../src/tools/pdf/compress/index.html', import.meta.url), 'utf8');
const logic = fs.readFileSync(new URL('../src/tools/pdf/compress/logic.mjs', import.meta.url), 'utf8');

for (const unsupportedClaim of [
  '10-20% smaller',
  '30-50% smaller',
  '50-80% smaller',
  'without losing quality',
  '%10 ile %80',
  'Maximum compression'
]) {
  assert.equal(html.includes(unsupportedClaim), false, `HTML must not contain unsupported claim: ${unsupportedClaim}`);
  assert.equal(logic.includes(unsupportedClaim), false, `Logic/schema must not contain unsupported claim: ${unsupportedClaim}`);
}

assert.equal(logic.includes('COMPRESSION_LEVELS'), false, 'Legacy fake compression levels must not return.');
assert.equal(logic.includes('imageQuality'), false, 'Unused imageQuality settings must not return.');
assert.match(html, /Structural optimization/);
assert.match(html, /does not downsample page images/i);
assert.match(html, /smaller, similar in size, or larger/i);
assert.match(logic, /There is no guaranteed reduction/);
assert.match(logic, /fileSizeBucket/);
assert.equal(/trackEvent\([^\n]+originalSize:\s*state\.file\.size/.test(logic), false, 'Exact file sizes must not be sent in product events.');
assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'PDF Compressor must have exactly one H1.');
assert.equal((html.match(/Last updated:/gi) || []).length, 1, 'PDF Compressor must expose one Last updated marker.');
assert.equal((html.match(/class="quality-option selected"/g) || []).length, 1, 'Only one truthful optimization mode should be visible.');

console.log('pdf compressor trust contract: pass');
