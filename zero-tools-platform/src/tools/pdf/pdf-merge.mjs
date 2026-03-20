/**
 * PDF Merger Tool
 * Combines multiple PDFs into one
 */

const PDFLib = window.PDFLib;

/**
 * Merge PDFs
 * @param {Object} inputs - Tool inputs
 * @returns {Promise<Object>} Merge results
 */
export async function pdfMerger(inputs) {
  const files = Array.isArray(inputs.files) ? inputs.files : [inputs.files];

  if (files.length < 2) {
    throw new Error('At least 2 PDF files are required');
  }

  const mergedPdf = await PDFLib.PDFDocument.create();
  let totalPages = 0;
  const fileDetails = [];

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
    const pageCount = pdf.getPageCount();

    const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    pages.forEach(page => mergedPdf.addPage(page));

    totalPages += pageCount;
    fileDetails.push({
      name: file.name,
      pages: pageCount
    });
  }

  const mergedBytes = await mergedPdf.save();
  const blob = new Blob([mergedBytes], { type: 'application/pdf' });

  return {
    file: blob,
    filename: `merged_${Date.now()}.pdf`,
    pageCount: totalPages,
    files: fileDetails,
    html: formatMergeResult(fileDetails, totalPages, blob)
  };
}

/**
 * Format result as HTML
 */
function formatMergeResult(files, totalPages, blob) {
  const url = URL.createObjectURL(blob);

  return `
    <div class="pdf-merge-results">
      <div class="result-highlight success">
        <div class="result-big">${totalPages}</div>
        <div class="result-label">Total Pages Merged</div>
      </div>

      <div class="file-list">
        <h4>Merged Files (${files.length})</h4>
        ${files.map(f => `
          <div class="file-item">
            <span class="file-icon">📄</span>
            <span class="file-name">${f.name}</span>
            <span class="page-count">${f.pages} pages</span>
          </div>
        `).join('')}
      </div>

      <a href="${url}" download="merged.pdf" class="btn btn-primary btn-lg">
        📥 Download Merged PDF
      </a>
    </div>
  `;
}

export default pdfMerger;
