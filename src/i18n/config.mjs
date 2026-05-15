/**
 * Internationalization Configuration
 * Zero-Cookie i18n for GDPR exemption
 */

export const I18N_CONFIG = {
  // Default locale
  defaultLocale: 'en',
  
  // Supported locales
  locales: ['en', 'tr', 'de', 'fr', 'es', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'it', 'pl', 'nl'],
  pathPrefixLocales: [],
  fallbackLocale: {
    'tr-TR': ['tr', 'en'],
    'en-US': ['en', 'tr'],
    default: ['en']
  },
  
  // Locale metadata
  metadata: {
    en: { name: 'English', dir: 'ltr', flag: '🇬🇧', domain: 'mc-novatools.com', hreflang: 'en', googleSite: 'mc_novatools_en' },
    tr: { name: 'Türkçe', dir: 'ltr', flag: '🇹🇷', domain: 'mc-novatools.com', hreflang: 'tr', googleSite: 'mc_novatools_tr' },
    de: { name: 'Deutsch', dir: 'ltr', flag: '🇩🇪', domain: 'mc-novatools.com', hreflang: 'de', googleSite: 'mc_novatools_de' },
    fr: { name: 'Français', dir: 'ltr', flag: '🇫🇷', domain: 'mc-novatools.com', hreflang: 'fr', googleSite: 'mc_novatools_fr' },
    es: { name: 'Español', dir: 'ltr', flag: '🇪🇸', domain: 'mc-novatools.com', hreflang: 'es', googleSite: 'mc_novatools_es' },
    pt: { name: 'Português', dir: 'ltr', flag: '🇵🇹', domain: 'mc-novatools.com', hreflang: 'pt', googleSite: 'mc_novatools_pt' },
    ru: { name: 'Русский', dir: 'ltr', flag: '🇷🇺', domain: 'mc-novatools.com', hreflang: 'ru', googleSite: 'mc_novatools_ru' },
    zh: { name: '中文', dir: 'ltr', flag: '🇨🇳', domain: 'mc-novatools.com', hreflang: 'zh', googleSite: 'mc_novatools_zh' },
    ja: { name: '日本語', dir: 'ltr', flag: '🇯🇵', domain: 'mc-novatools.com', hreflang: 'ja', googleSite: 'mc_novatools_ja' },
    ko: { name: '한국어', dir: 'ltr', flag: '🇰🇷', domain: 'mc-novatools.com', hreflang: 'ko', googleSite: 'mc_novatools_ko' },
    ar: { name: 'العربية', dir: 'rtl', flag: '🇸🇦', domain: 'mc-novatools.com', hreflang: 'ar', googleSite: 'mc_novatools_ar' },
    hi: { name: 'हिन्दी', dir: 'ltr', flag: '🇮🇳', domain: 'mc-novatools.com', hreflang: 'hi', googleSite: 'mc_novatools_hi' },
    it: { name: 'Italiano', dir: 'ltr', flag: '🇮🇹', domain: 'mc-novatools.com', hreflang: 'it', googleSite: 'mc_novatools_it' },
    pl: { name: 'Polski', dir: 'ltr', flag: '🇵🇱', domain: 'mc-novatools.com', hreflang: 'pl', googleSite: 'mc_novatools_pl' },
    nl: { name: 'Nederlands', dir: 'ltr', flag: '🇳🇱', domain: 'mc-novatools.com', hreflang: 'nl', googleSite: 'mc_novatools_nl' }
  },
  
  // Query-parameter routing (no locale folders, cookies, or subdomains)
  routing: {
    type: 'query',
    prefix: false
  }
};

const LOCALE_ALIASES = {
  'tr-tr': 'tr',
  'tr_tr': 'tr',
  'en-us': 'en',
  'en_us': 'en',
  'en-gb': 'en',
  'en_gb': 'en',
  'pt-br': 'pt',
  'pt_br': 'pt',
  'zh-cn': 'zh',
  'zh_cn': 'zh',
  'zh-tw': 'zh',
  'zh_tw': 'zh'
};

export function normalizeLocale(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = raw.replace(/^\/+|\/+$/g, '').replace('_', '-').toLowerCase();
  const alias = LOCALE_ALIASES[normalized] || LOCALE_ALIASES[normalized.replace('-', '_')];
  if (alias && I18N_CONFIG.locales.includes(alias)) return alias;
  const base = normalized.split('-')[0];
  return I18N_CONFIG.locales.includes(base) ? base : null;
}

function fallbackChain(locale) {
  const normalized = normalizeLocale(locale) || I18N_CONFIG.defaultLocale;
  const chain = I18N_CONFIG.fallbackLocale[locale] || I18N_CONFIG.fallbackLocale[normalized] || I18N_CONFIG.fallbackLocale.default;
  return [...new Set([normalized, ...chain.map(normalizeLocale).filter(Boolean), I18N_CONFIG.defaultLocale])];
}

/**
 * Get user's preferred locale from browser
 */
export function detectLocale() {
  // Check URL query first. Locale folders are intentionally unsupported.
  const params = new URLSearchParams(window.location.search || '');
  const queryLocale = normalizeLocale(params.get('lang'));
  if (queryLocale) return queryLocale;
  
  // Check localStorage (explicit user choice)
  try {
    const stored = normalizeLocale(localStorage.getItem('novatools_locale'));
    if (stored) {
      return stored;
    }
  } catch { /* ignore */ }
  
  // Check browser language
  return normalizeLocale(navigator.language || navigator.userLanguage) || I18N_CONFIG.defaultLocale;
}

/**
 * Set locale preference (stored in localStorage only)
 */
export function setLocale(locale) {
  const normalized = normalizeLocale(locale);
  if (!normalized) return false;
  
  try {
    localStorage.setItem('novatools_locale', normalized);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get translation for key
 */
export function t(key, locale = detectLocale()) {
  for (const candidate of fallbackChain(locale)) {
    const translations = TRANSLATIONS[candidate];
    if (translations && Object.prototype.hasOwnProperty.call(translations, key)) {
      return translations[key];
    }
  }
  return key;
}

/**
 * Generate hreflang tags for SEO
 */
export function generateHreflangTags(currentPath) {
  const baseUrl = 'https://mc-novatools.com';
  const tags = [];
  
  // x-default
  tags.push(`<link rel="alternate" hreflang="x-default" href="${baseUrl}${currentPath}">`);
  
  // Each locale
  I18N_CONFIG.locales.forEach(locale => {
    const path = currentPath;
    const params = new URLSearchParams();
    const normalizedLocale = normalizeLocale(locale) || I18N_CONFIG.defaultLocale;
    if (normalizedLocale !== I18N_CONFIG.defaultLocale) {
      params.set('lang', normalizedLocale);
    }
    const query = params.toString() ? `?${params.toString()}` : '';
    
    tags.push(
      `<link rel="alternate" hreflang="${I18N_CONFIG.metadata[locale].hreflang}" href="${baseUrl}${path}${query}">`
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
  normalizeLocale,
  t,
  generateHreflangTags,
  injectHreflangTags
};
