/**
 * PDF Compressor
 * Performs a structural pdf-lib rewrite in the browser.
 * This does not downsample page images or guarantee a smaller output.
 */

import { PDFDocument } from 'pdf-lib';
import { loadToolMeta } from '../../../core/router.mjs';
import { generateToolPageSchemas, injectMultipleSchemas } from '../../../core/seo/schema-generator.mjs';
import { formatBytes, trackEvent, preventDefaults } from '../../../core/utils/index.mjs';

const CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024
};

const state = {
  file: null,
  isProcessing: false,
  compressedBytes: null
};

const elements = {};

async function init() {
  const meta = await loadToolMeta('pdf/compress');
  if (meta) injectToolSchemas(meta);
  cacheElements();
  bindAliases();
  normalizeCompressionUi();
  setupEventListeners();
  setupDragAndDrop();
  setState('empty');
  updateUIState();
}

function cacheElements() {
  const ids = ['compressForm', 'dropzone', 'fileInput', 'fileInfoSection', 'fileInfoCard', 'fileName', 'fileSize',
    'removeFileBtn', 'compressBtn', 'compressBtnText', 'compressBtnLoading', 'clearBtn', 'compressAnother',
    'progressSection', 'progressBar', 'progressFill', 'progressText', 'progressPercent', 'progressDetail',
    'resultSection', 'originalSize', 'compressedSize', 'savingsPercent', 'downloadLink',
    'errorSection', 'errorMessage', 'qualityInput', 'compressStatusRegion',
    'emptyState', 'loadingState', 'successState'];

  elements.compressForm = document.querySelector('form[data-tool="pdf-compress"]');
  ids.forEach((id) => { elements[id] = document.getElementById(id); });
}

function bindAliases() {
  elements.fileInfoSection = elements.fileInfoSection || elements.fileInfoCard;
  elements.progressBar = elements.progressBar || elements.progressFill;
}

function normalizeCompressionUi() {
  const selector = document.getElementById('qualitySelector');
  const label = selector?.querySelector('label');
  const options = selector?.querySelector('.quality-options');
  const statLabels = document.querySelectorAll('.compression-stats .stat-label');

  if (label) label.textContent = 'Optimization mode';
  if (options) {
    options.innerHTML = `
      <div class="quality-option selected" data-quality="structural" aria-current="true">
        <div class="icon">🧩</div>
        <div class="label">Structural optimization</div>
        <div class="desc">Rewrites PDF structure with object streams. Page images are not downsampled, so the result may be smaller, similar in size, or larger.</div>
      </div>`;
    options.style.gridTemplateColumns = '1fr';
  }
  if (elements.qualityInput) elements.qualityInput.value = 'structural';
  if (statLabels[1]) statLabels[1].textContent = 'Output';
  if (statLabels[2]) statLabels[2].textContent = 'Size change';
}

function setupEventListeners() {
  elements.fileInput?.addEventListener('change', handleFileSelect);
  elements.removeFileBtn?.addEventListener('click', clearFile);
  if (elements.compressForm) {
    elements.compressForm.addEventListener('submit', (event) => {
      event.preventDefault();
      handleCompress();
    });
  } else {
    elements.compressBtn?.addEventListener('click', handleCompress);
  }
  elements.clearBtn?.addEventListener('click', clearAll);
  elements.compressAnother?.addEventListener('click', clearAll);
}

function setupDragAndDrop() {
  const dz = elements.dropzone;
  const fileInput = elements.fileInput;
  if (!dz || !fileInput) return;

  dz.addEventListener('click', (event) => {
    if (event.target !== fileInput) fileInput.click();
  });

  dz.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      fileInput.click();
    }
  });

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach((eventName) => dz.addEventListener(eventName, preventDefaults));
  ['dragenter', 'dragover'].forEach((eventName) => dz.addEventListener(eventName, () => dz.classList.add('border-primary-500', 'bg-blue-50')));
  ['dragleave', 'drop'].forEach((eventName) => dz.addEventListener(eventName, () => dz.classList.remove('border-primary-500', 'bg-blue-50')));
  dz.addEventListener('drop', (event) => processFile(event.dataTransfer.files[0]));
}

function handleFileSelect(event) {
  if (event.target.files.length > 0) processFile(event.target.files[0]);
}

function fileSizeBucket(bytes) {
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return '<1MB';
  if (mb < 5) return '1-5MB';
  if (mb < 20) return '5-20MB';
  if (mb < 50) return '20-50MB';
  return '50MB+';
}

function processFile(file) {
  if (!file?.name?.toLowerCase().endsWith('.pdf')) {
    showError('Only PDF files are accepted.');
    return;
  }

  if (file.size > CONFIG.MAX_FILE_SIZE) {
    showError(`File size cannot exceed ${formatBytes(CONFIG.MAX_FILE_SIZE)}.`);
    return;
  }

  state.file = file;

  if (elements.fileName) elements.fileName.textContent = file.name;
  if (elements.fileSize) elements.fileSize.textContent = formatBytes(file.size);
  elements.fileInfoSection?.classList.remove('hidden');
  elements.fileInfoSection?.classList.add('visible');
  elements.dropzone?.classList.add('hidden');

  updateUIState();
  hideError();
  setState('empty');
  trackEvent('pdf-compress-file-selected', { fileSizeBucket: fileSizeBucket(file.size) });
}

function clearFile() {
  state.file = null;
  if (elements.fileInput) elements.fileInput.value = '';
  elements.fileInfoSection?.classList.add('hidden');
  elements.fileInfoSection?.classList.remove('visible');
  elements.dropzone?.classList.remove('hidden');
  updateUIState();
  setState('empty');
}

function clearAll() {
  if (elements.downloadLink?.href?.startsWith('blob:')) URL.revokeObjectURL(elements.downloadLink.href);

  state.file = null;
  state.compressedBytes = null;
  state.isProcessing = false;

  if (elements.fileInput) elements.fileInput.value = '';
  elements.fileInfoSection?.classList.add('hidden');
  elements.fileInfoSection?.classList.remove('visible');
  elements.dropzone?.classList.remove('hidden');
  elements.resultSection?.classList.add('hidden');
  hideProgress();
  hideError();

  updateUIState();
  setState('empty');
}

function updateUIState() {
  const hasFile = state.file !== null;
  if (elements.compressBtn) elements.compressBtn.disabled = !hasFile || state.isProcessing;
  if (elements.clearBtn) elements.clearBtn.disabled = state.isProcessing;

  if (state.isProcessing) {
    elements.compressBtnText?.classList.add('hidden');
    elements.compressBtnLoading?.classList.remove('hidden');
  } else {
    elements.compressBtnText?.classList.remove('hidden');
    elements.compressBtnLoading?.classList.add('hidden');
  }
}

async function handleCompress() {
  if (!state.file) return;

  state.isProcessing = true;
  updateUIState();
  setState('loading');
  showProgress();
  hideError();
  hideResult();

  try {
    const result = await compressPDF();
    state.compressedBytes = result.bytes;

    const blob = new Blob([result.bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const percentChange = ((result.bytes.length - state.file.size) / state.file.size) * 100;

    showResult(url, state.file.size, result.bytes.length, percentChange);
    setState('success');
    trackEvent('pdf-compress-success', {
      originalSizeBucket: fileSizeBucket(state.file.size),
      outputSizeBucket: fileSizeBucket(result.bytes.length),
      sizeChangeDirection: percentChange < -0.05 ? 'smaller' : percentChange > 0.05 ? 'larger' : 'similar',
      mode: 'structural'
    });
  } catch (error) {
    showError('The PDF could not be optimized. Check that the file is valid and not protected, then try again.');
    setState('error');
    trackEvent('pdf-compress-error', { errorCode: error?.name || 'PDF_OPTIMIZATION_FAILED' });
  } finally {
    state.isProcessing = false;
    updateUIState();
    hideProgress();
  }
}

async function compressPDF() {
  updateProgress(5, 'Loading PDF...', '');
  const arrayBuffer = await state.file.arrayBuffer();

  updateProgress(15, 'Parsing PDF...', '');
  const pdfDoc = await PDFDocument.load(arrayBuffer, { updateMetadata: false, ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();

  updateProgress(25, 'Preparing structural rewrite...', `${pageCount} pages`);
  const chunks = Math.max(1, Math.ceil(pageCount / 50));
  for (let index = 0; index < chunks; index += 1) {
    updateProgress(25 + (index / chunks) * 50, 'Preparing pages...', `Part ${index + 1}/${chunks}`);
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  updateProgress(80, 'Rewriting PDF structure...', '');
  const bytes = await pdfDoc.save({ useObjectStreams: true });
  updateProgress(100, 'Complete', '');
  return { bytes };
}

function showProgress() {
  elements.progressSection?.classList.add('visible');
  elements.progressSection?.classList.remove('hidden');
  updateProgress(0, 'Preparing...', '');
}

function hideProgress() {
  elements.progressSection?.classList.remove('visible');
  elements.progressSection?.classList.add('hidden');
}

function updateProgress(percent, text, detail) {
  if (elements.progressBar) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.setAttribute('aria-valuenow', Math.round(percent));
  }
  if (elements.progressText) elements.progressText.textContent = text;
  if (elements.progressPercent) elements.progressPercent.textContent = `${Math.round(percent)}%`;
  if (elements.progressDetail) elements.progressDetail.textContent = detail;
}

function sizeChangeLabel(percentChange) {
  if (percentChange < -0.05) return `${Math.abs(percentChange).toFixed(1)}% smaller`;
  if (percentChange > 0.05) return `${percentChange.toFixed(1)}% larger`;
  return 'Similar size';
}

function showResult(url, originalSize, outputSize, percentChange) {
  if (elements.originalSize) elements.originalSize.textContent = formatBytes(originalSize);
  if (elements.compressedSize) elements.compressedSize.textContent = formatBytes(outputSize);
  if (elements.savingsPercent) {
    elements.savingsPercent.textContent = sizeChangeLabel(percentChange);
    elements.savingsPercent.classList.toggle('savings', percentChange < -0.05);
  }

  const fileName = state.file.name.replace(/\.pdf$/i, '');
  if (elements.downloadLink) {
    elements.downloadLink.href = url;
    elements.downloadLink.download = `${fileName}-optimized.pdf`;
  }

  elements.resultSection?.classList.add('visible');
  elements.resultSection?.classList.remove('hidden');
}

function hideResult() {
  elements.resultSection?.classList.remove('visible');
  elements.resultSection?.classList.add('hidden');
  if (elements.downloadLink?.href?.startsWith('blob:')) {
    URL.revokeObjectURL(elements.downloadLink.href);
    elements.downloadLink.href = '#';
  }
}

function showError(message) {
  if (elements.errorMessage) elements.errorMessage.textContent = message;
  else if (elements.errorSection) elements.errorSection.textContent = message;
  elements.errorSection?.classList.add('visible');
  elements.errorSection?.classList.remove('hidden');
}

function hideError() {
  if (elements.errorMessage) elements.errorMessage.textContent = '';
  else if (elements.errorSection) elements.errorSection.textContent = '';
  elements.errorSection?.classList.remove('visible');
  elements.errorSection?.classList.add('hidden');
}

function setState(next) {
  const states = {
    empty: elements.emptyState,
    loading: elements.loadingState,
    success: elements.successState
  };

  Object.values(states).forEach((element) => element?.classList.remove('visible'));
  if (states[next]) states[next].classList.add('visible');

  if (elements.compressStatusRegion) {
    const messageMap = {
      empty: elements.emptyState?.textContent?.trim() || 'Ready for one PDF file.',
      loading: elements.loadingState?.textContent?.trim() || 'PDF optimization is in progress.',
      success: 'PDF structural optimization finished. Compare the output size and review the document before using it.',
      error: 'PDF optimization failed. Check the error details.'
    };
    elements.compressStatusRegion.textContent = messageMap[next] || '';
  }
}

function injectToolSchemas(meta) {
  const breadcrumbs = [
    { name: 'Home', url: '/' },
    { name: 'PDF Tools', url: '/#pdf' },
    { name: 'PDF Compressor', url: '/tools/pdf/compress/' }
  ];

  const faqs = [
    {
      question: 'Are PDF files uploaded to NovaTools for this operation?',
      answer: 'No. The PDF is read and rewritten in your browser for this operation. Review the page privacy notes for unrelated analytics or advertising services.'
    },
    {
      question: 'How much smaller will my PDF become?',
      answer: 'There is no guaranteed reduction. This tool performs a structural rewrite with pdf-lib and does not downsample page images, so some PDFs become smaller while others stay similar in size or become larger.'
    }
  ];

  const schemas = generateToolPageSchemas(meta, breadcrumbs, faqs);
  injectMultipleSchemas(schemas);
}

document.readyState === 'loading'
  ? document.addEventListener('DOMContentLoaded', init)
  : init();

window.addEventListener('beforeunload', () => {
  if (elements.downloadLink?.href?.startsWith('blob:')) URL.revokeObjectURL(elements.downloadLink.href);
});
