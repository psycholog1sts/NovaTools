import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');

assert.match(workflow, /wrangler@4\.114\.0 pages deploy/);
assert.match(workflow, /https:\/\/\$\{CLOUDFLARE_PROJECT_NAME\}\.pages\.dev/);
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
