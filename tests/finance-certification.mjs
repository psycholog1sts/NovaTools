import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const certification = JSON.parse(readFileSync('src/data/tool-certification.json', 'utf8'));
const records = certification.records.filter((record) => record.Category === 'finance');
const financeCategory = readFileSync('categories/finance-tools.html', 'utf8');
const p0 = readFileSync('src/tools/finance/p0-batch2.mjs', 'utf8');
const mortgage = readFileSync('src/tools/finance/mortgage-refinance.mjs', 'utf8');
const mortgageHtml = readFileSync('src/tools/finance/mortgage-refinance/index.html', 'utf8');
const compoundHtml = readFileSync('src/tools/finance/compound-interest/index.html', 'utf8');
const sitemapSource = readFileSync('scripts/generate-localized-sitemap.mjs', 'utf8');
const adsSource = readFileSync('src/core/ads/adsense-config.mjs', 'utf8');

assert.equal(records.length, 12, 'Finance certification must account for all 12 public finance routes.');
assert.equal(new Set(records.map((record) => record.Route)).size, records.length, 'Finance certification routes must be unique.');

const allowedStatuses = new Set(['CERTIFIED', 'NOINDEX_PENDING_FIX', 'UNAVAILABLE', 'REMOVE']);
const allowedPrivacy = new Set(['LOCAL_ONLY', 'EXTERNAL_API', 'SERVER_PROCESSED', 'MIXED']);
const requiredFields = [
  'Tool', 'Route', 'Category', 'Indexable', 'AdsEligible', 'FunctionalTruth', 'UniqueUtility',
  'SpecificContent', 'ImplementationEvidence', 'NoFiller', 'Trust', 'PrivacyTruth', 'ExternalNetwork',
  'DataSource', 'SyntheticData', 'KnownLimitations', 'UIStatus', 'Tests', 'CertificationStatus'
];

for (const record of records) {
  requiredFields.forEach((field) => assert.notEqual(record[field], undefined, `${record.Route} missing ${field}`));
  assert.ok(allowedStatuses.has(record.CertificationStatus), `${record.Route} has invalid certification status`);
  assert.ok(allowedPrivacy.has(record.PrivacyTruth), `${record.Route} has unresolved privacy truth`);
  assert.equal(/UNKNOWN/i.test(JSON.stringify(record)), false, `${record.Route} may not contain UNKNOWN certification data`);

  const pagePath = `src${record.Route}index.html`;
  const html = readFileSync(pagePath, 'utf8');
  assert.match(html, new RegExp(`<link[^>]+rel=["']canonical["'][^>]+href=["']https://(?:www\\.)?mc-novatools\\.com${record.Route.replaceAll('/', '\\/')}["']`, 'i'), `${record.Route} canonical must match the public /tools route`);

  if (record.CertificationStatus === 'CERTIFIED') {
    assert.equal(record.Indexable, true, `${record.Route} certified route must be indexable`);
    assert.equal(record.AdsEligible, true, `${record.Route} certified route must be ads-eligible`);
    for (const gate of ['FunctionalTruth', 'UniqueUtility', 'SpecificContent', 'ImplementationEvidence', 'NoFiller', 'Trust']) {
      assert.equal(record[gate], 'PASS', `${record.Route} certified route must pass ${gate}`);
    }
    assert.doesNotMatch(html, /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i, `${record.Route} certified route cannot be noindex`);
  } else if (record.CertificationStatus === 'UNAVAILABLE') {
    assert.equal(record.Indexable, false, `${record.Route} unavailable route must not be indexable`);
    assert.equal(record.AdsEligible, false, `${record.Route} unavailable route must not be ads-eligible`);
    assert.match(html, /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i, `${record.Route} unavailable route must be noindex`);
    assert.doesNotMatch(financeCategory, new RegExp(`href=["']https://mc-novatools\\.com${record.Route.replaceAll('/', '\\/')}["']`, 'i'), `${record.Route} unavailable route must not be promoted by finance category discovery`);
  }
}

assert.doesNotMatch(p0, /setInterval\(run,\s*30000\)/, 'Crypto UI must not pretend to refresh every 30 seconds while the client caches for five minutes.');
assert.match(p0, /setInterval\(run,\s*5\s*\*\s*60\s*\*\s*1000\)/, 'Crypto auto-refresh must align with five-minute client cache semantics.');
assert.doesNotMatch(p0, /Kadın 58 \/ Erkek 60\+|3600\/4500\/5400/, 'Retirement output must not invent or generalize SGK entitlement rules.');
assert.match(p0, /extra\.rows\[Math\.min\(row\.month - 1, extra\.rows\.length - 1\)\]/, 'Student-loan comparison chart must align extra-payment balance to the same month.');
assert.match(mortgage, /DEFAULT_KKDF_RATE = 0;/, 'Mortgage KKDF must default to a neutral user-entered assumption.');
assert.match(mortgage, /DEFAULT_BSMV_RATE = 0;/, 'Mortgage BSMV must default to a neutral user-entered assumption.');
assert.match(mortgageHtml, /id="kkdfRate"[^>]+value="0"/, 'Mortgage page KKDF default must match implementation.');
assert.match(mortgageHtml, /id="bsmvRate"[^>]+value="0"/, 'Mortgage page BSMV default must match implementation.');
assert.doesNotMatch(mortgageHtml, /determine that threshold precisely|best rates/i, 'Mortgage copy must not promise a universal precise refinance threshold or best rates.');
assert.match(compoundHtml, /aggregates the same annual contribution amount into each compounding interval/i, 'Compound-interest page must state its contribution-timing approximation.');

assert.match(sitemapSource, /filter\(toolSourceIsIndexable\)/, 'Tool sitemap generation must automatically exclude noindex tool sources.');
assert.match(adsSource, /meta\[name=.*robots.*\]|meta\[name=\\?"robots/i, 'Ad bootstrap must inspect robots metadata.');
assert.match(adsSource, /noindex/i, 'Ad bootstrap must fail closed on noindex pages.');

console.log(`finance certification: ${records.filter((r) => r.CertificationStatus === 'CERTIFIED').length} certified, ${records.filter((r) => r.CertificationStatus === 'UNAVAILABLE').length} unavailable`);
