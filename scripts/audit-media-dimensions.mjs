#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { fileURLToPath } from 'url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlGlobs = [
  '*.html',
  'categories/**/*.html',
  'src/blog/index.html',
  'src/blog/article-template.html',
  'src/blog/articles/**/*.html',
  'src/tools/**/index.html'
];

const htmlFiles = htmlGlobs.flatMap((pattern) => globSync(pattern, {
  cwd: rootDir,
  nodir: true,
  ignore: ['dist/**', 'node_modules/**']
}));

const uniqueHtmlFiles = [...new Set(htmlFiles)].sort();
const mediaTagPattern = /<(img|iframe|video)\b[^>]*>/gi;
const failures = [];

function stripNonStaticMarkup(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '')
    .replace(/<template\b[\s\S]*?<\/template>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

function hasAttribute(tag, attribute) {
  return new RegExp(`\\b${attribute}\\s*=`, 'i').test(tag);
}

for (const file of uniqueHtmlFiles) {
  const absolutePath = path.join(rootDir, file);
  const html = stripNonStaticMarkup(fs.readFileSync(absolutePath, 'utf8'));

  for (const match of html.matchAll(mediaTagPattern)) {
    const tag = match[0];
    const tagName = match[1].toLowerCase();
    const line = html.slice(0, match.index).split('\n').length;

    if (!hasAttribute(tag, 'width') || !hasAttribute(tag, 'height')) {
      failures.push({ file, line, tagName, tag: tag.replace(/\s+/g, ' ').trim() });
    }
  }
}

if (failures.length > 0) {
  console.error('Static media dimension audit failed. Add explicit width and height attributes to reserve layout space:');
  failures.forEach(({ file, line, tagName, tag }) => {
    console.error(`- ${file}:${line} <${tagName}> missing width/height -> ${tag}`);
  });
  process.exit(1);
}

console.log(`✅ Static media dimension audit passed for ${uniqueHtmlFiles.length} HTML files.`);
