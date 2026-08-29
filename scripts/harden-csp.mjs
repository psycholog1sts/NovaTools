#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const checkMode = process.argv.includes('--check');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distDir = path.join(root, 'dist');

function listHtmlFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listHtmlFiles(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function normalizeWave2Actions() {
  const replacements = [
    [/onclick="toggleSearch\(\)"/g, 'data-nv-click="toggleSearch"'],
    [/onclick="toggleMobileMenu\(\)"/g, 'data-nv-click="toggleMobileMenu"'],
    [/onclick="setExample\('what-is',\s*20,\s*100\)"/g, 'data-nv-click="setExample" data-nv-args=\'["what-is",20,100]\''],
    [/onclick="setExample\('x-is-what',\s*25,\s*200\)"/g, 'data-nv-click="setExample" data-nv-args=\'["x-is-what",25,200]\''],
    [/onclick="setExample\('increase',\s*100,\s*15\)"/g, 'data-nv-click="setExample" data-nv-args=\'["increase",100,15]\''],
    [/onclick="setExample\('decrease',\s*100,\s*10\)"/g, 'data-nv-click="setExample" data-nv-args=\'["decrease",100,10]\'']
  ];

  let rewritten = 0;
  for (const file of listHtmlFiles(distDir)) {
    const before = fs.readFileSync(file, 'utf8');
    let html = before;
    for (const [pattern, replacement] of replacements) html = html.replace(pattern, replacement);
    if (html !== before) {
      fs.writeFileSync(file, html);
      rewritten += 1;
    }
  }

  return rewritten;
}

if (!checkMode) normalizeWave2Actions();
await import('./harden-csp-core.mjs');
