#!/usr/bin/env node
/**
 * Convert SVG favicons to PNG and ICO formats
 * Uses sharp for high-quality rasterization
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

const PUBLIC_DIR = 'public';
const ICONS_DIR = 'dist/icons';

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    // Directory may already exist
  }
}

async function convertSvgToPng(svgPath, outputPath, size) {
  try {
    const svgBuffer = await fs.readFile(svgPath);
    
    await sharp(svgBuffer)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 10, g: 10, b: 12, alpha: 1 } // #0A0A0C
      })
      .png({ quality: 90 })
      .toFile(outputPath);
    
    console.log(`✓ Created: ${outputPath} (${size}x${size})`);
    return true;
  } catch (error) {
    console.error(`✗ Failed: ${outputPath}`, error.message);
    return false;
  }
}

async function createAppleTouchIcon() {
  const svgPath = path.join(PUBLIC_DIR, 'apple-touch-icon.svg');
  const outputPath = path.join(PUBLIC_DIR, 'apple-touch-icon.png');
  return convertSvgToPng(svgPath, outputPath, 180);
}

async function createFaviconPngs() {
  const sizes = [16, 32, 48];
  const results = [];
  
  for (const size of sizes) {
    const svgPath = path.join(PUBLIC_DIR, `favicon-${size}.svg`);
    const outputPath = path.join(PUBLIC_DIR, `favicon-${size}.png`);
    results.push(convertSvgToPng(svgPath, outputPath, size));
  }
  
  return Promise.all(results);
}

async function createMultiSizeFavicon() {
  // For maximum compatibility, we need a multi-size ICO
  // For now, use the 48x48 PNG as favicon.ico fallback
  const sourcePath = path.join(PUBLIC_DIR, 'favicon-48.png');
  const destPath = path.join(PUBLIC_DIR, 'favicon.ico');
  
  try {
    await fs.copyFile(sourcePath, destPath);
    console.log(`✓ Created: ${destPath} (48x48 PNG fallback)`);
    return true;
  } catch (error) {
    console.error(`✗ Failed: ${destPath}`, error.message);
    return false;
  }
}

async function main() {
  console.log('🎨 Converting SVG favicons to PNG...\n');
  
  await ensureDir(PUBLIC_DIR);
  
  // Create PNG versions
  await createFaviconPngs();
  await createAppleTouchIcon();
  await createMultiSizeFavicon();
  
  console.log('\n✅ Favicon conversion complete!');
  console.log('\nGenerated files:');
  console.log('  - public/favicon-16.png');
  console.log('  - public/favicon-32.png');
  console.log('  - public/favicon-48.png');
  console.log('  - public/favicon.ico (PNG fallback)');
  console.log('  - public/apple-touch-icon.png');
  console.log('  - public/favicon.svg');
}

main().catch(console.error);
