import manifest from '../../tools-manifest.json';
import blogPosts from '../i18n/blog/en.json';
import { categoryLabel, toolHref, toolName } from './engagement-widgets.mjs';

const CATEGORY_ROUTES = {
  pdf: '/categories/pdf-tools.html',
  image: '/categories/image-tools.html',
  finance: '/categories/finance-tools.html',
  dev: '/categories/developer-tools.html',
  text: '/categories/text-writing.html',
  converters: '/categories/converters.html',
  data: '/categories/data-tools.html',
  design: '/categories/design-tools.html',
  productivity: '/categories/productivity-tools.html',
  security: '/categories/security-tools.html',
  social: '/categories/social-media-tools.html'
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function groupedTools(limitPerCategory = 5) {
  return Object.entries((manifest.tools || []).reduce((groups, tool) => {
    const key = tool.category || 'tools';
    groups[key] = groups[key] || [];
    groups[key].push(tool);
    return groups;
  }, {})).map(([category, tools]) => ({ category, tools: tools.slice(0, limitPerCategory), count: tools.length }));
}

export function renderMegaHeader() {
  const groups = groupedTools(4);
  const latestPosts = (blogPosts || []).slice(0, 4);
  return `<header class="nt-mega-header" role="banner">
    <a class="skip-link" href="#main-content">Skip to content</a>
    <div class="nt-mega-header__inner">
      <a class="nt-mega-header__brand" href="/" aria-label="MC NovaTools home">MC NovaTools</a>
      <nav class="nt-mega-nav" aria-label="Primary navigation">
        <details class="nt-mega-menu">
          <summary>Tools</summary>
          <div class="nt-mega-panel nt-mega-panel--tools">
            ${groups.map((group) => `<section><h2><a href="${CATEGORY_ROUTES[group.category] || '/categories/index.html'}">${escapeHtml(categoryLabel(group.category))} (${group.count})</a></h2><ul>${group.tools.map((tool) => `<li><a href="${toolHref(tool)}">${escapeHtml(toolName(tool))}</a></li>`).join('')}</ul></section>`).join('')}
          </div>
        </details>
        <details class="nt-mega-menu">
          <summary>Guides</summary>
          <div class="nt-mega-panel"><a href="/guides/complete-pdf-workflow.html">PDF workflows</a><a href="/guides/articles/regex-cheat-sheet-web-developers.html">Developer guides</a><a href="/guides/articles/color-contrast-accessibility-wcag-22.html">Accessibility</a></div>
        </details>
        <details class="nt-mega-menu">
          <summary>Blog</summary>
          <div class="nt-mega-panel">${latestPosts.map((post) => `<a href="/blog/articles/${escapeHtml(post.slug)}.html">${escapeHtml(post.title)}</a>`).join('')}<a href="/blog/index.html">All posts</a></div>
        </details>
        <details class="nt-mega-menu">
          <summary>About</summary>
          <div class="nt-mega-panel"><a href="/about-us.html">About</a><a href="/contact.html">Contact</a><a href="/author/metehan-cetin.html">Team</a></div>
        </details>
      </nav>
      <button class="nt-theme-toggle" type="button" data-nt-theme-toggle aria-label="Toggle dark mode">Theme</button>
    </div>
    <noscript><p class="nt-js-note">Navigation links work without JavaScript. Theme preference and dynamic suggestions require JavaScript.</p></noscript>
  </header>`;
}

export function renderFourColumnFooter() {
  const groups = groupedTools(3).slice(0, 8);
  return `<footer class="nt-footer" role="contentinfo">
    <div class="nt-footer__grid">
      <nav aria-label="Tools by category"><h2>Tools by Category</h2><ul>${groups.map((group) => `<li><a href="${CATEGORY_ROUTES[group.category] || '/categories/index.html'}">${escapeHtml(categoryLabel(group.category))} (${group.count})</a></li>`).join('')}</ul></nav>
      <nav aria-label="Guides and resources"><h2>Guides & Resources</h2><ul><li><a href="/blog/index.html">Blog</a></li><li><a href="/guides/complete-pdf-workflow.html">PDF workflow guide</a></li><li><a href="/site-map/topical.html">Topic map</a></li></ul></nav>
      <nav aria-label="Company"><h2>Company</h2><ul><li><a href="/about-us.html">About</a></li><li><a href="/contact.html">Contact</a></li><li><a href="/author/metehan-cetin.html">Team</a></li><li><a href="/contact.html?topic=careers">Careers</a></li></ul></nav>
      <nav aria-label="Legal"><h2>Legal</h2><ul><li><a href="/privacy-policy.html">Privacy</a></li><li><a href="/terms-of-service.html">Terms</a></li><li><a href="/disclaimer.html">Disclaimer</a></li><li><a href="/cookie-policy.html">Cookie Policy</a></li></ul></nav>
    </div>
  </footer>`;
}

function readThemePreference() {
  try {
    return window.localStorage?.getItem('novatools-theme') || window.localStorage?.getItem('theme') || '';
  } catch {
    return '';
  }
}

function writeThemePreference(theme) {
  try {
    window.localStorage?.setItem('novatools-theme', theme);
    window.localStorage?.setItem('theme', theme);
  } catch {
    // Theme still applies for this page when persistent storage is unavailable.
  }
}

export function setupThemePreference(buttonSelector = '[data-nt-theme-toggle]') {
  const button = document.querySelector(buttonSelector);
  const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    writeThemePreference(theme);
    if (button) button.setAttribute('aria-pressed', String(theme === 'dark'));
  };
  const stored = readThemePreference();
  if (stored) applyTheme(stored);
  if (button) {
    button.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }
}
