export const UNVERIFIED_SOCIAL_URLS = Object.freeze([
  'https://github.com/mc-novatools',
  'https://twitter.com/mcnovatools',
  'https://linkedin.com/company/mc-novatools'
]);

const UNVERIFIED_TRAINING_LABELS = new Set([
  'Professional counseling and applied web-product training',
  'MC NovaTools editorial workflow training'
]);

const UNVERIFIED_EXPERIENCE_PATTERNS = Object.freeze([
  /\bwith more than five years of hands-on experience\b/i,
  /\bwith more than five years of practical experience\b/i,
  /\bwith 5\+ years of hands-on experience\b/i,
  /\bwith 5\+ years of practical experience\b/i,
  /\b(?:has|brings) more than five years of (?:hands-on |practical )?experience\b/i,
  /\b(?:has|brings) 5\+ years of (?:hands-on |practical )?experience\b/i
]);

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function isUnverifiedSocialUrl(value) {
  const normalized = String(value || '').trim().replace(/\/$/, '').toLowerCase();
  return UNVERIFIED_SOCIAL_URLS.some((url) => url.toLowerCase() === normalized);
}

export function sanitizeClaimText(value) {
  return String(value || '')
    .replace(/Metehan ÇETİN,\s*LPC/g, 'Metehan ÇETİN')
    .replace(/Metehan Çetin,\s*LPC/g, 'Metehan Çetin')
    .replace(/\bwith more than five years of hands-on experience\b/gi, 'with hands-on experience')
    .replace(/\bwith more than five years of practical experience\b/gi, 'with practical experience')
    .replace(/\bwith 5\+ years of hands-on experience\b/gi, 'with hands-on experience')
    .replace(/\bwith 5\+ years of practical experience\b/gi, 'with practical experience')
    .replace(/\b(has|brings) more than five years of (?:hands-on |practical )?experience\b/gi, '$1 practical experience')
    .replace(/\b(has|brings) 5\+ years of (?:hands-on |practical )?experience\b/gi, '$1 practical experience')
    .replace(/Official profiles: GitHub mc-novatools, X\/Twitter @mcnovatools, and LinkedIn company\/mc-novatools\.?/gi, 'Public social links are listed only after ownership is verified.')
    .replace(/official social links/gi, 'verified contact details');
}

export function sanitizeClaimValue(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => !(typeof item === 'string' && UNVERIFIED_SOCIAL_URLS.some((url) => item.includes(url))))
      .map((item) => sanitizeClaimValue(item));
  }

  if (value && typeof value === 'object') {
    const next = {};
    for (const [key, child] of Object.entries(value)) {
      if (key === 'alumniOf') continue;
      if (key === 'sameAs' && Array.isArray(child)) {
        const verified = child.filter((item) => !isUnverifiedSocialUrl(item)).map((item) => sanitizeClaimValue(item));
        if (verified.length) next[key] = verified;
        continue;
      }
      if (key === 'social' && child && typeof child === 'object' && !Array.isArray(child)) {
        const verified = Object.fromEntries(
          Object.entries(child).filter(([, url]) => !isUnverifiedSocialUrl(url))
        );
        if (Object.keys(verified).length) next[key] = verified;
        continue;
      }
      next[key] = sanitizeClaimValue(child);
    }
    return next;
  }

  return typeof value === 'string' ? sanitizeClaimText(value) : value;
}

function sanitizeJsonLdObject(value) {
  if (Array.isArray(value)) {
    return value
      .filter((item) => !(typeof item === 'string' && isUnverifiedSocialUrl(item)))
      .map((item) => sanitizeJsonLdObject(item))
      .filter((item) => item !== null);
  }

  if (!value || typeof value !== 'object') {
    return typeof value === 'string' ? sanitizeClaimText(value) : value;
  }

  if (value['@type'] === 'EducationalOrganization' && UNVERIFIED_TRAINING_LABELS.has(String(value.name || ''))) {
    return null;
  }

  const next = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === 'alumniOf') continue;
    if (key === 'sameAs' && Array.isArray(child)) {
      const verified = child.filter((item) => !isUnverifiedSocialUrl(item)).map((item) => sanitizeJsonLdObject(item));
      if (verified.length) next[key] = verified;
      continue;
    }
    const sanitized = sanitizeJsonLdObject(child);
    if (sanitized !== null) next[key] = sanitized;
  }
  return next;
}

function sanitizeJsonLdScripts(html) {
  return html.replace(/<script\b([^>]*\btype=["']application\/ld\+json["'][^>]*)>([\s\S]*?)<\/script>/gi, (script, attrs, payload) => {
    try {
      const parsed = JSON.parse(payload);
      return `<script${attrs}>${JSON.stringify(sanitizeJsonLdObject(parsed))}</script>`;
    } catch {
      return script;
    }
  });
}

function removeUnverifiedSocialAnchors(html) {
  let next = html;
  for (const url of UNVERIFIED_SOCIAL_URLS) {
    const escaped = escapeRegExp(url);
    next = next.replace(new RegExp(`<li\\b[^>]*>\\s*<a\\b[^>]*href=["']${escaped}/?["'][^>]*>[\\s\\S]*?<\\/a>\\s*<\\/li>`, 'gi'), '');
    next = next.replace(new RegExp(`<a\\b[^>]*href=["']${escaped}/?["'][^>]*>[\\s\\S]*?<\\/a>`, 'gi'), '');
  }
  return next;
}

export function sanitizeHtmlTrustClaims(html) {
  let next = sanitizeJsonLdScripts(String(html || ''));
  next = removeUnverifiedSocialAnchors(next);
  next = sanitizeClaimText(next);
  return next;
}

export function findBlockedPublicClaims(html) {
  const text = String(html || '');
  const findings = [];
  if (/Metehan Ç(?:etin|ETİN),\s*LPC/.test(text)) findings.push('unverified_lpc_credential');
  if (UNVERIFIED_EXPERIENCE_PATTERNS.some((pattern) => pattern.test(text))) findings.push('unverified_years_experience');
  for (const url of UNVERIFIED_SOCIAL_URLS) {
    if (text.includes(url)) findings.push(`unverified_social:${url}`);
  }
  return [...new Set(findings)];
}
