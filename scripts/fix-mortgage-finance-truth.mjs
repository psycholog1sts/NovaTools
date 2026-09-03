import { readFileSync, writeFileSync } from 'node:fs';

const path = 'src/tools/finance/mortgage-refinance/index.html';
const write = process.argv.includes('--write');
const original = readFileSync(path, 'utf8');
let next = original;

const replacements = [
  [
    'Savings depend on your current rate, new rate, loan balance, and closing costs. A typical rule of thumb is that refinancing makes sense if you can reduce your interest rate by at least 0.5% to 1%. On a $300,000 loan, dropping from 6.5% to 5.5% could save you around $200 per month and over $70,000 in total interest over 30 years.',
    'Savings depend on the loan balance, current and proposed rates, remaining and new terms, closing costs, and any applicable tax or fund assumptions. There is no universal rate-drop threshold: enter the actual offer you are comparing and use the calculated payment and break-even result as a planning scenario, then verify the lender quote before deciding.'
  ],
  [
    'The best time to refinance is when interest rates are significantly lower than your current rate (typically 0.5% or more), you have good credit to qualify for the best rates, and you plan to stay in your home long enough to reach the break-even point. Also consider refinancing if you want to switch from an ARM to a fixed-rate mortgage or eliminate PMI.',
    'There is no universal best time to refinance. Compare the specific offer against your current balance, rate, remaining term, new term, closing costs, and any applicable KKDF/BSMV assumptions. A lower payment alone does not establish that refinancing is beneficial; review break-even time and total modeled cost, then verify the actual lender terms.'
  ],
  [
    'The calculator instantly computes your monthly savings, break-even point in months, and total interest savings over the life of the loan.',
    'The calculator computes the modeled monthly-payment difference, break-even point in months when applicable, and total modeled interest difference over the entered terms.'
  ]
];

for (const [from, to] of replacements) {
  if (!next.includes(from)) throw new Error(`Expected mortgage copy not found: ${from.slice(0, 80)}…`);
  next = next.replace(from, to);
}

if (next === original) {
  console.log('mortgage finance truth: no changes required');
} else if (write) {
  writeFileSync(path, next, 'utf8');
  console.log('mortgage finance truth: updated');
} else {
  console.log('mortgage finance truth: changes required');
  process.exitCode = 1;
}
