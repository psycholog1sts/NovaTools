/**
 * Router Module
 * Client-side routing with history API support
 */

import { stateManager } from './state-manager.mjs';

class Router {
  constructor(options = {}) {
    this.routes = new Map();
    this.middleware = [];
    this.currentRoute = null;
    this.basePath = options.basePath || '';
    this.mode = options.mode || 'history'; // 'history' or 'hash'
    
    this.init();
  }

  /**
   * Initialize router
   */
  init() {
    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      this.handleRouteChange(window.location.pathname, e.state);
    });

    // Handle link clicks - BUT ONLY for SPA routes, not static files
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;

      // Skip external links
      if (link.hostname !== window.location.hostname) return;
      
      // Skip anchor links
      if (link.getAttribute('href').startsWith('#')) return;

      // Skip links with data-external attribute
      if (link.dataset.external) return;
      
      // CRITICAL: Skip links to static HTML files (MPA structure)
      // Let browser handle navigation to actual files
      const href = link.getAttribute('href');
      if (href.startsWith('/tools/') || 
          href.startsWith('/blog/') || 
          href.startsWith('/admin/') ||
          href.endsWith('.html')) {
        return; // Let browser handle it normally
      }

      e.preventDefault();
      this.navigate(link.pathname);
    });

    // Handle initial route - ONLY for SPA routes, not on page load for static files
    // Static pages should be served by the server, not handled by client router
    const currentPath = window.location.pathname;
    const isStaticPage = currentPath.startsWith('/tools/') || 
                         currentPath.startsWith('/blog/') || 
                         currentPath.startsWith('/admin/');
    
    // Only handle route if it's not a static page
    if (!isStaticPage && currentPath !== '/') {
      this.handleRouteChange(currentPath);
    }
  }

  /**
   * Register a route
   * @param {string} path - Route path
   * @param {Function} handler - Route handler
   * @param {Object} options - Route options
   */
  register(path, handler, options = {}) {
    // Convert path to regex for parameter matching
    const paramNames = [];
    const regexPath = path.replace(/:([^/]+)/g, (match, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });

    this.routes.set(path, {
      pattern: new RegExp(`^${regexPath}$`),
      handler,
      paramNames,
      options: {
        title: options.title || '',
        requiresAuth: options.requiresAuth || false,
        ...options
      }
    });

    return this;
  }

  /**
   * Register middleware
   * @param {Function} middleware - Middleware function
   */
  use(middleware) {
    this.middleware.push(middleware);
    return this;
  }

  /**
   * Navigate to a route
   * @param {string} path - Route path
   * @param {Object} state - State to pass
   * @param {boolean} replace - Replace current history entry
   */
  navigate(path, state = {}, replace = false) {
    const fullPath = this.basePath + path;

    if (this.mode === 'history') {
      if (replace) {
        window.history.replaceState(state, '', fullPath);
      } else {
        window.history.pushState(state, '', fullPath);
      }
    } else {
      window.location.hash = path;
    }

    this.handleRouteChange(path, state);
    return this;
  }

  /**
   * Handle route change
   * @param {string} path - Current path
   * @param {Object} state - History state
   */
  async handleRouteChange(path, state = {}) {
    // Find matching route
    const route = this.findRoute(path);

    if (!route) {
      this.handleNotFound(path);
      return;
    }

    // Check authentication
    if (route.options.requiresAuth && !this.isAuthenticated()) {
      this.navigate('/login');
      return;
    }

    // Run middleware
    for (const middleware of this.middleware) {
      const result = await middleware(route, this.currentRoute);
      if (result === false) return; // Cancel navigation
    }

    // Update state
    const previousRoute = this.currentRoute;
    this.currentRoute = {
      path,
      params: route.params,
      query: this.parseQueryString(),
      state
    };

    stateManager.set('ui.currentRoute', this.currentRoute);

    // Update page title
    if (route.options.title) {
      document.title = route.options.title;
    }

    // Execute route handler
    try {
      await route.handler({
        params: route.params,
        query: this.currentRoute.query,
        state,
        previousRoute
      });
    } catch (error) {
      console.error('Route handler error:', error);
      this.handleError(error);
    }

    // Dispatch route change event
    window.dispatchEvent(new CustomEvent('routechange', {
      detail: { route: this.currentRoute, previousRoute }
    }));
  }

  /**
   * Find matching route
   * @param {string} path - Current path
   * @returns {Object|null} Matched route
   */
  findRoute(path) {
    for (const [routePath, route] of this.routes) {
      const match = path.match(route.pattern);
      if (match) {
        // Extract parameters
        const params = {};
        route.paramNames.forEach((name, index) => {
          params[name] = match[index + 1];
        });

        return { ...route, params, path: routePath };
      }
    }
    return null;
  }

  /**
   * Parse query string
   * @returns {Object} Query parameters
   */
  parseQueryString() {
    const params = {};
    const searchParams = new URLSearchParams(window.location.search);
    
    for (const [key, value] of searchParams) {
      params[key] = value;
    }
    
    return params;
  }

  /**
   * Handle 404
   * @param {string} path - Requested path
   */
  handleNotFound(path) {
    console.warn(`Route not found: ${path}`);
    
    const notFoundRoute = this.routes.get('/404');
    if (notFoundRoute) {
      notFoundRoute.handler({ path });
    } else {
      // Default 404 behavior
      document.body.innerHTML = `
        <div style="text-align: center; padding: 4rem;">
          <h1>404 - Page Not Found</h1>
          <p>The page "${path}" does not exist.</p>
          <a href="/">Go Home</a>
        </div>
      `;
    }
  }

  /**
   * Handle route error
   * @param {Error} error - Error object
   */
  handleError(error) {
    const errorRoute = this.routes.get('/error');
    if (errorRoute) {
      errorRoute.handler({ error });
    }
  }

  /**
   * Check if user is authenticated
   * @returns {boolean} Authentication status
   */
  isAuthenticated() {
    // Check session storage for admin
    return sessionStorage.getItem('adminLoggedIn') === 'true';
  }

  /**
   * Get current route
   * @returns {Object} Current route
   */
  getCurrentRoute() {
    return this.currentRoute;
  }

  /**
   * Generate URL for route
   * @param {string} path - Route path
   * @param {Object} params - Route parameters
   * @returns {string} Generated URL
   */
  url(path, params = {}) {
    let url = this.basePath + path;
    
    // Replace parameters
    Object.entries(params).forEach(([key, value]) => {
      url = url.replace(`:${key}`, encodeURIComponent(value));
    });
    
    return url;
  }

  /**
   * Go back in history
   */
  back() {
    window.history.back();
  }

  /**
   * Go forward in history
   */
  forward() {
    window.history.forward();
  }
}

// Singleton instance
export const router = new Router();

// Route definitions
export function initRoutes() {
  // Home
  router.register('/', () => {
    // Home page is static
  }, { title: 'NovaTools MC - Professional Financial Tools' });

  // Tools
  router.register('/tools/:category/:tool', (ctx) => {
    const { category, tool } = ctx.params;
    loadTool(category, tool);
  }, { title: 'Tool - NovaTools MC' });

  // Admin
  router.register('/admin', () => {
    // Admin dashboard
  }, { title: 'Admin Dashboard', requiresAuth: true });

  router.register('/admin/:section', (_ctx) => {
    // Admin section
  }, { title: 'Admin - NovaTools MC', requiresAuth: true });

  // Blog
  router.register('/blog', () => {
    // Blog list
  }, { title: 'Blog - NovaTools MC' });

  router.register('/blog/:slug', (_ctx) => {
    // Blog post
  }, { title: 'Blog Post - NovaTools MC' });

  // 404
  router.register('/404', () => {
    // Not found page
  }, { title: 'Page Not Found' });
}

function loadTool(_category, _tool) {
  // Tool loading logic
}

// ============================================================================
// UTILITY FUNCTIONS (Exported for testing)
// ============================================================================

const META_CACHE = new Map();

/**
 * Get vendor chunk name for a tool category
 * @param {string} category - Tool category
 * @returns {string|null} Vendor chunk name or null
 */
export function getVendorForCategory(category) {
  const vendorMap = {
    'pdf': 'pdf-vendor',
    'finance': 'finance-vendor',
    'image': 'image-vendor'
  };
  return vendorMap[category] || null;
}

/**
 * Load tool metadata from server
 * @param {string} toolPath - Tool path (e.g., 'pdf/merge')
 * @returns {Promise<Object|null>} Tool metadata or null
 */
export async function loadToolMeta(toolPath) {
  // Return cached result if available
  if (META_CACHE.has(toolPath)) {
    return META_CACHE.get(toolPath);
  }

  try {
    const response = await fetch(`/meta/${toolPath}.json`);
    if (!response.ok) {
      return null;
    }
    const meta = await response.json();
    META_CACHE.set(toolPath, meta);
    return meta;
  } catch (error) {
    console.warn(`Failed to load metadata for ${toolPath}:`, error);
    return null;
  }
}

/**
 * Generate breadcrumb HTML
 * @param {string} category - Tool category
 * @param {string} toolName - Tool name
 */
export function generateBreadcrumb(category, toolName) {
  const container = document.getElementById('breadcrumb');
  if (!container) return;

  const categoryLabels = {
    'pdf': 'PDF Araçları',
    'finance': 'Finans Araçları',
    'image': 'Görüntü Araçları',
    'religious': 'Dini Araçlar',
    'news': 'Haber Araçları'
  };

  container.innerHTML = `
    <nav class="breadcrumb">
      <a href="/">Ana Sayfa</a>
      <span class="separator">/</span>
      <a href="/tools/${category}/">${categoryLabels[category] || category}</a>
      <span class="separator">/</span>
      <span class="current">${toolName}</span>
    </nav>
  `;
}

export default router;
