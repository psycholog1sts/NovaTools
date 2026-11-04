import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync('src/tools/image/image-flipper/index.html', 'utf8');
const certification = JSON.parse(readFileSync('src/data/tool-certification.json', 'utf8'));
const record = certification.records.find(({ Route }) => Route === '/tools/image/image-flipper/');

assert.ok(record, 'Image Flipper must have a canonical certification record.');
assert.equal(record.CertificationStatus, 'CERTIFIED');
assert.equal(record.Indexable, true);
assert.equal(record.AdsEligible, true);
assert.equal(record.PrivacyTruth, 'LOCAL_ONLY');
assert.equal(record.ExternalNetwork, false);
assert.equal(record.SyntheticData, 'NONE');

assert.match(html, /accept="image\/jpeg,image\/png,image\/webp"/i);
assert.match(html, /allowedTypes\.has\(file\.type\)/);
assert.match(html, /file\.size\s*>\s*20\s*\*\s*1024\s*\*\s*1024/);
assert.match(html, /toBlob\([\s\S]*?'image\/png'/);
assert.match(html, /URL\.revokeObjectURL\(downloadUrl\)/);
assert.doesNotMatch(html, /complete privacy|complete security|absolutely!/i);
assert.match(html, /PNG/i, 'The page must disclose that the download is re-encoded as PNG.');

// The flip direction controls are the tool's core action, so they must be
// keyboard-operable toggles (WCAG 2.1.1) that expose their state (4.1.2).
for (const id of ['flipHOption', 'flipVOption', 'flipBothOption']) {
  const tag = html.match(new RegExp(`<div\\b[^>]*\\bid="${id}"[^>]*>`))?.[0] || '';
  assert.match(tag, /\brole="button"/, `${id} must expose role="button".`);
  assert.match(tag, /\btabindex="0"/, `${id} must be reachable with Tab.`);
}
assert.match(html, /<div\b[^>]*id="flipHOption"[^>]*aria-pressed="false"/, 'Horizontal toggle must expose aria-pressed.');
assert.match(html, /<div\b[^>]*id="flipVOption"[^>]*aria-pressed="false"/, 'Vertical toggle must expose aria-pressed.');
assert.match(html, /setAttribute\('aria-pressed'/, 'Toggle state must be reflected in aria-pressed.');
assert.match(html, /e\.key === 'Enter' \|\| e\.key === ' '[\s\S]*?\.click\(\)/, 'Enter/Space must activate the flip toggles.');

console.log('image flipper truth contract: pass');
