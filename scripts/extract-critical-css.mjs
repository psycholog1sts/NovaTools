#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { globSync } from 'glob';
import { transformSync } from 'esbuild';

const root = process.cwd();
const distDir = resolve(root, 'dist');
const sourceCss = resolve(root, 'src/styles/critical.css');
const publicCss = resolve(root, 'public/styles/critical.css');
const criticalCssPath = existsSync(sourceCss) ? sourceCss : publicCss;
const mode = process.argv.includes('--check') ? 'check' : 'write';

if (!existsSync(criticalCssPath)) {
  throw new Error('Critical CSS file not found at src/styles/critical.css or public/styles/critical.css');
}

// The whole shared stylesheet set is inlined, in the order it used to be linked
// (tokens, design system, component library, layout, then critical last so its
// overrides still win).
//
// Splitting it into deferred <link>s was worse in both directions: as
// render-blocking links they were five serialised requests in front of the first
// paint, and as deferred links every rule that sized an above-the-fold section
// arrived late, so the hero, the trust strip and the tool grid each jumped when
// their stylesheet landed (measured cumulative layout shift 0.38 on a throttled
// load). Together they gzip to about 24 KB, which is cheaper than the round
// trips it takes to fetch them.
const BUNDLED_CSS = ['tokens.css', 'design-system.css', 'component-library.css', 'layout.css'];
const bundledCss = BUNDLED_CSS
  .map((name) => resolve(root, 'src/styles', name))
  .filter((file) => existsSync(file))
  .map((file) => readFileSync(file, 'utf8').replace(/^\s*@import[^;]+;\s*$/gm, '').trim())
  .join('\n');
const criticalCss = readFileSync(criticalCssPath, 'utf8').trim();

// Minified because this block is parsed on every page: unminified it was 126 KB
// of CSS for the parser to walk before the first paint.
const inlineCss = transformSync(`${bundledCss}\n${criticalCss}`, { loader: 'css', minify: true }).code.trim();
const inlineBlock = `<style data-critical-css="novatools">${inlineCss}</style>`;

// Names of the bundles that are now inlined; their <link>s (deferred or not,
// plus the <noscript> fallback) must come out or the browser downloads the same
// CSS twice.
const INLINED_LINK_RE = new RegExp(
  `(?:<noscript>\\s*)?<link\\b[^>]*href=["'][^"']*/(?:${BUNDLED_CSS.map((n) => n.replace('.css', '')).join('|')})(?:-[A-Za-z0-9_-]+)?\\.css["'][^>]*>(?:\\s*</noscript>)?\\s*`,
  'gi'
);
const htmlFiles = globSync('**/*.html', { cwd: distDir, nodir: true });
const missing = [];

for (const file of htmlFiles) {
  const absolute = join(distDir, file);
  let html = readFileSync(absolute, 'utf8');
  if (html.includes('data-critical-css="novatools"')) continue;

  missing.push(file);
  if (mode === 'write') {
    html = html.replace(/(?:<noscript>\s*)?<link[^>]+href=["'][^"']*critical[^"']*\.css["'][^>]*>(?:\s*<\/noscript>)?\s*/gi, '');
    html = html.replace(INLINED_LINK_RE, '');
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
