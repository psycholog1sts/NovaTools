/**
 * Mortgage Refinance Calculator
 * Calculates refinance savings and break-even analysis.
 * Optional KKDF and BSMV assumptions are applied to the periodic interest rate so the
 * installment, totals, table, and chart all use the same audited formula.
 */

import { numberLocale, strings } from './finance-i18n.mjs';

const DEFAULT_KKDF_RATE = 0;
const DEFAULT_BSMV_RATE = 0;
const MAX_TERM_YEARS = 30;
const MAX_SCHEDULE_ROWS = 360;

const T = {
  en: {
    balance: 'The loan balance must be greater than 0.',
    rates: 'Interest rates must be greater than 0.',
    term: (max) => `Terms must be between 1 and ${max} years.`,
    costs: 'Closing costs cannot be negative.',
    taxes: 'KKDF and BSMV rates must be between 0 and 100.',
    recNegative: 'On these terms, refinancing may not lower your total cost.',
    recLong: 'The break-even period is long. Consider whether you will keep the loan long enough.',
    recPositive: 'On these estimates, refinancing looks worthwhile.',
    assessment: 'Assessment',
    currentPayment: 'Current monthly payment',
    newPayment: 'New monthly payment',
    perMonth: '/mo',
    monthlyDiff: 'Monthly difference',
    totalSavings: 'Estimated total savings',
    months: (n) => `${n} months`,
    none: 'None',
    breakEven: 'Break-even period',
    interestDiff: 'Interest + tax difference',
    metric: 'Metric',
    currentLoan: 'Current loan',
    newLoan: 'New loan',
    difference: 'Difference',
    monthlyRow: 'Monthly payment',
    totalRow: 'Total repayment',
    inFormula: 'Included in formula',
    chartTitle: 'Remaining balance',
    chartLabel: 'Remaining balance by month for both loans',
    scheduleTitle: 'New loan amortization schedule (first 24 months)',
    scheduleHead: ['Month', 'Payment', 'Principal', 'Interest', 'KKDF', 'BSMV', 'Balance'],
    disclaimer: '⚠️ These figures are estimates. Confirm the exact terms with your lender or a qualified adviser.',
    currency: 'USD'
  },
  tr: {
    balance: 'Kredi tutarı 0’dan büyük olmalıdır.',
    rates: 'Faiz oranları 0’dan büyük olmalıdır.',
    term: (max) => `Vade 1 ile ${max} yıl arasında olmalıdır.`,
    costs: 'Masraflar negatif olamaz.',
    taxes: 'KKDF ve BSMV oranları 0 ile 100 arasında olmalıdır.',
    recNegative: 'Bu koşullarda refinansman toplam maliyeti düşürmeyebilir.',
    recLong: 'Başabaş süresi uzun. Krediyi yeterince uzun tutup tutmayacağınızı değerlendirin.',
    recPositive: 'Refinansman tahmini olarak avantajlı görünüyor.',
    assessment: 'Değerlendirme',
    currentPayment: 'Mevcut Aylık Taksit',
    newPayment: 'Yeni Aylık Taksit',
    perMonth: '/ay',
    monthlyDiff: 'Aylık Fark',
    totalSavings: 'Toplam Tahmini Tasarruf',
    months: (n) => `${n} ay`,
    none: 'Yok',
    breakEven: 'Başabaş Süresi',
    interestDiff: 'Faiz + Vergi Farkı',
    metric: 'Metrik',
    currentLoan: 'Mevcut Kredi',
    newLoan: 'Yeni Kredi',
    difference: 'Fark',
    monthlyRow: 'Aylık taksit',
    totalRow: 'Toplam geri ödeme',
    inFormula: 'Formüle dahil',
    chartTitle: 'Kalan Borç Grafiği',
    chartLabel: 'Kalan borç ödeme planı grafiği',
    scheduleTitle: 'Yeni Kredi Amortisman Tablosu (ilk 24 ay)',
    scheduleHead: ['Ay', 'Taksit', 'Anapara', 'Faiz', 'KKDF', 'BSMV', 'Kalan Borç'],
    disclaimer: '⚠️ Yasal Uyarı: Bu hesaplamalar tahmini değerlerdir. Kesin bilgi için yetkili bir mali müşavir, banka veya kuruma danışın.',
    currency: 'TRY'
  }
};

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
  // Number inputs hand over plain dot-decimal strings ("3500.75"); only Turkish-formatted text
  // such as "1.250.000,50" uses dots as thousands separators.
  const plain = String(value ?? '').trim();
  if (/^-?\d+(\.\d+)?$/.test(plain)) return Number.parseFloat(plain);
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
  const t = strings(T);
  if (balance <= 0) throw new Error(t.balance);
  if (currentRate <= 0 || newRate <= 0) throw new Error(t.rates);
  if (yearsRemaining < 1 || yearsRemaining > MAX_TERM_YEARS || newTerm < 1 || newTerm > MAX_TERM_YEARS) {
    throw new Error(t.term(MAX_TERM_YEARS));
  }
  if (closingCosts < 0) throw new Error(t.costs);
  if (kkdfRate < 0 || bsmvRate < 0 || kkdfRate > 100 || bsmvRate > 100) {
    throw new Error(t.taxes);
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
  const t = strings(T);
  if (monthlySavings <= 0 || totalSavings <= 0) {
    return {
      text: t.recNegative,
      type: 'negative',
      color: 'var(--error)'
    };
  }

  if (breakEvenMonths > 60) {
    return {
      text: t.recLong,
      type: 'warning',
      color: 'var(--warning)'
    };
  }

  return {
    text: t.recPositive,
    type: 'positive',
    color: 'var(--success)'
  };
}

/**
 * Format result as HTML
 */
function formatRefinanceResult(data) {
  const t = strings(T);
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
        <div class="result-label">${t.assessment}</div>
        <div class="recommendation-text" style="color: ${data.recommendation.color}; font-size: 1.125rem; font-weight: 500; margin-top: 0.5rem;">
          ${data.recommendation.text}
        </div>
      </div>

      <div class="result-grid">
        <div class="result-item">
          <div class="result-value">${formatCurrency(data.currentPayment)}</div>
          <div class="result-label">${t.currentPayment}</div>
        </div>
        <div class="result-item">
          <div class="result-value">${formatCurrency(data.newPayment)}</div>
          <div class="result-label">${t.newPayment}</div>
        </div>
        <div class="result-item ${savingsClass}">
          <div class="result-value">${formatCurrency(data.monthlySavings)}${t.perMonth}</div>
          <div class="result-label">${t.monthlyDiff}</div>
        </div>
        <div class="result-item ${totalSavingsClass}">
          <div class="result-value">${formatCurrency(data.totalSavings)}</div>
          <div class="result-label">${t.totalSavings}</div>
        </div>
        <div class="result-item">
          <div class="result-value">${data.breakEvenMonths ? t.months(data.breakEvenMonths) : t.none}</div>
          <div class="result-label">${t.breakEven}</div>
        </div>
        <div class="result-item positive">
          <div class="result-value">${formatCurrency(data.interestSaved)}</div>
          <div class="result-label">${t.interestDiff}</div>
        </div>
      </div>

      <div class="comparison-table" style="margin-top: 2rem; overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <table style="width: 100%; min-width: 680px; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-default);">
              <th style="text-align: left; padding: 0.75rem;">${t.metric}</th>
              <th style="text-align: right; padding: 0.75rem;">${t.currentLoan}</th>
              <th style="text-align: right; padding: 0.75rem;">${t.newLoan}</th>
              <th style="text-align: right; padding: 0.75rem;">${t.difference}</th>
            </tr>
          </thead>
          <tbody>
            <tr style="border-bottom: 1px solid var(--border-default);">
              <td style="padding: 0.75rem;">${t.monthlyRow}</td>
              <td style="text-align: right; padding: 0.75rem;">${formatCurrency(data.currentPayment)}</td>
              <td style="text-align: right; padding: 0.75rem;">${formatCurrency(data.newPayment)}</td>
              <td style="text-align: right; padding: 0.75rem; color: ${data.monthlySavings > 0 ? 'var(--success)' : 'var(--error)'};">${formatCurrency(data.monthlySavings)}</td>
            </tr>
            <tr style="border-bottom: 1px solid var(--border-default);">
              <td style="padding: 0.75rem;">${t.totalRow}</td>
              <td style="text-align: right; padding: 0.75rem;">${formatCurrency(data.currentTotalPayment)}</td>
              <td style="text-align: right; padding: 0.75rem;">${formatCurrency(data.newTotalPayment + data.closingCosts)}</td>
              <td style="text-align: right; padding: 0.75rem; color: ${data.totalSavings > 0 ? 'var(--success)' : 'var(--error)'};">${formatCurrency(data.totalSavings)}</td>
            </tr>
            <tr>
              <td style="padding: 0.75rem;">KKDF / BSMV</td>
              <td style="text-align: right; padding: 0.75rem;">%${data.kkdfRate} / %${data.bsmvRate}</td>
              <td style="text-align: right; padding: 0.75rem;">%${data.kkdfRate} / %${data.bsmvRate}</td>
              <td style="text-align: right; padding: 0.75rem;">${t.inFormula}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="chart-container" style="margin-top: 2rem;">
        <h3 style="font-size: 1rem; margin-bottom: 0.75rem;">${t.chartTitle}</h3>
        <canvas id="mortgageScheduleChart" width="760" height="260" data-chart='${JSON.stringify(data.chartData)}' aria-label="${t.chartLabel}" role="img"></canvas>
      </div>

      <div class="comparison-table" style="margin-top: 2rem; overflow-x: auto; -webkit-overflow-scrolling: touch;">
        <h3 style="font-size: 1rem; margin-bottom: 0.75rem;">${t.scheduleTitle}</h3>
        <table style="width: 100%; min-width: 760px; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-default);">
              ${t.scheduleHead.map((head) => `<th>${head}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <p style="margin-top:1.5rem;font-size:0.8125rem;color:#71717A;border-top:1px solid rgba(255,255,255,0.06);padding-top:1rem;">
        ${t.disclaimer}
      </p>
    </div>
  `;
}

function formatCurrency(num) {
  const sign = num < 0 ? '-' : '';
  return `${sign}${new Intl.NumberFormat(numberLocale(), {
    style: 'currency',
    currency: strings(T).currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(Math.abs(num))}`;
}

function round(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export default refinanceCalculator;
