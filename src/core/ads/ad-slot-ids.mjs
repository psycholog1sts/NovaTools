/**
 * Centralized AdSense slot IDs for static tool pages.
 * Keep IDs numeric (production format) and unique per placement.
 */
export const TOOL_AD_SLOTS = {
  newsSidebar: '7418529630',
  islamicCalendar: '8529630741',
  retirementTool: '9630741852',
  studentLoanTool: '1741852963'
};

export function applyToolAdSlots(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return;

  root.querySelectorAll('ins.adsbygoogle[data-slot-key]').forEach((el) => {
    const key = el.getAttribute('data-slot-key');
    const mapped = key && TOOL_AD_SLOTS[key];
    if (mapped) {
      el.setAttribute('data-ad-slot', mapped);
    }
  });
}
