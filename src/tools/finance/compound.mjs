/**
 * Compound Interest Calculator
 * Calculates investment growth using A = P(1 + r/n)^(nt) for principal and
 * applies regular contributions at the end of each compounding period.
 */

const FREQUENCIES = {
  daily: 365,
  monthly: 12,
  quarterly: 4,
  annually: 1
};

const CURRENCY_BY_CODE = {
  TRY: { locale: 'tr-TR', currency: 'TRY' },
  USD: { locale: 'en-US', currency: 'USD' },
  EUR: { locale: 'de-DE', currency: 'EUR' },
  GBP: { locale: 'en-GB', currency: 'GBP' }
};

/**
 * Calculate compound interest
 * @param {Object} inputs - Calculator inputs
 * @returns {Object} Calculation results
 */
export function compoundInterestCalculator(inputs) {
  const principal = parseMoneyInput(inputs.principal);
  const annualRate = parsePercent(inputs.rate) / 100;
  const years = parseInteger(inputs.years);
  const monthlyContribution = parseMoneyInput(inputs.monthlyContribution || 0);
  const frequency = Object.prototype.hasOwnProperty.call(FREQUENCIES, inputs.compoundFrequency) ? inputs.compoundFrequency : 'monthly';
  const inflationRate = parsePercent(inputs.inflationRate || 0) / 100;
  const currency = CURRENCY_BY_CODE[inputs.currency] ? inputs.currency : 'USD';

  validateInputs({ principal, annualRate, years, monthlyContribution, inflationRate });

  const n = FREQUENCIES[frequency];
  const ratePerPeriod = annualRate / n;
  const contributionPerPeriod = monthlyContribution * (12 / n);
  const totalPeriods = years * n;
  let balance = principal;
  let totalContributions = principal;
  const yearlyBreakdown = [];

  for (let period = 1; period <= totalPeriods; period++) {
    const interest = balance * ratePerPeriod;
    balance += interest + contributionPerPeriod;
    totalContributions += contributionPerPeriod;

    if (period % n === 0) {
      const year = period / n;
      const inflationAdjustedBalance = inflationRate > 0 ? balance / Math.pow(1 + inflationRate, year) : balance;
      yearlyBreakdown.push({
        year,
        balance: round(balance),
        interest: round(balance - totalContributions),
        yearlyInterest: round(interest),
        contributions: round(totalContributions),
        inflationAdjustedBalance: round(inflationAdjustedBalance)
      });
    }
  }

  const formulaAmount = principal * Math.pow(1 + annualRate / n, n * years);
  const totalInterest = balance - totalContributions;
  const inflationAdjustedAmount = inflationRate > 0 ? balance / Math.pow(1 + inflationRate, years) : balance;
  const result = {
    finalAmount: round(balance),
    formulaAmount: round(formulaAmount),
    totalInterest: round(totalInterest),
    totalContributions: round(totalContributions),
    inflationAdjustedAmount: round(inflationAdjustedAmount),
    growthMultiplier: totalContributions > 0 ? round(balance / totalContributions) : 0,
    currency,
    compoundFrequency: frequency,
    yearlyBreakdown,
    chartData: yearlyBreakdown.map((row) => ({
      year: row.year,
      balance: row.balance,
      contributions: row.contributions,
      inflationAdjustedBalance: row.inflationAdjustedBalance
    }))
  };

  return {
    ...result,
    html: formatCompoundResult(result)
  };
}

export function parseMoneyInput(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/[₺$€£]/g, '')
    .replace(/(?<=\d)[,.](?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parsePercent(value) {
  const parsed = Number.parseFloat(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseInteger(value) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

function validateInputs({ principal, annualRate, years, monthlyContribution, inflationRate }) {
  if (principal < 0) throw new Error('Initial investment cannot be negative.');
  if (monthlyContribution < 0) throw new Error('Monthly contribution cannot be negative.');
  if (annualRate < 0 || annualRate > 1) throw new Error('Annual rate must be between 0% and 100%.');
  if (inflationRate < 0 || inflationRate > 1) throw new Error('Inflation rate must be between 0% and 100%.');
  if (years < 1 || years > 100) throw new Error('Time period must be between 1 and 100 years.');
}

/**
 * Format result as HTML
 */
function formatCompoundResult(data) {
  const maxYearsToShow = Math.min(30, data.yearlyBreakdown.length);
  const shownBreakdown = data.yearlyBreakdown.slice(0, maxYearsToShow);

  return `
    <div class="compound-results">
      <div class="result-grid">
        <div class="result-item highlight">
          <div class="result-value">${formatCurrency(data.finalAmount, data.currency)}</div>
          <div class="result-label">Final Amount</div>
        </div>
        <div class="result-item">
          <div class="result-value">${formatCurrency(data.totalContributions, data.currency)}</div>
          <div class="result-label">Total Contributed</div>
        </div>
        <div class="result-item highlight">
          <div class="result-value">${formatCurrency(data.totalInterest, data.currency)}</div>
          <div class="result-label">Interest Earned</div>
        </div>
        <div class="result-item">
          <div class="result-value">${data.growthMultiplier.toFixed(2)}x</div>
          <div class="result-label">Growth Multiplier</div>
        </div>
      </div>

      <div class="chart-container">
        <h4>Investment Growth Chart</h4>
        <canvas id="compoundGrowthChart" width="760" height="260" data-chart='${JSON.stringify(data.chartData)}' aria-label="Investment growth chart" role="img"></canvas>
      </div>

      <div class="chart-container">
        <h4>Growth by Year</h4>
        <div style="overflow-x:auto; -webkit-overflow-scrolling: touch;">
          <table style="width: 100%; min-width: 640px;">
            <thead>
              <tr>
                <th>Year</th>
                <th>Balance</th>
                <th>Contributed</th>
                <th>Interest</th>
                <th>Inflation Adjusted</th>
              </tr>
            </thead>
            <tbody>
              ${shownBreakdown.map((row) => `
                <tr>
                  <td>${row.year}</td>
                  <td>${formatCurrency(row.balance, data.currency)}</td>
                  <td>${formatCurrency(row.contributions, data.currency)}</td>
                  <td class="success">${formatCurrency(row.interest, data.currency)}</td>
                  <td>${formatCurrency(row.inflationAdjustedBalance, data.currency)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="disclaimer-note" style="margin-top:1rem; padding:0.75rem 1rem; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; font-size:0.8125rem; color:var(--text-muted, #888);">
        <strong>Disclaimer:</strong> This tool provides estimates only, not financial or professional advice. Past returns do not guarantee future results.
      </div>
    </div>
  `;
}

function formatCurrency(num, currency) {
  const options = CURRENCY_BY_CODE[currency] || CURRENCY_BY_CODE.USD;
  return new Intl.NumberFormat(options.locale, {
    style: 'currency',
    currency: options.currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

function round(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export default compoundInterestCalculator;
