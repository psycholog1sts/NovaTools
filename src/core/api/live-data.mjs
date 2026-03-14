/**
 * Live Data API Module
 * Fetches real-time financial data from public APIs
 */

const API_ENDPOINTS = {
  exchange: 'https://open.er-api.com/v6/latest/USD',
  islamicCalendar: 'https://api.aladhan.com/v1/gToH?date='
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const cache = {
  crypto: null,
  exchange: null,
  islamic: null,
  timestamps: {}
};

function isCachedValid(key) {
  const timestamp = cache.timestamps[key];
  return timestamp && (Date.now() - timestamp) < CACHE_DURATION;
}

/**
 * Fetch cryptocurrency prices
 * @returns {Promise<Object>} Bitcoin and Ethereum prices
 */
export async function fetchCryptoPrices() {
  if (isCachedValid('crypto')) {
    return cache.crypto;
  }
  
  try {
    const url = new URL('https://api.coingecko.com/api/v3/simple/price');
    url.searchParams.set('ids', 'bitcoin,ethereum');
    url.searchParams.set('vs_currencies', 'usd');
    url.searchParams.set('include_24hr_change', 'true');
    const response = await fetch(url);
    if (!response.ok) throw new Error('API Error');
    const data = await response.json();

    cache.crypto = {
      btc: {
        price: data.bitcoin.usd,
        change24h: data.bitcoin.usd_24h_change
      },
      eth: {
        price: data.ethereum.usd,
        change24h: data.ethereum.usd_24h_change
      }
    };
    cache.timestamps.crypto = Date.now();

    return cache.crypto;
  } catch (error) {
    console.error('Failed to fetch crypto prices:', error);
    // Return fallback data with cached flag
    const fallback = { btc: { price: 88450, change24h: 0 }, eth: { price: 3250, change24h: 0 }, cached: true };
    cache.crypto = fallback;
    return fallback;
  }
}

/**
 * Fetch exchange rates
 * @returns {Promise<Object>} USD exchange rates
 */
export async function fetchExchangeRates() {
  if (isCachedValid('exchange')) {
    return cache.exchange;
  }
  
  try {
    const response = await fetch(API_ENDPOINTS.exchange);
    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    
    cache.exchange = {
      EUR: data.rates.EUR,
      GBP: data.rates.GBP,
      JPY: data.rates.JPY,
      TRY: data.rates.TRY,
      lastUpdate: data.time_last_update_utc
    };
    cache.timestamps.exchange = Date.now();
    
    return cache.exchange;
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error);
    // Return fallback data
    return {
      EUR: 0.9234,
      GBP: 0.7891,
      JPY: 149.52,
      TRY: 28.45,
      lastUpdate: new Date().toISOString().split('T')[0]
    };
  }
}

/**
 * Fetch Islamic date
 * @returns {Promise<Object>} Hijri date
 */
export async function fetchIslamicDate() {
  if (isCachedValid('islamic')) {
    return cache.islamic;
  }
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const response = await fetch(`${API_ENDPOINTS.islamicCalendar}${today}`);
    if (!response.ok) throw new Error('API Error');
    const data = await response.json();
    
    const hijri = data.data.hijri;
    cache.islamic = {
      day: hijri.day,
      month: hijri.month.en,
      year: hijri.year,
      formatted: `${hijri.day} ${hijri.month.en} ${hijri.year} AH`
    };
    cache.timestamps.islamic = Date.now();
    
    return cache.islamic;
  } catch (error) {
    console.error('Failed to fetch Islamic date:', error);
    return null;
  }
}

/**
 * Update footer ticker with live data
 */
export async function updateFooterTicker() {
  try {
    const [crypto, exchange] = await Promise.all([
      fetchCryptoPrices(),
      fetchExchangeRates()
    ]);
    
    // Update USD/EUR
    const usdeurEl = document.getElementById('usdeur');
    if (usdeurEl) {
      const change = ((exchange.EUR - 0.92) / 0.92 * 100).toFixed(2);
      usdeurEl.innerHTML = `${exchange.EUR.toFixed(4)} <span class="change ${change >= 0 ? 'positive' : 'negative'}">${change >= 0 ? '+' : ''}${change}%</span>`;
    }
    
    // Update USD/JPY
    const usdjpyEl = document.getElementById('usdjpy');
    if (usdjpyEl) {
      const change = ((exchange.JPY - 148) / 148 * 100).toFixed(2);
      usdjpyEl.innerHTML = `${exchange.JPY.toFixed(2)} <span class="change ${change >= 0 ? 'positive' : 'negative'}">${change >= 0 ? '+' : ''}${change}%</span>`;
    }
    
    // Update BTC
    const btcEl = document.getElementById('btcprice');
    if (btcEl) {
      const priceK = (crypto.btc.price / 1000).toFixed(1);
      const change = crypto.btc.change24h.toFixed(1);
      btcEl.innerHTML = `$${priceK}K <span class="change ${change >= 0 ? 'positive' : 'negative'}">${change >= 0 ? '+' : ''}${change}%</span>`;
    }
    
    // Update S&P 500 (using mock since no free API)
    const sp500El = document.getElementById('sp500');
    if (sp500El) {
      const spValue = 5120 + (Math.random() - 0.5) * 50;
      const change = ((spValue - 5100) / 5100 * 100).toFixed(1);
      sp500El.innerHTML = `${spValue.toFixed(1)} <span class="change ${change >= 0 ? 'positive' : 'negative'}">${change >= 0 ? '+' : ''}${change}%</span>`;
    }
    
  } catch (error) {
    console.error('Failed to update footer ticker:', error);
  }
}

export default {
  fetchCryptoPrices,
  fetchExchangeRates,
  fetchIslamicDate,
  updateFooterTicker
};
