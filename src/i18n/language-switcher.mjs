/**
 * Language Switcher Component
 * Zero-cookie locale switching
 */

import { detectLocale, setLocale, normalizeLocale, I18N_CONFIG } from './config.mjs';

/**
 * Create language switcher dropdown
 */
export function createLanguageSwitcher(currentLocale = detectLocale()) {
  currentLocale = normalizeLocale(currentLocale) || I18N_CONFIG.defaultLocale;
  const container = document.createElement('div');
  container.className = 'relative inline-block text-left';
  container.setAttribute('role', 'region');
  container.setAttribute('aria-label', 'Language selector');
  
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500';
  button.setAttribute('aria-expanded', 'false');
  button.setAttribute('aria-haspopup', 'true');
  button.innerHTML = `
    <span>${I18N_CONFIG.metadata[currentLocale].flag}</span>
    <span>${I18N_CONFIG.metadata[currentLocale].name}</span>
    <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
    </svg>
  `;
  
  const dropdown = document.createElement('div');
  dropdown.className = 'hidden absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-50';
  dropdown.setAttribute('role', 'menu');
  
  // Generate locale options
  I18N_CONFIG.locales.forEach(locale => {
    if (locale === currentLocale) return;
    
    const option = document.createElement('a');
    option.href = getLocaleUrl(locale);
    option.className = 'flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg';
    option.setAttribute('role', 'menuitem');
    option.innerHTML = `
      <span>${I18N_CONFIG.metadata[locale].flag}</span>
      <span>${I18N_CONFIG.metadata[locale].name}</span>
    `;
    
    option.addEventListener('click', (e) => {
      e.preventDefault();
      switchLocale(locale);
    });
    
    dropdown.appendChild(option);
  });
  
  // Toggle dropdown
  button.addEventListener('click', () => {
    const isExpanded = button.getAttribute('aria-expanded') === 'true';
    button.setAttribute('aria-expanded', !isExpanded);
    dropdown.classList.toggle('hidden');
  });
  
  // Close on outside click
  document.addEventListener('click', (e) => {
    if (!container.contains(e.target)) {
      button.setAttribute('aria-expanded', 'false');
      dropdown.classList.add('hidden');
    }
  });
  
  container.appendChild(button);
  container.appendChild(dropdown);
  
  return container;
}

/**
 * Switch to new locale
 */
function switchLocale(locale) {
  const normalizedLocale = normalizeLocale(locale) || I18N_CONFIG.defaultLocale;
  // Store preference
  setLocale(normalizedLocale);
  
  // Navigate to localized URL
  const newUrl = getLocaleUrl(normalizedLocale);
  window.location.href = newUrl;
}

/**
 * Get URL for specific locale
 */
function getLocaleUrl(locale) {
  const normalizedLocale = normalizeLocale(locale) || I18N_CONFIG.defaultLocale;
  const currentPath = window.location.pathname || '/';
  const params = new URLSearchParams(window.location.search || '');

  const firstSegment = currentPath.split('/').filter(Boolean)[0];
  const pathWithoutLocale = I18N_CONFIG.locales.includes(firstSegment)
    ? currentPath.replace(new RegExp(`^/${firstSegment}(?=/|$)`), '') || '/'
    : currentPath;
  const normalizedPath = pathWithoutLocale.startsWith('/') ? pathWithoutLocale : `/${pathWithoutLocale}`;

  params.delete('lang');
  if (normalizedLocale !== I18N_CONFIG.defaultLocale) {
    params.set('lang', normalizedLocale);
  }
  const query = params.toString();

  return `${normalizedPath}${query ? `?${query}` : ''}`;
}

/**
 * Initialize language switcher
 */
export function initLanguageSwitcher(containerId = 'language-switcher') {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  const currentLocale = detectLocale();
  const switcher = createLanguageSwitcher(currentLocale);
  
  container.appendChild(switcher);
}

export { detectLocale, setLocale, normalizeLocale } from './config.mjs';
