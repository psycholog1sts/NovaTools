/**
 * Serves pdf-lib to the PDF Merger from the site's own bundle.
 *
 * The page used to append a <script> for pdf-lib from jsdelivr with unpkg as a
 * fallback: a third-party origin on the critical path of a tool that says the
 * file stays in the browser, and the only reason those hosts were in
 * script-src.
 *
 * It is imported on demand rather than up front. pdf-lib is ~180 KB and most
 * visitors read the page before they pick a file, so loading it eagerly put the
 * route over the 200 KB first-load JS budget for no benefit.
 */
let pending = null;

async function load() {
  const { PDFDocument } = await import('pdf-lib');
  const api = { PDFDocument };
  window.PDFLib = window.PDFLib || api;
  return window.PDFLib;
}

window.novatoolsLoadPdfLib = function loadPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  pending = pending || load().catch((error) => { pending = null; throw error; });
  return pending;
};
