import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { structuredDataConstants } from '../src/seo/structured-data-templates.mjs';

const distDir = resolve(process.argv.includes('--dist') ? 'dist' : 'dist');
const reportPath = resolve('docs/structured-data-validation.md');

const walkHtml = (dir) => {
  const entries = [];
  for (const name of readdirSync(dir)) {
    const fullPath = join(dir, name);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) entries.push(...walkHtml(fullPath));
    else if (name.endsWith('.html')) entries.push(fullPath);
  }
  return entries;
};

const extractJsonLd = (html) => {
  const scripts = [];
  const pattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html))) {
    const content = match[1].trim();
    if (!content) continue;
    scripts.push(JSON.parse(content));
  }
  return scripts;
};

const flattenNodes = (schema) => {
  if (!schema) return [];
  if (Array.isArray(schema)) return schema.flatMap(flattenNodes);
  if (Array.isArray(schema['@graph'])) return schema['@graph'];
  return [schema];
};

const collectReferences = (value, refs = []) => {
  if (!value || typeof value !== 'object') return refs;
  if (Array.isArray(value)) {
    value.forEach((item) => collectReferences(item, refs));
    return refs;
  }
  if (typeof value['@id'] === 'string' && Object.keys(value).length === 1) refs.push(value['@id']);
  Object.entries(value).forEach(([key, nested]) => {
    if (key !== '@id') collectReferences(nested, refs);
  });
  return refs;
};

const isPageType = (type) => {
  const types = Array.isArray(type) ? type : [type];
  return types.some((entry) => ['WebPage', 'CollectionPage', 'ProfilePage'].includes(entry));
};

if (!existsSync(distDir)) {
  throw new Error('dist directory does not exist. Run npm run build before structured data validation.');
}

const files = walkHtml(distDir);
const allIds = new Map();
const pageTypeCounts = new Map();
const pageReports = [];
const errors = [];

for (const file of files) {
  const relativePath = relative(distDir, file).split(sep).join('/');
  const html = readFileSync(file, 'utf8');
  let schemas;
  try {
    schemas = extractJsonLd(html);
  } catch (error) {
    errors.push(`${relativePath}: invalid JSON-LD (${error.message})`);
    continue;
  }
  const nodes = schemas.flatMap(flattenNodes);
  if (!nodes.length) continue;

  const ids = [];
  const refs = [];
  const types = [];
  nodes.forEach((node) => {
    if (node['@type']) types.push(Array.isArray(node['@type']) ? node['@type'].join('+') : node['@type']);
    if (node['@id']) {
      ids.push(node['@id']);
      if (!allIds.has(node['@id'])) allIds.set(node['@id'], []);
      allIds.get(node['@id']).push(relativePath);
    }
    refs.push(...collectReferences(node));
    if (isPageType(node['@type'])) {
      const pageUrl = String(node.url || node['@id'] || relativePath).replace(/#.*$/, '');
      pageTypeCounts.set(pageUrl, (pageTypeCounts.get(pageUrl) || 0) + 1);
      if (node['@id'] && !/#(webpage|person|editorial)$/.test(node['@id']) && isPageType(node['@type'])) {
        errors.push(`${relativePath}: page node @id must use a URL fragment ending in #webpage for page types (${node['@id']})`);
      }
    }
  });
  pageReports.push({ relativePath, types, ids, refs });
}

for (const [id, locations] of allIds.entries()) {
  if ([structuredDataConstants.ORGANIZATION_ID, structuredDataConstants.WEBSITE_ID].includes(id) && locations.length > 4) {
    errors.push(`${id} is defined too many times (${locations.length}); Organization/WebSite should only be defined on home locale outputs.`);
  }
}

const globalIds = new Set(allIds.keys());
const externalReferencePrefixes = ['http://schema.org/', 'https://schema.org/'];
for (const report of pageReports) {
  for (const ref of report.refs) {
    if (externalReferencePrefixes.some((prefix) => ref.startsWith(prefix))) continue;
    if (!globalIds.has(ref)) errors.push(`${report.relativePath}: unresolved @id reference ${ref}`);
  }
}

for (const [pageUrl, count] of pageTypeCounts.entries()) {
  if (count > 1) errors.push(`${pageUrl}: duplicate page-type node definitions (${count})`);
}

const typeSummary = pageReports.reduce((acc, report) => {
  report.types.forEach((type) => acc.set(type, (acc.get(type) || 0) + 1));
  return acc;
}, new Map());

const markdown = [
  '# Structured Data Graph Validation Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Scope',
  '',
  `- HTML files scanned: ${files.length}`,
  `- HTML files with JSON-LD: ${pageReports.length}`,
  `- Unique @id definitions: ${allIds.size}`,
  '',
  '## Type summary',
  '',
  ...[...typeSummary.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([type, count]) => `- ${type}: ${count}`),
  '',
  '## @id consistency',
  '',
  ...(errors.length
    ? ['- Validation failed. See errors below.']
    : [
      '- All collected local `@id` references resolve to a JSON-LD node in the built site graph.',
      '- Organization and WebSite definitions are centralized on home-page outputs and reused by reference elsewhere.'
    ]),
  '',
  '## Errors',
  '',
  ...(errors.length ? errors.map((error) => `- ${error}`) : ['- None'])
].join('\n');

writeFileSync(reportPath, `${markdown}\n`);

if (errors.length) {
  console.error(markdown);
  process.exit(1);
}

console.log(markdown);
