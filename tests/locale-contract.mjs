import assert from 'node:assert/strict';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  alternateUrls,
  canonicalUrl,
  languageSwitchUrl,
  localizedPath,
  parseLocalizedPath
} from '../src/core/i18n/locale-contract.mjs';

assert.deepEqual(SUPPORTED_LOCALES, ['en', 'tr']);
assert.equal(DEFAULT_LOCALE, 'en');
assert.deepEqual(parseLocalizedPath('/tr/tools/pdf/merge/'), {
  locale: 'tr',
  canonicalPath: '/tools/pdf/merge/'
});
assert.equal(localizedPath('/tools/pdf/merge/', 'en'), '/tools/pdf/merge/');
assert.equal(localizedPath('/tools/pdf/merge/', 'tr'), '/tr/tools/pdf/merge/');
assert.equal(canonicalUrl('/tools/pdf/merge/', 'tr'), 'https://mc-novatools.com/tr/tools/pdf/merge/');
assert.deepEqual(alternateUrls('/tools/pdf/merge/'), {
  en: 'https://mc-novatools.com/tools/pdf/merge/',
  tr: 'https://mc-novatools.com/tr/tools/pdf/merge/',
  'x-default': 'https://mc-novatools.com/tools/pdf/merge/'
});
assert.equal(
  languageSwitchUrl(new URL('https://mc-novatools.com/tools/pdf/merge/?utm_source=qa&lang=tr'), 'tr'),
  '/tr/tools/pdf/merge/?utm_source=qa'
);
console.log('Locale contract tests passed.');
