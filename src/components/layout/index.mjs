/**
 * Shared Layout Components
 * Reusable header, footer, and layout utilities
 */

/**
 * Create standard header HTML
 */
export function createHeader() {
  const header = document.createElement('header');
  header.className = 'main-header';
  // Note: innerHTML used here with static template literals only (no user input)
  header.innerHTML = `
    <div class="container">
      <div class="flex items-center justify-between py-4">
        <a href="/" class="flex items-center gap-2 text-xl font-bold text-primary-600" aria-label="NovaTools Ana Sayfa">
          <img src="/logo-bird.png" alt="NovaTools MC" class="header-logo-img" width="44" height="44">
          <span class="logo-text">NovaTools <span class="logo-mc">MC</span></span>
        </a>
        <div class="flex items-center gap-3">
          <button type="button" id="themeToggle" class="theme-toggle" aria-label="Toggle theme">
            <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            <svg class="icon-moon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          </button>
          <div class="privacy-badge" role="status" aria-label="Güvenlik durumu">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <path d="M8 0L1 3v5c0 5.25 3.67 10.17 7 11 3.33-.83 7-5.75 7-11V3L8 0z"/>
            </svg>
            <span>Zero Server</span>
          </div>
        </div>
      </div>
    </div>
  `;
  return header;
}

/**
 * Create breadcrumb navigation
 */
export function createBreadcrumb(items) {
  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', 'Breadcrumb');
  nav.className = 'container py-4';
  
  const ol = document.createElement('ol');
  ol.className = 'flex items-center gap-2 text-sm flex-wrap';
  ol.setAttribute('itemscope', '');
  ol.setAttribute('itemtype', 'https://schema.org/BreadcrumbList');
  
  items.forEach((item, index) => {
    const isLast = index === items.length - 1;
    const li = document.createElement('li');
    li.setAttribute('itemprop', 'itemListElement');
    li.setAttribute('itemscope', '');
    li.setAttribute('itemtype', 'https://schema.org/ListItem');
    
    if (isLast) {
      li.innerHTML = `<span class="text-gray-900 font-medium" itemprop="name">${item.name}</span>`;
    } else {
      li.innerHTML = `
        <a href="${item.url}" class="text-secondary-500 hover:text-primary-600" itemprop="item">
          <span itemprop="name">${item.name}</span>
        </a>
        <meta itemprop="position" content="${index + 1}">
      `;
    }
    
    ol.appendChild(li);
    
    if (!isLast) {
      const separator = document.createElement('li');
      separator.className = 'text-secondary-400';
      separator.textContent = '/';
      ol.appendChild(separator);
    }
  });
  
  nav.appendChild(ol);
  return nav;
}

/**
 * Create standard footer
 */
export function createFooter() {
  const footer = document.createElement('footer');
  footer.className = 'border-t mt-12';
  footer.style.cssText = 'background: var(--bg-secondary); border-color: var(--border-default);';
  footer.setAttribute('role', 'contentinfo');

  const container = document.createElement('div');
  container.className = 'container py-8';

  const row = document.createElement('div');
  row.className = 'flex flex-col md:flex-row justify-between items-center gap-4';

  const copyright = document.createElement('p');
  copyright.className = 'text-sm';
  copyright.style.color = 'var(--text-tertiary)';
  copyright.setAttribute('data-i18n', 'footer.copyright');
  copyright.textContent = `© ${new Date().getFullYear()} MC NovaTools. All rights reserved.`;

  const privacy = document.createElement('p');
  privacy.className = 'text-sm';
  privacy.style.color = 'var(--text-tertiary)';
  privacy.setAttribute('data-i18n', 'privacy.description');
  privacy.textContent = 'Your data never leaves your browser. 🔒';

  const legalNav = document.createElement('nav');
  legalNav.className = 'flex flex-wrap items-center justify-center gap-3 text-sm';
  legalNav.style.color = 'var(--text-tertiary)';
  legalNav.setAttribute('aria-label', 'Yasal bağlantılar');
  legalNav.innerHTML = `
    <a href="/about.html">About</a>
    <a href="/contact.html">Contact</a>
    <a href="/privacy-policy.html">Privacy Policy</a>
    <a href="/terms-of-service.html">Terms of Service</a>
    <a href="/cookie-policy.html">Cookie Policy</a>
    <a href="/disclaimer.html">Disclaimer</a>
    <a href="/gizlilik-politikasi.html" data-i18n="legal.links.privacyPolicy">Gizlilik Politikası</a>
    <a href="/kullanim-kosullari.html" data-i18n="legal.links.termsOfUse">Kullanım Koşulları</a>
    <a href="/kvkk-aydinlatma-metni.html" data-i18n="legal.links.kvkkNotice">KVKK Aydınlatma Metni</a>
    <a href="/iletisim.html" data-i18n="legal.links.contact">İletişim</a>
  `;

  row.appendChild(copyright);
  row.appendChild(privacy);
  row.appendChild(legalNav);
  container.appendChild(row);
  footer.appendChild(container);

  // Apply translations after DOM insertion
  setTimeout(() => window.i18n?.refresh(), 50);
  return footer;
}

/**
 * Create mobile anchor ad container
 */
export function createMobileAnchorAd() {
  const ad = document.createElement('div');
  ad.id = 'ad-anchor';
  ad.className = 'fixed bottom-0 left-0 right-0 bg-gray-100 border-t border-gray-200 h-[50px] flex items-center justify-center z-40 lg:hidden';
  ad.setAttribute('role', 'complementary');
  ad.setAttribute('aria-label', 'Mobil reklam');
  ad.innerHTML = `
    <div class="absolute inset-0 skeleton animate-pulse" aria-hidden="true"></div>
    <span class="relative z-10 text-xs text-gray-400">Reklam (320×50)</span>
  `;
  return ad;
}

/**
 * Create sidebar ad container
 */
export function createSidebarAd() {
  const ad = document.createElement('div');
  ad.className = 'ad-container w-full bg-gray-100 rounded-lg flex flex-col items-center justify-center min-h-[280px] relative overflow-hidden';
  ad.style = 'aspect-ratio: 336/280;';
  ad.setAttribute('role', 'region');
  ad.setAttribute('aria-label', 'Reklam alanı');
  ad.innerHTML = `
    <div class="absolute inset-0 skeleton animate-pulse" aria-hidden="true"></div>
    <div class="relative z-10 text-center p-4">
      <p class="text-sm text-gray-400 font-medium">Reklam Alanı</p>
      <p class="text-xs text-gray-300 mt-1">336 × 280</p>
    </div>
    <div id="ad-sidebar" class="absolute inset-0 flex items-center justify-center"></div>
  `;
  return ad;
}

/**
 * Create privacy badge
 */
export function createPrivacyBadge() {
  const badge = document.createElement('div');
  badge.className = 'flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg mb-6';
  badge.setAttribute('role', 'region');
  badge.setAttribute('aria-label', 'Gizlilik bilgisi');
  badge.innerHTML = `
    <div class="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
      <svg width="20" height="20" viewBox="0 0 16 16" fill="#059669" aria-hidden="true">
        <path d="M8 0L1 3v5c0 5.25 3.67 10.17 7 11 3.33-.83 7-5.75 7-11V3L8 0z"/>
      </svg>
    </div>
    <div>
      <p class="font-semibold text-green-900">Safe & Private</p>
      <p class="text-sm text-green-700">Dosyalarınız asla sunucularımıza gönderilmez. Tüm işlemler tarayıcınızda gerçekleşir.</p>
    </div>
  `;
  return badge;
}

/**
 * Create progress bar
 */
export function createProgressBar(id = 'progress') {
  const container = document.createElement('section');
  container.id = id;
  container.className = 'hidden mt-6';
  container.setAttribute('aria-live', 'polite');
  container.innerHTML = `
    <div class="flex justify-between text-sm mb-2">
      <span id="${id}-text">Hazırlanıyor...</span>
      <span id="${id}-percent" class="font-medium">0%</span>
    </div>
    <div class="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100">
      <div id="${id}-bar" class="bg-primary-600 h-2.5 rounded-full transition-all duration-300" style="width: 0%"></div>
    </div>
    <p id="${id}-detail" class="mt-2 text-xs text-gray-500"></p>
  `;
  return container;
}

/**
 * Create error message container
 */
export function createErrorContainer(id = 'error') {
  const container = document.createElement('section');
  container.id = id;
  container.className = 'hidden mt-6 p-4 bg-red-50 border border-red-200 rounded-lg';
  container.setAttribute('role', 'alert');
  container.innerHTML = `
    <div class="flex items-start gap-3">
      <svg class="flex-shrink-0 w-5 h-5 text-red-500 mt-0.5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
      </svg>
      <div>
        <p class="font-medium text-red-900">Bir hata oluştu</p>
        <p id="${id}-message" class="text-sm text-red-700 mt-1"></p>
      </div>
    </div>
  `;
  return container;
}

/**
 * Initialize common UI elements
 */
export function initCommonUI() {
  // Mobile menu toggle
  const btn = document.getElementById('mobileMenuBtn');
  const menu = document.getElementById('mobileMenu');
  
  if (btn && menu) {
    btn.addEventListener('click', () => {
      const isExpanded = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !isExpanded);
      menu.hidden = isExpanded;
      menu.classList.toggle('hidden', isExpanded);
    });
  }
  
  // Theme toggle
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    const getTheme = function() {
      const s = localStorage.getItem('theme');
      if (s) return s;
      return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    };
    const updateIcon = function() {
      const t = getTheme();
      const sun = themeBtn.querySelector('.icon-sun');
      const moon = themeBtn.querySelector('.icon-moon');
      if (sun) sun.style.display = t === 'light' ? 'none' : 'block';
      if (moon) moon.style.display = t === 'dark' ? 'none' : 'block';
    };
    themeBtn.addEventListener('click', () => {
      const next = getTheme() === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('theme', next);
      updateIcon();
    });
    updateIcon();
  }

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', targetId);
        target.setAttribute('tabindex', '-1');
        target.focus({ preventScroll: true });
      }
    });
  });
}
