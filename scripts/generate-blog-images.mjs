#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const outlinePath = path.join(rootDir, 'content', 'blog-outlines.json');
const fallbackBlogPath = path.join(rootDir, 'src', 'i18n', 'blog', 'en.json');
const outDir = path.join(rootDir, 'public', 'images', 'blog');
const mode = process.argv.includes('--check') ? 'check' : 'write';

const variantSizes = {
  og: { width: 1200, height: 630, label: 'Open Graph' },
  card: { width: 800, height: 450, label: 'Article card' },
  featured: { width: 1200, height: 675, label: 'Featured article' }
};

const clusterThemes = {
  'pdf-workflows': {
    label: 'PDF workflow',
    colors: ['#172554', '#2563eb', '#38bdf8', '#f8fafc'],
    icon: 'documents',
    motif: 'Review packet'
  },
  'image-optimization': {
    label: 'Image optimization',
    colors: ['#3b0764', '#7c3aed', '#fb7185', '#fef3c7'],
    icon: 'image',
    motif: 'Visual quality'
  },
  'finance-calculators': {
    label: 'Finance calculator',
    colors: ['#052e16', '#047857', '#22c55e', '#dcfce7'],
    icon: 'finance',
    motif: 'Assumption review'
  },
  'developer-utilities': {
    label: 'Developer utility',
    colors: ['#020617', '#334155', '#06b6d4', '#dbeafe'],
    icon: 'code',
    motif: 'Debug path'
  },
  'text-utilities': {
    label: 'Text utility',
    colors: ['#3b0764', '#7e22ce', '#c084fc', '#f5f3ff'],
    icon: 'text',
    motif: 'Editorial review'
  },
  'privacy-workflows': {
    label: 'Privacy workflow',
    colors: ['#042f2e', '#0f766e', '#2dd4bf', '#ccfbf1'],
    icon: 'shield',
    motif: 'Local processing'
  },
  productivity: {
    label: 'Productivity workflow',
    colors: ['#172554', '#2563eb', '#60a5fa', '#eff6ff'],
    icon: 'kanban',
    motif: 'Next action'
  },
  education: {
    label: 'Education workflow',
    colors: ['#451a03', '#b45309', '#f59e0b', '#fffbeb'],
    icon: 'education',
    motif: 'Guided practice'
  },
  'ai-workflows': {
    label: 'AI workflow',
    colors: ['#312e81', '#8b5cf6', '#22d3ee', '#eef2ff'],
    icon: 'nodes',
    motif: 'Human review'
  },
  'data-workflows': {
    label: 'Data workflow',
    colors: ['#0c4a6e', '#0284c7', '#67e8f9', '#ecfeff'],
    icon: 'data',
    motif: 'Clean import'
  },
  comparison: {
    label: 'Comparison guide',
    colors: ['#111827', '#4f46e5', '#a78bfa', '#f5f3ff'],
    icon: 'comparison',
    motif: 'Trade-off map'
  }
};

const categoryClusterMap = {
  'fintech-personal-finance': 'finance-calculators',
  'education-technology': 'education',
  'artificial-intelligence': 'ai-workflows',
  'remote-productivity': 'productivity',
  'developer-automation': 'developer-utilities',
  'data-privacy': 'privacy-workflows',
  pdf: 'pdf-workflows',
  image: 'image-optimization',
  finance: 'finance-calculators',
  developer: 'developer-utilities',
  data: 'data-workflows',
  privacy: 'privacy-workflows',
  productivity: 'productivity',
  education: 'education',
  comparison: 'comparison'
};

function escapeXml(value) {
  return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&apos;', '"': '&quot;' })[char]);
}

function hashString(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function wrapText(value, maxChars, maxLines = 3) {
  const words = String(value).split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
    if (lines.length === maxLines) break;
  }
  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = `${lines[maxLines - 1].replace(/[.,:;!?-]+$/u, '')}…`;
  }
  return lines;
}

function iconSvg(type, x, y, size, accent, light, seed) {
  const s = size;
  const stroke = `stroke="${light}" stroke-width="${Math.max(3, Math.round(size / 28))}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;
  const translucent = `fill="${accent}" opacity="0.22"`;
  if (type === 'documents') {
    return `<g transform="translate(${x} ${y})"><rect x="${s * 0.18}" y="${s * 0.06}" width="${s * 0.58}" height="${s * 0.78}" rx="${s * 0.06}" ${translucent}/><rect x="${s * 0.06}" y="${s * 0.18}" width="${s * 0.58}" height="${s * 0.78}" rx="${s * 0.06}" fill="rgba(255,255,255,0.13)"/><path d="M${s * 0.2} ${s * 0.42}h${s * 0.3}M${s * 0.2} ${s * 0.56}h${s * 0.24}M${s * 0.2} ${s * 0.7}h${s * 0.32}M${s * 0.44} ${s * 0.26}l${s * 0.08} ${s * 0.08} ${s * 0.18}-${s * 0.2}" ${stroke}/></g>`;
  }
  if (type === 'image') {
    return `<g transform="translate(${x} ${y})"><rect x="${s * 0.08}" y="${s * 0.16}" width="${s * 0.82}" height="${s * 0.62}" rx="${s * 0.08}" fill="rgba(255,255,255,0.14)"/><circle cx="${s * 0.68}" cy="${s * 0.34}" r="${s * 0.08}" fill="${accent}"/><path d="M${s * 0.16} ${s * 0.68}l${s * 0.22}-${s * 0.22} ${s * 0.16} ${s * 0.14} ${s * 0.12}-${s * 0.16} ${s * 0.18} ${s * 0.24}" ${stroke}/><path d="M0 ${s * 0.08}h${s * 0.18}M${s * 0.82} ${s * 0.86}H${s}" ${stroke}/></g>`;
  }
  if (type === 'finance') {
    return `<g transform="translate(${x} ${y})"><rect x="${s * 0.08}" y="${s * 0.12}" width="${s * 0.84}" height="${s * 0.72}" rx="${s * 0.1}" fill="rgba(255,255,255,0.13)"/><path d="M${s * 0.18} ${s * 0.66}l${s * 0.18}-${s * 0.18} ${s * 0.16} ${s * 0.08} ${s * 0.24}-${s * 0.3}" ${stroke}/><circle cx="${s * 0.22}" cy="${s * 0.3}" r="${s * 0.06}" fill="${accent}"/><path d="M${s * 0.2} ${s * 0.78}h${s * 0.56}" ${stroke}/></g>`;
  }
  if (type === 'code') {
    return `<g transform="translate(${x} ${y})"><rect x="${s * 0.06}" y="${s * 0.14}" width="${s * 0.88}" height="${s * 0.72}" rx="${s * 0.08}" fill="rgba(255,255,255,0.12)"/><path d="M${s * 0.36} ${s * 0.36}l-${s * 0.14} ${s * 0.14} ${s * 0.14} ${s * 0.14}M${s * 0.64} ${s * 0.36}l${s * 0.14} ${s * 0.14}-${s * 0.14} ${s * 0.14}M${s * 0.54} ${s * 0.3}l-${s * 0.1} ${s * 0.4}" ${stroke}/><circle cx="${s * 0.18}" cy="${s * 0.24}" r="${s * 0.025}" fill="${accent}"/></g>`;
  }
  if (type === 'text') {
    return `<g transform="translate(${x} ${y})"><rect x="${s * 0.12}" y="${s * 0.12}" width="${s * 0.76}" height="${s * 0.76}" rx="${s * 0.08}" fill="rgba(255,255,255,0.12)"/><path d="M${s * 0.24} ${s * 0.32}h${s * 0.46}M${s * 0.24} ${s * 0.46}h${s * 0.38}M${s * 0.24} ${s * 0.6}h${s * 0.44}" ${stroke}/><path d="M${s * 0.72} ${s * 0.72}l${s * 0.12} ${s * 0.12}" ${stroke}/><circle cx="${s * 0.7}" cy="${s * 0.7}" r="${s * 0.08}" fill="${accent}"/></g>`;
  }
  if (type === 'shield') {
    return `<g transform="translate(${x} ${y})"><path d="M${s * 0.5} ${s * 0.08}l${s * 0.34} ${s * 0.12}v${s * 0.28}c0 ${s * 0.22}-${s * 0.14} ${s * 0.38}-${s * 0.34} ${s * 0.48}-${s * 0.34}-${s * 0.1}-${s * 0.34}-${s * 0.26}-${s * 0.34}-${s * 0.48}V${s * 0.2}z" fill="rgba(255,255,255,0.14)"/><path d="M${s * 0.34} ${s * 0.5}l${s * 0.12} ${s * 0.12} ${s * 0.24}-${s * 0.28}" ${stroke}/><circle cx="${s * 0.72}" cy="${s * 0.28}" r="${s * 0.05}" fill="${accent}"/></g>`;
  }
  if (type === 'kanban') {
    const offset = seed % 18;
    return `<g transform="translate(${x} ${y})"><rect x="${s * 0.08}" y="${s * 0.12}" width="${s * 0.84}" height="${s * 0.72}" rx="${s * 0.08}" fill="rgba(255,255,255,0.12)"/><rect x="${s * 0.18}" y="${s * 0.26}" width="${s * 0.18}" height="${s * 0.36 + offset}" rx="${s * 0.04}" fill="${accent}" opacity="0.72"/><rect x="${s * 0.42}" y="${s * 0.26}" width="${s * 0.18}" height="${s * 0.28}" rx="${s * 0.04}" fill="rgba(255,255,255,0.24)"/><rect x="${s * 0.66}" y="${s * 0.26}" width="${s * 0.18}" height="${s * 0.44}" rx="${s * 0.04}" fill="rgba(255,255,255,0.2)"/></g>`;
  }
  if (type === 'nodes') {
    return `<g transform="translate(${x} ${y})"><circle cx="${s * 0.28}" cy="${s * 0.3}" r="${s * 0.1}" fill="rgba(255,255,255,0.14)"/><circle cx="${s * 0.7}" cy="${s * 0.42}" r="${s * 0.12}" fill="${accent}" opacity="0.34"/><circle cx="${s * 0.42}" cy="${s * 0.72}" r="${s * 0.1}" fill="rgba(255,255,255,0.14)"/><path d="M${s * 0.36} ${s * 0.34}l${s * 0.22} ${s * 0.06}M${s * 0.63} ${s * 0.52}l-${s * 0.14} ${s * 0.12}M${s * 0.34} ${s * 0.39}l${s * 0.07} ${s * 0.22}" ${stroke}/></g>`;
  }
  if (type === 'data') {
    return `<g transform="translate(${x} ${y})"><rect x="${s * 0.12}" y="${s * 0.16}" width="${s * 0.76}" height="${s * 0.64}" rx="${s * 0.08}" fill="rgba(255,255,255,0.12)"/><path d="M${s * 0.24} ${s * 0.3}h${s * 0.52}M${s * 0.24} ${s * 0.46}h${s * 0.52}M${s * 0.24} ${s * 0.62}h${s * 0.52}M${s * 0.4} ${s * 0.24}v${s * 0.44}M${s * 0.58} ${s * 0.24}v${s * 0.44}" ${stroke}/><circle cx="${s * 0.74}" cy="${s * 0.28}" r="${s * 0.05}" fill="${accent}"/></g>`;
  }
  if (type === 'comparison') {
    return `<g transform="translate(${x} ${y})"><rect x="${s * 0.1}" y="${s * 0.18}" width="${s * 0.3}" height="${s * 0.58}" rx="${s * 0.06}" fill="rgba(255,255,255,0.13)"/><rect x="${s * 0.6}" y="${s * 0.18}" width="${s * 0.3}" height="${s * 0.58}" rx="${s * 0.06}" fill="${accent}" opacity="0.26"/><path d="M${s * 0.48} ${s * 0.32}h${s * 0.1}M${s * 0.52} ${s * 0.28}l${s * 0.08} ${s * 0.04}-${s * 0.08} ${s * 0.04}M${s * 0.42} ${s * 0.62}h${s * 0.1}M${s * 0.44} ${s * 0.58}l-${s * 0.08} ${s * 0.04} ${s * 0.08} ${s * 0.04}" ${stroke}/></g>`;
  }
  return `<g transform="translate(${x} ${y})"><circle cx="${s * 0.5}" cy="${s * 0.44}" r="${s * 0.26}" fill="rgba(255,255,255,0.13)"/><path d="M${s * 0.22} ${s * 0.48}l${s * 0.28}-${s * 0.14} ${s * 0.28} ${s * 0.14}-${s * 0.28} ${s * 0.14}zM${s * 0.5} ${s * 0.62}v${s * 0.16}" ${stroke}/><rect x="${s * 0.28}" y="${s * 0.76}" width="${s * 0.44}" height="${s * 0.08}" rx="${s * 0.04}" fill="${accent}"/></g>`;
}

function decorativeNodes(width, height, seed, accent) {
  const nodes = [];
  for (let i = 0; i < 8; i += 1) {
    const xSeed = (Math.imul(seed ^ (i * 2654435761), 2246822519) >>> 0) / 4294967295;
    const ySeed = (Math.imul((seed + i * 374761393) >>> 0, 3266489917) >>> 0) / 4294967295;
    const x = Math.round(xSeed * width);
    const y = Math.round(ySeed * height);
    const r = 4 + ((seed + i * 17) % 18);
    nodes.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="${accent}" opacity="${0.1 + (i % 4) * 0.04}"/>`);
  }
  return nodes.join('');
}

function svgFor(article, variant) {
  const { width, height, label } = variantSizes[variant];
  const clusterKey = article.cluster || categoryClusterMap[article.category] || 'productivity';
  const theme = clusterThemes[clusterKey] || clusterThemes.productivity;
  const [dark, primary, accent, light] = theme.colors;
  const seed = hashString(`${article.slug}:${variant}`);
  const titleLines = wrapText(article.title, width >= 1000 ? 34 : 24, 3);
  const task = article.searchIntent?.userTaskIntent || article.task || article.excerpt || article.category;
  const taskLines = wrapText(task, width >= 1000 ? 52 : 42, 2);
  const fontScale = width / 1200;
  const titleBase = variant === 'card' ? 48 : 58;
  const titleSize = Math.round(titleBase * fontScale);
  const subSize = Math.round(24 * fontScale + (variant === 'card' ? 1 : 0));
  const left = Math.round(width * 0.07);
  const titleTop = Math.round(height * 0.31);
  const lineGap = Math.round(titleSize * 1.12);
  const iconSize = Math.round(Math.min(width, height) * (variant === 'card' ? 0.28 : 0.34));
  const iconX = Math.round(width * (variant === 'card' ? 0.72 : 0.66));
  const iconY = Math.round(height * 0.17);
  const patternSize = 54 + (seed % 24);
  const dash = 8 + (seed % 6);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(article.title)} cover image">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${dark}"/>
      <stop offset="0.58" stop-color="${primary}"/>
      <stop offset="1" stop-color="${accent}"/>
    </linearGradient>
    <pattern id="grid" width="${patternSize}" height="${patternSize}" patternUnits="userSpaceOnUse">
      <path d="M${patternSize} 0H0V${patternSize}" fill="none" stroke="rgba(255,255,255,0.12)" stroke-width="1" stroke-dasharray="${dash} ${dash + 6}"/>
    </pattern>
    <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="18" flood-color="#000" flood-opacity="0.24"/>
    </filter>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <rect width="${width}" height="${height}" fill="url(#grid)" opacity="0.58"/>
  ${decorativeNodes(width, height, seed, light)}
  <path d="M${Math.round(width * 0.62)} 0C${Math.round(width * 0.86)} ${Math.round(height * 0.2)} ${Math.round(width * 0.82)} ${Math.round(height * 0.72)} ${width} ${height}" fill="rgba(255,255,255,0.12)"/>
  <rect x="${left}" y="${Math.round(height * 0.1)}" width="${Math.round(width * 0.22)}" height="8" rx="4" fill="${accent}"/>
  <text x="${left}" y="${Math.round(height * 0.2)}" fill="rgba(255,255,255,0.78)" font-family="Inter, Arial, sans-serif" font-size="${Math.round(subSize * 0.86)}" font-weight="800" letter-spacing="3">${escapeXml(theme.label.toUpperCase())}</text>
  ${titleLines.map((line, index) => `<text x="${left}" y="${titleTop + index * lineGap}" fill="#fff" font-family="Inter, Arial, sans-serif" font-size="${titleSize}" font-weight="850">${escapeXml(line)}</text>`).join('\n  ')}
  ${taskLines.map((line, index) => `<text x="${left}" y="${Math.round(height * 0.68) + index * Math.round(subSize * 1.25)}" fill="rgba(255,255,255,0.84)" font-family="Inter, Arial, sans-serif" font-size="${subSize}" font-weight="650">${escapeXml(line)}</text>`).join('\n  ')}
  <g filter="url(#softShadow)">${iconSvg(theme.icon, iconX, iconY, iconSize, accent, light, seed)}</g>
  <g transform="translate(${left} ${Math.round(height * 0.84)})">
    <rect width="${Math.round(width * 0.34)}" height="${Math.round(subSize * 1.8)}" rx="${Math.round(subSize * 0.9)}" fill="rgba(255,255,255,0.14)"/>
    <text x="${Math.round(subSize * 0.9)}" y="${Math.round(subSize * 1.16)}" fill="${light}" font-family="Inter, Arial, sans-serif" font-size="${Math.round(subSize * 0.78)}" font-weight="800">${escapeXml(label)} · ${escapeXml(theme.motif)}</text>
  </g>
</svg>
`;
}

function coverPath(article, variant) {
  const configured = article.coverImage?.[variant];
  const relative = configured || `/images/blog/${variant}-${article.slug}.svg`;
  const clean = relative.replace(/^\//, '');
  return path.join(rootDir, clean.startsWith('images/') ? path.join('public', clean) : clean);
}

function normalizeBlogPost(post) {
  const cluster = post.cluster || categoryClusterMap[post.category] || 'productivity';
  return {
    ...post,
    cluster,
    task: post.excerpt || post.title,
    visualBrief: post.visualBrief || {
      palette: clusterThemes[cluster]?.colors?.slice(0, 3),
      iconography: [post.category, ...(post.tags || []).slice(0, 2)],
      style: 'category-specific editorial cover generated from article metadata'
    }
  };
}

function uniqueArticles(outlineArticles, blogPosts) {
  const bySlug = new Map();
  [...outlineArticles, ...blogPosts].forEach((article) => {
    if (!article?.slug) return;
    bySlug.set(article.slug, { ...(bySlug.get(article.slug) || {}), ...normalizeBlogPost(article) });
  });
  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

function expectedAssets(articles) {
  return articles.flatMap((article) => Object.keys(variantSizes).map((variant) => ({
    file: coverPath(article, variant),
    contents: svgFor(article, variant)
  })));
}

const dataset = JSON.parse(await readFile(outlinePath, 'utf8'));
const outlineArticles = dataset.articles || [];
if (outlineArticles.length !== 100) {
  throw new Error(`Expected 100 blog outlines before image generation, found ${outlineArticles.length}.`);
}
const fallbackPosts = JSON.parse(await readFile(fallbackBlogPath, 'utf8'));
const articles = uniqueArticles(outlineArticles, fallbackPosts);
const assets = expectedAssets(articles);

if (mode === 'check') {
  const stale = assets.filter(({ file, contents }) => !fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== contents);
  if (stale.length) {
    stale.slice(0, 20).forEach(({ file }) => console.error(`FAIL: ${path.relative(rootDir, file)} is missing or stale. Run npm run build:blog-images.`));
    if (stale.length > 20) console.error(`FAIL: ${stale.length - 20} additional blog image assets are stale.`);
    process.exit(1);
  }
  console.log(`✅ Blog cover assets are valid and up to date (${assets.length} SVG files for ${articles.length} unique articles).`);
} else {
  await mkdir(outDir, { recursive: true });
  await Promise.all(assets.map(({ file, contents }) => writeFile(file, contents)));
  console.log(`✅ Generated ${assets.length} unique SVG blog cover assets for ${articles.length} unique articles in ${path.relative(rootDir, outDir)}.`);
}
