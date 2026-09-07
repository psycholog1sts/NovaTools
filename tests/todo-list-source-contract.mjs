import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/tools/productivity/todo-list/index.html', 'utf8');

assert.doesNotMatch(
  source,
  /taskList\.innerHTML\s*=\s*filteredTasks\.map/,
  'Todo List must not render persisted tasks by interpolating them into innerHTML.'
);
assert.doesNotMatch(
  source,
  /\$\{task\.text\}/,
  'Todo List must never interpolate persisted task text into an HTML template.'
);
assert.doesNotMatch(
  source,
  /data-nv-(?:change-args|args)='\["\$\{task\.id\}"\]'/,
  'Todo List must not place persisted task ids inside HTML event-binding attributes.'
);
assert.match(
  source,
  /document\.createElement\(['"]div['"]\)/,
  'Todo List should build dynamic task DOM with createElement.'
);
assert.match(
  source,
  /\.textContent\s*=\s*task\.text/,
  'Todo List should render task text with textContent.'
);
assert.match(
  source,
  /const VALID_PRIORITIES = new Set\(\['low', 'medium', 'high'\]\)/,
  'Todo List must validate persisted priority values.'
);
assert.match(
  source,
  /function normalizeTask\(/,
  'Todo List must normalize persisted localStorage records before rendering.'
);

console.log('todo list source contract: pass');
