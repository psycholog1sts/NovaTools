/**
 * Language helpers for the finance tool runtimes.
 *
 * The pages are published as English (`<html lang="en">`) with Turkish served through the
 * i18n runtime, which sets `document.documentElement.lang` before it dispatches
 * `languageChanged`. The calculators render their own labels, results and errors, so they
 * read the same attribute instead of hard-coding one language.
 *
 * Outside a browser (the Node test suite and build scripts) there is no document; those
 * callers keep the original Turkish output so existing contracts stay valid.
 */
export function pageLanguage() {
  if (typeof document === 'undefined' || !document.documentElement) return 'tr';
  return document.documentElement.lang === 'tr' ? 'tr' : 'en';
}

export function onLanguageChange(callback) {
  if (typeof window === 'undefined') return;
  window.addEventListener('languageChanged', () => callback(pageLanguage()));
}

/** Pick the string table for the current page language. */
export function strings(table) {
  return table[pageLanguage()] || table.en;
}

/** Locale used for numbers and dates in the current page language. */
export function numberLocale() {
  return pageLanguage() === 'tr' ? 'tr-TR' : 'en-US';
}
