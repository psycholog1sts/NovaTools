#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { globSync } from 'glob';

const root = process.cwd();
const distDir = resolve(root, 'dist');
const sourceCss = resolve(root, 'src/styles/critical.css');
const publicCss = resolve(root, 'public/styles/critical.css');
const criticalCssPath = existsSync(sourceCss) ? sourceCss : publicCss;
const mode = process.argv.includes('--check') ? 'check' : 'write';

if (!existsSync(criticalCssPath)) {
  throw new Error('Critical CSS file not found at src/styles/critical.css or public/styles/critical.css');
}

const criticalCss = readFileSync(criticalCssPath, 'utf8').trim();
const inlineBlock = `<style data-critical-css="novatools">\n${criticalCss}\n</style>`;
const htmlFiles = globSync('**/*.html', { cwd: distDir, nodir: true });
const missing = [];

for (const file of htmlFiles) {
  const absolute = join(distDir, file);
  let html = readFileSync(absolute, 'utf8');
  if (html.includes('data-critical-css="novatools"')) continue;

  missing.push(file);
  if (mode === 'write') {
    html = html.replace(/<link[^>]+href=["'][^"']*critical[^"']*\.css["'][^>]*>\s*/i, '');
    if (!html.includes('</head>')) {
      throw new Error(`Cannot inline critical CSS because </head> is missing in ${relative(root, absolute)}`);
    }
    writeFileSync(absolute, html.replace('</head>', `  ${inlineBlock}\n</head>`));
  }
}

if (mode === 'check' && missing.length) {
  throw new Error(`Critical CSS is not inlined in ${missing.length} built HTML file(s): ${missing.slice(0, 10).join(', ')}`);
}

console.log(`${mode === 'write' ? 'Inlined' : 'Verified'} critical CSS for ${htmlFiles.length} built HTML file(s).`);
