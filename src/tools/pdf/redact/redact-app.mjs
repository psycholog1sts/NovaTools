/**
 * PDF Redact & PII Check — browser-only.
 *
 * Why the output is rebuilt from page images: drawing a black rectangle over
 * text (what most editors call "redaction") leaves the text in the file, where
 * it can still be selected, copied or extracted. Here every page is rendered to
 * pixels, the boxes are painted into those pixels, and a new PDF is built from
 * the images alone, so the original text layer, links, form fields, metadata and
 * attachments are not carried over. The output is then re-opened and checked
 * for any remaining text.
 *
 * pdf.js is served from this site (/vendor/pdfjs/, copied from pdfjs-dist at
 * build time) and pdf-lib ships in the site bundle; the PDF never leaves the tab.
 */
import { PII_TYPES, buildPageText, findPii, maskValue, rectsForRange } from './pii-detect.mjs';

const PDFJS_BASE = '/vendor/pdfjs/';
const MAX_BYTES = 50 * 1024 * 1024;
const MAX_PAGES = 100;
const PREVIEW_WIDTH = 760;

let pdfjsPending = null;
function loadPdfJs() {
  pdfjsPending = pdfjsPending || import(/* @vite-ignore */ `${PDFJS_BASE}pdf.min.mjs`)
    .then((lib) => {
      lib.GlobalWorkerOptions.workerSrc = `${PDFJS_BASE}pdf.worker.min.mjs`;
      return lib;
    })
    .catch((error) => { pdfjsPending = null; throw error; });
  return pdfjsPending;
}

function openPdf(pdfjs, data) {
  return pdfjs.getDocument({
    data,
    isEvalSupported: false,
    cMapUrl: `${PDFJS_BASE}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${PDFJS_BASE}standard_fonts/`,
    wasmUrl: `${PDFJS_BASE}wasm/`,
    iccUrl: `${PDFJS_BASE}iccs/`
  });
}

// The preview and the exported page use the same render call, so what is reviewed is what
// is exported. The print intent paints form-field and annotation appearances into the canvas
// and does not wait on requestAnimationFrame, so a background tab does not stall the export.
function renderPage(pdfjs, pdfPage, canvas, viewport) {
  return pdfPage.render({
    canvas,
    canvasContext: canvas.getContext('2d', { alpha: false }),
    viewport,
    intent: 'print',
    annotationMode: pdfjs.AnnotationMode.ENABLE
  }).promise;
}

const $ = (id) => document.getElementById(id);
const state = { file: null, task: null, doc: null, pages: [], findings: [], skipped: new Set(), outputUrl: null, busy: false };

function say(message) { $('redactStatus').textContent = message || ''; }
function fmtSize(bytes) { return bytes < 1048576 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1048576).toFixed(1)} MB`; }
function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  for (const child of [].concat(children)) node.append(child);
  return node;
}

function toViewportRect(viewport, rect) {
  // pdf.js 6 only converts points; a rotated page swaps axes, so take the box of both corners.
  const [x1, y1] = viewport.convertToViewportPoint(rect.x, rect.y);
  const [x2, y2] = viewport.convertToViewportPoint(rect.x + rect.width, rect.y + rect.height);
  return { x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) };
}

// Width of a piece of a text run in the run's font family, so a value's box starts where
// the value starts rather than where an equal-width-characters guess puts it.
const measureCtx = document.createElement('canvas').getContext('2d');
function measurerFor(styles) {
  return (item, text) => {
    const family = styles?.[item.fontName]?.fontFamily || 'sans-serif';
    measureCtx.font = `100px ${family}`;
    return measureCtx.measureText(text).width;
  };
}

function findingKey(f) { return `${f.page}:${f.start}:${f.end}`; }

function currentTerms() {
  return $('redactTerms').value.split(/[\n,;]/).map((t) => t.trim()).filter((t) => t.length >= 2);
}

function enabledTypes() {
  return [...document.querySelectorAll('input[name="piiType"]')].filter((box) => box.checked).map((box) => box.value);
}

function detect() {
  const types = enabledTypes();
  const terms = currentTerms();
  state.findings = [];
  for (const page of state.pages) {
    for (const hit of findPii(page.text, { types, terms })) {
      const finding = { ...hit, page: page.number, rects: rectsForRange(page.items, page.segments, hit.start, hit.end, page.measure) };
      finding.selected = !state.skipped.has(findingKey(finding));
      state.findings.push(finding);
    }
  }
  renderFindings();
  drawAllOverlays();
}

function selectedRects(page) {
  const rects = state.findings.filter((f) => f.page === page.number && f.selected).flatMap((f) => f.rects);
  return rects.concat(page.manual);
}

function drawOverlay(page) {
  const ctx = page.overlay.getContext('2d');
  ctx.clearRect(0, 0, page.overlay.width, page.overlay.height);
  if (page.fullPage) {
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, page.overlay.width, page.overlay.height);
    return;
  }
  for (const f of state.findings.filter((item) => item.page === page.number)) {
    for (const rect of f.rects) {
      const r = toViewportRect(page.previewViewport, rect);
      if (f.selected) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(r.x, r.y, r.width, r.height);
      } else {
        ctx.setLineDash([4, 3]);
        ctx.strokeStyle = '#dc2626';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(r.x, r.y, r.width, r.height);
        ctx.setLineDash([]);
      }
    }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.72)';
  for (const rect of page.manual) {
    const r = toViewportRect(page.previewViewport, rect);
    ctx.fillRect(r.x, r.y, r.width, r.height);
  }
  if (page.draft) {
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 2;
    ctx.strokeRect(page.draft.x, page.draft.y, page.draft.width, page.draft.height);
  }
}

function drawAllOverlays() { state.pages.forEach(drawOverlay); }

function renderFindings() {
  const list = $('findingsList');
  list.replaceChildren();
  const textChars = state.pages.reduce((sum, page) => sum + page.text.replace(/\s/g, '').length, 0);
  const summary = $('scanSummary');
  if (!textChars) {
    summary.textContent = `No selectable text was found on ${state.pages.length} page(s). This is usually a scanned or image-only PDF: automatic detection cannot read it, so draw boxes over the parts to hide, or black out whole pages.`;
  } else {
    const counts = {};
    for (const f of state.findings) counts[f.type] = (counts[f.type] || 0) + 1;
    const parts = Object.entries(counts).map(([type, n]) => `${n} × ${PII_TYPES[type]}`);
    summary.textContent = state.findings.length
      ? `This PDF has a selectable text layer (${textChars.toLocaleString()} characters). Found: ${parts.join(', ')}. Anyone with the file can copy this text unless it is redacted.`
      : `This PDF has a selectable text layer (${textChars.toLocaleString()} characters), but none of the selected patterns matched. Add names or other terms below, or draw boxes manually.`;
  }
  state.findings.forEach((f, index) => {
    const id = `finding-${index}`;
    const box = el('input', { type: 'checkbox', id, checked: f.selected });
    box.addEventListener('change', () => {
      f.selected = box.checked;
      if (f.selected) state.skipped.delete(findingKey(f)); else state.skipped.add(findingKey(f));
      drawOverlay(state.pages[f.page - 1]);
      updateCounts();
    });
    const label = el('label', { htmlFor: id }, [
      el('span', { className: 'finding-page', textContent: `Page ${f.page}` }),
      el('span', { className: 'finding-type', textContent: PII_TYPES[f.type] }),
      el('code', { textContent: maskValue(f.value) })
    ]);
    list.append(el('li', {}, [box, label]));
  });
  updateCounts();
}

function updateCounts() {
  const findingBoxes = state.findings.filter((f) => f.selected).length;
  const manual = state.pages.reduce((sum, p) => sum + p.manual.length, 0);
  const full = state.pages.filter((p) => p.fullPage).length;
  $('redactCount').textContent = `${findingBoxes} detected item(s), ${manual} drawn box(es) and ${full} full page(s) will be blacked out.`;
  $('redactBtn').disabled = state.busy || !(findingBoxes || manual || full);
}

function renderManualList(page) {
  page.manualList.replaceChildren();
  page.manual.forEach((rect, index) => {
    const remove = el('button', { type: 'button', className: 'btn btn-secondary btn-sm', textContent: `Remove box ${index + 1}` });
    remove.addEventListener('click', () => {
      page.manual.splice(index, 1);
      renderManualList(page);
      drawOverlay(page);
      updateCounts();
    });
    page.manualList.append(el('li', {}, remove));
  });
}

function canvasPoint(canvas, event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: ((event.clientX - bounds.left) * canvas.width) / bounds.width,
    y: ((event.clientY - bounds.top) * canvas.height) / bounds.height
  };
}

function enableDrawing(page) {
  const canvas = page.overlay;
  let origin = null;
  canvas.addEventListener('pointerdown', (event) => {
    if (page.fullPage || state.busy) return;
    origin = canvasPoint(canvas, event);
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!origin) return;
    const p = canvasPoint(canvas, event);
    page.draft = { x: Math.min(origin.x, p.x), y: Math.min(origin.y, p.y), width: Math.abs(p.x - origin.x), height: Math.abs(p.y - origin.y) };
    drawOverlay(page);
  });
  const finish = () => {
    const draft = page.draft;
    origin = null;
    page.draft = null;
    if (draft && draft.width > 3 && draft.height > 3) {
      const [x1, y1] = page.previewViewport.convertToPdfPoint(draft.x, draft.y);
      const [x2, y2] = page.previewViewport.convertToPdfPoint(draft.x + draft.width, draft.y + draft.height);
      page.manual.push({ x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1) });
      renderManualList(page);
      updateCounts();
    }
    drawOverlay(page);
  };
  canvas.addEventListener('pointerup', finish);
  canvas.addEventListener('pointercancel', finish);
}

async function buildPages(pdfjs, doc) {
  const container = $('pagesContainer');
  container.replaceChildren();
  state.pages = [];
  for (let number = 1; number <= doc.numPages; number += 1) {
    say(`Reading page ${number} of ${doc.numPages}…`);
    const pdfPage = await doc.getPage(number);
    const base = pdfPage.getViewport({ scale: 1 });
    const previewViewport = pdfPage.getViewport({ scale: PREVIEW_WIDTH / base.width });
    const content = await pdfPage.getTextContent();
    const items = content.items.filter((item) => typeof item.str === 'string');
    const { text, segments } = buildPageText(items);

    const preview = el('canvas', { width: Math.round(previewViewport.width), height: Math.round(previewViewport.height), className: 'page-render' });
    const overlay = el('canvas', { width: preview.width, height: preview.height, className: 'page-overlay' });
    overlay.setAttribute('aria-label', `Page ${number}: drag to draw a redaction box`);
    overlay.setAttribute('role', 'img');
    await renderPage(pdfjs, pdfPage, preview, previewViewport);

    const page = { number, pdfPage, base, previewViewport, items, text, segments, measure: measurerFor(content.styles), preview, overlay, manual: [], fullPage: false, draft: null, manualList: el('ul', { className: 'manual-list' }) };
    const fullId = `fullpage-${number}`;
    const full = el('input', { type: 'checkbox', id: fullId });
    full.addEventListener('change', () => { page.fullPage = full.checked; drawOverlay(page); updateCounts(); });
    container.append(el('section', { className: 'page-card', ariaLabel: `Page ${number}` }, [
      el('div', { className: 'page-card__head' }, [
        el('strong', { textContent: `Page ${number}` }),
        el('span', {}, [full, el('label', { htmlFor: fullId, textContent: ' Black out this whole page' })])
      ]),
      el('div', { className: 'page-stage' }, [preview, overlay]),
      page.manualList
    ]));
    enableDrawing(page);
    state.pages.push(page);
  }
}

async function selectFile(file) {
  if (!file || state.busy) return;
  if (file.type && file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) { say(`Not a PDF, so it was not opened: ${file.name}.`); return; }
  if (file.size > MAX_BYTES) { say(`This file is ${fmtSize(file.size)}; the limit is 50 MB.`); return; }
  state.busy = true;
  resetOutput();
  $('workArea').hidden = true;
  try {
    say('Loading the PDF reader…');
    const pdfjs = await loadPdfJs();
    if (state.task) await state.task.destroy();
    state.file = file;
    state.skipped.clear();
    state.task = openPdf(pdfjs, new Uint8Array(await file.arrayBuffer()));
    const doc = await state.task.promise;
    if (doc.numPages > MAX_PAGES) throw new Error(`This PDF has ${doc.numPages} pages; this tool handles up to ${MAX_PAGES} pages at a time. Split it first.`);
    state.doc = doc;
    $('fileName').textContent = `${file.name} · ${fmtSize(file.size)} · ${doc.numPages} page(s)`;
    await buildPages(pdfjs, doc);
    $('workArea').hidden = false;
    detect();
    say('Review the highlighted items, then create the redacted copy.');
  } catch (error) {
    const message = error?.name === 'PasswordException'
      ? 'This PDF is password-protected. Remove the password in a program you trust, then try again.'
      : error?.name === 'InvalidPDFException' ? 'This file could not be read as a PDF.' : (error?.message || 'Could not open this PDF.');
    say(message);
  } finally {
    state.busy = false;
    updateCounts();
  }
}

function resetOutput() {
  if (state.outputUrl) URL.revokeObjectURL(state.outputUrl);
  state.outputUrl = null;
  $('resultSection').hidden = true;
}

function canvasToJpeg(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? blob.arrayBuffer().then(resolve, reject) : reject(new Error('Could not encode a page image.'))), 'image/jpeg', quality);
  });
}

async function verifyOutput(pdfjs, bytes) {
  const task = openPdf(pdfjs, bytes.slice());
  try {
    const doc = await task.promise;
    let chars = 0;
    let annotations = 0;
    for (let n = 1; n <= doc.numPages; n += 1) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      chars += content.items.reduce((sum, item) => sum + (item.str || '').replace(/\s/g, '').length, 0);
      annotations += (await page.getAnnotations()).length;
    }
    return { pages: doc.numPages, chars, annotations };
  } finally {
    await task.destroy();
  }
}

async function redact() {
  if (!state.doc || state.busy) return;
  state.busy = true;
  updateCounts();
  resetOutput();
  try {
    const [pdfjs, { PDFDocument }] = await Promise.all([loadPdfJs(), import('pdf-lib')]);
    const dpi = Number($('redactDpi').value) || 150;
    const out = await PDFDocument.create();
    out.setProducer('NovaTools PDF Redact');
    out.setCreator('NovaTools PDF Redact');
    for (const page of state.pages) {
      say(`Redacting page ${page.number} of ${state.pages.length}…`);
      const viewport = page.pdfPage.getViewport({ scale: dpi / 72 });
      const canvas = el('canvas', { width: Math.ceil(viewport.width), height: Math.ceil(viewport.height) });
      await renderPage(pdfjs, page.pdfPage, canvas, viewport);
      const ctx = canvas.getContext('2d', { alpha: false });
      ctx.fillStyle = '#000000';
      if (page.fullPage) ctx.fillRect(0, 0, canvas.width, canvas.height);
      else for (const rect of selectedRects(page)) {
        const r = toViewportRect(viewport, rect);
        ctx.fillRect(Math.floor(r.x), Math.floor(r.y), Math.ceil(r.width) + 1, Math.ceil(r.height) + 1);
      }
      const jpg = await out.embedJpg(await canvasToJpeg(canvas, 0.9));
      canvas.width = 0;
      canvas.height = 0;
      const outPage = out.addPage([page.base.width, page.base.height]);
      outPage.drawImage(jpg, { x: 0, y: 0, width: page.base.width, height: page.base.height });
    }
    const bytes = await out.save();
    say('Checking the redacted file…');
    const check = await verifyOutput(pdfjs, bytes);
    state.outputUrl = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const link = $('downloadLink');
    link.href = state.outputUrl;
    link.download = `${state.file.name.replace(/\.pdf$/i, '')}-redacted.pdf`;
    const clean = check.chars === 0 && check.annotations === 0;
    $('verifyResult').textContent = clean
      ? `Checked: the redacted file has ${check.pages} page(s), no selectable text (0 characters) and no annotations or links, so the hidden content cannot be copied or searched out of it. Size: ${fmtSize(bytes.length)} (original ${fmtSize(state.file.size)}).`
      : `Warning: the output still reports ${check.chars} text character(s) and ${check.annotations} annotation(s). Do not share it; reload the page and try again.`;
    $('resultSection').hidden = false;
    $('resultSection').dataset.verified = String(clean);
    say(clean ? 'Redacted copy ready. Open it and look at every page before you share it.' : 'The check did not pass.');
    link.focus();
  } catch (error) {
    say(error?.message || 'Could not create the redacted PDF.');
  } finally {
    state.busy = false;
    updateCounts();
  }
}

function initShell() {
  const menuBtn = $('mobileMenuBtn');
  const mobileMenu = $('mobileMenu');
  if (menuBtn && mobileMenu) {
    menuBtn.addEventListener('click', () => {
      const expanded = menuBtn.getAttribute('aria-expanded') === 'true';
      menuBtn.setAttribute('aria-expanded', String(!expanded));
      mobileMenu.hidden = expanded;
      mobileMenu.classList.toggle('active', !expanded);
    });
  }
  const themeBtn = $('themeToggle');
  if (themeBtn) {
    const read = () => {
      try { return localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'); } catch { return 'dark'; }
    };
    const paint = () => {
      const theme = read();
      themeBtn.querySelector('.icon-sun').style.display = theme === 'light' ? 'none' : 'block';
      themeBtn.querySelector('.icon-moon').style.display = theme === 'dark' ? 'none' : 'block';
    };
    themeBtn.addEventListener('click', () => {
      const next = read() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch { /* storage blocked */ }
      paint();
    });
    paint();
  }
}

function init() {
  initShell();
  const dropzone = $('dropzone');
  const input = $('fileInput');
  dropzone.addEventListener('click', () => input.click());
  dropzone.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); input.click(); }
  });
  dropzone.addEventListener('dragover', (event) => { event.preventDefault(); dropzone.classList.add('drag-active'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('drag-active'));
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault();
    dropzone.classList.remove('drag-active');
    selectFile(event.dataTransfer?.files?.[0]);
  });
  input.addEventListener('change', () => selectFile(input.files?.[0]));
  $('rescanBtn').addEventListener('click', () => { if (state.pages.length) detect(); });
  document.querySelectorAll('input[name="piiType"]').forEach((box) => box.addEventListener('change', () => { if (state.pages.length) detect(); }));
  $('redactBtn').addEventListener('click', redact);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
