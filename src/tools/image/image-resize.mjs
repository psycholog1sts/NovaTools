/**
 * Image Resizer Tool
 * Resizes images to specific dimensions
 */

/**
 * Resize image
 * @param {Object} inputs - Tool inputs
 * @returns {Promise<Object>} Resize results
 */
export async function imageResizer(inputs) {
  const file = inputs.file;
  let targetWidth = parseInt(inputs.width);
  let targetHeight = parseInt(inputs.height);
  const maintainAspect = inputs.maintainAspect !== 'false';

  if (!file) {
    throw new Error('No image file provided');
  }

  // Load image
  const img = await loadImage(file);
  const originalWidth = img.width;
  const originalHeight = img.height;

  // Calculate new dimensions
  let newWidth = targetWidth;
  let newHeight = targetHeight;

  if (maintainAspect) {
    const aspectRatio = originalWidth / originalHeight;
    
    if (targetWidth / targetHeight > aspectRatio) {
      newWidth = targetHeight * aspectRatio;
      newHeight = targetHeight;
    } else {
      newWidth = targetWidth;
      newHeight = targetWidth / aspectRatio;
    }
  }

  newWidth = Math.round(newWidth);
  newHeight = Math.round(newHeight);

  // Create canvas and resize
  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, newWidth, newHeight);

  // Get blob
  const blob = await new Promise(resolve => {
    canvas.toBlob(resolve, file.type || 'image/jpeg', 0.9);
  });

  return {
    file: blob,
    filename: `resized_${file.name}`,
    originalDimensions: { width: originalWidth, height: originalHeight },
    newDimensions: { width: newWidth, height: newHeight },
    html: formatResizeResult(originalWidth, originalHeight, newWidth, newHeight, blob)
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
function formatResizeResult(origW, origH, newW, newH, blob) {
  const url = URL.createObjectURL(blob);

  return `
    <div class="image-resize-results">
      <div class="result-grid">
        <div class="result-card">
          <span class="result-value">${origW}×${origH}</span>
          <span class="result-label">Original</span>
        </div>
        <div class="result-card success">
          <span class="result-value">${newW}×${newH}</span>
          <span class="result-label">New Size</span>
        </div>
      </div>

      <div class="preview-section">
        <img src="${url}" alt="Resized image" class="resized-preview">
      </div>

      <a href="${url}" download="resized_image.jpg" class="btn btn-primary btn-lg">
        📥 Download Resized Image
      </a>
    </div>
  `;
}

export default imageResizer;
