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
    expect(
      serious,
      serious.map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length} node(s))`).join('\n')
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

test('homepage mobile discovery links resolve and search keeps focus inside the modal', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  await page.locator('.mobile-menu-toggle').click();
  for (const link of await page.locator('#mobileMenu a[href^="#"]').all()) {
    const target = await link.getAttribute('href');
    expect(await page.locator(target).count(), `${target} must resolve on the homepage`).toBe(1);
  }

  await page.locator('#searchToggle').click();
  for (let step = 0; step < 10; step += 1) await page.keyboard.press('Tab');
  expect(await page.locator('#searchModal').evaluate((modal) => modal.contains(document.activeElement))).toBe(true);
});

test('homepage SearchAction query opens the real tool search', async ({ page }) => {
  await page.goto('/?q=PDF%20Compressor', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#searchModal')).toBeVisible();
  await expect(page.locator('#globalSearch')).toHaveValue('PDF Compressor');
  await expect(page.locator('#searchResults a')).not.toHaveCount(0);
});

test('homepage mobile discovery stays concise without hiding category routes', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/');

  const categoryLinks = page.locator('#categoriesGrid .category-nav-card h3 a');
  await expect(categoryLinks).toHaveCount(12);
  const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  expect(documentHeight).toBeLessThan(11500);
});

test('gold-standard PDF page exposes usable mobile navigation', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto('/tools/pdf/compress/', { waitUntil: 'domcontentloaded' });
  const trigger = page.locator('.mobile-menu-toggle');
  await expect(trigger).toBeVisible();
  await trigger.click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  const pdfTarget = page.locator('#mobileMenu a').filter({ hasText: 'PDF tools' });
  await expect(pdfTarget).toBeVisible();
  expect(await pdfTarget.evaluate((link) => new URL(link.href).pathname)).toBe('/categories/pdf-tools.html');
});

test('image compressor navigation resolves to real category routes', async ({ page }) => {
  await page.goto('/tools/image/compress/', { waitUntil: 'domcontentloaded' });
  const hrefs = await page.locator('.nav-desktop a').evaluateAll((links) => links.map((link) => new URL(link.href).pathname));
  expect(hrefs).toContain('/categories/finance-tools.html');
  expect(hrefs).toContain('/categories/pdf-tools.html');
  expect(hrefs).toContain('/categories/image-tools.html');
  expect(hrefs).toContain('/categories/developer-tools.html');
});
