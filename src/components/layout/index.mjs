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
  header.innerHTML = `
    <div class="container">
      <div class="flex items-center justify-between py-4">
        <a href="/" class="flex items-center gap-2 text-xl font-bold text-primary-600" aria-label="NovaTools Ana Sayfa">
          <div class="logo-icon neon-logo">
            <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="layoutLogoGrad" x1="0%" y1="50%" x2="100%" y2="50%">
                  <stop offset="0%" stop-color="#39FF14"/>
                  <stop offset="100%" stop-color="#00CFFF"/>
                </linearGradient>
                <filter id="layoutGlow" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="2" result="blur"/>
                  <feMerge><feMergeNode in="blur"/><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
                </filter>
              </defs>
              <g filter="url(#layoutGlow)" stroke="url(#layoutLogoGrad)" fill="none" stroke-linecap="round" stroke-linejoin="round">
                <path d="M50 75 L35 55 L25 40 L35 45 L45 50" stroke-width="4"/>
                <path d="M35 55 L30 35 L40 45" stroke-width="3"/>
                <path d="M25 40 L20 25 L32 38" stroke-width="2.5"/>
                <path d="M50 75 L65 55 L75 40 L65 45 L55 50" stroke-width="4"/>
                <path d="M65 55 L70 35 L60 45" stroke-width="3"/>
                <path d="M75 40 L80 25 L68 38" stroke-width="2.5"/>
                <path d="M50 75 L50 55 L45 45 L50 50 L55 45 L50 55" stroke-width="4"/>
                <path d="M50 50 L42 35 L50 42 L58 35 L50 50" stroke-width="3"/>
                <path d="M50 75 L45 85 L50 80 L55 85 L50 75" stroke-width="4"/>
                <rect x="55" y="25" width="4" height="4" fill="url(#layoutLogoGrad)" stroke="none"/>
                <rect x="62" y="20" width="3" height="3" fill="url(#layoutLogoGrad)" stroke="none"/>
                <rect x="68" y="16" width="2" height="2" fill="url(#layoutLogoGrad)" stroke="none"/>
              </g>
            </svg>
          </div>
          <span class="logo-text">NovaTools <span class="logo-mc">MC</span></span>
        </a>
        <div class="privacy-badge" role="status" aria-label="Güvenlik durumu">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M8 0L1 3v5c0 5.25 3.67 10.17 7 11 3.33-.83 7-5.75 7-11V3L8 0z"/>
          </svg>
          <span>Zero Server</span>
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
  footer.className = 'bg-white border-t mt-12';
  footer.setAttribute('role', 'contentinfo');
  footer.innerHTML = `
    <div class="container py-8">
      <div class="flex flex-col md:flex-row justify-between items-center gap-4">
        <p class="text-sm text-gray-500">© ${new Date().getFullYear()} NovaTools. Tüm hakları saklıdır.</p>
        <p class="text-sm text-gray-500">Verileriniz tarayıcınızda kalır. 🔒</p>
      </div>
    </div>
  `;
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
