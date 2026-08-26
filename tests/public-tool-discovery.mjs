import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  isPublicCertifiedTool,
  publicCertifiedTools,
  publicToolsByCategory
} from '../src/data/public-tools.mjs';

const certified = { public: true, indexable: true, certificationStatus: 'CERTIFIED', category: 'pdf' };

assert.equal(isPublicCertifiedTool(certified), true);
assert.equal(isPublicCertifiedTool({ ...certified, public: false }), false);
assert.equal(isPublicCertifiedTool({ ...certified, indexable: false }), false);
assert.equal(isPublicCertifiedTool({ ...certified, certificationStatus: 'UNAVAILABLE' }), false);

const tools = publicCertifiedTools([
  certified,
  { ...certified, id: 'hidden', public: false },
  { ...certified, id: 'unavailable', certificationStatus: 'UNAVAILABLE' }
]);
assert.deepEqual(tools, [certified]);

const grouped = publicToolsByCategory([
  { ...certified, id: 'merge' },
  { ...certified, id: 'compress' },
  { ...certified, id: 'hidden', public: false }
]);
assert.deepEqual(grouped.pdf.map((tool) => tool.id), ['merge', 'compress']);

const homepage = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const homepageLogic = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
assert.match(homepage, /class="btn-icon mobile-menu-toggle"[^>]*aria-expanded="false"[^>]*aria-controls="mobileMenu"/);
assert.match(homepage, /id="mobileMenu"[^>]*hidden/);
assert.match(homepage, /id="searchModal"[^>]*role="dialog"[^>]*aria-modal="true"[^>]*hidden/);
assert.match(homepageLogic, /setAttribute\('aria-expanded'/);
assert.match(homepageLogic, /previouslyFocusedElement/);

console.log('public tool discovery contract: pass');
