import sharp from 'sharp';
import { join } from 'path';

const srcDir = join(process.cwd(), '..', 'logolar');
const outDir = join(process.cwd(), 'public');

async function removeBlackBg(inputPath, outputPath) {
  const { data, info } = await sharp(inputPath)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    if (r < 20 && g < 20 && b < 20) {
      data[i + 3] = 0;
    }
  }

  await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 }
  })
    .png()
    .toFile(outputPath);

  console.log(`Created: ${outputPath}`);
}

await removeBlackBg(join(srcDir, 'image.png'), join(outDir, 'logo-bird.png'));
await removeBlackBg(join(srcDir, 'mclogo.png'), join(outDir, 'logo-brand.png'));

console.log('Done! Transparent logos created in public/');
