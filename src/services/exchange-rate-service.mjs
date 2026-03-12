/**
 * Exchange Rate Service
 * Currency exchange rates with caching
 */

import { apiClient } from '../core/api-client.mjs';
import { getConfig } from '../core/config.mjs';
import { stateManager } from '../core/state-manager.mjs';

class ExchangeRateService {
  constructor() {
    this.baseUrl = getConfig('apis.exchangeRate.baseUrl');
    this.cacheDuration = getConfig('apis.exchangeRate.cacheDuration');
    this.fallbackRates = getConfig('apis.exchangeRate.fallbackRates');
  }

  /**
   * Get latest exchange rates (base: USD)
   * @returns {Promise<Object>} Exchange rates
   */
  async getRates() {
    try {
      const data = await apiClient.get(`${this.baseUrl}/latest/USD`);
      
      const result = {
        base: data.base,
        date: data.date,
        rates: data.rates,
        timestamp: Date.now()
      };

      // Update state
      stateManager.set('data.exchangeRates', result);
      
      return result;
    } catch (error) {
      console.error('Failed to fetch exchange rates:', error);
      return this.getFallbackRates();
    }
  }

  /**
   * Get specific rate
   * @param {string} from - From currency
   * @param {string} to - To currency
   * @returns {Promise<number>} Exchange rate
   */
  async getRate(from, to) {
    const rates = await this.getRates();
    
    if (from === 'USD') {
      return rates.rates[to];
    }
    
    // Convert via USD
    const fromRate = rates.rates[from];
    const toRate = rates.rates[to];
    
    return toRate / fromRate;
  }

  /**
   * Convert amount between currencies
   * @param {number} amount - Amount to convert
   * @param {string} from - From currency
   * @param {string} to - To currency
   * @returns {Promise<number>} Converted amount
   */
  async convert(amount, from, to) {
    if (from === to) return amount;
    
    const rate = await this.getRate(from, to);
    return amount * rate;
  }

  /**
   * Get rates for footer display
   * @returns {Promise<Object>} Formatted rates
   */
  async getDisplayRates() {
    const rates = await this.getRates();
    
    return {
      USDEUR: {
        rate: rates.rates.EUR,
        change: this.calculateChange(rates.rates.EUR, 0.92)
      },
      USDJPY: {
        rate: rates.rates.JPY,
        change: this.calculateChange(rates.rates.JPY, 148)
      },
      USDGBP: {
        rate: rates.rates.GBP,
        change: this.calculateChange(rates.rates.GBP, 0.79)
      }
    };
  }

  /**
   * Calculate percentage change
   * @param {number} current - Current value
   * @param {number} previous - Previous value
   * @returns {number} Percentage change
   */
  calculateChange(current, previous) {
    return ((current - previous) / previous) * 100;
  }

  /**
   * Get fallback rates when API fails
   * @returns {Object} Fallback rates
   */
  getFallbackRates() {
    return {
      base: 'USD',
      date: new Date().toISOString().split('T')[0],
      rates: this.fallbackRates,
      timestamp: Date.now()
    };
  }

  /**
   * Format rate for display
   * @param {number} rate - Rate value
   * @param {number} decimals - Decimal places
   * @returns {string} Formatted rate
   */
  formatRate(rate, decimals = 4) {
    return rate.toFixed(decimals);
  }
}

// Singleton instance
export const exchangeRateService = new ExchangeRateService();

export default exchangeRateService;
