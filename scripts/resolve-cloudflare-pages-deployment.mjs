import fs from 'node:fs';

const API_BASE = 'https://api.cloudflare.com/client/v4';
const MAX_ATTEMPTS = 8;
const RETRY_DELAY_MS = 3000;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function normalizeHttpsUrl(value, label) {
  const raw = value?.trim();
  if (!raw) throw new Error(`Cloudflare did not return ${label}.`);
  const candidate = raw.includes('://') ? raw : `https://${raw}`;
  const url = new URL(candidate);
  if (url.protocol !== 'https:' || !url.hostname) throw new Error(`Cloudflare returned an invalid ${label}.`);
  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function commitMatches(actual, expected) {
  if (typeof actual !== 'string' || !actual) return false;
  return actual === expected || actual.startsWith(expected) || expected.startsWith(actual);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function cloudflareGet(path, token) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' }
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    const codes = Array.isArray(payload?.errors)
      ? payload.errors.map((error) => error?.code).filter(Boolean).join(', ')
      : '';
    throw new Error(`Cloudflare API request failed with HTTP ${response.status}${codes ? ` (Cloudflare error code(s): ${codes})` : ''}.`);
  }
  return payload.result;
}

function writeGitHubEnv(entries) {
  const envFile = process.env.GITHUB_ENV;
  if (!envFile) throw new Error('GITHUB_ENV is unavailable; refusing to continue without a durable workflow handoff.');
  fs.appendFileSync(envFile, `${Object.entries(entries).map(([key, value]) => `${key}=${value}`).join('\n')}\n`, 'utf8');
}

function safeDeploymentSummary(value) {
  if (!value) return null;
  return {
    id: value.id || null,
    environment: value.environment || null,
    latest_stage: value.latest_stage
      ? { name: value.latest_stage.name || null, status: value.latest_stage.status || null }
      : null,
    uses_functions: value.uses_functions ?? null,
    branch: value.deployment_trigger?.metadata?.branch || null,
    commit_hash: value.deployment_trigger?.metadata?.commit_hash || null
  };
}

function assertSuccessfulProductionDeployment(value, commitSha, expectedBranch, label) {
  if (!value?.id) throw new Error(`${label} is missing.`);
  if (value.environment !== 'production') throw new Error(`${label} is not a production deployment.`);
  if (value.latest_stage?.status && value.latest_stage.status !== 'success') {
    throw new Error(`${label} deploy stage is ${value.latest_stage.status}, expected success.`);
  }
  const metadata = value.deployment_trigger?.metadata;
  if (!commitMatches(metadata?.commit_hash, commitSha)) throw new Error(`${label} commit does not match ${commitSha}.`);
  if (metadata?.branch && metadata.branch !== expectedBranch) {
    throw new Error(`${label} branch is ${metadata.branch}, expected ${expectedBranch}.`);
  }
}

const token = requiredEnv('CLOUDFLARE_API_TOKEN');
const accountId = requiredEnv('CLOUDFLARE_ACCOUNT_ID');
const projectName = requiredEnv('CLOUDFLARE_PROJECT_NAME');
const commitSha = requiredEnv('GITHUB_SHA');
const expectedBranch = process.env.GITHUB_REF_NAME?.trim() || 'main';
const account = encodeURIComponent(accountId);
const projectPath = `/accounts/${account}/pages/projects/${encodeURIComponent(projectName)}`;

let project = await cloudflareGet(projectPath, token);
if (project.production_branch && project.production_branch !== expectedBranch) {
  throw new Error(`Cloudflare production branch mismatch: expected ${expectedBranch}, got ${project.production_branch}.`);
}

const productionOrigin = normalizeHttpsUrl(project.subdomain, 'Pages project subdomain');
let deployment = null;
let canonical = null;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const deployments = await cloudflareGet(`${projectPath}/deployments?env=production&per_page=25`, token);
  deployment = deployments.find((candidate) => {
    const metadata = candidate?.deployment_trigger?.metadata;
    return candidate?.environment === 'production' && commitMatches(metadata?.commit_hash, commitSha) && (!metadata?.branch || metadata.branch === expectedBranch);
  });

  project = await cloudflareGet(projectPath, token);
  canonical = project.canonical_deployment || null;
  if (deployment?.id && canonical?.id === deployment.id) break;
  if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
}

if (!deployment) throw new Error(`No production Pages deployment was found for commit ${commitSha}.`);
assertSuccessfulProductionDeployment(deployment, commitSha, expectedBranch, 'Matched production deployment');
assertSuccessfulProductionDeployment(canonical, commitSha, expectedBranch, 'Canonical production deployment');
if (canonical.id !== deployment.id) {
  throw new Error(`Cloudflare canonical deployment ${canonical.id} does not match newly deployed production ${deployment.id}.`);
}

console.log(`::notice title=Cloudflare Pages production identity::${JSON.stringify({
  project: { name: project.name || projectName, subdomain: project.subdomain || null, production_branch: project.production_branch || null },
  matched_deployment: safeDeploymentSummary(deployment),
  canonical_deployment: safeDeploymentSummary(canonical)
})}`);

writeGitHubEnv({
  CLOUDFLARE_PAGES_PRODUCTION_ORIGIN: productionOrigin,
  CLOUDFLARE_DEPLOYMENT_ID: deployment.id
});

console.log(`Verified Cloudflare Pages canonical production deployment ${deployment.id} for ${commitSha}.`);
console.log(`Canonical Pages production origin: ${productionOrigin}`);
