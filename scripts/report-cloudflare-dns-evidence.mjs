const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const projectName = process.env.CLOUDFLARE_PROJECT_NAME;
const hostname = process.env.CLOUDFLARE_CANONICAL_HOST || 'mc-novatools.com';

const cf = async (path) => {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  const payload = await response.json();
  if (!response.ok || payload.success === false) throw new Error(`Cloudflare API HTTP ${response.status}`);
  return payload.result;
};

try {
  if (!token || !accountId || !projectName) throw new Error('required Cloudflare environment is missing');
  const domain = await cf(`/accounts/${encodeURIComponent(accountId)}/pages/projects/${encodeURIComponent(projectName)}/domains/${encodeURIComponent(hostname)}`);
  if (!domain?.zone_tag) throw new Error('Pages custom domain did not return zone_tag');
  const query = new URLSearchParams({ name: hostname, per_page: '100' });
  const records = await cf(`/zones/${encodeURIComponent(domain.zone_tag)}/dns_records?${query}`);
  const evidence = records
    .filter((record) => ['A', 'AAAA', 'CNAME', 'CAA'].includes(record.type))
    .map((record) => ({ type: record.type, content: record.content, proxied: record.proxied ?? false }));
  console.log(`::notice title=Cloudflare apex DNS and CAA evidence::${JSON.stringify(evidence)}`);
} catch (error) {
  console.log(`::warning title=Cloudflare DNS evidence unavailable::${error.message}`);
}
