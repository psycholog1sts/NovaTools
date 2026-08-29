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

const missing = [...used.keys()].filter((name) => !defined.has(name)).sort();

if (missing.length) {
  console.error('❌ design tokens used without a definition or fallback:');
  for (const name of missing) {
    console.error(`  - ${name}  used in ${[...used.get(name)].join(', ')}`);
  }
  console.error('\nEvery rule that reads one of these is silently dropped by the browser.');
  process.exit(1);
}

console.log(`design token contract: pass (${defined.size} defined, ${used.size} referenced without fallback across ${SHEETS.length} stylesheet(s))`);
