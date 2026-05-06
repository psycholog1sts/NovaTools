import { mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const srcSvg = resolve(root, 'public', 'favicon.svg');
const outDir = resolve(root, 'static', 'icons');
const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const hasExistingIcons = sizes.every((size) => existsSync(resolve(outDir, `icon-${size}x${size}.png`)));

let sharp;
try {
  sharp = (await import('sharp')).default;
} catch (error) {
  if (hasExistingIcons) {
    console.warn('Sharp optional runtime is unavailable; keeping existing generated PWA icons.');
    process.exit(0);
  }
  console.error('Sharp optional runtime is required because generated PWA icons are missing.');
  throw error;
}

for (const size of sizes) {
  await sharp(srcSvg)
    .resize(size, size)
    .png()
    .toFile(resolve(outDir, `icon-${size}x${size}.png`));
  console.log(`Generated icon-${size}x${size}.png`);
}

console.log(`Done. ${sizes.length} icons generated in static/icons/`);
