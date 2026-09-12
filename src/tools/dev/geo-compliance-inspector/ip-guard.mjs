/**
 * Pure IP-range validation for the GEO & Schema Compliance Inspector's SSRF
 * defenses. Given a resolved DNS A/AAAA record, decides whether that address
 * is a public, externally-routable address safe to connect to.
 *
 * This exists separately from analyzer.mjs's assertPublicHttpUrl(), which
 * only does a cheap string check on the URL as typed by the user (hostname
 * literals, obvious localhost/.internal names). A hostname like
 * "evil.example.com" passes that check but can still resolve to 127.0.0.1
 * or a cloud metadata address at request time (DNS rebinding) — this module
 * is the second layer that validates the address DNS actually returned,
 * right before connecting to it.
 */

export function isPublicIPv4(address) {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => !Number.isInteger(p) || p < 0 || p > 255)) {
    return false; // malformed — fail closed
  }
  const [a, b, c] = parts;

  if (a === 0) return false; // "this" network
  if (a === 10) return false; // RFC1918
  if (a === 127) return false; // loopback
  if (a === 100 && b >= 64 && b <= 127) return false; // CGNAT RFC6598
  if (a === 169 && b === 254) return false; // link-local + cloud metadata (169.254.169.254)
  if (a === 172 && b >= 16 && b <= 31) return false; // RFC1918
  if (a === 192 && b === 168) return false; // RFC1918
  if (a === 192 && b === 0 && c === 0) return false; // IETF protocol assignments
  if (a === 192 && b === 0 && c === 2) return false; // TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 198 && b === 51 && c === 100) return false; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return false; // TEST-NET-3
  if (a >= 224) return false; // multicast (224-239) + reserved (240-255) + broadcast

  return true;
}

export function isPublicIPv6(address) {
  const lower = address.toLowerCase();

  if (lower === '::' || lower === '::1') return false; // unspecified / loopback

  const firstGroup = lower.split(':')[0] || '';
  if (/^fe[89ab][0-9a-f]?$/.test(firstGroup)) return false; // fe80::/10 link-local
  if (/^f[cd][0-9a-f]{2}$/.test(firstGroup) || /^f[cd]$/.test(firstGroup)) return false; // fc00::/7 unique-local

  // IPv4-mapped (::ffff:a.b.c.d) and IPv4-compatible (::a.b.c.d) addresses inherit the IPv4 check.
  const mapped = lower.match(/^::(?:ffff:)?(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicIPv4(mapped[1]);

  return true;
}

/**
 * @param {string} address - the resolved address, as returned by dns.lookup
 * @param {4 | 6} family
 */
export function isPublicAddress(address, family) {
  if (family === 4) return isPublicIPv4(address);
  if (family === 6) return isPublicIPv6(address);
  return false; // unknown family — fail closed
}
