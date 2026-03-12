/**
 * Image Compressor Tool
 * Compresses images using Canvas API
 */

/**
 * Compress image
 * @param {Object} inputs - Tool inputs
 * @returns {Promise<Object>} Compression results
 */
export async function imageCompressor(inputs) {
  const file = inputs.file;
  const quality = parseInt(inputs.quality) / 100 || 0.8;
  const maxWidth = parseInt(inputs.maxWidth) || null;
  const maxHeight = parseInt(inputs.maxHeight) || null;

  if (!file) {
    throw new Error('No image file provided');
  }

  const originalSize = file.size;

  // Load image
  const img = await loadImage(file);

  // Calculate dimensions
  let { width, height } = img;
  
  if (maxWidth && width > maxWidth) {
    height = (maxWidth / width) * height;
    width = maxWidth;
  }
  if (maxHeight && height > maxHeight) {
    width = (maxHeight / height) * width;
    height = maxHeight;
  }

  // Create canvas and compress
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, width, height);

  // Determine output format
  const outputFormat = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise(resolve => {
    canvas.toBlob(resolve, outputFormat, quality);
  });

  const compressedSize = blob.size;
  const savings = ((originalSize - compressedSize) / originalSize) * 100;

  return {
    file: blob,
    filename: `compressed_${file.name}`,
    originalSize,
    compressedSize,
    savings: Math.max(0, round(savings)),
    dimensions: { width, height },
    html: formatCompressResult(originalSize, compressedSize, savings, width, height, blob)
  };
}

/**
 * Load image from file
 */
function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Format result as HTML
 */
function formatCompressResult(originalSize, compressedSize, savings, width, height, blob) {
  const url = URL.createObjectURL(blob);
  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return `
    <div class="image-compress-results">
      <div class="result-grid">
        <div class="result-card">
          <span class="result-value">${formatBytes(originalSize)}</span>
          <span class="result-label">Original</span>
        </div>
        <div class="result-card">
          <span class="result-value">${formatBytes(compressedSize)}</span>
          <span class="result-label">Compressed</span>
        </div>
        <div class="result-card ${savings > 20 ? 'success' : ''}">
          <span class="result-value">${Math.max(0, savings).toFixed(1)}%</span>
          <span class="result-label">Saved</span>
        </div>
      </div>

      <div class="preview-section">
        <img src="${url}" alt="Compressed preview" class="compressed-preview">
        <p class="dimensions">${width} × ${height} px</p>
      </div>

      <a href="${url}" download="compressed_image.jpg" class="btn btn-primary btn-lg">
        📥 Download Compressed Image
      </a>
    </div>
  `;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

export default imageCompressor;
