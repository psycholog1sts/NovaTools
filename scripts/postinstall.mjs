#!/usr/bin/env node
/**
 * Post-install script
 * Generates tools manifest and validates structure
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '..');

/**
 * Recursively find all meta.json files
 */
function findMetaFiles(dir, files = []) {
  if (!existsSync(dir)) return files;
  
  const items = readdirSync(dir);
  
  for (const item of items) {
    const fullPath = join(dir, item);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      findMetaFiles(fullPath, files);
    } else if (item === 'meta.json') {
      files.push(fullPath);
    }
  }
  
  return files;
}

/**
 * Generate tools manifest
 */
function generateManifest() {
  const toolsDir = join(rootDir, 'src', 'tools');
  const metaFiles = findMetaFiles(toolsDir);
  const certificationPath = join(rootDir, 'src', 'data', 'tool-certification.json');
  const certificationByRoute = existsSync(certificationPath)
    ? new Map(JSON.parse(readFileSync(certificationPath, 'utf8')).records.map((record) => [record.Route, record]))
    : new Map();
  
  const tools = [];
  
  for (const metaPath of metaFiles) {
    try {
      const content = readFileSync(metaPath, 'utf-8');
      const meta = JSON.parse(content);

      const publicTool = meta.public !== false;
      
      // Calculate relative path
      const relativePath = metaPath
        .replace(toolsDir, '')
        .replace('\\meta.json', '')
        .replace('/meta.json', '')
        .replace(/\\/g, '/');
      const route = `/tools${relativePath}/`;
      const certification = certificationByRoute.get(route);
      // The canonical matrix is the only authority that can promote a tool.
      // Missing rows fail closed so unfinished tools cannot leak into search,
      // sitemap or advertising through legacy metadata defaults.
      const certificationStatus = certification?.CertificationStatus || 'UNAVAILABLE';
      
      tools.push({
        ...meta,
        public: publicTool,
        indexable: certification?.Indexable ?? (meta.indexable !== false && certificationStatus === 'CERTIFIED'),
        adsEligible: certification?.AdsEligible ?? (meta.adsEligible !== false && certificationStatus === 'CERTIFIED' && publicTool),
        certificationStatus,
        privacyMode: certification?.PrivacyTruth || meta.privacyMode || 'UNREVIEWED',
        externalNetwork: certification?.ExternalNetwork ?? meta.externalNetwork ?? 'UNREVIEWED',
        syntheticData: certification?.SyntheticData || meta.syntheticData || 'UNREVIEWED',
        dataSource: certification?.DataSource || meta.dataSource || null,
        limitations: certification?.KnownLimitations || meta.limitations || null,
        path: relativePath,
        entry: `/src/tools${relativePath}/`
      });
    } catch (error) {
      console.warn(`Failed to parse ${metaPath}:`, error.message);
    }
  }
  
  // Sort by category and tier
  tools.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return (a.tier || 99) - (b.tier || 99);
  });
  
  return tools;
}

/**
 * Save manifest to JSON file
 */
function saveManifest(tools) {
  const outputPath = join(rootDir, 'tools-manifest.json');
  const data = {
    generated: 'postinstall',
    count: tools.length,
    tools
  };
  
  writeFileSync(outputPath, JSON.stringify(data, null, 2));
  console.log(`✓ Generated tools-manifest.json with ${tools.length} tools`);
}

/**
 * Validate tools structure
 */
function validateTools(tools) {
  const required = ['id', 'name', 'category', 'description'];
  const errors = [];
  const htmlOnlyTools = [];
  
  for (const tool of tools) {
    for (const field of required) {
      if (!tool[field]) {
        errors.push(`${tool.id || 'unknown'}: missing ${field}`);
      }
    }
    
    // Check entry files exist
    const entryPath = join(rootDir, 'src', 'tools', tool.path.replace(/\\/g, '/'));
    const indexPath = join(entryPath, 'index.html');
    const logicPath = join(entryPath, 'logic.mjs');
    
    if (!existsSync(indexPath)) {
      errors.push(`${tool.id}: missing index.html`);
    }
    if (!existsSync(logicPath)) {
      htmlOnlyTools.push(tool.id);
    }
  }
  
  if (errors.length > 0) {
    console.warn('\n⚠️  Validation warnings:');
    errors.forEach(e => console.warn(`  - ${e}`));
  } else {
    console.log('✓ All required tool entry files validated');
  }

  if (htmlOnlyTools.length > 0) {
    console.log(`ℹ ${htmlOnlyTools.length} tools use inline HTML scripts without standalone logic.mjs files`);
  }
}

// Main
console.log('🔧 Running post-install...\n');

try {
  const tools = generateManifest();
  saveManifest(tools);
  validateTools(tools);
  
  console.log('\n✓ Post-install complete');
} catch (error) {
  console.error('\n✗ Post-install failed:', error.message);
  process.exit(1);
}
