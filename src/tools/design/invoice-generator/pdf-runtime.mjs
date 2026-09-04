/**
 * Serves pdf-lib to the Invoice Generator from the site's own bundle.
 *
 * The route previously claimed to "Download PDF" by opening a print window and
 * writing HTML into it: no PDF was produced, popup blockers stopped it, and the
 * markup it wrote pulled a stylesheet from a third-party font host. pdf-lib
 * ships with the site, so the document can be drawn here and handed straight to
 * the visitor.
 *
 * It is imported on demand. pdf-lib is ~180 KB and most visitors read the page
 * or fill the form long before they export anything, so loading it up front
 * would put the route over the first-load JS budget for no benefit.
 */
let pending = null;

async function load() {
  const { PDFDocument, StandardFonts, rgb } = await import('pdf-lib');
  const api = { PDFDocument, StandardFonts, rgb };
  window.PDFLib = window.PDFLib || api;
  return window.PDFLib;
}

window.novatoolsLoadPdfLib = function loadPdfLib() {
  if (window.PDFLib && window.PDFLib.StandardFonts) return Promise.resolve(window.PDFLib);
  pending = pending || load().catch((error) => { pending = null; throw error; });
  return pending;
};
