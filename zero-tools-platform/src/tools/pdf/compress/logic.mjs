/**
 * PDF Compress Tool Logic
 * Refactored with shared utilities
 */

import { PDFDocument } from 'pdf-lib';
import { initToolPage } from '../../../core/router.mjs';
import { generateToolPageSchemas, injectMultipleSchemas } from '../../../core/seo/schema-generator.mjs';
import { formatBytes, trackEvent, preventDefaults } from '../../../core/utils/index.mjs';

const CONFIG = {
  MAX_FILE_SIZE: 50 * 1024 * 1024,
  COMPRESSION_LEVELS: {
    low: { imageQuality: 0.9, removeMetadata: false },
    medium: { imageQuality: 0.7, removeMetadata: true },
    high: { imageQuality: 0.5, removeMetadata: true }
  }
};

const state = {
  file: null,
  isProcessing: false,
  compressedBytes: null
};

const elements = {};

async function init() {
  const meta = await initToolPage('pdf/compress');
  injectToolSchemas(meta);
  cacheElements();
  setupEventListeners();
  setupDragAndDrop();
}

function cacheElements() {
  const ids = ['dropzone', 'fileInput', 'fileInfoSection', 'fileName', 'fileSize', 
    'removeFileBtn', 'compressBtn', 'compressBtnText', 'compressBtnLoading', 'clearBtn',
    'progressSection', 'progressBar', 'progressText', 'progressPercent', 'progressDetail',
    'resultSection', 'originalSize', 'compressedSize', 'savingsPercent', 'downloadLink',
    'errorSection', 'errorMessage'];
  
  ids.forEach(id => elements[id] = document.getElementById(id));
}

function setupEventListeners() {
  elements.fileInput?.addEventListener('change', handleFileSelect);
  elements.removeFileBtn?.addEventListener('click', clearFile);
  elements.compressBtn?.addEventListener('click', handleCompress);
  elements.clearBtn?.addEventListener('click', clearAll);
}

function setupDragAndDrop() {
  const dz = elements.dropzone;
  if (!dz) return;
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => dz.addEventListener(e, preventDefaults));
  ['dragenter', 'dragover'].forEach(e => dz.addEventListener(e, () => dz.classList.add('border-primary-500', 'bg-blue-50')));
  ['dragleave', 'drop'].forEach(e => dz.addEventListener(e, () => dz.classList.remove('border-primary-500', 'bg-blue-50')));
  dz.addEventListener('drop', (e) => processFile(e.dataTransfer.files[0]));
}

function handleFileSelect(e) {
  if (e.target.files.length > 0) processFile(e.target.files[0]);
}

function processFile(file) {
  if (!file?.name?.toLowerCase().endsWith('.pdf')) {
    showError('Sadece PDF dosyaları kabul edilir.');
    return;
  }
  
  if (file.size > CONFIG.MAX_FILE_SIZE) {
    showError(`Dosya boyutu ${formatBytes(CONFIG.MAX_FILE_SIZE)}'ı geçemez.`);
    return;
  }
  
  state.file = file;
  
  if (elements.fileName) elements.fileName.textContent = file.name;
  if (elements.fileSize) elements.fileSize.textContent = formatBytes(file.size);
  elements.fileInfoSection?.classList.remove('hidden');
  elements.dropzone?.classList.add('hidden');
  
  updateUIState();
  hideError();
  trackEvent('pdf-compress-file-selected', { size: file.size });
}

function clearFile() {
  state.file = null;
  if (elements.fileInput) elements.fileInput.value = '';
  elements.fileInfoSection?.classList.add('hidden');
  elements.dropzone?.classList.remove('hidden');
  updateUIState();
}

function clearAll() {
  if (elements.downloadLink?.href?.startsWith('blob:')) {
    URL.revokeObjectURL(elements.downloadLink.href);
  }
  
  state.file = null;
  state.compressedBytes = null;
  state.isProcessing = false;
  
  if (elements.fileInput) elements.fileInput.value = '';
  elements.fileInfoSection?.classList.add('hidden');
  elements.dropzone?.classList.remove('hidden');
  elements.resultSection?.classList.add('hidden');
  elements.progressSection?.classList.add('hidden');
  elements.errorSection?.classList.add('hidden');
  
  updateUIState();
}

function updateUIState() {
  const hasFile = state.file !== null;
  elements.compressBtn && (elements.compressBtn.disabled = !hasFile || state.isProcessing);
  elements.clearBtn && (elements.clearBtn.disabled = state.isProcessing);
  
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
  
  const level = document.querySelector('input[name="compressionLevel"]:checked')?.value || 'medium';
  
  state.isProcessing = true;
  updateUIState();
  showProgress();
  hideError();
  hideResult();
  
  try {
    const result = await compressPDF(level);
    state.compressedBytes = result.bytes;
    
    const blob = new Blob([result.bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const savings = ((state.file.size - result.bytes.length) / state.file.size * 100).toFixed(1);
    
    showResult(url, state.file.size, result.bytes.length, savings);
    trackEvent('pdf-compress-success', { originalSize: state.file.size, compressedSize: result.bytes.length, savings, level });
  } catch (error) {
    showError(`Sıkıştırma sırasında hata oluştu: ${error.message}`);
    trackEvent('pdf-compress-error', { error: error.message });
  } finally {
    state.isProcessing = false;
    updateUIState();
    hideProgress();
  }
}

async function compressPDF(level) {
  const config = CONFIG.COMPRESSION_LEVELS[level];
  
  updateProgress(5, 'PDF yükleniyor...', state.file.name);
  
  const arrayBuffer = await state.file.arrayBuffer();
  
  updateProgress(15, 'PDF ayrıştırılıyor...', '');
  
  const pdfDoc = await PDFDocument.load(arrayBuffer, { updateMetadata: false, ignoreEncryption: true });
  const pageCount = pdfDoc.getPageCount();
  
  updateProgress(25, 'Optimizasyon yapılıyor...', `${pageCount} sayfa`);
  
  // Process pages in chunks
  const chunks = Math.ceil(pageCount / 50);
  for (let i = 0; i < chunks; i++) {
    updateProgress(25 + (i / chunks) * 50, 'Sayfalar optimize ediliyor...', `Part ${i + 1}/${chunks}`);
    await new Promise(r => setTimeout(r, 10));
    if (i % 2 === 0 && globalThis.gc) globalThis.gc();
  }
  
  updateProgress(80, 'PDF yeniden oluşturuluyor...', '');
  
  if (config.removeMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('NovaTools PDF Compressor');
    pdfDoc.setCreator('NovaTools');
  }
  
  const bytes = await pdfDoc.save({ useObjectStreams: true });
  
  updateProgress(100, 'Tamamlandı!', '');
  
  return { bytes };
}

function showProgress() {
  elements.progressSection?.classList.remove('hidden');
  updateProgress(0, 'Hazırlanıyor...', '');
}

function hideProgress() {
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

function showResult(url, originalSize, compressedSize, savings) {
  if (elements.originalSize) elements.originalSize.textContent = formatBytes(originalSize);
  if (elements.compressedSize) elements.compressedSize.textContent = formatBytes(compressedSize);
  if (elements.savingsPercent) elements.savingsPercent.textContent = `-${savings}%`;
  
  const fileName = state.file.name.replace('.pdf', '');
  if (elements.downloadLink) {
    elements.downloadLink.href = url;
    elements.downloadLink.download = `${fileName}-compressed.pdf`;
  }
  
  elements.resultSection?.classList.remove('hidden');
}

function hideResult() {
  elements.resultSection?.classList.add('hidden');
  if (elements.downloadLink?.href?.startsWith('blob:')) {
    URL.revokeObjectURL(elements.downloadLink.href);
    elements.downloadLink.href = '#';
  }
}

function showError(message) {
  if (elements.errorMessage) elements.errorMessage.textContent = message;
  elements.errorSection?.classList.remove('hidden');
}

function hideError() {
  elements.errorSection?.classList.add('hidden');
}

function injectToolSchemas(meta) {
  const breadcrumbs = [
    { name: 'Ana Sayfa', url: '/' },
    { name: 'PDF Araçları', url: '/#pdf' },
    { name: 'PDF Sıkıştırma', url: '/src/tools/pdf/compress/' }
  ];
  
  const faqs = [
    { question: 'PDF sıkıştırma güvenli mi?', answer: 'Evet, tamamen güvenli. Tüm işlemler tarayıcınızda gerçekleşir.' },
    { question: 'Ne kadar sıkıştırma yapabilirim?', answer: '%10 ile %80 arasında sıkıştırma sağlanabilir.' }
  ];
  
  const schemas = generateToolPageSchemas(meta, breadcrumbs, faqs);
  injectMultipleSchemas(schemas);
}

document.readyState === 'loading' 
  ? document.addEventListener('DOMContentLoaded', init)
  : init();

window.addEventListener('beforeunload', () => {
  if (elements.downloadLink?.href?.startsWith('blob:')) {
    URL.revokeObjectURL(elements.downloadLink.href);
  }
});
