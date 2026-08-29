import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = {
  percentage: '/tools/converters/percentage-calculator/',
  unit: '/tools/converters/unit-converter/',
  numberBase: '/tools/converters/number-base-converter/',
  timeZone: '/tools/converters/timezone-converter/'
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

test('Number Base Converter preserves arbitrary-size signed integers and rejects unsupported input', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto(routes.numberBase, { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  await expectIndexableRobots(page);

  const base = page.locator('#baseSelect');
  const input = page.locator('#numberInput');
  const convertButton = page.locator('#btnConvert');
  await expect(base).toHaveAccessibleName(/base|number base/i);
  await expect(input).toHaveAccessibleName(/number|integer|value/i);
  await expect(convertButton).toHaveAccessibleName(/convert/i);
  await expect(base.locator('option')).toHaveCount(4);
  expect(await base.locator('option').evaluateAll((options) => options.map((option) => option.value))).toEqual(['10', '2', '16', '8']);

  await base.selectOption('10');
  await input.fill('9007199254740993');
  await convertButton.click();
  await expect(page.locator('#decimalResult')).toHaveText('9007199254740993');
  await expect(page.locator('#hexResult')).toHaveText('0x20000000000001');

  await input.fill('340282366920938463463374607431768211455');
  await convertButton.click();
  await expect(page.locator('#hexResult')).toHaveText('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');

  await input.fill('-255');
  await convertButton.click();
  await expect(page.locator('#decimalResult')).toHaveText('-255');
  await expect(page.locator('#hexResult')).toHaveText('-0xFF');
  await expect(page.locator('#octalResult')).toHaveText('-0o377');

  await base.selectOption('2');
  await input.fill('102');
  await convertButton.click();
  await expect(page.locator('#decimalResult')).toContainText(/invalid characters/i);

  await base.selectOption('10');
  await input.fill('10.5');
  await convertButton.click();
  await expect(page.locator('#decimalResult')).toContainText(/integer|fraction/i);

  await expect(page.locator('body')).not.toContainText(/safe integer limit|even larger numbers are supported|fractional numbers.*truncated/i);
  expect(errors).toEqual([]);
  await expectNoSeriousA11y(page, 'Number Base Converter');
  await expectNoHorizontalOverflow(page, 320);
});

test('Time Zone Converter uses date-specific IANA rules and rejects invalid or ambiguous wall times', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto(routes.timeZone, { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  await expectIndexableRobots(page);

  const fromZone = page.locator('#fromTimezone');
  const toZone = page.locator('#toTimezone');
  const input = page.locator('#fromDatetime');
  const convertButton = page.locator('#btnConvert');
  await expect(fromZone).toHaveAccessibleName(/from time zone|source time zone/i);
  await expect(toZone).toHaveAccessibleName(/to time zone|target time zone/i);
  await expect(input).toHaveAccessibleName(/date|time/i);
  await expect(convertButton).toHaveAccessibleName(/convert/i);

  await fromZone.selectOption('America/New_York');
  await toZone.selectOption('UTC');
  await input.fill('2026-01-15T12:00');
  await convertButton.click();
  await expect(page.locator('#resultTime')).toHaveText('17:00');
  await expect(page.locator('#timeDiffValue')).toContainText('+5 hours');

  await input.fill('2026-07-15T12:00');
  await convertButton.click();
  await expect(page.locator('#resultTime')).toHaveText('16:00');
  await expect(page.locator('#timeDiffValue')).toContainText('+4 hours');

  await input.fill('2026-03-08T02:30');
  await convertButton.click();
  await expect(page.locator('#resultDate')).toContainText(/does not exist|invalid local time/i);

  await input.fill('2026-11-01T01:30');
  await convertButton.click();
  await expect(page.locator('#resultDate')).toContainText(/ambiguous|occurs twice/i);

  await page.evaluate(() => {
    const select = document.getElementById('fromTimezone');
    const option = document.createElement('option');
    option.value = 'Mars/Olympus';
    option.textContent = 'Invalid zone';
    select.append(option);
    select.value = option.value;
  });
  await input.fill('2026-01-15T12:00');
  await convertButton.click();
  await expect(page.locator('#resultDate')).toContainText(/invalid|unsupported time zone/i);

  await expect(page.locator('body')).not.toContainText(/correctly calculate.*future daylight saving time rules|handles all time zone offsets accurately/i);
  expect(errors).toEqual([]);
  await expectNoSeriousA11y(page, 'Time Zone Converter');
  await expectNoHorizontalOverflow(page, 320);
});

test('Age Calculator is an accessible, honest, locally-computed calendar utility', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-03-15T10:30:00') });

  const response = await page.goto('/tools/converters/age-calculator/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  await expectIndexableRobots(page);

  const birthdate = page.locator('#birthdateInput');
  await expect(birthdate).toHaveAccessibleName(/birth ?date|date of birth/i);
  await expect(page.locator('#btnCalculate')).toHaveAccessibleName(/calculate/i);
  await expect(page.locator('#ageStatus')).toHaveAttribute('aria-live', 'polite');

  await birthdate.fill('1990-03-15');
  await page.locator('#btnCalculate').click();
  await expect(page.locator('#yearsValue')).toHaveText('36');
  await expect(page.locator('#monthsValue')).toHaveText('0');
  await expect(page.locator('#daysValue')).toHaveText('0');

  await birthdate.fill('2026-12-31');
  await page.locator('#btnCalculate').click();
  await expect(page.locator('#ageStatus')).toContainText(/future|past|today/i);

  // No unmeasurable claim is presented as a measurement of the visitor.
  await expect(page.locator('.fun-facts-note')).toContainText(/fixed textbook average/i);
  await expect(page.locator('body')).not.toContainText(/your heart has beaten|you have slept|life expectancy/i);

  expect(errors).toEqual([]);
  await expectNoSeriousA11y(page, 'Age Calculator');
  await expectNoHorizontalOverflow(page, 320);
});

test('BMI Calculator computes the ratio it claims and makes no health claim it cannot support', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto('/tools/converters/bmi-calculator/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  await expectIndexableRobots(page);

  const heightCm = page.locator('#heightCm');
  const weightKg = page.locator('#weightKg');
  await expect(heightCm).toHaveAccessibleName(/height/i);
  await expect(weightKg).toHaveAccessibleName(/weight/i);
  await expect(page.locator('#bmiStatus')).toHaveAttribute('aria-live', 'polite');

  await heightCm.fill('180');
  await weightKg.fill('81');
  await page.locator('#btnCalculate').click();
  await expect(page.locator('#bmiValue')).toHaveText('25.0');
  await expect(page.locator('#bmiCategory')).toHaveText(/overweight/i);
  await expect(page.locator('#idealWeight')).toHaveText(/59\.9 - 80\.7 kg/);

  await weightKg.fill('0');
  await page.locator('#btnCalculate').click();
  await expect(page.locator('#bmiStatus')).toContainText(/between|must be/i);

  await page.evaluate(() => { document.getElementById('weightKg').value = 'abc'; });
  await page.locator('#btnCalculate').click();
  await expect(page.locator('#bmiStatus')).toContainText(/required|number|between|must be/i);

  await expect(page.locator('.health-tips-note')).toContainText(/not a measurement of body fat|does not diagnose/i);
  await expect(page.locator('body')).not.toContainText(/you should (?:eat|lose|gain)|recommended diet|consult this tool instead/i);

  expect(errors).toEqual([]);
  await expectNoSeriousA11y(page, 'BMI Calculator');
  await expectNoHorizontalOverflow(page, 320);
});

test('Roman Numerals Converter is an accessible local converter that refuses non-standard notation', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto('/tools/converters/roman-numerals/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  await expectIndexableRobots(page);

  await expect(page.locator('#inputField')).toHaveAccessibleName(/number/i);
  await expect(page.locator('#btnConvert')).toHaveAccessibleName(/convert/i);
  await expect(page.locator('#validationMsg')).toHaveAttribute('aria-live', 'polite');

  await page.locator('#inputField').fill('1990');
  await page.locator('#btnConvert').click();
  await expect(page.locator('#resultValue')).toHaveText('MCMXC');

  await page.locator('#tabToNumber').click();
  await page.locator('#inputField').fill('IIII');
  await page.locator('#btnConvert').click();
  await expect(page.locator('#validationMsg')).toContainText(/not a valid/i);

  expect(errors).toEqual([]);
  await expectNoSeriousA11y(page, 'Roman Numerals Converter');
  await expectNoHorizontalOverflow(page, 320);
});

test('Scientific Calculator evaluates locally and refuses undefined results', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto('/tools/converters/scientific-calculator/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  await expectIndexableRobots(page);

  await expect(page.locator('#calcInput')).toHaveAttribute('aria-live', 'polite');
  for (const name of ['Divide', 'Multiply', 'Equals', 'Square root', 'Pi']) {
    await expect(page.getByRole('button', { name, exact: true })).toHaveCount(1);
  }

  await page.getByRole('button', { name: '9', exact: true }).click();
  await page.getByRole('button', { name: 'Square root', exact: true }).click();
  await page.getByRole('button', { name: 'Equals', exact: true }).click();
  await expect(page.locator('#calcInput')).toHaveText('3');

  await page.getByRole('button', { name: 'All clear', exact: true }).click();
  await page.getByRole('button', { name: '1', exact: true }).click();
  await page.getByRole('button', { name: 'Divide', exact: true }).click();
  await page.getByRole('button', { name: '0', exact: true }).click();
  await page.getByRole('button', { name: 'Equals', exact: true }).click();
  await expect(page.locator('#calcInput')).toContainText(/zero/i);

  expect(errors).toEqual([]);
  await expectNoSeriousA11y(page, 'Scientific Calculator');
  await expectNoHorizontalOverflow(page, 320);
});

test('Unix Timestamp Converter is accessible and discloses how it read the input', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto('/tools/converters/unix-timestamp/', { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();
  await expectIndexableRobots(page);

  await expect(page.locator('#timestampInput')).toHaveAccessibleName(/timestamp/i);
  await expect(page.locator('#timestampStatus')).toHaveAttribute('aria-live', 'polite');

  await page.locator('#timestampInput').fill('1704067200');
  await page.locator('#btnConvert').click();
  await expect(page.locator('#isoFormat')).toHaveText('2024-01-01T00:00:00.000Z');
  await expect(page.locator('#timestampStatus')).toContainText(/seconds/i);

  await page.locator('#timestampInput').fill('1704067200000');
  await page.locator('#btnConvert').click();
  await expect(page.locator('#timestampStatus')).toContainText(/millisecond/i);

  expect(errors).toEqual([]);
  await expectNoSeriousA11y(page, 'Unix Timestamp Converter');
  await expectNoHorizontalOverflow(page, 320);
});
