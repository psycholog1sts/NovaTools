/**
 * Image Compressor Tool
 * Re-encodes images in the browser using Canvas API.
 */

const OUTPUT_FORMATS = new Map([
  ['image/jpeg', { mime: 'image/jpeg', ext: 'jpg' }],
  ['jpeg', { mime: 'image/jpeg', ext: 'jpg' }],
  ['jpg', { mime: 'image/jpeg', ext: 'jpg' }],
  ['image/png', { mime: 'image/png', ext: 'png' }],
  ['png', { mime: 'image/png', ext: 'png' }],
  ['image/webp', { mime: 'image/webp', ext: 'webp' }],
  ['webp', { mime: 'image/webp', ext: 'webp' }]
]);

function requestedFormat(inputs, file) {
  const requested = String(inputs.format || '').toLowerCase();
  if (OUTPUT_FORMATS.has(requested)) return OUTPUT_FORMATS.get(requested);
  if (OUTPUT_FORMATS.has(file.type)) return OUTPUT_FORMATS.get(file.type);
  return OUTPUT_FORMATS.get('image/jpeg');
}

/**
 * Compress image
 * @param {Object} inputs - Tool inputs
 * @returns {Promise<Object>} Compression results
 */
export async function imageCompressor(inputs) {
  const file = inputs.file;
  const parsedQuality = Number.parseInt(inputs.quality, 10);
  const quality = Number.isFinite(parsedQuality) ? Math.min(100, Math.max(1, parsedQuality)) / 100 : 0.8;
  const maxWidth = Number.parseInt(inputs.maxWidth, 10) || null;
  const maxHeight = Number.parseInt(inputs.maxHeight, 10) || null;

  if (!file) throw new Error('No image file provided');

  const originalSize = file.size;
  const img = await loadImage(file);
  let { width, height } = img;

  if (maxWidth && width > maxWidth) {
    height = (maxWidth / width) * height;
    width = maxWidth;
  }
  if (maxHeight && height > maxHeight) {
    width = (maxHeight / height) * width;
    height = maxHeight;
  }

  width = Math.max(1, Math.round(width));
  height = Math.max(1, Math.round(height));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser');
  ctx.drawImage(img, 0, 0, width, height);

  const format = requestedFormat(inputs, file);
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Image encoding failed')), format.mime, quality);
  });

  const compressedSize = blob.size;
  const savings = ((originalSize - compressedSize) / originalSize) * 100;
  const baseName = String(file.name || 'image').replace(/\.[^.]+$/, '') || 'image';
  const filename = `compressed_${baseName}.${format.ext}`;

  return {
    file: blob,
    filename,
    format: format.mime,
    originalSize,
    compressedSize,
    savings: round(savings),
    dimensions: { width, height },
    html: formatCompressResult(originalSize, compressedSize, savings, width, height, blob, filename)
  };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Image could not be decoded'));
    };
    img.src = objectUrl;
  });
}

function formatCompressResult(originalSize, compressedSize, savings, width, height, blob, filename) {
  const url = URL.createObjectURL(blob);
  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };
  const changeLabel = savings >= 0 ? 'Saved' : 'Size change';

  return `
    <div class="image-compress-results">
      <div class="result-grid">
        <div class="result-card"><span class="result-value">${formatBytes(originalSize)}</span><span class="result-label">Original</span></div>
        <div class="result-card"><span class="result-value">${formatBytes(compressedSize)}</span><span class="result-label">Output</span></div>
        <div class="result-card ${savings > 20 ? 'success' : ''}"><span class="result-value">${savings.toFixed(1)}%</span><span class="result-label">${changeLabel}</span></div>
      </div>
      <div class="preview-section">
        <img src="${url}" alt="Compressed preview" class="compressed-preview">
        <p class="dimensions">${width} × ${height} px</p>
      </div>
      <a href="${url}" download="${filename}" class="btn btn-primary btn-lg">📥 Download output image</a>
      <p class="finance-note">The output is re-encoded in your browser. JPEG and WebP quality settings are lossy; PNG encoding may keep or increase file size depending on the source image.</p>
    </div>
  `;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

export default imageCompressor;
