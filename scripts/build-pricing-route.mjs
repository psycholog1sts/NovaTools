import fs from 'node:fs';
import path from 'node:path';

const distDir = path.resolve('dist');
const source = path.join(distDir, 'pricing.html');
const target = path.join(distDir, 'pricing', 'index.html');

if (!fs.existsSync(source)) {
  console.error('Missing dist/pricing.html. The pricing source must be part of the Vite MPA build.');
  process.exit(1);
}

const html = fs.readFileSync(source, 'utf8');
if (!html.includes('<link rel="canonical" href="https://mc-novatools.com/pricing/">')) {
  console.error('Pricing page canonical must be https://mc-novatools.com/pricing/.');
  process.exit(1);
}
if (!/data-pricing-mode=["']interest-only["']/.test(html)) {
  console.error('Pricing page must remain explicitly interest-only until live billing is enabled.');
  process.exit(1);
}

fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, html);
console.log('Pricing route: PASS (dist/pricing/index.html)');
