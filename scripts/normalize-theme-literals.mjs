#!/usr/bin/env node
/**
 * Replaces hard-coded dark-theme colour literals with theme tokens.
 *
 * Most tool pages were authored against a dark palette and carry those hex
 * values inline. The site now defaults to the light theme, so those literals
 * render as light-on-light: an axe sweep of the 80 indexable routes found
 * serious colour-contrast failures on 36 of them, dominated by
 *
 *   #a5f3fc on #ffffff = 1.24    #a1a1aa on #ffffff = 2.56
 *   #fafafa on #ffffff = 1.04    #00d9ff on #ffffff = 1.69
 *
 * Each literal maps to the token that carries the same role in both themes, so
 * the page follows the theme instead of fighting it.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { globSync } from 'glob';

const ROLE_TOKENS = [
  // Foreground roles
  [/#FAFAFA\b/gi, 'var(--text-primary)'],
  [/#F8FAFC\b/gi, 'var(--text-primary)'],
  [/#A1A1AA\b/gi, 'var(--text-secondary)'],
  [/#71717A\b/gi, 'var(--text-secondary)'],
  [/#52525B\b/gi, 'var(--text-tertiary)'],
  // Accent roles: the cyan literals are unreadable on a light surface.
  [/#00D9FF\b/gi, 'var(--accent-text)'],
  [/#A5F3FC\b/gi, 'var(--accent-text)'],
  [/#22D3EE\b/gi, 'var(--accent-text)'],
  [/#67E8F9\b/gi, 'var(--accent-text)'],
  // Status roles
  [/#00FF88\b/gi, 'var(--color-success-text)'],
  [/#FF6B6B\b/gi, 'var(--color-error-text)'],
  [/#FFC107\b/gi, 'var(--color-warning-text)']
];

const SKIP = [
  'src/styles/critical.css',        // defines the dark palette itself
  'public/styles/critical.css',
  'src/styles/theme-professional.css',
  'public/styles/theme-professional.css'
];

const files = globSync('{src/tools,src/blog,categories,guides,site-map,author}/**/*.html')
  .concat(globSync('src/styles/*.css'))
  .concat(['index.html', 'pricing.html'])
  .filter((file) => !SKIP.includes(file));

let changedFiles = 0;
let replacements = 0;

for (const file of files) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  const before = text;
  for (const [pattern, token] of ROLE_TOKENS) {
    text = text.replace(pattern, () => {
      replacements += 1;
      return token;
    });
  }
  if (text !== before) {
    writeFileSync(file, text);
    changedFiles += 1;
  }
}

console.log(`Theme literals normalised: ${replacements} replacement(s) across ${changedFiles} file(s).`);
