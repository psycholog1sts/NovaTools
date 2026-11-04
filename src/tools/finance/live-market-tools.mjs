import { getExchangeRates } from '../../js/api/exchange.js';
import { getStockQuote } from '../../js/api/stocks.js';
import { getCryptoPrices } from '../../js/api/crypto.js';
import { numberLocale, onLanguageChange, strings } from './finance-i18n.mjs';

const UI = {
  en: {
    ready: 'Ready.', loading: 'Fetching data...', unavailable: 'Live data is unavailable.',
    unavailableDetail: 'Live data is unavailable right now. Please try again later.',
    mustBePositive: (label) => `${label} must be greater than 0.`,
    amount: 'Amount', supported: 'Supported currencies: TRY, USD, EUR.',
    sameCurrency: 'Same currency selected; no conversion needed.', result: 'Conversion result', notNeeded: 'Not needed', liveRequest: 'Live data request',
    noRate: 'No valid exchange rate was returned. Please try again later.', fromCache: 'A still-valid rate from your browser cache was used.', fromProvider: 'Current data received from the provider.',
    noProviderTime: 'No provider timestamp', updated: 'Last updated', source: 'Data source',
    exchangeNote: 'The result uses only a rate from the provider or a still-valid browser cache. Without either, NovaTools does not make up a market rate.',
    badSymbol: 'Enter a valid stock symbol.', noPrice: 'No valid stock price was returned. Check the symbol and try again later.',
    stockCache: 'Still-valid stock data from your browser cache was used.', stockOk: 'Stock data received.',
    closesTitle: "Provider's recent closes", closesLabel: 'Recent closing prices returned by the provider',
    noSeries: 'No chart: the provider did not return enough real closing prices in this response.',
    price: (symbol) => `${symbol} price`, change: 'Change', volume: 'Volume', market: 'Market / data source',
    stockNote: 'Price and any closing series are shown only from the provider or a still-valid browser cache. If the provider is unavailable, NovaTools does not show a static market price.',
    noCrypto: 'No valid crypto market data was returned. Please try again later.',
    partial: (n, total) => `The provider returned usable data for ${n}/${total} coins.`, cryptoCache: 'Still-valid crypto data from your browser cache was used.', cryptoOk: 'Crypto prices received.',
    day: '24h', marketCap: 'Market cap', cryptoVolume: 'Volume', fetched: 'Last fetched',
    cryptoNote: 'Without provider data (CoinGecko, or the Coinbase spot price when CoinGecko is unreachable) or a still-valid browser cache, no price is shown. NovaTools does not estimate prices for missing coins.',
    addFavorite: 'Add to favorites', removeFavorite: 'Remove from favorites', favorites: 'Favorites', noFavorites: 'No favorites yet.',
    forms: {
      'live-exchange': ['Amount', 'From', 'To', 'Update rate'],
      'stock-lookup': ['Stock symbol', 'Get quote'],
      'crypto-prices': ["The CoinGecko snapshot for BTC, ETH, SOL, XRP and ADA is cached in your browser for 5 minutes, and the page refreshes it every 5 minutes.", 'Check prices']
    }
  },
  tr: {
    ready: 'Hazır.', loading: 'Veri alınıyor...', unavailable: 'Canlı veri kullanılamıyor.',
    unavailableDetail: 'Canlı veri şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.',
    mustBePositive: (label) => `${label} 0’dan büyük olmalıdır.`,
    amount: 'Tutar', supported: 'Desteklenen para birimleri: TRY, USD, EUR.',
    sameCurrency: 'Aynı para birimi seçildi; kur dönüşümü gerekmiyor.', result: 'Dönüşüm sonucu', notNeeded: 'Gerekmez', liveRequest: 'Canlı veri isteği',
    noRate: 'Geçerli kur verisi alınamadı. Lütfen daha sonra tekrar deneyin.', fromCache: 'Tarayıcı önbelleğindeki geçerli veri kullanıldı.', fromProvider: 'Sağlayıcıdan güncel veri alındı.',
    noProviderTime: 'Sağlayıcı zamanı yok', updated: 'Son güncelleme', source: 'Veri kaynağı',
    exchangeNote: 'Sonuç yalnızca sağlayıcıdan veya süre sınırı içindeki gerçek tarayıcı önbelleğinden alınan kurla hesaplanır. Canlı/veri-cache kaynağı yoksa NovaTools piyasa kuru uydurmaz.',
    badSymbol: 'Geçerli bir hisse sembolü girin.', noPrice: 'Geçerli hisse fiyatı alınamadı. Sembolü kontrol edip daha sonra tekrar deneyin.',
    stockCache: 'Tarayıcı önbelleğindeki geçerli hisse verisi kullanıldı.', stockOk: 'Hisse verisi alındı.',
    closesTitle: 'Sağlayıcının son kapanışları', closesLabel: 'Sağlayıcıdan alınan son kapanış fiyatları',
    noSeries: 'Sağlayıcı bu yanıtta yeterli gerçek kapanış serisi vermediği için grafik gösterilmiyor.',
    price: (symbol) => `${symbol} fiyat`, change: 'Değişim', volume: 'Hacim', market: 'Piyasa / veri kaynağı',
    stockNote: 'Fiyat ve varsa kapanış serisi yalnızca sağlayıcıdan veya süre sınırı içindeki gerçek tarayıcı önbelleğinden gösterilir. Sağlayıcı kullanılamıyorsa NovaTools statik piyasa fiyatı üretmez.',
    noCrypto: 'Geçerli kripto piyasa verisi alınamadı. Lütfen daha sonra tekrar deneyin.',
    partial: (n, total) => `Sağlayıcı ${n}/${total} coin için kullanılabilir veri döndürdü.`, cryptoCache: 'Tarayıcı önbelleğindeki geçerli kripto verisi kullanıldı.', cryptoOk: 'Kripto fiyatları alındı.',
    day: '24s', marketCap: 'Market cap', cryptoVolume: 'Hacim', fetched: 'Son veri çekimi',
    cryptoNote: 'Sağlayıcı verisi (CoinGecko; erişilemezse Coinbase spot kuru) veya süre sınırı içindeki gerçek tarayıcı önbelleği yoksa fiyat gösterilmez. Eksik coinler için NovaTools tahmini/statik piyasa değeri üretmez.',
    addFavorite: 'Favoriye ekle', removeFavorite: 'Favoriden çıkar', favorites: 'Favoriler', noFavorites: 'Henüz favori eklenmedi.',
    forms: {
      'live-exchange': ['Tutar', 'Kaynak', 'Hedef', 'Kuru güncelle'],
      'stock-lookup': ['Hisse sembolü', 'Hisseyi getir'],
      'crypto-prices': ["BTC, ETH, SOL, XRP ve ADA için CoinGecko snapshot'ı tarayıcıda 5 dakika önbelleğe alınır. Otomatik yenileme 5 dakikada bir çalışır.", 'Fiyatları kontrol et']
    }
  }
};

const ui = () => strings(UI);

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const USD_FORMATTER = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EUR_FORMATTER = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
function formatNumber(value) {
  return new Intl.NumberFormat(numberLocale(), { maximumFractionDigits: 4 }).format(value);
}
const SUPPORTED_CURRENCIES = new Set(['TRY', 'USD', 'EUR']);
const CRYPTO_IDS = ['bitcoin', 'ethereum', 'solana', 'ripple', 'cardano'];
const CRYPTO_LABELS = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', ripple: 'XRP', cardano: 'ADA' };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function parsePositiveNumber(value, label) {
  const number = Number.parseFloat(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(number) || number <= 0) throw new Error(ui().mustBePositive(label));
  return number;
}

function formatCurrency(value, currency) {
  if (currency === 'USD') return USD_FORMATTER.format(value);
  if (currency === 'EUR') return EUR_FORMATTER.format(value);
  return TRY_FORMATTER.format(value);
}

function formatOptionalCurrency(value, currency) {
  return Number.isFinite(value) ? formatCurrency(value, currency) : 'N/A';
}

function formatOptionalNumber(value) {
  return Number.isFinite(value) ? formatNumber(value) : 'N/A';
}

function resultCards(cards) {
  return `<div class="result-grid">${cards.map((card) => `<div class="result-item ${card.className || ''}"><div class="result-value">${card.value}</div><div class="result-label">${card.label}</div></div>`).join('')}</div>`;
}

function localStorageGet(key, fallback) {
  try {
    return JSON.parse(window.localStorage.getItem(key) || 'null') ?? fallback;
  } catch {
    return fallback;
  }
}

function localStorageSet(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Favorites are optional; market-data lookup must keep working without storage.
  }
}

function favoriteToggleHtml(key, value, label) {
  const favorites = new Set(localStorageGet(key, []));
  const active = favorites.has(value);
  return `<button type="button" class="btn btn-secondary favorite-btn" data-favorite-key="${key}" data-favorite-value="${escapeHtml(value)}">${active ? ui().removeFavorite : ui().addFavorite}: ${escapeHtml(label)}</button>`;
}

function renderFavorites(key) {
  const target = document.getElementById('favoriteList');
  if (!target) return;
  const favorites = localStorageGet(key, []);
  target.innerHTML = favorites.length
    ? `<p class="finance-note"><strong>${ui().favorites}:</strong> ${favorites.map(escapeHtml).join(', ')}</p>`
    : `<p class="finance-note">${ui().noFavorites}</p>`;
}

function bindFavoriteButtons(container) {
  container.querySelectorAll('[data-favorite-key]').forEach((button) => {
    const key = button.dataset.favoriteKey;
    const value = button.dataset.favoriteValue;
    button.addEventListener('click', () => {
      const favorites = new Set(localStorageGet(key, []));
      if (favorites.has(value)) favorites.delete(value); else favorites.add(value);
      localStorageSet(key, [...favorites].slice(0, 20));
      renderFavorites(key);
      button.textContent = `${favorites.has(value) ? ui().removeFavorite : ui().addFavorite}: ${value}`;
    });
    renderFavorites(key);
  });
}

function canvasHtml(id, data, label) {
  return `<canvas id="${id}" width="760" height="260" data-chart='${JSON.stringify(data)}' aria-label="${escapeHtml(label)}" role="img"></canvas>`;
}

function drawLineChart(canvas) {
  if (!canvas?.getContext) return;
  let data = [];
  try { data = JSON.parse(canvas.dataset.chart || '[]'); } catch { data = []; }
  if (data.length < 2) return;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = 34;
  const values = data.map((point) => Number(point.value)).filter(Number.isFinite);
  if (values.length < 2) return;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = Math.max(max - min, Math.abs(max) * 0.01, 1);
  ctx.clearRect(0, 0, width, height);
  ctx.strokeStyle = 'rgba(148,163,184,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();
  ctx.beginPath();
  ctx.strokeStyle = '#22C55E';
  ctx.lineWidth = 3;
  values.forEach((value, index) => {
    const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / span) * (height - padding * 2);
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function normalizeStockSymbol(value) {
  const clean = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9.]/g, '');
  if (!clean) throw new Error(ui().badSymbol);
  if (['THYAO', 'GARAN'].includes(clean)) return `${clean}.IS`;
  return clean;
}

function displayStockSymbol(symbol) {
  return symbol.replace(/\.IS$/, '');
}

async function retry(operation, attempts = 2) {
  let lastError;
  for (let attempt = 0; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function calculateLiveExchange(formData, providers = { getExchangeRates }) {
  const t = ui();
  const amount = parsePositiveNumber(formData.amount, t.amount);
  const from = String(formData.from || 'USD').toUpperCase();
  const to = String(formData.to || 'TRY').toUpperCase();
  if (!SUPPORTED_CURRENCIES.has(from) || !SUPPORTED_CURRENCIES.has(to)) {
    throw new Error(t.supported);
  }

  if (from === to) {
    return {
      status: t.sameCurrency,
      type: 'success',
      html: resultCards([
        { value: `${formatCurrency(amount, from)} → ${formatCurrency(amount, to)}`, label: t.result, className: 'highlight' },
        { value: '1', label: `1 ${from} = ${to}` },
        { value: t.notNeeded, label: t.liveRequest }
      ])
    };
  }

  const response = await providers.getExchangeRates(from);
  const data = response?.data || {};
  const rate = Number(data.rates?.[to]);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error(t.noRate);
  const updatedAt = data.fetchedAt || data.date;
  const provider = data.provider || 'tcmb.gov.tr';
  const converted = amount * rate;
  const cacheNote = response?.source === 'cache' ? t.fromCache : t.fromProvider;

  return {
    status: cacheNote,
    type: response?.source === 'cache' ? 'warning' : 'success',
    html: `${resultCards([
      { value: `${formatCurrency(amount, from)} → ${formatCurrency(converted, to)}`, label: t.result, className: 'highlight' },
      { value: formatNumber(rate), label: `1 ${from} = ${to}` },
      { value: updatedAt ? new Date(updatedAt).toLocaleString(numberLocale()) : t.noProviderTime, label: t.updated },
      { value: escapeHtml(provider), label: t.source }
    ])}<p class="finance-note">${t.exchangeNote}</p>`
  };
}

export async function calculateStockLookup(formData, providers = { getStockQuote }) {
  const t = ui();
  const symbol = normalizeStockSymbol(formData.symbol || 'AAPL');
  const display = displayStockSymbol(symbol);
  const response = await retry(() => providers.getStockQuote(symbol));
  const data = response?.data || {};
  const meta = data.meta || {};
  const price = Number(meta.regularMarketPrice ?? data.lastClose ?? meta.previousClose);
  if (!Number.isFinite(price) || price <= 0) throw new Error(t.noPrice);
  const previous = Number(meta.chartPreviousClose ?? meta.previousClose);
  const changePercent = Number.isFinite(previous) && previous !== 0 ? ((price - previous) / previous) * 100 : NaN;
  const volume = Number(meta.regularMarketVolume);
  const currency = data.currency || meta.currency || (symbol.endsWith('.IS') ? 'TRY' : 'USD');
  const provider = data.provider || meta.exchangeName || meta.fullExchangeName || 'finance.yahoo.com';
  const closes = Array.isArray(data.closes) ? data.closes.map(Number).filter(Number.isFinite) : [];
  const chartHtml = closes.length >= 2
    ? `<div class="chart-container"><h3>${t.closesTitle}</h3>${canvasHtml('stockSparklineChart', closes.map((value, index) => ({ label: String(index + 1), value })), t.closesLabel)}</div>`
    : `<p class="finance-note">${t.noSeries}</p>`;

  return {
    status: response?.source === 'cache' ? t.stockCache : t.stockOk,
    type: response?.source === 'cache' ? 'warning' : 'success',
    html: `${resultCards([
      { value: formatCurrency(price, currency), label: t.price(escapeHtml(display)), className: 'highlight' },
      { value: Number.isFinite(changePercent) ? `${formatNumber(changePercent)}%` : 'N/A', label: t.change },
      { value: formatOptionalNumber(volume), label: t.volume },
      { value: escapeHtml(provider), label: t.market }
    ])}${favoriteToggleHtml('novatools:finance:stock-favorites', display, display)}<div id="favoriteList" class="favorite-list"></div>${chartHtml}<p class="finance-note">${t.stockNote}</p>`
  };
}

export async function calculateCryptoPrices(_formData = {}, providers = { getCryptoPrices }) {
  const t = ui();
  const response = await providers.getCryptoPrices(CRYPTO_IDS.join(','));
  const data = response?.data || {};
  const coins = data.coins || {};
  const rows = CRYPTO_IDS.map((id) => {
    const coin = coins[id] || {};
    const usd = Number(coin.usd);
    const tryPrice = Number(coin.try);
    if (!Number.isFinite(usd) || !Number.isFinite(tryPrice) || usd <= 0 || tryPrice <= 0) return null;
    return {
      id,
      label: CRYPTO_LABELS[id],
      usd,
      tryPrice,
      change: Number(coin.usd_24h_change),
      marketCap: Number(coin.try_market_cap),
      volume: Number(coin.try_24h_vol)
    };
  }).filter(Boolean);
  if (!rows.length) throw new Error(t.noCrypto);

  const provider = data.provider || 'coingecko.com';
  const fetchedAt = data.fetchedAt;
  const partial = rows.length !== CRYPTO_IDS.length;
  const cache = response?.source === 'cache';
  const type = partial || cache ? 'warning' : 'success';
  const status = partial
    ? t.partial(rows.length, CRYPTO_IDS.length)
    : cache ? t.cryptoCache : t.cryptoOk;

  return {
    status,
    type,
    html: `<div class="crypto-grid">${rows.map((row) => `<article class="result-item"><h3>${row.label}</h3><div class="result-value">${formatCurrency(row.tryPrice, 'TRY')}</div><p>${formatCurrency(row.usd, 'USD')} · ${t.day}: ${Number.isFinite(row.change) ? `${formatNumber(row.change)}%` : 'N/A'}</p><p>${t.marketCap}: ${formatOptionalCurrency(row.marketCap, 'TRY')}</p><p>${t.cryptoVolume}: ${formatOptionalCurrency(row.volume, 'TRY')}</p>${favoriteToggleHtml('novatools:finance:crypto-favorites', row.id, row.label)}</article>`).join('')}</div><div id="favoriteList" class="favorite-list"></div>${resultCards([{ value: escapeHtml(provider), label: t.source }, { value: fetchedAt ? new Date(fetchedAt).toLocaleString(numberLocale()) : t.noProviderTime, label: t.fetched }])}<p class="finance-note">${t.cryptoNote}</p>`
  };
}

function forms() {
  const f = ui().forms;
  const [amount, from, to, update] = f['live-exchange'];
  const [symbol, getQuote] = f['stock-lookup'];
  const [cacheNote, check] = f['crypto-prices'];
  return {
    'live-exchange': `<div class="form-grid"><label>${amount}<input name="amount" type="number" min="0.01" step="0.01" value="1000" inputmode="decimal" required></label><label>${from}<select name="from" required><option>TRY</option><option selected>USD</option><option>EUR</option></select></label><button type="button" class="btn btn-secondary" id="swapCurrencies">⇄ Swap</button><label>${to}<select name="to" required><option selected>TRY</option><option>USD</option><option>EUR</option></select></label></div><button class="btn" type="submit">${update}</button>`,
    'stock-lookup': `<div class="form-grid"><label>${symbol}<input name="symbol" list="stockSymbols" value="AAPL" maxlength="12" required></label><datalist id="stockSymbols"><option value="THYAO"><option value="GARAN"><option value="AAPL"><option value="TSLA"><option value="IBM"></datalist></div><button class="btn" type="submit">${getQuote}</button>`,
    'crypto-prices': `<p class="finance-note">${cacheNote}</p><button class="btn" type="submit">${check}</button>`
  };
}

const CALCULATORS = {
  'live-exchange': calculateLiveExchange,
  'stock-lookup': calculateStockLookup,
  'crypto-prices': calculateCryptoPrices
};

function setupSwap(form) {
  form.querySelector('#swapCurrencies')?.addEventListener('click', () => {
    const from = form.elements.from;
    const to = form.elements.to;
    const next = from.value;
    from.value = to.value;
    to.value = next;
  });
}

export function initLiveMarketTool(tool = document.body.dataset.financeTool) {
  const form = document.getElementById('financeToolForm');
  const results = document.querySelector('.results-panel');
  const status = document.getElementById('toolStatus');
  const markup = forms()[tool];
  const calculator = CALCULATORS[tool];
  if (!form || !results || !status || !markup || !calculator) return;

  form.innerHTML = markup;
  setupSwap(form);
  status.textContent = ui().ready;

  let cryptoTimer;
  async function run() {
    try {
      status.textContent = ui().loading;
      status.dataset.type = 'info';
      const output = await calculator(Object.fromEntries(new FormData(form)));
      results.innerHTML = output.html;
      results.classList.add('visible');
      status.textContent = output.status;
      status.dataset.type = output.type;
      results.querySelectorAll('canvas[data-chart]').forEach(drawLineChart);
      bindFavoriteButtons(results);
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      results.innerHTML = `<p class="form-error">${escapeHtml(error?.message || ui().unavailableDetail)}</p>`;
      results.classList.add('visible');
      status.textContent = ui().unavailable;
      status.dataset.type = 'error';
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run();
  });

  // Re-render the form (keeping the entered values) and any result in the new language.
  onLanguageChange(() => {
    const values = Object.fromEntries(new FormData(form));
    form.innerHTML = forms()[tool];
    setupSwap(form);
    for (const [name, value] of Object.entries(values)) {
      if (form.elements[name]) form.elements[name].value = value;
    }
    if (results.classList.contains('visible')) run();
    else status.textContent = ui().ready;
  });

  if (tool === 'crypto-prices') {
    cryptoTimer = window.setInterval(run, 5 * 60 * 1000);
    window.addEventListener('pagehide', () => window.clearInterval(cryptoTimer), { once: true });
  }
}

if (typeof document !== 'undefined') initLiveMarketTool();
