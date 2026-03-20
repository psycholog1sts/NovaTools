import sharp from 'sharp';
import { join } from 'path';

const publicDir = join(process.cwd(), 'public');

async function optimize(input, baseName, sizes) {
  for (const size of sizes) {
    // WebP version
    await sharp(join(publicDir, input))
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 85 })
      .toFile(join(publicDir, `${baseName}-${size}.webp`));

    // PNG fallback at correct size
    await sharp(join(publicDir, input))
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ quality: 85, compressionLevel: 9 })
      .toFile(join(publicDir, `${baseName}-${size}.png`));

    console.log(`Created ${baseName}-${size}.webp and .png`);
  }
}

// Hero logo: displayed at 200-320px
await optimize('logo-brand.png', 'logo-brand', [260, 520]);

// Header logo: displayed at 44px
await optimize('logo-bird.png', 'logo-bird', [44, 88]);

// Favicon sizes
await optimize('logo-bird.png', 'favicon', [16, 32, 48, 180]);

// Copy favicon-180 as apple-touch-icon
await sharp(join(publicDir, 'favicon-180.png'))
  .toFile(join(publicDir, 'apple-touch-icon.png'));

console.log('All optimized logos generated!');
