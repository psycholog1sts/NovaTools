/**
 * Centralized AdSense slot IDs for static tool pages.
 *
 * Manual inventory stays disabled until every value is copied from the
 * approved AdSense account. Never invent numeric IDs to satisfy validation.
 */
export const TOOL_AD_SLOTS = Object.freeze({
  newsSidebar: null,
  islamicCalendar: null,
  retirementTool: null,
  studentLoanTool: null,
  blogInContent: null,
  categorySponsored: null,
  mobileAnchor: null
});

export function applyToolAdSlots(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return;

  root.querySelectorAll('ins.adsbygoogle[data-slot-key]').forEach((el) => {
    const key = el.getAttribute('data-slot-key');
    const mapped = key && TOOL_AD_SLOTS[key];
    if (/^\d{8,20}$/.test(String(mapped || ''))) {
      el.setAttribute('data-ad-slot', mapped);
      return;
    }
    el.removeAttribute('data-ad-slot');
    el.setAttribute('data-ad-status', 'disabled-unconfigured');
    const container = el.closest('.ad-slot-container, .ad-in-tool, .ad-frame, .ad-wrapper, aside');
    if (container) container.hidden = true;
  });
}
