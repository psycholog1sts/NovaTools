import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(path.join(repoRoot, relativePath), 'utf8');

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
  assert.ok(
    read('public/sitemap.xml').includes(`https://mc-novatools.com${workflowRoute}`),
    `Workflow route is missing from the sitemap: ${workflowRoute}`
  );
}


const homepage = read('index.html');
assert.doesNotMatch(homepage, /cdn\.mc-novatools\.com/, 'Homepage must not preconnect to an unused CDN.');
assert.doesNotMatch(homepage, /rel="prefetch" href="\/tools\/popular"/, 'Homepage must not prefetch a nonexistent popular-tools route.');
assert.match(homepage, /href="\/security\.html"[^>]*data-i18n="nav\.security"/, 'Desktop navigation must expose the security page instead of duplicating About.');
assert.match(homepage, /<input(?=[^>]*id="globalSearch")(?=[^>]*aria-label=)[^>]*>/, 'Global search must have an accessible name.');
assert.match(homepage, /class="search-close"[^>]*aria-label=/, 'Search close control must have an accessible name.');
assert.match(homepage, /home\.privateStarter\.title/, 'Device-only discovery must be labeled honestly and localized.');

const homepageMain = read('src/main.js');
for (const key of [
  'home.toolLabels.',
  'home.featuredCards.',
  'home.privateStarter.localUse',
  'home.privateStarter.starterTool'
]) {
  assert.ok(homepageMain.includes(key), `Homepage dynamic copy must use i18n key: ${key}`);
}
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


assert.match(
  homepage,
  /home-hero__spin-logo[\s\S]*logo-brand-260\.png/,
  'Homepage hero must include the transparent PNG brand mark.'
);
const layoutCss = read('src/styles/layout.css');
assert.match(layoutCss, /@keyframes novatools-logo-spin/, 'Homepage brand mark must have a 3D spin animation.');
assert.match(layoutCss, /rotateY\(360deg\)/, 'Homepage brand animation must rotate sideways around its vertical axis.');
assert.match(layoutCss, /perspective:\s*700px/, 'Homepage logo stage must provide 3D perspective.');
assert.match(layoutCss, /transform-style:\s*preserve-3d/, 'Homepage brand animation must preserve its 3D transform context.');
assert.doesNotMatch(layoutCss, /rotate\(360deg\)/, 'Homepage brand mark must not use the dizzying flat wheel rotation.');
assert.match(
  layoutCss,
  /@media \(prefers-reduced-motion: reduce\)[\s\S]*home-hero__spin-logo/,
  'Homepage brand animation must respect reduced-motion preferences.'
);

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
  for (const key of ['eyebrow', 'title', 'description', 'noscript']) {
    assert.ok(bundle.home?.privateStarter?.[key], `${locale} homepage bundle is missing home.privateStarter.${key}`);
  }
  for (const key of ['eyebrow', 'title', 'description']) {
    assert.ok(bundle.home?.featured?.[key], `${locale} homepage bundle is missing home.featured.${key}`);
  }
}

const toolEnhancer = read('src/js/tool-page-enhancer.js');
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
