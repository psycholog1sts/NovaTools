/**
 * Serves pdf-lib and JSZip to the PDF Splitter from the site's own bundle.
 *
 * Both used to come from jsdelivr, with unpkg and esm.sh as fallbacks — three
 * third-party origins on the critical path of a tool whose page says the file
 * stays in the browser.
 *
 * Both are imported on demand: together they are larger than the whole rest of
 * the page, and neither is needed until a file is chosen.
 */
let pdfPending = null;
let zipPending = null;

window.novatoolsLoadPdfLib = function loadPdfLib() {
  if (window.PDFLib) return Promise.resolve(window.PDFLib);
  pdfPending = pdfPending || import('pdf-lib')
    .then(({ PDFDocument }) => {
      window.PDFLib = window.PDFLib || { PDFDocument };
      return window.PDFLib;
    })
    .catch((error) => { pdfPending = null; throw error; });
  return pdfPending;
};

window.novatoolsLoadJsZip = function loadJsZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  zipPending = zipPending || import('jszip')
    .then((mod) => {
      window.JSZip = window.JSZip || mod.default || mod;
      return window.JSZip;
    })
    .catch((error) => { zipPending = null; throw error; });
  return zipPending;
};
