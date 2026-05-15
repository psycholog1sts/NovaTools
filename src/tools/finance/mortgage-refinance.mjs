/**
 * Mortgage Refinance Calculator
 * Calculates refinance savings and break-even analysis.
 * Turkey mode applies KKDF and BSMV to the periodic interest rate so the
 * installment, totals, table, and chart all use the same audited formula.
 */

const DEFAULT_KKDF_RATE = 15;
const DEFAULT_BSMV_RATE = 5;
const MAX_TERM_YEARS = 30;
const MAX_SCHEDULE_ROWS = 360;

/**
 * Calculate refinance analysis
 * @param {Object} inputs - Calculator inputs
 * @returns {Object} Calculation results
 */
export function refinanceCalculator(inputs) {
  const balance = parseMoneyInput(inputs.balance);
  const currentRate = parsePercent(inputs.currentRate);
  const yearsRemaining = parseInteger(inputs.yearsRemaining);
  const newRate = parsePercent(inputs.newRate);
  const newTerm = parseInteger(inputs.newTerm);
  const closingCosts = parseMoneyInput(inputs.closingCosts || 0);
  const kkdfRate = parsePercent(inputs.kkdfRate ?? DEFAULT_KKDF_RATE);
  const bsmvRate = parsePercent(inputs.bsmvRate ?? DEFAULT_BSMV_RATE);

  validateInputs({ balance, currentRate, yearsRemaining, newRate, newTerm, closingCosts, kkdfRate, bsmvRate });

  const currentLoan = calculateLoan(balance, currentRate, yearsRemaining, kkdfRate, bsmvRate);
  const newLoan = calculateLoan(balance, newRate, newTerm, kkdfRate, bsmvRate);
  const monthlySavings = currentLoan.monthlyPayment - newLoan.monthlyPayment;
  const totalSavings = currentLoan.totalPayment - (newLoan.totalPayment + closingCosts);
  const interestSaved = currentLoan.totalInterestAndTax - newLoan.totalInterestAndTax;
  const breakEvenMonths = monthlySavings > 0 ? Math.ceil(closingCosts / monthlySavings) : Infinity;
  const recommendation = generateRecommendation(monthlySavings, breakEvenMonths, totalSavings);

  const result = {
    currentPayment: round(currentLoan.monthlyPayment),
    newPayment: round(newLoan.monthlyPayment),
    monthlySavings: round(monthlySavings),
    totalSavings: round(totalSavings),
    interestSaved: round(interestSaved),
    breakEvenMonths: isFinite(breakEvenMonths) ? breakEvenMonths : null,
    closingCosts: round(closingCosts),
    currentTotalPayment: round(currentLoan.totalPayment),
    newTotalPayment: round(newLoan.totalPayment),
    currentTotalInterest: round(currentLoan.totalInterestAndTax),
    newTotalInterest: round(newLoan.totalInterestAndTax),
    kkdfRate,
    bsmvRate,
    currentSchedule: currentLoan.schedule,
    newSchedule: newLoan.schedule,
    chartData: buildChartData(currentLoan.schedule, newLoan.schedule),
    recommendation
  };

  return {
    ...result,
    html: formatRefinanceResult(result)
  };
}

export function parseMoneyInput(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  const normalized = String(value ?? '')
    .trim()
    .replace(/\s/g, '')
    .replace(/₺|TRY|TL/gi, '')
    .replace(/\./g, '')
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

function validateInputs({ balance, currentRate, yearsRemaining, newRate, newTerm, closingCosts, kkdfRate, bsmvRate }) {
  if (balance <= 0) throw new Error('Kredi tutarı 0’dan büyük olmalıdır.');
  if (currentRate <= 0 || newRate <= 0) throw new Error('Faiz oranları 0’dan büyük olmalıdır.');
  if (yearsRemaining < 1 || yearsRemaining > MAX_TERM_YEARS || newTerm < 1 || newTerm > MAX_TERM_YEARS) {
    throw new Error(`Vade 1 ile ${MAX_TERM_YEARS} yıl arasında olmalıdır.`);
  }
  if (closingCosts < 0) throw new Error('Masraflar negatif olamaz.');
  if (kkdfRate < 0 || bsmvRate < 0 || kkdfRate > 100 || bsmvRate > 100) {
    throw new Error('KKDF ve BSMV oranları 0 ile 100 arasında olmalıdır.');
  }
}

function calculateLoan(principal, annualRate, years, kkdfRate, bsmvRate) {
  const months = years * 12;
  const baseMonthlyRate = annualRate / 100 / 12;
  const effectiveMonthlyRate = baseMonthlyRate * (1 + (kkdfRate + bsmvRate) / 100);
  const monthlyPayment = calculateMonthlyPayment(principal, effectiveMonthlyRate, months);
  const schedule = generateAmortizationSchedule(principal, baseMonthlyRate, kkdfRate, bsmvRate, monthlyPayment, months);
  const totalPayment = monthlyPayment * months;
  const totalPrincipal = schedule.reduce((sum, row) => sum + row.principalPayment, 0);
  const totalInterestAndTax = totalPayment - totalPrincipal;

  return {
    monthlyPayment,
    totalPayment,
    totalInterestAndTax,
    schedule
  };
}

/**
 * Monthly payment using amortization formula with the tax-adjusted periodic rate:
 * M = P * (r(1+r)^n) / ((1+r)^n - 1)
 */
function calculateMonthlyPayment(principal, monthlyRate, numPayments) {
  if (monthlyRate === 0) return principal / numPayments;
  const factor = Math.pow(1 + monthlyRate, numPayments);
  return principal * ((monthlyRate * factor) / (factor - 1));
}

function generateAmortizationSchedule(principal, baseMonthlyRate, kkdfRate, bsmvRate, monthlyPayment, months) {
  let remainingBalance = principal;
  const rows = [];

  for (let month = 1; month <= months && month <= MAX_SCHEDULE_ROWS; month++) {
    const interestBase = remainingBalance * baseMonthlyRate;
    const kkdf = interestBase * (kkdfRate / 100);
    const bsmv = interestBase * (bsmvRate / 100);
    const totalInterestAndTax = interestBase + kkdf + bsmv;
    const principalPayment = Math.min(monthlyPayment - totalInterestAndTax, remainingBalance);
    remainingBalance = Math.max(0, remainingBalance - principalPayment);

    rows.push({
      month,
      payment: round(monthlyPayment),
      principalPayment: round(principalPayment),
      interest: round(interestBase),
      kkdf: round(kkdf),
      bsmv: round(bsmv),
      remainingBalance: round(remainingBalance)
    });

    if (remainingBalance <= 0) break;
  }

  return rows;
}

function buildChartData(currentSchedule, newSchedule) {
  const months = Math.max(currentSchedule.length, newSchedule.length);
  const step = Math.max(1, Math.ceil(months / 24));
  const points = [];

  for (let index = 0; index < months; index += step) {
    const current = currentSchedule[Math.min(index, currentSchedule.length - 1)];
    const next = newSchedule[Math.min(index, newSchedule.length - 1)];
    points.push({
      month: index + 1,
      currentBalance: current ? current.remainingBalance : 0,
      newBalance: next ? next.remainingBalance : 0
    });
  }

  return points;
}

/**
 * Generate recommendation based on calculations
 */
function generateRecommendation(monthlySavings, breakEvenMonths, totalSavings) {
  if (monthlySavings <= 0 || totalSavings <= 0) {
    return {
      text: 'Bu koşullarda refinansman toplam maliyeti düşürmeyebilir.',
      type: 'negative',
      color: 'var(--error)'
    };
  }

  if (breakEvenMonths > 60) {
    return {
      text: 'Başabaş süresi uzun. Krediyi yeterince uzun tutup tutmayacağınızı değerlendirin.',
      type: 'warning',
      color: 'var(--warning)'
    };
  }

  return {
    text: 'Refinansman tahmini olarak avantajlı görünüyor.',
    type: 'positive',
    color: 'var(--success)'
  };
}

/**
 * Format result as HTML
 */
function formatRefinanceResult(data) {
  const savingsClass = data.monthlySavings > 0 ? 'positive' : 'negative';
  const totalSavingsClass = data.totalSavings > 0 ? 'positive' : 'negative';
  const rows = data.newSchedule.slice(0, 24).map((row) => `
    <tr>
      <td>${row.month}</td>
      <td>${formatCurrency(row.payment)}</td>
      <td>${formatCurrency(row.principalPayment)}</td>
      <td>${formatCurrency(row.interest)}</td>
      <td>${formatCurrency(row.kkdf)}</td>
      <td>${formatCurrency(row.bsmv)}</td>
      <td>${formatCurrency(row.remainingBalance)}</td>
    </tr>
  `).join('');

  return `
    <div class="refinance-results">
      <div class="result-highlight ${data.recommendation.type}">
        <div class="result-label">Değerlendirme</div>
        <div class="recommendation-text" style="color: ${data.recommendation.color}; font-size: 1.125rem; font-weight: 500; margin-top: 0.5rem;">
          ${data.recommendation.text}
        </div>
      </div>

      <div class="result-grid">
        <div class="result-item">
          <div class="result-value">${formatCurrency(data.currentPayment)}</div>
          <div class="result-label">Mevcut Aylık Taksit</div>
        </div>
        <div class="result-item">
          <div class="result-value">${formatCurrency(data.newPayment)}</div>
          <div class="result-label">Yeni Aylık Taksit</div>
        </div>
        <div class="result-item ${savingsClass}">
          <div class="result-value">${formatCurrency(data.monthlySavings)}/ay</div>
          <div class="result-label">Aylık Fark</div>
        </div>
        <div class="result-item ${totalSavingsClass}">
          <div class="result-value">${formatCurrency(data.totalSavings)}</div>
          <div class="result-label">Toplam Tahmini Tasarruf</div>
        </div>
        <div class="result-item">
          <div class="result-value">${data.breakEvenMonths ? `${data.breakEvenMonths} ay` : 'Yok'}</div>
          <div class="result-label">Başabaş Süresi</div>
        </div>
        <div class="result-item positive">
          <div class="result-value">${formatCurrency(data.interestSaved)}</div>
          <div class="result-label">Faiz + Vergi Farkı</div>
        </div>
      </div>

      <div class="comparison-table" style="margin-top: 2rem; overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <table style="width: 100%; min-width: 680px; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-default);">
              <th style="text-align: left; padding: 0.75rem;">Metrik</th>
              <th style="text-align: right; padding: 0.75rem;">Mevcut Kredi</th>
              <th style="text-align: right; padding: 0.75rem;">Yeni Kredi</th>
              <th style="text-align: right; padding: 0.75rem;">Fark</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--border-default);">
              <td style="padding: 0.75rem;">Aylık taksit</td>
              <td style="text-align: right; padding: 0.75rem;">${formatCurrency(data.currentPayment)}</td>
              <td style="text-align: right; padding: 0.75rem;">${formatCurrency(data.newPayment)}</td>
              <td style="text-align: right; padding: 0.75rem; color: ${data.monthlySavings > 0 ? 'var(--success)' : 'var(--error)'};">${formatCurrency(data.monthlySavings)}</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--border-default);">
              <td style="padding: 0.75rem;">Toplam geri ödeme</td>
              <td style="text-align: right; padding: 0.75rem;">${formatCurrency(data.currentTotalPayment)}</td>
              <td style="text-align: right; padding: 0.75rem;">${formatCurrency(data.newTotalPayment + data.closingCosts)}</td>
              <td style="text-align: right; padding: 0.75rem; color: ${data.totalSavings > 0 ? 'var(--success)' : 'var(--error)'};">${formatCurrency(data.totalSavings)}</td>
            </tr>
            <tr>
              <td style="padding: 0.75rem;">KKDF / BSMV</td>
              <td style="text-align: right; padding: 0.75rem;">%${data.kkdfRate} / %${data.bsmvRate}</td>
              <td style="text-align: right; padding: 0.75rem;">%${data.kkdfRate} / %${data.bsmvRate}</td>
              <td style="text-align: right; padding: 0.75rem;">Formüle dahil</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="chart-container" style="margin-top: 2rem;">
        <h3 style="font-size: 1rem; margin-bottom: 0.75rem;">Kalan Borç Grafiği</h3>
        <canvas id="mortgageScheduleChart" width="760" height="260" data-chart='${JSON.stringify(data.chartData)}' aria-label="Kalan borç ödeme planı grafiği" role="img"></canvas>
      </div>

      <div class="comparison-table" style="margin-top: 2rem; overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <h3 style="font-size: 1rem; margin-bottom: 0.75rem;">Yeni Kredi Amortisman Tablosu (ilk 24 ay)</h3>
        <table style="width: 100%; min-width: 760px; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-default);">
              <th>Ay</th><th>Taksit</th><th>Anapara</th><th>Faiz</th><th>KKDF</th><th>BSMV</th><th>Kalan Borç</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <p style="margin-top:1.5rem;font-size:0.8125rem;color:#71717A;border-top:1px solid rgba(255,255,255,0.06);padding-top:1rem;">
        ⚠️ Yasal Uyarı: Bu hesaplamalar tahmini değerlerdir. Kesin bilgi için yetkili bir mali müşavir, banka veya kuruma danışın.
      </p>
    </div>
  `;
}

function formatCurrency(num) {
  const sign = num < 0 ? '-' : '';
  return `${sign}${new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(num))}`;
}

function round(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export default refinanceCalculator;
