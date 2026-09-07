import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const route = '/tools/productivity/todo-list/';

function collectPageErrors(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.removeItem('todo_tasks');
    localStorage.removeItem('novatools-theme');
  });
  await page.goto(route);
});

test('task text stays literal while edit and JSON backup/restore round-trip', async ({ page }) => {
  const pageErrors = collectPageErrors(page);
  const payloadText = '<img src=x onerror="window.__todoXss=1">';

  await page.locator('#taskInput').fill(payloadText);
  await page.locator('#btnAddTask').click();

  await expect(page.locator('.task-text')).toHaveText(payloadText);
  await expect(page.locator('.task-item img')).toHaveCount(0);
  expect(await page.evaluate(() => globalThis.__todoXss)).toBeUndefined();

  await page.locator('.task-edit').click();
  await expect(page.locator('#taskInput')).toHaveValue(payloadText);
  await expect(page.locator('#btnAddTask')).toHaveText('Save changes');

  await page.locator('#taskInput').fill('Edited task');
  await page.locator('#prioritySelect').selectOption('high');
  await page.locator('#dueDateInput').fill('2026-09-30');
  await page.locator('#btnAddTask').click();

  await expect(page.locator('.task-text')).toHaveText('Edited task');
  await expect(page.locator('.task-priority')).toHaveText('high');
  await expect(page.locator('#toolStatus')).toHaveText('Task updated.');

  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('todo_tasks') || '[]'));
  expect(stored).toHaveLength(1);
  expect(stored[0]).toMatchObject({ text: 'Edited task', priority: 'high', dueDate: '2026-09-30', completed: false });

  const downloadPromise = page.waitForEvent('download');
  await page.locator('#btnExportTasks').click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(downloadPath).toBeTruthy();
  const exported = JSON.parse(await readFile(downloadPath, 'utf8'));
  expect(exported.version).toBe(1);
  expect(exported.tasks).toHaveLength(1);
  expect(exported.tasks[0].text).toBe('Edited task');

  page.once('dialog', (dialog) => dialog.accept());
  const restore = {
    version: 1,
    tasks: [{
      id: 'restored-1',
      text: 'Restored task',
      priority: 'low',
      dueDate: '',
      completed: false,
      createdAt: '2026-09-07T00:00:00.000Z'
    }]
  };
  await page.locator('#importTasksFile').setInputFiles({
    name: 'todo-backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(restore))
  });

  await expect(page.locator('.task-text')).toHaveText('Restored task');
  await expect(page.locator('#toolStatus')).toContainText('Restored 1 task');
  expect(pageErrors).toEqual([]);
});

test('invalid JSON restore fails closed without replacing the current list', async ({ page }) => {
  await page.locator('#taskInput').fill('Keep me');
  await page.locator('#btnAddTask').click();

  await page.locator('#importTasksFile').setInputFiles({
    name: 'broken.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{ definitely not json')
  });

  await expect(page.locator('#toolStatus')).toHaveText('Backup is not valid JSON.');
  await expect(page.locator('.task-text')).toHaveText('Keep me');
});
