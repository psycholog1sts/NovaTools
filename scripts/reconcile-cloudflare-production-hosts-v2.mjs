const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const projectName = process.env.CLOUDFLARE_PROJECT_NAME;
const canonicalHost = (process.env.CLOUDFLARE_CANONICAL_HOST || 'mc-novatools.com').trim().toLowerCase();
const secondaryHost = (process.env.CLOUDFLARE_SECONDARY_HOST || `www.${canonicalHost}`).trim().toLowerCase();
const apiBase = 'https://api.cloudflare.com/client/v4';
const pollTimeoutMs = Number(process.env.CLOUDFLARE_DOMAIN_POLL_TIMEOUT_MS || 120000);
let stage = 'initialization';

function annotation(level, title, message) {
  const escaped = String(message).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  console.log(`::${level} title=${title}::${escaped}`);
}

function requireEnv(name, value) {
  if (!value) throw new Error(`${name} is required`);
}

function apiError(payload, fallback) {
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];
  return errors.length
    ? errors.map((entry) => `${entry?.code ?? 'unknown'}:${entry?.message ?? 'Cloudflare API error'}`).join(', ')
    : fallback;
}

async function cf(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  let payload = null;
  try { payload = await response.json(); } catch {}
  if (!response.ok || payload?.success === false) throw new Error(apiError(payload, `HTTP ${response.status}`));
  return payload;
}

async function getProject() {
  const payload = await cf(`/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}`);
  const project = payload?.result;
  if (!project?.subdomain) throw new Error('Pages project did not return subdomain');
  if (project.production_branch && project.production_branch !== 'main') {
    throw new Error(`production branch is ${project.production_branch}, expected main`);
  }
  return project;
}

async function getDomain(hostname) {
  try {
    const payload = await cf(`/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/domains/${encodeURIComponent(hostname)}`);
    return payload?.result || null;
  } catch (error) {
    if (/8000007|8000021|not found|does not exist|HTTP 404/i.test(error.message)) return null;
    throw error;
  }
}

async function ensureDomain(hostname) {
  let domain = await getDomain(hostname);
  if (domain) return domain;
  await cf(`/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: hostname }),
  });
  domain = await getDomain(hostname);
  if (!domain) throw new Error(`${hostname} was not returned after Pages domain attach`);
  return domain;
}

function resolveZoneTag(...domains) {
  const tags = [...new Set(domains.map((domain) => String(domain?.zone_tag || '').trim()).filter(Boolean))];
  if (tags.length !== 1) throw new Error(`expected one Pages zone_tag, found ${tags.length}`);
  return tags[0];
}

async function getExactDnsRecords(zoneId, hostname) {
  const query = new URLSearchParams({ name: hostname, per_page: '100' });
  const payload = await cf(`/zones/${encodeURIComponent(zoneId)}/dns_records?${query.toString()}`);
  return Array.isArray(payload?.result) ? payload.result : [];
}

async function reconcileSecondaryCname(zoneId, hostname, target) {
  const records = await getExactDnsRecords(zoneId, hostname);
  const address = records.filter((record) => ['A', 'AAAA', 'CNAME'].includes(record?.type));
  const ns = records.filter((record) => record?.type === 'NS');
  if (ns.length) throw new Error(`${hostname} has NS delegation; refusing automatic rewrite`);
  if (address.length !== 1 || address[0]?.type !== 'CNAME') {
    throw new Error(`${hostname} must have exactly one CNAME for safe reconciliation; found ${address.map((r) => r.type).join(',') || 'none'}`);
  }
  const record = address[0];
  const current = String(record.content || '').replace(/\.$/, '').toLowerCase();
  const expected = String(target).replace(/\.$/, '').toLowerCase();
  if (current === expected && record.proxied === true) return;
  await cf(`/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(record.id)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      type: 'CNAME',
      name: hostname,
      content: target,
      proxied: true,
      ttl: 1,
      comment: record.comment || 'Managed by NovaTools production host reconciliation',
    }),
  });
}

function summary(domain) {
  return {
    name: domain?.name || null,
    status: domain?.status || null,
    validation_status: domain?.validation_data?.status || null,
    validation_error: domain?.validation_data?.error_message || null,
  };
}

async function waitActive(hostname) {
  const deadline = Date.now() + pollTimeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await getDomain(hostname);
    if (last?.status === 'active') return last;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`${hostname} did not become active: ${JSON.stringify(summary(last))}`);
}

async function main() {
  requireEnv('CLOUDFLARE_API_TOKEN', token);
  requireEnv('CLOUDFLARE_ACCOUNT_ID', accountId);
  requireEnv('CLOUDFLARE_PROJECT_NAME', projectName);
  if (secondaryHost === canonicalHost || !secondaryHost.endsWith(`.${canonicalHost}`)) throw new Error('invalid production host pair');

  stage = 'read Pages project';
  const project = await getProject();
  const pagesTarget = String(project.subdomain).replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!pagesTarget.endsWith('.pages.dev')) throw new Error(`unexpected Pages target ${pagesTarget}`);

  stage = `ensure ${canonicalHost} Pages domain`;
  const canonical = await ensureDomain(canonicalHost);
  stage = `ensure ${secondaryHost} Pages domain`;
  const secondary = await ensureDomain(secondaryHost);

  stage = 'resolve zone_tag from Pages domains';
  const zoneId = resolveZoneTag(canonical, secondary);
  annotation('notice', 'Cloudflare zone resolved', 'Using Pages custom-domain zone_tag; no account-wide zone enumeration.');

  stage = `read exact ${canonicalHost} DNS and CAA evidence`;
  const canonicalDns = await getExactDnsRecords(zoneId, canonicalHost);
  const safeDnsEvidence = canonicalDns
    .filter((record) => ['A', 'AAAA', 'CNAME', 'CAA'].includes(record?.type))
    .map((record) => ({ type: record.type, content: record.content, proxied: record.proxied ?? false }));
  annotation('notice', 'Cloudflare apex DNS and CAA evidence', JSON.stringify({ canonical_dns: safeDnsEvidence }));

  stage = `repair exact ${secondaryHost} CNAME`;
  await reconcileSecondaryCname(zoneId, secondaryHost, pagesTarget);

  stage = `verify exact ${secondaryHost} CNAME`;
  const records = await getExactDnsRecords(zoneId, secondaryHost);
  const cnames = records.filter((record) => record?.type === 'CNAME');
  if (cnames.length !== 1) throw new Error(`expected exactly one ${secondaryHost} CNAME after repair`);
  const content = String(cnames[0].content || '').replace(/\.$/, '').toLowerCase();
  if (content !== pagesTarget.toLowerCase() || cnames[0].proxied !== true) throw new Error(`${secondaryHost} CNAME verification failed`);

  stage = `wait ${secondaryHost} active`;
  const activeSecondary = await waitActive(secondaryHost);
  stage = `wait ${canonicalHost} active`;
  const activeCanonical = await waitActive(canonicalHost);

  stage = 'complete';
  annotation('notice', 'Cloudflare production hosts reconciled', JSON.stringify({
    project: projectName,
    production_branch: project.production_branch || null,
    canonical: summary(activeCanonical),
    secondary: summary(activeSecondary),
    secondary_dns_target: pagesTarget,
    canonical_dns: safeDnsEvidence,
  }));
}

try {
  await main();
} catch (error) {
  annotation('error', 'Cloudflare production host reconciliation failed', `${stage}: ${error?.message || error}`);
  process.exitCode = 1;
}
