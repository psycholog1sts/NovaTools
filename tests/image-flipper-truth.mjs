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

console.log('image flipper truth contract: pass');
