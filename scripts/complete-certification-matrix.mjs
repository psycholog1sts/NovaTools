import fs from 'node:fs';

const matrixPath = 'src/data/tool-certification.json';
const manifest = JSON.parse(fs.readFileSync('tools-manifest.json', 'utf8'));
const matrix = JSON.parse(fs.readFileSync(matrixPath, 'utf8'));
const existing = new Map(matrix.records.map((record) => [record.Route, record]));

function statusFields(record) {
  const certified = record.CertificationStatus === 'CERTIFIED';
  return {
    ImplementationStatus: record.ImplementationStatus || (certified ? 'VERIFIED_IMPLEMENTATION' : 'NOT_PRODUCTION_CERTIFIED'),
    RuntimeStatus: record.RuntimeStatus || (certified ? 'VERIFIED_ACTIVE' : 'DISABLED_FAIL_CLOSED'),
    SEOStatus: record.SEOStatus || (record.Indexable ? 'INDEXABLE' : 'NOINDEX'),
    DiscoveryStatus: record.DiscoveryStatus || (certified ? 'PUBLIC_CERTIFIED_ONLY' : 'EXCLUDED'),
    SitemapStatus: record.SitemapStatus || (record.Indexable && certified ? 'INCLUDED' : 'EXCLUDED'),
    TestStatus: record.TestStatus || record.Tests || (certified ? 'PASS' : 'FAIL_CLOSED_CONTRACT_PASS')
  };
}

const manifestRecords = manifest.tools.map((tool) => {
  const route = `/tools${tool.path}/`;
  const current = existing.get(route);
  if (current) return { ...current, ...statusFields(current) };
  const record = {
    Tool: tool.nameEn || (typeof tool.name === 'string' ? tool.name : tool.id),
    Route: route,
    Category: tool.category,
    Indexable: false,
    AdsEligible: false,
    FunctionalTruth: 'NOT_PRODUCTION_CERTIFIED',
    UniqueUtility: 'NOT_PUBLIC',
    SpecificContent: 'PASS_UNAVAILABLE_RUNTIME_NOTICE',
    ImplementationEvidence: 'REQUIRES_ROUTE_LEVEL_VERIFICATION',
    NoFiller: 'PASS_UNAVAILABLE_RUNTIME_NOTICE',
    Trust: 'PASS_FAIL_CLOSED',
    PrivacyTruth: 'NO_TOOL_PROCESSING_ON_PUBLIC_SURFACE',
    ExternalNetwork: false,
    DataSource: 'None on fail-closed public surface',
    SyntheticData: 'NONE_ON_PUBLIC_SURFACE',
    KnownLimitations: 'The route remains disabled until implementation, runtime, privacy, accessibility, and output behavior complete production certification.',
    UIStatus: 'RUNTIME_UNAVAILABLE_NOTICE',
    Tests: 'certification fail-closed contract',
    CertificationStatus: 'UNAVAILABLE'
  };
  return { ...record, ...statusFields(record) };
});
const manifestRoutes = new Set(manifestRecords.map((record) => record.Route));
const additionalCanonicalRecords = matrix.records
  .filter((record) => !manifestRoutes.has(record.Route))
  .map((record) => ({ ...record, ...statusFields(record) }));
const records = [...manifestRecords, ...additionalCanonicalRecords];

fs.writeFileSync(matrixPath, `${JSON.stringify({ ...matrix, records }, null, 2)}\n`);
console.log(`Certification matrix completed with ${records.length} rows.`);
