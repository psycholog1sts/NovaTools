/**
 * Serves pdf-lib to the PDF Merger from the site's own bundle.
 *
 * The page used to append a <script> for pdf-lib from jsdelivr with unpkg as a
 * fallback. That is a third-party origin on the critical path of a tool that
 * claims to keep the file in the browser, and it needed those hosts in
 * script-src. Bundling it locally removes both.
 */
import { PDFDocument } from 'pdf-lib';

const api = { PDFDocument };
window.PDFLib = window.PDFLib || api;
window.dispatchEvent(new CustomEvent('novatools:pdflib-ready', { detail: api }));
