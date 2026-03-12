/**
 * PDF Merge Tool Logic
 * Refactored with shared utilities
 */

import { PDFDocument } from 'pdf-lib';
import { initToolPage } from '../../../core/router.mjs';
import { generateToolPageSchemas, injectMultipleSchemas } from '../../../core/seo/schema-generator.mjs';
import { formatBytes, generateId, trackEvent, preventDefaults } from '../../../core/utils/index.mjs';

const CONFIG = {
  MAX_FILES: 20,
  MAX_TOTAL_SIZE: 50 * 1024 * 1024,
  CHUNK_SIZE: 50,
  ALLOWED_TYPES: ['application/pdf', '.pdf']
};

const state = {
  files: [],
  isProcessing: false,
  abortController: null
};

const elements = {};

async function init() {
  const meta = await initToolPage('pdf/merge');
  injectToolSchemas(meta);
  cacheElements();
  setupEventListeners();
  setupDragAndDrop();
}

function cacheElements() {
  const ids = ['dropzone', 'fileInput', 'fileListSection', 'fileList', 'fileCount', 'sortOrder',
    'outputName', 'mergeBtn', 'mergeBtnText', 'mergeBtnLoading', 'clearBtn',
    'progressSection', 'progressBar', 'progressText', 'progressPercent', 'progressDetail',
    'downloadSection', 'downloadLink', 'resultInfo', 'errorSection', 'errorMessage'];
  
  ids.forEach(id => elements[id] = document.getElementById(id));
}

function setupEventListeners() {
  elements.fileInput?.addEventListener('change', handleFileSelect);
  elements.sortOrder?.addEventListener('change', handleSortChange);
  elements.mergeBtn?.addEventListener('click', handleMerge);
  elements.clearBtn?.addEventListener('click', clearAll);
  
  document.getElementById('dropzone')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      elements.fileInput?.click();
    }
  });
}

function setupDragAndDrop() {
  const dz = elements.dropzone;
  if (!dz) return;
  
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(e => dz.addEventListener(e, preventDefaults));
  ['dragenter', 'dragover'].forEach(e => dz.addEventListener(e, () => dz.classList.add('border-primary-500', 'bg-blue-50')));
  ['dragleave', 'drop'].forEach(e => dz.addEventListener(e, () => dz.classList.remove('border-primary-500', 'bg-blue-50')));
  dz.addEventListener('drop', handleDrop);
}

function handleDrop(e) {
  handleFiles(e.dataTransfer.files);
}

function handleFileSelect(e) {
  handleFiles(e.target.files);
}

async function handleFiles(fileList) {
  const newFiles = Array.from(fileList);
  
  const validation = validateFiles(newFiles);
  if (!validation.valid) {
    showError(validation.error);
    return;
  }
  
  for (const file of newFiles) {
    const isDuplicate = state.files.some(f => f.name === file.name && f.size === file.size);
    if (!isDuplicate) {
      state.files.push({
        id: generateId('file'),
        file,
        name: file.name,
        size: file.size,
        pageCount: null
      });
    }
  }
  
  await updatePageCounts();
  renderFileList();
  updateUIState();
  hideError();
  trackEvent('pdf-merge-files-added', { count: newFiles.length });
}

function validateFiles(files) {
  if (state.files.length + files.length > CONFIG.MAX_FILES) {
    return { valid: false, error: `En fazla ${CONFIG.MAX_FILES} dosya yükleyebilirsiniz.` };
  }
  
  const currentSize = state.files.reduce((sum, f) => sum + f.size, 0);
  const newSize = files.reduce((sum, f) => sum + f.size, 0);
  
  if (currentSize + newSize > CONFIG.MAX_TOTAL_SIZE) {
    return { valid: false, error: `Toplam dosya boyutu ${formatBytes(CONFIG.MAX_TOTAL_SIZE)}'ı geçemez.` };
  }
  
  for (const file of files) {
    if (!CONFIG.ALLOWED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
      return { valid: false, error: `"${file.name}" geçersiz dosya türü.` };
    }
  }
  
  return { valid: true };
}

async function updatePageCounts() {
  for (const fileData of state.files) {
    if (fileData.pageCount === null) {
      try {
        const arrayBuffer = await fileData.file.arrayBuffer();
        const pdf = await PDFDocument.load(arrayBuffer, { updateMetadata: false });
        fileData.pageCount = pdf.getPageCount();
      } catch {
        fileData.pageCount = '?';
      }
    }
  }
}

function renderFileList() {
  if (!elements.fileListSection || !elements.fileList) return;
  
  if (state.files.length === 0) {
    elements.fileListSection.classList.add('hidden');
    return;
  }
  
  elements.fileListSection.classList.remove('hidden');
  elements.fileCount.textContent = `(${state.files.length})`;
  
  elements.fileList.innerHTML = state.files.map((fileData, index) => `
    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200 group hover:border-primary-300" data-id="${fileData.id}" draggable="${elements.sortOrder?.value === 'manual'}" role="listitem">
      <div class="flex-shrink-0 w-8 h-8 bg-red-100 rounded flex items-center justify-center"><svg class="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z"/></svg></div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-gray-900 truncate" title="${fileData.name}">${fileData.name}</p>
        <p class="text-xs text-gray-500">${formatBytes(fileData.size)} • ${fileData.pageCount || '?'} sayfa</p>
      </div>
      <button type="button" class="p-1 text-gray-400 hover:text-red-600" onclick="window.removeFile('${fileData.id}')" aria-label="Kaldır">×</button>
    </div>
  `).join('');
}

window.removeFile = function(id) {
  state.files = state.files.filter(f => f.id !== id);
  renderFileList();
  updateUIState();
  trackEvent('pdf-merge-file-removed', {});
};

function handleSortChange() {
  const sortType = elements.sortOrder?.value;
  
  switch (sortType) {
    case 'name': state.files.sort((a, b) => a.name.localeCompare(b.name)); break;
    case 'size': state.files.sort((a, b) => b.size - a.size); break;
  }
  
  renderFileList();
}

function updateUIState() {
  const hasFiles = state.files.length > 0;
  const minFiles = state.files.length >= 2;
  
  if (elements.mergeBtn) {
    elements.mergeBtn.disabled = !minFiles || state.isProcessing;
  }
  if (elements.clearBtn) {
    elements.clearBtn.disabled = state.isProcessing;
  }
  
  if (state.isProcessing) {
    elements.mergeBtnText?.classList.add('hidden');
    elements.mergeBtnLoading?.classList.remove('hidden');
  } else {
    elements.mergeBtnText?.classList.remove('hidden');
    elements.mergeBtnLoading?.classList.add('hidden');
  }
}

function clearAll() {
  if (state.abortController) state.abortController.abort();
  
  if (elements.downloadLink?.href?.startsWith('blob:')) {
    URL.revokeObjectURL(elements.downloadLink.href);
  }
  
  state.files = [];
  state.isProcessing = false;
  
  if (elements.fileInput) elements.fileInput.value = '';
  if (elements.outputName) elements.outputName.value = 'birlesik-pdf';
  
  elements.fileListSection?.classList.add('hidden');
  elements.progressSection?.classList.add('hidden');
  elements.downloadSection?.classList.add('hidden');
  elements.errorSection?.classList.add('hidden');
  
  updateUIState();
}

async function handleMerge() {
  if (state.files.length < 2) {
    showError('Birleştirmek için en az 2 dosya gerekli.');
    return;
  }
  
  state.isProcessing = true;
  state.abortController = new AbortController();
  
  updateUIState();
  showProgress();
  hideError();
  hideDownload();
  
  try {
    const outputName = elements.outputName?.value?.trim() || 'birlesik-pdf';
    const result = await mergePDFsChunked(outputName);
    
    const blob = new Blob([result.bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    
    showDownload(url, outputName, result.totalPages, result.totalSize);
    trackEvent('pdf-merge-success', { fileCount: state.files.length, totalPages: result.totalPages });
  } catch (error) {
    if (error.name !== 'AbortError') {
      showError(`Birleştirme sırasında hata oluştu: ${error.message}`);
      trackEvent('pdf-merge-error', { error: error.message });
    }
  } finally {
    state.isProcessing = false;
    state.abortController = null;
    updateUIState();
    hideProgress();
  }
}

async function mergePDFsChunked(outputName) {
  updateProgress(5, 'PDF\'ler analiz ediliyor...', `${state.files.length} dosya`);
  
  const fileData = [];
  let totalPages = 0;
  
  for (let i = 0; i < state.files.length; i++) {
    const arrayBuffer = await state.files[i].file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer, { updateMetadata: false });
    const pageCount = pdf.getPageCount();
    
    totalPages += pageCount;
    fileData.push({ arrayBuffer, pageCount });
    updateProgress(5 + (i + 1) / state.files.length * 10, 'PDF\'ler analiz ediliyor...', `${i + 1}/${state.files.length}`);
  }
  
  const mergedPdf = await PDFDocument.create();
  
  for (let i = 0; i < fileData.length; i++) {
    const { arrayBuffer, pageCount } = fileData[i];
    const pdf = await PDFDocument.load(arrayBuffer);
    
    updateProgress(25 + (i / fileData.length) * 50, 'Sayfalar birleştiriliyor...', `Dosya ${i + 1}/${fileData.length}`);
    
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      const [page] = await mergedPdf.copyPages(pdf, [pageIndex]);
      mergedPdf.addPage(page);
    }
    
    if (i % 2 === 0 && globalThis.gc) globalThis.gc();
  }
  
  updateProgress(95, 'PDF oluşturuluyor...', '');
  
  const bytes = await mergedPdf.save({ useObjectStreams: true });
  
  updateProgress(100, 'Tamamlandı!', `${totalPages} sayfa birleştirildi`);
  
  return { bytes, totalPages, totalSize: bytes.length };
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

function showDownload(url, filename, totalPages, totalSize) {
  if (elements.downloadLink) {
    elements.downloadLink.href = url;
    elements.downloadLink.download = `${filename}.pdf`;
  }
  if (elements.resultInfo) {
    elements.resultInfo.textContent = `${state.files.length} dosya, ${totalPages} sayfa, ${formatBytes(totalSize)}`;
  }
  elements.downloadSection?.classList.remove('hidden');
  elements.downloadSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideDownload() {
  elements.downloadSection?.classList.add('hidden');
  if (elements.downloadLink?.href?.startsWith('blob:')) {
    URL.revokeObjectURL(elements.downloadLink.href);
    elements.downloadLink.href = '#';
  }
}

function showError(message) {
  if (elements.errorMessage) elements.errorMessage.textContent = message;
  elements.errorSection?.classList.remove('hidden');
  elements.errorSection?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
  elements.errorSection?.classList.add('hidden');
}

function injectToolSchemas(meta) {
  const breadcrumbs = [
    { name: 'Ana Sayfa', url: '/' },
    { name: 'PDF Araçları', url: '/#pdf' },
    { name: 'PDF Birleştirme', url: '/src/tools/pdf/merge/' }
  ];
  
  const faqs = [
    { question: 'PDF birleştirme güvenli mi?', answer: 'Evet, tamamen güvenli. Tüm işlemler tarayıcınızda gerçekleşir.' },
    { question: 'En fazla kaç PDF birleştirebilirim?', answer: 'Tek seferde en fazla 20 PDF dosyasını birleştirebilirsiniz.' },
    { question: 'Form içeren PDF\'leri birleştirebilir miyim?', answer: 'Evet, form alanları korunarak birleştirilir.' }
  ];
  
  const schemas = generateToolPageSchemas(meta, breadcrumbs, faqs, {
    name: 'PDF Dosyaları Nasıl Birleştirilir?',
    description: 'Birden fazla PDF dosyasını tek bir dosyada birleştirme rehberi',
    totalTime: 'PT5M',
    steps: [
      { name: 'Dosyaları Yükleyin', text: 'PDF dosyalarınızı yükleyin', url: 'https://novatools.dev/src/tools/pdf/merge/#step1' },
      { name: 'Sıralamayı Ayarlayın', text: 'Dosyaları istediğiniz sırada düzenleyin', url: 'https://novatools.dev/src/tools/pdf/merge/#step2' },
      { name: 'Birleştirin', text: 'PDF\'leri birleştirin', url: 'https://novatools.dev/src/tools/pdf/merge/#step3' },
      { name: 'İndirin', text: 'Birleştirilmiş dosyayı indirin', url: 'https://novatools.dev/src/tools/pdf/merge/#step4' }
    ]
  });
  
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
