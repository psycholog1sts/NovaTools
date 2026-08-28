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

async function expectUnavailable(page, activeControlSelector) {
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/i);
  await expect(page.getByRole('heading', { name: 'This tool is currently unavailable' })).toBeVisible();
  await expect(page.locator(activeControlSelector)).toHaveCount(0);
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

test('Number Base Converter stays fail-closed while Number precision and signed-input semantics are uncertified', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto(routes.numberBase, { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();

  const numberBoundary = await page.evaluate(() => ({
    maxSafe: Number.MAX_SAFE_INTEGER,
    parsedUnsafe: Number.parseInt('9007199254740993', 10),
    parsedFraction: Number.parseInt('10.5', 10)
  }));
  expect(numberBoundary.maxSafe).toBe(9007199254740991);
  expect(numberBoundary.parsedUnsafe).toBe(9007199254740992);
  expect(numberBoundary.parsedFraction).toBe(10);

  await expectUnavailable(page, '#baseSelect, #numberInput, #btnConvert, .result-card-copy');
  await expect(page.locator('body')).not.toContainText(/supports all numeral systems|even larger numbers are supported|fractional numbers.*truncated/i);

  expect(errors).toEqual([]);
  await expectNoSeriousA11y(page, 'Number Base Converter unavailable surface');
  await expectNoHorizontalOverflow(page, 320);
});

test('Time Zone Converter stays fail-closed until IANA wall-time, DST gap/overlap, and invalid-zone semantics are certified', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  const response = await page.goto(routes.timeZone, { waitUntil: 'domcontentloaded' });
  expect(response?.ok()).toBeTruthy();

  const intlEvidence = await page.evaluate(() => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
      hourCycle: 'h23'
    });
    const partsFor = (instant) => Object.fromEntries(
      formatter.formatToParts(new Date(instant))
        .filter((part) => part.type !== 'literal')
        .map((part) => [part.type, part.value])
    );
    const matchesWallTime = (instant, expected) => {
      const parts = partsFor(instant);
      return ['year', 'month', 'day', 'hour', 'minute'].every((field) => parts[field] === expected[field]);
    };
    const countMatches = (startIso, endIso, expected) => {
      let count = 0;
      for (let time = Date.parse(startIso); time <= Date.parse(endIso); time += 30 * 60 * 1000) {
        if (matchesWallTime(time, expected)) count += 1;
      }
      return count;
    };

    let invalidZoneRejected = false;
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: 'Mars/Olympus' });
    } catch (error) {
      invalidZoneRejected = error instanceof RangeError;
    }

    return {
      winter: partsFor('2026-01-15T17:00:00Z'),
      summer: partsFor('2026-07-15T16:00:00Z'),
      springGapMatches: countMatches('2026-03-08T05:00:00Z', '2026-03-08T09:00:00Z', {
        year: '2026', month: '03', day: '08', hour: '02', minute: '30'
      }),
      fallOverlapMatches: countMatches('2026-11-01T04:00:00Z', '2026-11-01T08:00:00Z', {
        year: '2026', month: '11', day: '01', hour: '01', minute: '30'
      }),
      invalidZoneRejected
    };
  });

  expect(intlEvidence.winter.hour).toBe('12');
  expect(intlEvidence.winter.minute).toBe('00');
  expect(intlEvidence.summer.hour).toBe('12');
  expect(intlEvidence.summer.minute).toBe('00');
  expect(intlEvidence.springGapMatches).toBe(0);
  expect(intlEvidence.fallOverlapMatches).toBe(2);
  expect(intlEvidence.invalidZoneRejected).toBe(true);

  await expectUnavailable(page, '#fromTimezone, #toTimezone, #fromDatetime, #btnConvert, #swapBtn');
  await expect(page.locator('body')).not.toContainText(/daylight saving time is handled automatically|automatic dst adjustments|any timezone instantly/i);

  expect(errors).toEqual([]);
  await expectNoSeriousA11y(page, 'Time Zone Converter unavailable surface');
  await expectNoHorizontalOverflow(page, 320);
});
