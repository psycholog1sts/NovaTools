/**
 * Image Converter Tool
 * Converts images between formats
 */

/**
 * Convert image format
 * @param {Object} inputs - Tool inputs
 * @returns {Promise<Object>} Conversion results
 */
export async function imageConverter(inputs) {
  const file = inputs.file;
  const format = inputs.format || 'png';
  const quality = parseInt(inputs.quality) / 100 || 0.9;

  if (!file) {
    throw new Error('No image file provided');
  }

  // Load image
  const img = await loadImage(file);
  const { width, height } = img;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');

  // Handle transparency for JPEG
  if (format === 'jpeg') {
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);
  }

  ctx.drawImage(img, 0, 0);

  // Convert to blob
  const mimeType = `image/${format}`;
  const blob = await new Promise(resolve => {
    canvas.toBlob(resolve, mimeType, format === 'png' ? undefined : quality);
  });

  const newExtension = format === 'jpeg' ? 'jpg' : format;

  return {
    file: blob,
    filename: `converted_${file.name.replace(/\.[^/.]+$/, '')}.${newExtension}`,
    format,
    dimensions: { width, height },
    html: formatConvertResult(format, width, height, blob)
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
function formatConvertResult(format, width, height, blob) {
  const url = URL.createObjectURL(blob);

  return `
    <div class="image-convert-results">
      <div class="result-highlight">
        <div class="result-big">${format.toUpperCase()}</div>
        <div class="result-label">Output Format</div>
      </div>

      <div class="preview-section">
        <img src="${url}" alt="Converted image" class="converted-preview">
        <p class="dimensions">${width} × ${height} px</p>
      </div>

      <a href="${url}" download="converted_image.${format === 'jpeg' ? 'jpg' : format}" class="btn btn-primary btn-lg">
        📥 Download ${format.toUpperCase()}
      </a>
    </div>
  `;
}

export default imageConverter;
