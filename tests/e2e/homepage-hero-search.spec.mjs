import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Homepage hero and tool search', () => {
  test.beforeEach(async ({ page }) => {
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
  });

  test('the heading is the largest text on the page', async ({ page }) => {
    const sizes = await page.evaluate(() => {
      const px = (selector) => {
        const node = document.querySelector(selector);
        return node ? parseFloat(getComputedStyle(node).fontSize) : 0;
      };
      return { h1: px('.home-hero__title'), lede: px('.home-hero__lede'), body: parseFloat(getComputedStyle(document.body).fontSize) };
    });
    expect(sizes.h1).toBeGreaterThan(sizes.lede);
    expect(sizes.h1).toBeGreaterThan(sizes.body * 2);
  });

  test('the container is actually constrained', async ({ page }) => {
    await page.setViewportSize({ width: 1600, height: 900 });
    const width = await page.evaluate(() => {
      const node = document.querySelector('.home-hero__inner');
      return node ? node.getBoundingClientRect().width : Number.POSITIVE_INFINITY;
    });
    expect(width).toBeLessThanOrEqual(1100);
  });

  test('the search control is reachable without scrolling on a laptop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 800 });
    const box = await page.locator('#homeSearchInput').boundingBox();
    expect(box).not.toBeNull();
    expect(box.y + box.height).toBeLessThan(800);
  });

  test('typing a task phrase finds the right tool', async ({ page }) => {
    const input = page.locator('#homeSearchInput');
    for (const [query, expected] of [
      ['percent', /percentage/i],
      ['epoch', /timestamp/i],
      ['kg to lbs', /unit converter/i],
      ['how old am i', /age/i],
      ['compress pdf', /pdf/i]
    ]) {
      await input.fill(query);
      const first = page.locator('#homeSearchResults [role="option"]').first();
      await expect(first).toBeVisible();
      await expect(first).toContainText(expected);
    }
  });

  test('results are navigable from the keyboard with combobox semantics', async ({ page }) => {
    const input = page.locator('#homeSearchInput');
    await input.fill('convert');
    await expect(page.locator('#homeSearchResults [role="option"]').first()).toBeVisible();
    await input.press('ArrowDown');
    await expect(input).toHaveAttribute('aria-activedescendant', /homeSearchOption-\d+/);
    await expect(page.locator('#homeSearchResults [aria-selected="true"]')).toHaveCount(1);
    await input.press('Escape');
    await expect(input).toHaveValue('');
  });

  test('a query with no match offers a way forward instead of a shrug', async ({ page }) => {
    await page.locator('#homeSearchInput').fill('zzzzqqq');
    const empty = page.locator('.home-search__empty');
    await expect(empty).toBeVisible();
    await expect(empty).toContainText(/no tool matches/i);
    await expect(empty.locator('a')).toHaveCount(2);
  });

  test('search never offers a route that fails closed or was withheld', async ({ page }) => {
    const hrefs = await page.evaluate(async () => {
      const input = document.getElementById('homeSearchInput');
      const found = new Set();
      for (const term of ['a', 'e', 'i', 'o', 'convert', 'calc', 'pdf', 'image', 'guide']) {
        input.value = term;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        await new Promise((resolve) => setTimeout(resolve, 20));
        document.querySelectorAll('#homeSearchResults [role="option"]').forEach((node) => found.add(node.getAttribute('href')));
      }
      return [...found];
    });
    expect(hrefs.length).toBeGreaterThan(5);
    for (const href of hrefs) {
      const response = await page.request.get(href);
      expect(response.status(), `${href} must exist`).toBe(200);
      const html = await response.text();
      expect(html, `${href} must not be a fail-closed route`).not.toMatch(/content="noindex/i);
    }
  });

  test('the hero makes no unverifiable marketing claim', async ({ page }) => {
    const hero = page.locator('.home-hero');
    await expect(hero).not.toContainText(/million|#1|100% accurate|military-grade|AI-powered|world'?s best/i);
  });

  test('every hero task chip leads to a working tool', async ({ page }) => {
    const chips = page.locator('.home-task-chip');
    const count = await chips.count();
    expect(count).toBeGreaterThan(3);
    for (let i = 0; i < count; i += 1) {
      const href = await chips.nth(i).getAttribute('href');
      const response = await page.request.get(href);
      expect(response.status(), `${href} must exist`).toBe(200);
      expect(await response.text(), `${href} must be a certified tool`).not.toMatch(/currently unavailable/i);
    }
  });

  test('recently used appears only after a tool is opened, and can be cleared', async ({ page }) => {
    await expect(page.locator('#recent-tools')).toBeHidden();

    await page.goto('/tools/converters/percentage-calculator/', { waitUntil: 'networkidle' });
    await page.goto('/', { waitUntil: 'networkidle' });

    const section = page.locator('#recent-tools');
    await expect(section).toBeVisible();
    await expect(section.locator('.home-recent__card')).toHaveCount(1);

    await page.locator('#clearRecentTools').click();
    await expect(section).toBeHidden();
  });

  test('no critical or serious accessibility violations', async ({ page }) => {
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const blocking = results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact));
    expect(
      blocking,
      blocking.map((violation) => `${violation.id}: ${violation.help} (${violation.nodes.length})`).join('\n')
    ).toEqual([]);
  });

  test('reflows at 320px with no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1)).toBe(true);
  });
});
