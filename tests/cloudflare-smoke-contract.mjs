import assert from 'node:assert/strict';
import fs from 'node:fs';

const workflow = fs.readFileSync(new URL('../.github/workflows/deploy.yml', import.meta.url), 'utf8');
const resolver = fs.readFileSync(new URL('../scripts/resolve-cloudflare-pages-deployment.mjs', import.meta.url), 'utf8');
const smoke = fs.readFileSync(new URL('../scripts/smoke-cloudflare-pages.mjs', import.meta.url), 'utf8');
const edgeDiagnostic = fs.readFileSync(new URL('../scripts/diagnose-cloudflare-edge.mjs', import.meta.url), 'utf8');
const hostReconciler = fs.readFileSync(new URL('../scripts/reconcile-cloudflare-production-hosts.mjs', import.meta.url), 'utf8');
const redirects = fs.readFileSync(new URL('../public/_redirects', import.meta.url), 'utf8');

assert.match(workflow, /wrangler@4\.114\.0 pages deploy/);
assert.match(workflow, /--commit-hash "\$GITHUB_SHA"/);
assert.match(workflow, /node scripts\/reconcile-cloudflare-production-hosts\.mjs/);
assert.match(workflow, /CLOUDFLARE_CANONICAL_HOST: mc-novatools\.com/);
assert.match(workflow, /CLOUDFLARE_SECONDARY_HOST: www\.mc-novatools\.com/);
assert.match(workflow, /node scripts\/resolve-cloudflare-pages-deployment\.mjs/);
assert.match(workflow, /node scripts\/smoke-cloudflare-pages\.mjs/);
assert.doesNotMatch(workflow, /https:\/\/\$\{CLOUDFLARE_PROJECT_NAME\}\.pages\.dev/);

assert.match(hostReconciler, /pages\/projects\/\$\{encodeURIComponent\(projectName\)\}\/domains/);
assert.match(hostReconciler, /dns_records/);
assert.match(hostReconciler, /type: 'CNAME'/);
assert.match(hostReconciler, /proxied: true/);
assert.match(hostReconciler, /waitForActiveDomain/);
assert.match(hostReconciler, /findPagesDomainOwners/);
assert.match(hostReconciler, /foreignOwners\.length/);
assert.doesNotMatch(hostReconciler, /console\.log\([^\n]*token|console\.log\([^\n]*CLOUDFLARE_API_TOKEN/);
assert.match(redirects, /^\/src\/tools\/\* \/tools\/:splat 301$/m);

assert.match(resolver, /deployments\?env=production&per_page=25/);
assert.match(resolver, /project\.canonical_deployment/);
assert.match(resolver, /canonical\.id !== deployment\.id/);
assert.match(resolver, /assertSuccessfulProductionDeployment\(deployment/);
assert.match(resolver, /assertSuccessfulProductionDeployment\(canonical/);
assert.match(resolver, /project\.subdomain/);
assert.match(resolver, /CLOUDFLARE_PAGES_PRODUCTION_ORIGIN/);
assert.doesNotMatch(resolver, /CLOUDFLARE_DEPLOYMENT_URL/);

assert.match(smoke, /redirect: 'manual'/);
assert.match(smoke, /CLOUDFLARE_PAGES_PRODUCTION_ORIGIN/);
assert.doesNotMatch(smoke, /CLOUDFLARE_DEPLOYMENT_URL|\['immutable'/);
assert.match(smoke, /body did not match the exact \{\"status\":\"ok\"\} contract/);
assert.match(smoke, /X-Request-ID/);
assert.doesNotMatch(smoke, /Authorization|CLOUDFLARE_API_TOKEN/);

assert.match(workflow, /CUSTOM_DOMAIN_HEALTH_URL: https:\/\/mc-novatools\.com\/api\/health/);
assert.match(workflow, /node scripts\/diagnose-cloudflare-edge\.mjs/);
assert.match(edgeDiagnostic, /headers\.get\('cf-mitigated'\)/);
assert.match(edgeDiagnostic, /mitigated === 'challenge'/);
assert.match(edgeDiagnostic, /contentType\.toLowerCase\(\)\.includes\('text\/html'\)/);
assert.match(edgeDiagnostic, /firewallEventsAdaptive/);
assert.match(edgeDiagnostic, /\/bot_management/);
assert.match(edgeDiagnostic, /Cloudflare custom-domain challenge/);
assert.match(edgeDiagnostic, /Unexpected custom-domain response/);
assert.match(edgeDiagnostic, /process\.exitCode = 1/);
assert.doesNotMatch(edgeDiagnostic, /console\.log\([^\n]*CLOUDFLARE_API_TOKEN|console\.log\([^\n]*token/);

console.log('cloudflare smoke contract: pass');
