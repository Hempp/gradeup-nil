/**
 * Common validation utilities and shared schemas
 *
 * These utilities are used across all validation schemas to provide
 * consistent input sanitization and validation behavior.
 */

import { z } from 'zod';

/* ===============================================================================
   COMMON SCHEMAS
   =============================================================================== */

/**
 * UUID validation - validates standard UUID v4 format
 */
export const uuidSchema = z.string().uuid('Invalid ID format');

/**
 * Safe text - strips control characters and limits length
 */
export const safeText = (maxLength: number = 500) =>
  z.string()
    .max(maxLength, `Text must be ${maxLength} characters or less`)
    .transform((val) => val.replace(/[\x00-\x1F\x7F]/g, '').trim());

/**
 * Safe string that must not be empty after trimming
 */
export const requiredSafeText = (maxLength: number = 500) =>
  safeText(maxLength).refine((val) => val.length > 0, 'This field is required');

/**
 * Date schema that accepts both ISO datetime and YYYY-MM-DD formats
 */
export const dateSchema = z.string().datetime()
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

/**
 * Optional date schema that accepts both ISO datetime and YYYY-MM-DD formats
 */
export const optionalDateSchema = z.string().datetime().optional().nullable()
  .or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable());

/* ===============================================================================
   VALIDATION HELPER
   =============================================================================== */

/**
 * Validates input against a Zod schema and returns formatted error messages
 */
export function validateInput<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; errors: Record<string, string[]> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  // Format Zod errors into a user-friendly object
  const errors: Record<string, string[]> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || 'root';
    if (!errors[path]) {
      errors[path] = [];
    }
    errors[path].push(issue.message);
  }

  return { success: false, errors };
}

/**
 * Creates a formatted error response from Zod validation errors
 */
export function formatValidationError(errors: Record<string, string[]>): string {
  const messages = Object.entries(errors)
    .map(([field, msgs]) => `${field}: ${msgs.join(', ')}`)
    .join('; ');
  return `Validation failed: ${messages}`;
}
