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
      const runtime = name === 'home'
        ? await page.evaluate(() => {
            const input = document.getElementById('homeSearchInput');
            if (!input) return { input: null };

            const style = getComputedStyle(input);
            const placeholder = getComputedStyle(input, '::placeholder');
            const matchedRules = [];

            for (const sheet of document.styleSheets) {
              let rules;
              try {
                rules = sheet.cssRules;
              } catch {
                continue;
              }

              for (const rule of rules) {
                if (!(rule instanceof CSSStyleRule)) continue;
                const selector = rule.selectorText || '';
                if (
                  selector.includes('homeSearchInput') ||
                  selector.includes('home-search__input') ||
                  selector.includes("input:not([type='checkbox'])")
                ) {
                  matchedRules.push({
                    href: sheet.href,
                    selector,
                    cssText: rule.style.cssText
                  });
                }
              }
            }

            return {
              theme: document.documentElement.getAttribute('data-theme'),
              inlineStyle: input.getAttribute('style'),
              color: style.color,
              webkitTextFillColor: style.webkitTextFillColor,
              backgroundColor: style.backgroundColor,
              borderColor: style.borderColor,
              padding: style.padding,
              placeholderColor: placeholder.color,
              placeholderOpacity: placeholder.opacity,
              stylesheets: [...document.styleSheets].map((sheet) => sheet.href),
              matchedRules: matchedRules.slice(0, 20)
            };
          })
        : null;

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
        .join(' | ');

      const diagnostic = `${details}${runtime ? ` runtime=${JSON.stringify(runtime)}` : ''}`
        .replaceAll('%', '%25')
        .replaceAll('\r', '%0D')
        .replaceAll('\n', '%0A');
      console.log(`::warning title=${name} serious axe details::${diagnostic}`);
    }

    expect(
      critical,
      critical.map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} node(s))`).join('\n')
    ).toEqual([]);
  });
}

for (const [name, route] of [
  ['home', '/'],
  ['background remover', '/tools/image/background-remover/'],
  ['image compressor', '/tools/image/compress/'],
  ['json formatter', '/tools/dev/json-formatter/'],
  ['pdf compressor', '/tools/pdf/compress/']
]) {
  test(`${name} light theme has no WCAG color contrast failures`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('novatools-theme', 'light');
      localStorage.removeItem('theme');
    });

    const response = await page.goto(route, { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const contrast = results.violations.filter((violation) => violation.id === 'color-contrast');
    expect(
      contrast,
      contrast.map((violation) => `${violation.id}: ${violation.nodes.map((node) => node.target.join(' > ')).join('; ')}`).join('\n')
    ).toEqual([]);
  });
}
