import assert from 'node:assert/strict';
import {
  findBlockedPublicClaims,
  sanitizeClaimValue,
  sanitizeHtmlTrustClaims
} from '../src/core/trust/public-claim-policy.mjs';

const unsafeHtml = `<!doctype html>
<html><head>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Person","name":"Metehan Çetin, LPC","alumniOf":{"@type":"EducationalOrganization","name":"Professional counseling and applied web-product training"},"sameAs":["https://github.com/mc-novatools","https://example.com/verified-profile"]}</script>
</head><body>
<h1>Metehan Çetin, LPC</h1>
<p>Author with 5+ years of practical experience.</p>
<ul><li><a href="https://github.com/mc-novatools">GitHub</a></li></ul>
</body></html>`;

const sanitized = sanitizeHtmlTrustClaims(unsafeHtml);
assert.equal(findBlockedPublicClaims(sanitized).length, 0);
assert.equal(sanitized.includes('Metehan Çetin, LPC'), false);
assert.equal(sanitized.includes('5+ years'), false);
assert.equal(sanitized.includes('https://github.com/mc-novatools'), false);
assert.equal(sanitized.includes('Professional counseling and applied web-product training'), false);
assert.equal(sanitized.includes('https://example.com/verified-profile'), true);

const legitimateDurationCopy = `
  <article>
    <p>Keeping a loan for five years can change the total interest cost.</p>
    <p>Compare the five years before retirement with the next five years.</p>
  </article>`;
assert.deepEqual(findBlockedPublicClaims(legitimateDurationCopy), [], 'Ordinary financial/time-duration copy must not be treated as a biography claim.');
assert.equal(sanitizeHtmlTrustClaims(legitimateDurationCopy), legitimateDurationCopy, 'Legitimate duration copy should remain unchanged.');

const legalCopy = sanitizeClaimValue({
  common: {
    social: 'Official profiles: GitHub mc-novatools, X/Twitter @mcnovatools, and LinkedIn company/mc-novatools.'
  },
  author: 'Metehan ÇETİN, LPC',
  links: [
    '<a href="https://github.com/mc-novatools">GitHub</a>',
    'Support email: support@mc-novatools.com'
  ],
  sameAs: ['https://github.com/mc-novatools'],
  alumniOf: { '@type': 'EducationalOrganization', name: 'Professional counseling and applied web-product training' }
});

assert.equal(legalCopy.author, 'Metehan ÇETİN');
assert.equal(legalCopy.links.length, 1);
assert.match(legalCopy.common.social, /ownership is verified/i);
assert.equal('sameAs' in legalCopy, false);
assert.equal('alumniOf' in legalCopy, false);

console.log('public claim policy: pass');
