import { describe, it, expect } from 'vitest';
import {
  CurrencySchema,
  PercentageSchema,
  MortgageInputSchema,
  validateInput
} from './schemas.mjs';

describe('Validation Schemas', () => {
  describe('CurrencySchema', () => {
    it('accepts valid positive numbers', () => {
      expect(CurrencySchema.parse(1000)).toBe(1000);
      expect(CurrencySchema.parse(0.01)).toBe(0.01);
      expect(CurrencySchema.parse(100000000)).toBe(100000000);
    });

    it('rejects negative numbers', () => {
      expect(() => CurrencySchema.parse(-100)).toThrow();
    });

    it('rejects zero', () => {
      expect(() => CurrencySchema.parse(0)).toThrow();
    });

    it('rejects too large amounts', () => {
      expect(() => CurrencySchema.parse(100000001)).toThrow();
    });
  });

  describe('PercentageSchema', () => {
    it('accepts valid percentages', () => {
      expect(PercentageSchema.parse(0)).toBe(0);
      expect(PercentageSchema.parse(50)).toBe(50);
      expect(PercentageSchema.parse(100)).toBe(100);
    });

    it('rejects negative percentages', () => {
      expect(() => PercentageSchema.parse(-1)).toThrow();
    });

    it('rejects percentages over 100', () => {
      expect(() => PercentageSchema.parse(101)).toThrow();
    });
  });

  describe('MortgageInputSchema', () => {
    it('accepts valid mortgage input', () => {
      const valid = {
        amount: 500000,
        annualRate: 15.5,
        term: 120,
        includeTaxes: true
      };
      
      const result = MortgageInputSchema.parse(valid);
      expect(result.amount).toBe(500000);
      expect(result.annualRate).toBe(15.5);
      expect(result.term).toBe(120);
      expect(result.includeTaxes).toBe(true);
    });

    it('uses default for includeTaxes', () => {
      const input = {
        amount: 500000,
        annualRate: 15.5,
        term: 120
      };
      
      const result = MortgageInputSchema.parse(input);
      expect(result.includeTaxes).toBe(true);
    });

    it('rejects invalid term', () => {
      const invalid = {
        amount: 500000,
        annualRate: 15.5,
        term: 400 // Too long
      };
      
      expect(() => MortgageInputSchema.parse(invalid)).toThrow();
    });
  });

  describe('validateInput helper', () => {
    it('returns valid result for correct input', () => {
      const input = { amount: 100000, annualRate: 10, term: 60 };
      const result = validateInput(MortgageInputSchema, input);
      
      expect(result.valid).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.errors).toBeNull();
    });

    it('returns invalid result with errors for bad input', () => {
      const input = { amount: -100, annualRate: 10, term: 60 };
      const result = validateInput(MortgageInputSchema, input);
      
      expect(result.valid).toBe(false);
      expect(result.data).toBeNull();
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
