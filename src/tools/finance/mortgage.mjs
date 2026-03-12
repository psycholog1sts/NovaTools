/**
 * Mortgage Calculator
 * Calculates monthly payments with full amortization schedule
 * 
 * Verification: $200,000 / 5% / 30 years = $1,073.64 monthly
 */

/**
 * Calculate mortgage details
 * @param {Object} inputs - Calculator inputs
 * @returns {Object} Calculation results
 */
export function mortgageCalculator(inputs) {
  const principal = parseFloat(inputs.principal) - (parseFloat(inputs.downPayment) || 0);
  const annualRate = parseFloat(inputs.rate) / 100;
  const monthlyRate = annualRate / 12;
  const numPayments = parseInt(inputs.years) * 12;

  // Calculate monthly payment: M = P * (r(1+r)^n) / ((1+r)^n - 1)
  const monthlyPayment = principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);

  const totalCost = monthlyPayment * numPayments;
  const totalInterest = totalCost - principal;

  // Generate amortization schedule
  const schedule = generateAmortization(principal, monthlyRate, numPayments, monthlyPayment);

  return {
    monthlyPayment: round(monthlyPayment),
    totalInterest: round(totalInterest),
    totalCost: round(totalCost),
    principal: round(principal),
    numPayments,
    amortization: schedule,
    html: formatMortgageResult({
      monthlyPayment,
      totalInterest,
      totalCost,
      principal,
      schedule
    })
  };
}

/**
 * Generate amortization schedule
 */
function generateAmortization(principal, monthlyRate, numPayments, monthlyPayment) {
  const schedule = [];
  let balance = principal;
  let yearInterest = 0;
  let yearPrincipal = 0;
  let currentYear = 1;

  for (let i = 1; i <= numPayments; i++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;

    yearInterest += interestPayment;
    yearPrincipal += principalPayment;

    const isYearEnd = i % 12 === 0 || i === numPayments;

    if (isYearEnd) {
      schedule.push({
        year: currentYear,
        interest: round(yearInterest),
        principal: round(yearPrincipal),
        balance: round(Math.max(0, balance))
      });
      yearInterest = 0;
      yearPrincipal = 0;
      currentYear++;
    }
  }

  return schedule;
}

/**
 * Format result as HTML
 */
function formatMortgageResult(data) {
  return `
    <div class="mortgage-results">
      <div class="result-highlight">
        <div class="result-big">$${data.monthlyPayment.toLocaleString(undefined, {maximumFractionDigits: 2})}</div>
        <div class="result-label">Monthly Payment</div>
      </div>
      
      <div class="result-grid">
        <div class="result-card">
          <span class="result-value">$${data.totalCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
          <span class="result-label">Total Cost</span>
        </div>
        <div class="result-card">
          <span class="result-value">$${data.totalInterest.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
          <span class="result-label">Total Interest</span>
        </div>
        <div class="result-card">
          <span class="result-value">$${data.principal.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
          <span class="result-label">Loan Amount</span>
        </div>
      </div>

      <div class="amortization-table">
        <h4>Amortization Schedule</h4>
        <table>
          <thead>
            <tr>
              <th>Year</th>
              <th>Interest</th>
              <th>Principal</th>
              <th>Remaining</th>
            </tr>
          </thead>
          <tbody>
            ${data.schedule.map(row => `
              <tr>
                <td>${row.year}</td>
                <td>$${row.interest.toLocaleString()}</td>
                <td>$${row.principal.toLocaleString()}</td>
                <td>$${row.balance.toLocaleString()}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function round(n) {
  return Math.round(n * 100) / 100;
}

export default mortgageCalculator;
