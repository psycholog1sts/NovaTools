const GA_MEASUREMENT_ID = import.meta.env.PUBLIC_GA_ID || import.meta.env.VITE_GA_ID || window.NOVATOOLS_GA_ID || '';
const CLARITY_PROJECT_ID = window.NOVATOOLS_CLARITY_PROJECT_ID || '';
const COOKIE_EXPIRES_SECONDS = 63072000;
const CONSENT_EVENT = 'novatools:consent-updated';
const SCRIPT_LOADED_EVENT = 'novatools:consented-scripts-loaded';
const SENSITIVE_KEY_PATTERN = /(email|phone|name|address|password|token|secret|message)/i;
const SCROLL_THRESHOLDS = [25, 50, 75, 100];

let initialized = false;
let gaReady = false;
let clarityReady = false;
let queuedEvents = [];
let blogReadTracked = false;
let scrollTrackingReady = false;
const seenScrollThresholds = new Set();

function getStoredConsent() {
  try {
    const raw = localStorage.getItem('cookie_consent') || localStorage.getItem('novatools_cookie_consent') || localStorage.getItem('mc_novatools_cookie_consent');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function hasConsent(category) {
  const consent = window.NovaToolsConsent || getStoredConsent();
  return consent?.[category] === true || (category === 'advertising' && consent?.categories?.advertising === true);
}

function shouldRespectPrivacySignal() {
  return navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
}

function isAnalyticsAllowed() {
  return hasConsent('analytics') && !shouldRespectPrivacySignal();
}

function createScript(src, attrs = {}) {
  if (document.querySelector(`script[src="${src}"]`)) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    Object.entries(attrs).forEach(([key, value]) => script.setAttribute(key, value));
    script.addEventListener('load', resolve, { once: true });
    script.addEventListener('error', reject, { once: true });
    document.head.appendChild(script);
  });
}

function ensureGtagStub() {
  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };
  }
}

function configureGa() {
  if (!GA_MEASUREMENT_ID) return;
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
  ensureGtagStub();
  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    cookie_expires: COOKIE_EXPIRES_SECONDS,
    cookie_update: true,
    send_page_view: true
  });
  gaReady = true;
  flushQueue();
}

function loadGa() {
  if (!GA_MEASUREMENT_ID || !isAnalyticsAllowed() || gaReady) return;
  const src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_MEASUREMENT_ID)}`;
  createScript(src, { 'data-novatools-analytics': 'ga4' })
    .then(configureGa)
    .catch(() => {
      gaReady = false;
    });
}

function loadClarity() {
  if (!isAnalyticsAllowed() || clarityReady || !CLARITY_PROJECT_ID) return;
  window.clarity = window.clarity || function clarity() {
    (window.clarity.q = window.clarity.q || []).push(arguments);
  };
  const src = `https://www.clarity.ms/tag/${encodeURIComponent(CLARITY_PROJECT_ID)}`;
  createScript(src, { 'data-novatools-analytics': 'clarity' })
    .then(() => {
      clarityReady = true;
    })
    .catch(() => {
      clarityReady = false;
    });
}

function sanitizeValue(value) {
  if (typeof value === 'string') return value.slice(0, 120);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 10).map(sanitizeValue);
  if (value && typeof value === 'object') return sanitizeParams(value);
  return value ?? undefined;
}

function sanitizeParams(params = {}) {
  return Object.fromEntries(Object.entries(params)
    .filter(([key]) => !SENSITIVE_KEY_PATTERN.test(key))
    .map(([key, value]) => [key, sanitizeValue(value)]));
}

function hashSearchQuery(query) {
  const normalized = String(query || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!normalized) return '';
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function sendEvent(name, params = {}) {
  if (!isAnalyticsAllowed()) return false;
  const payload = sanitizeParams({
    page_path: window.location.pathname,
    page_title: document.title,
    ...params
  });

  if (!gaReady || typeof window.gtag !== 'function') {
    queuedEvents.push([name, payload]);
    queuedEvents = queuedEvents.slice(-50);
    return true;
  }

  window.gtag('event', name, payload);
  return true;
}

function flushQueue() {
  const events = queuedEvents;
  queuedEvents = [];
  events.forEach(([name, params]) => sendEvent(name, params));
}

function pageType() {
  const path = window.location.pathname;
  if (path === '/' || /\/index\.html$/.test(path)) return path.includes('/blog/') ? 'blog_index' : 'home';
  if (/\/categories\//.test(path)) return 'category';
  if (/\/tools\//.test(path)) return 'tool';
  if (/\/blog\//.test(path)) return 'blog';
  if (/\/(privacy-policy|cookie-policy|terms-of-service|about-us|contact|security)\.html$/.test(path)) return 'legal';
  return 'other';
}

function contentViewName(type) {
  return `${type === 'blog_index' ? 'blog' : type}_view`;
}

function trackContentView() {
  const type = pageType();
  sendEvent('content_view', {
    content_type: type,
    content_event: contentViewName(type)
  });
}

function trackBlogRead(reason) {
  if (blogReadTracked || !['blog', 'blog_index'].includes(pageType())) return;
  blogReadTracked = true;
  sendEvent('blog_article_read', { read_trigger: reason });
}

function setupScrollTracking() {
  if (scrollTrackingReady) return;
  scrollTrackingReady = true;
  window.addEventListener('scroll', () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (scrollable <= 0) return;
    const depth = Math.min(100, Math.round((window.scrollY / scrollable) * 100));
    SCROLL_THRESHOLDS.forEach((threshold) => {
      if (depth >= threshold && !seenScrollThresholds.has(threshold)) {
        seenScrollThresholds.add(threshold);
        sendEvent(pageType().startsWith('blog') ? 'blog_scroll_depth' : 'scroll_depth', { percent_scrolled: threshold });
        if (threshold >= 75) trackBlogRead('scroll_75');
      }
    });
  }, { passive: true });
  window.setTimeout(() => trackBlogRead('time_30_seconds'), 30000);
}

function setupClickTracking() {
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a, button');
    if (!link) return;
    const text = (link.getAttribute('aria-label') || link.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80);
    const href = link.getAttribute('href') || '';
    const location = link.closest('header') ? 'header' : link.closest('footer') ? 'footer' : link.closest('.hero, .tool-hero') ? 'hero' : pageType();

    if (link.matches('[data-analytics-cta], .btn, .button, .section-link')) {
      sendEvent('cta_click', { cta_text: text, cta_location: location, link_url: href });
    }

    if (link.closest('nav, header')) {
      sendEvent('nav_click', { nav_text: text, nav_location: location, link_url: href });
    }
  });
}

function setupSearchTracking() {
  document.addEventListener('change', (event) => {
    const input = event.target.closest('input[type="search"], input[id*="search" i], input[name*="search" i]');
    if (!input || String(input.value || '').trim().length < 2) return;
    sendEvent('search_query', {
      query_hash: hashSearchQuery(input.value),
      query_length: String(input.value).trim().length
    });
  });
}

function setupPreferenceTracking() {
  window.addEventListener('languageChanged', (event) => {
    sendEvent('language_change', {
      old_language: event.detail?.previousLanguage || event.detail?.oldLanguage,
      new_language: event.detail?.language
    });
  });
  window.addEventListener('themechange', (event) => {
    sendEvent('theme_change', {
      old_theme: event.detail?.previousTheme,
      new_theme: event.detail?.theme
    });
  });
}

function observeToolEvents() {
  document.addEventListener('click', (event) => {
    const control = event.target.closest('[data-tool-action], button[type="submit"], .tool-button, .process-button');
    if (!control || !/\/tools\//.test(window.location.pathname)) return;
    sendEvent('tool_task_start', {
      tool_id: window.location.pathname.replace(/^.*\/tools\//, '').replace(/\/$/, ''),
      action_label: (control.textContent || control.getAttribute('aria-label') || 'run').trim().slice(0, 80)
    });
  });
  document.addEventListener('change', (event) => {
    if (!/\/tools\//.test(window.location.pathname)) return;
    const input = event.target.closest('input, textarea, select');
    if (!input) return;
    const method = input.type === 'file' ? 'file_upload' : input.tagName === 'TEXTAREA' ? 'text_input' : input.type || input.tagName.toLowerCase();
    sendEvent('tool_input_method', { input_method: method });
  });
  window.addEventListener('novatools:tool-task-complete', (event) => sendEvent('tool_task_complete', event.detail || {}));
  window.addEventListener('novatools:tool-task-error', (event) => sendEvent('tool_task_error', { error_message: event.detail?.message || 'unknown_error' }));
}

function trackWebVitalMetric(metric) {
  const value = metric.name === 'CLS' ? metric.value : Math.round(metric.value);
  sendEvent('web_vital', {
    metric_name: metric.name,
    metric_value: value,
    metric_rating: metric.rating || 'unknown',
    metric_id: metric.id
  });
}

function setupCoreWebVitals() {
  if (!('PerformanceObserver' in window)) return;
  try {
    new PerformanceObserver((entryList) => {
      const lastEntry = entryList.getEntries()[entryList.getEntries().length - 1];
      if (lastEntry) trackWebVitalMetric({ name: 'LCP', value: lastEntry.startTime, id: 'lcp' });
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (_error) {
    void _error;
  }
  try {
    new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach((entry) => {
        if (!entry.hadRecentInput) trackWebVitalMetric({ name: 'CLS', value: entry.value, id: 'cls' });
      });
    }).observe({ type: 'layout-shift', buffered: true });
  } catch (_error) {
    void _error;
  }
  try {
    new PerformanceObserver((entryList) => {
      entryList.getEntries().forEach((entry) => {
        trackWebVitalMetric({ name: 'INP', value: entry.duration, id: entry.name || 'inp' });
      });
    }).observe({ type: 'event', buffered: true, durationThreshold: 40 });
  } catch (_error) {
    void _error;
  }
  window.addEventListener('load', () => {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) trackWebVitalMetric({ name: 'TTFB', value: nav.responseStart, id: 'ttfb' });
    const paint = performance.getEntriesByName('first-contentful-paint')[0];
    if (paint) trackWebVitalMetric({ name: 'FCP', value: paint.startTime, id: 'fcp' });
  }, { once: true });
}

function enableTracking() {
  if (!isAnalyticsAllowed()) {
    if (GA_MEASUREMENT_ID) window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
    return;
  }
  loadGa();
  loadClarity();
  setupScrollTracking();
  trackContentView();
}

export function initAnalytics() {
  if (initialized) return;
  initialized = true;
  setupClickTracking();
  setupSearchTracking();
  setupPreferenceTracking();
  observeToolEvents();
  setupCoreWebVitals();
  window.addEventListener(CONSENT_EVENT, enableTracking);
  window.addEventListener(SCRIPT_LOADED_EVENT, () => {
    if (isAnalyticsAllowed() && typeof window.gtag === 'function' && !gaReady) configureGa();
  });
  enableTracking();
}

export const analytics = {
  init: initAnalytics,
  trackEvent: sendEvent,
  trackToolStart: (params) => sendEvent('tool_task_start', params),
  trackToolComplete: (params) => sendEvent('tool_task_complete', params),
  trackToolError: (params) => sendEvent('tool_task_error', params),
  trackInputMethod: (params) => sendEvent('tool_input_method', params),
  trackCtaClick: (params) => sendEvent('cta_click', params),
  trackAdImpression: (params) => sendEvent('ad_impression', params),
  trackAdClick: (params) => sendEvent('ad_click', params)
};

window.NovaToolsAnalytics = analytics;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnalytics, { once: true });
} else {
  initAnalytics();
}
