/**
 * Currency Converter
 * Converts between currencies using live exchange rates
 */

import { exchangeRateService } from '../../services/exchange-rate-service.mjs';

/**
 * Convert currency
 * @param {Object} inputs - Converter inputs
 * @returns {Object} Conversion result
 */
export async function currencyConverter(inputs) {
  const amount = parseFloat(inputs.amount);
  const from = inputs.from.toUpperCase();
  const to = inputs.to.toUpperCase();

  try {
    const rate = await exchangeRateService.getRate(from, to);
    const convertedAmount = amount * rate;
    const inverseRate = 1 / rate;

    return {
      convertedAmount: round(convertedAmount),
      rate: round(rate),
      inverseRate: round(inverseRate),
      from,
      to,
      originalAmount: amount,
      html: formatCurrencyResult({
        amount, convertedAmount, rate, inverseRate, from, to
      })
    };
  } catch (error) {
    // Fallback to mock rates if API fails
    const fallbackRates = {
      'USD-EUR': 0.92, 'EUR-USD': 1.09,
      'USD-GBP': 0.79, 'GBP-USD': 1.27,
      'USD-JPY': 148, 'JPY-USD': 0.0068
    };
    
    const key = `${from}-${to}`;
    const rate = fallbackRates[key] || 1;
    const convertedAmount = amount * rate;

    return {
      convertedAmount: round(convertedAmount),
      rate: round(rate),
      inverseRate: round(1 / rate),
      from,
      to,
      originalAmount: amount,
      fallback: true,
      html: formatCurrencyResult({
        amount, convertedAmount, rate, inverseRate: 1/rate, from, to
      })
    };
  }
}

/**
 * Format result as HTML
 */
function formatCurrencyResult(data) {
  return `
    <div class="currency-results">
      <div class="conversion-display">
        <div class="from-amount">
          <span class="amount">${data.amount.toLocaleString()}</span>
          <span class="currency">${data.from}</span>
        </div>
        <div class="conversion-arrow">=</div>
        <div class="to-amount highlight">
          <span class="amount">${data.convertedAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
          <span class="currency">${data.to}</span>
        </div>
      </div>

      <div class="rate-info">
        <div class="rate-row">
          <span>Exchange Rate</span>
          <span class="rate-value">1 ${data.from} = ${data.rate.toFixed(6)} ${data.to}</span>
        </div>
        <div class="rate-row">
          <span>Inverse Rate</span>
          <span class="rate-value">1 ${data.to} = ${data.inverseRate.toFixed(6)} ${data.from}</span>
        </div>
      </div>
    </div>
  `;
}

function round(n) {
  return Math.round(n * 1000000) / 1000000;
}

export default currencyConverter;
