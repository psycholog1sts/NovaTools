import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/tools/image/compress/index.html';
let html = readFileSync(path, 'utf8');
const original = html;

const replacements = [
  [
    'Compress images for free. Reduce JPG, PNG &amp; WebP file sizes up to 80% without quality loss. No signup required.',
    'Re-encode JPG, PNG and WebP images in your browser with adjustable quality and output format. No signup required.'
  ],
  [
    'Compress JPG, PNG &amp; WebP images for free. Up to 80% size reduction, no quality loss.',
    'Re-encode JPG, PNG and WebP images in your browser. Compare output size and visual quality before downloading.'
  ],
  [
    'Free online image compressor tool. Reduce JPG, PNG, WebP file sizes without losing quality. Optimize images for websites, social media, and email.',
    'Browser-based image re-encoder for JPG, PNG and WebP. Choose output format and quality, then compare the result before downloading.'
  ],
  [
    'Free image compressor — free online JPG, PNG and WebP image compression tool. Reduce image file size for free without losing quality. No registration required. 100% free image optimizer.',
    'Browser-based JPG, PNG and WebP image re-encoder with adjustable quality and output format. No registration required.'
  ],
  [
    'Reduce image file size without losing quality. Supports JPEG, PNG, and WebP.',
    'Re-encode JPEG, PNG, or WebP and compare file size with visual quality before downloading.'
  ],
  [
    'Welcome to our free online image compressor - the fastest way to <strong>compress images</strong> and <strong>reduce image size</strong> without sacrificing visual quality. Whether you need to <strong>optimize images for web</strong> performance or simply free up storage space on your device, our powerful <strong>jpg compressor</strong> and image optimization tool delivers professional results instantly.',
    'Use this browser-based image compressor to <strong>re-encode images</strong> for web publishing, email, CMS uploads, or storage. JPEG and WebP quality settings are lossy, so smaller output can trade detail for size. PNG can preserve transparency and sharp edges, but its output is not guaranteed to be smaller than the source.'
  ],
  [
    "Large image files can significantly slow down your website's loading speed, negatively impact SEO rankings, and consume unnecessary bandwidth. Our browser-based compression technology processes your images locally, ensuring complete privacy while achieving file size reductions of up to 80%. Support for JPEG, PNG, and WebP formats means you can optimize any image for your specific needs.",
    "Large images can increase transfer size and loading time. This tool decodes and re-encodes the selected file in the browser; it does not send the selected image to a NovaTools image-processing server. Actual size change depends on the source image, selected format, browser encoder, and quality setting, and some outputs can be the same size or larger."
  ],
  [
    'Our smart compression algorithm minimizes quality loss while dramatically reducing file size. At 80% quality, most images retain visual clarity indistinguishable from the original to the human eye. You can adjust the quality slider to find your preferred balance between size and quality.',
    'JPEG and WebP quality settings use lossy browser encoding and can introduce artifacts, especially around text and sharp edges. PNG output is typically lossless at the pixel level but may not reduce file size. Adjust the quality setting and inspect the preview before downloading.'
  ],
  [
    'Absolutely! All image processing happens entirely within your browser using client-side JavaScript. Your images are never uploaded to any server, ensuring complete privacy and security. Once you close the page, all data is automatically cleared from your browser.',
    'The selected image is decoded and encoded by browser APIs on the current device; this tool does not upload the selected file to a NovaTools image-processing server. The page itself can still load normal site resources such as analytics or advertising according to consent settings, so avoid treating any web page as an approved environment for regulated material.'
  ],
  [
    '<input type="file" name="file" id="fileInput" accept="image/*" style="display: none;">',
    '<input type="file" name="file" id="fileInput" accept="image/jpeg,image/png,image/webp" style="display: none;">'
  ]
];

for (const [from, to] of replacements) {
  if (!html.includes(from)) {
    throw new Error(`Expected Image Compressor source fragment not found: ${from.slice(0, 96)}`);
  }
  html = html.replace(from, to);
}

if (html === original) throw new Error('Image Compressor truth migration made no changes.');

for (const forbidden of [
  /without losing quality/i,
  /without quality loss/i,
  /no quality loss/i,
  /up to\s+\d+%/i,
  /\bfastest\b/i,
  /professional (?:quality )?results? instantly/i,
  /complete privacy/i,
  /complete security/i
]) {
  if (forbidden.test(html.replace(/<style\b[\s\S]*?<\/style>/gi, ' '))) {
    throw new Error(`Forbidden Image Compressor claim remains: ${forbidden}`);
  }
}

writeFileSync(path, html, 'utf8');
console.log('Image Compressor truth migration: pass');
