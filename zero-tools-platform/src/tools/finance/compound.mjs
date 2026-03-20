/**
 * Compound Interest Calculator
 * Calculates investment growth with compound interest
 */

/**
 * Calculate compound interest
 * @param {Object} inputs - Calculator inputs
 * @returns {Object} Calculation results
 */
export function compoundInterestCalculator(inputs) {
  const principal = parseFloat(inputs.principal);
  const annualRate = parseFloat(inputs.rate) / 100;
  const years = parseInt(inputs.years);
  const monthlyContribution = parseFloat(inputs.monthlyContribution) || 0;
  const frequency = inputs.compoundFrequency || 'monthly';

  // Compounding periods per year
  const frequencies = {
    daily: 365,
    monthly: 12,
    quarterly: 4,
    annually: 1
  };
  const n = frequencies[frequency] || 12;
  const ratePerPeriod = annualRate / n;
  const _totalPeriods = years * n; // Total periods for reference
  void _totalPeriods;
  const contributionPerPeriod = monthlyContribution * (12 / n);

  let balance = principal;
  let totalContributions = principal;
  const yearlyBreakdown = [];

  for (let year = 1; year <= years; year++) {
    const startBalance = balance;
    
    for (let p = 0; p < n; p++) {
      balance = balance * (1 + ratePerPeriod) + contributionPerPeriod;
      totalContributions += contributionPerPeriod;
    }

    const yearlyInterest = balance - startBalance - (contributionPerPeriod * n);
    
    yearlyBreakdown.push({
      year,
      balance: round(balance),
      interest: round(yearlyInterest),
      contributions: round(totalContributions)
    });
  }

  const totalInterest = balance - totalContributions;

  return {
    finalAmount: round(balance),
    totalInterest: round(totalInterest),
    totalContributions: round(totalContributions),
    yearlyBreakdown,
    html: formatCompoundResult({
      finalAmount: balance,
      totalInterest,
      totalContributions,
      yearlyBreakdown
    })
  };
}

/**
 * Format result as HTML
 */
function formatCompoundResult(data) {
  const maxYearsToShow = Math.min(10, data.yearlyBreakdown.length);
  const shownBreakdown = data.yearlyBreakdown.slice(0, maxYearsToShow);

  return `
    <div class="compound-results">
      <div class="result-highlight success">
        <div class="result-big">$${data.finalAmount.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
        <div class="result-label">Final Amount</div>
      </div>
      
      <div class="result-grid">
        <div class="result-card">
          <span class="result-value success">+$${data.totalInterest.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
          <span class="result-label">Interest Earned</span>
        </div>
        <div class="result-card">
          <span class="result-value">$${data.totalContributions.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
          <span class="result-label">Total Contributed</span>
        </div>
      </div>

      <div class="breakdown-table">
        <h4>Growth by Year</h4>
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>Balance</th>
              <th>Interest</th>
            </tr>
          </thead>
          <tbody>
            ${shownBreakdown.map(row => `
              <tr>
                <td>${row.year}</td>
                <td>$${row.balance.toLocaleString()}</td>
                <td class="success">+$${row.interest.toLocaleString()}</td>
              </tr>
            `).join('')}
            ${data.yearlyBreakdown.length > maxYearsToShow ? `
              <tr><td colspan="3" class="text-center">... ${data.yearlyBreakdown.length - maxYearsToShow} more years</td></tr>
            ` : ''}
          </tbody>
        </table>
      </div>

      <div class="disclaimer-note" style="margin-top:1rem; padding:0.75rem 1rem; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:8px; font-size:0.8125rem; color:var(--text-muted, #888);">
        <strong>Disclaimer:</strong> This tool provides estimates only, not financial or professional advice. Past returns do not guarantee future results.
      </div>
    </div>
  `;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

export default compoundInterestCalculator;
