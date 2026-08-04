#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { globSync } from 'glob';

const root = process.cwd();
const files = globSync([
  '*.html',
  'src/**/*.{html,js,mjs}',
  'public/**/*.{html,js,mjs}',
  'blog/**/*.html',
  'categories/**/*.html'
], {
  cwd: root,
  nodir: true,
  ignore: ['dist/**', 'node_modules/**', 'coverage/**']
});

const rules = [
  {
    id: 'back-button-forward-lock',
    pattern: /(?:window\.)?history\.forward\s*\(/i,
    message: 'Do not force visitors forward in browser history.'
  },
  {
    id: 'popstate-history-trap',
    pattern: /(?:onpopstate|addEventListener\s*\(\s*['"]popstate['"])[\s\S]{0,600}(?:pushState|replaceState)\s*\(/i,
    message: 'Do not rewrite history from a popstate handler.'
  },
  {
    id: 'automatic-meta-refresh',
    pattern: /<meta\b[^>]*http-equiv\s*=\s*['"]?refresh\b/i,
    message: 'Automatic meta refresh redirects are disallowed.'
  },
  {
    id: 'disable-user-zoom',
    pattern: /<meta\b[^>]*name\s*=\s*['"]viewport['"][^>]*(?:user-scalable\s*=\s*no|maximum-scale\s*=\s*1(?:\.0)?)(?:[,;"']|\s|>)/i,
    message: 'Viewport settings must not disable user zoom.'
  },
  {
    id: 'disable-copy-selection',
    pattern: /(?:oncopy|onselectstart)\s*=|addEventListener\s*\(\s*['"](?:copy|selectstart)['"][\s\S]{0,240}preventDefault\s*\(/i,
    message: 'Do not block copying or text selection.'
  }
];

const failures = [];
for (const file of files) {
  const source = readFileSync(resolve(root, file), 'utf8');
  for (const rule of rules) {
    if (rule.pattern.test(source)) failures.push(`${relative(root, resolve(root, file))}: [${rule.id}] ${rule.message}`);
  }
}

const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
const ci = packageJson.scripts?.['ci:validate'] || '';
for (const required of [
  'audit:adsense',
  'audit:algorithm-resilience',
  'lint:performance-budget',
  'lint:critical-css',
  'lint:rss',
  'audit:public-routes'
]) {
  if (!ci.includes(required)) failures.push(`package.json: ci:validate must include ${required}`);
}

if (failures.length) {
  throw new Error(`Algorithm resilience audit failed:\n${failures.join('\n')}`);
}

console.log(`Algorithm resilience audit passed for ${files.length} source files: navigation freedom, zoom, selection, performance and search quality gates are protected.`);
