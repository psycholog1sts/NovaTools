import legalContent from './i18n/legal.json';
import { initConsentManager } from './core/consent-manager.mjs';

const PAGE_FILES = {
  about: 'about-us.html',
  privacy: 'privacy-policy.html',
  cookies: 'cookie-policy.html',
  terms: 'terms-of-service.html',
  contact: 'contact.html'
};

function currentLanguage() {
  const pathLang = window.location.pathname.match(/^\/(tr|ar)(?=\/|$)/)?.[1];
  const queryLang = new URLSearchParams(window.location.search).get('lang');
  const stored = localStorage.getItem('mc-novatools-language');
  return pathLang || (['en', 'tr', 'ar'].includes(queryLang) ? queryLang : null) || (['en', 'tr', 'ar'].includes(stored) ? stored : 'en');
}

function pageKey() {
  return document.body.dataset.legalPage || 'privacy';
}

function slugify(value) {
  return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\u0600-\u06ff]+/g, '-').replace(/^-|-$/g, '');
}

function heading(title, id) {
  return `<h2 id="${id}"><a href="#${id}" aria-label="Link to ${title}">${title}</a></h2>`;
}

function renderList(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join('')}</ul>`;
}

function renderTable(table) {
  return `<div class="legal-table-wrap"><table class="legal-table"><thead><tr>${table.headers.map((header) => `<th>${header}</th>`).join('')}</tr></thead><tbody>${table.rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function renderForm(content) {
  const subjects = content.subjects.map((subject) => `<option value="${subject}">${subject}</option>`).join('');
  return `<form class="legal-form" id="contactForm" novalidate>
    <label>${content.name}<input id="name" name="name" autocomplete="name" required></label>
    <label>${content.email}<input id="email" name="email" type="email" autocomplete="email" required></label>
    <label>${content.subject}<select id="subject" name="subject" required><option value="">${content.select}</option>${subjects}</select></label>
    <label>${content.message}<textarea id="message" name="message" required minlength="10"></textarea></label>
    <button type="submit" class="legal-button">${content.submit}</button>
    <p class="legal-form-status" id="contactStatus" role="status"></p>
  </form>`;
}

function renderSection(section, formContent) {
  const id = section.id || slugify(section.title);
  let html = `<section class="legal-section" aria-labelledby="${id}">${heading(section.title, id)}`;
  if (section.body) html += section.body.map((paragraph) => `<p>${paragraph}</p>`).join('');
  if (section.list) html += renderList(section.list);
  if (section.table) html += renderTable(section.table);
  if (section.cards) {
    html += `<div class="legal-card-grid">${section.cards.map((card) => `<article class="legal-team-card"><div class="legal-avatar" aria-hidden="true">${card.name.slice(0, 2)}</div><div><h3>${card.name}</h3><p><strong>${card.role}</strong></p><p>${card.bio}</p></div></article>`).join('')}</div>`;
  }
  if (section.form) html += renderForm(formContent);
  html += '</section>';
  return html;
}

function setMeta(page, lang, key) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.title = page.metaTitle;
  document.querySelector('meta[name="description"]')?.setAttribute('content', page.metaDescription);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', page.metaTitle);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', page.metaDescription);
  document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', page.metaTitle);
  document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', page.metaDescription);
  const file = PAGE_FILES[key];
  const path = lang === 'en' ? `/${file}` : `/${lang}/${file}`;
  document.querySelector('link[rel="canonical"]')?.setAttribute('href', `https://mc-novatools.com${path}`);
}

function renderBreadcrumb(common, page, key, lang) {
  const root = lang === 'en' ? '/' : `/${lang}/`;
  const file = lang === 'en' ? `/${PAGE_FILES[key]}` : `/${lang}/${PAGE_FILES[key]}`;
  const breadcrumb = document.querySelector('[data-legal-breadcrumb]');
  if (breadcrumb) breadcrumb.innerHTML = `<a href="${root}">${common.home}</a><span>/</span><a href="${file}" aria-current="page">${page.title}</a>`;
}

function renderSidebar(page, common) {
  const sidebar = document.querySelector('[data-legal-sidebar]');
  if (!sidebar) return;
  sidebar.innerHTML = `<h2>${common.onThisPage}</h2>${page.sections.map((section) => `<a href="#${section.id}">${section.title}</a>`).join('')}`;
}

function updateActiveNav(key) {
  const file = PAGE_FILES[key];
  document.querySelectorAll('.legal-topnav a').forEach((link) => {
    if (link.getAttribute('href') === `/${file}`) link.setAttribute('aria-current', 'page');
  });
}

function updateSchema(page, key, lang) {
  const file = PAGE_FILES[key];
  const path = lang === 'en' ? `/${file}` : `/${lang}/${file}`;
  const schema = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'Organization', name: 'MC NovaTools', url: 'https://mc-novatools.com/', email: legalContent.en.common.email, founder: { '@type': 'Person', name: 'Metehan ÇETİN, LPC' } },
      { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Home', item: 'https://mc-novatools.com/' }, { '@type': 'ListItem', position: 2, name: page.title, item: `https://mc-novatools.com${path}` }] },
      { '@type': key === 'contact' ? 'ContactPage' : 'WebPage', name: page.title, url: `https://mc-novatools.com${path}`, description: page.metaDescription, inLanguage: lang }
    ]
  };
  const script = document.querySelector('script[data-legal-schema]');
  if (script) script.textContent = JSON.stringify(schema);
}

function setupContactForm(formContent) {
  const form = document.getElementById('contactForm');
  const status = document.getElementById('contactStatus');
  if (!form || !status) return;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!form.checkValidity()) {
      status.textContent = formContent.error;
      status.classList.add('error');
      form.reportValidity();
      return;
    }
    status.classList.remove('error');
    const data = new FormData(form);
    const subject = encodeURIComponent(`MC NovaTools - ${data.get('subject')}`);
    const body = encodeURIComponent(`Name: ${data.get('name')}\nEmail: ${data.get('email')}\nSubject: ${data.get('subject')}\n\nMessage:\n${data.get('message')}`);
    window.location.href = `mailto:${legalContent.en.common.email}?subject=${subject}&body=${body}`;
    status.textContent = formContent.success;
  });
}

function render() {
  const lang = currentLanguage();
  const key = pageKey();
  const localized = legalContent[lang] || legalContent.en;
  const page = localized.pages[key];
  setMeta(page, lang, key);
  renderBreadcrumb(localized.common, page, key, lang);
  renderSidebar(page, localized.common);
  updateActiveNav(key);
  updateSchema(page, key, lang);
  const article = document.querySelector('[data-legal-content]');
  article.innerHTML = `<p class="legal-eyebrow">${page.badge}</p><h1>${page.title}</h1><p class="legal-lede">${page.intro}</p><p class="legal-updated">${localized.common.updated}</p>${page.sections.map((section) => renderSection(section, localized.form)).join('')}`;
  document.querySelectorAll('[data-cookie-settings]').forEach((button) => { button.textContent = localized.common.settings; });
  setupContactForm(localized.form);
}

document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', () => { render(); initConsentManager(); }) : (render(), initConsentManager());
