import { getExchangeRates } from '../../js/api/exchange.js';
import { getStockQuote } from '../../js/api/stocks.js';
import { getCryptoPrices } from '../../js/api/crypto.js';

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const USD_FORMATTER = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const EUR_FORMATTER = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUMBER_FORMATTER = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 4 });
const SUPPORTED_CURRENCIES = new Set(['TRY', 'USD', 'EUR']);
const CRYPTO_IDS = ['bitcoin', 'ethereum', 'solana', 'ripple', 'cardano'];
const CRYPTO_LABELS = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', ripple: 'XRP', cardano: 'ADA' };

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function parsePositiveNumber(value, label) {
  const number = Number.parseFloat(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(number) || number <= 0) throw new Error(`${label} 0’dan büyük olmalıdır.`);
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
  return Number.isFinite(value) ? NUMBER_FORMATTER.format(value) : 'N/A';
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
  return `<button type="button" class="btn btn-secondary favorite-btn" data-favorite-key="${key}" data-favorite-value="${escapeHtml(value)}">${active ? 'Favoriden çıkar' : 'Favoriye ekle'}: ${escapeHtml(label)}</button>`;
}

function renderFavorites(key) {
  const target = document.getElementById('favoriteList');
  if (!target) return;
  const favorites = localStorageGet(key, []);
  target.innerHTML = favorites.length
    ? `<p class="finance-note"><strong>Favoriler:</strong> ${favorites.map(escapeHtml).join(', ')}</p>`
    : '<p class="finance-note">Henüz favori eklenmedi.</p>';
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
      button.textContent = favorites.has(value) ? `Favoriden çıkar: ${value}` : `Favoriye ekle: ${value}`;
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
  if (!clean) throw new Error('Geçerli bir hisse sembolü girin.');
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
  const amount = parsePositiveNumber(formData.amount, 'Tutar');
  const from = String(formData.from || 'USD').toUpperCase();
  const to = String(formData.to || 'TRY').toUpperCase();
  if (!SUPPORTED_CURRENCIES.has(from) || !SUPPORTED_CURRENCIES.has(to)) {
    throw new Error('Desteklenen para birimleri: TRY, USD, EUR.');
  }

  if (from === to) {
    return {
      status: 'Aynı para birimi seçildi; kur dönüşümü gerekmiyor.',
      type: 'success',
      html: resultCards([
        { value: `${formatCurrency(amount, from)} → ${formatCurrency(amount, to)}`, label: 'Dönüşüm sonucu', className: 'highlight' },
        { value: '1', label: `1 ${from} = ${to}` },
        { value: 'Gerekmez', label: 'Canlı veri isteği' }
      ])
    };
  }

  const response = await providers.getExchangeRates(from);
  const data = response?.data || {};
  const rate = Number(data.rates?.[to]);
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Geçerli kur verisi alınamadı. Lütfen daha sonra tekrar deneyin.');
  const updatedAt = data.fetchedAt || data.date;
  const provider = data.provider || 'tcmb.gov.tr';
  const converted = amount * rate;
  const cacheNote = response?.source === 'cache' ? 'Tarayıcı önbelleğindeki geçerli veri kullanıldı.' : 'Sağlayıcıdan güncel veri alındı.';

  return {
    status: cacheNote,
    type: response?.source === 'cache' ? 'warning' : 'success',
    html: `${resultCards([
      { value: `${formatCurrency(amount, from)} → ${formatCurrency(converted, to)}`, label: 'Dönüşüm sonucu', className: 'highlight' },
      { value: NUMBER_FORMATTER.format(rate), label: `1 ${from} = ${to}` },
      { value: updatedAt ? new Date(updatedAt).toLocaleString('tr-TR') : 'Sağlayıcı zamanı yok', label: 'Son güncelleme' },
      { value: escapeHtml(provider), label: 'Veri kaynağı' }
    ])}<p class="finance-note">Sonuç yalnızca sağlayıcıdan veya süre sınırı içindeki gerçek tarayıcı önbelleğinden alınan kurla hesaplanır. Canlı/veri-cache kaynağı yoksa NovaTools piyasa kuru uydurmaz.</p>`
  };
}

export async function calculateStockLookup(formData, providers = { getStockQuote }) {
  const symbol = normalizeStockSymbol(formData.symbol || 'AAPL');
  const display = displayStockSymbol(symbol);
  const response = await retry(() => providers.getStockQuote(symbol));
  const data = response?.data || {};
  const meta = data.meta || {};
  const price = Number(meta.regularMarketPrice ?? data.lastClose ?? meta.previousClose);
  if (!Number.isFinite(price) || price <= 0) throw new Error('Geçerli hisse fiyatı alınamadı. Sembolü kontrol edip daha sonra tekrar deneyin.');
  const previous = Number(meta.chartPreviousClose ?? meta.previousClose);
  const changePercent = Number.isFinite(previous) && previous !== 0 ? ((price - previous) / previous) * 100 : NaN;
  const volume = Number(meta.regularMarketVolume);
  const currency = data.currency || meta.currency || (symbol.endsWith('.IS') ? 'TRY' : 'USD');
  const provider = data.provider || meta.exchangeName || meta.fullExchangeName || 'finance.yahoo.com';
  const closes = Array.isArray(data.closes) ? data.closes.map(Number).filter(Number.isFinite) : [];
  const chartHtml = closes.length >= 2
    ? `<div class="chart-container"><h3>Sağlayıcının son kapanışları</h3>${canvasHtml('stockSparklineChart', closes.map((value, index) => ({ label: String(index + 1), value })), 'Sağlayıcıdan alınan son kapanış fiyatları')}</div>`
    : '<p class="finance-note">Sağlayıcı bu yanıtta yeterli gerçek kapanış serisi vermediği için grafik gösterilmiyor.</p>';

  return {
    status: response?.source === 'cache' ? 'Tarayıcı önbelleğindeki geçerli hisse verisi kullanıldı.' : 'Hisse verisi alındı.',
    type: response?.source === 'cache' ? 'warning' : 'success',
    html: `${resultCards([
      { value: formatCurrency(price, currency), label: `${escapeHtml(display)} fiyat`, className: 'highlight' },
      { value: Number.isFinite(changePercent) ? `${NUMBER_FORMATTER.format(changePercent)}%` : 'N/A', label: 'Değişim' },
      { value: formatOptionalNumber(volume), label: 'Hacim' },
      { value: escapeHtml(provider), label: 'Piyasa / veri kaynağı' }
    ])}${favoriteToggleHtml('novatools:finance:stock-favorites', display, display)}<div id="favoriteList" class="favorite-list"></div>${chartHtml}<p class="finance-note">Fiyat ve varsa kapanış serisi yalnızca sağlayıcıdan veya süre sınırı içindeki gerçek tarayıcı önbelleğinden gösterilir. Sağlayıcı kullanılamıyorsa NovaTools statik piyasa fiyatı üretmez.</p>`
  };
}

export async function calculateCryptoPrices(_formData = {}, providers = { getCryptoPrices }) {
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
  if (!rows.length) throw new Error('Geçerli kripto piyasa verisi alınamadı. Lütfen daha sonra tekrar deneyin.');

  const provider = data.provider || 'coingecko.com';
  const fetchedAt = data.fetchedAt;
  const partial = rows.length !== CRYPTO_IDS.length;
  const cache = response?.source === 'cache';
  const type = partial || cache ? 'warning' : 'success';
  const status = partial
    ? `Sağlayıcı ${rows.length}/${CRYPTO_IDS.length} coin için kullanılabilir veri döndürdü.`
    : cache ? 'Tarayıcı önbelleğindeki geçerli kripto verisi kullanıldı.' : 'Kripto fiyatları alındı.';

  return {
    status,
    type,
    html: `<div class="crypto-grid">${rows.map((row) => `<article class="result-item"><h3>${row.label}</h3><div class="result-value">${formatCurrency(row.tryPrice, 'TRY')}</div><p>${formatCurrency(row.usd, 'USD')} · 24s: ${Number.isFinite(row.change) ? `${NUMBER_FORMATTER.format(row.change)}%` : 'N/A'}</p><p>Market cap: ${formatOptionalCurrency(row.marketCap, 'TRY')}</p><p>Hacim: ${formatOptionalCurrency(row.volume, 'TRY')}</p>${favoriteToggleHtml('novatools:finance:crypto-favorites', row.id, row.label)}</article>`).join('')}</div><div id="favoriteList" class="favorite-list"></div>${resultCards([{ value: escapeHtml(provider), label: 'Veri kaynağı' }, { value: fetchedAt ? new Date(fetchedAt).toLocaleString('tr-TR') : 'Sağlayıcı zamanı yok', label: 'Son veri çekimi' }])}<p class="finance-note">CoinGecko sağlayıcı verisi veya süre sınırı içindeki gerçek tarayıcı önbelleği yoksa fiyat gösterilmez. Eksik coinler için NovaTools tahmini/statik piyasa değeri üretmez.</p>`
  };
}

const FORMS = {
  'live-exchange': `<div class="form-grid"><label>Tutar<input name="amount" type="number" min="0.01" step="0.01" value="1000" inputmode="decimal" required></label><label>Kaynak<select name="from" required><option>TRY</option><option selected>USD</option><option>EUR</option></select></label><button type="button" class="btn btn-secondary" id="swapCurrencies">⇄ Swap</button><label>Hedef<select name="to" required><option selected>TRY</option><option>USD</option><option>EUR</option></select></label></div><button class="btn" type="submit">Kuru güncelle</button>`,
  'stock-lookup': `<div class="form-grid"><label>Hisse sembolü<input name="symbol" list="stockSymbols" value="AAPL" maxlength="12" required></label><datalist id="stockSymbols"><option value="THYAO"><option value="GARAN"><option value="AAPL"><option value="TSLA"><option value="IBM"></datalist></div><button class="btn" type="submit">Hisseyi getir</button>`,
  'crypto-prices': `<p class="finance-note">BTC, ETH, SOL, XRP ve ADA için CoinGecko snapshot'ı tarayıcıda 5 dakika önbelleğe alınır. Otomatik yenileme 5 dakikada bir çalışır.</p><button class="btn" type="submit">Fiyatları kontrol et</button>`
};

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
  const markup = FORMS[tool];
  const calculator = CALCULATORS[tool];
  if (!form || !results || !status || !markup || !calculator) return;

  form.innerHTML = markup;
  setupSwap(form);

  let cryptoTimer;
  async function run() {
    try {
      status.textContent = 'Veri alınıyor...';
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
      results.innerHTML = `<p class="form-error">${escapeHtml(error?.message || 'Canlı veri şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.')}</p>`;
      results.classList.add('visible');
      status.textContent = 'Canlı veri kullanılamıyor.';
      status.dataset.type = 'error';
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run();
  });

  if (tool === 'crypto-prices') {
    cryptoTimer = window.setInterval(run, 5 * 60 * 1000);
    window.addEventListener('pagehide', () => window.clearInterval(cryptoTimer), { once: true });
  }
}

if (typeof document !== 'undefined') initLiveMarketTool();
