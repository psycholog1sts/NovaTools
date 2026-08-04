#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { globSync } from 'glob';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const i18nDir = path.join(rootDir, 'src', 'i18n');
const locales = ['en', 'tr'];
const namespaces = ['common', 'home', 'categories', 'tools', 'blog', 'legal'];
const requiredTopLevel = new Map(namespaces.map((namespace) => [namespace, namespace]));
let failures = 0;

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    failures += 1;
    console.error(`❌ ${path.relative(rootDir, file)} is not valid JSON: ${error.message}`);
    return null;
  }
}

function flattenKeys(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => flattenKeys(item, `${prefix}[${index}]`));
  }
  if (value && typeof value === 'object') {
    return Object.keys(value).flatMap((key) => flattenKeys(value[key], prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    failures += 1;
    console.error(`❌ ${label} must be an object.`);
    return false;
  }
  return true;
}

function validateNamespaceShape(namespace, locale, data) {
  const label = `${locale}/${namespace}.json`;
  if (!assertObject(data, label)) return;
  const top = requiredTopLevel.get(namespace);
  if (!Object.prototype.hasOwnProperty.call(data, top)) {
    failures += 1;
    console.error(`❌ ${label} must contain top-level key "${top}".`);
    return;
  }

  if (namespace === 'categories') {
    for (const [slug, category] of Object.entries(data.categories)) {
      for (const field of ['name', 'description', 'targetAudience', 'commonTasks', 'decisionTable', 'faq', 'relatedArticles']) {
        if (!Object.prototype.hasOwnProperty.call(category, field)) {
          failures += 1;
          console.error(`❌ ${label}: categories.${slug}.${field} is missing.`);
        }
      }
    }
  }

  if (namespace === 'tools') {
    for (const [slug, tool] of Object.entries(data.tools)) {
      for (const field of ['name', 'description', 'steps', 'advantages', 'limitations', 'errors', 'scenarios', 'privacyNote', 'ctaText', 'successMessage', 'errorMessage']) {
        if (!Object.prototype.hasOwnProperty.call(tool, field)) {
          failures += 1;
          console.error(`❌ ${label}: tools.${slug}.${field} is missing.`);
        }
      }
    }
  }
}

for (const namespace of namespaces) {
  const referenceFile = path.join(i18nDir, 'en', `${namespace}.json`);
  const reference = readJson(referenceFile);
  if (!reference) continue;
  validateNamespaceShape(namespace, 'en', reference);
  const referenceKeys = new Set(flattenKeys(reference));

  for (const locale of locales.filter((item) => item !== 'en')) {
    const file = path.join(i18nDir, locale, `${namespace}.json`);
    const data = readJson(file);
    if (!data) continue;
    validateNamespaceShape(namespace, locale, data);
    const localeKeys = new Set(flattenKeys(data));

    for (const key of referenceKeys) {
      if (!localeKeys.has(key)) {
        failures += 1;
        console.error(`❌ ${path.relative(rootDir, file)} is missing key: ${key}`);
      }
    }

    for (const key of localeKeys) {
      if (!referenceKeys.has(key)) {
        failures += 1;
        console.error(`❌ ${path.relative(rootDir, file)} has extra key not present in en: ${key}`);
      }
    }
  }
}

const publicLocalesDir = path.join(rootDir, 'public', 'locales');
const publicBundles = new Map(
  locales.map((locale) => [
    locale,
    readJson(path.join(publicLocalesDir, locale, 'translation.json'))
  ])
);
const referencedKeys = new Map();
const attributePattern = /data-i18n(?:-placeholder|-title|-html|-aria-label|-document-title)?=["']([^"']+)["']/g;
const htmlFiles = globSync('**/*.html', {
  cwd: rootDir,
  ignore: ['dist/**', 'node_modules/**', '.venv/**', 'coverage/**']
});

for (const relativeFile of htmlFiles) {
  const source = fs.readFileSync(path.join(rootDir, relativeFile), 'utf8');
  for (const match of source.matchAll(attributePattern)) {
    const key = match[1].trim();
    if (!key) continue;
    if (!referencedKeys.has(key)) referencedKeys.set(key, []);
    referencedKeys.get(key).push(relativeFile);
  }
}

for (const [locale, data] of publicBundles) {
  if (!data) continue;
  const flat = new Map(flattenKeys(data).map((key) => [key, key.split('.').reduce((node, part) => node?.[part], data)]));
  for (const [key, files] of referencedKeys) {
    if (!flat.has(key)) {
      failures += 1;
      console.error(`❌ public/locales/${locale}/translation.json is missing page key "${key}" used by ${[...new Set(files)].slice(0, 3).join(', ')}`);
      continue;
    }
    const value = flat.get(key);
    if (typeof value !== 'string' || value.trim() === '' || value.trim() === key) {
      failures += 1;
      console.error(`❌ public/locales/${locale}/translation.json has an unusable value for "${key}".`);
    }
  }
}

if (failures > 0) {
  console.error(`\n${failures} i18n validation issue(s) found.`);
  process.exit(1);
}

console.log(`✅ i18n JSON and ${referencedKeys.size} page-level translation keys passed for en and tr.`);
