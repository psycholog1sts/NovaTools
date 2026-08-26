import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../src/tools/image/compress/index.html', import.meta.url), 'utf8');
const implementation = readFileSync(new URL('../src/tools/image/image-compress.mjs', import.meta.url), 'utf8');
const registration = readFileSync(new URL('../src/tools/image/index.mjs', import.meta.url), 'utf8');
const metadata = readFileSync(new URL('../src/tools/image/compress/meta.json', import.meta.url), 'utf8');

const visibleAndMetadata = html
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<!--([\s\S]*?)-->/g, ' ');

for (const [label, pattern] of [
  ['absolute no-quality-loss claim', /without losing quality|without quality loss|no quality loss/i],
  ['unproven reduction guarantee', /up to\s+\d+%/i],
  ['unproven fastest claim', /\bfastest\b/i],
  ['unverifiable instant professional-results claim', /professional (?:quality )?results? instantly/i],
  ['absolute privacy/security claim', /complete privacy|complete security|100% secure/i]
]) {
  assert.doesNotMatch(visibleAndMetadata, pattern, `Image Compressor must not publish ${label}.`);
}

assert.doesNotMatch(metadata, /without quality loss|up to 70%/i, 'Image Compressor discovery metadata must not retain disproven quality or reduction guarantees.');

assert.match(
  visibleAndMetadata,
  /JPEG and WebP[^.]*lossy|lossy[^.]*JPEG and WebP/i,
  'Image Compressor must explain that JPEG/WebP quality compression is lossy.'
);
assert.match(
  visibleAndMetadata,
  /PNG[^.]*may (?:not shrink|produce a larger file|keep or increase)/i,
  'Image Compressor must explain that PNG output is not guaranteed to be smaller.'
);

assert.match(html, /accept="image\/jpeg,image\/png,image\/webp"/i, 'File picker must advertise only the implemented JPEG/PNG/WebP inputs.');
assert.match(html, /(?:maximum|Max)\s+10\s*MB/i, 'The public UI must use the canonical 10 MB input limit.');
assert.doesNotMatch(html, /(?:maximum|Max)\s+20\s*MB/i, 'The public UI must not advertise a conflicting 20 MB limit.');
assert.match(html, /MAX_BYTES\s*=\s*10\s*\*\s*1024\s*\*\s*1024/, 'The active page runtime must enforce the canonical 10 MiB limit.');
assert.match(html, /file\.size\s*>\s*MAX_BYTES/, 'The active page runtime must reject files above the canonical size limit.');
assert.match(html, /ALLOWED_TYPES\.includes\(file\.type\)/, 'The active page runtime must validate JPEG/PNG/WebP MIME types.');
assert.match(html, /canvas\.toBlob\([\s\S]*?,type,quality\)/, 'The active page runtime must encode the selected MIME type and quality.');

assert.match(registration, /IMAGE_COMPRESSOR_MAX_BYTES\s*=\s*10\s*\*\s*1024\s*\*\s*1024/, 'Image Compressor registration must define the canonical 10 MiB limit.');
assert.match(
  registration,
  /name:\s*['"]file['"][\s\S]{0,500}?maxSize:\s*IMAGE_COMPRESSOR_MAX_BYTES/,
  'The validated file input itself must enforce the canonical 10 MiB limit.'
);
assert.doesNotMatch(
  registration,
  /image-compress[\s\S]{0,1500}?maxSize:\s*20\s*\*\s*1024\s*\*\s*1024/,
  'Image Compressor must not retain a conflicting 20 MiB registration limit.'
);

assert.match(implementation, /requestedFormat\(inputs, file\)/, 'Shared Image Compressor implementation must honor the requested output format.');
assert.match(implementation, /canvas\.toBlob\([\s\S]*?format\.mime[\s\S]*?quality/, 'Shared Canvas encoding must use the selected MIME type and quality.');
assert.match(implementation, /compressed_\$\{baseName\}\.\$\{format\.ext\}/, 'Shared download extension must match the selected encoder format.');
assert.match(implementation, /JPEG and WebP quality settings are lossy/i, 'Shared result copy must disclose lossy JPEG/WebP encoding.');
assert.match(implementation, /PNG encoding may keep or increase file size/i, 'Shared result copy must disclose PNG size behavior.');

console.log('image compressor truth contract: pass');
