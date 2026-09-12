/**
 * Pure, network-free analysis logic for the GEO & Schema Compliance Inspector.
 * Kept separate from api/geo-scan.js (the edge HTTP handler) so it can be unit
 * tested directly against fixture HTML without any fetch/runtime dependency.
 */

export class PublicRequestError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = 'PublicRequestError';
    this.code = code;
    this.status = status;
  }
}

/**
 * The user supplies the target, unlike a fixed upstream allowlist, so this is a
 * genuine SSRF vector. Block loopback, private/link-local ranges and the cloud
 * metadata address by hostname/IP-literal pattern before ever calling fetch().
 */
export function assertPublicHttpUrl(rawUrl) {
  let target;
  try {
    target = new URL(rawUrl);
  } catch {
    throw new PublicRequestError('invalid_url', 'That is not a valid URL.');
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new PublicRequestError('invalid_url', 'Only http:// and https:// URLs are supported.');
  }

  const hostname = target.hostname.toLowerCase();

  if (
    hostname === 'localhost'
    || hostname.endsWith('.localhost')
    || hostname.endsWith('.local')
    || hostname.endsWith('.internal')
  ) {
    throw new PublicRequestError('blocked_host', 'Local/internal hostnames cannot be scanned.');
  }

  const ipv4 = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = ipv4.slice(1).map(Number);
    const isPrivateOrReserved =
      a === 127 // loopback
      || a === 10 // 10.0.0.0/8
      || (a === 172 && b >= 16 && b <= 31) // 172.16.0.0/12
      || (a === 192 && b === 168) // 192.168.0.0/16
      || (a === 169 && b === 254) // link-local + cloud metadata (169.254.169.254)
      || a === 0;
    if (isPrivateOrReserved) {
      throw new PublicRequestError('blocked_host', 'Private/internal IP addresses cannot be scanned.');
    }
  }

  if (hostname === '::1' || hostname.includes('::')) {
    // Reject IPv6 literals outright rather than trying to fully parse private ranges.
    throw new PublicRequestError('blocked_host', 'IPv6 literal targets are not supported.');
  }

  return target;
}

function extractAttr(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*["']([^"']*)["']`, 'i'));
  return match ? match[1] : '';
}

export function extractMeta(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : '';

  const metaTags = html.match(/<meta\b[^>]*>/gi) || [];
  let description = '';
  let robotsContent = '';
  for (const tag of metaTags) {
    const name = extractAttr(tag, 'name').toLowerCase();
    if (name === 'description' && !description) description = extractAttr(tag, 'content');
    if (name === 'robots') robotsContent = extractAttr(tag, 'content').toLowerCase();
  }

  const linkTags = html.match(/<link\b[^>]*>/gi) || [];
  const canonicalTag = linkTags.find((tag) => extractAttr(tag, 'rel').toLowerCase() === 'canonical');
  const canonical = canonicalTag ? extractAttr(canonicalTag, 'href') : '';

  return {
    title,
    description,
    canonical,
    isNoindex: robotsContent.includes('noindex')
  };
}

const SCHEMA_REQUIRED_PROPERTIES = {
  Article: ['headline', 'author', 'datePublished'],
  NewsArticle: ['headline', 'author', 'datePublished'],
  BlogPosting: ['headline', 'author', 'datePublished'],
  Product: ['name', 'offers'],
  Organization: ['name', 'url'],
  FAQPage: ['mainEntity'],
  SoftwareApplication: ['name', 'applicationCategory'],
  WebSite: ['name', 'url']
};

export function extractJsonLd(html) {
  const blocks = html.match(/<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi) || [];
  const schemas = [];

  for (const block of blocks) {
    const bodyMatch = block.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
    const raw = bodyMatch ? bodyMatch[1].trim() : '';
    if (!raw) continue;

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      schemas.push({ type: 'InvalidJSON', isValid: false, missingProperties: [] });
      continue;
    }

    const nodes = Array.isArray(parsed) ? parsed : (parsed['@graph'] || [parsed]);
    for (const node of nodes) {
      if (!node || typeof node !== 'object' || !node['@type']) continue;
      const type = String(node['@type']);
      const required = SCHEMA_REQUIRED_PROPERTIES[type] || [];
      const missingProperties = required.filter((prop) => node[prop] === undefined || node[prop] === null || node[prop] === '');
      schemas.push({ type, isValid: missingProperties.length === 0, missingProperties });
    }
  }

  return schemas;
}

function stripTags(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function analyzePage(html) {
  const meta = extractMeta(html);
  const schemas = extractJsonLd(html);
  const tableCount = (html.match(/<table\b/gi) || []).length;
  const h1Count = (html.match(/<h1\b/gi) || []).length;
  const h2Count = (html.match(/<h2\b/gi) || []).length;

  const bodyText = stripTags(html);
  const wordCount = bodyText ? bodyText.split(' ').filter(Boolean).length : 0;
  const hasFaqSignal = /\b(faq|frequently asked questions|sıkça sorulan sorular)\b/i.test(bodyText);
  const hasAuthorSignal = /\b(author|by |yazar|editör)\b/i.test(bodyText);

  const validSchemaCount = schemas.filter((s) => s.isValid).length;

  let score = 0;
  const recommendations = [];

  // Schema.org presence & validity — up to 30 points
  if (schemas.length === 0) {
    recommendations.push({
      severity: 'critical',
      title: 'No JSON-LD structured data found',
      description: 'The page has no <script type="application/ld+json"> block, so search engines and AI answer engines have no machine-readable summary of the content.',
      fix: 'Add a JSON-LD block (Article, Product, FAQPage, Organization, etc. as fits the page) to the <head>.'
    });
  } else {
    score += Math.round((validSchemaCount / schemas.length) * 30);
    const invalid = schemas.filter((s) => !s.isValid);
    for (const s of invalid) {
      recommendations.push({
        severity: 'warning',
        title: `${s.type} schema is missing required fields`,
        description: `Missing: ${s.missingProperties.join(', ') || 'unparseable JSON'}.`,
        fix: `Add the missing propert${s.missingProperties.length === 1 ? 'y' : 'ies'} to the ${s.type} JSON-LD block.`
      });
    }
  }

  // Meta essentials — up to 20 points
  if (meta.title) score += 8; else recommendations.push({ severity: 'critical', title: 'Missing <title>', description: 'The page has no <title> tag.', fix: 'Add a unique, descriptive <title> under ~60 characters.' });
  if (meta.description) score += 7; else recommendations.push({ severity: 'warning', title: 'Missing meta description', description: 'No <meta name="description"> tag was found.', fix: 'Add a 140-160 character meta description summarizing the page.' });
  if (meta.canonical) score += 5; else recommendations.push({ severity: 'info', title: 'No canonical link', description: 'No <link rel="canonical"> was found.', fix: 'Add a self-referencing (or correct) canonical link to avoid duplicate-content ambiguity.' });

  // Indexability — 10 points, and a critical flag if blocked
  if (meta.isNoindex) {
    recommendations.unshift({
      severity: 'critical',
      title: 'Page is set to noindex',
      description: 'The robots meta tag includes "noindex", so this page cannot appear in search results or be cited by AI answer engines at all.',
      fix: 'Remove "noindex" from the robots meta tag if this page is meant to be public.'
    });
  } else {
    score += 10;
  }

  // Semantic structure — up to 20 points
  if (h1Count === 1) score += 8; else recommendations.push({ severity: h1Count === 0 ? 'warning' : 'info', title: h1Count === 0 ? 'No <h1> found' : 'Multiple <h1> tags found', description: `Found ${h1Count} <h1> element(s); exactly one is recommended.`, fix: 'Use a single <h1> as the page\'s main heading.' });
  if (h2Count > 0) score += 6; else recommendations.push({ severity: 'info', title: 'No <h2> subheadings', description: 'The page has no <h2> sections, which makes it harder to extract discrete answer blocks.', fix: 'Break the content into <h2> sections, each answering one sub-question.' });
  if (tableCount > 0) score += 6; else recommendations.push({ severity: 'info', title: 'No semantic <table> elements', description: 'AI Overviews and rich results tend to favor pages that present comparable data in real <table> markup over prose or div grids.', fix: 'Where you present comparisons or specs, use a <table> instead of styled <div> rows.' });

  // Content signals — up to 20 points
  if (hasFaqSignal) score += 10;
  if (hasAuthorSignal) score += 10; else recommendations.push({ severity: 'info', title: 'No visible author byline detected', description: 'No author/byline text was found in the page content.', fix: 'Add a visible author name (and ideally a short bio) to strengthen E-E-A-T signals.' });

  score = Math.max(0, Math.min(100, score));

  return {
    score,
    meta,
    schemas,
    metrics: { tableCount, h1Count, h2Count, wordCount, hasFaqSignal, hasAuthorSignal },
    recommendations
  };
}
