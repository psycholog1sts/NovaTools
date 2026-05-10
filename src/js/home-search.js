import manifest from '../../tools-manifest.json';

function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function getDescription(tool) {
  if (typeof tool.description === 'string') return tool.description;
  return tool.description?.tr || tool.description?.en || '';
}

function toSearchItem(tool, getToolHref) {
  const fallbackSlug = tool.entry?.replace(/^\/tools\//, '').replace(/\/$/, '') || tool.path?.replace(/^\//, '');
  const href = tool.entry || getToolHref(fallbackSlug || tool.id);
  const keywords = [
    ...(tool.keywords?.tr || []),
    ...(tool.keywords?.en || [])
  ];

  return {
    id: tool.id,
    name: tool.name || tool.nameEn || tool.id,
    category: tool.category || 'tools',
    description: getDescription(tool),
    href,
    haystack: normalize([
      tool.name,
      tool.nameEn,
      tool.category,
      getDescription(tool),
      keywords.join(' ')
    ].join(' '))
  };
}

function renderResults(container, input, results) {
  input.setAttribute('aria-expanded', String(results.length > 0));

  if (!results.length) {
    container.innerHTML = '<div class="home-search__empty">Sonuç bulunamadı. Farklı bir görev adı deneyin.</div>';
    return;
  }

  container.innerHTML = results.map((tool) => `
    <a class="home-search__result" href="${tool.href}" role="option">
      <span>
        <strong>${tool.name}</strong>
        <small>${tool.description}</small>
      </span>
      <em>${tool.category}</em>
    </a>
  `).join('');
}

export function initHomeSearch({ getToolHref } = {}) {
  const form = document.getElementById('homeSearchForm');
  const input = document.getElementById('homeSearchInput');
  const resultsContainer = document.getElementById('homeSearchResults');
  const resolveHref = getToolHref || ((slug) => `/tools/${slug}/`);

  if (!form || !input || !resultsContainer || form.dataset.searchReady === 'true') return;
  form.dataset.searchReady = 'true';

  const tools = (manifest.tools || []).map((tool) => toSearchItem(tool, resolveHref));

  input.addEventListener('input', () => {
    const query = normalize(input.value);

    if (query.length < 2) {
      input.setAttribute('aria-expanded', 'false');
      resultsContainer.innerHTML = '';
      return;
    }

    const queryParts = query.split(/\s+/).filter(Boolean);
    const results = tools
      .map((tool) => ({
        tool,
        score: queryParts.reduce((score, part) => score + (tool.haystack.includes(part) ? 1 : 0), 0)
      }))
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.tool.name.localeCompare(b.tool.name))
      .slice(0, 6)
      .map((entry) => entry.tool);

    renderResults(resultsContainer, input, results);
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const firstResult = resultsContainer.querySelector('a');

    if (firstResult) {
      firstResult.click();
      return;
    }

    input.focus();
  });

  document.addEventListener('click', (event) => {
    if (!form.contains(event.target)) {
      input.setAttribute('aria-expanded', 'false');
      resultsContainer.innerHTML = '';
    }
  });
}
