import manifest from '../../tools-manifest.json';
import blogPosts from '../i18n/blog/en.json';

const STORAGE_PREFIX = 'novatools:';
const MAX_RECENT = 6;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const CATEGORY_LABELS = {
  pdf: 'PDF Tools',
  image: 'Image Tools',
  finance: 'Finance Tools',
  dev: 'Developer Tools',
  text: 'Text Tools',
  converters: 'Converters',
  data: 'Data Tools',
  design: 'Design Tools',
  productivity: 'Productivity Tools',
  security: 'Security Tools',
  social: 'Social Media Tools',
  news: 'News Tools',
  religious: 'Calendar Tools'
};

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function readJson(key, fallback) {
  try {
    const raw = window.localStorage?.getItem(`${STORAGE_PREFIX}${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage?.setItem(`${STORAGE_PREFIX}${key}`, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function storageKey(id, suffix) {
  return `${suffix}:${id}`;
}

export function toolHref(tool) {
  const entry = tool?.entry || '';
  if (entry.startsWith('/src/tools/')) return entry.replace(/^\/src\//, '/');
  if (entry) return entry;
  const path = String(tool?.path || '').replace(/^\//, '');
  return path ? `/tools/${path}/` : '/categories/index.html';
}

export function toolName(tool) {
  return tool?.name || tool?.nameEn || tool?.id || 'Tool';
}

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] || category || 'Tools';
}

export function allTools() {
  return manifest.tools || [];
}

export function getSimilarTools(tool, limit = 4) {
  const category = tool?.category;
  const relatedIds = tool?.relatedTools || [];
  const byRelated = relatedIds
    .map((id) => allTools().find((candidate) => candidate.id === id))
    .filter(Boolean);
  const byCategory = allTools().filter((candidate) => candidate.category === category && candidate.id !== tool?.id);
  return [...byRelated, ...byCategory]
    .filter((candidate, index, items) => candidate && items.findIndex((item) => item.id === candidate.id) === index)
    .slice(0, limit);
}

export function getSuggestedBlogPosts(tool, limit = 3) {
  const haystack = [tool?.category, toolName(tool), tool?.id].join(' ').toLowerCase();
  return (blogPosts || [])
    .map((post) => {
      const text = [post.title, post.description, post.category, post.slug].join(' ').toLowerCase();
      const score = haystack.split(/[\s-]+/).filter(Boolean).reduce((total, token) => total + (text.includes(token) ? 1 : 0), 0);
      return { post, score };
    })
    .sort((a, b) => b.score - a.score || a.post.title.localeCompare(b.post.title))
    .slice(0, limit)
    .map(({ post }) => post);
}

export function recordToolUse(tool) {
  if (!tool?.id) return;
  const now = Date.now();
  const recent = readJson('recent-tools', []).filter((item) => item.id !== tool.id);
  recent.unshift({ id: tool.id, name: toolName(tool), href: toolHref(tool), category: categoryLabel(tool.category), at: now });
  writeJson('recent-tools', recent.slice(0, MAX_RECENT));

  const popularity = readJson('tool-popularity', {});
  const current = popularity[tool.id] || { id: tool.id, name: toolName(tool), href: toolHref(tool), category: categoryLabel(tool.category), events: [] };
  current.name = toolName(tool);
  current.href = toolHref(tool);
  current.category = categoryLabel(tool.category);
  current.events = [...(current.events || []).filter((time) => now - time < WEEK_MS), now];
  popularity[tool.id] = current;
  writeJson('tool-popularity', popularity);
}

export function getPopularThisWeek(limit = 6) {
  const popularity = readJson('tool-popularity', {});
  const localItems = Object.values(popularity)
    .map((item) => ({ ...item, count: (item.events || []).filter((time) => Date.now() - time < WEEK_MS).length }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

  if (localItems.length) return localItems;

  return allTools().slice(0, limit).map((tool) => ({
    id: tool.id,
    name: toolName(tool),
    href: toolHref(tool),
    category: categoryLabel(tool.category),
    count: 0
  }));
}

export function renderRelatedTools(tool) {
  const items = getSimilarTools(tool, 4);
  return `<section class="nt-related-tools" aria-labelledby="nt-related-title">
    <div class="nt-section-heading">
      <span>Keep working</span>
      <h2 id="nt-related-title">Related Tools</h2>
    </div>
    <div class="nt-related-carousel" role="list">
      ${items.map((item) => `<a class="nt-related-card" href="${toolHref(item)}" role="listitem">
        <span class="nt-related-thumb" aria-hidden="true">${escapeHtml(categoryLabel(item.category).slice(0, 3).toUpperCase())}</span>
        <strong>${escapeHtml(toolName(item))}</strong>
        <small>${escapeHtml(categoryLabel(item.category))}</small>
      </a>`).join('')}
    </div>
  </section>`;
}

export function renderCompareTools(tool) {
  const items = getSimilarTools(tool, 3);
  return `<section class="nt-compare-tools" aria-labelledby="nt-compare-title">
    <h2 id="nt-compare-title">Compare with Similar Tools</h2>
    <div class="nt-compare-grid">
      <article><strong>${escapeHtml(toolName(tool))}</strong><span>Current workflow</span></article>
      ${items.map((item) => `<a href="${toolHref(item)}"><strong>${escapeHtml(toolName(item))}</strong><span>${escapeHtml(categoryLabel(item.category))}</span></a>`).join('')}
    </div>
  </section>`;
}

export function renderBlogSuggestions(tool) {
  const posts = getSuggestedBlogPosts(tool, 3);
  return `<section class="nt-blog-suggestions" aria-labelledby="nt-blog-suggestions-title">
    <div class="nt-section-heading">
      <span>Guides</span>
      <h2 id="nt-blog-suggestions-title">You might also like</h2>
    </div>
    <div class="nt-blog-suggestion-grid">
      ${posts.map((post) => `<a href="/blog/articles/${escapeHtml(post.slug)}.html">
        <strong>${escapeHtml(post.title)}</strong>
        <span>${escapeHtml(post.description || post.category || 'Practical guide')}</span>
      </a>`).join('')}
    </div>
  </section>`;
}

export function renderRating(tool) {
  const rating = readJson(storageKey(tool.id, 'rating'), { value: 0 });
  return `<section class="nt-rating" aria-labelledby="nt-rating-title" data-tool-rating="${escapeHtml(tool.id)}">
    <h2 id="nt-rating-title">Rate this tool</h2>
    <div class="nt-stars" role="radiogroup" aria-label="Rate ${escapeHtml(toolName(tool))}">
      ${[1, 2, 3, 4, 5].map((value) => `<button type="button" class="nt-star${rating.value >= value ? ' is-active' : ''}" data-rating-value="${value}" aria-label="${value} star${value > 1 ? 's' : ''}" aria-pressed="${rating.value === value}">★</button>`).join('')}
    </div>
    <p class="nt-rating-summary">${rating.value ? `Your rating: ${rating.value}/5. Saved on this device.` : 'No rating yet. Ratings are stored only on this device.'}</p>
    <noscript><p>Enable JavaScript to save a private, device-only rating.</p></noscript>
  </section>`;
}

export function renderFeedback(tool) {
  const feedback = readJson(storageKey(tool.id, 'feedback'), { value: '' });
  return `<section class="nt-feedback" aria-labelledby="nt-feedback-title" data-tool-feedback="${escapeHtml(tool.id)}">
    <h2 id="nt-feedback-title">Was this helpful?</h2>
    <div class="nt-feedback-actions">
      <button type="button" data-feedback-value="yes" aria-pressed="${feedback.value === 'yes'}">Yes</button>
      <button type="button" data-feedback-value="no" aria-pressed="${feedback.value === 'no'}">No</button>
    </div>
    <p>${feedback.value ? 'Thanks — your feedback is saved on this device only.' : 'Your answer stays in localStorage; no server tracking is used.'}</p>
    <noscript><p>Feedback saving requires JavaScript and localStorage.</p></noscript>
  </section>`;
}

export function renderFavorites(tool) {
  const favorites = readJson('favorites', []);
  const saved = favorites.some((item) => item.id === tool.id);
  return `<button type="button" class="nt-favorite-button" data-tool-favorite="${escapeHtml(tool.id)}" aria-pressed="${saved}" aria-label="${saved ? 'Remove from favorites' : 'Save to favorites'}">
    ${saved ? '★ Saved' : '☆ Save to Favorites'}
  </button>`;
}

export function renderRecentlyUsed() {
  const recent = readJson('recent-tools', []);
  return `<aside class="nt-recent-tools" aria-labelledby="nt-recent-title">
    <h2 id="nt-recent-title">Recently Used</h2>
    ${recent.length ? `<ul>${recent.map((item) => `<li><a href="${escapeHtml(item.href)}"><strong>${escapeHtml(item.name)}</strong><span>${escapeHtml(item.category)}</span></a></li>`).join('')}</ul>` : '<p>Open a few tools and they will appear here. Stored only on this device.</p>'}
  </aside>`;
}

export function renderShareResult(tool) {
  return `<section class="nt-share-result" aria-labelledby="nt-share-title">
    <h2 id="nt-share-title">Share Result</h2>
    <p>Copy the current page link or select an output field to copy a result when available.</p>
    <button type="button" data-share-result="${escapeHtml(tool.id)}">Copy share link or output</button>
    <span class="nt-shortcut-hint">Hint: Ctrl+Enter runs many convert/format tools.</span>
  </section>`;
}

export function renderProgressIndicator(tool) {
  const isMultiStep = /merge|batch|convert|compress|ocr|split/i.test(`${tool?.id || ''} ${toolName(tool)}`);
  if (!isMultiStep) return '';
  return `<section class="nt-progress-steps" aria-labelledby="nt-progress-title">
    <h2 id="nt-progress-title">Progress</h2>
    <ol>
      <li><span>1</span>Add files or input</li>
      <li><span>2</span>Review settings</li>
      <li><span>3</span>Process in browser</li>
      <li><span>4</span>Review output</li>
    </ol>
    <div class="nt-progress-bar" role="progressbar" aria-label="Processing progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span></span></div>
  </section>`;
}

export function renderToolEngagementPanel(tool) {
  return `<section class="nt-engagement-panel" aria-labelledby="nt-engagement-title">
    <div class="nt-engagement-header">
      <div>
        <span>Private engagement</span>
        <h2 id="nt-engagement-title">Save, rate, and continue</h2>
      </div>
      ${renderFavorites(tool)}
    </div>
    <div class="nt-engagement-grid">
      ${renderRating(tool)}
      ${renderFeedback(tool)}
      ${renderShareResult(tool)}
    </div>
  </section>`;
}

export function bindEngagementWidgets(root = document) {
  root.querySelectorAll('[data-tool-rating]').forEach((widget) => {
    if (widget.dataset.bound === 'true') return;
    widget.dataset.bound = 'true';
    const toolId = widget.dataset.toolRating;
    widget.addEventListener('click', (event) => {
      const button = event.target.closest('[data-rating-value]');
      if (!button) return;
      const value = Number(button.dataset.ratingValue);
      writeJson(storageKey(toolId, 'rating'), { value, at: Date.now() });
      widget.querySelectorAll('[data-rating-value]').forEach((star) => {
        const active = Number(star.dataset.ratingValue) <= value;
        star.classList.toggle('is-active', active);
        star.setAttribute('aria-pressed', String(Number(star.dataset.ratingValue) === value));
      });
      const summary = widget.querySelector('.nt-rating-summary');
      if (summary) summary.textContent = `Your rating: ${value}/5. Saved on this device.`;
    });
  });

  root.querySelectorAll('[data-tool-feedback]').forEach((widget) => {
    if (widget.dataset.bound === 'true') return;
    widget.dataset.bound = 'true';
    const toolId = widget.dataset.toolFeedback;
    widget.addEventListener('click', (event) => {
      const button = event.target.closest('[data-feedback-value]');
      if (!button) return;
      const value = button.dataset.feedbackValue;
      writeJson(storageKey(toolId, 'feedback'), { value, at: Date.now() });
      widget.querySelectorAll('[data-feedback-value]').forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      const message = widget.querySelector('p');
      if (message) message.textContent = 'Thanks — your feedback is saved on this device only.';
    });
  });

  root.querySelectorAll('[data-tool-favorite]').forEach((button) => {
    if (button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';
    button.addEventListener('click', () => {
      const toolId = button.dataset.toolFavorite;
      const tool = allTools().find((candidate) => candidate.id === toolId) || { id: toolId, name: toolId };
      const favorites = readJson('favorites', []);
      const exists = favorites.some((item) => item.id === toolId);
      const next = exists ? favorites.filter((item) => item.id !== toolId) : [{ id: toolId, name: toolName(tool), href: toolHref(tool), category: categoryLabel(tool.category) }, ...favorites];
      writeJson('favorites', next.slice(0, 24));
      button.setAttribute('aria-pressed', String(!exists));
      button.setAttribute('aria-label', exists ? 'Save to favorites' : 'Remove from favorites');
      button.textContent = exists ? '☆ Save to Favorites' : '★ Saved';
    });
  });

  root.querySelectorAll('[data-share-result]').forEach((button) => {
    if (button.dataset.bound === 'true') return;
    button.dataset.bound = 'true';
    button.addEventListener('click', async () => {
      const output = document.querySelector('textarea[readonly], .result textarea, .output textarea, .result-panel textarea, pre.output, .output pre, .result pre');
      const text = output?.value || output?.textContent?.trim() || window.location.href;
      try {
        await navigator.clipboard?.writeText(text);
        button.textContent = 'Copied';
      } catch {
        button.textContent = 'Copy failed';
      }
      window.setTimeout(() => { button.textContent = 'Copy share link or output'; }, 1800);
    });
  });
}
