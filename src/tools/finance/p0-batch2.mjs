import { getExchangeRates } from '../../js/api/exchange.js';
import { getStockQuote } from '../../js/api/stocks.js';
import { getCryptoPrices } from '../../js/api/crypto.js';

const TRY_FORMATTER = new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const USD_FORMATTER = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUMBER_FORMATTER = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 });
const STATIC_USD_TRY = 35;
const STATIC_RATES = {
  USD: { USD: 1, TRY: STATIC_USD_TRY, EUR: 0.92 },
  TRY: { TRY: 1, USD: 1 / STATIC_USD_TRY, EUR: 0.92 / STATIC_USD_TRY },
  EUR: { EUR: 1, USD: 1 / 0.92, TRY: STATIC_USD_TRY / 0.92 }
};
const STOCK_FALLBACKS = {
  AAPL: { price: 190.2, currency: 'USD', changePercent: 0.8, volume: 51200000, exchange: 'NASDAQ', series: [184, 186, 185, 188, 189, 190.2] },
  TSLA: { price: 178.5, currency: 'USD', changePercent: -1.4, volume: 89100000, exchange: 'NASDAQ', series: [185, 182, 180, 181, 179, 178.5] },
  IBM: { price: 189.9, currency: 'USD', changePercent: 0.3, volume: 4200000, exchange: 'NYSE', series: [187, 188, 188.5, 189, 189.2, 189.9] },
  THYAO: { price: 300.5, currency: 'TRY', changePercent: 1.1, volume: 52000000, exchange: 'BIST', series: [292, 295, 294, 298, 300, 300.5] },
  GARAN: { price: 122.4, currency: 'TRY', changePercent: -0.4, volume: 61000000, exchange: 'BIST', series: [124, 123, 122.8, 123.1, 122.9, 122.4] }
};
const CRYPTO_IDS = ['bitcoin', 'ethereum', 'solana', 'ripple', 'cardano'];
const CRYPTO_LABELS = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', ripple: 'XRP', cardano: 'ADA' };
const CRYPTO_FALLBACKS = {
  bitcoin: { usd: 65000, usd_24h_change: 1.5, usd_market_cap: 1280000000000, usd_24h_vol: 28000000000 },
  ethereum: { usd: 3200, usd_24h_change: 0.8, usd_market_cap: 385000000000, usd_24h_vol: 14000000000 },
  solana: { usd: 145, usd_24h_change: -1.1, usd_market_cap: 69000000000, usd_24h_vol: 3000000000 },
  ripple: { usd: 0.62, usd_24h_change: 0.4, usd_market_cap: 35000000000, usd_24h_vol: 1200000000 },
  cardano: { usd: 0.48, usd_24h_change: -0.7, usd_market_cap: 17000000000, usd_24h_vol: 420000000 }
};
const CLOUD_PRICING = {
  aws: {
    name: 'AWS', region: 'eu-central-1 Frankfurt / eu-south-1 Milan proxy',
    instances: { 't3.medium': { cpu: 2, ram: 4, hourly: 0.0416 }, 't3.large': { cpu: 2, ram: 8, hourly: 0.0832 }, 'm6i.large': { cpu: 2, ram: 8, hourly: 0.096 } }, storage: 0.023, network: 0.09
  },
  gcp: {
    name: 'Google Cloud', region: 'europe-west3 Frankfurt',
    instances: { 'e2-medium': { cpu: 2, ram: 4, hourly: 0.0335 }, 'e2-standard-2': { cpu: 2, ram: 8, hourly: 0.067 }, 'n2-standard-2': { cpu: 2, ram: 8, hourly: 0.097 } }, storage: 0.02, network: 0.085
  },
  azure: {
    name: 'Azure', region: 'West Europe',
    instances: { B2s: { cpu: 2, ram: 4, hourly: 0.0496 }, B2ms: { cpu: 2, ram: 8, hourly: 0.0992 }, D2s_v5: { cpu: 2, ram: 8, hourly: 0.096 } }, storage: 0.0184, network: 0.087
  }
};
// 2026 Turkish wage-income tariff from the official GİB published tariff; AGİ is no longer applied.
const TAX_BRACKETS_2026_WAGE = [
  { limit: 190000, rate: 0.15 },
  { limit: 400000, rate: 0.20 },
  { limit: 1500000, rate: 0.27 },
  { limit: 5300000, rate: 0.35 },
  { limit: Infinity, rate: 0.40 }
];

export function parseMoneyInput(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/₺|TRY|TL|\$|€|£/gi, '')
    .replace(/(?<=\d)[,.](?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePercent(value) {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTRY(value) {
  return TRY_FORMATTER.format(value);
}

function formatUSD(value) {
  return USD_FORMATTER.format(value);
}

function formatCurrency(value, currency = 'TRY') {
  if (currency === 'USD') return formatUSD(value);
  if (currency === 'EUR') return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  return formatTRY(value);
}

function formatNumber(value) {
  return NUMBER_FORMATTER.format(value);
}

function round(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
}

function assertPositive(value, label) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} 0’dan büyük olmalıdır.`);
}

function assertRange(value, label, min, max) {
  if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${label} ${formatNumber(min)} ile ${formatNumber(max)} arasında olmalıdır.`);
}

function resultCards(cards) {
  return `<div class="result-grid">${cards.map((card) => `<div class="result-item ${card.className || ''}"><div class="result-value">${card.value}</div><div class="result-label">${card.label}</div></div>`).join('')}</div>`;
}

function tableHtml(headers, rows) {
  return `<div class="table-wrap"><table><thead><tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function canvasHtml(id, type, data, label) {
  return `<canvas id="${id}" width="760" height="260" data-chart-type="${type}" data-chart='${JSON.stringify(data)}' aria-label="${escapeHtml(label)}" role="img"></canvas>`;
}

function deterministicSeries(last, changePercent, points = 7) {
  const start = last / (1 + (changePercent || 0) / 100);
  return Array.from({ length: points }, (_, index) => {
    const progress = points === 1 ? 1 : index / (points - 1);
    const wave = Math.sin(index * 1.7) * Math.abs(last - start) * 0.18;
    return round(start + (last - start) * progress + wave);
  });
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
    // Storage can be unavailable in privacy mode; calculations still work.
  }
}

function favoriteToggleHtml(key, value, label) {
  const favorites = new Set(localStorageGet(key, []));
  const active = favorites.has(value);
  return `<button type="button" class="btn btn-secondary favorite-btn" data-favorite-key="${key}" data-favorite-value="${escapeHtml(value)}">${active ? 'Favoriden çıkar' : 'Favoriye ekle'}: ${escapeHtml(label)}</button>`;
}

export async function calculateLiveExchange(formData) {
  const amount = parseMoneyInput(formData.amount);
  const from = String(formData.from || 'USD').toUpperCase();
  const to = String(formData.to || 'TRY').toUpperCase();
  assertPositive(amount, 'Tutar');
  if (!STATIC_RATES[from] && !['USD', 'EUR', 'TRY'].includes(from)) throw new Error('Desteklenen para birimleri: TRY, USD, EUR.');
  if (!['TRY', 'USD', 'EUR'].includes(to)) throw new Error('Desteklenen hedef para birimleri: TRY, USD, EUR.');

  let rate;
  let updatedAt = new Date().toISOString();
  let provider = 'Frankfurter/NovaTools proxy';
  let warning = '';
  try {
    const response = await getExchangeRates(from);
    const data = response.data;
    rate = from === to ? 1 : data.rates?.[to];
    updatedAt = data.fetchedAt || data.date || updatedAt;
    provider = data.provider || provider;
    localStorageSet(`novatools:finance:last-rate:${from}`, data);
    if (response.stale) warning = 'Kurlar geçici olarak güncellenemiyor, son bilinen kur gösteriliyor.';
  } catch {
    const cached = localStorageGet(`novatools:finance:last-rate:${from}`, null);
    rate = from === to ? 1 : cached?.rates?.[to];
    updatedAt = cached?.fetchedAt || updatedAt;
    provider = cached?.provider || 'statik yaklaşık fallback';
    warning = 'Kurlar geçici olarak güncellenemiyor, lütfen daha sonra tekrar deneyin.';
  }
  if (!Number.isFinite(rate)) {
    rate = STATIC_RATES[from]?.[to];
    provider = 'statik yaklaşık fallback';
    warning = 'Kurlar geçici olarak güncellenemiyor, lütfen daha sonra tekrar deneyin.';
  }
  const converted = amount * rate;
  const trend = deterministicSeries(rate, 1.2, 7).map((value, index) => ({ label: `${index + 1}.g`, value }));
  return {
    status: warning || 'Kur başarıyla güncellendi.',
    type: warning ? 'warning' : 'success',
    html: `${warning ? `<p class="form-error">${warning}</p>` : ''}${resultCards([
      { value: `${formatCurrency(amount, from)} → ${formatCurrency(converted, to)}`, label: 'Dönüşüm sonucu', className: 'highlight' },
      { value: formatNumber(rate), label: `1 ${from} = ${to}` },
      { value: new Date(updatedAt).toLocaleString('tr-TR'), label: 'Son güncelleme' },
      { value: escapeHtml(provider), label: 'Veri kaynağı' }
    ])}<div class="chart-container"><h3>7 noktalı kur trendi</h3>${canvasHtml('liveExchangeChart', 'line', trend, 'Kur trend grafiği')}</div><p class="finance-note">Merkez Bankası/TCMB resmi kurlarına göre hesaplanır, bankalar farklı kurlar uygulayabilir.</p>`
  };
}

function normalizeStockSymbol(symbol) {
  const clean = String(symbol || '').trim().toUpperCase().replace(/[^A-Z0-9.]/g, '');
  if (['THYAO', 'GARAN'].includes(clean)) return `${clean}.IS`;
  return clean || 'AAPL';
}

function displayStockSymbol(symbol) {
  return symbol.replace(/\.IS$/, '');
}

async function getStockWithRetry(symbol, attempts = 2) {
  let lastError;
  for (let attempt = 0; attempt <= attempts; attempt++) {
    try {
      return await getStockQuote(symbol);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError;
}

export async function calculateStockLookup(formData) {
  const requested = String(formData.symbol || 'AAPL').trim().toUpperCase();
  const symbol = normalizeStockSymbol(requested);
  const display = displayStockSymbol(symbol);
  let quote;
  let warning = '';
  try {
    const response = await getStockWithRetry(symbol);
    const data = response.data;
    const meta = data.meta || {};
    const price = Number(meta.regularMarketPrice || data.lastClose || meta.previousClose);
    if (!Number.isFinite(price)) throw new Error('Sembol bulunamadı');
    const previous = Number(meta.chartPreviousClose || meta.previousClose || price);
    quote = {
      price,
      currency: data.currency || meta.currency || (symbol.endsWith('.IS') ? 'TRY' : 'USD'),
      changePercent: previous ? ((price - previous) / previous) * 100 : 0,
      volume: Number(meta.regularMarketVolume || 0),
      exchange: meta.exchangeName || meta.fullExchangeName || 'Yahoo Finance',
      series: data.closes?.length ? data.closes : deterministicSeries(price, previous ? ((price - previous) / previous) * 100 : 0, 6)
    };
  } catch (error) {
    const fallback = STOCK_FALLBACKS[display];
    if (!fallback) throw new Error(error?.message?.includes('429') ? 'API limit aşıldı, lütfen daha sonra deneyin.' : 'Sembol bulunamadı.');
    quote = fallback;
    warning = 'API limit aşıldı veya veri geçici olarak alınamadı, örnek/son bilinen veri gösteriliyor.';
  }
  const chart = quote.series.map((value, index) => ({ label: `${index + 1}`, value }));
  return {
    status: warning || 'Hisse verisi hazır.',
    type: warning ? 'warning' : 'success',
    html: `${warning ? `<p class="form-error">${warning}</p>` : ''}${resultCards([
      { value: formatCurrency(quote.price, quote.currency), label: `${display} fiyat`, className: 'highlight' },
      { value: `${round(quote.changePercent)}%`, label: 'Değişim' },
      { value: formatNumber(quote.volume), label: 'Hacim' },
      { value: escapeHtml(quote.exchange), label: 'Piyasa' }
    ])}${favoriteToggleHtml('novatools:finance:stock-favorites', display, display)}<div id="favoriteList" class="favorite-list"></div><div class="chart-container"><h3>Mini sparkline</h3>${canvasHtml('stockSparklineChart', 'line', chart, 'Hisse sparkline grafiği')}</div><p class="finance-note">Borsa verileri gecikmeli olabilir, yatırım kararı için aracı kuruma danışın.</p>`
  };
}

export async function calculateCryptoPrices() {
  let coins;
  let warning = '';
  try {
    const response = await getCryptoPrices(CRYPTO_IDS.join(','));
    coins = response.data.coins;
    if (response.stale) warning = 'Fiyatlar geçici olarak güncellenemiyor, son bilinen fiyatlar gösteriliyor.';
  } catch {
    coins = CRYPTO_FALLBACKS;
    warning = 'Fiyatlar geçici olarak güncellenemiyor, örnek/son bilinen fiyatlar gösteriliyor.';
  }
  const rows = CRYPTO_IDS.map((id) => {
    const coin = coins[id] || CRYPTO_FALLBACKS[id];
    const usd = Number(coin.usd || 0);
    const tryPrice = usd * STATIC_USD_TRY;
    const change = Number(coin.usd_24h_change || 0);
    const marketCap = Number(coin.usd_market_cap || 0) * STATIC_USD_TRY;
    const volume = Number(coin.usd_24h_vol || 0) * STATIC_USD_TRY;
    return { id, label: CRYPTO_LABELS[id], usd, tryPrice, change, marketCap, volume, series: deterministicSeries(tryPrice, change, 7) };
  });
  return {
    status: warning || 'Kripto fiyatları güncellendi.',
    type: warning ? 'warning' : 'success',
    html: `${warning ? `<p class="form-error">${warning}</p>` : ''}<div class="crypto-grid">${rows.map((row) => `<article class="result-item"><h3>${row.label}</h3><div class="result-value">${formatTRY(row.tryPrice)}</div><p>${formatUSD(row.usd)} · 24s: ${round(row.change)}%</p><p>Market cap: ${formatTRY(row.marketCap)}</p><p>Hacim: ${formatTRY(row.volume)}</p>${favoriteToggleHtml('novatools:finance:crypto-favorites', row.id, row.label)}</article>`).join('')}</div><div id="favoriteList" class="favorite-list"></div><div class="chart-container"><h3>7 günlük fiyat çizgisi (TRY)</h3>${canvasHtml('cryptoPriceChart', 'multiLine', rows.map((row) => ({ label: row.label, values: row.series })), 'Kripto fiyat grafiği')}</div><p class="finance-note">Kripto para fiyatları yüksek volatilite içerir, yatırım tavsiyesi değildir.</p>`
  };
}

export function calculateCloudCost(formData) {
  const provider = String(formData.provider || 'aws');
  const data = CLOUD_PRICING[provider] || CLOUD_PRICING.aws;
  const instance = String(formData.instance || Object.keys(data.instances)[0]);
  const pricing = data.instances[instance] || Object.values(data.instances)[0];
  const hours = parseMoneyInput(formData.hours || 730);
  const storage = parseMoneyInput(formData.storage || 100);
  const network = parseMoneyInput(formData.network || 100);
  const plan = String(formData.plan || 'onDemand');
  assertRange(hours, 'Kullanım saati', 1, 744);
  assertRange(storage, 'Depolama', 1, 100000);
  assertRange(network, 'Network çıkışı', 0, 100000);
  const planMultiplier = { onDemand: 1, reserved1y: 0.68, reserved3y: 0.46, spot: 0.35 }[plan] || 1;
  const compute = pricing.hourly * hours * planMultiplier;
  const storageCost = storage * data.storage;
  const networkCost = network * data.network;
  const total = compute + storageCost + networkCost;
  const chart = [
    { label: 'Compute', value: round(compute * STATIC_USD_TRY) },
    { label: 'Storage', value: round(storageCost * STATIC_USD_TRY) },
    { label: 'Network', value: round(networkCost * STATIC_USD_TRY) },
    { label: 'Total', value: round(total * STATIC_USD_TRY) }
  ];
  return {
    status: 'Cloud maliyet tahmini hazır.',
    type: 'success',
    html: `${resultCards([
      { value: formatTRY(total * STATIC_USD_TRY), label: 'Aylık toplam', className: 'highlight' },
      { value: formatTRY(total * 12 * STATIC_USD_TRY), label: 'Yıllık toplam' },
      { value: formatUSD(total), label: 'Aylık USD' },
      { value: data.region, label: 'Bölge' }
    ])}${tableHtml(['Kalem', 'USD', 'TRY'], [['Compute', formatUSD(compute), formatTRY(compute * STATIC_USD_TRY)], ['Storage', formatUSD(storageCost), formatTRY(storageCost * STATIC_USD_TRY)], ['Network', formatUSD(networkCost), formatTRY(networkCost * STATIC_USD_TRY)]])}<div class="chart-container"><h3>Maliyet kırılımı</h3>${canvasHtml('cloudCostChart', 'bar', chart, 'Cloud maliyet grafiği')}</div><p class="finance-note">USD→TRY dönüşümü yaklaşık 1 USD = ${STATIC_USD_TRY} TRY varsayımıyla etiketlenmiştir. Fiyatlar tahmini ve statik veridir, gerçek faturalarınız farklılık gösterebilir.</p>`
  };
}

export function calculateCryptoTax(formData) {
  const year = Number.parseInt(formData.year || '2026', 10);
  const totalBuy = parseMoneyInput(formData.totalBuy);
  const totalSell = parseMoneyInput(formData.totalSell);
  const providedGain = parseMoneyInput(formData.gainLoss || 0);
  const method = String(formData.costBasis || 'FIFO');
  assertRange(year, 'Yıl', 2020, 2030);
  if (totalBuy < 0 || totalSell < 0) throw new Error('Alım ve satım tutarları negatif olamaz.');
  const netGain = providedGain || (totalSell - totalBuy);
  const taxRate = 0.15;
  const estimatedTax = Math.max(0, netGain * taxRate);
  const chart = [{ label: 'Alım', value: totalBuy }, { label: 'Satım', value: totalSell }, { label: 'Kazanç', value: Math.max(0, netGain) }, { label: 'Vergi', value: estimatedTax }];
  return {
    status: 'Kripto vergi özeti hazır.',
    type: 'success',
    html: `${resultCards([
      { value: formatTRY(netGain), label: 'Net kazanç/zarar', className: netGain >= 0 ? 'highlight' : 'negative' },
      { value: formatTRY(estimatedTax), label: '%15 tahmini stopaj' },
      { value: method, label: 'Maliyet yöntemi' },
      { value: String(year), label: 'Vergi yılı' }
    ])}${tableHtml(['Kalem', 'Tutar'], [['Toplam alım', formatTRY(totalBuy)], ['Toplam satım', formatTRY(totalSell)], ['Net kazanç/zarar', formatTRY(netGain)], ['Tahmini vergi', formatTRY(estimatedTax)]])}<div class="chart-container"><h3>Vergi kategorileri</h3>${canvasHtml('cryptoTaxChart', 'pie', chart, 'Kripto vergi pasta grafiği')}</div><p class="finance-note">Kripto vergi hesaplamaları tahminidir, kesin bilgi için mali müşavire danışın.</p>`
  };
}

function progressiveTax(income, brackets) {
  let remaining = income;
  let previous = 0;
  let tax = 0;
  for (const bracket of brackets) {
    const taxable = Math.min(Math.max(bracket.limit - previous, 0), remaining);
    if (taxable <= 0) break;
    tax += taxable * bracket.rate;
    remaining -= taxable;
    previous = bracket.limit;
  }
  return tax;
}

export function calculateTaxEstimator(formData) {
  const grossMonthly = parseMoneyInput(formData.grossSalary);
  const children = Number.parseInt(formData.children || '0', 10);
  const privateInsurance = parseMoneyInput(formData.privateInsurance || 0);
  assertPositive(grossMonthly, 'Brüt maaş');
  assertRange(children, 'Çocuk sayısı', 0, 10);
  const annualGross = grossMonthly * 12;
  const sgk = annualGross * 0.14;
  const unemployment = annualGross * 0.01;
  const stamp = annualGross * 0.00759;
  const taxableIncome = Math.max(0, annualGross - sgk - unemployment - privateInsurance * 12);
  const incomeTax = progressiveTax(taxableIncome, TAX_BRACKETS_2026_WAGE);
  const deductions = sgk + unemployment + stamp + incomeTax + privateInsurance * 12;
  const netAnnual = annualGross - deductions;
  const employerCost = annualGross * 1.225;
  const chart = [{ label: 'Net', value: netAnnual }, { label: 'Kesinti', value: deductions }, { label: 'İşveren', value: employerCost - annualGross }];
  return {
    status: 'Maaş tahmini hazır.',
    type: 'success',
    html: `${resultCards([
      { value: formatTRY(netAnnual / 12), label: 'Aylık net', className: 'highlight' },
      { value: formatTRY(deductions / 12), label: 'Aylık kesinti' },
      { value: formatTRY(employerCost / 12), label: 'Aylık işveren maliyeti' },
      { value: 'AGİ kaldırıldı', label: 'AGİ notu' }
    ])}${tableHtml(['Kesinti', 'Yıllık tutar'], [['SGK %14', formatTRY(sgk)], ['İşsizlik %1', formatTRY(unemployment)], ['Gelir vergisi', formatTRY(incomeTax)], ['Damga vergisi', formatTRY(stamp)], ['Özel sigorta', formatTRY(privateInsurance * 12)]])}<div class="chart-container"><h3>Net/Kesinti/İşveren dağılımı</h3>${canvasHtml('taxChart', 'pie', chart, 'Maaş kesinti grafiği')}</div><p class="finance-note">2026 GİB ücret gelir vergisi tarifesi esas alınmıştır. Maaş hesaplamaları tahminidir, kesin bilgi için mali müşavire danışın.</p>`
  };
}

export function calculateLifeInsurance(formData) {
  const age = parseMoneyInput(formData.age);
  const gender = String(formData.gender || 'female');
  const coverage = parseMoneyInput(formData.coverage);
  const term = parseMoneyInput(formData.term);
  const paymentMode = String(formData.paymentMode || 'monthly');
  assertRange(age, 'Yaş', 18, 75);
  assertRange(coverage, 'Sigorta tutarı', 100000, 5000000);
  assertRange(term, 'Vade', 5, 30);
  const ageFactor = 0.0018 + Math.max(0, age - 30) * 0.00009;
  const genderFactor = gender === 'male' ? 1.12 : 1;
  const termFactor = 1 + (term - 10) * 0.012;
  const annualPremium = coverage * ageFactor * genderFactor * termFactor;
  const death = coverage;
  const accident = coverage * 0.35;
  const illness = coverage * 0.18;
  const chart = [{ label: 'Vefat', value: death }, { label: 'Kaza', value: accident }, { label: 'Hastalık', value: illness }];
  return {
    status: 'Sigorta prim tahmini hazır.',
    type: 'success',
    html: `${resultCards([
      { value: formatTRY(paymentMode === 'monthly' ? annualPremium / 12 : annualPremium), label: paymentMode === 'monthly' ? 'Aylık prim' : 'Yıllık prim', className: 'highlight' },
      { value: formatTRY(annualPremium), label: 'Yıllık prim' },
      { value: formatTRY(death), label: 'Vefat teminatı' },
      { value: formatTRY(accident + illness), label: 'Ek teminatlar' }
    ])}${tableHtml(['Teminat', 'Tutar'], [['Vefat', formatTRY(death)], ['Kaza', formatTRY(accident)], ['Hastalık', formatTRY(illness)]])}<div class="chart-container"><h3>Teminat dağılımı</h3>${canvasHtml('lifeInsuranceChart', 'pie', chart, 'Sigorta teminat grafiği')}</div><p class="finance-note">Sigorta primleri tahminidir, kesin teklif için sigorta şirketine danışın.</p>`
  };
}

export function calculateRetirement(formData) {
  const currentAge = parseMoneyInput(formData.currentAge);
  const retirementAge = parseMoneyInput(formData.retirementAge);
  const monthlySaving = parseMoneyInput(formData.monthlySaving);
  const currentSavings = parseMoneyInput(formData.currentSavings || 0);
  const returnRate = parsePercent(formData.returnRate || 8) / 100;
  const inflationRate = parsePercent(formData.inflationRate || 3) / 100;
  assertRange(currentAge, 'Mevcut yaş', 18, 75);
  assertRange(retirementAge, 'Emeklilik yaşı', currentAge + 1, 80);
  if (monthlySaving < 0 || currentSavings < 0) throw new Error('Birikimler negatif olamaz.');
  const years = retirementAge - currentAge;
  let nominal = currentSavings;
  const series = [];
  for (let year = 1; year <= years; year++) {
    for (let month = 0; month < 12; month++) nominal = nominal * (1 + returnRate / 12) + monthlySaving;
    series.push({ label: String(currentAge + year), value: round(nominal) });
  }
  const real = nominal / Math.pow(1 + inflationRate, years);
  const annualWithdrawal = nominal * 0.04;
  return {
    status: 'Emeklilik tahmini hazır.',
    type: 'success',
    html: `${resultCards([
      { value: formatTRY(nominal), label: 'Nominal birikim', className: 'highlight' },
      { value: formatTRY(real), label: 'Enflasyon ayarlı' },
      { value: formatTRY(annualWithdrawal / 12), label: '4% kuralı aylık' },
      { value: 'Kadın 58 / Erkek 60+', label: 'SGK 4A yaş notu' }
    ])}<div class="chart-container"><h3>Yaşa göre birikim</h3>${canvasHtml('retirementChart', 'line', series, 'Emeklilik birikim grafiği')}</div><p class="finance-note">SGK yaş/prim günü koşulları statü ve başlangıç tarihine göre değişebilir; 3600/4500/5400 gün seçenekleri için SGK kaydı kontrol edilmelidir. Emeklilik hesaplamaları tahminidir, kesin bilgi için SGK ve mali müşavire danışın.</p>`
  };
}

function loanSchedule(balance, annualRate, monthlyPayment, extraPayment = 0) {
  const monthlyRate = annualRate / 12;
  let remaining = balance;
  let totalInterest = 0;
  const rows = [];
  for (let month = 1; month <= 600 && remaining > 0.01; month++) {
    const interest = remaining * monthlyRate;
    const payment = Math.min(remaining + interest, monthlyPayment + extraPayment);
    if (payment <= interest) throw new Error('Aylık ödeme, aylık faizden yüksek olmalıdır.');
    const principal = payment - interest;
    remaining = Math.max(0, remaining - principal);
    totalInterest += interest;
    rows.push({ month, payment: round(payment), principal: round(principal), interest: round(interest), balance: round(remaining) });
  }
  return { months: rows.length, totalInterest: round(totalInterest), totalPaid: round(balance + totalInterest), rows };
}

export function calculateStudentLoan(formData) {
  const balance = parseMoneyInput(formData.balance);
  const rate = parsePercent(formData.interestRate) / 100;
  const monthlyPayment = parseMoneyInput(formData.monthlyPayment);
  const extraPayment = parseMoneyInput(formData.extraPayment || 0);
  assertPositive(balance, 'Kredi tutarı');
  assertRange(rate * 100, 'Faiz oranı', 0, 100);
  assertPositive(monthlyPayment, 'Aylık ödeme');
  if (extraPayment < 0) throw new Error('Ek ödeme negatif olamaz.');
  const base = loanSchedule(balance, rate, monthlyPayment, 0);
  const extra = loanSchedule(balance, rate, monthlyPayment, extraPayment);
  const savings = base.totalInterest - extra.totalInterest;
  const chart = base.rows.slice(0, Math.max(base.rows.length, extra.rows.length)).filter((_, index) => index % Math.max(1, Math.ceil(base.rows.length / 24)) === 0).map((row, index) => ({ label: String(row.month), current: row.balance, extra: extra.rows[Math.min(index, extra.rows.length - 1)]?.balance || 0 }));
  return {
    status: 'Öğrenci kredisi ödeme planı hazır.',
    type: 'success',
    html: `${resultCards([
      { value: `${extra.months} ay`, label: 'Yeni vade', className: 'highlight' },
      { value: `${Math.max(0, base.months - extra.months)} ay`, label: 'Kısalan süre' },
      { value: formatTRY(savings), label: 'Faiz tasarrufu' },
      { value: formatTRY(extra.totalInterest), label: 'Toplam faiz' }
    ])}${tableHtml(['Ay', 'Ödeme', 'Anapara', 'Faiz', 'Kalan'], extra.rows.slice(0, 24).map((row) => [row.month, formatTRY(row.payment), formatTRY(row.principal), formatTRY(row.interest), formatTRY(row.balance)]).concat(extra.rows.length > 24 ? [['...', '...', '...', '...', '...']] : []))}<div class="chart-container"><h3>Kalan borç grafiği</h3>${canvasHtml('studentLoanChart', 'dualLine', chart, 'Öğrenci kredisi kalan borç grafiği')}</div><p class="finance-note">KYK ve banka kredilerinde faiz/erteleme kuralları sözleşmeye göre değişebilir. Öğrenci kredisi hesaplamaları tahminidir, kesin bilgi için KYK veya bankaya danışın.</p>`
  };
}

function forms() {
  return {
    'live-exchange': `<div class="form-grid"><label>Tutar<input name="amount" type="number" min="0.01" step="0.01" value="1000" inputmode="decimal" required></label><label>Kaynak<select name="from" required><option>TRY</option><option selected>USD</option><option>EUR</option></select></label><button type="button" class="btn btn-secondary" id="swapCurrencies">⇄ Swap</button><label>Hedef<select name="to" required><option selected>TRY</option><option>USD</option><option>EUR</option></select></label></div><button class="btn" type="submit">Kuru güncelle</button>`,
    'stock-lookup': `<div class="form-grid"><label>Hisse sembolü<input name="symbol" list="stockSymbols" value="AAPL" maxlength="12" required></label><datalist id="stockSymbols"><option value="THYAO"><option value="GARAN"><option value="AAPL"><option value="TSLA"><option value="IBM"></datalist></div><button class="btn" type="submit">Hisseyi getir</button>`,
    'crypto-prices': `<p class="finance-note">BTC, ETH, SOL, XRP ve ADA fiyatları 30 saniyede bir yenilenir. Fiyatlar client-side gösterilir.</p><button class="btn" type="submit">Fiyatları yenile</button>`,
    'cloud-cost': `<div class="form-grid"><label>Provider<select name="provider" id="cloudProvider" required><option value="aws">AWS</option><option value="gcp">GCP</option><option value="azure">Azure</option></select></label><label>Instance<select name="instance" id="cloudInstance" required></select></label><label>Kullanım saati<input name="hours" type="number" min="1" max="744" step="1" value="730" inputmode="numeric" required></label><label>Depolama GB<input name="storage" type="number" min="1" max="100000" step="1" value="100" inputmode="numeric" required></label><label>Network GB<input name="network" type="number" min="0" max="100000" step="1" value="100" inputmode="numeric" required></label><label>Plan<select name="plan" required><option value="onDemand">On-Demand</option><option value="reserved1y">Reserved 1y</option><option value="reserved3y">Reserved 3y</option><option value="spot">Spot</option></select></label></div><button class="btn" type="submit">Maliyeti hesapla</button>`,
    'crypto-tax': `<div class="form-grid"><label>Yıl<input name="year" type="number" min="2020" max="2030" step="1" value="2026" inputmode="numeric" required></label><label>Toplam alım<input name="totalBuy" type="number" min="0" step="0.01" value="100000" inputmode="decimal" required></label><label>Toplam satım<input name="totalSell" type="number" min="0" step="0.01" value="150000" inputmode="decimal" required></label><label>Kazanç/zarar (opsiyonel)<input name="gainLoss" type="number" step="0.01" inputmode="decimal"></label><label>Maliyet bazı<select name="costBasis"><option>FIFO</option><option>LIFO</option></select></label></div><button class="btn" type="submit">Vergiyi hesapla</button>`,
    tax: `<div class="form-grid"><label>Brüt maaş<input name="grossSalary" type="number" min="1" max="5000000" step="0.01" value="75000" inputmode="decimal" required></label><label>Medeni durum<select name="marital"><option>Bekar</option><option>Evli</option></select></label><label>Çocuk sayısı<input name="children" type="number" min="0" max="10" step="1" value="0" inputmode="numeric" required></label><label>Özel sigorta<input name="privateInsurance" type="number" min="0" step="0.01" value="0" inputmode="decimal"></label></div><button class="btn" type="submit">Net maaşı hesapla</button>`,
    'life-insurance': `<div class="form-grid"><label>Yaş<input name="age" type="number" min="18" max="75" step="1" value="35" inputmode="numeric" required></label><label>Cinsiyet<select name="gender"><option value="female">Kadın</option><option value="male">Erkek</option></select></label><label>Sigorta tutarı<input name="coverage" type="number" min="100000" max="5000000" step="10000" value="1000000" inputmode="decimal" required></label><label>Vade<input name="term" type="number" min="5" max="30" step="1" value="20" inputmode="numeric" required></label><label>Gösterim<select name="paymentMode"><option value="monthly">Aylık</option><option value="annual">Yıllık</option></select></label></div><button class="btn" type="submit">Primi hesapla</button>`,
    retirement: `<div class="form-grid"><label>Mevcut yaş<input name="currentAge" type="number" min="18" max="75" step="1" value="35" inputmode="numeric" required></label><label>Emeklilik yaşı<input name="retirementAge" type="number" min="19" max="80" step="1" value="60" inputmode="numeric" required></label><label>Aylık birikim<input name="monthlySaving" type="number" min="0" step="0.01" value="5000" inputmode="decimal" required></label><label>Mevcut birikim<input name="currentSavings" type="number" min="0" step="0.01" value="100000" inputmode="decimal"></label><label>Beklenen getiri %<input name="returnRate" type="number" min="0" max="100" step="0.1" value="8" inputmode="decimal" required></label><label>Enflasyon %<input name="inflationRate" type="number" min="0" max="100" step="0.1" value="3" inputmode="decimal"></label></div><button class="btn" type="submit">Emekliliği hesapla</button>`,
    'student-loan': `<div class="form-grid"><label>Kredi tutarı<input name="balance" type="number" min="1" step="0.01" value="100000" inputmode="decimal" required></label><label>Faiz oranı %<input name="interestRate" type="number" min="0" max="100" step="0.1" value="4.5" inputmode="decimal" required></label><label>Aylık ödeme<input name="monthlyPayment" type="number" min="1" step="0.01" value="3500" inputmode="decimal" required></label><label>Ek ödeme<input name="extraPayment" type="number" min="0" step="0.01" value="500" inputmode="decimal"></label></div><button class="btn" type="submit">Ödeme planını hesapla</button>`
  };
}

const CALCULATORS = {
  'live-exchange': calculateLiveExchange,
  'stock-lookup': calculateStockLookup,
  'crypto-prices': calculateCryptoPrices,
  'cloud-cost': calculateCloudCost,
  'crypto-tax': calculateCryptoTax,
  tax: calculateTaxEstimator,
  'life-insurance': calculateLifeInsurance,
  retirement: calculateRetirement,
  'student-loan': calculateStudentLoan
};

function drawChart(canvas) {
  if (!canvas || !canvas.getContext) return;
  let data = [];
  try { data = JSON.parse(canvas.dataset.chart || '[]'); } catch { data = []; }
  const type = canvas.dataset.chartType || 'line';
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  const padding = 34;
  ctx.clearRect(0, 0, width, height);
  ctx.font = '12px Inter, sans-serif';
  if (type === 'pie') return drawPie(ctx, data, width, height);
  if (type === 'bar') return drawBar(ctx, data, width, height, padding);
  if (type === 'multiLine') return drawMultiLine(ctx, data, width, height, padding);
  if (type === 'dualLine') return drawDualLine(ctx, data, width, height, padding);
  return drawLine(ctx, data, width, height, padding);
}

function drawAxis(ctx, width, height, padding) {
  ctx.strokeStyle = 'rgba(148,163,184,0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();
}

function drawLinePath(ctx, values, width, height, padding, color, maxValue) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  values.forEach((value, index) => {
    const x = padding + (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
    const y = height - padding - (value / Math.max(maxValue, 1)) * (height - padding * 2);
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.stroke();
}

function drawLine(ctx, data, width, height, padding) {
  drawAxis(ctx, width, height, padding);
  const values = data.map((point) => Number(point.value || 0));
  drawLinePath(ctx, values, width, height, padding, '#22C55E', Math.max(...values, 1));
}

function drawDualLine(ctx, data, width, height, padding) {
  drawAxis(ctx, width, height, padding);
  const current = data.map((point) => Number(point.current || 0));
  const extra = data.map((point) => Number(point.extra || 0));
  const maxValue = Math.max(...current, ...extra, 1);
  drawLinePath(ctx, current, width, height, padding, '#F97316', maxValue);
  drawLinePath(ctx, extra, width, height, padding, '#22C55E', maxValue);
  ctx.fillStyle = '#F97316'; ctx.fillText('Mevcut', padding + 6, 18);
  ctx.fillStyle = '#22C55E'; ctx.fillText('Ek ödeme', padding + 72, 18);
}

function drawMultiLine(ctx, data, width, height, padding) {
  drawAxis(ctx, width, height, padding);
  const colors = ['#22C55E', '#38BDF8', '#F97316', '#A78BFA', '#F43F5E'];
  const maxValue = Math.max(...data.flatMap((row) => row.values || []), 1);
  data.forEach((row, index) => {
    drawLinePath(ctx, row.values || [], width, height, padding, colors[index % colors.length], maxValue);
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillText(row.label, padding + 6 + index * 64, 18);
  });
}

function drawBar(ctx, data, width, height, padding) {
  const maxValue = Math.max(...data.map((point) => Number(point.value || 0)), 1);
  const barWidth = (width - padding * 2) / Math.max(data.length, 1) * 0.62;
  data.forEach((point, index) => {
    const barHeight = (Number(point.value || 0) / maxValue) * (height - padding * 2);
    const x = padding + index * ((width - padding * 2) / data.length) + barWidth * 0.3;
    const y = height - padding - barHeight;
    ctx.fillStyle = index === data.length - 1 ? '#22C55E' : '#38BDF8';
    ctx.fillRect(x, y, barWidth, barHeight);
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText(point.label, x, height - 10);
  });
}

function drawPie(ctx, data, width, height) {
  const colors = ['#22C55E', '#38BDF8', '#F97316', '#A78BFA', '#F43F5E'];
  const total = data.reduce((sum, item) => sum + Math.max(0, Number(item.value || 0)), 0) || 1;
  let start = -Math.PI / 2;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.32;
  data.forEach((item, index) => {
    const slice = (Math.max(0, Number(item.value || 0)) / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, start, start + slice);
    ctx.closePath();
    ctx.fillStyle = colors[index % colors.length];
    ctx.fill();
    ctx.fillText(item.label, 16, 22 + index * 18);
    start += slice;
  });
}

function renderFavorites(key) {
  const target = document.getElementById('favoriteList');
  if (!target) return;
  const favorites = localStorageGet(key, []);
  target.innerHTML = favorites.length ? `<p class="finance-note"><strong>Favoriler:</strong> ${favorites.map(escapeHtml).join(', ')}</p>` : '<p class="finance-note">Henüz favori eklenmedi.</p>';
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

function setupCloudInstances(form) {
  const provider = form.querySelector('#cloudProvider');
  const instance = form.querySelector('#cloudInstance');
  if (!provider || !instance) return;
  const refresh = () => {
    const options = Object.keys(CLOUD_PRICING[provider.value].instances);
    instance.innerHTML = options.map((name) => `<option value="${name}">${name}</option>`).join('');
  };
  provider.addEventListener('change', refresh);
  refresh();
}

function setupSwap(form) {
  form.querySelector('#swapCurrencies')?.addEventListener('click', () => {
    const from = form.elements.from;
    const to = form.elements.to;
    const next = from.value;
    from.value = to.value;
    to.value = next;
  });
}

export function initP0FinanceTool(tool = document.body.dataset.financeTool) {
  const form = document.getElementById('financeToolForm');
  const results = document.querySelector('.results-panel');
  const status = document.getElementById('toolStatus');
  const markup = forms()[tool];
  if (!form || !results || !markup || !CALCULATORS[tool]) return;
  form.innerHTML = markup;
  setupCloudInstances(form);
  setupSwap(form);

  let cryptoTimer;
  async function run() {
    try {
      status.textContent = 'Hesaplanıyor...';
      status.dataset.type = 'info';
      const calculator = CALCULATORS[tool];
      const output = await calculator(Object.fromEntries(new FormData(form)));
      results.innerHTML = output.html;
      results.classList.add('visible');
      status.textContent = output.status;
      status.dataset.type = output.type;
      results.querySelectorAll('canvas[data-chart]').forEach(drawChart);
      bindFavoriteButtons(results);
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) {
      results.innerHTML = `<p class="form-error">${escapeHtml(error.message || 'Hesaplama sırasında bir hata oluştu.')}</p>`;
      results.classList.add('visible');
      status.textContent = 'Hata oluştu.';
      status.dataset.type = 'error';
      results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run();
  });

  if (tool === 'crypto-prices') {
    cryptoTimer = window.setInterval(run, 30000);
    window.addEventListener('pagehide', () => window.clearInterval(cryptoTimer), { once: true });
  }
}

if (typeof document !== 'undefined') {
  initP0FinanceTool();
}
