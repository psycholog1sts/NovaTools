const STORAGE_KEYS = ['cookie_consent', 'novatools_cookie_consent', 'mc_novatools_cookie_consent'];
const CONSENT_EVENT = 'novatools:consent-updated';
const DEFAULT_CONSENT = Object.freeze({
  necessary: true,
  analytics: false,
  functional: false
});

const COPY = {
  en: {
    title: 'Cookie choices',
    body: 'We use necessary storage for core features. Analytics and functional storage are optional. Google displays a separate certified consent message for advertising where required.',
    settings: 'Cookie Settings',
    accept: 'Accept all',
    reject: 'Reject non-essential',
    save: 'Save choices',
    close: 'Close',
    categories: {
      necessary: ['Necessary', 'Required for security, consent, language, and basic site operation. Always on.'],
      analytics: ['Analytics', 'Helps us understand aggregate usage and improve pages.'],
      functional: ['Functional', 'Remembers optional convenience choices such as theme and tool settings.']
    }
  },
  tr: {
    title: 'Çerez tercihleri',
    body: 'Temel özellikler için zorunlu depolama kullanırız. Analiz ve fonksiyonel depolama isteğe bağlıdır. Google, gerekli bölgelerde reklamlar için ayrı ve sertifikalı bir onay mesajı gösterir.',
    settings: 'Çerez Ayarları',
    accept: 'Tümünü kabul et',
    reject: 'Zorunlu olmayanları reddet',
    save: 'Seçimleri kaydet',
    close: 'Kapat',
    categories: {
      necessary: ['Zorunlu', 'Güvenlik, onay, dil ve temel site çalışması için gereklidir. Her zaman açıktır.'],
      analytics: ['Analiz', 'Toplu kullanımı anlamamıza ve sayfaları iyileştirmemize yardımcı olur.'],
      functional: ['Fonksiyonel', 'Tema ve araç ayarları gibi isteğe bağlı kolaylık tercihlerini hatırlar.']
    }
  },
  ar: {
    title: 'خيارات ملفات تعريف الارتباط',
    body: 'نستخدم التخزين الضروري للميزات الأساسية. التحليلات والتخزين الوظيفي اختياريان. تعرض Google رسالة موافقة معتمدة منفصلة للإعلانات حيثما يلزم.',
    settings: 'إعدادات ملفات تعريف الارتباط',
    accept: 'قبول الكل',
    reject: 'رفض غير الضروري',
    save: 'حفظ الخيارات',
    close: 'إغلاق',
    categories: {
      necessary: ['ضروري', 'مطلوب للأمان والموافقة واللغة وتشغيل الموقع الأساسي. مفعّل دائماً.'],
      analytics: ['تحليلات', 'يساعدنا على فهم الاستخدام الإجمالي وتحسين الصفحات.'],
      functional: ['وظيفي', 'يتذكر اختيارات الراحة الاختيارية مثل السمة وإعدادات الأدوات.']
    }
  }
};

function getLanguage() {
  const pathLang = window.location.pathname.match(/^\/(tr|ar)(?=\/|$)/)?.[1];
  return pathLang || document.documentElement.lang || window.i18n?.getCurrentLanguage?.() || 'en';
}

function normalizeConsent(value) {
  return {
    necessary: true,
    analytics: value?.analytics === true,
    functional: value?.functional === true
  };
}

export function getConsent() {
  for (const key of STORAGE_KEYS) {
    const raw = localStorage.getItem(key);
    if (!raw) continue;
    return normalizeConsent(JSON.parse(raw));
  }
  return null;
}

function persistConsent(consent) {
  const normalized = normalizeConsent(consent);
  for (const key of STORAGE_KEYS) {
    localStorage.setItem(key, JSON.stringify(normalized));
  }
  window.NovaToolsConsent = normalized;
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: normalized }));
  window.dispatchEvent(new CustomEvent('mc-novatools:consent-updated', { detail: normalized }));
  window.dispatchEvent(new CustomEvent('cookieConsentChanged', { detail: normalized }));
  loadConsentedScripts(normalized);
  return normalized;
}

function createButton(text, className, action) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  button.addEventListener('click', action);
  return button;
}

function ensureStyles() {
  if (document.getElementById('novatools-consent-styles')) return;
  const style = document.createElement('style');
  style.id = 'novatools-consent-styles';
  style.textContent = `.consent-banner{position:fixed;left:.75rem;right:.75rem;bottom:max(.75rem,env(safe-area-inset-bottom));z-index:1000;display:grid;grid-template-columns:1fr auto;gap:.75rem;align-items:center;width:min(780px,calc(100% - 1.5rem));margin:0 auto;padding:.8rem 1rem;border:1px solid rgba(148,163,184,.28);border-radius:14px;background:rgba(2,6,23,.97);box-shadow:0 16px 48px rgba(0,0,0,.34);color:#f8fafc;font-size:.9rem}.consent-banner p{margin:.2rem 0 0;color:#c4cfdd;line-height:1.4}.consent-actions{display:flex;gap:.5rem;flex-wrap:wrap;justify-content:flex-end}.consent-button{border:1px solid rgba(148,163,184,.32);border-radius:10px;padding:.62rem .78rem;background:rgba(255,255,255,.06);color:#f8fafc;cursor:pointer;font-weight:700}.consent-button.primary{color:#020617;background:linear-gradient(135deg,#67e8f9,#a78bfa);border:0}.consent-modal[hidden],.consent-banner[hidden]{display:none}.consent-modal{position:fixed;inset:0;z-index:1001;display:grid;place-items:center;padding:1rem;background:rgba(2,6,23,.72)}.consent-dialog{width:min(620px,100%);max-height:min(760px,calc(100vh - 2rem));overflow:auto;border:1px solid rgba(148,163,184,.24);border-radius:20px;background:#08111f;padding:1.25rem;color:#f8fafc;box-shadow:0 24px 80px rgba(0,0,0,.45)}.consent-category{display:grid;grid-template-columns:1fr auto;gap:1rem;padding:1rem 0;border-top:1px solid rgba(148,163,184,.24)}.consent-category p{margin:.25rem 0 0;color:#b6c2d2;line-height:1.55}.consent-switch{width:48px;height:28px;accent-color:#22d3ee}html[data-consent-banner="open"] .site-guide-chatbot{display:none!important}@media(max-width:760px){.consent-banner{grid-template-columns:1fr}.consent-actions{justify-content:stretch}.consent-button{flex:1 1 auto}}`;
  document.head.appendChild(style);
}

function renderModal(copy, existingConsent) {
  let modal = document.getElementById('novatools-consent-modal');
  if (modal) return modal;
  modal = document.createElement('div');
  modal.id = 'novatools-consent-modal';
  modal.className = 'consent-modal';
  modal.hidden = true;
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'consent-title');

  const dialog = document.createElement('div');
  dialog.className = 'consent-dialog';
  dialog.innerHTML = `<h2 id="consent-title">${copy.title}</h2><p>${copy.body}</p>`;

  const values = existingConsent || DEFAULT_CONSENT;
  Object.entries(copy.categories).forEach(([key, [label, description]]) => {
    const row = document.createElement('label');
    row.className = 'consent-category';
    row.innerHTML = `<span><strong>${label}</strong><p>${description}</p></span>`;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.className = 'consent-switch';
    input.name = key;
    input.checked = key === 'necessary' || values[key] === true;
    input.disabled = key === 'necessary';
    row.appendChild(input);
    dialog.appendChild(row);
  });

  const actions = document.createElement('div');
  actions.className = 'consent-actions';
  actions.append(
    createButton(copy.close, 'consent-button', () => { modal.hidden = true; }),
    createButton(copy.save, 'consent-button primary', () => {
      const formValues = Object.fromEntries(Array.from(dialog.querySelectorAll('input')).map((input) => [input.name, input.checked]));
      persistConsent(formValues);
      modal.hidden = true;
      document.getElementById('novatools-consent-banner')?.setAttribute('hidden', '');
    })
  );
  dialog.appendChild(actions);
  modal.appendChild(dialog);
  document.body.appendChild(modal);
  return modal;
}

function openModal() {
  const copy = COPY[getLanguage()] || COPY.en;
  const modal = renderModal(copy, getConsent());
  modal.hidden = false;
}

function renderBanner(copy) {
  if (document.getElementById('novatools-consent-banner')) return;
  const banner = document.createElement('section');
  banner.id = 'novatools-consent-banner';
  banner.className = 'consent-banner';
  banner.setAttribute('aria-label', copy.title);
  document.documentElement.dataset.consentBanner = 'open';
  banner.innerHTML = `<div><strong>${copy.title}</strong><p>${copy.body}</p></div>`;
  const actions = document.createElement('div');
  actions.className = 'consent-actions';
  actions.append(
    createButton(copy.settings, 'consent-button', openModal),
    createButton(copy.reject, 'consent-button', () => {
      persistConsent(DEFAULT_CONSENT);
      banner.hidden = true;
      delete document.documentElement.dataset.consentBanner;
    }),
    createButton(copy.accept, 'consent-button primary', () => {
      persistConsent({ necessary: true, analytics: true, functional: true });
      banner.hidden = true;
      delete document.documentElement.dataset.consentBanner;
    })
  );
  banner.appendChild(actions);
  document.body.appendChild(banner);
}

function loadConsentedScripts(consent) {
  document.querySelectorAll('script[type="text/plain"][data-consent-category]').forEach((script) => {
    const category = script.getAttribute('data-consent-category');
    if (!consent?.[category] || script.dataset.loaded === 'true') return;
    const executable = document.createElement('script');
    Array.from(script.attributes).forEach((attr) => {
      if (attr.name !== 'type' && attr.name !== 'data-consent-category') executable.setAttribute(attr.name, attr.value);
    });
    executable.textContent = script.textContent;
    script.dataset.loaded = 'true';
    script.after(executable);
  });
  window.dispatchEvent(new CustomEvent('novatools:consented-scripts-loaded', { detail: consent }));
}

function setupFooterLinks() {
  document.querySelectorAll('[data-cookie-settings]').forEach((button) => {
    button.addEventListener('click', openModal);
  });
}

export function hasConsent(category) {
  return getConsent()?.[category] === true;
}

export function initConsentManager() {
  ensureStyles();
  const copy = COPY[getLanguage()] || COPY.en;
  const existing = getConsent();
  window.NovaToolsConsent = existing || DEFAULT_CONSENT;
  setupFooterLinks();
  renderModal(copy, existing);
  if (existing) {
    loadConsentedScripts(existing);
    return existing;
  }
  renderBanner(copy);
  return DEFAULT_CONSENT;
}

window.NovaToolsConsentManager = { init: initConsentManager, open: openModal, getConsent, hasConsent };
