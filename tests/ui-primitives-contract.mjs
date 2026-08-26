import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const toast = read('src/components/toast.mjs');
const loading = read('src/components/loading.mjs');
const dropzone = read('src/components/dropzone.mjs');

// Toast: user-facing strings must be assigned as text, never interpolated into HTML or onclick.
assert.match(toast, /textContent\s*=\s*message/, 'Toast messages must be rendered with textContent.');
assert.match(toast, /setAttribute\(['"]role['"],\s*(?:type\s*===\s*['"]error['"]\s*\?\s*['"]alert['"]\s*:\s*['"]status['"]|role)/, 'Toasts must expose live-region roles.');
assert.doesNotMatch(toast, /onclick\s*=/i, 'Toast controls must not use inline onclick handlers.');
assert.doesNotMatch(toast, /innerHTML\s*=\s*`[\s\S]*\$\{message\}/, 'Toast messages must not be interpolated into innerHTML.');

// Loading: progress must be semantic and only reflect caller-provided progress.
assert.match(loading, /createElement\(['"]progress['"]\)/, 'Progress UI must use the native progress element.');
assert.match(loading, /aria-live|setAttribute\(['"]aria-live['"]/, 'Loading status must be announced to assistive technology.');
assert.doesNotMatch(loading, /linear-gradient\(90deg,\s*#00F5D4/i, 'Loading UI must not restore the legacy neon gradient.');

// Dropzone: preserve native file input, announce validation, support cleanup and extensions.
assert.match(dropzone, /aria-live/, 'Dropzone validation must expose an aria-live status region.');
assert.match(dropzone, /acceptExtensions|extension/i, 'Dropzone validation must understand extension accepts.');
assert.match(dropzone, /removeEventListener/, 'Dropzone destroy must clean up its event listeners.');
assert.match(dropzone, /textContent/, 'Dropzone selected-file and error copy must use textContent.');

console.log('UI primitives contract: pass');
