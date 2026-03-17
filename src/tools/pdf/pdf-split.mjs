/**
 * PDF Splitter Tool
 * Splits PDF into individual pages using pdf-lib
 */

// pdf-lib is loaded from CDN
const PDFLib = window.PDFLib;

/**
 * Split PDF into pages
 * @param {Object} inputs - Tool inputs
 * @returns {Promise<Object>} Split results
 */
export async function pdfSplitter(inputs) {
  const file = inputs.file;
  const mode = inputs.mode || 'all';
  const pageRange = inputs.pageRange;

  if (!file) {
    throw new Error('No PDF file provided');
  }

  // Read file
  const arrayBuffer = await file.arrayBuffer();
  
  // Load PDF with pdf-lib
  const pdfDoc = await PDFLib.PDFDocument.load(arrayBuffer);
  const totalPages = pdfDoc.getPageCount();

  // Determine which pages to extract
  let pagesToExtract = [];
  
  if (mode === 'all') {
    pagesToExtract = Array.from({ length: totalPages }, (_, i) => i);
  } else if (mode === 'range' && pageRange) {
    pagesToExtract = parsePageRange(pageRange, totalPages);
  } else if (mode === 'extract' && pageRange) {
    pagesToExtract = parsePageRange(pageRange, totalPages);
  } else {
    pagesToExtract = Array.from({ length: totalPages }, (_, i) => i);
  }

  // Validate pages
  pagesToExtract = pagesToExtract.filter(p => p >= 0 && p < totalPages);

  if (pagesToExtract.length === 0) {
    throw new Error('No valid pages to extract');
  }

  // Split into individual PDFs
  const outputFiles = [];

  for (const pageIndex of pagesToExtract) {
    const newPdf = await PDFLib.PDFDocument.create();
    const [copiedPage] = await newPdf.copyPages(pdfDoc, [pageIndex]);
    newPdf.addPage(copiedPage);

    const pdfBytes = await newPdf.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });

    outputFiles.push({
      blob,
      filename: `${file.name.replace('.pdf', '')}_page_${pageIndex + 1}.pdf`,
      pageNumber: pageIndex + 1
    });
  }

  return {
    files: outputFiles,
    count: outputFiles.length,
    totalPages,
    html: formatSplitResult(outputFiles, totalPages)
  };
}

/**
 * Parse page range string (e.g., "1-3,5,7-9")
 */
function parsePageRange(rangeStr, maxPages) {
  const pages = new Set();
  const parts = rangeStr.split(',').map(s => s.trim());

  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(s => parseInt(s.trim()));
      for (let i = start; i <= end && i <= maxPages; i++) {
        if (i > 0) pages.add(i - 1); // Convert to 0-indexed
      }
    } else {
      const page = parseInt(part);
      if (page > 0 && page <= maxPages) {
        pages.add(page - 1);
      }
    }
  }

  return Array.from(pages).sort((a, b) => a - b);
}

/**
 * Format result as HTML
 */
function formatSplitResult(files, totalPages) {
  return `
    <div class="pdf-split-results">
      <div class="result-highlight success">
        <div class="result-big">${files.length}</div>
        <div class="result-label">Pages Extracted</div>
      </div>
      
      <p class="text-muted">From ${totalPages} total pages</p>

      <div class="download-list">
        ${files.map((file, _i) => `
          <div class="download-item">
            <span class="file-icon">📄</span>
            <span class="file-name">${file.filename}</span>
            <a href="${URL.createObjectURL(file.blob)}" 
               download="${file.filename}"
               class="btn btn-sm btn-primary">
               Download
            </a>
          </div>
        `).join('')}
      </div>

      ${files.length > 1 ? `
        <button class="btn btn-primary" onclick="downloadAllZip()">
          📦 Download All as ZIP
        </button>
      ` : ''}
    </div>
  `;
}

export default pdfSplitter;
