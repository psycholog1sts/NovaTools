import assert from 'node:assert/strict';
import fs from 'node:fs';
import { PRICING_DISCLOSURE, PRICING_MODE, PRICING_PLANS } from '../src/core/billing/pricing-config.mjs';

const html = fs.readFileSync(new URL('../pricing.html', import.meta.url), 'utf8');
const pricingScript = fs.readFileSync(new URL('../src/js/pricing-page.mjs', import.meta.url), 'utf8');
const routeBuilder = fs.readFileSync(new URL('../scripts/build-pricing-route.mjs', import.meta.url), 'utf8');
const sitemapBuilder = fs.readFileSync(new URL('../scripts/generate-localized-sitemap.mjs', import.meta.url), 'utf8');
const footer = fs.readFileSync(new URL('../src/components/global-footer.mjs', import.meta.url), 'utf8');

assert.equal(PRICING_MODE, 'interest-only');
assert.equal(PRICING_DISCLOSURE.checkoutEnabled, false);
assert.equal(PRICING_PLANS.free.displayPrice, '$0');
assert.equal(PRICING_PLANS.pro_monthly.displayPrice, '$12');
assert.equal(PRICING_PLANS.pro_annual.displayPrice, '$120');
assert.equal(PRICING_PLANS.pro_monthly.planKey, 'pro_monthly');
assert.equal(PRICING_PLANS.pro_annual.planKey, 'pro_annual');

assert.equal((html.match(/<h1\b/gi) || []).length, 1, 'Pricing page must have one H1.');
assert.match(html, /<link rel="canonical" href="https:\/\/mc-novatools\.com\/pricing\/">/);
assert.match(html, /Billing is not live yet/i);
assert.match(html, /no payment or subscription is created/i);
assert.match(html, /data-pricing-mode="interest-only"/);
assert.equal(/href=["'][^"']*(?:checkout|buy|subscribe|billing)[^"']*["']/i.test(html), false, 'Interest-only page must not expose a checkout/buy link.');
assert.equal(/"@type"\s*:\s*"(?:Offer|Product)"/i.test(html), false, 'Pricing hypotheses must not be published as purchasable Product/Offer structured data.');
assert.equal(/aggregateRating|ratingValue|ratingCount/i.test(html), false, 'Pricing page must not fabricate rating schema.');

for (const darkPattern of ['limited offer', 'only today', 'countdown', 'best value', 'guaranteed', 'buy now']) {
  assert.equal(html.toLowerCase().includes(darkPattern), false, `Pricing page must not use dark-pattern claim: ${darkPattern}`);
}
assert.match(html, /will not claim [“\"]unlimited[”\"]/i, 'The page should explicitly reject false unlimited claims.');

assert.match(pricingScript, /pro_cta_click/);
assert.match(pricingScript, /no payment or subscription was created/i);
assert.equal(pricingScript.includes('checkout_complete'), false, 'Interest interaction must not emit checkout completion.');
assert.equal(pricingScript.includes('checkout_start'), false, 'Interest interaction must not emit checkout start.');
assert.equal(routeBuilder.includes("path.join(distDir, 'pricing', 'index.html')"), true, 'Build must publish /pricing/index.html.');
assert.match(sitemapBuilder, /\['\/pricing\/',\s*'0\.7',\s*'weekly'\]/);
assert.match(footer, /href: '\/pricing\/'/);

console.log('pricing surface contract: pass');
