import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/js/phase10-tools.js', 'utf8');

assert.match(source, /buffer\.byteLength < 4/);
assert.match(source, /JPEG metadata segment is truncated or invalid/);
assert.match(source, /Unable to inspect this JPEG image/);
assert.match(source, /audioContext\.decodeAudioData/);
assert.match(source, /Unable to decode this audio file/);
assert.match(source, /Enter chart data as label,value rows first/);
assert.match(source, /No valid chart rows found\. Use label,value rows with numeric values/);
assert.match(source, /small built-in English–Turkish phrasebook/);
assert.doesNotMatch(source, /production-grade translation/);
assert.doesNotMatch(source, /Phase 10/);

console.log('tool runtime source contract: pass');
