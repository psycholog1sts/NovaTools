/**
 * PDF structural optimizer used by the shared tool controller.
 * Rewrites the PDF with object streams; it does not downsample page images.
 */

const PDFLib = window.PDFLib;

/**
 * Optimize PDF structure.
 * @param {Object} inputs - Tool inputs
 * @returns {Promise<Object>} Optimization results
 */
export async function pdfCompressor(inputs) {
  const file = inputs.file;

  if (!file) throw new Error('No PDF file provided');

  const originalSize = file.size;
  const arrayBuffer = await file.arrayBuffer();
  const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer, { updateMetadata: false });
  const outputBytes = await pdfDoc.save({
    useObjectStreams: true,
    addDefaultPage: false,
    preserveExistingEncryption: false
  });

  const blob = new Blob([outputBytes], { type: 'application/pdf' });
  const outputSize = blob.size;
  const sizeChangePercent = originalSize > 0
    ? round(((outputSize - originalSize) / originalSize) * 100)
    : 0;
  const legacySavingsPercent = round(-sizeChangePercent);

  return {
    file: blob,
    filename: `optimized_${file.name}`,
    originalSize,
    outputSize,
    sizeChangePercent,
    // Transitional compatibility aliases for callers of the previous controller contract.
    // `savings` is intentionally signed: a larger output produces a negative value.
    compressedSize: outputSize,
    savings: legacySavingsPercent,
    html: formatOptimizeResult(originalSize, outputSize, sizeChangePercent, blob)
  };
}

function formatOptimizeResult(originalSize, outputSize, sizeChangePercent, blob) {
  const url = URL.createObjectURL(blob);
  const formatBytes = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const changeLabel = sizeChangePercent < -0.05
    ? `${Math.abs(sizeChangePercent).toFixed(1)}% smaller`
    : sizeChangePercent > 0.05
      ? `${sizeChangePercent.toFixed(1)}% larger`
      : 'Similar size';

  return `
    <div class="pdf-compress-results">
      <div class="result-grid">
        <div class="result-card">
          <span class="result-value">${formatBytes(originalSize)}</span>
          <span class="result-label">Original Size</span>
        </div>
        <div class="result-card">
          <span class="result-value">${formatBytes(outputSize)}</span>
          <span class="result-label">Output Size</span>
        </div>
        <div class="result-card ${sizeChangePercent < -0.05 ? 'success' : ''}">
          <span class="result-value">${changeLabel}</span>
          <span class="result-label">Size Change</span>
        </div>
      </div>
      <p class="result-note">This structural rewrite does not downsample page images, so a smaller file is not guaranteed.</p>
      <a href="${url}" download="optimized.pdf" class="btn btn-primary btn-lg">📥 Download Optimized PDF</a>
    </div>
  `;
}

function round(number) {
  return Math.round(number * 100) / 100;
}

export default pdfCompressor;
