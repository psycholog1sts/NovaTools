import { mkdir, writeFile, readFile } from 'node:fs/promises';

const posts = JSON.parse(await readFile('src/i18n/blog/en.json', 'utf8'));
const outDir = 'public/images/blog';
const categoryPalettes = {
  'artificial-intelligence': ['#6d28d9', '#a78bfa', '#111827'],
  'data-privacy': ['#0f766e', '#2dd4bf', '#0f172a'],
  'remote-productivity': ['#2563eb', '#38bdf8', '#111827'],
  'fintech-personal-finance': ['#1d4ed8', '#22c55e', '#0f172a'],
  'education-technology': ['#7c3aed', '#f59e0b', '#111827'],
  'developer-automation': ['#334155', '#06b6d4', '#020617']
};

function escapeXml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[char]);
}

function shortTitle(title, max = 48) {
  return title.length > max ? `${title.slice(0, max - 1).trimEnd()}…` : title;
}

function svgFor(post, width, height, label) {
  const [primary, accent, dark] = categoryPalettes[post.category] || categoryPalettes['developer-automation'];
  const title = escapeXml(shortTitle(post.title));
  const category = escapeXml(post.category.replace(/-/g, ' ').toUpperCase());
  const fontSize = Math.max(28, Math.round(width / 28));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title} cover image">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${dark}"/>
      <stop offset="0.62" stop-color="${primary}"/>
      <stop offset="1" stop-color="${accent}"/>
    </linearGradient>
    <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M48 0H0V48" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>
    </pattern>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#grid)" opacity="0.45"/>
  <circle cx="${Math.round(width * 0.78)}" cy="${Math.round(height * 0.24)}" r="${Math.round(width * 0.16)}" fill="rgba(255,255,255,0.16)"/>
  <circle cx="${Math.round(width * 0.18)}" cy="${Math.round(height * 0.78)}" r="${Math.round(width * 0.13)}" fill="rgba(255,255,255,0.10)"/>
  <rect x="${Math.round(width * 0.06)}" y="${Math.round(height * 0.12)}" width="${Math.round(width * 0.18)}" height="8" rx="4" fill="${accent}"/>
  <text x="${Math.round(width * 0.06)}" y="${Math.round(height * 0.24)}" fill="rgba(255,255,255,0.78)" font-family="Inter, Arial, sans-serif" font-size="${Math.round(fontSize * 0.42)}" font-weight="700" letter-spacing="3">${category}</text>
  <text x="${Math.round(width * 0.06)}" y="${Math.round(height * 0.49)}" fill="#fff" font-family="Inter, Arial, sans-serif" font-size="${fontSize}" font-weight="800">${title}</text>
  <text x="${Math.round(width * 0.06)}" y="${Math.round(height * 0.66)}" fill="rgba(255,255,255,0.82)" font-family="Inter, Arial, sans-serif" font-size="${Math.round(fontSize * 0.48)}" font-weight="600">${escapeXml(label)} · NovaTools Blog</text>
</svg>
`;
}

await mkdir(outDir, { recursive: true });
for (const post of posts) {
  await writeFile(`${outDir}/og-${post.slug}.svg`, svgFor(post, 1200, 630, 'Open Graph'));
  await writeFile(`${outDir}/card-${post.slug}.svg`, svgFor(post, 800, 450, 'Article card'));
  await writeFile(`${outDir}/featured-${post.slug}.svg`, svgFor(post, 1200, 675, 'Featured article'));
}
console.log(`Generated ${posts.length} SVG blog image sets in ${outDir}`);
