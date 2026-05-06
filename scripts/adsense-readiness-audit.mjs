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
for (const file of [...toolPages, ...globSync('src/blog/**/*.html')]) {
  const html = readFileSync(file, 'utf8');
  for (const match of html.matchAll(/<ins\b[^>]*class="[^"]*adsbygoogle[^"]*"[^>]*>/gi)) {
    const slot = /data-ad-slot="([^"]+)"/i.exec(match[0])?.[1] || '';
    if (slot && !/^\d{8,20}$/.test(slot)) {
      invalidAdSlots.push(`${file}: ${slot}`);
    }
  }
}

if (invalidAdSlots.length) {
  warnings.push(`Non-numeric AdSense slot placeholders found and will be gated: ${invalidAdSlots.slice(0, 10).join(', ')}${invalidAdSlots.length > 10 ? '…' : ''}`);
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
