/**
 * Tests for common validation utilities
 * @module __tests__/lib/validations/common.test
 */

import { z } from 'zod';
import {
  uuidSchema,
  safeText,
  requiredSafeText,
  dateSchema,
  optionalDateSchema,
  validateInput,
  formatValidationError,
} from '@/lib/validations/common';

describe('uuidSchema', () => {
  it('accepts valid UUID v4', () => {
    const validUUIDs = [
      '550e8400-e29b-41d4-a716-446655440000',
      'f47ac10b-58cc-4372-a567-0e02b2c3d479',
      '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    ];

    validUUIDs.forEach((uuid) => {
      const result = uuidSchema.safeParse(uuid);
      expect(result.success).toBe(true);
    });
  });

  it('rejects invalid UUID formats', () => {
    const invalidUUIDs = [
      'not-a-uuid',
      '550e8400-e29b-41d4-a716',
      '550e8400e29b41d4a716446655440000',
      '',
      '12345',
    ];

    invalidUUIDs.forEach((uuid) => {
      const result = uuidSchema.safeParse(uuid);
      expect(result.success).toBe(false);
    });
  });

  it('returns proper error message for invalid UUID', () => {
    const result = uuidSchema.safeParse('invalid');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('Invalid ID format');
    }
  });
});

describe('safeText', () => {
  it('accepts valid text within max length', () => {
    const schema = safeText(100);
    const result = schema.safeParse('Hello World');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('Hello World');
    }
  });

  it('trims whitespace', () => {
    const schema = safeText(100);
    const result = schema.safeParse('  Hello World  ');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('Hello World');
    }
  });

  it('strips control characters', () => {
    const schema = safeText(100);
    const result = schema.safeParse('Hello\x00\x1FWorld');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe('HelloWorld');
    }
  });

  it('rejects text exceeding max length', () => {
    const schema = safeText(10);
    const result = schema.safeParse('This is too long');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('10 characters or less');
    }
  });

  it('uses default max length of 500', () => {
    const schema = safeText();
    const longText = 'a'.repeat(501);
    const result = schema.safeParse(longText);
    expect(result.success).toBe(false);
  });
});

describe('requiredSafeText', () => {
  it('accepts non-empty text', () => {
    const schema = requiredSafeText(100);
    const result = schema.safeParse('Hello');
    expect(result.success).toBe(true);
  });

  it('rejects empty string', () => {
    const schema = requiredSafeText(100);
    const result = schema.safeParse('');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('This field is required');
    }
  });

  it('rejects whitespace-only string', () => {
    const schema = requiredSafeText(100);
    const result = schema.safeParse('   ');
    expect(result.success).toBe(false);
  });

  it('rejects control-character-only string', () => {
    const schema = requiredSafeText(100);
    const result = schema.safeParse('\x00\x1F');
    expect(result.success).toBe(false);
  });
});

describe('dateSchema', () => {
  it('accepts ISO datetime format', () => {
    const result = dateSchema.safeParse('2024-01-15T10:30:00Z');
    expect(result.success).toBe(true);
  });

  it('accepts YYYY-MM-DD format', () => {
    const result = dateSchema.safeParse('2024-01-15');
    expect(result.success).toBe(true);
  });

  it('rejects invalid date formats', () => {
    const invalidDates = [
      '01-15-2024',
      '2024/01/15',
      'January 15, 2024',
      'not a date',
    ];

    invalidDates.forEach((date) => {
      const result = dateSchema.safeParse(date);
      expect(result.success).toBe(false);
    });
  });
});

describe('optionalDateSchema', () => {
  it('accepts null', () => {
    const result = optionalDateSchema.safeParse(null);
    expect(result.success).toBe(true);
  });

  it('accepts undefined', () => {
    const result = optionalDateSchema.safeParse(undefined);
    expect(result.success).toBe(true);
  });

  it('accepts valid ISO datetime', () => {
    const result = optionalDateSchema.safeParse('2024-01-15T10:30:00Z');
    expect(result.success).toBe(true);
  });

  it('accepts YYYY-MM-DD format', () => {
    const result = optionalDateSchema.safeParse('2024-01-15');
    expect(result.success).toBe(true);
  });
});

describe('validateInput', () => {
  const testSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    age: z.number().min(0, 'Age must be positive'),
  });

  it('returns success with valid data', () => {
    const result = validateInput(testSchema, { name: 'John', age: 25 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ name: 'John', age: 25 });
    }
  });

  it('returns errors for invalid data', () => {
    const result = validateInput(testSchema, { name: 'J', age: -1 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.name).toContain('Name must be at least 2 characters');
      expect(result.errors.age).toContain('Age must be positive');
    }
  });

  it('handles missing fields', () => {
    const result = validateInput(testSchema, {});
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.name).toBeDefined();
      expect(result.errors.age).toBeDefined();
    }
  });

  it('groups multiple errors for same field', () => {
    const strictSchema = z.object({
      email: z.string().email('Invalid email').min(10, 'Email too short'),
    });

    const result = validateInput(strictSchema, { email: 'ab' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.email.length).toBeGreaterThanOrEqual(1);
    }
  });
});

describe('formatValidationError', () => {
  it('formats single field error', () => {
    const errors = { name: ['Name is required'] };
    const result = formatValidationError(errors);
    expect(result).toBe('Validation failed: name: Name is required');
  });

  it('formats multiple field errors', () => {
    const errors = {
      name: ['Name is required'],
      email: ['Invalid email'],
    };
    const result = formatValidationError(errors);
    expect(result).toContain('name: Name is required');
    expect(result).toContain('email: Invalid email');
    expect(result).toContain('Validation failed:');
  });

  it('formats multiple errors for same field', () => {
    const errors = {
      password: ['Too short', 'Must contain number'],
    };
    const result = formatValidationError(errors);
    expect(result).toBe('Validation failed: password: Too short, Must contain number');
  });

  it('handles empty errors object', () => {
    const result = formatValidationError({});
    expect(result).toBe('Validation failed: ');
  });
});
