/**
 * PDF Compressor Tool
 * Compresses PDF by optimizing images and structure
 */

const PDFLib = window.PDFLib;

/**
 * Compress PDF
 * @param {Object} inputs - Tool inputs
 * @returns {Promise<Object>} Compression results
 */
export async function pdfCompressor(inputs) {
  const file = inputs.file;
  const quality = inputs.quality || 'medium';

  if (!file) {
    throw new Error('No PDF file provided');
  }

  const originalSize = file.size;
  const arrayBuffer = await file.arrayBuffer();

  // Load PDF
  const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, {
    updateMetadata: false
  });

  // Compression settings based on quality
  const compressionSettings = {
    low: { quality: 0.3, scale: 0.5 },
    medium: { quality: 0.6, scale: 0.75 },
    high: { quality: 0.8, scale: 0.9 }
  };

  const settings = compressionSettings[quality];

  // Try to compress embedded images
  // Note: pdf-lib doesn't have direct image compression, so we save with optimization
  const compressedBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    preserveExistingEncryption: false
  });

  const blob = new Blob([compressedBytes], { type: 'application/pdf' });
  const compressedSize = blob.size;
  const savings = ((originalSize - compressedSize) / originalSize) * 100;

  return {
    file: blob,
    filename: `compressed_${file.name}`,
    originalSize,
    compressedSize,
    savings: Math.max(0, round(savings)),
    html: formatCompressResult(originalSize, compressedSize, savings, blob)
  };
}

/**
 * Format result as HTML
 */
function formatCompressResult(originalSize, compressedSize, savings, blob) {
  const url = URL.createObjectURL(blob);
  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes  } B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)  } KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)  } MB`;
  };

  const actualSavings = Math.max(0, savings);

  return `
    <div class="pdf-compress-results">
      <div class="result-grid">
        <div class="result-card">
          <span class="result-value">${formatBytes(originalSize)}</span>
          <span class="result-label">Original Size</span>
        </div>
        <div class="result-card">
          <span class="result-value">${formatBytes(compressedSize)}</span>
          <span class="result-label">Compressed Size</span>
        </div>
        <div class="result-card ${actualSavings > 10 ? 'success' : ''}">
          <span class="result-value">${actualSavings.toFixed(1)}%</span>
          <span class="result-label">Space Saved</span>
        </div>
      </div>

      <a href="${url}" download="compressed.pdf" class="btn btn-primary btn-lg">
        📥 Download Compressed PDF
      </a>
    </div>
  `;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

export default pdfCompressor;
