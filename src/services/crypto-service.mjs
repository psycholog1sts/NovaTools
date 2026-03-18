/**
 * Crypto Service
 * Cryptocurrency price data with caching
 */

import { apiClient } from '../core/api-client.mjs';
import { getConfig } from '../core/config.mjs';
import { stateManager } from '../core/state-manager.mjs';

class CryptoService {
  constructor() {
    this.baseUrl = getConfig('apis.coingecko.baseUrl');
    this.cacheDuration = getConfig('apis.coingecko.cacheDuration');
  }

  /**
   * Get current prices for cryptocurrencies
   * @param {Array} coins - Coin IDs (e.g., ['bitcoin', 'ethereum'])
   * @param {Array} currencies - Currency codes (e.g., ['usd', 'eur'])
   * @returns {Promise<Object>} Price data
   */
  async getPrices(coins = ['bitcoin', 'ethereum'], currencies = ['usd']) {
    // Cache key: `crypto_prices_${coins.join('_')}_${currencies.join('_')}`
    
    try {
      const data = await apiClient.get(
        `${this.baseUrl}/simple/price`,
        {
          params: {
            ids: coins.join(','),
            vs_currencies: currencies.join(','),
            include_24hr_change: true,
            include_last_updated_at: true
          }
        }
      );

      const result = this.transformPriceData(data, currencies);
      
      // Update state
      stateManager.set('data.crypto', result);
      stateManager.set('data.lastUpdate', Date.now());
      
      return result;
    } catch (error) {
      console.error('Failed to fetch crypto prices:', error);
      
      // Return fallback data
      return this.getFallbackData(coins);
    }
  }

  /**
   * Get Bitcoin price
   * @returns {Promise<Object>} Bitcoin data
   */
  async getBitcoinPrice() {
    const prices = await this.getPrices(['bitcoin'], ['usd']);
    return prices.bitcoin;
  }

  /**
   * Get Ethereum price
   * @returns {Promise<Object>} Ethereum data
   */
  async getEthereumPrice() {
    const prices = await this.getPrices(['ethereum'], ['usd']);
    return prices.ethereum;
  }

  /**
   * Transform API response to consistent format
   * @param {Object} data - API response
   * @param {Array} currencies - Requested currencies
   * @returns {Object} Transformed data
   */
  transformPriceData(data, currencies) {
    const result = {};
    
    Object.entries(data).forEach(([coinId, prices]) => {
      result[coinId] = {
        prices: {},
        changes: {},
        lastUpdated: prices.last_updated_at
      };
      
      currencies.forEach(currency => {
        result[coinId].prices[currency] = prices[currency];
        result[coinId].changes[currency] = prices[`${currency}_24h_change`];
      });
    });
    
    return result;
  }

  /**
   * Get fallback data when API fails
   * @param {Array} coins - Requested coins
   * @returns {Object} Fallback data
   */
  getFallbackData(coins) {
    const fallbacks = {
      bitcoin: {
        prices: { usd: 88450 },
        changes: { usd: 2.4 },
        lastUpdated: Date.now() / 1000
      },
      ethereum: {
        prices: { usd: 3250 },
        changes: { usd: 1.8 },
        lastUpdated: Date.now() / 1000
      }
    };

    const result = {};
    coins.forEach(coin => {
      if (fallbacks[coin]) {
        result[coin] = fallbacks[coin];
      }
    });

    return result;
  }

  /**
   * Format price for display
   * @param {number} price - Price value
   * @returns {string} Formatted price
   */
  formatPrice(price) {
    if (price >= 1000) {
      return `$${(price / 1000).toFixed(1)}K`;
    }
    return `$${price.toFixed(2)}`;
  }

  /**
   * Format change percentage
   * @param {number} change - Change value
   * @returns {Object} Formatted change
   */
  formatChange(change) {
    const isPositive = change >= 0;
    return {
      value: `${isPositive ? '+' : ''}${change.toFixed(1)}%`,
      positive: isPositive,
      class: isPositive ? 'positive' : 'negative'
    };
  }
}

// Singleton instance
export const cryptoService = new CryptoService();

export default cryptoService;
