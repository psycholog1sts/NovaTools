import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';

const ageSource = readFileSync('src/tools/converters/age-calculator/index.html', 'utf8');
const bmiSource = readFileSync('src/tools/converters/bmi-calculator/index.html', 'utf8');

test('Age Calculator source uses local-calendar-safe date arithmetic', async () => {
  expect(ageSource).not.toContain("new Date(birthdateInput.value)");
  expect(ageSource).not.toContain("new Date().toISOString().split('T')[0]");
  expect(ageSource).not.toMatch(/\(today\s*-\s*birthdate\)\s*\/\s*\(1000\s*\*\s*60\s*\*\s*60\s*\*\s*24\)/);
  expect(ageSource).toContain('Date.UTC');
  expect(ageSource).toMatch(/<label[^>]+for="birthdateInput"/);
  expect(ageSource).toMatch(/id="ageStatus"[^>]+role="status"[^>]+aria-live="polite"/);
  expect(ageSource).not.toContain("today's date (or any second date you choose)");
});

test('BMI Calculator validates finite bounded inputs and exposes accessible labels', async () => {
  expect(bmiSource).toContain('Number.isFinite');
  expect(bmiSource).not.toContain('healthTipsList.innerHTML');
  expect(bmiSource).toMatch(/<label[^>]+for="heightCm"/);
  expect(bmiSource).toMatch(/<label[^>]+for="weightKg"/);
  expect(bmiSource).toMatch(/id="heightFt"[^>]+aria-label="Height in feet"/);
  expect(bmiSource).toMatch(/id="heightIn"[^>]+aria-label="Height in inches"/);
  expect(bmiSource).toMatch(/<label[^>]+for="weightLbs"/);
  expect(bmiSource).toMatch(/id="bmiStatus"[^>]+role="status"[^>]+aria-live="polite"/);
  expect(bmiSource).not.toMatch(/personalized health tips/i);
  expect(bmiSource).not.toMatch(/ideal weight range/i);
});
