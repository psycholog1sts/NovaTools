/**
 * Post-build script to fix directory structure
 * Moves files from dist/src/ to proper locations
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, '..', 'dist');

console.log('🔧 Running post-build fixes...\n');

// Fix 1: Move dist/src/tools -> dist/tools
const srcDir = path.join(distDir, 'src');
const toolsSrcDir = path.join(srcDir, 'tools');
const toolsDstDir = path.join(distDir, 'tools');

if (fs.existsSync(toolsSrcDir)) {
  if (fs.existsSync(toolsDstDir)) {
    fs.rmSync(toolsDstDir, { recursive: true });
  }
  fs.renameSync(toolsSrcDir, toolsDstDir);
  console.log('✅ Fixed: dist/src/tools -> dist/tools');
}

// Fix 2: Move dist/src/blog -> dist/blog
const blogSrcDir = path.join(srcDir, 'blog');
const blogDstDir = path.join(distDir, 'blog');

if (fs.existsSync(blogSrcDir)) {
  // First, ensure the articles are copied before moving
  const blogArticlesSrc = path.join(blogSrcDir, 'articles');
  const blogArticlesDst = path.join(blogDstDir, 'articles');
  
  if (fs.existsSync(blogDstDir)) {
    // If blog already exists (from viteStaticCopy), merge the index.html
    const srcIndex = path.join(blogSrcDir, 'index.html');
    const dstIndex = path.join(blogDstDir, 'index.html');
    if (fs.existsSync(srcIndex) && !fs.existsSync(dstIndex)) {
      fs.copyFileSync(srcIndex, dstIndex);
    }
    // Copy articles if they exist in src
    if (fs.existsSync(blogArticlesSrc) && !fs.existsSync(blogArticlesDst)) {
      fs.cpSync(blogArticlesSrc, blogArticlesDst, { recursive: true });
      console.log('✅ Copied: blog/articles');
    }
    fs.rmSync(blogSrcDir, { recursive: true });
  } else {
    fs.renameSync(blogSrcDir, blogDstDir);
  }
  console.log('✅ Fixed: dist/src/blog -> dist/blog');
}

// Ensure blog articles are copied from source if not present
const sourceArticlesDir = path.join(__dirname, '..', 'src', 'blog', 'articles');
const distBlogArticlesDir = path.join(distDir, 'blog', 'articles');

if (fs.existsSync(sourceArticlesDir) && !fs.existsSync(distBlogArticlesDir)) {
  fs.mkdirSync(path.join(distDir, 'blog'), { recursive: true });
  fs.cpSync(sourceArticlesDir, distBlogArticlesDir, { recursive: true });
  console.log('✅ Copied: src/blog/articles -> dist/blog/articles');
}

// Fix 3: Clean up dist/src if empty
if (fs.existsSync(srcDir)) {
  const remaining = fs.readdirSync(srcDir);
  if (remaining.length === 0) {
    fs.rmdirSync(srcDir);
    console.log('✅ Cleaned up empty dist/src directory');
  } else {
    console.log(`⚠️  dist/src still contains: ${remaining.join(', ')}`);
    // Remove remaining files
    fs.rmSync(srcDir, { recursive: true });
    console.log('✅ Cleaned up dist/src directory');
  }
}

// Fix 4: Ensure dist/admin exists
const adminSrcDir = path.join(distDir, 'admin');
if (!fs.existsSync(adminSrcDir)) {
  console.log('⚠️  dist/admin not found - admin page may not have been built');
} else {
  console.log('✅ Verified: dist/admin exists');
}

// Verify key files exist
const keyFiles = [
  'index.html',
  'admin/index.html',
  'blog/index.html',
  'tools/finance/tax/index.html',
  'tools/pdf/merge/index.html',
];

console.log('\n📋 Verification:');
let allGood = true;
for (const file of keyFiles) {
  const fullPath = path.join(distDir, file);
  if (fs.existsSync(fullPath)) {
    console.log(`  ✅ ${file}`);
  } else {
    console.log(`  ❌ ${file} - MISSING!`);
    allGood = false;
  }
}

if (allGood) {
  console.log('\n✅ All post-build fixes completed successfully!');
} else {
  console.log('\n⚠️  Some files are missing - check build output');
  process.exit(1);
}
