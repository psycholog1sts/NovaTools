#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = path.resolve(new URL('..', import.meta.url).pathname);
const postsPath = path.join(rootDir, 'src', 'i18n', 'blog', 'en.json');
const outPath = path.join(rootDir, 'public', 'rss.xml');
const rootOutPath = path.join(rootDir, 'rss.xml');
const siteOrigin = 'https://mc-novatools.com';
const mode = process.argv.includes('--check') ? 'check' : 'write';

function escapeXml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function absolute(pathname) {
  if (/^https?:\/\//i.test(pathname)) return pathname;
  return `${siteOrigin}${pathname.startsWith('/') ? pathname : `/${pathname}`}`;
}

function renderRss(posts) {
  const latest = posts
    .filter((post) => post.slug && post.title && post.datePublished)
    .sort((a, b) => new Date(`${b.datePublished}T00:00:00Z`) - new Date(`${a.datePublished}T00:00:00Z`))
    .slice(0, 50);
  const buildDate = latest[0]?.dateModified || latest[0]?.datePublished || '2026-06-03';
  const items = latest.map((post) => {
    const url = `${siteOrigin}/blog/articles/${post.slug}.html`;
    const pubDate = new Date(`${post.datePublished}T08:00:00Z`).toUTCString();
    const image = post.coverImage?.card || post.coverImage?.og || '/logo-brand-520.png';
    return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <author>editorial@mc-novatools.com (${escapeXml(post.author?.name || 'NovaTools Editorial')})</author>
      <category>${escapeXml(post.category)}</category>
      <description>${escapeXml(post.excerpt)}</description>
      <enclosure url="${escapeXml(absolute(image))}" type="image/svg+xml" length="0" />
    </item>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>MC NovaTools Blog</title>
    <link>${siteOrigin}/blog/index.html</link>
    <atom:link href="${siteOrigin}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Practical browser-first guides for PDF, image, developer, finance, productivity, and privacy workflows.</description>
    <language>en-us</language>
    <lastBuildDate>${new Date(`${buildDate}T08:00:00Z`).toUTCString()}</lastBuildDate>
    <ttl>1440</ttl>
${items}
  </channel>
</rss>
`;
}

const posts = JSON.parse(fs.readFileSync(postsPath, 'utf8'));
const rss = renderRss(posts);
if (mode === 'check') {
  const stale = [outPath, rootOutPath].filter((file) => !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== rss);
  if (stale.length) {
    stale.forEach((file) => console.error(`FAIL: ${path.relative(rootDir, file)} is not up to date. Run npm run build:rss.`));
    process.exit(1);
  }
  console.log('✅ Blog RSS feed is up to date.');
} else {
  fs.writeFileSync(outPath, rss);
  fs.writeFileSync(rootOutPath, rss);
  console.log(`✅ Generated RSS feed with ${Math.min(posts.length, 50)} items.`);
}
