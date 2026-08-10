import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBlockedPublicClaims, sanitizeHtmlTrustClaims } from '../src/core/trust/public-claim-policy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '..', 'dist');

if (!fs.existsSync(distDir)) {
  console.error('Public trust normalization requires an existing dist directory.');
  process.exit(1);
}

function collectHtmlFiles(dir) {
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectHtmlFiles(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.html')) files.push(fullPath);
  }
  return files;
}

const files = collectHtmlFiles(distDir);
let changed = 0;

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  const normalized = sanitizeHtmlTrustClaims(original);
  if (normalized !== original) {
    fs.writeFileSync(file, normalized);
    changed += 1;
  }
}

const failures = [];
for (const file of files) {
  const findings = findBlockedPublicClaims(fs.readFileSync(file, 'utf8'));
  if (findings.length) failures.push({ file: path.relative(distDir, file), findings });
}

if (failures.length) {
  console.error('Blocked public trust claims remain after normalization:');
  for (const failure of failures.slice(0, 40)) {
    console.error(`- ${failure.file}: ${failure.findings.join(', ')}`);
  }
  if (failures.length > 40) console.error(`...and ${failures.length - 40} additional files.`);
  process.exit(1);
}

console.log(`Public trust normalization: PASS (${changed} HTML files changed, ${files.length} checked)`);
