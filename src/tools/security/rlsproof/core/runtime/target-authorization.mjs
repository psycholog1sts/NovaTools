function normalizeHostname(value) {
  return String(value ?? '').trim().toLowerCase().replace(/\.$/, '');
}

function ipv4Octets(hostname) {
  const match = normalizeHostname(hostname).match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return null;
  const octets = match.slice(1).map(Number);
  return octets.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) ? octets : null;
}

function isLoopbackHost(hostname) {
  const host = normalizeHostname(hostname);
  if (host === 'localhost' || host === '[::1]' || host === '::1') return true;
  const octets = ipv4Octets(host);
  return Boolean(octets && octets[0] === 127);
}

function isNonPublicLiteralAddress(hostname) {
  const host = normalizeHostname(hostname);
  if (isLoopbackHost(host)) return false;

  const octets = ipv4Octets(host);
  if (octets) {
    const [a, b] = octets;
    return a === 0
      || a === 10
      || (a === 100 && b >= 64 && b <= 127)
      || (a === 169 && b === 254)
      || (a === 172 && b >= 16 && b <= 31)
      || (a === 192 && b === 168)
      || a >= 224;
  }

  if (host.startsWith('[') && host.endsWith(']')) {
    const address = host.slice(1, -1);
    return address.startsWith('fe80:')
      || address.startsWith('fc')
      || address.startsWith('fd')
      || address === '::'
      || address === '::ffff:169.254.169.254';
  }

  return false;
}

function normalizedAttestedHosts(values) {
  if (!Array.isArray(values)) return new Set();
  return new Set(values.map(normalizeHostname).filter(Boolean));
}

function targetDescriptor(url) {
  return {
    href: `${url.origin}${url.pathname}`,
    origin: url.origin,
    protocol: url.protocol,
    hostname: normalizeHostname(url.hostname),
    port: url.port,
    pathname: url.pathname,
  };
}

function decision(authorized, reason, target = null) {
  return { schemaVersion: 1, authorized, reason, target };
}

export function authorizeRuntimeTarget(rawUrl, options = {}) {
  let url;
  try {
    url = new URL(String(rawUrl ?? ''));
  } catch {
    return decision(false, 'invalid-url');
  }

  if (!['http:', 'https:'].includes(url.protocol)) {
    return decision(false, 'unsupported-scheme');
  }

  if (url.username || url.password) {
    return decision(false, 'embedded-credentials-rejected');
  }

  const hostname = normalizeHostname(url.hostname);
  if (!hostname) return decision(false, 'invalid-url');

  const target = targetDescriptor(url);
  if (isLoopbackHost(hostname)) {
    return decision(true, 'localhost', target);
  }

  if (isNonPublicLiteralAddress(hostname)) {
    return decision(false, 'non-public-network-target-rejected');
  }

  if (url.protocol !== 'https:') {
    return decision(false, 'https-required-for-remote-target');
  }

  const attestedHosts = normalizedAttestedHosts(options.attestedOwnedHosts);
  if (!attestedHosts.has(hostname)) {
    return decision(false, 'ownership-attestation-required');
  }

  return decision(true, 'owned-target-attested', target);
}
