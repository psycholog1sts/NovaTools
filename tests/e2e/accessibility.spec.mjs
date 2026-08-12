import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = [
  ['home', '/'],
  ['pricing', '/pricing/'],
  ['pdf compressor', '/tools/pdf/compress/']
];

for (const [name, route] of routes) {
  test(`${name} has no serious or critical WCAG A/AA violations`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter((violation) =>
      violation.impact === 'critical' || violation.impact === 'serious'
    );

    expect(
      blocking,
      blocking.map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} node(s))`).join('\n')
    ).toEqual([]);
  });
}
