# Accessibility Audit Checklist — WCAG 2.1 AA

## Page structure

- [ ] Exactly one meaningful `<h1>` per page.
- [ ] Heading order does not skip levels in major content areas.
- [ ] Main landmark exists and skip link targets it.
- [ ] Header, navigation, main, aside, section, and footer landmarks are semantic.

## Keyboard access

- [ ] Every interactive element is reachable with Tab.
- [ ] Focus order follows visual order.
- [ ] Focus indicators are visible at 3:1 contrast or better against adjacent colors.
- [ ] Dropdowns based on `<details>` can be opened and closed by keyboard.
- [ ] Escape/close behavior is available for modal-style search where JavaScript is active.

## Forms and tools

- [ ] Inputs have visible labels or programmatic labels.
- [ ] Error messages identify the field or action that failed.
- [ ] Progress bars expose `role="progressbar"`, `aria-valuemin`, `aria-valuemax`, and `aria-valuenow`.
- [ ] Counters use `aria-live="polite"` and do not interrupt typing.
- [ ] File-processing guidance explains browser memory limitations.

## Color and readability

- [ ] Body font size is at least 16px.
- [ ] Default line-height is at least 1.5; target is 1.6.
- [ ] Paragraph width is capped near 75ch.
- [ ] Normal text contrast is at least 4.5:1.
- [ ] Large text and icons carrying meaning are at least 3:1.
- [ ] Dark and light theme tokens are both checked.

## Images and media

- [ ] Informative images have meaningful alt text.
- [ ] Decorative images use empty alt text.
- [ ] Image dimensions are declared to reduce layout shift.
- [ ] Motion/animation is subtle and not essential for understanding.

## Dynamic engagement widgets

- [ ] Ratings expose button labels for each star value.
- [ ] Selected rating/helpful/favorite states use `aria-pressed` where applicable.
- [ ] Device-only storage messaging is visible.
- [ ] No widget blocks the primary tool action.
- [ ] No JavaScript fallback messages are available for storage-dependent features.

## Manual assistive technology checks

- [ ] Test homepage and representative tool pages with keyboard only.
- [ ] Test one PDF tool, one text/dev tool, and one image tool with a screen reader.
- [ ] Test zoom at 200% and mobile viewport widths.
- [ ] Verify focus is not trapped in menus, modals, or carousels.
