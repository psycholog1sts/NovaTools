/**
 * Tool Validation Test Suite
 * Verifies all tools produce correct calculations
 */

import { mortgageCalculator } from '../src/tools/finance/mortgage.mjs';
import { refinanceCalculator } from '../src/tools/finance/mortgage-refinance.mjs';
import { compoundInterestCalculator } from '../src/tools/finance/compound.mjs';
import { cloudCostCalculator } from '../src/tools/finance/cloud-cost.mjs';

// Test utilities
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
};

const assertClose = (actual, expected, tolerance, message) => {
  const diff = Math.abs(actual - expected);
  if (diff > tolerance) {
    throw new Error(`ASSERTION FAILED: ${message}\n  Expected: ${expected}\n  Actual: ${actual}\n  Diff: ${diff}`);
  }
};

// Test runner
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('\n=================================');
    console.log('  TOOL VALIDATION TEST SUITE');
    console.log('=================================\n');

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        console.log(`  ✓ ${name}`);
        this.passed++;
      } catch (error) {
        console.log(`  ✗ ${name}`);
        console.log(`    ${error.message}`);
        this.failed++;
      }
    }

    console.log('\n---------------------------------');
    console.log(`  PASSED: ${this.passed}`);
    console.log(`  FAILED: ${this.failed}`);
    console.log(`  TOTAL:  ${this.tests.length}`);
    console.log('---------------------------------');

    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

const runner = new TestRunner();

// ==========================================
// MORTGAGE CALCULATOR TESTS
// ==========================================

runner.test('Mortgage: $200k / 5% / 30y = $1,073.64', () => {
  const result = mortgageCalculator({
    principal: 200000,
    rate: 5,
    years: 30,
    downPayment: 0
  });
  assertClose(result.monthlyPayment, 1073.64, 0.01, 'Monthly payment mismatch');
});

runner.test('Mortgage: $500k / 4% / 15y', () => {
  const result = mortgageCalculator({
    principal: 500000,
    rate: 4,
    years: 15,
    downPayment: 0
  });
  assertClose(result.monthlyPayment, 3698.44, 0.01, 'Monthly payment mismatch');
});

runner.test('Mortgage: With $50k down payment', () => {
  const result = mortgageCalculator({
    principal: 300000,
    rate: 5,
    years: 30,
    downPayment: 50000
  });
  assertClose(result.principal, 250000, 0.01, 'Principal after down payment');
});

// ==========================================
// REFINANCE CALCULATOR TESTS
// ==========================================

runner.test('Refinance: Basic savings calculation', () => {
  const result = refinanceCalculator({
    balance: 300000,
    currentRate: 6.5,
    yearsRemaining: 25,
    newRate: 4.5,
    newTerm: 30,
    closingCosts: 5000
  });
  assert(result.monthlySavings > 0, 'Should have positive monthly savings');
  assert(result.breakEvenMonths > 0, 'Should have break-even point');
  assert(result.breakEvenMonths < 100, 'Break-even should be reasonable');
});

runner.test('Refinance: No savings when new rate is higher', () => {
  const result = refinanceCalculator({
    balance: 200000,
    currentRate: 3,
    yearsRemaining: 25,
    newRate: 5,
    newTerm: 30,
    closingCosts: 3000
  });
  assert(result.monthlySavings < 0, 'Should have negative savings with higher rate');
  assert(result.recommendation.type === 'negative', 'Should have negative recommendation');
});


runner.test('Refinance: Turkey KKDF/BSMV are included in payment and schedule', () => {
  const withTaxes = refinanceCalculator({
    balance: 1000000,
    currentRate: 36,
    yearsRemaining: 10,
    newRate: 30,
    newTerm: 10,
    closingCosts: 0,
    kkdfRate: 15,
    bsmvRate: 5
  });

  const withoutTaxes = refinanceCalculator({
    balance: 1000000,
    currentRate: 36,
    yearsRemaining: 10,
    newRate: 30,
    newTerm: 10,
    closingCosts: 0,
    kkdfRate: 0,
    bsmvRate: 0
  });

  assert(withTaxes.newPayment > withoutTaxes.newPayment, 'KKDF/BSMV should increase tax-adjusted installment');
  assert(withTaxes.newSchedule.length === 120, '10-year amortization should produce 120 rows');
  assert(withTaxes.newSchedule[0].kkdf > 0 && withTaxes.newSchedule[0].bsmv > 0, 'Schedule should expose KKDF and BSMV rows');
});

// ==========================================
// COMPOUND INTEREST TESTS
// ==========================================

runner.test('Compound: $10k / 7% / 10y = ~$19,672', () => {
  const result = compoundInterestCalculator({
    principal: 10000,
    rate: 7,
    years: 10,
    monthlyContribution: 0,
    compoundFrequency: 'annually'
  });
  assertClose(result.finalAmount, 19671.51, 1, 'Final amount mismatch');
});

runner.test('Compound: Monthly contributions increase total', () => {
  const resultNoContrib = compoundInterestCalculator({
    principal: 10000,
    rate: 7,
    years: 10,
    monthlyContribution: 0,
    compoundFrequency: 'monthly'
  });
  
  const resultWithContrib = compoundInterestCalculator({
    principal: 10000,
    rate: 7,
    years: 10,
    monthlyContribution: 500,
    compoundFrequency: 'monthly'
  });
  
  assert(resultWithContrib.finalAmount > resultNoContrib.finalAmount, 
    'With contributions should be higher');
});


runner.test('Compound: Frequency changes final amount', () => {
  const annual = compoundInterestCalculator({
    principal: 10000,
    rate: 7,
    years: 10,
    monthlyContribution: 0,
    compoundFrequency: 'annually'
  });
  const monthly = compoundInterestCalculator({
    principal: 10000,
    rate: 7,
    years: 10,
    monthlyContribution: 0,
    compoundFrequency: 'monthly'
  });
  const daily = compoundInterestCalculator({
    principal: 10000,
    rate: 7,
    years: 10,
    monthlyContribution: 0,
    compoundFrequency: 'daily'
  });

  assert(annual.finalAmount < monthly.finalAmount, 'Monthly compounding should exceed annual compounding');
  assert(monthly.finalAmount < daily.finalAmount, 'Daily compounding should exceed monthly compounding');
});

// ==========================================
// CLOUD COST TESTS
// ==========================================

runner.test('Cloud Cost: AWS 4 vCPU / 16GB / 100GB', () => {
  const result = cloudCostCalculator({
    provider: 'aws',
    vcpus: 4,
    memory: 16,
    storage: 100,
    hoursPerMonth: 730
  });
  assert(result.totalMonthly > 0, 'Should have positive monthly cost');
  assert(result.totalYearly > result.totalMonthly, 'Yearly should be > monthly');
});

runner.test('Cloud Cost: Different providers give different prices', () => {
  const aws = cloudCostCalculator({
    provider: 'aws',
    vcpus: 4,
    memory: 16,
    storage: 100,
    hoursPerMonth: 730
  });
  
  const gcp = cloudCostCalculator({
    provider: 'gcp',
    vcpus: 4,
    memory: 16,
    storage: 100,
    hoursPerMonth: 730
  });
  
  assert(aws.totalMonthly !== gcp.totalMonthly, 'Different providers should differ');
});

// Run tests
runner.run();
