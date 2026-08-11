import fs from 'node:fs';

const API_BASE = 'https://api.cloudflare.com/client/v4';
const MAX_ATTEMPTS = 8;
const RETRY_DELAY_MS = 3000;

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function normalizeHttpsUrl(value, label) {
  const raw = value?.trim();
  if (!raw) {
    throw new Error(`Cloudflare did not return ${label}.`);
  }

  const candidate = raw.includes('://') ? raw : `https://${raw}`;
  const url = new URL(candidate);
  if (url.protocol !== 'https:' || !url.hostname) {
    throw new Error(`Cloudflare returned an invalid ${label}.`);
  }

  url.pathname = '/';
  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/$/, '');
}

function commitMatches(actual, expected) {
  if (typeof actual !== 'string' || !actual) return false;
  return actual === expected || actual.startsWith(expected) || expected.startsWith(actual);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function cloudflareGet(path, token) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json'
    }
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    const codes = Array.isArray(payload?.errors)
      ? payload.errors.map((error) => error?.code).filter(Boolean).join(', ')
      : '';
    const suffix = codes ? ` (Cloudflare error code(s): ${codes})` : '';
    throw new Error(`Cloudflare API request failed with HTTP ${response.status}${suffix}.`);
  }

  return payload.result;
}

function writeGitHubEnv(entries) {
  const envFile = process.env.GITHUB_ENV;
  if (!envFile) {
    throw new Error('GITHUB_ENV is unavailable; refusing to continue without a durable workflow handoff.');
  }

  const body = Object.entries(entries)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  fs.appendFileSync(envFile, `${body}\n`, 'utf8');
}

const token = requiredEnv('CLOUDFLARE_API_TOKEN');
const accountId = requiredEnv('CLOUDFLARE_ACCOUNT_ID');
const projectName = requiredEnv('CLOUDFLARE_PROJECT_NAME');
const commitSha = requiredEnv('GITHUB_SHA');
const expectedBranch = process.env.GITHUB_REF_NAME?.trim() || 'main';
const encodedProject = encodeURIComponent(projectName);

const project = await cloudflareGet(
  `/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodedProject}`,
  token
);

if (project.production_branch && project.production_branch !== expectedBranch) {
  throw new Error(
    `Cloudflare production branch mismatch: expected ${expectedBranch}, got ${project.production_branch}.`
  );
}

const productionOrigin = normalizeHttpsUrl(project.subdomain, 'Pages project subdomain');
let deployment = null;

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
  const deployments = await cloudflareGet(
    `/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodedProject}/deployments?env=production&per_page=25`,
    token
  );

  deployment = deployments.find((candidate) => {
    const metadata = candidate?.deployment_trigger?.metadata;
    return (
      candidate?.environment === 'production' &&
      commitMatches(metadata?.commit_hash, commitSha) &&
      (!metadata?.branch || metadata.branch === expectedBranch)
    );
  });

  if (deployment) break;
  if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS);
}

if (!deployment) {
  throw new Error(`No production Pages deployment was found for commit ${commitSha}.`);
}

const deploymentUrl = normalizeHttpsUrl(deployment.url, 'deployment URL');

writeGitHubEnv({
  CLOUDFLARE_DEPLOYMENT_URL: deploymentUrl,
  CLOUDFLARE_PAGES_PRODUCTION_ORIGIN: productionOrigin,
  CLOUDFLARE_DEPLOYMENT_ID: deployment.id
});

console.log(`Resolved Cloudflare Pages production deployment ${deployment.id}.`);
console.log(`Immutable deployment URL: ${deploymentUrl}`);
console.log(`Canonical Pages origin: ${productionOrigin}`);
