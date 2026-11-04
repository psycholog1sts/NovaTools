import assert from 'node:assert/strict';
import fs from 'node:fs';

// `/js/*` is served `immutable` for a year, which is only safe for content-hashed names.
// Files that keep a fixed name across deploys must opt out, or returning visitors keep an
// old copy that imports chunks a later deploy has deleted.
const headers = fs.readFileSync('public/_headers', 'utf8');
const blocks = new Map();
let current = null;
for (const line of headers.split(/\r?\n/)) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  if (!/^\s/.test(line)) {
    current = line.trim();
    blocks.set(current, []);
  } else if (current) {
    blocks.get(current).push(line.trim());
  }
}

assert.match((blocks.get('/js/*') || []).join('\n'), /immutable/, 'hashed /js/* assets stay immutable');

const viteConfig = fs.readFileSync('vite.config.js', 'utf8');
const fixedEntries = [...viteConfig.matchAll(/return '(js\/[\w.-]+\.js)'/g)].map((m) => `/${m[1]}`);
const publicJs = fs.readdirSync('public/js').filter((name) => name.endsWith('.js')).map((name) => `/js/${name}`);
const unhashed = [...new Set([...fixedEntries, ...publicJs])];
assert.ok(unhashed.includes('/js/tool-page-enhancer.js'), 'the enhancer entry is detected as a fixed name');

for (const file of unhashed) {
  const rules = blocks.get(file);
  assert.ok(rules, `${file} has a fixed name and needs its own _headers rule`);
  assert.ok(rules.includes('! Cache-Control'), `${file} must detach the /js/* immutable Cache-Control`);
  assert.ok(rules.some((rule) => /^Cache-Control:.*must-revalidate/.test(rule) && !/immutable/.test(rule)), `${file} must be revalidated`);
}

console.log(`unhashed js cache contract: pass (${unhashed.length} files)`);
