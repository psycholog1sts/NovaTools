/**
 * GEO & Schema Compliance Inspector Test Suite
 * Verifies the pure analysis logic and the SSRF allowlist directly (no network).
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { assertPublicHttpUrl, extractMeta, extractJsonLd, analyzePage, PublicRequestError } from '../src/tools/dev/geo-compliance-inspector/analyzer.mjs';
import { isPublicIPv4, isPublicIPv6, isPublicAddress } from '../src/tools/dev/geo-compliance-inspector/ip-guard.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
};

class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n=================================');
    console.log('  GEO COMPLIANCE INSPECTOR TEST SUITE');
    console.log('=================================\n');

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        console.log(`  ✓ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`  ✗ ${name}`);
        console.log(`    ${error.message}`);
        this.failed++;
      }
    }

    console.log('\n---------------------------------');
    console.log(`  PASSED: ${this.passed}`);
    console.log(`  FAILED: ${this.failed}`);
    console.log(`  TOTAL:  ${this.tests.length}`);
    console.log('---------------------------------');

    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

const runner = new TestRunner();

// --- SSRF allowlist ---

runner.test('assertPublicHttpUrl accepts a normal https URL', () => {
  const url = assertPublicHttpUrl('https://example.com/page');
  assert(url.hostname === 'example.com', 'should parse the hostname');
});

runner.test('assertPublicHttpUrl rejects non-http(s) schemes', () => {
  let threw = false;
  try { assertPublicHttpUrl('file:///etc/passwd'); } catch (error) { threw = error instanceof PublicRequestError; }
  assert(threw, 'file:// should be rejected as invalid_url');
});

runner.test('assertPublicHttpUrl rejects localhost', () => {
  let threw = false;
  try { assertPublicHttpUrl('http://localhost:3000/'); } catch (error) { threw = error.code === 'blocked_host'; }
  assert(threw, 'localhost should be blocked');
});

runner.test('assertPublicHttpUrl rejects loopback and private IPv4 ranges', () => {
  for (const host of ['127.0.0.1', '10.0.0.5', '172.16.0.1', '192.168.1.1', '169.254.169.254']) {
    let threw = false;
    try { assertPublicHttpUrl(`http://${host}/`); } catch (error) { threw = error.code === 'blocked_host'; }
    assert(threw, `${host} should be blocked`);
  }
});

runner.test('assertPublicHttpUrl rejects IPv6 literals', () => {
  let threw = false;
  try { assertPublicHttpUrl('http://[::1]/'); } catch (error) { threw = error.code === 'blocked_host'; }
  assert(threw, '::1 should be blocked');
});

runner.test('assertPublicHttpUrl accepts a public IPv4 literal', () => {
  const url = assertPublicHttpUrl('http://8.8.8.8/');
  assert(url.hostname === '8.8.8.8', 'public IPv4 literals should be allowed through');
});

// --- extraction ---

runner.test('extractMeta reads title, description, canonical, and noindex', () => {
  const html = `<html><head><title>Hello World</title><meta name="description" content="A test page."><link rel="canonical" href="https://example.com/"><meta name="robots" content="noindex, follow"></head></html>`;
  const meta = extractMeta(html);
  assert(meta.title === 'Hello World', 'title should be extracted');
  assert(meta.description === 'A test page.', 'description should be extracted');
  assert(meta.canonical === 'https://example.com/', 'canonical should be extracted');
  assert(meta.isNoindex === true, 'noindex should be detected');
});

runner.test('extractMeta handles a page with no meta tags at all', () => {
  const meta = extractMeta('<html><head></head><body>Nothing here</body></html>');
  assert(meta.title === '', 'title should be empty');
  assert(meta.description === '', 'description should be empty');
  assert(meta.isNoindex === false, 'isNoindex should default to false');
});

runner.test('extractJsonLd validates a complete Article schema as valid', () => {
  const html = `<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"Test","author":"Jane","datePublished":"2026-01-01"}</script>`;
  const schemas = extractJsonLd(html);
  assert(schemas.length === 1, 'one schema should be found');
  assert(schemas[0].isValid === true, 'complete Article should be valid');
});

runner.test('extractJsonLd flags an Article schema missing required fields', () => {
  const html = `<script type="application/ld+json">{"@type":"Article","headline":"Test"}</script>`;
  const schemas = extractJsonLd(html);
  assert(schemas[0].isValid === false, 'incomplete Article should be invalid');
  assert(schemas[0].missingProperties.includes('author'), 'should report missing author');
});

runner.test('extractJsonLd handles malformed JSON without throwing', () => {
  const html = `<script type="application/ld+json">{not valid json</script>`;
  const schemas = extractJsonLd(html);
  assert(schemas.length === 1 && schemas[0].type === 'InvalidJSON', 'malformed JSON should be reported, not thrown');
});

runner.test('extractJsonLd reads nodes from an @graph array', () => {
  const html = `<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"Organization","name":"Acme","url":"https://acme.test"}]}</script>`;
  const schemas = extractJsonLd(html);
  assert(schemas.length === 1 && schemas[0].type === 'Organization' && schemas[0].isValid, '@graph nodes should be parsed');
});

// --- full page analysis & scoring ---

runner.test('analyzePage scores a fully-compliant page near 100', () => {
  const html = `<html><head>
    <title>A Complete Guide</title>
    <meta name="description" content="Everything you need to know, explained clearly.">
    <link rel="canonical" href="https://example.com/guide">
    <script type="application/ld+json">{"@type":"Article","headline":"A Complete Guide","author":"Jane Doe","datePublished":"2026-01-01"}</script>
  </head><body>
    <h1>A Complete Guide</h1>
    <p>By Jane Doe. This guide explains everything.</p>
    <h2>Frequently Asked Questions</h2>
    <table><tr><td>Spec</td><td>Value</td></tr></table>
  </body></html>`;
  const result = analyzePage(html);
  assert(result.score >= 90, `expected a near-perfect score, got ${result.score}`);
  assert(result.recommendations.filter((r) => r.severity === 'critical').length === 0, 'a compliant page should have no critical recommendations');
});

runner.test('analyzePage scores an empty page near 0 and flags critical issues', () => {
  const result = analyzePage('<html><head></head><body></body></html>');
  assert(result.score < 20, `expected a very low score, got ${result.score}`);
  const criticalTitles = result.recommendations.filter((r) => r.severity === 'critical').map((r) => r.title);
  assert(criticalTitles.some((t) => t.includes('title')), 'missing title should be flagged as critical');
  assert(criticalTitles.some((t) => t.toLowerCase().includes('json-ld') || t.toLowerCase().includes('structured data')), 'missing schema should be flagged as critical');
});

runner.test('analyzePage flags noindex as a critical, score-blocking issue', () => {
  const html = `<html><head><title>x</title><meta name="robots" content="noindex"></head><body></body></html>`;
  const result = analyzePage(html);
  assert(result.meta.isNoindex === true, 'isNoindex should be true');
  assert(result.recommendations[0].severity === 'critical' && result.recommendations[0].title.toLowerCase().includes('noindex'), 'noindex should be the first, critical recommendation');
});

// --- IP-range validation (the DNS-rebinding defense layer) ---

runner.test('isPublicIPv4 accepts well-known public addresses', () => {
  for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34']) {
    assert(isPublicIPv4(ip) === true, `${ip} should be public`);
  }
});

runner.test('isPublicIPv4 rejects loopback, RFC1918, link-local/metadata, and CGNAT', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0']) {
    assert(isPublicIPv4(ip) === false, `${ip} should be rejected`);
  }
});

runner.test('isPublicIPv4 rejects malformed input (fail closed)', () => {
  assert(isPublicIPv4('not-an-ip') === false, 'malformed input should be rejected');
  assert(isPublicIPv4('999.999.999.999') === false, 'out-of-range octets should be rejected');
});

runner.test('isPublicIPv6 accepts a well-known public address', () => {
  assert(isPublicIPv6('2606:4700:4700::1111') === true, 'Cloudflare DNS should be public');
});

runner.test('isPublicIPv6 rejects loopback, link-local, and unique-local ranges', () => {
  for (const ip of ['::1', 'fe80::1', 'fc00::1', 'fd12:3456:789a::1']) {
    assert(isPublicIPv6(ip) === false, `${ip} should be rejected`);
  }
});

runner.test('isPublicIPv6 rejects an IPv4-mapped private address', () => {
  assert(isPublicIPv6('::ffff:127.0.0.1') === false, 'IPv4-mapped loopback should be rejected');
  assert(isPublicIPv6('::ffff:8.8.8.8') === true, 'IPv4-mapped public address should be accepted');
});

runner.test('isPublicAddress dispatches by family and fails closed on unknown family', () => {
  assert(isPublicAddress('8.8.8.8', 4) === true, 'family 4 public address should be accepted');
  assert(isPublicAddress('127.0.0.1', 4) === false, 'family 4 private address should be rejected');
  assert(isPublicAddress('::1', 6) === false, 'family 6 private address should be rejected');
  assert(isPublicAddress('8.8.8.8', 5) === false, 'unrecognized family should be rejected');
});

// --- static file contracts ---

runner.test('geo-compliance-inspector tool directory has meta.json and index.html', () => {
  const toolDir = join(rootDir, 'src', 'tools', 'dev', 'geo-compliance-inspector');
  assert(existsSync(join(toolDir, 'meta.json')), 'meta.json should exist');
  assert(existsSync(join(toolDir, 'index.html')), 'index.html should exist');
});

runner.test('geo-compliance-inspector meta.json is well-formed and matches its route', () => {
  const meta = JSON.parse(readFileSync(join(rootDir, 'src', 'tools', 'dev', 'geo-compliance-inspector', 'meta.json'), 'utf8'));
  assert(meta.id === 'geo-compliance-inspector', 'id should match the directory name');
  assert(meta.category === 'dev', 'category should be dev');
});

runner.test('tool-certification.json has a CERTIFIED record for the inspector route', () => {
  const certification = JSON.parse(readFileSync(join(rootDir, 'src', 'data', 'tool-certification.json'), 'utf8'));
  const record = certification.records.find((r) => r.Route === '/tools/dev/geo-compliance-inspector/');
  assert(record, 'a certification record should exist for this route');
  assert(record.CertificationStatus === 'CERTIFIED', 'the record should be CERTIFIED');
  assert(record.ExternalNetwork === true, 'ExternalNetwork should truthfully be true (it fetches user-supplied URLs)');
});

runner.run();
