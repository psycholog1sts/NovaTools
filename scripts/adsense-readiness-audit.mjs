import { readFileSync, existsSync } from 'node:fs';
import { globSync } from 'glob';

const PUBLISHER_ID = 'ca-pub-5738022526587953';
const SELLER_ID = PUBLISHER_ID.replace(/^ca-/, '');
const SELLER_LINE = `google.com, ${SELLER_ID}, DIRECT, f08c47fec0942fa0`;
const KNOWN_EXAMPLE_SLOT_IDS = [
  '1741852963',
  '2852963074',
  '3963074185',
  '4074185296',
  '7418529630',
  '8529630741',
  '9630741852'
];

const REQUIRED_FILES = [
  'index.html',
  'about-us.html',
  'contact.html',
  'privacy-policy.html',
  'terms-of-service.html',
  'cookie-policy.html',
  'categories/index.html',
  'src/blog/index.html',
  'ads.txt',
  'public/ads.txt',
  'public/robots.txt',
  'public/sitemap.xml',
  'public/manifest.json',
  'public/_headers',
  'public/_redirects',
  'src/core/ads/adsense-config.mjs',
  'src/components/Analytics.mjs',
  'src/core/consent-manager.mjs',
  'public/consent-manager.mjs',
  'scripts/generate-localized-sitemap.mjs',
  'scripts/post-build-fix.mjs',
  'vite.config.js',
  'vercel.json'
];

// These routes are real files kept for controlled remediation, but they must
// not be indexed or monetized until their product contract is truthful.
const NON_INDEXABLE_TOOL_ROUTES = [
  {
    source: 'src/tools/news/summarizer/index.html',
    route: '/tools/news/summarizer/',
    sitemapIgnore: 'src/tools/news/summarizer/**'
  },
  {
    source: 'src/tools/religious/islamic-calendar/index.html',
    route: '/tools/religious/islamic-calendar/',
    sitemapIgnore: 'src/tools/religious/islamic-calendar/**'
  },
  {
    source: 'src/tools/social/url-shortener/index.html',
    route: '/tools/social/url-shortener/',
    sitemapIgnore: 'src/tools/social/url-shortener/**'
  }
];

const GENERIC_TOOL_COPY_PATTERNS = [
  /turn a common browser workflow into a clearer, repeatable process/i,
  /a document has to be sent, a data file needs to be checked/i,
  /upload the supported file, paste the text, or enter the numeric values/i,
  /file name, page order, dimensions, row count/i
];

const errors = [];
const warnings = [];
const read = (file) => readFileSync(file, 'utf8');

for (const file of REQUIRED_FILES) {
  if (!existsSync(file)) errors.push(`Missing production file: ${file}`);
}

const categoryPages = globSync('categories/*.html').filter((file) => file !== 'categories/index.html');
const toolPages = globSync('src/tools/**/index.html', {
  ignore: ['**/demo-*/**', '**/experimental/**', '**/test/**']
});
const blogPages = globSync('src/blog/**/*.html');
const publicHtml = [
  'index.html',
  'about-us.html',
  'contact.html',
  'privacy-policy.html',
  'terms-of-service.html',
  'cookie-policy.html',
  ...categoryPages,
  ...toolPages,
  ...blogPages
];

if (categoryPages.length < 12) errors.push(`Expected at least 12 category pages; found ${categoryPages.length}`);
if (toolPages.length < 100) warnings.push(`Expected roughly 100+ tool pages; found ${toolPages.length}`);

for (const file of ['index.html', ...categoryPages]) {
  const html = read(file);
  if (!/<link rel="canonical"/i.test(html)) errors.push(`Missing canonical tag: ${file}`);
  if (!/<meta name="robots"/i.test(html)) warnings.push(`Missing robots meta: ${file}`);
}

for (const file of ['ads.txt', 'public/ads.txt']) {
  if (!existsSync(file)) continue;
  const lines = read(file).split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.includes(SELLER_LINE)) errors.push(`${file} does not authorize ${SELLER_ID}`);
  if (lines.some((line) => /pub-(?:0{8,}|X{4,})/i.test(line))) errors.push(`${file} contains a placeholder publisher ID`);
}

const analyticsSource = existsSync('src/components/Analytics.mjs') ? read('src/components/Analytics.mjs') : '';
if (!analyticsSource.includes('name="google-adsense-account"')) {
  errors.push('Build SEO injection must include the google-adsense-account meta tag.');
}
if (!analyticsSource.includes('data-adsense="true"') || !analyticsSource.includes('adsbygoogle.js?client=')) {
  errors.push('Build SEO injection must include one canonical AdSense connection script.');
}

const adsConfig = existsSync('src/core/ads/adsense-config.mjs') ? read('src/core/ads/adsense-config.mjs') : '';
if (!/manualInventoryEnabled:\s*false/.test(adsConfig)) {
  errors.push('Manual AdSense inventory must stay disabled until verified account slot IDs are configured.');
}
if (/requestNonPersonalizedAds\s*=/.test(adsConfig)) {
  errors.push('Page code must not override the certified CMP advertising mode.');
}

for (const file of ['src/i18n.js', 'public/i18n.js']) {
  if (!existsSync(file)) continue;
  const source = read(file);
  if (source.includes('adsbygoogle.js?client=') || source.includes('ensureAdSenseBootstrap')) {
    errors.push(`${file} contains a duplicate AdSense bootstrap path`);
  }
}

for (const file of ['src/core/consent-manager.mjs', 'public/consent-manager.mjs']) {
  if (!existsSync(file)) continue;
  const source = read(file);
  if (/categories:\s*\{[\s\S]*?advertising:\s*\[/m.test(source)) {
    errors.push(`${file} must not present the site cookie UI as a Google-certified advertising CMP`);
  }
  if (!source.includes('separate certified consent message') && !source.includes('sertifikalı bir onay mesajı')) {
    warnings.push(`${file} should explain the separate Google-certified advertising consent message`);
  }
}

const headersSource = existsSync('public/_headers') ? read('public/_headers') : '';
const redirectsSource = existsSync('public/_redirects') ? read('public/_redirects') : '';
const sitemapGenerator = existsSync('scripts/generate-localized-sitemap.mjs') ? read('scripts/generate-localized-sitemap.mjs') : '';

for (const entry of NON_INDEXABLE_TOOL_ROUTES) {
  const headerRoute = `${entry.route}*`;
  const headerPosition = headersSource.indexOf(headerRoute);
  const robotsPosition = headerPosition >= 0 ? headersSource.indexOf('X-Robots-Tag: noindex, nofollow, noarchive', headerPosition) : -1;
  if (headerPosition < 0 || robotsPosition < 0 || robotsPosition - headerPosition > 180) {
    errors.push(`Non-indexable route lacks a nearby X-Robots-Tag rule: ${entry.route}`);
  }
  if (!sitemapGenerator.includes(entry.sitemapIgnore)) {
    errors.push(`Sitemap generator does not exclude non-indexable tool: ${entry.source}`);
  }
  if (!adsConfig.includes(entry.route)) {
    errors.push(`AdSense bootstrap does not block non-monetizable route: ${entry.route}`);
  }
}

if (!redirectsSource.includes('/tools/request /request-tool.html 301') ||
    !redirectsSource.includes('/tools/request/ /request-tool.html 301')) {
  errors.push('Legacy /tools/request route must redirect to the honest /request-tool.html workflow.');
}
if (!sitemapGenerator.includes('src/tools/request/**')) {
  errors.push('Legacy /tools/request source must stay excluded from sitemap generation.');
}

const nonIndexableSources = new Set([
  ...NON_INDEXABLE_TOOL_ROUTES.map((entry) => entry.source),
  'src/tools/request/index.html'
]);
const placeholderPattern = /\[(AUTHOR|FOUNDER|BUSINESS_ADDRESS|CONTACT_EMAIL|FORM_ENDPOINT|PHONE_NUMBER|LINKEDIN|TWITTER|GITHUB|LAST_UPDATED|PAGE_LAST_UPDATED|FOUNDING_YEAR|FOUNDER_PHOTO)[A-Z_]*\]/;
const publicPlaceholders = [];
const duplicateH1 = [];
const genericBoilerplateTools = [];

for (const file of publicHtml) {
  if (!existsSync(file)) continue;
  const html = read(file);
  if (placeholderPattern.test(html)) publicPlaceholders.push(file);
  // Strip <script> blocks before counting <h1>: markup built inside a script
  // for a separate document/preview is not automatically part of this page DOM.
  const htmlWithoutScripts = html.replace(/<script\b[\s\S]*?<\/script>/gi, ' ');
  const h1Count = (htmlWithoutScripts.match(/<h1\b/gi) || []).length;
  if (h1Count > 1) duplicateH1.push(`${file} (${h1Count})`);

  if (toolPages.includes(file) && !nonIndexableSources.has(file)) {
    const matchedPatterns = GENERIC_TOOL_COPY_PATTERNS.filter((pattern) => pattern.test(htmlWithoutScripts));
    if (matchedPatterns.length) genericBoilerplateTools.push(file);
  }
}

if (publicPlaceholders.length) {
  errors.push(`Unresolved public E-E-A-T/contact placeholders: ${publicPlaceholders.slice(0, 12).join(', ')}${publicPlaceholders.length > 12 ? '…' : ''}`);
}
if (duplicateH1.length) errors.push(`Static pages with duplicate H1: ${duplicateH1.slice(0, 12).join(', ')}`);
if (genericBoilerplateTools.length) {
  errors.push(`Indexable tools still contain generic cross-tool boilerplate: ${genericBoilerplateTools.slice(0, 12).join(', ')}${genericBoilerplateTools.length > 12 ? '…' : ''}`);
}

const sourceFiles = globSync(['src/**/*.{html,js,mjs}', 'categories/**/*.html', 'docs/**/*.html']);
for (const file of sourceFiles) {
  const source = read(file);
  for (const slotId of KNOWN_EXAMPLE_SLOT_IDS) {
    if (source.includes(slotId)) errors.push(`Example/fabricated AdSense slot ID ${slotId} found in ${file}`);
  }
}

const adExperienceRisks = [];
for (const file of ['src/components/ads/AdSlot.mjs', 'src/core/ads/adsense-config.mjs', 'src/i18n.js', 'public/i18n.js']) {
  if (!existsSync(file)) continue;
  const source = read(file);
  if (/position:\s*fixed[\s\S]{0,400}(ad-mobile-anchor|data-ad-format['"]?\s*,?\s*['"]sticky)/i.test(source)) {
    adExperienceRisks.push(`${file}: custom mobile sticky ad placement`);
  }
}
if (adExperienceRisks.length) errors.push(`Potential Better Ads mobile sticky placement risk: ${adExperienceRisks.join(', ')}`);

const vercel = read('vercel.json');
for (const header of ['Strict-Transport-Security', 'X-Content-Type-Options', 'Referrer-Policy', 'Permissions-Policy']) {
  if (!vercel.includes(header)) errors.push(`Missing security header in vercel.json: ${header}`);
}

console.log(`Production surface: ${categoryPages.length} category pages, ${toolPages.length} tool pages, ${blogPages.length} blog HTML files.`);
if (warnings.length) {
  console.warn('\nWarnings:');
  for (const warning of warnings) console.warn(`- ${warning}`);
}
if (errors.length) {
  console.error('\nErrors:');
  for (const error of [...new Set(errors)]) console.error(`- ${error}`);
  process.exit(1);
}
console.log('AdSense readiness audit passed.');
