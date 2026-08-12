import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const routes = [
  ['home', '/'],
  ['pricing', '/pricing/'],
  ['pdf compressor', '/tools/pdf/compress/']
];

for (const [name, route] of routes) {
  test(`${name} has no critical WCAG A/AA violations`, async ({ page }) => {
    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const critical = results.violations.filter((violation) => violation.impact === 'critical');
    const serious = results.violations.filter((violation) => violation.impact === 'serious');

    if (serious.length) {
      const details = serious
        .map((violation) => {
          const targets = violation.nodes
            .slice(0, 5)
            .map((node) => {
              const data = node.any
                .map((check) => check.data)
                .filter(Boolean)
                .map((value) => JSON.stringify(value))
                .join(', ');
              const summary = node.failureSummary?.replaceAll('\n', ' ') || '';
              return `${node.target.join(' > ')}${data ? ` data=${data}` : ''}${summary ? ` summary=${summary}` : ''}`;
            })
            .join('; ');
          return `${violation.id}: ${violation.help} (${violation.nodes.length} node(s)) [${targets}]`;
        })
        .join(' | ')
        .replaceAll('%', '%25')
        .replaceAll('\r', '%0D')
        .replaceAll('\n', '%0A');
      console.log(`::warning title=${name} serious axe details::${details}`);
    }

    expect(
      critical,
      critical.map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} node(s))`).join('\n')
    ).toEqual([]);
  });
}
