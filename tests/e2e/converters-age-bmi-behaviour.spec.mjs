import { test, expect } from '@playwright/test';

/**
 * Behavioural acceptance for the Age and BMI converters.
 *
 * The clock is pinned so "today" is deterministic: the Age Calculator reads the
 * local calendar both when it sets the input's max and when it calculates, so a
 * floating clock would make the boundary cases untestable.
 */
const FIXED_NOW = new Date('2026-03-15T10:30:00');

async function openAge(page) {
  await page.clock.install({ time: FIXED_NOW });
  await page.goto('/tools/converters/age-calculator/');
  await expect(page.locator('#birthdateInput')).toBeVisible();
}

async function ageFor(page, value) {
  await page.fill('#birthdateInput', value);
  await page.click('#btnCalculate');
  return {
    years: await page.locator('#yearsValue').textContent(),
    months: await page.locator('#monthsValue').textContent(),
    days: await page.locator('#daysValue').textContent(),
    totalDays: await page.locator('#totalDays').textContent(),
    countdown: await page.locator('#countdownValue').textContent(),
    dayBorn: await page.locator('#dayBorn').textContent(),
    status: await page.locator('#ageStatus').textContent()
  };
}

test.describe('Age Calculator behaviour', () => {
  test('label is associated with the date control', async ({ page }) => {
    await openAge(page);
    const id = await page.getByLabel('Enter Your Birthdate').getAttribute('id');
    expect(id).toBe('birthdateInput');
  });

  test('max is the local calendar day, not the UTC day', async ({ page }) => {
    await openAge(page);
    await expect(page.locator('#birthdateInput')).toHaveAttribute('max', '2026-03-15');
  });

  test('birthday today reads a whole number of years and counts down to today', async ({ page }) => {
    await openAge(page);
    const r = await ageFor(page, '1990-03-15');
    expect(r.years).toBe('36');
    expect(r.months).toBe('0');
    expect(r.days).toBe('0');
    expect(r.countdown).toBe('Today');
  });

  test('birthday tomorrow is still the previous age', async ({ page }) => {
    await openAge(page);
    const r = await ageFor(page, '1990-03-16');
    expect(r.years).toBe('35');
    expect(r.countdown).toBe('1 day');
  });

  test('birthday yesterday has just ticked over', async ({ page }) => {
    await openAge(page);
    const r = await ageFor(page, '1990-03-14');
    expect(r.years).toBe('36');
    expect(r.months).toBe('0');
    expect(r.days).toBe('1');
  });

  test('month-end birthdate borrows from the correct month length', async ({ page }) => {
    await openAge(page);
    // 31 Jan -> 15 Mar: one full month to 28 Feb, then 15 days. February 2026
    // has 28 days, so a flat 30-day assumption would be wrong here.
    const r = await ageFor(page, '2026-01-31');
    expect(r.years).toBe('0');
    expect(r.months).toBe('1');
    expect(r.days).toBe('15');
  });

  test('December to March crosses the year boundary correctly', async ({ page }) => {
    await openAge(page);
    const r = await ageFor(page, '2025-12-31');
    expect(r.years).toBe('0');
    expect(r.months).toBe('2');
    expect(r.days).toBe('15');
  });

  test('29 February birthdate is accepted and counted in whole calendar days', async ({ page }) => {
    await openAge(page);
    const r = await ageFor(page, '2024-02-29');
    expect(r.years).toBe('2');
    // 2024-02-29 -> 2026-03-15 inclusive of a leap day: 745 calendar days.
    expect(r.totalDays).toBe('745');
  });

  test('29 February anniversary in a non-leap year falls on 1 March as disclosed', async ({ page }) => {
    await openAge(page);
    const r = await ageFor(page, '2024-02-29');
    // Next anniversary after 15 Mar 2026 is 1 Mar 2027 (2027 is not a leap year).
    expect(r.countdown).toBe('351 days');
  });

  test('day of week born is derived from the calendar date', async ({ page }) => {
    await openAge(page);
    const r = await ageFor(page, '2000-01-01');
    expect(r.dayBorn).toBe('Saturday');
  });

  test('a blank date reports a status instead of raising a dialog', async ({ page }) => {
    await openAge(page);
    let dialog = false;
    page.on('dialog', async (d) => { dialog = true; await d.dismiss(); });
    await page.click('#btnCalculate');
    await expect(page.locator('#ageStatus')).toContainText('real calendar date');
    await expect(page.locator('#ageResult')).toBeHidden();
    expect(dialog).toBe(false);
  });

  test('a future date is refused with a status', async ({ page }) => {
    await openAge(page);
    await page.evaluate(() => {
      const el = document.getElementById('birthdateInput');
      el.removeAttribute('max');
      el.value = '2030-01-01';
    });
    await page.click('#btnCalculate');
    await expect(page.locator('#ageStatus')).toContainText('future');
    await expect(page.locator('#ageResult')).toBeHidden();
  });

  test('the control is operable from the keyboard', async ({ page }) => {
    await openAge(page);
    await page.locator('#birthdateInput').focus();
    await expect(page.locator('#birthdateInput')).toBeFocused();
    await page.fill('#birthdateInput', '1990-03-15');
    await page.locator('#btnCalculate').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#ageStatus')).toContainText('Age: 36 years');
  });

  test('clearing resets the status and hides results', async ({ page }) => {
    await openAge(page);
    await ageFor(page, '1990-03-15');
    await page.click('#btnClear');
    await expect(page.locator('#ageStatus')).toHaveText('');
    await expect(page.locator('#ageResult')).toBeHidden();
  });
});

async function openBmi(page) {
  await page.goto('/tools/converters/bmi-calculator/');
  await expect(page.locator('#heightCm')).toBeVisible();
}

async function metricBmi(page, cm, kg) {
  await page.fill('#heightCm', String(cm));
  await page.fill('#weightKg', String(kg));
  await page.click('#btnCalculate');
  return {
    value: await page.locator('#bmiValue').textContent(),
    category: await page.locator('#bmiCategory').textContent(),
    status: await page.locator('#bmiStatus').textContent()
  };
}

test.describe('BMI Calculator behaviour', () => {
  test('labels and accessible names resolve to the right controls', async ({ page }) => {
    await openBmi(page);
    expect(await page.getByLabel('Height in centimetres').getAttribute('id')).toBe('heightCm');
    expect(await page.getByLabel('Weight in kilograms').getAttribute('id')).toBe('weightKg');
    await page.click('.unit-btn[data-unit="imperial"]');
    expect(await page.getByLabel('Height in feet').getAttribute('id')).toBe('heightFt');
    expect(await page.getByLabel('Height in inches').getAttribute('id')).toBe('heightIn');
    expect(await page.getByLabel('Weight in pounds').getAttribute('id')).toBe('weightLbs');
  });

  test('metric calculation matches weight / height squared', async ({ page }) => {
    await openBmi(page);
    const r = await metricBmi(page, 180, 81);
    expect(r.value).toBe('25.0');
    expect(r.category).toBe('Overweight');
  });

  test('imperial calculation uses the 703 factor', async ({ page }) => {
    await openBmi(page);
    await page.click('.unit-btn[data-unit="imperial"]');
    await page.fill('#heightFt', '5');
    await page.fill('#heightIn', '10');
    await page.fill('#weightLbs', '160');
    await page.click('#btnCalculate');
    await expect(page.locator('#bmiValue')).toHaveText('23.0');
  });

  test('classification uses the raw ratio, not the rounded display value', async ({ page }) => {
    await openBmi(page);
    // BMI here is 24.98..., which displays as 25.0 but is still under 25.
    const r = await metricBmi(page, 179.9, 80.85);
    expect(r.value).toBe('25.0');
    expect(r.category).toBe('Normal Weight');
  });

  test('category boundaries sit at 18.5, 25 and 30', async ({ page }) => {
    await openBmi(page);
    expect((await metricBmi(page, 180, 59.9)).category).toBe('Underweight');
    expect((await metricBmi(page, 180, 60)).category).toBe('Normal Weight');
    expect((await metricBmi(page, 180, 97.2)).category).toBe('Obese');
  });

  test('non-numeric text is rejected with a status, not a dialog', async ({ page }) => {
    await openBmi(page);
    let dialog = false;
    page.on('dialog', async (d) => { dialog = true; await d.dismiss(); });
    await page.evaluate(() => { document.getElementById('heightCm').value = 'abc'; });
    await page.fill('#weightKg', '70');
    await page.click('#btnCalculate');
    await expect(page.locator('#bmiStatus')).toContainText('Height in centimetres');
    await expect(page.locator('#bmiResult')).not.toHaveClass(/show/);
    expect(dialog).toBe(false);
  });

  test('blank values are reported as required', async ({ page }) => {
    await openBmi(page);
    await page.click('#btnCalculate');
    await expect(page.locator('#bmiStatus')).toContainText('required');
  });

  test('zero and negative values are refused', async ({ page }) => {
    await openBmi(page);
    await page.fill('#heightCm', '0');
    await page.fill('#weightKg', '70');
    await page.click('#btnCalculate');
    await expect(page.locator('#bmiStatus')).toContainText('between 50 and 300');

    await page.evaluate(() => { document.getElementById('heightCm').value = '-180'; });
    await page.click('#btnCalculate');
    await expect(page.locator('#bmiStatus')).toContainText('between 50 and 300');
  });

  test('the advertised limits are actually enforced, not just advertised', async ({ page }) => {
    await openBmi(page);
    await page.evaluate(() => { document.getElementById('heightCm').value = '301'; });
    await page.fill('#weightKg', '70');
    await page.click('#btnCalculate');
    await expect(page.locator('#bmiStatus')).toContainText('between 50 and 300');

    await page.fill('#heightCm', '180');
    await page.evaluate(() => { document.getElementById('weightKg').value = '501'; });
    await page.click('#btnCalculate');
    await expect(page.locator('#bmiStatus')).toContainText('between 2 and 500');
  });

  test('extreme but permitted values still compute', async ({ page }) => {
    await openBmi(page);
    const r = await metricBmi(page, 50, 2);
    expect(Number(r.value)).toBeGreaterThan(0);
    expect(r.category).toBe('Underweight');
  });

  test('the page carries a non-diagnostic disclaimer and no personalised advice', async ({ page }) => {
    await openBmi(page);
    await expect(page.locator('#healthTipsTitle')).not.toHaveText(/Health Tips for/);
    const body = await page.locator('body').innerText();
    expect(body).not.toMatch(/personalized health tips/i);
    expect(body).not.toMatch(/ideal weight range/i);
    expect(body).toMatch(/not.{0,20}diagnos/i);
  });

  test('the calculate control is operable from the keyboard', async ({ page }) => {
    await openBmi(page);
    await page.fill('#heightCm', '180');
    await page.fill('#weightKg', '81');
    await page.locator('#btnCalculate').focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#bmiStatus')).toContainText('BMI 25.0');
  });
});
