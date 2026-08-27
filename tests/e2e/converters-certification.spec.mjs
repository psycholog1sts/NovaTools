import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = {
  percentage: '/tools/converters/percentage-calculator/',
  unit: '/tools/converters/unit-converter/'
};

async function expectNoSeriousA11y(page, label) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  const blocking = results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact));
  expect(
    blocking,
    blocking.map((violation) => `${label} ${violation.id}: ${violation.help} (${violation.nodes.length} node(s))`).join('\n')
  ).toEqual([]);
}

async function expectNoHorizontalOverflow(page, width) {
  await page.setViewportSize({ width, height: 820 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
}

async function expectIndexableRobots(page) {
  const directives = await page.locator('meta[name="robots"]').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('content') || '')
  );
  expect(directives.some((content) => /(?:^|[,\s])noindex(?:$|[,\s])/i.test(content))).toBe(false);
}

test('Percentage Calculator is a real accessible local utility', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto(routes.percentage, { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  await expectIndexableRobots(page);
  await expect(page.locator('script[src*="tool-page-enhancer"]')).toHaveCount(0);

  const percent = page.locator('#wi-percent');
  const value = page.locator('#wi-value');
  await expect(percent).toHaveAccessibleName(/percentage|percent/i);
  await expect(value).toHaveAccessibleName(/value|number|base/i);
  await percent.fill('20');
  await value.fill('100');
  await expect(page.locator('#resultValue')).toHaveText('20.00');

  await page.getByRole('button', { name: /x is what/i }).click();
  await page.locator('#xw-value').fill('25');
  await page.locator('#xw-total').fill('0');
  await expect(page.locator('#resultValue')).not.toContainText(/Infinity|NaN/);
  await expect(page.locator('#formulaDisplay')).toContainText(/cannot|zero|greater than 0/i);

  await page.getByRole('button', { name: /clear/i }).click();
  await expect(percent).toHaveValue('');
  await expect(page.locator('#resultValue')).toHaveText('0');

  const quickExample = page.getByRole('button', { name: 'What is 20% of 100?' });
  await quickExample.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#resultValue')).toHaveText('20.00');

  expect(errors).toEqual([]);
  await expectNoSeriousA11y(page, 'Percentage Calculator');
  await expectNoHorizontalOverflow(page, 320);
});

test('Unit Converter converts real values with labelled controls and responsive output', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto(routes.unit, { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  await expectIndexableRobots(page);
  await expect(page.locator('script[src*="tool-page-enhancer"]')).toHaveCount(0);

  await expect(page.locator('#inputValue')).toHaveAccessibleName(/value|from/i);
  await expect(page.locator('#fromUnit')).toHaveAccessibleName(/from unit|source unit/i);
  await expect(page.locator('#outputValue')).toHaveAccessibleName(/result|converted value|to/i);
  await expect(page.locator('#toUnit')).toHaveAccessibleName(/to unit|target unit/i);

  await page.locator('#inputValue').fill('1');
  await page.locator('#fromUnit').selectOption('m');
  await page.locator('#toUnit').selectOption('cm');
  await expect(page.locator('#resultText')).toHaveText('100 cm');

  await page.getByRole('button', { name: 'Temperature' }).click();
  await page.locator('#inputValue').fill('0');
  await page.locator('#fromUnit').selectOption('C');
  await page.locator('#toUnit').selectOption('F');
  await expect(page.locator('#resultText')).toHaveText('32 F');

  await page.getByRole('button', { name: /swap units/i }).click();
  await expect(page.locator('#fromUnit')).toHaveValue('F');
  await expect(page.locator('#toUnit')).toHaveValue('C');

  await page.getByRole('button', { name: /reset/i }).click();
  await expect(page.locator('#inputValue')).toHaveValue('');
  await expect(page.locator('#outputValue')).toHaveValue('');

  expect(errors).toEqual([]);
  await expectNoSeriousA11y(page, 'Unit Converter');
  await expectNoHorizontalOverflow(page, 320);
});
