(function installNovaToolsAnalyticsCompatibility() {
  function track(eventName, data) {
    if (window.NovaToolsAnalytics && typeof window.NovaToolsAnalytics.trackEvent === 'function') {
      return window.NovaToolsAnalytics.trackEvent(eventName, data || {});
    }
    return false;
  }

  window.umami = { track };
})();
