#!/usr/bin/env node
/**
 * Keep category hubs aligned with the certification manifest.
 *
 * Built hubs may still contain cards and shortcuts for routes that are not
 * production certified. This pass removes those entries, de-duplicates guide
 * cards, and ensures that a hub with a certified referenced tool does not end
 * up as an empty shell after pruning.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { globSync } from 'glob';

const manifest = JSON.parse(readFileSync('tools-manifest.json', 'utf8'));
const certifiedHrefs = new Set();
const certifiedByRelativePath = new Map();

for (const tool of manifest.tools) {
  if (tool.public !== true || tool.indexable !== true || tool.certificationStatus !== 'CERTIFIED') continue;
  const path = String(tool.path || '').replace(/^\/+|\/+$/g, '');
  if (!path) continue;
  certifiedHrefs.add(`/tools/${path}/`);
  certifiedByRelativePath.set(path, tool);
}

function hrefPath(href) {
  try {
    return new URL(href, 'https://mc-novatools.com').pathname;
  } catch {
    return href;
  }
}

function isCertifiedToolHref(href) {
  const path = hrefPath(href);
  if (!/^\/tools\/[^/]+\/[^/]+\/$/.test(path)) return true;
  return certifiedHrefs.has(path);
}

function splitElements(html, tag) {
  const open = new RegExp(`<${tag}\\b`, 'gi');
  const parts = [];
  let match;
  const starts = [];
  while ((match = open.exec(html))) starts.push(match.index);
  for (let i = 0; i < starts.length; i += 1) {
    const from = starts[i];
    const to = i + 1 < starts.length ? starts[i + 1] : html.length;
    parts.push({ from, to, html: html.slice(from, to) });
  }
  return parts;
}

function filterBlock(html, openTag, closeTag, tag, keep, onRemoved) {
  const start = html.indexOf(openTag);
  if (start === -1) return html;
  const innerStart = start + openTag.length;
  const end = html.indexOf(closeTag, innerStart);
  if (end === -1) return html;

  const inner = html.slice(innerStart, end);
  const items = splitElements(inner, tag);
  if (!items.length) return html;

  const kept = [];
  let removed = 0;
  for (const item of items) {
    if (keep(item.html)) kept.push(item.html);
    else removed += 1;
  }
  if (!removed) return html;
  onRemoved(removed);
  return html.slice(0, innerStart) + kept.join('') + html.slice(end);
}

function firstToolHref(fragment) {
  const match = fragment.match(/href="([^"]*\/tools\/[^"]+)"/);
  return match ? match[1] : null;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function referencedToolPaths(meta) {
  const paths = [];
  for (const audience of meta.targetAudience || []) {
    for (const tool of audience.tools || []) paths.push(tool);
  }
  for (const task of meta.commonTasks || []) {
    if (task.tool) paths.push(task.tool);
  }
  return [...new Set(paths.map((value) => String(value).replace(/^\/+|\/+$/g, '')))];
}

function ensureCertifiedCard(html, file) {
  if (html.includes('guide-tool-card')) return html;
  const slug = basename(file, '.html');
  const metaPath = join('src', 'data', 'category-meta', slug, 'category-meta.json');
  if (!existsSync(metaPath)) return html;

  const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
  const tool = referencedToolPaths(meta)
    .map((path) => certifiedByRelativePath.get(path))
    .find(Boolean);
  if (!tool) return html;

  const relativePath = String(tool.path || '').replace(/^\/+|\/+$/g, '');
  const href = `/tools/${relativePath}/`;
  const name = escapeHtml(tool.nameEn || tool.name || tool.id);
  const description = escapeHtml(
    typeof tool.description === 'string'
      ? tool.description
      : tool.description?.en || tool.description?.tr || 'Open the certified tool.'
  );
  const card = `<article class="guide-tool-card nt-card nt-card--tool"><div class="guide-tool-card__body"><h3><a href="${href}">${name}</a></h3><p>${description}</p></div><a class="btn btn-primary" href="${href}">Use tool</a></article>`;
  return html.replace('<div class="guide-tools-grid">', `<div class="guide-tools-grid">${card}`);
}

const files = globSync('dist/**/categories/*.html');
let changedFiles = 0;
let removedCards = 0;

for (const file of files) {
  let html = readFileSync(file, 'utf8');
  const before = html;
  let removedHere = 0;

  html = filterBlock(
    html,
    '<div class="guide-tools-grid">',
    '</div></div></section>',
    'article',
    (fragment) => {
      const href = firstToolHref(fragment);
      return !href || isCertifiedToolHref(href);
    },
    (n) => { removedHere += n; }
  );

  html = filterBlock(
    html,
    '<ol class="task-steps">',
    '</ol>',
    'li',
    (fragment) => {
      const href = firstToolHref(fragment);
      return !href || isCertifiedToolHref(href);
    },
    () => {}
  );

  html = html.replace(
    /(<div class="related-article-grid">)([\s\S]*?)(<\/div><\/div><\/section>)/,
    (match, open, inner, close) => {
      const cards = splitElements(inner, 'article');
      const seen = new Set();
      const kept = [];
      for (const card of cards) {
        const href = card.html.match(/href="([^"]+)"/)?.[1];
        if (href && seen.has(href)) continue;
        if (href) seen.add(href);
        kept.push(card.html);
      }
      return kept.length === cards.length ? match : `${open}${kept.join('')}${close}`;
    }
  );

  html = ensureCertifiedCard(html, file);

  if (removedHere) {
    const note = `<p class="guide-availability-note">${removedHere} further tool${removedHere === 1 ? '' : 's'} in this category ${removedHere === 1 ? 'is' : 'are'} still in development and not published yet. Only tools that passed certification are listed here.</p>`;
    html = html.replace('<div class="guide-tools-grid">', `${note}<div class="guide-tools-grid">`);
  }

  if (html !== before) {
    writeFileSync(file, html);
    changedFiles += 1;
    removedCards += removedHere;
  }
}

console.log(`Category availability: removed ${removedCards} uncertified tool card(s) across ${changedFiles} hub file(s).`);
