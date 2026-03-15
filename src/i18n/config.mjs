/**
 * Internationalization Configuration
 * Zero-Cookie i18n for GDPR exemption
 */

export const I18N_CONFIG = {
  // Default locale
  defaultLocale: 'tr',
  
  // Supported locales
  locales: ['tr', 'en'],
  
  // Locale metadata
  metadata: {
    tr: {
      name: 'Türkçe',
      dir: 'ltr',
      flag: '🇹🇷',
      domain: 'zerotools.dev',
      hreflang: 'tr-TR',
      googleSite: 'zerotools_dev_tr'
    },
    en: {
      name: 'English',
      dir: 'ltr',
      flag: '🇬🇧',
      domain: 'zerotools.dev',
      hreflang: 'en-US',
      googleSite: 'zerotools_dev_en'
    }
  },
  
  // Path-based routing (no cookies/subdomains)
  routing: {
    type: 'path',
    prefix: true // /en/tools/ vs /tools/
  }
};

/**
 * Get user's preferred locale from browser
 */
export function detectLocale() {
  // Check URL path first
  const pathMatch = window.location.pathname.match(/^\/(tr|en)\//);
  if (pathMatch) return pathMatch[1];
  
  // Check localStorage (explicit user choice)
  try {
    const stored = localStorage.getItem('novatools_locale');
    if (stored && I18N_CONFIG.locales.includes(stored)) {
      return stored;
    }
  } catch (e) { /* ignore */ }
  
  // Check browser language
  const browserLang = navigator.language || navigator.userLanguage;
  if (browserLang.startsWith('tr')) return 'tr';
  if (browserLang.startsWith('en')) return 'en';
  
  // Default
  return I18N_CONFIG.defaultLocale;
}

/**
 * Set locale preference (stored in localStorage only)
 */
export function setLocale(locale) {
  if (!I18N_CONFIG.locales.includes(locale)) return false;
  
  try {
    localStorage.setItem('novatools_locale', locale);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Get translation for key
 */
export function t(key, locale = detectLocale()) {
  const translations = TRANSLATIONS[locale] || TRANSLATIONS[I18N_CONFIG.defaultLocale];
  return translations[key] || key;
}

/**
 * Generate hreflang tags for SEO
 */
export function generateHreflangTags(currentPath) {
  const baseUrl = 'https://novatools.dev';
  const tags = [];
  
  // x-default
  tags.push(`<link rel="alternate" hreflang="x-default" href="${baseUrl}${currentPath}">`);
  
  // Each locale
  I18N_CONFIG.locales.forEach(locale => {
    const path = locale === I18N_CONFIG.defaultLocale 
      ? currentPath 
      : `/${locale}${currentPath}`;
    
    tags.push(
      `<link rel="alternate" hreflang="${I18N_CONFIG.metadata[locale].hreflang}" href="${baseUrl}${path}">`
    );
  });
  
  return tags.join('\n');
}

/**
 * Inject hreflang tags into document head
 */
export function injectHreflangTags(currentPath) {
  // Remove existing hreflang tags
  document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(el => el.remove());
  
  // Inject new tags
  const tags = generateHreflangTags(currentPath);
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = tags;
  
  while (tempDiv.firstChild) {
    document.head.appendChild(tempDiv.firstChild);
  }
}

// Translations
const TRANSLATIONS = {
  tr: {
    // Navigation
    'nav.home': 'Ana Sayfa',
    'nav.finance': 'Finans',
    'nav.pdf': 'PDF',
    'nav.image': 'Görsel',
    'nav.dev': 'Geliştirici',
    
    // Common
    'common.privacyBadge': 'Zero Server',
    'common.safeAndPrivate': 'Güvenli ve Gizli',
    'common.filesNeverLeave': 'Dosyalarınız asla sunucularımıza gönderilmez',
    'common.processingInBrowser': 'Tüm işlemler tarayıcınızda gerçekleşir',
    'common.free': 'Ücretsiz',
    'common.loading': 'Yükleniyor...',
    'common.error': 'Bir hata oluştu',
    'common.success': 'Başarılı!',
    
    // File operations
    'file.select': 'Dosya Seç',
    'file.drop': 'veya dosyaları buraya sürükleyin',
    'file.maxSize': 'Maks. 50 MB',
    'file.maxFiles': 'En fazla 20 dosya',
    'file.dragDrop': 'Sürükle ve Bırak',
    
    // Buttons
    'btn.merge': 'PDF\'leri Birleştir',
    'btn.compress': 'Sıkıştır',
    'btn.download': 'İndir',
    'btn.clear': 'Temizle',
    'btn.processing': 'İşleniyor...',
    
    // PDF Merger
    'merge.title': 'PDF Birleştirme',
    'merge.description': 'Birden fazla PDF dosyasını tek bir dosyada birleştirin',
    'merge.sortOrder': 'Sıralama Düzeni',
    'merge.outputName': 'Çıktı Dosya Adı',
    
    // PDF Compressor
    'compress.title': 'PDF Sıkıştırma',
    'compress.description': 'PDF dosya boyutunu kalite kaybetmeden küçültün',
    'compress.level': 'Sıkıştırma Seviyesi',
    'compress.low': 'Düşük (Kalite öncelikli)',
    'compress.medium': 'Orta (Dengeli)',
    'compress.high': 'Yüksek (Maksimum sıkıştırma)',
    'compress.originalSize': 'Orijinal Boyut',
    'compress.compressedSize': 'Sıkıştırılmış',
    'compress.savings': 'Tasarruf',
    
    // Tool Request
    'request.title': 'Yeni Araç Öner',
    'request.toolName': 'Araç Adı',
    'request.category': 'Kategori',
    'request.description': 'Açıklama',
    'request.submit': 'Öneriyi Gönder',
    
    // SEO
    'seo.homeTitle': 'NovaTools - Gizlilik Öncelikli Ücretsiz Online Araçlar',
    'seo.homeDesc': 'Verileriniz tarayıcınızda kalır. PDF birleştirme, konut kredi hesaplama ve daha fazlası.'
  },
  
  en: {
    // Navigation
    'nav.home': 'Home',
    'nav.finance': 'Finance',
    'nav.pdf': 'PDF',
    'nav.image': 'Image',
    'nav.dev': 'Developer',
    
    // Common
    'common.privacyBadge': 'Zero Server',
    'common.safeAndPrivate': 'Safe & Private',
    'common.filesNeverLeave': 'Your files never leave your browser',
    'common.processingInBrowser': 'All processing happens in your browser',
    'common.free': 'Free',
    'common.loading': 'Loading...',
    'common.error': 'An error occurred',
    'common.success': 'Success!',
    
    // File operations
    'file.select': 'Select Files',
    'file.drop': 'or drag and drop files here',
    'file.maxSize': 'Max 50 MB',
    'file.maxFiles': 'Up to 20 files',
    'file.dragDrop': 'Drag & Drop',
    
    // Buttons
    'btn.merge': 'Merge PDFs',
    'btn.compress': 'Compress',
    'btn.download': 'Download',
    'btn.clear': 'Clear',
    'btn.processing': 'Processing...',
    
    // PDF Merger
    'merge.title': 'PDF Merger',
    'merge.description': 'Merge multiple PDF files into one document',
    'merge.sortOrder': 'Sort Order',
    'merge.outputName': 'Output Filename',
    
    // PDF Compressor
    'compress.title': 'PDF Compressor',
    'compress.description': 'Reduce PDF file size without quality loss',
    'compress.level': 'Compression Level',
    'compress.low': 'Low (Quality priority)',
    'compress.medium': 'Medium (Balanced)',
    'compress.high': 'High (Maximum compression)',
    'compress.originalSize': 'Original Size',
    'compress.compressedSize': 'Compressed',
    'compress.savings': 'Savings',
    
    // Tool Request
    'request.title': 'Request New Tool',
    'request.toolName': 'Tool Name',
    'request.category': 'Category',
    'request.description': 'Description',
    'request.submit': 'Submit Request',
    
    // SEO
    'seo.homeTitle': 'NovaTools - Privacy-First Free Online Tools',
    'seo.homeDesc': 'Your data stays in your browser. PDF merge, mortgage calculator, and more.'
  }
};

// Default export
export default {
  config: I18N_CONFIG,
  detectLocale,
  setLocale,
  t,
  generateHreflangTags,
  injectHreflangTags
};
