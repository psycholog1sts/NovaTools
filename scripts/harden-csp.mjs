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
    ['onclick="toggleSearch()"', 'data-nv-click="toggleSearch"'],
    ['onclick="toggleMobileMenu()"', 'data-nv-click="toggleMobileMenu"'],
    ['onclick="setExample(\'what-is\', 20, 100)"', 'data-nv-click="setExample" data-nv-args=\'["what-is",20,100]\''],
    ['onclick="setExample(\'x-is-what\', 25, 200)"', 'data-nv-click="setExample" data-nv-args=\'["x-is-what",25,200]\''],
    ['onclick="setExample(\'increase\', 100, 15)"', 'data-nv-click="setExample" data-nv-args=\'["increase",100,15]\''],
    ['onclick="setExample(\'decrease\', 100, 10)"', 'data-nv-click="setExample" data-nv-args=\'["decrease",100,10]\'']
  ];

  for (const file of listHtmlFiles(distDir)) {
    const before = fs.readFileSync(file, 'utf8');
    let html = before;
    for (const [search, replacement] of replacements) {
      html = html.split(search).join(replacement);
    }
    if (html !== before) fs.writeFileSync(file, html);
  }

  const leftovers = [];
  const inlineHandler = /\son(?:abort|blur|change|click|dblclick|error|focus|input|keydown|keypress|keyup|load|mousedown|mouseover|mouseup|reset|scroll|select|submit|toggle|unload)\s*=\s*(["'])([\s\S]*?)\1/gi;
  for (const file of listHtmlFiles(distDir)) {
    const html = fs.readFileSync(file, 'utf8');
    let match;
    while ((match = inlineHandler.exec(html)) !== null) {
      leftovers.push(`${path.relative(distDir, file).replace(/\\/g, '/')}: ${match[0].trim()}`);
      if (leftovers.length >= 20) break;
    }
    if (leftovers.length >= 20) break;
  }
  if (leftovers.length) {
    throw new Error(`Wave2 CSP action normalization left inline handlers:\n  ${leftovers.join('\n  ')}`);
  }
}

if (!checkMode) normalizeWave2Actions();
await import('./harden-csp-core.mjs');
