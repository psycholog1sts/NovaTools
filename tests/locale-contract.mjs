import assert from 'node:assert/strict';
import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  alternateUrls,
  canonicalUrl,
  languageSwitchUrl,
  localizedPath,
  normalizeLocale,
  normalizePath,
  parseLocalizedPath
} from '../src/core/i18n/locale-contract.mjs';
import { routeSupportsLocale } from '../src/data/locale-route-manifest.mjs';

const canonicalToolPath = '/tools/pdf/merge/';
const turkishToolPath = '/tr/tools/pdf/merge/';
const canonicalToolUrl = 'https://mc-novatools.com/tools/pdf/merge/';
const turkishToolUrl = 'https://mc-novatools.com/tr/tools/pdf/merge/';
const turkishToolInputs = [
  new URL('https://mc-novatools.com/tr/tools/pdf/merge/?utm_source=qa'),
  'https://mc-novatools.com/tr/tools/pdf/merge/?utm_source=qa'
];

assert.deepEqual(SUPPORTED_LOCALES, ['en', 'tr']);
assert.equal(DEFAULT_LOCALE, 'en');
assert.equal(normalizeLocale('TR_tr'), 'tr');
assert.equal(normalizeLocale('de-DE'), 'en');
assert.equal(normalizePath('/tools/pdf/merge?utm_source=qa#details'), canonicalToolPath);
assert.equal(
  normalizePath(new URL('https://mc-novatools.com/tr/tools/pdf/merge/?utm_source=qa')),
  turkishToolPath
);

assert.deepEqual(parseLocalizedPath(turkishToolPath), {
  locale: 'tr',
  canonicalPath: canonicalToolPath
});
assert.equal(localizedPath(canonicalToolPath, 'en'), canonicalToolPath);
assert.equal(localizedPath(canonicalToolPath, 'tr'), turkishToolPath);
assert.equal(canonicalUrl(canonicalToolPath, 'tr'), turkishToolUrl);
assert.deepEqual(alternateUrls(canonicalToolPath), {
  en: canonicalToolUrl,
  tr: turkishToolUrl,
  'x-default': canonicalToolUrl
});

for (const input of turkishToolInputs) {
  assert.deepEqual(parseLocalizedPath(input), {
    locale: 'tr',
    canonicalPath: canonicalToolPath
  });
  assert.equal(localizedPath(input, 'tr'), turkishToolPath);
  assert.equal(canonicalUrl(input, 'tr'), turkishToolUrl);
  assert.deepEqual(alternateUrls(input), {
    en: canonicalToolUrl,
    tr: turkishToolUrl,
    'x-default': canonicalToolUrl
  });
  assert.equal(routeSupportsLocale(input, 'tr'), true);
}

for (const input of [
  new URL('https://mc-novatools.com/tools/pdf/merge/'),
  'https://mc-novatools.com/tools/pdf/merge/'
]) {
  assert.equal(routeSupportsLocale(input, 'tr'), true);
}

assert.equal(routeSupportsLocale('/about-us/', 'tr'), true);
assert.equal(routeSupportsLocale('/blog/articles/unapproved/', 'tr'), false);
assert.equal(routeSupportsLocale('/unlisted/', 'tr'), false);
assert.equal(routeSupportsLocale('/unlisted/', 'en'), true);
assert.equal(routeSupportsLocale('/tools/pdf/merge/', 'de'), false);

assert.equal(
  languageSwitchUrl(new URL('https://mc-novatools.com/tools/pdf/merge/?utm_source=qa&lang=tr'), 'tr'),
  '/tr/tools/pdf/merge/?utm_source=qa'
);
console.log('Locale contract tests passed.');
