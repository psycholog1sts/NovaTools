/**
 * Theme Toggle Module
 * Dual theme (dark/light) with system preference detection
 * Zero dependencies, vanilla JS
 */

const STORAGE_KEY = 'novatools-theme';
const THEME_CHANGE_EVENT = 'themechange';

/**
 * Initialize theme on page load (call immediately in head)
 * Prevents FOUC (Flash of Unstyled Content)
 */
export function initTheme() {
  const stored = localStorage.getItem(STORAGE_KEY);
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Default to dark if no preference stored
  const theme = stored || (systemPrefersDark ? 'dark' : 'light');
  
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  
  return theme;
}

/**
 * Get current effective theme
 * @returns {string} 'dark' | 'light'
 */
export function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

/**
 * Set theme explicitly
 * @param {string} theme - 'dark' | 'light'
 */
export function setTheme(theme) {
  if (!['dark', 'light'].includes(theme)) {
    console.warn(`Invalid theme: ${theme}. Use 'dark' or 'light'.`);
    return;
  }
  
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
  
  // Dispatch custom event for other components
  window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, { 
    detail: { theme, previousTheme: theme === 'dark' ? 'light' : 'dark' }
  }));
  
  // Update meta theme-color for mobile browsers
  updateMetaThemeColor(theme);
  
  // Update any charts or canvases if present
  updateChartsForTheme(theme);
}

/**
 * Toggle between dark and light
 */
export function toggleTheme() {
  const current = getCurrentTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/**
 * Setup theme toggle button
 * @param {string} buttonId - ID of toggle button
 */
export function setupThemeToggle(buttonId = 'themeToggle') {
  const btn = document.getElementById(buttonId);
  if (!btn) {
    console.warn(`Theme toggle button not found: #${buttonId}`);
    return;
  }
  
  // Update icon to match current theme
  updateToggleIcon(btn, getCurrentTheme());
  
  // Handle click
  btn.addEventListener('click', () => {
    const newTheme = toggleTheme();
    updateToggleIcon(btn, newTheme);
  });
  
  // Listen for system preference changes (if user hasn't manually set)
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      const newTheme = e.matches ? 'dark' : 'light';
      setTheme(newTheme);
      updateToggleIcon(btn, newTheme);
    }
  });
  
  // Listen for theme changes from other sources
  window.addEventListener(THEME_CHANGE_EVENT, (e) => {
    updateToggleIcon(btn, e.detail.theme);
  });
}

/**
 * Update toggle button icon
 * @param {HTMLElement} btn - Toggle button
 * @param {string} theme - Current theme
 */
function updateToggleIcon(btn, theme) {
  const sunIcon = btn.querySelector('.icon-sun');
  const moonIcon = btn.querySelector('.icon-moon');
  
  if (sunIcon && moonIcon) {
    if (theme === 'dark') {
      sunIcon.style.display = 'block';
      moonIcon.style.display = 'none';
      btn.setAttribute('aria-label', 'Switch to light mode');
    } else {
      sunIcon.style.display = 'none';
      moonIcon.style.display = 'block';
      btn.setAttribute('aria-label', 'Switch to dark mode');
    }
  }
  
  btn.setAttribute('data-theme', theme);
}

/**
 * Update meta theme-color for mobile browsers
 * @param {string} theme 
 */
function updateMetaThemeColor(theme) {
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    const color = theme === 'dark' ? '#0A0A0C' : '#F8F9FA';
    metaThemeColor.setAttribute('content', color);
  }
}

/**
 * Update charts for theme change
 * @param {string} theme 
 */
function updateChartsForTheme(theme) {
  // Dispatch event for chart components to listen
  document.querySelectorAll('[data-chart]').forEach(chart => {
    chart.dispatchEvent(new CustomEvent('chart:themechange', { 
      detail: { theme }
    }));
  });
}

/**
 * Reset to system preference
 */
export function resetToSystemPreference() {
  localStorage.removeItem(STORAGE_KEY);
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  setTheme(systemPrefersDark ? 'dark' : 'light');
}

// Auto-initialize theme on module load (for inline script usage)
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
