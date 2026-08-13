const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const projectName = process.env.CLOUDFLARE_PROJECT_NAME;
const canonicalHost = (process.env.CLOUDFLARE_CANONICAL_HOST || 'mc-novatools.com').trim().toLowerCase();
const secondaryHost = (process.env.CLOUDFLARE_SECONDARY_HOST || `www.${canonicalHost}`).trim().toLowerCase();
const apiBase = 'https://api.cloudflare.com/client/v4';
const pollTimeoutMs = Number(process.env.CLOUDFLARE_DOMAIN_POLL_TIMEOUT_MS || 120000);

function annotation(level, title, message) {
  const escaped = String(message)
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
  console.log(`::${level} title=${title}::${escaped}`);
}

function requireEnv(name, value) {
  if (!value) throw new Error(`${name} is required`);
}

function safeError(payload, fallback) {
  const errors = Array.isArray(payload?.errors) ? payload.errors : [];
  if (!errors.length) return fallback;
  return errors.map((entry) => `${entry?.code ?? 'unknown'}:${entry?.message ?? 'Cloudflare API error'}`).join(', ');
}

async function cloudflareJson(path, options = {}) {
  const response = await fetch(`${apiBase}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    // Keep payload null so the HTTP status remains visible in the error.
  }

  if (!response.ok || payload?.success === false) {
    throw new Error(safeError(payload, `HTTP ${response.status}`));
  }
  return payload;
}

async function getPagesProject() {
  const payload = await cloudflareJson(`/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}`);
  const project = payload?.result;
  if (!project?.subdomain) throw new Error('Cloudflare Pages project did not return a project subdomain');
  if (project.production_branch && project.production_branch !== 'main') {
    throw new Error(`Cloudflare Pages production branch is ${project.production_branch}, expected main`);
  }
  return project;
}

async function addPagesDomain(hostname) {
  return cloudflareJson(`/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/domains`, {
    method: 'POST',
    body: JSON.stringify({ name: hostname }),
  });
}

async function getPagesDomain(hostname) {
  try {
    const payload = await cloudflareJson(`/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/domains/${encodeURIComponent(hostname)}`);
    return payload?.result || null;
  } catch (error) {
    if (/8000007|not found|HTTP 404/i.test(error.message)) return null;
    throw error;
  }
}

async function ensurePagesDomain(hostname) {
  let domain = await getPagesDomain(hostname);
  if (domain) return domain;

  annotation('notice', 'Cloudflare Pages domain attach', `Attaching ${hostname} to the expected Pages project ${projectName}.`);
  try {
    await addPagesDomain(hostname);
  } catch (error) {
    throw new Error(`Could not attach ${hostname} to expected Pages project ${projectName}: ${error.message}`);
  }

  domain = await getPagesDomain(hostname);
  if (!domain) {
    throw new Error(`${hostname} was not returned from the expected Pages project after attach`);
  }
  return domain;
}

async function getZone() {
  const query = new URLSearchParams({ name: canonicalHost, 'account.id': accountId });
  const payload = await cloudflareJson(`/zones?${query.toString()}`);
  const zones = Array.isArray(payload?.result) ? payload.result : [];
  const exact = zones.find((zone) => String(zone?.name || '').toLowerCase() === canonicalHost);
  if (!exact?.id) throw new Error(`Cloudflare zone ${canonicalHost} was not returned`);
  return exact;
}

async function listDnsRecords(zoneId, hostname) {
  const query = new URLSearchParams({ name: hostname, per_page: '100' });
  const payload = await cloudflareJson(`/zones/${encodeURIComponent(zoneId)}/dns_records?${query.toString()}`);
  return Array.isArray(payload?.result) ? payload.result : [];
}

async function deleteDnsRecord(zoneId, record) {
  await cloudflareJson(`/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(record.id)}`, {
    method: 'DELETE',
  });
}

async function createCname(zoneId, hostname, target) {
  await cloudflareJson(`/zones/${encodeURIComponent(zoneId)}/dns_records`, {
    method: 'POST',
    body: JSON.stringify({
      type: 'CNAME',
      name: hostname,
      content: target,
      proxied: true,
      ttl: 1,
      comment: 'Managed by NovaTools production host reconciliation',
    }),
  });
}

async function patchCname(zoneId, record, hostname, target) {
  await cloudflareJson(`/zones/${encodeURIComponent(zoneId)}/dns_records/${encodeURIComponent(record.id)}`, {
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

async function ensureSecondaryDns(zoneId, hostname, target) {
  const records = await listDnsRecords(zoneId, hostname);
  const addressRecords = records.filter((record) => ['A', 'AAAA', 'CNAME'].includes(record?.type));
  const blockingNs = records.filter((record) => record?.type === 'NS');

  if (blockingNs.length) {
    throw new Error(`${hostname} has an NS record and cannot safely be converted to the Pages CNAME`);
  }

  if (addressRecords.length > 1) {
    annotation('warning', 'Cloudflare DNS cleanup', `${hostname} has ${addressRecords.length} address records; replacing only the exact A/AAAA/CNAME set with one Pages CNAME.`);
    for (const record of addressRecords) await deleteDnsRecord(zoneId, record);
    await createCname(zoneId, hostname, target);
    return;
  }

  const existing = addressRecords[0];
  if (!existing) {
    annotation('notice', 'Cloudflare DNS create', `Creating ${hostname} -> ${target}.`);
    await createCname(zoneId, hostname, target);
    return;
  }

  const content = String(existing.content || '').replace(/\.$/, '').toLowerCase();
  const expected = String(target || '').replace(/\.$/, '').toLowerCase();
  const isCorrect = existing.type === 'CNAME' && content === expected && existing.proxied === true;
  if (isCorrect) {
    annotation('notice', 'Cloudflare DNS verified', `${hostname} already points to the production Pages project.`);
    return;
  }

  if (existing.type === 'CNAME') {
    annotation('warning', 'Cloudflare DNS drift repaired', `${hostname} CNAME pointed to ${content || '(empty)'}; changing it to ${expected}.`);
    await patchCname(zoneId, existing, hostname, target);
    return;
  }

  annotation('warning', 'Cloudflare DNS drift repaired', `${hostname} used ${existing.type}; replacing it with the production Pages CNAME.`);
  await deleteDnsRecord(zoneId, existing);
  await createCname(zoneId, hostname, target);
}

function domainStatusSummary(domain) {
  return {
    name: domain?.name || null,
    status: domain?.status || null,
    validation_status: domain?.validation_data?.status || null,
    validation_error: domain?.validation_data?.error_message || null,
  };
}

async function waitForActiveDomain(hostname) {
  const deadline = Date.now() + pollTimeoutMs;
  let last = null;
  while (Date.now() < deadline) {
    last = await getPagesDomain(hostname);
    if (last?.status === 'active') return last;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`${hostname} did not become active within ${pollTimeoutMs} ms: ${JSON.stringify(domainStatusSummary(last))}`);
}

async function verifyDns(zoneId, hostname, expectedTarget) {
  const records = await listDnsRecords(zoneId, hostname);
  const cnames = records.filter((record) => record?.type === 'CNAME');
  if (cnames.length !== 1) throw new Error(`${hostname} must have exactly one CNAME after reconciliation; found ${cnames.length}`);
  const record = cnames[0];
  const content = String(record.content || '').replace(/\.$/, '').toLowerCase();
  const expected = String(expectedTarget || '').replace(/\.$/, '').toLowerCase();
  if (content !== expected) throw new Error(`${hostname} CNAME is ${content}, expected ${expected}`);
  if (record.proxied !== true) throw new Error(`${hostname} CNAME must be proxied through Cloudflare`);
}

async function main() {
  requireEnv('CLOUDFLARE_API_TOKEN', token);
  requireEnv('CLOUDFLARE_ACCOUNT_ID', accountId);
  requireEnv('CLOUDFLARE_PROJECT_NAME', projectName);

  if (secondaryHost === canonicalHost) throw new Error('secondary host must differ from canonical host');
  if (!secondaryHost.endsWith(`.${canonicalHost}`)) {
    throw new Error(`secondary host ${secondaryHost} must be a subdomain of ${canonicalHost}`);
  }

  const project = await getPagesProject();
  const pagesTarget = String(project.subdomain).replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!pagesTarget.endsWith('.pages.dev')) {
    throw new Error(`unexpected Cloudflare Pages project subdomain: ${project.subdomain}`);
  }

  const canonicalDomain = await ensurePagesDomain(canonicalHost);
  if (!canonicalDomain) throw new Error(`${canonicalHost} could not be attached to the production Pages project`);

  const secondaryDomain = await ensurePagesDomain(secondaryHost);
  if (!secondaryDomain) throw new Error(`${secondaryHost} could not be attached to the production Pages project`);

  const zone = await getZone();
  await ensureSecondaryDns(zone.id, secondaryHost, pagesTarget);
  await verifyDns(zone.id, secondaryHost, pagesTarget);

  const activeSecondary = await waitForActiveDomain(secondaryHost);
  const activeCanonical = await waitForActiveDomain(canonicalHost);

  annotation('notice', 'Cloudflare production hosts reconciled', JSON.stringify({
    project: projectName,
    production_branch: project.production_branch || null,
    canonical: domainStatusSummary(activeCanonical),
    secondary: domainStatusSummary(activeSecondary),
    secondary_dns_target: pagesTarget,
  }));
}

await main();
