/**
 * Finance Tools Registration
 * All financial calculators registered with the tool controller
 */

// Import individual tool implementations
import { mortgageCalculator } from './mortgage.mjs';
import { refinanceCalculator } from './mortgage-refinance.mjs';
import { compoundInterestCalculator } from './compound.mjs';
import { cryptoTaxCalculator } from './crypto-tax.mjs';
import { cloudCostCalculator } from './cloud-cost.mjs';
import { currencyConverter } from './currency.mjs';

/**
 * Register all finance tools
 * @param {ToolController} controller - Tool controller instance
 */
export function registerFinanceTools(controller) {
  
  // Mortgage Calculator
  controller.registerTool('mortgage-calculator', {
    name: 'Mortgage Calculator',
    description: 'Calculate monthly mortgage payments with detailed amortization',
    category: 'finance',
    icon: '🏠',
    inputs: [
      {
        name: 'principal',
        type: 'number',
        label: 'Loan Amount',
        required: true,
        min: 1000,
        max: 100000000,
        placeholder: '200000'
      },
      {
        name: 'rate',
        type: 'number',
        label: 'Interest Rate (%)',
        required: true,
        min: 0.01,
        max: 100,
        step: 0.01,
        placeholder: '5.0'
      },
      {
        name: 'years',
        type: 'integer',
        label: 'Loan Term (Years)',
        required: true,
        min: 1,
        max: 50,
        placeholder: '30'
      },
      {
        name: 'downPayment',
        type: 'number',
        label: 'Down Payment',
        required: false,
        min: 0,
        default: 0
      }
    ],
    outputs: [
      { name: 'monthlyPayment', type: 'currency' },
      { name: 'totalInterest', type: 'currency' },
      { name: 'totalCost', type: 'currency' },
      { name: 'amortization', type: 'array' }
    ]
  }, mortgageCalculator);

  // Compound Interest Calculator
  controller.registerTool('compound-interest', {
    name: 'Compound Interest Calculator',
    description: 'Calculate compound interest growth over time',
    category: 'finance',
    icon: '📈',
    inputs: [
      {
        name: 'principal',
        type: 'number',
        label: 'Initial Investment',
        required: true,
        min: 0,
        placeholder: '10000'
      },
      {
        name: 'rate',
        type: 'number',
        label: 'Annual Interest Rate (%)',
        required: true,
        min: 0,
        max: 100,
        placeholder: '7'
      },
      {
        name: 'years',
        type: 'integer',
        label: 'Time Period (Years)',
        required: true,
        min: 1,
        max: 100,
        placeholder: '10'
      },
      {
        name: 'monthlyContribution',
        type: 'number',
        label: 'Monthly Contribution',
        required: false,
        min: 0,
        default: 0
      },
      {
        name: 'compoundFrequency',
        type: 'select',
        label: 'Compound Frequency',
        required: true,
        options: ['daily', 'monthly', 'quarterly', 'annually'],
        default: 'monthly'
      }
    ],
    outputs: [
      { name: 'finalAmount', type: 'currency' },
      { name: 'totalInterest', type: 'currency' },
      { name: 'totalContributions', type: 'currency' },
      { name: 'yearlyBreakdown', type: 'array' }
    ]
  }, compoundInterestCalculator);

  // Crypto Tax Calculator
  controller.registerTool('crypto-tax', {
    name: 'Crypto Tax Calculator',
    description: 'Calculate cryptocurrency taxes with FIFO/LIFO methods',
    category: 'finance',
    icon: '₿',
    inputs: [
      {
        name: 'purchases',
        type: 'array',
        label: 'Purchase History',
        required: true,
        minItems: 1
      },
      {
        name: 'sales',
        type: 'array',
        label: 'Sale History',
        required: true,
        minItems: 1
      },
      {
        name: 'method',
        type: 'select',
        label: 'Accounting Method',
        required: true,
        options: ['FIFO', 'LIFO'],
        default: 'FIFO'
      },
      {
        name: 'taxRate',
        type: 'percentage',
        label: 'Tax Rate (%)',
        required: true,
        min: 0,
        max: 100,
        default: 20
      }
    ],
    outputs: [
      { name: 'totalGains', type: 'currency' },
      { name: 'totalLosses', type: 'currency' },
      { name: 'netGain', type: 'currency' },
      { name: 'estimatedTax', type: 'currency' },
      { name: 'transactions', type: 'array' }
    ]
  }, cryptoTaxCalculator);

  // Cloud Cost Calculator
  controller.registerTool('cloud-cost', {
    name: 'Cloud Cost Calculator',
    description: 'Estimate cloud infrastructure costs',
    category: 'finance',
    icon: '☁️',
    inputs: [
      {
        name: 'provider',
        type: 'select',
        label: 'Cloud Provider',
        required: true,
        options: ['aws', 'azure', 'gcp']
      },
      {
        name: 'vcpus',
        type: 'integer',
        label: 'vCPUs',
        required: true,
        min: 1,
        max: 128,
        placeholder: '4'
      },
      {
        name: 'memory',
        type: 'integer',
        label: 'Memory (GB)',
        required: true,
        min: 1,
        max: 1024,
        placeholder: '16'
      },
      {
        name: 'storage',
        type: 'integer',
        label: 'Storage (GB)',
        required: true,
        min: 10,
        max: 10000,
        placeholder: '100'
      },
      {
        name: 'hoursPerMonth',
        type: 'integer',
        label: 'Hours per Month',
        required: true,
        min: 1,
        max: 730,
        default: 730
      }
    ],
    outputs: [
      { name: 'computeCost', type: 'currency' },
      { name: 'storageCost', type: 'currency' },
      { name: 'totalMonthly', type: 'currency' },
      { name: 'totalYearly', type: 'currency' }
    ]
  }, cloudCostCalculator);

  // Currency Converter
  controller.registerTool('currency-converter', {
    name: 'Currency Converter',
    description: 'Convert between currencies with live rates',
    category: 'finance',
    icon: '💱',
    inputs: [
      {
        name: 'amount',
        type: 'number',
        label: 'Amount',
        required: true,
        min: 0,
        placeholder: '100'
      },
      {
        name: 'from',
        type: 'currency',
        label: 'From Currency',
        required: true,
        default: 'USD'
      },
      {
        name: 'to',
        type: 'currency',
        label: 'To Currency',
        required: true,
        default: 'EUR'
      }
    ],
    outputs: [
      { name: 'convertedAmount', type: 'currency' },
      { name: 'rate', type: 'number' },
      { name: 'inverseRate', type: 'number' }
    ]
  }, currencyConverter);

  // Mortgage Refinance Calculator
  controller.registerTool('mortgage-refinance', {
    name: 'Mortgage Refinance Calculator',
    description: 'Calculate refinance savings and break-even analysis',
    category: 'finance',
    icon: '🏦',
    inputs: [
      {
        name: 'balance',
        type: 'number',
        label: 'Current Balance',
        required: true,
        min: 1000,
        max: 10000000,
        placeholder: '300000'
      },
      {
        name: 'currentRate',
        type: 'number',
        label: 'Current Interest Rate (%)',
        required: true,
        min: 0.01,
        max: 20,
        step: 0.01,
        placeholder: '6.5'
      },
      {
        name: 'yearsRemaining',
        type: 'integer',
        label: 'Years Remaining',
        required: true,
        min: 1,
        max: 30,
        placeholder: '25'
      },
      {
        name: 'newRate',
        type: 'number',
        label: 'New Interest Rate (%)',
        required: true,
        min: 0.01,
        max: 20,
        step: 0.01,
        placeholder: '4.5'
      },
      {
        name: 'newTerm',
        type: 'integer',
        label: 'New Loan Term (Years)',
        required: true,
        min: 1,
        max: 30,
        placeholder: '30'
      },
      {
        name: 'closingCosts',
        type: 'number',
        label: 'Closing Costs',
        required: false,
        min: 0,
        default: 5000,
        placeholder: '5000'
      }
    ],
    outputs: [
      { name: 'monthlySavings', type: 'currency' },
      { name: 'totalSavings', type: 'currency' },
      { name: 'interestSaved', type: 'currency' },
      { name: 'breakEvenMonths', type: 'integer' },
      { name: 'recommendation', type: 'object' }
    ]
  }, refinanceCalculator);

  // Finance tools registered successfully
}

export default registerFinanceTools;
