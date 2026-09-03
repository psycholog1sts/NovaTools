#!/usr/bin/env node
/**
 * Category hubs must only offer tools that actually work.
 *
 * The committed hub pages list every tool in a category, including the ~110
 * routes that fail closed. That produced a "Use tool" button per uncertified
 * tool — well over a hundred controls that look interactive and land on an
 * "unavailable" page. It also made a hub look full while none of it worked.
 *
 * This pass runs over the built hubs and:
 *  - removes tool cards, task steps and decision rows for tools that are not
 *    CERTIFIED, replacing them with one honest count,
 *  - de-duplicates the related-guides list,
 *  - leaves certified cards untouched.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'glob';

const manifest = JSON.parse(readFileSync('tools-manifest.json', 'utf8'));

const certifiedHrefs = new Set();
for (const tool of manifest.tools) {
  if (tool.public !== true || tool.indexable !== true || tool.certificationStatus !== 'CERTIFIED') continue;
  const path = String(tool.path || '').replace(/^\/+|\/+$/g, '');
  if (path) certifiedHrefs.add(`/tools/${path}/`);
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
  if (!/^\/tools\/[^/]+\/[^/]+\/$/.test(path)) return true; // not a tool route
  return certifiedHrefs.has(path);
}

/** Split a container's direct children by a top-level tag, without a parser. */
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

const files = globSync('dist/**/categories/*.html');
let changedFiles = 0;
let removedCards = 0;

for (const file of files) {
  let html = readFileSync(file, 'utf8');
  const before = html;
  let removedHere = 0;

  // 1. Tool cards
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

  // 2. Task shortcuts that open an unavailable tool
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

  // 3. Related guides repeated three times over the same article
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

  // 4. State the withheld count instead of pretending the tools are missing.
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
