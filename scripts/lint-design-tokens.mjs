#!/usr/bin/env node
/**
 * Design-token completeness gate.
 *
 * CSS drops an entire declaration when it references an undefined custom
 * property with no fallback. That failure is silent: .container lost its
 * max-width and the homepage <h1> rendered at the inherited 16px — smaller
 * than its own subtitle — because --container-xl and --font-size-6xl were
 * used but never defined.
 *
 * This gate collects every custom property defined anywhere in the stylesheet
 * set and fails when one is consumed via var(--x) with no fallback and no
 * definition.
 */
import { readFileSync } from 'node:fs';
import { globSync } from 'glob';

const SHEETS = globSync('{src,public}/styles/**/*.css').sort();

// Properties set from JavaScript at runtime rather than declared in CSS.
const RUNTIME_DEFINED = new Set([]);

const defined = new Set(RUNTIME_DEFINED);
const used = new Map();

for (const sheet of SHEETS) {
  const css = readFileSync(sheet, 'utf8');
  for (const match of css.matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) defined.add(match[1]);
}

for (const sheet of SHEETS) {
  const css = readFileSync(sheet, 'utf8');
  // var(--name) with no comma before the closing paren is a fallback-free read.
  for (const match of css.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*\)/g)) {
    if (!used.has(match[1])) used.set(match[1], new Set());
    used.get(match[1]).add(sheet);
  }
}

// An inline <style> block can also read an undefined token. Where it supplies
// a fallback the rule survives, but a dark-palette fallback then renders on the
// light theme — which is how a table header ended up #172033 on #1e293b.
const INLINE_HTML = globSync('{src,blog,categories,guides}/**/*.html').concat(['index.html']);
const darkFallbacks = [];
for (const file of INLINE_HTML) {
  let html;
  try {
    html = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const style of html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)) {
    for (const match of style[1].matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*\)/g)) {
      if (!defined.has(match[1])) {
        if (!used.has(match[1])) used.set(match[1], new Set());
        used.get(match[1]).add(file);
      }
    }
    for (const match of style[1].matchAll(/var\(\s*(--[a-zA-Z0-9-]+)\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)/g)) {
      if (!defined.has(match[1])) darkFallbacks.push(`${file}: var(${match[1]}, ${match[2]})`);
    }
  }
}

const missing = [...used.keys()].filter((name) => !defined.has(name)).sort();

if (darkFallbacks.length) {
  console.error('❌ inline styles fall back to a hard-coded colour for a token that does not exist:');
  for (const entry of darkFallbacks) console.error(`  - ${entry}`);
  console.error('\nThe fallback wins in every theme, so a dark value renders on the light theme.');
  process.exit(1);
}

if (missing.length) {
  console.error('❌ design tokens used without a definition or fallback:');
  for (const name of missing) {
    console.error(`  - ${name}  used in ${[...used.get(name)].join(', ')}`);
  }
  console.error('\nEvery rule that reads one of these is silently dropped by the browser.');
  process.exit(1);
}

console.log(`design token contract: pass (${defined.size} defined, ${used.size} referenced without fallback across ${SHEETS.length} stylesheet(s))`);
