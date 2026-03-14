import sharp from 'sharp';
import { mkdirSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const srcSvg = resolve(root, 'public', 'favicon.svg');
const outDir = resolve(root, 'static', 'icons');

if (!existsSync(outDir)) {
  mkdirSync(outDir, { recursive: true });
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  await sharp(srcSvg)
    .resize(size, size)
    .png()
    .toFile(resolve(outDir, `icon-${size}x${size}.png`));
  console.log(`Generated icon-${size}x${size}.png`);
}

console.log(`Done. ${sizes.length} icons generated in static/icons/`);
