/**
 * Tool search core.
 *
 * One index, one matcher, shared by the homepage field and the ⌘K palette.
 * Everything runs locally against a preloaded index — the catalogue is small
 * enough that debouncing would only add latency.
 */
import { publicCertifiedTools } from '../data/public-tools.mjs';
import { isPublishedBlogSlug } from './blog-publication.js';

export const RECENTS_KEY = 'novatools:recent-tools';
const RECENTS_LIMIT = 6;

/**
 * Task phrasing people actually type, mapped to tool ids. Without these,
 * "kg to lbs" and "epoch" find nothing even though the tool exists.
 */
const ALIASES = {
  'age-calculator': ['how old am i', 'birthday', 'date of birth', 'dob', 'years old', 'yas hesaplama', 'kac yasindayim'],
  'bmi-calculator': ['body mass index', 'height weight', 'kilo boy', 'vucut kitle indeksi'],
  'number-base-converter': ['binary', 'hex', 'hexadecimal', 'octal', 'base 2', 'base 16', 'decimal to binary', 'ikilik', 'onaltilik'],
  'percentage-calculator': ['percent', 'percentage off', 'discount', 'increase', 'yuzde', 'indirim'],
  'roman-numerals': ['roman', 'mmxxiv', 'numerals', 'roma rakamlari'],
  'scientific-calculator': ['calculator', 'sin cos tan', 'logarithm', 'square root', 'hesap makinesi'],
  'timezone-converter': ['timezone', 'time zone', 'utc', 'gmt', 'meeting time', 'saat dilimi'],
  'unit-converter': ['kg to lbs', 'cm to inches', 'celsius to fahrenheit', 'metric', 'imperial', 'birim cevirme'],
  'unix-timestamp': ['epoch', 'timestamp', 'unix time', 'iso 8601', 'zaman damgasi'],
  'image-compress': ['compress image', 'shrink photo', 'reduce image size', 'webp', 'gorsel sikistirma'],
  'image-flipper': ['flip image', 'mirror', 'rotate photo', 'gorsel cevirme'],
  'pdf-compress': ['compress pdf', 'reduce pdf size', 'shrink pdf', 'pdf kucultme'],
  'live-exchange': ['exchange rate', 'currency', 'usd try', 'eur try', 'doviz kuru'],
  'crypto-prices': ['bitcoin', 'ethereum', 'crypto price', 'kripto'],
  'stock-lookup': ['stock price', 'ticker', 'quote', 'hisse'],
  'roi-calculator': ['return on investment', 'profit', 'yatirim getirisi'],
  'compound-interest': ['interest', 'savings growth', 'bilesik faiz'],
  'mortgage-tr': ['mortgage', 'home loan', 'konut kredisi', 'monthly payment']
};

export function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase('en')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function description(tool, locale) {
  if (typeof tool.description === 'string') return tool.description;
  return tool.description?.[locale] || tool.description?.en || tool.description?.tr || '';
}

export function publicToolHref(tool, getToolHref = (slug) => `/tools/${slug}/`) {
  const entry = String(tool?.entry || '').trim();
  if (entry.startsWith('/src/tools/')) return entry.replace(/^\/src\//, '/');
  if (entry.startsWith('/tools/')) return entry;

  const path = String(tool?.path || '').replace(/^\/+|\/+$/g, '');
  if (path) return `/tools/${path}/`;

  const category = String(tool?.category || '').replace(/^\/+|\/+$/g, '');
  const id = String(tool?.id || '').replace(/^\/+|\/+$/g, '');
  if (category && id) return `/tools/${category}/${id}/`;
  if (id) return getToolHref(id);
  return '/categories/index.html';
}

const CATEGORY_LABELS = {
  converters: 'Convert & calculate',
  finance: 'Finance',
  image: 'Images',
  pdf: 'PDF',
  dev: 'Developer',
  data: 'Data',
  text: 'Text',
  design: 'Design',
  productivity: 'Productivity',
  security: 'Security',
  social: 'Social'
};

export function categoryLabel(category) {
  return CATEGORY_LABELS[category] || 'Tools';
}

/**
 * Build the searchable index. Only certified, public, indexable tools and
 * published articles are included — search must never lead to a route that
 * fails closed or was withheld.
 */
export function buildIndex({ tools = [], posts = [], locale = 'en', getToolHref } = {}) {
  const toolItems = publicCertifiedTools(tools).map((tool) => {
    const name = locale === 'tr' ? (tool.name || tool.nameEn) : (tool.nameEn || tool.name);
    const aliases = ALIASES[tool.id] || [];
    return {
      id: tool.id,
      kind: 'tool',
      name: name || tool.id,
      group: categoryLabel(tool.category),
      category: tool.category,
      description: description(tool, locale),
      href: publicToolHref(tool, getToolHref),
      haystack: normalize([
        name,
        tool.name,
        tool.nameEn,
        tool.id.replace(/-/g, ' '),
        categoryLabel(tool.category),
        description(tool, locale),
        (tool.keywords?.en || []).join(' '),
        (tool.keywords?.tr || []).join(' '),
        aliases.join(' ')
      ].join(' '))
    };
  });

  const postItems = posts
    .filter((post) => post && post.slug && post.title && isPublishedBlogSlug(post.slug))
    .map((post) => ({
      id: `guide-${post.slug}`,
      kind: 'guide',
      name: post.title,
      group: 'Guides',
      description: post.excerpt || '',
      href: `/blog/articles/${post.slug}.html`,
      haystack: normalize([post.title, post.excerpt, post.category, post.slug.replace(/-/g, ' ')].join(' '))
    }));

  return [...toolItems, ...postItems];
}

/**
 * Score: a whole-phrase hit outranks scattered term hits, and a hit in the
 * name outranks one buried in the description.
 */
export function search(index, rawQuery, { limit = 8 } = {}) {
  const query = normalize(rawQuery);
  if (!query) return [];

  const terms = query.split(' ').filter(Boolean);
  const scored = [];

  for (const item of index) {
    const nameHay = normalize(item.name);
    let score = 0;

    if (nameHay === query) score += 100;
    else if (nameHay.startsWith(query)) score += 60;
    if (item.haystack.includes(query)) score += 30;

    for (const term of terms) {
      if (!item.haystack.includes(term)) {
        score = 0;
        break;
      }
      score += nameHay.includes(term) ? 6 : 2;
    }

    if (score > 0) scored.push({ item, score });
  }

  scored.sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
  return scored.slice(0, limit).map((entry) => entry.item);
}

/* ---------------------------------------------------------------- recents */

function readStorage() {
  try {
    const raw = window.localStorage.getItem(RECENTS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

/** Only tool ids are stored. No queries, no inputs, no results. */
export function recentToolIds() {
  return readStorage().slice(0, RECENTS_LIMIT);
}

export function rememberTool(id) {
  if (!id) return;
  try {
    const next = [id, ...readStorage().filter((entry) => entry !== id)].slice(0, RECENTS_LIMIT);
    window.localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable (private mode, blocked cookies) — recents are a convenience, not a requirement */
  }
}

export function forgetRecentTools() {
  try {
    window.localStorage.removeItem(RECENTS_KEY);
  } catch {
    /* nothing to do */
  }
}

export function recentItems(index) {
  const ids = recentToolIds();
  return ids.map((id) => index.find((item) => item.id === id)).filter(Boolean);
}
