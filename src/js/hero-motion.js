/**
 * Hero motion.
 *
 * Three behaviours, all optional, all cheap:
 *   1. Tool glyphs drift on their own. That part is a CSS keyframe on the orb
 *      itself, so it runs whether or not this module ever loads.
 *   2. Those glyphs lean towards the pointer. This module owns that, because
 *      parallax needs the pointer position and CSS cannot read it.
 *   3. A soft light follows the pointer, and a small face looks at it.
 *
 * Everything here writes only `transform` on elements that sit in an
 * absolutely-positioned, negative-z-index, pointer-events:none layer, so no
 * frame of this animation can trigger layout or shift the heading. The whole
 * module is skipped for anyone who asks for reduced motion, and for devices
 * with no fine pointer, where the idle drift alone is the right amount.
 */

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const FINE_POINTER = '(hover: hover) and (pointer: fine)';

/** How far, in pixels, an orb of depth 1 travels between the hero's edges. */
const PARALLAX_RANGE = 30;
/** How far a pupil travels from the centre of its eye, as a share of the eye. */
const PUPIL_RANGE = 0.22;
/** Per-frame approach factor. Low enough to trail the pointer visibly. */
const EASE = 0.14;

export function initHeroMotion(root = document) {
  const field = root.querySelector('[data-hero-field]');
  if (!field) return null;

  const hero = field.closest('.home-hero') || field.parentElement;
  if (!hero) return null;

  if (typeof window.matchMedia !== 'function') return null;
  if (window.matchMedia(REDUCED_MOTION).matches) return null;
  if (!window.matchMedia(FINE_POINTER).matches) return null;

  const orbs = Array.from(field.querySelectorAll('[data-hero-orb]')).map((node) => ({
    node,
    depth: Number.parseFloat(getComputedStyle(node).getPropertyValue('--orb-depth')) || 1
  }));
  const follower = field.querySelector('[data-hero-follower]');
  const pupils = Array.from(field.querySelectorAll('[data-hero-pupil]'));
  if (!orbs.length && !follower && !pupils.length) return null;

  // Pointer in hero-relative pixels, and normalised to -1..1 from the centre.
  const pointer = { x: 0, y: 0, nx: 0, ny: 0, seen: false };
  const eased = { x: 0, y: 0, nx: 0, ny: 0 };
  let frame = 0;
  let bounds = null;

  function measure() {
    bounds = hero.getBoundingClientRect();
  }

  function onPointerMove(event) {
    if (!bounds) measure();
    const x = event.clientX - bounds.left;
    const y = event.clientY - bounds.top;
    pointer.x = x;
    pointer.y = y;
    pointer.nx = bounds.width ? (x / bounds.width) * 2 - 1 : 0;
    pointer.ny = bounds.height ? (y / bounds.height) * 2 - 1 : 0;
    if (!pointer.seen) {
      pointer.seen = true;
      eased.x = x;
      eased.y = y;
      field.setAttribute('data-hero-active', '');
    }
    start();
  }

  function onPointerLeave() {
    // Settle back to the middle rather than snapping.
    if (!bounds) measure();
    pointer.x = bounds.width / 2;
    pointer.y = bounds.height / 2;
    pointer.nx = 0;
    pointer.ny = 0;
    start();
  }

  function render() {
    frame = 0;

    eased.x += (pointer.x - eased.x) * EASE;
    eased.y += (pointer.y - eased.y) * EASE;
    eased.nx += (pointer.nx - eased.nx) * EASE;
    eased.ny += (pointer.ny - eased.ny) * EASE;

    for (const orb of orbs) {
      // The orb element itself owns the idle keyframe, so the parallax is
      // written to the same element via a custom property the keyframe adds to.
      orb.node.style.translate =
        `${(eased.nx * PARALLAX_RANGE * orb.depth).toFixed(2)}px ` +
        `${(eased.ny * PARALLAX_RANGE * orb.depth * 0.6).toFixed(2)}px`;
    }

    if (follower) {
      follower.style.transform =
        `translate3d(${eased.x.toFixed(1)}px, ${eased.y.toFixed(1)}px, 0) scale(1)`;
    }

    for (const pupil of pupils) {
      const pct = (PUPIL_RANGE * 100).toFixed(0);
      pupil.style.transform =
        `translate(${(eased.nx * PUPIL_RANGE * 100).toFixed(1)}%, ${(eased.ny * PUPIL_RANGE * 100).toFixed(1)}%)`;
      pupil.dataset.range = pct;
    }

    const settled =
      Math.abs(pointer.x - eased.x) < 0.2 &&
      Math.abs(pointer.y - eased.y) < 0.2 &&
      Math.abs(pointer.nx - eased.nx) < 0.001 &&
      Math.abs(pointer.ny - eased.ny) < 0.001;
    if (!settled) start();
  }

  function start() {
    if (!frame) frame = window.requestAnimationFrame(render);
  }

  measure();
  eased.x = bounds.width / 2;
  eased.y = bounds.height / 2;
  pointer.x = eased.x;
  pointer.y = eased.y;
  render();

  hero.addEventListener('pointermove', onPointerMove, { passive: true });
  hero.addEventListener('pointerleave', onPointerLeave, { passive: true });
  window.addEventListener('resize', measure, { passive: true });
  window.addEventListener('scroll', measure, { passive: true });

  return function destroy() {
    if (frame) window.cancelAnimationFrame(frame);
    hero.removeEventListener('pointermove', onPointerMove);
    hero.removeEventListener('pointerleave', onPointerLeave);
    window.removeEventListener('resize', measure);
    window.removeEventListener('scroll', measure);
  };
}
