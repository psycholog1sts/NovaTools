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

// Product-quality contract: an existing task must be editable without destructive delete/recreate.
assert.match(
  source,
  /function editTask\(id\)/,
  'Todo List must support direct task editing.'
);
assert.match(
  source,
  /className = ['"]task-edit['"]/,
  'Todo List must expose a keyboard-focusable edit control for each task.'
);
assert.match(
  source,
  /taskInput\.focus\(\)/,
  'Editing should return focus to the task field.'
);

// Local backup contract: users must be able to export and restore their browser-only task data.
assert.match(
  source,
  /function exportTasks\(\)/,
  'Todo List must offer a local JSON backup export.'
);
assert.match(
  source,
  /new Blob\([^\n]+application\/json/,
  'Todo List export must produce a JSON file locally in the browser.'
);
assert.match(
  source,
  /function importTasksFromFile\(/,
  'Todo List must support restoring a local JSON backup.'
);
assert.match(
  source,
  /\.map\(normalizeTask\)\.filter\(Boolean\)/,
  'Imported task records must pass through the same normalization used for persisted data.'
);
assert.match(
  source,
  /accept=["']application\/json,\.json["']/,
  'Todo List import picker must be restricted to JSON backups.'
);

// One theme storage key must be authoritative across first paint and interactive toggle.
assert.doesNotMatch(
  source,
  /localStorage\.getItem\(['"]theme['"]\)|localStorage\.setItem\(['"]theme['"]/, 
  'Todo List must not use a second legacy theme storage key.'
);
assert.match(
  source,
  /novatools-theme/,
  'Todo List theme behavior must use the shared NovaTools theme key.'
);

// Public copy must match the implemented backup/edit behavior and productivity domain.
assert.doesNotMatch(
  source,
  /tasks cannot be exported directly|delete the existing task and create a new one|direct edit feature may be added/i,
  'Todo List FAQ must not claim edit/export are unavailable after implementation.'
);
assert.doesNotMatch(
  source,
  /Estimates only[^\n]*financial, legal, or tax advice/i,
  'Todo List footer must not contain an unrelated finance/legal estimate disclaimer.'
);

console.log('todo list source contract: pass');
