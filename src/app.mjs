/**
 * NovaTools - Main Application
 * SaaS-Grade Modular Architecture
 */

// Core modules
import {
  router,
  stateManager,
  apiClient,
  ErrorHandler,
  toolController
} from './core/index.mjs';

// Services
import {
  cryptoService,
  exchangeRateService,
  calendarService
} from './services/index.mjs';

// UI Components
import { toast, loading } from './components/index.mjs';

// Tool registrations
import { registerFinanceTools } from './tools/finance/index.mjs';
import { registerPDFTools } from './tools/pdf/index.mjs';
import { registerImageTools } from './tools/image/index.mjs';

/**
 * Main Application Class
 */
class NovaToolsApp {
  constructor() {
    this.version = '2.0.0';
    this.initialized = false;
  }

  /**
   * Initialize the application
   */
  async init() {
    if (this.initialized) return;

    console.log('🚀 NovaTools v' + this.version);
    console.log('Initializing modular architecture...');

    // Initialize state
    this.initState();

    // Initialize router
    this.initRouter();

    // Register tools
    this.registerTools();

    // Initialize UI
    this.initUI();

    // Load live data
    this.loadLiveData();

    // Global error handling
    this.initErrorHandling();

    this.initialized = true;
    console.log('✓ Application initialized');
  }

  /**
   * Initialize state management
   */
  initState() {
    // App state
    stateManager.set('app', {
      version: this.version,
      initialized: true,
      currentRoute: window.location.pathname
    });

    // Data cache
    stateManager.set('data', {
      crypto: null,
      exchangeRates: null,
      calendar: null,
      lastUpdated: null
    });

    // UI state
    stateManager.set('ui', {
      sidebarOpen: false,
      currentTool: null,
      theme: localStorage.getItem('theme') || 'dark'
    });
  }

  /**
   * Initialize router
   */
  initRouter() {
    // Define routes
    router.addRoute('/', { name: 'home', requiresAuth: false });
    router.addRoute('/tools/:category/:tool', { name: 'tool', requiresAuth: false });
    router.addRoute('/blog', { name: 'blog', requiresAuth: false });
    router.addRoute('/blog/:slug', { name: 'article', requiresAuth: false });
    router.addRoute('/admin', { name: 'admin', requiresAuth: true });

    // Handle navigation
    router.onNavigate = (route) => {
      stateManager.set('app.currentRoute', route.path);
      this.handleRouteChange(route);
    };

    // Initialize
    router.init();
  }

  /**
   * Register all tools with the controller
   */
  registerTools() {
    // Add hooks
    toolController.addHook('beforeExecute', (ctx) => {
      console.log(`[Tool] Executing: ${ctx.toolId}`);
      stateManager.set('ui.currentTool', ctx.toolId);
    });

    toolController.addHook('afterExecute', (ctx) => {
      console.log(`[Tool] Completed: ${ctx.toolId} (${ctx.duration.toFixed(2)}ms)`);
    });

    toolController.addHook('onError', (ctx) => {
      ErrorHandler.handle(ctx.error, `Tool: ${ctx.toolId}`);
    });

    // Register tool categories
    registerFinanceTools(toolController);
    registerPDFTools(toolController);
    registerImageTools(toolController);

    console.log(`✓ Registered ${toolController.getTools().length} tools`);
  }

  /**
   * Initialize UI components
   */
  initUI() {
    // Mobile menu toggle
    const menuToggle = document.getElementById('mobile-menu-toggle') || document.getElementById('mobileMenuBtn');
    const sidebar = document.querySelector('.sidebar');
    const mobileMenu = document.getElementById('mobileMenu');
    
    if (menuToggle) {
      menuToggle.addEventListener('click', () => {
        if (sidebar) {
          sidebar.classList.toggle('active');
          const isOpen = sidebar.classList.contains('active');
          stateManager.set('ui.sidebarOpen', isOpen);
        }
        if (mobileMenu) {
          const isHidden = mobileMenu.hidden;
          mobileMenu.hidden = !isHidden;
          mobileMenu.classList.toggle('active', isHidden);
          menuToggle.setAttribute('aria-expanded', isHidden);
        }
      });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const target = document.querySelector(anchor.getAttribute('href'));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });

    // Handle tool execution from UI (only on pages with tool forms)
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('[data-tool-form]');
      if (form) {
        e.preventDefault();
        this.handleToolSubmit(form);
      }
    });

    // Initialize dropzones if present
    document.querySelectorAll('[data-dropzone]').forEach(el => {
      this.initDropzone(el);
    });
  }

  /**
   * Handle tool form submission
   */
  async handleToolSubmit(form) {
    const toolId = form.dataset.toolForm;
    const formData = new FormData(form);
    const inputs = Object.fromEntries(formData.entries());

    // Show loading
    const submitBtn = form.querySelector('button[type="submit"]');
    const restoreBtn = loading.button(submitBtn, 'Calculating...');

    // Execute tool
    const result = await toolController.executeTool(toolId, inputs);

    // Restore button
    restoreBtn();

    if (result.success) {
      this.displayToolResult(form, result.data);
      toast.success('Calculation completed successfully');
    } else {
      toast.error(result.error.message || 'Calculation failed');
    }
  }

  /**
   * Display tool result
   */
  displayToolResult(form, data) {
    const resultContainer = form.closest('.tool-container')?.querySelector('.result-container');
    if (!resultContainer) return;

    resultContainer.innerHTML = this.formatResult(data);
    resultContainer.style.display = 'block';
    resultContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /**
   * Initialize dropzone component
   */
  initDropzone(element) {
    import('./components/dropzone.mjs').then(({ DropZone }) => {
      new DropZone(element, {
        accept: element.dataset.accept || '*',
        multiple: element.dataset.multiple !== 'false',
        maxSize: parseInt(element.dataset.maxSize) || 50 * 1024 * 1024,
        onDrop: (files) => {
          const event = new CustomEvent('files-dropped', { 
            detail: { files },
            bubbles: true 
          });
          element.dispatchEvent(event);
        },
        onError: (errors) => {
          errors.forEach(err => toast.error(err));
        }
      });
    });
  }

  /**
   * Format tool result for display
   */
  formatResult(data) {
    if (typeof data === 'string') return `<p>${data}</p>`;
    
    if (data.html) return data.html;

    let html = '<div class="results">';
    
    for (const [key, value] of Object.entries(data)) {
      if (key === 'chart' || key === 'raw') continue;
      
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      const formatted = typeof value === 'number' 
        ? value.toLocaleString(undefined, { maximumFractionDigits: 2 })
        : value;
      
      html += `
        <div class="result-row">
          <span class="result-label">${label}:</span>
          <span class="result-value">${formatted}</span>
        </div>
      `;
    }
    
    html += '</div>';
    return html;
  }

  /**
   * Handle route changes
   */
  handleRouteChange(route) {
    // Update active nav
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.getAttribute('href') === route.path);
    });

    // Close mobile menu
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.remove('active');
  }

  /**
   * Load live data for footer and widgets
   */
  async loadLiveData() {
    try {
      // Load crypto
      const crypto = await cryptoService.getBitcoinPrice();
      stateManager.set('data.crypto', crypto);
      this.updateCryptoDisplay(crypto);
    } catch (e) {
      console.warn('Failed to load crypto data');
    }

    try {
      // Load exchange rates
      const rates = await exchangeRateService.getRates();
      stateManager.set('data.exchangeRates', rates);
      this.updateRatesDisplay(rates);
    } catch (e) {
      console.warn('Failed to load exchange rates');
    }

    try {
      // Load calendar
      const hijri = await calendarService.getCurrentIslamicDate();
      stateManager.set('data.calendar', hijri);
      this.updateCalendarDisplay(hijri);
    } catch (e) {
      console.warn('Failed to load calendar data');
    }

    // Set last updated
    stateManager.set('data.lastUpdated', new Date().toISOString());
  }

  /**
   * Update crypto display in footer
   */
  updateCryptoDisplay(data) {
    const el = document.getElementById('btc-price');
    if (el && data.price) {
      el.textContent = `$${data.price.toLocaleString()}`;
      el.className = data.change24h >= 0 ? 'price-up' : 'price-down';
    }
  }

  /**
   * Update rates display in footer
   */
  updateRatesDisplay(data) {
    if (!data?.rates) return;
    
    const eurEl = document.getElementById('rate-eur');
    const jpyEl = document.getElementById('rate-jpy');
    
    if (eurEl) eurEl.textContent = data.rates.EUR?.toFixed(4) || '--';
    if (jpyEl) jpyEl.textContent = data.rates.JPY?.toFixed(2) || '--';
  }

  /**
   * Update calendar display
   */
  updateCalendarDisplay(data) {
    const el = document.getElementById('hijri-date');
    if (el && data) {
      el.textContent = data.formatted;
    }
  }

  /**
   * Initialize global error handling
   */
  initErrorHandling() {
    window.addEventListener('error', (e) => {
      ErrorHandler.handle(e.error, 'Global');
    });

    window.addEventListener('unhandledrejection', (e) => {
      ErrorHandler.handle(e.reason, 'Unhandled Promise');
    });
  }
}

// Create and export singleton
export const app = new NovaToolsApp();

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}

export default app;
