import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../src/tools/pdf/compress/index.html', import.meta.url), 'utf8');
const routeLogic = fs.readFileSync(new URL('../src/tools/pdf/compress/logic.mjs', import.meta.url), 'utf8');
const controllerLogic = fs.readFileSync(new URL('../src/tools/pdf/pdf-compress.mjs', import.meta.url), 'utf8');
const registry = fs.readFileSync(new URL('../src/tools/pdf/index.mjs', import.meta.url), 'utf8');
const meta = JSON.parse(fs.readFileSync(new URL('../src/tools/pdf/compress/meta.json', import.meta.url), 'utf8'));

const implementationText = [html, routeLogic, controllerLogic, registry, JSON.stringify(meta)].join('\n');

for (const unsupportedClaim of [
  '10-20% smaller',
  '30-50% smaller',
  '50-80% smaller',
  'without losing quality',
  'without quality loss',
  '%10 ile %80',
  'Maximum compression',
  'Compression Level'
]) {
  assert.equal(implementationText.includes(unsupportedClaim), false, `PDF Compressor must not contain unsupported claim: ${unsupportedClaim}`);
}

for (const staleImplementationMarker of ['COMPRESSION_LEVELS', 'imageQuality', 'compressionSettings']) {
  assert.equal(implementationText.includes(staleImplementationMarker), false, `Legacy fake compression behavior must not return: ${staleImplementationMarker}`);
}

assert.match(html, /Structural optimization/);
assert.match(html, /does not downsample page images/i);
assert.match(html, /smaller, similar in size, or larger/i);
assert.match(routeLogic, /There is no guaranteed reduction/);
assert.match(routeLogic, /fileSizeBucket/);
assert.match(controllerLogic, /sizeChangePercent/);
assert.match(controllerLogic, /smaller file is not guaranteed/i);
assert.match(registry, /Page images are not downsampled and reduction is not guaranteed/i);
assert.equal(registry.includes("name: 'quality'"), false, 'Shared controller registry must expose no fake quality selector.');
assert.equal(registry.includes("{ name: 'compressedSize'"), false, 'Shared controller output must not use the old compressedSize contract.');
assert.equal(registry.includes("{ name: 'savings'"), false, 'Shared controller output must not use the old non-negative savings contract.');
assert.equal(meta.cpc, undefined, 'PDF Compressor metadata must not contain speculative CPC values.');
assert.match(meta.description.en, /not guaranteed/i);
assert.match(meta.description.tr, /garanti edilmez/i);
assert.equal(meta.bundle.wasm, false, 'PDF Compressor metadata must not claim a WASM dependency it does not use.');

assert.equal(/trackEvent\([^\n]+originalSize:\s*state\.file\.size/.test(routeLogic), false, 'Exact file sizes must not be sent in product events.');
assert.equal(/trackEvent\([^\n]+compressedSize:\s*result\.bytes\.length/.test(routeLogic), false, 'Exact output sizes must not be sent in product events.');
assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'PDF Compressor must have exactly one H1.');
assert.equal((html.match(/Last updated:/gi) || []).length, 1, 'PDF Compressor must expose one Last updated marker.');
assert.equal((html.match(/class="quality-option selected"/g) || []).length, 1, 'Only one truthful optimization mode should be visible.');

console.log('pdf compressor trust contract: pass');
