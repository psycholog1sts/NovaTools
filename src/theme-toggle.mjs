/**
 * Theme Toggle Module
 * Light/dark theme with a calm light default and localStorage persistence.
 */

const STORAGE_KEY = 'novatools-theme';
const THEME_CHANGE_EVENT = 'themechange';
const VALID_THEMES = new Set(['dark', 'light']);

function getStoredTheme() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return VALID_THEMES.has(stored) ? stored : null;
  } catch {
    return null;
  }
}

function persistTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be unavailable in strict privacy contexts; the DOM theme still updates.
  }
}

function removeStoredTheme() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

function getSystemTheme() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Initialize theme on page load. First visits intentionally use the light theme;
 * an explicit user choice remains persistent across all tool pages.
 * @returns {'dark' | 'light'}
 */
export function initTheme() {
  const storedTheme = getStoredTheme();
  const theme = storedTheme || 'light';

  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  if (!storedTheme) persistTheme(theme);
  updateMetaThemeColor(theme);

  return theme;
}

/**
 * Get current effective theme.
 * @returns {'dark' | 'light'}
 */
export function getCurrentTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  return VALID_THEMES.has(currentTheme) ? currentTheme : initTheme();
}

/**
 * Set theme explicitly.
 * @param {'dark' | 'light'} theme
 */
export function setTheme(theme) {
  if (!VALID_THEMES.has(theme)) {
    console.warn(`Invalid theme: ${theme}. Use 'dark' or 'light'.`);
    return;
  }

  const previousTheme = getCurrentTheme();
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  persistTheme(theme);

  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
    detail: { theme, previousTheme }
  }));

  updateMetaThemeColor(theme);
  updateChartsForTheme(theme);
}

/** Toggle between dark and light themes. */
export function toggleTheme() {
  const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/**
 * Setup theme toggle button.
 * @param {string} buttonId
 */
export function setupThemeToggle(buttonId = 'themeToggle') {
  const btn = document.getElementById(buttonId);
  if (!btn) return;

  updateToggleIcon(btn, getCurrentTheme());

  btn.addEventListener('click', () => {
    updateToggleIcon(btn, toggleTheme());
  });

  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
    if (!getStoredTheme()) {
      const newTheme = event.matches ? 'dark' : 'light';
      applySystemTheme(newTheme);
      updateToggleIcon(btn, newTheme);
    }
  });

  window.addEventListener(THEME_CHANGE_EVENT, (event) => {
    updateToggleIcon(btn, event.detail.theme);
  });
}

function applySystemTheme(theme) {
  const previousTheme = getCurrentTheme();
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  updateMetaThemeColor(theme);
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
    detail: { theme, previousTheme }
  }));
}

function updateToggleIcon(btn, theme) {
  const sunIcon = btn.querySelector('.icon-sun');
  const moonIcon = btn.querySelector('.icon-moon');

  if (sunIcon && moonIcon) {
    const isDark = theme === 'dark';
    sunIcon.hidden = !isDark;
    moonIcon.hidden = isDark;
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  btn.setAttribute('data-theme', theme);
}

function updateMetaThemeColor(theme) {
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', theme === 'dark' ? '#0b1220' : '#f8fafc');
  }
}

function updateChartsForTheme(theme) {
  document.querySelectorAll('[data-chart]').forEach((chart) => {
    chart.dispatchEvent(new CustomEvent('chart:themechange', {
      detail: { theme }
    }));
  });
}

/** Reset to the operating-system preference when explicitly requested. */
export function resetToSystemPreference() {
  removeStoredTheme();
  applySystemTheme(getSystemTheme());
}

if (typeof document !== 'undefined') {
  initTheme();
}

export default {
  initTheme,
  getCurrentTheme,
  setTheme,
  toggleTheme,
  setupThemeToggle,
  resetToSystemPreference
};
