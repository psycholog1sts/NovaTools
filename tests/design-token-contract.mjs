import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const tokenPath = new URL('../src/styles/tokens.css', import.meta.url);
const designSystemPath = new URL('../src/styles/design-system.css', import.meta.url);
const mainPath = new URL('../src/styles/main.css', import.meta.url);

assert.equal(existsSync(tokenPath), true, 'src/styles/tokens.css must be the canonical shared token layer.');

const tokens = readFileSync(tokenPath, 'utf8');
const designSystem = readFileSync(designSystemPath, 'utf8');
const main = readFileSync(mainPath, 'utf8');

for (const token of [
  '--color-bg-canvas', '--color-bg-surface', '--color-bg-elevated',
  '--color-text-primary', '--color-text-secondary', '--color-text-muted',
  '--color-border', '--color-primary', '--color-focus-ring',
  '--color-success', '--color-warning', '--color-error',
  '--space-1', '--space-2', '--space-3', '--space-4', '--space-6', '--space-8',
  '--radius-sm', '--radius-md', '--radius-lg', '--shadow-sm', '--shadow-lg',
  '--duration-fast', '--duration-normal'
]) {
  assert.match(tokens, new RegExp(`${token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:`), `Missing canonical token ${token}`);
}

assert.match(tokens, /@media\s*\(prefers-reduced-motion:\s*reduce\)/, 'Canonical token layer must define reduced-motion behavior.');
assert.match(tokens, /focus-visible/, 'Canonical token layer must preserve visible keyboard focus.');
assert.match(designSystem, /@import\s+['"]\.\/tokens\.css['"];/, 'design-system.css must consume the canonical token layer.');
assert.match(main, /@import\s+['"]\.\/tokens\.css['"];/, 'main.css must consume the canonical token layer on tool pages.');
assert.match(designSystem, /--color-background:\s*var\(--color-bg-canvas\)/, 'Legacy background semantic must alias the canonical canvas token.');
assert.match(designSystem, /--color-surface:\s*var\(--color-bg-surface\)/, 'Legacy surface semantic must alias the canonical surface token.');
assert.match(designSystem, /--transition-fast:\s*var\(--duration-fast\)/, 'Legacy transition token must alias the canonical duration token.');

console.log('design token contract: pass');
