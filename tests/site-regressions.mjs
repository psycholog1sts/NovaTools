import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(path.join(repoRoot, relativePath), 'utf8');
const toolManifest = JSON.parse(read('tools-manifest.json'));
const certifiedRoutes = new Set(toolManifest.tools
  .filter((tool) => tool.public === true && tool.indexable === true && tool.certificationStatus === 'CERTIFIED')
  .map((tool) => `/tools${tool.path}/`));
const certifiedCategoryCounts = toolManifest.tools
  .filter((tool) => tool.public === true && tool.indexable === true && tool.certificationStatus === 'CERTIFIED')
  .reduce((counts, tool) => counts.set(tool.category, (counts.get(tool.category) || 0) + 1), new Map());

const router = read('src/core/router.mjs');
assert.match(
  router,
  /closest\('a\[data-router-link\]\[href\]'\)/,
  'The global router must intercept only explicitly opted-in SPA links.'
);
assert.doesNotMatch(
  router,
  /const currentPath = window\.location\.pathname;[\s\S]*handleRouteChange\(currentPath\)/,
  'The MPA router must not replace server-rendered public pages during initial load.'
);

const enhancer = read('src/js/tool-page-enhancer.js');
assert.match(
  enhancer,
  /const hasExistingHeading = Boolean\(document\.querySelector\('h1'\)\)/,
  'Tool enhancement must detect an existing page heading.'
);
assert.match(
  enhancer,
  /enhanceWorkspace\(tool, slug, \{ augmentContent: !hasExistingHeading \}\)/,
  'Established tool pages must not receive duplicate guide and companion content.'
);
assert.match(
  enhancer,
  /main\.querySelectorAll\('input, textarea, select, button, a'\)/,
  'Accessible-name enhancement must cover the complete tool main area.'
);

const redirects = new Set(
  read('public/_redirects')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
);
for (const rule of [
  '/disclaimer /disclaimer.html 200',
  '/categories/:page /categories/:page.html 200',
  '/blog/categories/:page /blog/categories/:page.html 200',
  '/blog/articles/:article /blog/articles/:article.html 200'
]) {
  assert.ok(redirects.has(rule), `Missing clean-route rule: ${rule}`);
}

const sitemapGenerator = read('scripts/generate-localized-sitemap.mjs');
for (const route of [
  '/cookie-policy.html',
  '/security.html',
  '/kvkk-aydinlatma-metni.html',
  '/categories/pdf-tools.html',
  '/categories/image-tools.html',
  '/categories/finance-tools.html',
  '/categories/developer-tools.html',
  '/categories/security-tools.html',
  '/categories/productivity-tools.html',
  '/categories/data-tools.html',
  '/categories/design-tools.html'
]) {
  assert.ok(sitemapGenerator.includes(`['${route}'`), `Sitemap generator is missing ${route}`);
}

const notFound = read('404.html');
assert.doesNotMatch(notFound, /href="\/finance\//, '404 shortcuts must use the /tools/finance/ namespace.');
for (const slug of ['mortgage-refinance', 'compound-interest', 'live-exchange']) {
  assert.ok(
    notFound.includes(`href="/tools/finance/${slug}/"`),
    `404 page is missing corrected finance link for ${slug}`
  );
}

const gitignore = read('.gitignore');
assert.match(gitignore, /^\.venv\/$/m, 'Local Python virtual environments must stay out of Git.');


const sourceI18n = read('src/i18n.js');
const publicI18n = read('public/i18n.js');
for (const requiredPattern of [
  /const workflowByCategory = \{/,
  /novatools:recent-tools/,
  /data-workflow-step=/,
  /data-recent-tool="true"/,
  /Finish the whole task/,
  /Bütün işi tamamlayın/,
  /qualityCopyByLanguage/,
  /turkishWorkflowLabels/
]) {
  assert.match(sourceI18n, requiredPattern, `Missing workflow-retention feature: ${requiredPattern}`);
  assert.match(publicI18n, requiredPattern, `Public i18n copy is missing workflow-retention feature: ${requiredPattern}`);
}
assert.doesNotMatch(
  sourceI18n,
  /fetch\([^)]*novatools:recent-tools|sendBeacon\([^)]*novatools:recent-tools/,
  'Recent tool history must remain browser-local.'
);
for (const workflowRoute of [
  '/tools/pdf/merge/',
  '/tools/pdf/compress/',
  '/tools/image/image-cropper/',
  '/tools/dev/json-validator/',
  '/tools/text/text-diff/',
  '/tools/design/qr-code-designer/',
  '/tools/security/password-strength/',
  '/tools/converters/unit-converter/'
]) {
  const inSitemap = read('public/sitemap.xml').includes(`https://mc-novatools.com${workflowRoute}`);
  assert.equal(
    inSitemap,
    certifiedRoutes.has(workflowRoute),
    `Workflow sitemap state must match canonical certification: ${workflowRoute}`
  );
}

const categorySitemapContract = new Map([
  ['/categories/pdf-tools.html', 'pdf'],
  ['/categories/image-tools.html', 'image'],
  ['/categories/finance-tools.html', 'finance'],
  ['/categories/developer-tools.html', 'dev'],
  ['/categories/text-writing.html', 'text'],
  ['/categories/converters.html', 'converters'],
  ['/categories/calculator-tools.html', 'calculators'],
  ['/categories/security-tools.html', 'security'],
  ['/categories/social-media-tools.html', 'social'],
  ['/categories/productivity-tools.html', 'productivity'],
  ['/categories/data-tools.html', 'data'],
  ['/categories/design-tools.html', 'design'],
  ['/tools/pdf/', 'pdf'],
  ['/tools/image/', 'image'],
  ['/tools/developer/', 'dev'],
  ['/tools/finance/', 'finance']
]);
const toolsSitemap = read('public/sitemap-tools.xml');
for (const [route, category] of categorySitemapContract) {
  const inSitemap = toolsSitemap.includes(`https://mc-novatools.com${route}`);
  assert.equal(
    inSitemap,
    (certifiedCategoryCounts.get(category) || 0) > 0,
    `Category sitemap state must match certified public inventory: ${route}`
  );
}


const homepage = read('index.html');
assert.doesNotMatch(homepage, /cdn\.mc-novatools\.com/, 'Homepage must not preconnect to an unused CDN.');
assert.doesNotMatch(homepage, /rel="prefetch" href="\/tools\/popular"/, 'Homepage must not prefetch a nonexistent popular-tools route.');
assert.match(homepage, /href="\/security\.html"[^>]*data-i18n="nav\.security"/, 'Desktop navigation must expose the security page instead of duplicating About.');
assert.match(homepage, /<input(?=[^>]*id="globalSearch")(?=[^>]*aria-label=)[^>]*>/, 'Global search must have an accessible name.');
assert.match(homepage, /class="search-close"[^>]*aria-label=/, 'Search close control must have an accessible name.');
// Device-only discovery: the homepage may only offer it if it says where the
// data lives and gives a way to clear it.
assert.match(homepage, /id="recent-tools"/, 'Homepage must offer the device-only recent tools section.');
assert.match(homepage, /id="clearRecentTools"/, 'Device-only recents must expose a clear control.');
assert.match(
  homepage,
  /Kept in this browser only\. Nothing is sent anywhere\./,
  'Device-only recents must state plainly that nothing leaves the device.'
);

const homepageMain = read('src/main.js');
for (const key of ['home.featuredCards.']) {
  assert.ok(homepageMain.includes(key), `Homepage dynamic copy must use i18n key: ${key}`);
}
// One storage schema for recents, shared by the tool pages and the homepage.
assert.match(homepageMain, /forgetRecentTools/, 'Homepage must be able to clear the stored recents.');
assert.match(
  read('src/js/tool-search.js'),
  /RECENTS_KEY = 'novatools:recent-tools'/,
  'Recents must use the single shared storage key.'
);
assert.match(
  read('public/js/record-tool-visit.js'),
  /novatools:recent-tools/,
  'Tool pages must record into the same recents key as the homepage.'
);
assert.doesNotMatch(
  sourceI18n,
  /localStorage\.setItem\('novatools_recent_tools'/,
  'Tool pages must not maintain a second recent-tool storage schema.'
);
assert.match(
  sourceI18n,
  /localStorage\.getItem\('novatools:recent-tools'/,
  'Tool pages must reuse the canonical completed-tool history.'
);


// The hero's job is to answer what this site is and let someone start, not to
// show a decorative animation. Its contract is the working control, not an image.
assert.match(
  homepage,
  /<section class="home-hero"[\s\S]*?id="homeSearchInput"[\s\S]*?<\/section>/,
  'Homepage hero must contain the tool search control itself, above the fold.'
);
assert.doesNotMatch(
  homepage,
  /home-hero__spin-logo|home-hero__visual|workflow-panel/,
  'Homepage hero must not carry a decorative brand animation or a mock product panel.'
);
assert.match(
  homepage,
  /class="home-hero__proof"[\s\S]{0,600}Limitations documented on every tool page/,
  'Homepage hero must state checkable properties rather than marketing claims.'
);
// The homepage hero and header rules moved into critical.css so they are inlined
// and cannot arrive after the first paint. These contracts are about the shipped
// styling, not about which file holds it, so they read both.
const layoutCss = `${read('src/styles/layout.css')}\n${read('src/styles/critical.css')}`;
assert.doesNotMatch(layoutCss, /@keyframes novatools-logo-spin/, 'The decorative hero spin animation must stay removed.');
assert.match(layoutCss, /\.home-search__box:focus-within/, 'The hero search control must have a visible focus treatment.');
assert.doesNotMatch(layoutCss, /rotate\(360deg\)|rotateY\(360deg\)/, 'The homepage must not run a continuous decorative rotation.');
// Motion that remains is short, transform/opacity only, and never continuous.
for (const property of ['height', 'width', 'top', 'left']) {
  assert.doesNotMatch(
    layoutCss,
    new RegExp(`transition:[^;]*\\b${property}\\b`),
    `Homepage layout must not transition ${property}; animate transform and opacity instead.`
  );
}

// Two copies of the i18n runtime ship in this repo and only one of them is
// served. They drifted once already: the first-pass announcement landed in the
// source copy while the built site ran the public one, so anything rendered
// from translations before the bundle arrived stayed in English. Assert the
// behaviour in both rather than trusting which file wins.
for (const i18nRuntime of [sourceI18n, publicI18n]) {
  assert.match(
    i18nRuntime,
    /isInitialized = true;[\s\S]{0,400}dispatchEvent\(new CustomEvent\('languageChanged'/,
    'The first translation pass must announce itself, so code that renders from translations can re-render.'
  );
}

for (const i18nRuntime of [sourceI18n, publicI18n]) {
  assert.match(
    i18nRuntime,
    /const SUPPORTED_LANGUAGES = \['en', 'tr'\];/,
    'The language selector must expose only fully quality-checked locales.'
  );
  assert.match(
    i18nRuntime,
    /querySelectorAll\('\[data-i18n-aria-label\]'\)/,
    'Accessible labels must be translated alongside visible copy.'
  );
}
for (const locale of ['en', 'tr']) {
  const bundle = JSON.parse(read(`public/locales/${locale}/translation.json`));
  for (const key of ['quickStartEyebrow', 'categoriesEyebrow']) {
    assert.ok(bundle.home?.sections?.[key], `${locale} homepage bundle is missing home.sections.${key}`);
  }
  for (const key of ['eyebrow', 'title', 'description']) {
    assert.ok(bundle.home?.featured?.[key], `${locale} homepage bundle is missing home.featured.${key}`);
  }
}

const toolEnhancer = read('src/js/tool-page-enhancer.js');
const seoRuntime = read('src/js/seo.js');
assert.match(toolEnhancer, /const ENHANCER_COPY = \{/, 'Late tool-page UI must use a shared locale copy dictionary.');
assert.match(
  toolEnhancer,
  /document\.documentElement\.lang(?:\.split\([^)]*\))?\s*===\s*['"]tr['"]/,
  'Tool-page enhancement must select Turkish copy from the active document language.'
);
assert.match(
  toolEnhancer,
  /value\.includes\(workflowSentence\)/,
  'Combined hero description text must translate the appended workflow sentence.'
);
assert.match(
  toolEnhancer,
  /value\.startsWith\('Is '\)[\s\S]*value\.slice\('Is '\.length/,
  'Turkish FAQ localization must remove the English question prefix.'
);
assert.match(
  toolEnhancer,
  /\$\{value\.length\} karakter • \$\{words\} kelime • \$\{bytes\} bayt/,
  'Text counters must render Turkish units when Turkish is active.'
);
assert.match(
  toolEnhancer,
  /if \(value\.endsWith\(' free to use\?'\)\)/,
  'Visible FAQ questions without an English prefix must still localize.'
);
assert.match(
  toolEnhancer,
  /function refreshLocalizedMetadata\(\)[\s\S]*updateMeta\(tool, slug\);[\s\S]*appendSchema\(tool, slug\);[\s\S]*appendFaqSchema\(tool, slug\);/,
  'Language changes must refresh SEO metadata and structured data.'
);
assert.match(
  toolEnhancer,
  /data-enhancer-description/,
  'Generated hero descriptions must be independently refreshable on language changes.'
);
assert.match(
  toolEnhancer,
  /Breadcrumb: 'İçerik yolu'/,
  'Generated breadcrumb accessibility labels must have Turkish copy.'
);
assert.match(
  toolEnhancer,
  /data-enhancer-category/,
  'Generated breadcrumb category labels must be refreshable on language changes.'
);
assert.match(
  toolEnhancer,
  /element\.textContent = categoryName\(element\.dataset\.enhancerCategory\)/,
  'Language changes must regenerate visible category labels.'
);
assert.match(
  seoRuntime,
  /Ücretsiz Çevrim İçi \$\{categoryName\} Aracı/,
  'Tool SEO metadata must use a Turkish title template.'
);
assert.match(
  seoRuntime,
  /Kayıt gerekmez\./,
  'Turkish SEO descriptions must avoid English signup copy.'
);
assert.match(
  toolEnhancer,
  /const questions = enhancerLanguage\(\) === 'tr'/,
  'FAQ structured data must be generated in the active language.'
);
assert.match(
  toolEnhancer,
  /name: translateEnhancerText\('Home'\)/,
  'Breadcrumb structured data must localize its home label.'
);
assert.match(
  homepageMain,
  /home\.popularToolsAriaSuffix/,
  'Homepage popular-tool groups must localize their accessible label.'
);
assert.match(homepageMain, /home\.categoryPopularTools\.\$\{tool\.key\}/, 'Homepage category shortcuts must render through stable i18n keys.');
assert.match(homepageMain, /home\.blogCards\.\$\{post\.key\}/, 'Homepage blog cards must render through stable i18n keys.');

for (const locale of ['en', 'tr']) {
  const bundle = JSON.parse(read(`public/locales/${locale}/translation.json`));
  for (const key of ['pdfMerge', 'imageCompress', 'liveExchange', 'textAnalysis', 'timezone', 'invoice']) {
    assert.ok(
      bundle.home?.categoryPopularTools?.[key],
      `${locale} homepage bundle is missing home.categoryPopularTools.${key}`
    );
  }
  for (const key of ['toolSelection', 'imageQuality', 'base64Uses']) {
    assert.ok(bundle.home?.blogCards?.[key]?.title, `${locale} homepage bundle is missing home.blogCards.${key}.title`);
    assert.ok(bundle.home?.blogCards?.[key]?.excerpt, `${locale} homepage bundle is missing home.blogCards.${key}.excerpt`);
  }
}

const packageScripts = JSON.parse(read('package.json')).scripts;
for (const qualityGate of [
  'audit:algorithm-resilience',
  'lint:performance-budget',
  'lint:critical-css',
  'lint:rss'
]) {
  assert.ok(
    packageScripts['ci:validate'].includes(qualityGate),
    `CI must enforce the quality gate: ${qualityGate}`
  );
}

console.log('Site regression checks passed.');
