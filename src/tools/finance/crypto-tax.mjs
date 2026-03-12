/**
 * Crypto Tax Calculator
 * Calculates taxes using FIFO or LIFO accounting methods
 */

/**
 * Calculate crypto taxes
 * @param {Object} inputs - Calculator inputs
 * @returns {Object} Tax calculation results
 */
export function cryptoTaxCalculator(inputs) {
  const purchases = parseTransactions(inputs.purchases);
  const sales = parseTransactions(inputs.sales);
  const method = inputs.method || 'FIFO';
  const taxRate = parseFloat(inputs.taxRate) / 100;

  const lots = [...purchases].sort((a, b) => a.date - b.date);
  const transactions = [];
  let totalGains = 0;
  let totalLosses = 0;

  for (const sale of sales.sort((a, b) => a.date - b.date)) {
    let remainingToSell = sale.amount;
    const saleLots = [];

    while (remainingToSell > 0 && lots.length > 0) {
      // Select lot based on method
      const lotIndex = method === 'FIFO' ? 0 : lots.length - 1;
      const lot = lots[lotIndex];

      const amountFromLot = Math.min(remainingToSell, lot.remaining);
      const costBasis = amountFromLot * lot.price;
      const proceeds = amountFromLot * sale.price;
      const gain = proceeds - costBasis;

      saleLots.push({
        purchaseDate: lot.date,
        amount: amountFromLot,
        costBasis,
        proceeds,
        gain
      });

      if (gain >= 0) {
        totalGains += gain;
      } else {
        totalLosses += Math.abs(gain);
      }

      lot.remaining -= amountFromLot;
      remainingToSell -= amountFromLot;

      if (lot.remaining <= 0.00000001) {
        lots.splice(lotIndex, 1);
      }
    }

    transactions.push({
      date: sale.date,
      amount: sale.amount,
      price: sale.price,
      totalProceeds: sale.amount * sale.price,
      lots: saleLots,
      totalGain: saleLots.reduce((sum, l) => sum + l.gain, 0)
    });
  }

  const netGain = totalGains - totalLosses;
  const estimatedTax = Math.max(0, netGain * taxRate);

  return {
    totalGains: round(totalGains),
    totalLosses: round(totalLosses),
    netGain: round(netGain),
    estimatedTax: round(estimatedTax),
    transactions,
    html: formatCryptoTaxResult({
      totalGains, totalLosses, netGain, estimatedTax, transactions
    })
  };
}

/**
 * Parse transaction input
 */
function parseTransactions(input) {
  if (Array.isArray(input)) return input;
  if (typeof input === 'string') {
    return input.split('\n').map(line => {
      const [date, amount, price] = line.split(',').map(s => s.trim());
      return {
        date: new Date(date),
        amount: parseFloat(amount),
        price: parseFloat(price),
        remaining: parseFloat(amount)
      };
    });
  }
  return [];
}

/**
 * Format result as HTML
 */
function formatCryptoTaxResult(data) {
  return `
    <div class="crypto-tax-results">
      <div class="result-grid three-col">
        <div class="result-card ${data.netGain >= 0 ? 'success' : 'error'}">
          <span class="result-value">$${data.netGain.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
          <span class="result-label">Net Gain/Loss</span>
        </div>
        <div class="result-card">
          <span class="result-value success">+$${data.totalGains.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
          <span class="result-label">Total Gains</span>
        </div>
        <div class="result-card">
          <span class="result-value error">-$${data.totalLosses.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
          <span class="result-label">Total Losses</span>
        </div>
      </div>

      <div class="result-highlight ${data.estimatedTax > 0 ? 'warning' : 'success'}">
        <div class="result-big">$${data.estimatedTax.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
        <div class="result-label">Estimated Tax</div>
      </div>

      <div class="transactions-summary">
        <h4>Transaction Summary (${data.transactions.length} sales)</h4>
        ${data.transactions.slice(0, 5).map(tx => `
          <div class="transaction-row ${tx.totalGain >= 0 ? 'gain' : 'loss'}">
            <span>${tx.date.toLocaleDateString()}</span>
            <span>${tx.amount.toFixed(4)} BTC @ $${tx.price.toLocaleString()}</span>
            <span>${tx.totalGain >= 0 ? '+' : ''}$${tx.totalGain.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>
          </div>
        `).join('')}
        ${data.transactions.length > 5 ? `<div class="text-center">+ ${data.transactions.length - 5} more transactions</div>` : ''}
      </div>
    </div>
  `;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

export default cryptoTaxCalculator;
