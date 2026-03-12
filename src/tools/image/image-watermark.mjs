/**
 * Image Watermark Tool
 * Adds text watermarks to images
 */

/**
 * Add watermark to image
 * @param {Object} inputs - Tool inputs
 * @returns {Promise<Object>} Watermark results
 */
export async function imageWatermark(inputs) {
  const file = inputs.file;
  const text = inputs.watermarkText;
  const position = inputs.position || 'bottom-right';
  const opacity = parseInt(inputs.opacity) / 100 || 0.5;
  const fontSize = parseInt(inputs.fontSize) || 24;

  if (!file) {
    throw new Error('No image file provided');
  }

  if (!text) {
    throw new Error('Watermark text is required');
  }

  // Load image
  const img = await loadImage(file);
  const { width, height } = img;

  // Create canvas
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);

  // Configure watermark
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
  ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.5})`;
  ctx.lineWidth = 2;
  ctx.textBaseline = 'middle';

  // Measure text
  const metrics = ctx.measureText(text);
  const textWidth = metrics.width;
  const textHeight = fontSize;

  // Calculate position
  let x, y;
  const padding = 20;

  switch (position) {
    case 'center':
      x = (width - textWidth) / 2;
      y = height / 2;
      break;
    case 'top-left':
      x = padding;
      y = padding + textHeight / 2;
      break;
    case 'top-right':
      x = width - textWidth - padding;
      y = padding + textHeight / 2;
      break;
    case 'bottom-left':
      x = padding;
      y = height - padding - textHeight / 2;
      break;
    case 'bottom-right':
    default:
      x = width - textWidth - padding;
      y = height - padding - textHeight / 2;
  }

  // Draw watermark with shadow
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);

  // Get blob
  const blob = await new Promise(resolve => {
    canvas.toBlob(resolve, file.type || 'image/jpeg', 0.95);
  });

  return {
    file: blob,
    filename: `watermarked_${file.name}`,
    watermark: { text, position, opacity, fontSize },
    html: formatWatermarkResult(text, position, blob)
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
function formatWatermarkResult(text, position, blob) {
  const url = URL.createObjectURL(blob);

  return `
    <div class="image-watermark-results">
      <div class="result-highlight">
        <div class="result-label">Watermark Applied</div>
        <div class="watermark-preview-text">"${text}"</div>
        <div class="position-badge">${position.replace('-', ' ')}</div>
      </div>

      <div class="preview-section">
        <img src="${url}" alt="Watermarked image" class="watermarked-preview">
      </div>

      <a href="${url}" download="watermarked_image.jpg" class="btn btn-primary btn-lg">
        📥 Download Watermarked Image
      </a>
    </div>
  `;
}

export default imageWatermark;
