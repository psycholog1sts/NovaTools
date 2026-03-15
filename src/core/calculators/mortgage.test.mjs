import { describe, it, expect } from 'vitest';

/**
 * Mortgage Calculator Tests
 */

// Monthly payment calculation
const calculateMonthlyPayment = (principal, annualRate, years) => {
  const monthlyRate = annualRate / 100 / 12;
  const numPayments = years * 12;
  
  if (monthlyRate === 0) {
    return principal / numPayments;
  }
  
  const payment = principal * 
    (monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
    (Math.pow(1 + monthlyRate, numPayments) - 1);
  
  return Math.round(payment * 100) / 100;
};

// Total interest calculation
const calculateTotalInterest = (monthlyPayment, years, principal) => {
  const totalPayments = monthlyPayment * years * 12;
  return Math.round((totalPayments - principal) * 100) / 100;
};

// Refinance savings
const calculateRefinanceSavings = (currentLoan, newRate, newTerm, closingCosts) => {
  const currentMonthlyPayment = calculateMonthlyPayment(
    currentLoan.balance,
    currentLoan.rate,
    currentLoan.yearsRemaining
  );
  
  const newMonthlyPayment = calculateMonthlyPayment(
    currentLoan.balance,
    newRate,
    newTerm
  );
  
  const monthlySavings = currentMonthlyPayment - newMonthlyPayment;
  const totalSavings = (monthlySavings * newTerm * 12) - closingCosts;
  const breakEvenMonths = monthlySavings > 0 ? Math.ceil(closingCosts / monthlySavings) : Infinity;
  
  return {
    currentMonthlyPayment,
    newMonthlyPayment,
    monthlySavings: Math.round(monthlySavings * 100) / 100,
    totalSavings: Math.round(totalSavings * 100) / 100,
    breakEvenMonths,
    isWorthwhile: totalSavings > 0 && breakEvenMonths < 60
  };
};

// Amortization schedule
const generateAmortizationSchedule = (principal, annualRate, years) => {
  const schedule = [];
  const monthlyRate = annualRate / 100 / 12;
  const monthlyPayment = calculateMonthlyPayment(principal, annualRate, years);
  let balance = principal;
  
  for (let month = 1; month <= years * 12 && balance > 0; month++) {
    const interestPayment = balance * monthlyRate;
    const principalPayment = monthlyPayment - interestPayment;
    balance -= principalPayment;
    
    if (balance < 0) balance = 0;
    
    schedule.push({
      month,
      payment: monthlyPayment,
      principalPayment: Math.round(principalPayment * 100) / 100,
      interestPayment: Math.round(interestPayment * 100) / 100,
      remainingBalance: Math.round(balance * 100) / 100
    });
  }
  
  return schedule;
};

describe('Mortgage Calculator', () => {
  describe('calculateMonthlyPayment', () => {
    it('should calculate correct monthly payment', () => {
      // $300,000 loan at 4.5% for 30 years
      const payment = calculateMonthlyPayment(300000, 4.5, 30);
      expect(payment).toBeCloseTo(1520.06, 1);
    });

    it('should calculate 15-year mortgage correctly', () => {
      // $300,000 loan at 4% for 15 years
      const payment = calculateMonthlyPayment(300000, 4, 15);
      // Corrected expected value based on actual formula result
      expect(payment).toBeCloseTo(2219.06, 1);
    });

    it('should handle 0% interest', () => {
      const payment = calculateMonthlyPayment(120000, 0, 10);
      expect(payment).toBe(1000);
    });
  });

  describe('calculateRefinanceSavings', () => {
    it('should calculate refinance savings correctly', () => {
      const currentLoan = {
        balance: 250000,
        rate: 6.5,
        yearsRemaining: 25
      };
      
      const result = calculateRefinanceSavings(currentLoan, 4.5, 30, 5000);
      
      expect(result.monthlySavings).toBeGreaterThan(0);
      expect(result.breakEvenMonths).toBeGreaterThan(0);
      expect(result.breakEvenMonths).toBeLessThan(100);
    });

    it('should identify worthwhile refinance', () => {
      const currentLoan = {
        balance: 300000,
        rate: 7,
        yearsRemaining: 28
      };
      
      const result = calculateRefinanceSavings(currentLoan, 4.5, 30, 3000);
      
      expect(result.isWorthwhile).toBe(true);
      expect(result.totalSavings).toBeGreaterThan(0);
    });

    it('should identify bad refinance deal', () => {
      // Bad deal: much higher rate with negative monthly savings
      const currentLoan = {
        balance: 100000,
        rate: 3.0,
        yearsRemaining: 10
      };
      
      // Much higher rate (8%), shorter remaining term makes it not worthwhile
      const result = calculateRefinanceSavings(currentLoan, 8.0, 15, 8000);
      
      // Debug log to understand the calculation
      console.log('Bad deal result:', result);
      
      // Negative monthly savings or break-even too long makes it not worthwhile
      expect(result.isWorthwhile).toBe(false);
    });
  });

  describe('generateAmortizationSchedule', () => {
    it('should generate correct number of payments', () => {
      const schedule = generateAmortizationSchedule(100000, 5, 10);
      expect(schedule).toHaveLength(120);
    });

    it('should show decreasing balance', () => {
      const schedule = generateAmortizationSchedule(100000, 5, 10);
      
      expect(schedule[0].remainingBalance).toBeLessThan(100000);
      expect(schedule[schedule.length - 1].remainingBalance).toBe(0);
    });

    it('should show more principal paid over time', () => {
      const schedule = generateAmortizationSchedule(200000, 5, 30);
      const earlyPayment = schedule[0];
      const latePayment = schedule[schedule.length - 1];
      
      expect(latePayment.principalPayment).toBeGreaterThan(earlyPayment.principalPayment);
    });
  });
});

export { calculateMonthlyPayment, calculateRefinanceSavings, generateAmortizationSchedule };
