/**
 * Legacy analytics compatibility adapter.
 *
 * Historical tool code can still call `window.umami.track(...)`, but this
 * module no longer sends data to a separate analytics endpoint. Events are
 * delegated to the consent-aware `window.NovaToolsAnalytics` transport when it
 * is present; otherwise tracking is a privacy-safe no-op.
 */

export function initAnalytics() {
  // The active analytics lifecycle is owned by src/js/analytics.js.
}

export function trackEvent(eventName, data = {}) {
  if (window.NovaToolsAnalytics?.trackEvent) {
    return window.NovaToolsAnalytics.trackEvent(eventName, data);
  }
  return false;
}

export function trackPageView() {
  return trackEvent('page_view', {
    page_path: window.location.pathname
  });
}

window.umami = {
  track: trackEvent
};
