import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = '/tools/security/rlsproof/';
const htmlPath = 'src/tools/security/rlsproof/index.html';
const metaPath = 'src/tools/security/rlsproof/meta.json';
const certificationPath = 'src/data/tool-certification.json';

const html = readFileSync(htmlPath, 'utf8');
const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
const certification = JSON.parse(readFileSync(certificationPath, 'utf8'));
const record = certification.records.find((item) => item.Route === route);

assert.equal(meta.id, 'rlsproof');
assert.equal(meta.category, 'security');
assert.equal(meta.public, true);
assert.equal(meta.adsEligible, false);
assert.equal(meta.externalNetwork, true);
assert.match(html, /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/mc-novatools\.com\/tools\/security\/rlsproof\/["']/i);
assert.match(html, /RLSProof/i);
assert.match(html, /\$149\s*USD/i);
assert.match(html, /Payment activation pending/i);
assert.match(html, /public GitHub repositories only/i);
assert.match(html, /bounded native static checks/i);
assert.match(html, /api\.github\.com/i);
assert.match(html, /href=["']\/privacy-policy\.html["']/i);
assert.match(html, /href=["']\/terms-of-service\.html["']/i);
assert.match(html, /href=["']\/contact\.html["']/i);
assert.match(html, /href=["']\/security\.html["']/i);
assert.match(html, /href=["']\/refund-policy\.html["']/i);
assert.doesNotMatch(html, /aggregateRating|ratingValue|reviewCount/i);
assert.doesNotMatch(html, /security certification|certified secure|100% secure|100% private/i);
assert.doesNotMatch(html, /type=["']password["'][^>]*(?:token|github)/i);

assert.ok(record, 'RLSProof must have a canonical certification record.');
assert.equal(record.CertificationStatus, 'CERTIFIED');
assert.equal(record.Indexable, true);
assert.equal(record.AdsEligible, false);
assert.equal(record.PrivacyTruth, 'EXTERNAL_API');
assert.equal(record.ExternalNetwork, true);
assert.equal(record.SyntheticData, 'NONE');
for (const gate of ['FunctionalTruth', 'UniqueUtility', 'SpecificContent', 'ImplementationEvidence', 'NoFiller', 'Trust']) {
  assert.equal(record[gate], 'PASS', `RLSProof certification must pass ${gate}`);
}

const refund = readFileSync('refund-policy.html', 'utf8');
assert.match(refund, /<link[^>]+rel=["']canonical["'][^>]+href=["']https:\/\/mc-novatools\.com\/refund-policy\.html["']/i);
assert.match(refund, /Launch Verification/i);
assert.match(refund, /mandatory consumer rights|applicable law/i);
assert.doesNotMatch(refund, /Paddle.*approved|Paddle.*active checkout/i);

const {
  parseGitHubRepository,
  selectCandidateFiles,
} = await import('../src/tools/security/rlsproof/core/github.mjs');
const {
  browserQuickScanGithubRepo,
  BrowserQuickScanError,
} = await import('../src/tools/security/rlsproof/core/browser-quick-scan.mjs');
const { scanVirtualFiles } = await import('../src/tools/security/rlsproof/core/content-scan.mjs');
const { scoreFindings } = await import('../src/tools/security/rlsproof/core/score.mjs');
const { redactEvidence } = await import('../src/tools/security/rlsproof/core/redact.mjs');

assert.deepEqual(parseGitHubRepository('https://github.com/acme/demo'), { owner: 'acme', repo: 'demo' });
assert.deepEqual(parseGitHubRepository('acme/demo.git'), { owner: 'acme', repo: 'demo' });
assert.throws(() => parseGitHubRepository('http://github.com/acme/demo'));
assert.throws(() => parseGitHubRepository('https://example.com/acme/demo'));
assert.throws(() => parseGitHubRepository('https://github.com/acme/demo/tree/main'));

const selected = selectCandidateFiles([
  { path: 'a.js', type: 'blob', mode: '100644', size: 10, sha: 'a' },
  { path: 'b.sql', type: 'blob', mode: '100644', size: 10, sha: 'b' },
  { path: 'node_modules/x.js', type: 'blob', mode: '100644', size: 10, sha: 'c' },
  { path: 'large.js', type: 'blob', mode: '100644', size: 200, sha: 'd' },
], { maxFiles: 2, maxFileBytes: 128, maxTotalBytes: 20 });
assert.deepEqual(selected.files.map((entry) => entry.path), ['a.js', 'b.sql']);
assert.equal(selected.truncated, false);

const findings = scanVirtualFiles([
  { path: 'supabase/migrations/001.sql', text: 'create table public.accounts (id uuid);' },
  { path: 'src/client.js', text: 'const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;' },
]);
assert.ok(findings.some((finding) => finding.rule === 'supabase-public-table-without-rls'));
assert.ok(findings.some((finding) => finding.rule === 'supabase-service-role-client'));
assert.ok(findings.every((finding) => typeof finding.fingerprint === 'string' && finding.fingerprint.startsWith('gfp_')));
assert.ok(scoreFindings(findings).score < 100);
assert.equal(redactEvidence('API_KEY=supersecret'), 'API_KEY=[REDACTED]');

function response(status, body, headers = {}) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    json: async () => body,
  };
}

await assert.rejects(
  () => browserQuickScanGithubRepo('acme/private', {
    fetchImpl: async () => response(200, { private: true, default_branch: 'main', size: 1 }),
  }),
  (error) => error instanceof BrowserQuickScanError && error.code === 'private_repository',
);

await assert.rejects(
  () => browserQuickScanGithubRepo('acme/demo', {
    fetchImpl: async () => response(403, {}, { 'x-ratelimit-remaining': '0' }),
  }),
  (error) => error instanceof BrowserQuickScanError && error.code === 'github_rate_limited',
);

const emptyResult = await browserQuickScanGithubRepo('acme/demo', {
  fetchImpl: async (url) => {
    if (url.endsWith('/repos/acme/demo')) {
      return response(200, { private: false, default_branch: 'main', size: 1, html_url: 'https://github.com/acme/demo' });
    }
    if (url.includes('/git/trees/')) return response(200, { truncated: false, tree: [] });
    throw new Error(`unexpected URL ${url}`);
  },
});
assert.equal(emptyResult.coverage.complete, false);
assert.equal(emptyResult.releaseGate, 'incomplete');
assert.equal(emptyResult.scope.mode, 'remote-quick');
assert.deepEqual(emptyResult.scope.requestedEngines, ['native']);

console.log('RLSProof NovaTools integration contract: PASS');
