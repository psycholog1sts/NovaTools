import { readFileSync, existsSync } from 'node:fs';
import { globSync } from 'glob';

const REQUIRED_FILES = [
  'index.html',
  'categories/index.html',
  'src/blog/index.html',
  'public/i18n.js',
  'public/robots.txt',
  'public/sitemap.xml',
  'public/manifest.json',
  'src/core/ads/adsense-config.mjs',
  'scripts/post-build-fix.mjs',
  'vite.config.js',
  'vercel.json'
];

const errors = [];
const warnings = [];

for (const file of REQUIRED_FILES) {
  if (!existsSync(file)) {
    errors.push(`Missing production file: ${file}`);
  }
}

const categoryPages = globSync('categories/*.html').filter((file) => file !== 'categories/index.html');
const toolPages = globSync('src/tools/**/index.html', {
  ignore: ['**/demo-*/**', '**/experimental/**', '**/test/**']
});

if (categoryPages.length < 12) {
  errors.push(`Expected at least 12 category pages; found ${categoryPages.length}`);
}

if (toolPages.length < 100) {
  warnings.push(`Expected roughly 100+ tool pages; found ${toolPages.length}`);
}

for (const file of ['index.html', ...categoryPages]) {
  const html = readFileSync(file, 'utf8');
  if (!/<link rel="canonical"/i.test(html)) {
    errors.push(`Missing canonical tag: ${file}`);
  }
  if (!/<meta name="robots"/i.test(html)) {
    warnings.push(`Missing robots meta: ${file}`);
  }
}

const invalidAdSlots = [];
const adExperienceRisks = [];
const publicPlaceholders = [];
const placeholderPattern = /\[(AUTHOR|FOUNDER|BUSINESS_ADDRESS|CONTACT_EMAIL|FORM_ENDPOINT|PHONE_NUMBER|LINKEDIN|TWITTER|GITHUB|LAST_UPDATED|PAGE_LAST_UPDATED|FOUNDING_YEAR|FOUNDER_PHOTO)[A-Z_]*\]/;
for (const file of [...toolPages, ...globSync('src/blog/**/*.html')]) {
  const html = readFileSync(file, 'utf8');
  if (placeholderPattern.test(html)) {
    publicPlaceholders.push(file);
  }
  for (const match of html.matchAll(/<ins\b[^>]*class="[^"]*adsbygoogle[^"]*"[^>]*>/gi)) {
    const slot = /data-ad-slot="([^"]+)"/i.exec(match[0])?.[1] || '';
    if (slot && !/^\d{8,20}$/.test(slot)) {
      invalidAdSlots.push(`${file}: ${slot}`);
    }
  }
}

for (const file of ['public/about.html', 'public/contact.html', 'public/privacy-policy.html', 'public/cookie-policy.html']) {
  if (existsSync(file) && placeholderPattern.test(readFileSync(file, 'utf8'))) {
    publicPlaceholders.push(file);
  }
}

for (const file of ['src/components/ads/AdSlot.mjs', 'src/core/ads/adsense-config.mjs', 'src/i18n.js', 'public/i18n.js']) {
  if (!existsSync(file)) continue;
  const source = readFileSync(file, 'utf8');
  if (/position:\s*fixed[\s\S]{0,400}(ad-mobile-anchor|data-ad-format['"]?\s*,?\s*['"]sticky)/i.test(source)) {
    adExperienceRisks.push(`${file}: custom mobile sticky ad placement`);
  }
}

if (invalidAdSlots.length) {
  warnings.push(`Non-numeric AdSense slot placeholders found and will be gated: ${invalidAdSlots.slice(0, 10).join(', ')}${invalidAdSlots.length > 10 ? '…' : ''}`);
}

if (publicPlaceholders.length) {
  errors.push(`Unresolved public E-E-A-T/contact placeholders found: ${publicPlaceholders.slice(0, 12).join(', ')}${publicPlaceholders.length > 12 ? '…' : ''}`);
}

if (adExperienceRisks.length) {
  errors.push(`Potential Better Ads mobile sticky placement risk found: ${adExperienceRisks.join(', ')}`);
}

const publicI18n = readFileSync('public/i18n.js', 'utf8');
if (!/hasValidAdSlot/.test(publicI18n) || !/mc-novatools/.test(publicI18n)) {
  errors.push('public/i18n.js must gate AdSense bootstrap by production host and valid slot IDs.');
}

const vercel = readFileSync('vercel.json', 'utf8');
for (const header of ['Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) {
  if (!vercel.includes(header)) {
    errors.push(`Missing security header in vercel.json: ${header}`);
  }
}

console.log(`Production surface: ${categoryPages.length} category pages, ${toolPages.length} tool pages.`);
if (warnings.length) {
  console.warn('\nWarnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (errors.length) {
  console.error('\nErrors:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('AdSense readiness audit passed.');
