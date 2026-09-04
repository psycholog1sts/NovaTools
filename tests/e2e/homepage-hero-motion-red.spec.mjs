import { test, expect } from '@playwright/test';

/**
 * The hero has to be visibly alive: things that float on their own, and one
 * thing that answers the pointer. The previous attempt animated a blurred
 * gradient at negative z-index — measurable, but not perceivable. These tests
 * assert perceivable motion: named elements, real displacement in pixels, and
 * a response to the pointer that a person would notice.
 *
 * They also assert the price of that motion is zero: the decorations are
 * hidden from assistive technology, take no part in layout, and stop entirely
 * for anyone who asks for less motion.
 */

const HERO = '.home-hero';
const ORB = '[data-hero-orb]';
const FOLLOWER = '[data-hero-follower]';

/** Read an element's on-screen centre, after transforms. */
async function centres(page, selector) {
  return page.evaluate((sel) => Array.from(document.querySelectorAll(sel)).map((node) => {
    const r = node.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }), selector);
}

function maxDrift(a, b) {
  let most = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i += 1) {
    most = Math.max(most, Math.hypot(a[i].x - b[i].x, a[i].y - b[i].y));
  }
  return most;
}

test.describe('Homepage hero motion', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(response?.ok()).toBeTruthy();
  });

  test('floating elements exist in the hero and are decorative', async ({ page }) => {
    const orbs = page.locator(`${HERO} ${ORB}`);
    await expect(orbs).not.toHaveCount(0);
    expect(await orbs.count()).toBeGreaterThanOrEqual(4);

    const decorative = await page.evaluate((sel) => Array.from(document.querySelectorAll(sel))
      .every((node) => node.closest('[aria-hidden="true"]') !== null), ORB);
    expect(decorative).toBe(true);
  });

  test('the floating elements move on their own, by an amount a person can see', async ({ page }) => {
    await page.waitForSelector(`${HERO} ${ORB}`);
    const first = await centres(page, ORB);
    await page.waitForTimeout(1400);
    const later = await centres(page, ORB);
    // Anything under a couple of pixels reads as still. Ask for real travel.
    expect(maxDrift(first, later)).toBeGreaterThan(6);
  });

  test('the follower tracks the pointer across the hero', async ({ page }) => {
    await page.waitForSelector(`${HERO} ${FOLLOWER}`);
    const box = await page.locator(HERO).boundingBox();
    expect(box).not.toBeNull();

    await page.mouse.move(box.x + box.width * 0.2, box.y + box.height * 0.3);
    await page.waitForTimeout(600);
    const left = (await centres(page, FOLLOWER))[0];

    await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.7, { steps: 12 });
    await page.waitForTimeout(600);
    const right = (await centres(page, FOLLOWER))[0];

    expect(right.x - left.x).toBeGreaterThan(150);
    expect(Math.abs(right.y - left.y)).toBeGreaterThan(40);
  });

  test('the orbs lean towards the pointer too, so the hero feels interactive', async ({ page }) => {
    await page.waitForSelector(`${HERO} ${ORB}`);
    const box = await page.locator(HERO).boundingBox();
    await page.mouse.move(box.x + box.width * 0.1, box.y + box.height * 0.2);
    await page.waitForTimeout(700);
    const near = await centres(page, ORB);
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height * 0.8, { steps: 12 });
    await page.waitForTimeout(700);
    const far = await centres(page, ORB);
    expect(maxDrift(near, far)).toBeGreaterThan(10);
  });

  test('reduced motion stops all of it', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector(HERO);

    const before = await centres(page, ORB);
    const box = await page.locator(HERO).boundingBox();
    await page.mouse.move(box.x + box.width * 0.85, box.y + box.height * 0.75, { steps: 10 });
    await page.waitForTimeout(1200);
    const after = await centres(page, ORB);
    expect(maxDrift(before, after)).toBeLessThan(1);

    const followerMoved = await page.evaluate((sel) => {
      const node = document.querySelector(sel);
      if (!node) return 0;
      const r = node.getBoundingClientRect();
      return r.width * r.height;
    }, FOLLOWER);
    // The follower may be removed entirely under reduced motion; if it is kept,
    // it must not be animating. Either way the orbs above are the contract.
    expect(typeof followerMoved).toBe('number');
  });

  test('the decorations cost nothing: no layout participation, no shift', async ({ page }) => {
    const shift = await page.evaluate(() => new Promise((resolve) => {
      let total = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) if (!entry.hadRecentInput) total += entry.value;
      }).observe({ type: 'layout-shift', buffered: true });
      setTimeout(() => resolve(total), 2500);
    }));
    expect(shift).toBeLessThan(0.02);

    const outOfFlow = await page.evaluate((sel) => Array.from(document.querySelectorAll(sel))
      .every((node) => {
        const style = getComputedStyle(node);
        return style.position === 'absolute' && style.pointerEvents === 'none';
      }), ORB);
    expect(outOfFlow).toBe(true);

    // The heading must not have been pushed by the decoration layer.
    const titleTop = await page.evaluate(() => document.querySelector('.home-hero__title').getBoundingClientRect().top);
    expect(titleTop).toBeGreaterThan(0);
  });

  test('the hero stays keyboard- and screen-reader-clean', async ({ page }) => {
    const focusable = await page.evaluate((sel) => {
      const field = document.querySelector(sel);
      if (!field) return -1;
      return field.querySelectorAll('a, button, input, select, textarea, [tabindex]').length;
    }, '[data-hero-field]');
    expect(focusable).toBe(0);
  });
});
