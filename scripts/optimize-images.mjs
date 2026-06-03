#!/usr/bin/env node
import { mkdirSync } from 'fs';
import { extname, join, relative, resolve } from 'path';
import { globSync } from 'glob';
import sharp from 'sharp';

const root = process.cwd();
const publicDir = resolve(root, 'public');
const maxWidth = 1200;
const targets = globSync('**/*.{png,jpg,jpeg}', {
  cwd: publicDir,
  nodir: true,
  ignore: ['icons/**', 'favicon-*', 'apple-touch-icon.*']
});

for (const file of targets) {
  const input = join(publicDir, file);
  const ext = extname(file);
  const base = join(publicDir, file.slice(0, -ext.length));
  const image = sharp(input, { failOn: 'warning' }).rotate();
  const metadata = await image.metadata();
  const width = Math.min(metadata.width || maxWidth, maxWidth);
  const pipeline = image.resize({ width, withoutEnlargement: true });

  mkdirSync(resolve(base, '..'), { recursive: true });
  await pipeline.clone().webp({ quality: 82, effort: 5 }).toFile(`${base}.webp`);
  await pipeline.clone().avif({ quality: 50, effort: 5 }).toFile(`${base}.avif`);
  await pipeline.clone().jpeg({ quality: 82, progressive: true, mozjpeg: true }).toFile(`${base}.jpg`);
  console.log(`Optimized ${relative(root, input)} -> WebP/AVIF/JPEG fallback at max ${width}px`);
}

console.log(`Optimized ${targets.length} public image source(s).`);
