/**
 * Zod Validation Schemas
 * Tree-shakeable validation for all tools
 */

import { z } from 'zod';

// Common schemas
export const CurrencySchema = z.number()
  .min(0.01, 'Amount must be greater than 0')
  .max(100000000, 'Amount too large');

export const PercentageSchema = z.number()
  .min(0, 'Rate cannot be negative')
  .max(100, 'Rate cannot exceed 100%');

export const MonthSchema = z.number()
  .int()
  .min(1)
  .max(360, 'Maximum 30 years (360 months)');

// Financial tool schemas
export const MortgageInputSchema = z.object({
  amount: CurrencySchema,
  annualRate: PercentageSchema,
  term: MonthSchema,
  includeTaxes: z.boolean().default(true)
});

export const CompoundInterestSchema = z.object({
  principal: CurrencySchema,
  annualRate: PercentageSchema,
  years: z.number().int().min(1).max(50),
  monthlyContribution: z.number().min(0).default(0)
});

// PDF tool schemas
export const PDFMergeSchema = z.object({
  files: z.array(z.instanceof(File))
    .min(2, 'At least 2 files required')
    .max(20, 'Maximum 20 files'),
  pageOrder: z.enum(['filename', 'date', 'custom']).default('filename'),
  outputFilename: z.string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9-_]+$/, 'Invalid filename')
    .default('merged')
});

// Image tool schemas
export const ImageCompressSchema = z.object({
  files: z.array(z.instanceof(File))
    .min(1)
    .max(50),
  format: z.enum(['webp', 'avif', 'jpeg', 'png']).default('webp'),
  quality: z.number().min(1).max(100).default(80),
  maxWidth: z.number().int().min(100).max(8000).optional(),
  maxHeight: z.number().int().min(100).max(8000).optional(),
  stripExif: z.boolean().default(true)
});

// Helper function for validation
export function validateInput(schema, data) {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { valid: true, data: result.data, errors: null };
  }
  
  const errors = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message
  }));
  
  return { valid: false, data: null, errors };
}

// Real-time validation helper
export function createValidator(schema, onSuccess, onError) {
  return (data) => {
    const result = validateInput(schema, data);
    
    if (result.valid) {
      onSuccess?.(result.data);
    } else {
      onError?.(result.errors);
    }
    
    return result;
  };
}
