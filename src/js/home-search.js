/**
 * Homepage search field.
 *
 * A combobox over the shared tool index: keyboard-first, grouped results,
 * recents on an empty query, and three distinct empty states. Focus never
 * leaves the input — the active option is tracked with aria-activedescendant,
 * which is what lets a screen-reader user arrow through results.
 */
import manifest from '../../tools-manifest.json';
import blogPosts from '../i18n/blog/en.json';
import { buildIndex, search, recentItems, rememberTool, publicToolHref } from './tool-search.js';

export { publicToolHref };

const RESULT_LIMIT = 8;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function initHomeSearch({ getToolHref, locale = 'en' } = {}) {
  const form = document.getElementById('homeSearchForm');
  const input = document.getElementById('homeSearchInput');
  const results = document.getElementById('homeSearchResults');
  const status = document.getElementById('homeSearchStatus');
  if (!form || !input || !results || form.dataset.searchReady === 'true') return;
  form.dataset.searchReady = 'true';

  const index = buildIndex({
    tools: manifest.tools,
    posts: blogPosts,
    locale,
    getToolHref: getToolHref || ((slug) => `/tools/${slug}/`)
  });

  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('autocomplete', 'off');
  results.setAttribute('role', 'listbox');

  let options = [];
  let activeIndex = -1;

  function announce(message) {
    if (status) status.textContent = message;
  }

  function close() {
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    results.replaceChildren();
    results.hidden = true;
    options = [];
    activeIndex = -1;
  }

  function setActive(next) {
    if (!options.length) return;
    activeIndex = (next + options.length) % options.length;
    options.forEach((option, i) => {
      const active = i === activeIndex;
      option.classList.toggle('is-active', active);
      option.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    input.setAttribute('aria-activedescendant', options[activeIndex].id);
    options[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  function renderGroups(groups, { heading } = {}) {
    results.replaceChildren();
    options = [];
    activeIndex = -1;

    if (heading) results.append(el('p', 'home-search__hint', heading));

    let counter = 0;
    for (const [groupName, items] of groups) {
      if (!items.length) continue;
      const groupId = `homeSearchGroup-${counter}`;
      const group = el('div', 'home-search__group');
      group.setAttribute('role', 'group');
      group.setAttribute('aria-labelledby', groupId);

      const label = el('p', 'home-search__group-label', groupName);
      label.id = groupId;
      group.append(label);

      for (const item of items) {
        const option = document.createElement('a');
        option.className = 'home-search__result';
        option.id = `homeSearchOption-${counter}`;
        option.href = item.href;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', 'false');
        option.dataset.toolId = item.kind === 'tool' ? item.id : '';

        const main = el('span', 'home-search__result-main');
        main.append(el('strong', null, item.name));
        if (item.description) main.append(el('small', null, item.description));
        option.append(main, el('em', null, item.group));

        option.addEventListener('click', () => {
          if (option.dataset.toolId) rememberTool(option.dataset.toolId);
        });

        group.append(option);
        options.push(option);
        counter += 1;
      }
      results.append(group);
    }

    results.hidden = false;
    input.setAttribute('aria-expanded', options.length ? 'true' : 'false');
    announce(options.length ? `${options.length} result${options.length === 1 ? '' : 's'}` : 'No results');
  }

  function renderEmpty(query) {
    results.replaceChildren();
    options = [];
    activeIndex = -1;
    const empty = el('div', 'home-search__empty');
    empty.append(el('p', 'home-search__empty-title', `No tool matches “${query}”.`));
    const actions = el('p', 'home-search__empty-actions');
    const browse = document.createElement('a');
    browse.href = '/categories/index.html';
    browse.textContent = 'Browse every category';
    const request = document.createElement('a');
    request.href = '/request-tool.html';
    request.textContent = 'Request this tool';
    actions.append(browse, document.createTextNode(' · '), request);
    empty.append(actions);
    results.append(empty);
    results.hidden = false;
    input.setAttribute('aria-expanded', 'false');
    announce('No results');
  }

  function showRecents() {
    const recents = recentItems(index);
    if (!recents.length) {
      close();
      return;
    }
    renderGroups([['Recently used', recents]], { heading: 'Pick up where you left off' });
  }

  function update() {
    const query = input.value.trim();
    if (!query) {
      showRecents();
      return;
    }
    const found = search(index, query, { limit: RESULT_LIMIT });
    if (!found.length) {
      renderEmpty(query);
      return;
    }
    const grouped = new Map();
    for (const item of found) {
      if (!grouped.has(item.group)) grouped.set(item.group, []);
      grouped.get(item.group).push(item);
    }
    renderGroups([...grouped.entries()]);
  }

  input.addEventListener('input', update);
  input.addEventListener('focus', () => {
    if (!input.value.trim()) showRecents();
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!options.length) update();
      setActive(activeIndex + 1);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(activeIndex - 1);
    } else if (event.key === 'Enter') {
      if (activeIndex >= 0 && options[activeIndex]) {
        event.preventDefault();
        options[activeIndex].click();
        window.location.assign(options[activeIndex].href);
      }
    } else if (event.key === 'Escape') {
      if (input.value) {
        input.value = '';
        update();
      } else {
        close();
      }
    }
  });

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const first = options[activeIndex >= 0 ? activeIndex : 0];
    if (first) {
      first.click();
      window.location.assign(first.href);
      return;
    }
    input.focus();
  });

  document.addEventListener('click', (event) => {
    if (!form.contains(event.target)) close();
  });

  close();
}
