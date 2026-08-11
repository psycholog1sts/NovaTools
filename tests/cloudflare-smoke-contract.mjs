import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
const resolver = fs.readFileSync(
  new URL('../scripts/resolve-cloudflare-pages-deployment.mjs', import.meta.url),
  'utf8'
);
const smoke = fs.readFileSync(new URL('../scripts/smoke-cloudflare-pages.mjs', import.meta.url), 'utf8');

assert.match(workflow, /wrangler@4\.114\.0 pages deploy/);
assert.match(workflow, /--commit-hash "\$GITHUB_SHA"/);
assert.match(workflow, /node scripts\/resolve-cloudflare-pages-deployment\.mjs/);
assert.match(workflow, /node scripts\/smoke-cloudflare-pages\.mjs/);
assert.doesNotMatch(
  workflow,
  /https:\/\/\$\{CLOUDFLARE_PROJECT_NAME\}\.pages\.dev/,
  'Pages smoke must use Cloudflare API metadata instead of assuming the project hostname.'
);

assert.match(resolver, /\/pages\/projects\/\$\{encodedProject\}/);
assert.match(resolver, /deployments\?env=production&per_page=25/);
assert.match(resolver, /deployment_trigger\?\.metadata/);
assert.match(resolver, /project\.subdomain/);
assert.match(resolver, /deployment\.url/);
assert.match(resolver, /CLOUDFLARE_DEPLOYMENT_URL/);
assert.match(resolver, /CLOUDFLARE_PAGES_PRODUCTION_ORIGIN/);

assert.match(smoke, /redirect: 'manual'/);
assert.match(smoke, /CLOUDFLARE_DEPLOYMENT_URL/);
assert.match(smoke, /CLOUDFLARE_PAGES_PRODUCTION_ORIGIN/);
assert.match(smoke, /\['immutable'/);
assert.match(smoke, /\['canonical'/);
assert.match(smoke, /Cloudflare \$\{label\} origin smoke/);
assert.match(smoke, /body did not match the exact \{\"status\":\"ok\"\} contract/);
assert.match(smoke, /X-Request-ID/);
assert.doesNotMatch(smoke, /Authorization|CLOUDFLARE_API_TOKEN/);

assert.match(workflow, /https:\/\/mc-novatools\.com\/api\/health/);
assert.match(workflow, /cf-mitigated: challenge/);
assert.match(workflow, /Cloudflare custom-domain WAF challenge/);
assert.match(workflow, /Unexpected custom-domain health response/);
assert.doesNotMatch(
  workflow,
  /curl[^\n]*mc-novatools\.com[^\n]*--fail-with-body/,
  'Custom-domain WAF diagnostics must distinguish Managed Challenge from application failure.'
);

console.log('cloudflare smoke contract: pass');
