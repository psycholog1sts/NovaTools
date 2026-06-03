#!/usr/bin/env node
import { readFileSync, statSync } from 'fs';
import { gzipSync } from 'zlib';
import { dirname, join, resolve } from 'path';
import { globSync } from 'glob';

const distDir = resolve(process.cwd(), 'dist');
const budgets = {
  firstLoadJsKb: 200,
  firstLoadCssKb: 50,
  pageImagesKb: 500
};
const failures = [];

function toDistPath(htmlFile, assetUrl) {
  if (!assetUrl || /^(?:https?:|data:|mailto:|tel:)/i.test(assetUrl)) return null;
  const clean = assetUrl.split('#')[0].split('?')[0];
  if (!clean) return null;
  return clean.startsWith('/') ? join(distDir, clean) : join(dirname(join(distDir, htmlFile)), clean);
}

function transferSizeKb(path) {
  try {
    const ext = path?.split('.').pop()?.toLowerCase();
    if (['js', 'css', 'html', 'svg', 'json'].includes(ext)) {
      return gzipSync(readFileSync(path), { level: 9 }).length / 1024;
    }
    return statSync(path).size / 1024;
  } catch {
    return 0;
  }
}

for (const htmlFile of globSync('**/*.html', { cwd: distDir, nodir: true })) {
  const html = readFileSync(join(distDir, htmlFile), 'utf8');
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
  const modulePreloads = [...html.matchAll(/<link\b(?=[^>]*\brel=["']modulepreload["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi)].map((match) => match[1]);
  const styles = [...html.matchAll(/<link\b(?=[^>]*\brel=["']stylesheet["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/gi)].map((match) => match[1]);
  const images = [...html.matchAll(/<(?:img|source)\b[^>]*(?:src|srcset)=["']([^"']+)["'][^>]*>/gi)]
    .flatMap((match) => match[1].split(',').map((candidate) => candidate.trim().split(/\s+/)[0]));

  const jsKb = [...new Set([...scripts, ...modulePreloads])]
    .filter((asset) => asset.endsWith('.js') || asset.includes('.js?'))
    .reduce((total, asset) => total + transferSizeKb(toDistPath(htmlFile, asset)), 0);
  const cssKb = [...new Set(styles)]
    .reduce((total, asset) => total + transferSizeKb(toDistPath(htmlFile, asset)), 0);
  const imageKb = [...new Set(images)]
    .reduce((total, asset) => total + transferSizeKb(toDistPath(htmlFile, asset)), 0);

  if (jsKb > budgets.firstLoadJsKb) failures.push(`${htmlFile}: first-load JS transfer is ${jsKb.toFixed(1)}KB > ${budgets.firstLoadJsKb}KB`);
  if (cssKb > budgets.firstLoadCssKb) failures.push(`${htmlFile}: linked CSS transfer is ${cssKb.toFixed(1)}KB > ${budgets.firstLoadCssKb}KB`);
  if (imageKb > budgets.pageImagesKb) failures.push(`${htmlFile}: HTML image candidates are ${imageKb.toFixed(1)}KB > ${budgets.pageImagesKb}KB`);
}

if (failures.length) {
  throw new Error(`Performance budget exceeded:\n${failures.slice(0, 80).join('\n')}${failures.length > 80 ? `\n...and ${failures.length - 80} more` : ''}`);
}

console.log('Performance budget passed: first-load JS transfer <=200KB, linked CSS transfer <=50KB, HTML image candidates <=500KB per page.');
