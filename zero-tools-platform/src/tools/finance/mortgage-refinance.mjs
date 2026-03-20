/**
 * Mortgage Refinance Calculator
 * Calculates refinance savings and break-even analysis
 * 
 * Verification Test Case:
 * Current: $300,000 balance, 6.5% rate, 25 years remaining
 * New: 4.5% rate, 30-year term, $5,000 closing costs
 * Expected: Monthly savings ~$318, Break-even ~16 months
 */

/**
 * Calculate refinance analysis
 * @param {Object} inputs - Calculator inputs
 * @returns {Object} Calculation results
 */
export function refinanceCalculator(inputs) {
  const balance = parseFloat(inputs.balance) || 0;
  const currentRate = parseFloat(inputs.currentRate) || 0;
  const yearsRemaining = parseInt(inputs.yearsRemaining) || 0;
  const newRate = parseFloat(inputs.newRate) || 0;
  const newTerm = parseInt(inputs.newTerm) || 0;
  const closingCosts = parseFloat(inputs.closingCosts) || 0;

  // Validate inputs
  if (balance <= 0 || currentRate <= 0 || newRate <= 0) {
    throw new Error('Invalid input: Balance and rates must be greater than 0');
  }

  // Calculate monthly payments
  const currentPayment = calculateMonthlyPayment(balance, currentRate, yearsRemaining);
  const newPayment = calculateMonthlyPayment(balance, newRate, newTerm);
  const monthlySavings = currentPayment - newPayment;

  // Calculate interest costs
  const currentTotalInterest = (currentPayment * yearsRemaining * 12) - balance;
  const newTotalInterest = (newPayment * newTerm * 12) - balance;
  const interestSaved = currentTotalInterest - newTotalInterest;

  // Calculate total costs
  const currentTotalCost = currentPayment * yearsRemaining * 12;
  const newTotalCost = (newPayment * newTerm * 12) + closingCosts;
  const totalSavings = currentTotalCost - newTotalCost;

  // Break-even calculation
  const breakEvenMonths = monthlySavings > 0 
    ? Math.ceil(closingCosts / monthlySavings) 
    : Infinity;

  // Generate recommendation
  const recommendation = generateRecommendation(monthlySavings, breakEvenMonths, interestSaved);

  return {
    currentPayment: round(currentPayment),
    newPayment: round(newPayment),
    monthlySavings: round(monthlySavings),
    totalSavings: round(totalSavings),
    interestSaved: round(interestSaved),
    breakEvenMonths: isFinite(breakEvenMonths) ? breakEvenMonths : null,
    closingCosts: round(closingCosts),
    currentTotalInterest: round(currentTotalInterest),
    newTotalInterest: round(newTotalInterest),
    recommendation,
    html: formatRefinanceResult({
      currentPayment,
      newPayment,
      monthlySavings,
      totalSavings,
      interestSaved,
      breakEvenMonths,
      closingCosts,
      recommendation
    })
  };
}

/**
 * Calculate monthly payment using standard amortization formula
 * M = P * (r(1+r)^n) / ((1+r)^n - 1)
 */
function calculateMonthlyPayment(principal, annualRate, years) {
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;
  
  if (monthlyRate === 0) {
    return principal / numPayments;
  }
  
  return principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);
}

/**
 * Generate recommendation based on calculations
 */
function generateRecommendation(monthlySavings, breakEvenMonths, interestSaved) {
  if (monthlySavings <= 0) {
    return {
      text: 'Refinancing may not save you money with these rates.',
      type: 'negative',
      color: 'var(--error)'
    };
  }
  
  if (breakEvenMonths > 60) {
    return {
      text: 'Long break-even period. Consider if you\'ll stay in the home long enough.',
      type: 'warning',
      color: 'var(--warning)'
    };
  }
  
  if (interestSaved < 10000) {
    return {
      text: 'Modest savings. Consider if the hassle is worth it.',
      type: 'neutral',
      color: 'var(--text-secondary)'
    };
  }
  
  return {
    text: 'Great savings opportunity! Refinancing looks beneficial.',
    type: 'positive',
    color: 'var(--success)'
  };
}

/**
 * Format result as HTML
 */
function formatRefinanceResult(data) {
  const formatCurrency = (num) => {
    return `$${  Math.abs(num).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const savingsClass = data.monthlySavings > 0 ? 'positive' : 'negative';
  const totalSavingsClass = data.totalSavings > 0 ? 'positive' : 'negative';

  return `
    <div class="refinance-results">
      <div class="result-highlight ${data.recommendation.type}">
        <div class="result-label">Recommendation</div>
        <div class="recommendation-text" style="color: ${data.recommendation.color}; font-size: 1.125rem; font-weight: 500; margin-top: 0.5rem;">
          ${data.recommendation.text}
        </div>
      </div>

      <div class="result-grid">
        <div class="result-item">
          <div class="result-value">${formatCurrency(data.currentPayment)}</div>
          <div class="result-label">Current Payment</div>
        </div>
        <div class="result-item">
          <div class="result-value">${formatCurrency(data.newPayment)}</div>
          <div class="result-label">New Payment</div>
        </div>
        <div class="result-item ${savingsClass}">
          <div class="result-value">${formatCurrency(data.monthlySavings)}/mo</div>
          <div class="result-label">Monthly Savings</div>
        </div>
        <div class="result-item ${totalSavingsClass}">
          <div class="result-value">${formatCurrency(data.totalSavings)}</div>
          <div class="result-label">Total Savings</div>
        </div>
        <div class="result-item">
          <div class="result-value">${data.breakEvenMonths ? `${data.breakEvenMonths  } mo` : 'N/A'}</div>
          <div class="result-label">Break-Even</div>
        </div>
        <div class="result-item positive">
          <div class="result-value">${formatCurrency(data.interestSaved)}</div>
          <div class="result-label">Interest Saved</div>
        </div>
      </div>

      <div class="comparison-table" style="margin-top: 2rem; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-default);">
              <th style="text-align: left; padding: 0.75rem;">Metric</th>
              <th style="text-align: right; padding: 0.75rem;">Current Loan</th>
              <th style="text-align: right; padding: 0.75rem;">New Loan</th>
              <th style="text-align: right; padding: 0.75rem;">Difference</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--border-default);">
              <td style="padding: 0.75rem;">Monthly Payment</td>
              <td style="text-align: right; padding: 0.75rem;">${formatCurrency(data.currentPayment)}</td>
              <td style="text-align: right; padding: 0.75rem;">${formatCurrency(data.newPayment)}</td>
              <td style="text-align: right; padding: 0.75rem; color: ${data.monthlySavings > 0 ? 'var(--success)' : 'var(--error)'};">
                ${data.monthlySavings > 0 ? '-' : '+'}${formatCurrency(data.monthlySavings)}
              </td>
            </tr>
            <tr style="border-bottom: 1px solid var(--border-default);">
              <td style="padding: 0.75rem;">Total Interest</td>
              <td style="text-align: right; padding: 0.75rem;">${formatCurrency(data.currentTotalInterest || 0)}</td>
              <td style="text-align: right; padding: 0.75rem;">${formatCurrency(data.newTotalInterest || 0)}</td>
              <td style="text-align: right; padding: 0.75rem; color: var(--success);">
                -${formatCurrency(data.interestSaved)}
              </td>
            </tr>
            <tr>
              <td style="padding: 0.75rem;">Closing Costs</td>
              <td style="text-align: right; padding: 0.75rem;">—</td>
              <td style="text-align: right; padding: 0.75rem;">${formatCurrency(data.closingCosts)}</td>
              <td style="text-align: right; padding: 0.75rem; color: var(--error);">
                +${formatCurrency(data.closingCosts)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p style="margin-top:1.5rem;font-size:0.8125rem;color:#71717A;border-top:1px solid rgba(255,255,255,0.06);padding-top:1rem;">
        This tool provides estimates only, not financial or professional advice. Consult a licensed mortgage professional before making refinancing decisions.
      </p>
    </div>
  `;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

export default refinanceCalculator;
