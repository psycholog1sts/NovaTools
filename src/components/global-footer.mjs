export const globalFooterLinks = {
  company: [
    { href: '/about-us.html', label: 'About Us' },
    { href: '/contact.html', label: 'Contact' },
    { href: '/blog/index.html', label: 'Blog' },
    { href: '/sitemap.xml', label: 'Sitemap' }
  ],
  legal: [
    { href: '/privacy-policy.html', label: 'Privacy Policy' },
    { href: '/terms-of-service.html', label: 'Terms' },
    { href: '/disclaimer.html', label: 'Disclaimer' },
    { href: '/cookie-policy.html', label: 'Cookie Policy' }
  ]
};

function renderLinkList(items) {
  return `<ul>${items.map((item) => `<li><a href="${item.href}">${item.label}</a></li>`).join('')}</ul>`;
}

export function renderGlobalFooter() {
  return `<footer class="global-footer" role="contentinfo">
  <div class="global-footer__inner">
    <section class="global-footer__brand" aria-labelledby="global-footer-brand">
      <h2 id="global-footer-brand">MC NovaTools</h2>
      <p>Privacy-first browser utilities for PDF, image, developer, finance, text, data, and productivity workflows.</p>
      <p><a href="mailto:support@mc-novatools.com">support@mc-novatools.com</a></p>
    </section>
    <nav class="global-footer__nav" aria-label="Company links">
      <h2>Company</h2>
      ${renderLinkList(globalFooterLinks.company)}
    </nav>
    <nav class="global-footer__nav" aria-label="Legal links">
      <h2>Legal</h2>
      ${renderLinkList(globalFooterLinks.legal)}
    </nav>
  </div>
</footer>`;
}

export function renderGlobalFooterStyle() {
  return `<style data-global-footer="true">.global-footer{border-top:1px solid rgba(148,163,184,.22);background:#07080b;color:#cbd5e1;padding:2rem 0}.global-footer__inner{width:min(1120px,calc(100% - 32px));margin:0 auto;display:grid;grid-template-columns:minmax(0,2fr) 1fr 1fr;gap:1.5rem}.global-footer h2{margin:0 0 .75rem;color:#f8fafc;font-size:1rem}.global-footer p{margin:.35rem 0;line-height:1.6}.global-footer ul{list-style:none;margin:0;padding:0}.global-footer li{margin:.45rem 0}.global-footer a{color:#cbd5e1;text-decoration:none}.global-footer a:hover{color:#67e8f9;text-decoration:underline}@media (max-width:760px){.global-footer__inner{grid-template-columns:1fr}}</style>`;
}
