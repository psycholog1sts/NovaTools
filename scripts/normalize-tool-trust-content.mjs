import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const ROOT = resolve('src/tools');
const WRITE = process.argv.includes('--write');

function walk(dir) {
  const files = [];
  for (const name of readdirSync(dir)) {
    const path = resolve(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) files.push(...walk(path));
    else if (path.endsWith(`${sep}index.html`)) files.push(path);
  }
  return files;
}

function normalize(html) {
  let next = html;

  // Remove the site-wide synthetic expertise block. It duplicated update dates and
  // described hypothetical practitioner expertise rather than page-specific evidence.
  next = next.replace(/\s*<aside\s+class=["']author-bylines["'][\s\S]*?<\/aside>\s*/gi, '\n');

  // Old internal engineering phase labels are not user-facing product copy.
  next = next.replace(/\s*<p[^>]*>\s*(?:Phase\s+\d+[^<]*workflow[^<]*|This\s+Phase\s+\d+[^<]*)<\/p>\s*/gi, '\n');

  return next;
}

let changed = 0;
for (const file of walk(ROOT)) {
  const original = readFileSync(file, 'utf8');
  const next = normalize(original);
  if (next === original) continue;
  changed += 1;
  if (WRITE) writeFileSync(file, next, 'utf8');
}

console.log(`tool trust-content normalization: ${changed} file(s) ${WRITE ? 'updated' : 'would change'}`);
if (!WRITE && changed) process.exitCode = 1;
