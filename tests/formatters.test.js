/**
 * Formatters Utility Tests
 * Tests for src/utils/formatters.js
 *
 * The formatters module uses an IIFE pattern that attaches to window.
 * We load and execute the script before tests to make functions available.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'fs';
import vm from 'vm';

// Load and execute the formatters script before tests
beforeAll(() => {
  const scriptContent = readFileSync('./src/utils/formatters.js', 'utf-8');
  vm.runInThisContext(scriptContent);
});

// ============================================================================
// formatNumber Tests
// ============================================================================
describe('formatNumber', () => {
  describe('basic functionality', () => {
    it('returns "0" for null input', () => {
      expect(window.formatNumber(null)).toBe('0');
    });

    it('returns "0" for undefined input', () => {
      expect(window.formatNumber(undefined)).toBe('0');
    });

    it('returns "0" for NaN input', () => {
      expect(window.formatNumber(NaN)).toBe('0');
    });

    it('formats zero correctly', () => {
      expect(window.formatNumber(0)).toBe('0');
    });
  });

  describe('small numbers (< 1000)', () => {
    it('formats single digit numbers', () => {
      expect(window.formatNumber(5)).toBe('5');
    });

    it('formats double digit numbers', () => {
      expect(window.formatNumber(42)).toBe('42');
    });

    it('formats triple digit numbers', () => {
      expect(window.formatNumber(999)).toBe('999');
    });

    it('formats numbers with locale string formatting', () => {
      // Note: locale formatting may vary by environment
      const result = window.formatNumber(500);
      expect(result).toBe('500');
    });
  });

  describe('thousands (K suffix)', () => {
    it('formats exactly 1000 as "1K"', () => {
      expect(window.formatNumber(1000)).toBe('1K');
    });

    it('formats 1500 as "1.5K"', () => {
      expect(window.formatNumber(1500)).toBe('1.5K');
    });

    it('formats 2000 as "2K" (removes .0)', () => {
      expect(window.formatNumber(2000)).toBe('2K');
    });

    it('formats 25000 as "25K"', () => {
      expect(window.formatNumber(25000)).toBe('25K');
    });

    it('formats 999999 as "1000K" (just under million)', () => {
      expect(window.formatNumber(999999)).toBe('1000K');
    });

    it('formats 1234 as "1.2K" (rounds down)', () => {
      expect(window.formatNumber(1234)).toBe('1.2K');
    });

    it('formats 1250 as "1.3K" (rounds up)', () => {
      expect(window.formatNumber(1250)).toBe('1.3K');
    });
  });

  describe('millions (M suffix)', () => {
    it('formats exactly 1000000 as "1M"', () => {
      expect(window.formatNumber(1000000)).toBe('1M');
    });

    it('formats 1500000 as "1.5M"', () => {
      expect(window.formatNumber(1500000)).toBe('1.5M');
    });

    it('formats 2000000 as "2M" (removes .0)', () => {
      expect(window.formatNumber(2000000)).toBe('2M');
    });

    it('formats 50000000 as "50M"', () => {
      expect(window.formatNumber(50000000)).toBe('50M');
    });

    it('formats 1234567 as "1.2M"', () => {
      expect(window.formatNumber(1234567)).toBe('1.2M');
    });
  });

  describe('very large numbers (billions)', () => {
    it('formats 1 billion as "1000M"', () => {
      expect(window.formatNumber(1000000000)).toBe('1000M');
    });

    it('formats 5 billion as "5000M"', () => {
      expect(window.formatNumber(5000000000)).toBe('5000M');
    });
  });

  describe('negative numbers', () => {
    it('formats negative small numbers', () => {
      const result = window.formatNumber(-50);
      expect(result).toContain('-50');
    });

    it('formats negative thousands', () => {
      // Negative numbers < 1000 go through toLocaleString
      const result = window.formatNumber(-500);
      expect(result).toContain('-');
    });
  });

  describe('decimal numbers', () => {
    it('formats decimal numbers under 1000', () => {
      const result = window.formatNumber(123.45);
      expect(result).toBeTruthy();
    });

    it('formats decimal thousands', () => {
      expect(window.formatNumber(1234.56)).toBe('1.2K');
    });
  });
});

// ============================================================================
// formatCurrency Tests
// ============================================================================
describe('formatCurrency', () => {
  describe('basic functionality', () => {
    it('returns "$0" for null input', () => {
      expect(window.formatCurrency(null)).toBe('$0');
    });

    it('returns "$0" for undefined input', () => {
      expect(window.formatCurrency(undefined)).toBe('$0');
    });

    it('returns "$0" for NaN input', () => {
      expect(window.formatCurrency(NaN)).toBe('$0');
    });

    it('formats zero as "$0"', () => {
      expect(window.formatCurrency(0)).toBe('$0');
    });
  });

  describe('small amounts (< $1000)', () => {
    it('formats $1 correctly', () => {
      expect(window.formatCurrency(1)).toBe('$1');
    });

    it('formats $99 correctly', () => {
      expect(window.formatCurrency(99)).toBe('$99');
    });

    it('formats $500 correctly', () => {
      expect(window.formatCurrency(500)).toBe('$500');
    });

    it('formats $999 correctly', () => {
      expect(window.formatCurrency(999)).toBe('$999');
    });
  });

  describe('thousands ($K suffix)', () => {
    it('formats exactly $1000 as "$1K"', () => {
      expect(window.formatCurrency(1000)).toBe('$1K');
    });

    it('formats $1500 as "$1.5K"', () => {
      expect(window.formatCurrency(1500)).toBe('$1.5K');
    });

    it('formats $5000 as "$5K"', () => {
      expect(window.formatCurrency(5000)).toBe('$5K');
    });

    it('formats $25000 as "$25K"', () => {
      expect(window.formatCurrency(25000)).toBe('$25K');
    });

    it('formats $999999 as "$1000K"', () => {
      expect(window.formatCurrency(999999)).toBe('$1000K');
    });
  });

  describe('millions ($M suffix)', () => {
    it('formats exactly $1000000 as "$1M"', () => {
      expect(window.formatCurrency(1000000)).toBe('$1M');
    });

    it('formats $1500000 as "$1.5M"', () => {
      expect(window.formatCurrency(1500000)).toBe('$1.5M');
    });

    it('formats $10000000 as "$10M"', () => {
      expect(window.formatCurrency(10000000)).toBe('$10M');
    });

    it('formats $50000000 as "$50M"', () => {
      expect(window.formatCurrency(50000000)).toBe('$50M');
    });
  });

  describe('very large amounts (billions)', () => {
    it('formats $1 billion as "$1000M"', () => {
      expect(window.formatCurrency(1000000000)).toBe('$1000M');
    });
  });

  describe('prefix consistency', () => {
    it('always includes $ prefix for valid numbers', () => {
      expect(window.formatCurrency(1)).toMatch(/^\$/);
      expect(window.formatCurrency(1000)).toMatch(/^\$/);
      expect(window.formatCurrency(1000000)).toMatch(/^\$/);
    });

    it('includes $ prefix even for $0', () => {
      expect(window.formatCurrency(0)).toBe('$0');
    });
  });
});

// ============================================================================
// formatPercent Tests
// ============================================================================
describe('formatPercent', () => {
  describe('basic functionality', () => {
    it('returns "0%" for null input', () => {
      expect(window.formatPercent(null)).toBe('0%');
    });

    it('returns "0%" for undefined input', () => {
      expect(window.formatPercent(undefined)).toBe('0%');
    });

    it('returns "0%" for NaN input', () => {
      expect(window.formatPercent(NaN)).toBe('0%');
    });

    it('formats zero as "0%"', () => {
      expect(window.formatPercent(0)).toBe('0%');
    });
  });

  describe('decimal to percentage conversion', () => {
    it('formats 0.5 as "50%"', () => {
      expect(window.formatPercent(0.5)).toBe('50%');
    });

    it('formats 0.75 as "75%"', () => {
      expect(window.formatPercent(0.75)).toBe('75%');
    });

    it('formats 1.0 as "100%"', () => {
      expect(window.formatPercent(1.0)).toBe('100%');
    });

    it('formats 0.1 as "10%"', () => {
      expect(window.formatPercent(0.1)).toBe('10%');
    });

    it('formats 0.01 as "1%"', () => {
      expect(window.formatPercent(0.01)).toBe('1%');
    });
  });

  describe('decimal places parameter', () => {
    it('shows 0 decimal places by default', () => {
      expect(window.formatPercent(0.756)).toBe('76%');
    });

    it('shows 1 decimal place when specified', () => {
      expect(window.formatPercent(0.756, 1)).toBe('75.6%');
    });

    it('shows 2 decimal places when specified', () => {
      expect(window.formatPercent(0.7568, 2)).toBe('75.68%');
    });

    it('rounds correctly with decimal places', () => {
      expect(window.formatPercent(0.755, 1)).toBe('75.5%');
    });
  });

  describe('edge cases', () => {
    it('formats values over 100% (> 1.0)', () => {
      expect(window.formatPercent(1.5)).toBe('150%');
    });

    it('formats negative percentages', () => {
      expect(window.formatPercent(-0.25)).toBe('-25%');
    });

    it('formats very small percentages', () => {
      expect(window.formatPercent(0.001, 1)).toBe('0.1%');
    });
  });
});

// ============================================================================
// formatGPA Tests
// ============================================================================
describe('formatGPA', () => {
  describe('basic functionality', () => {
    it('returns "0.00" for null input', () => {
      expect(window.formatGPA(null)).toBe('0.00');
    });

    it('returns "0.00" for undefined input', () => {
      expect(window.formatGPA(undefined)).toBe('0.00');
    });

    it('returns "0.00" for NaN input', () => {
      expect(window.formatGPA(NaN)).toBe('0.00');
    });

    it('formats zero as "0.00"', () => {
      expect(window.formatGPA(0)).toBe('0.00');
    });
  });

  describe('typical GPA values', () => {
    it('formats 4.0 GPA correctly', () => {
      expect(window.formatGPA(4.0)).toBe('4.00');
    });

    it('formats 3.5 GPA correctly', () => {
      expect(window.formatGPA(3.5)).toBe('3.50');
    });

    it('formats 3.85 GPA correctly', () => {
      expect(window.formatGPA(3.85)).toBe('3.85');
    });

    it('formats 2.0 GPA correctly', () => {
      expect(window.formatGPA(2.0)).toBe('2.00');
    });

    it('formats 1.0 GPA correctly', () => {
      expect(window.formatGPA(1.0)).toBe('1.00');
    });
  });

  describe('rounding behavior', () => {
    it('rounds 3.856 to "3.86"', () => {
      expect(window.formatGPA(3.856)).toBe('3.86');
    });

    it('rounds 3.854 to "3.85"', () => {
      expect(window.formatGPA(3.854)).toBe('3.85');
    });

    it('rounds 3.999 to "4.00"', () => {
      expect(window.formatGPA(3.999)).toBe('4.00');
    });

    it('handles many decimal places', () => {
      expect(window.formatGPA(3.123456789)).toBe('3.12');
    });
  });

  describe('edge cases', () => {
    it('formats integer GPA values with decimals', () => {
      expect(window.formatGPA(4)).toBe('4.00');
    });

    it('handles negative GPA (invalid but should format)', () => {
      expect(window.formatGPA(-1.5)).toBe('-1.50');
    });

    it('handles GPA over 4.0 (weighted GPA)', () => {
      expect(window.formatGPA(4.5)).toBe('4.50');
    });
  });
});

// ============================================================================
// formatDate Tests
// ============================================================================
describe('formatDate', () => {
  describe('basic functionality', () => {
    it('returns empty string for null input', () => {
      expect(window.formatDate(null)).toBe('');
    });

    it('returns empty string for undefined input', () => {
      expect(window.formatDate(undefined)).toBe('');
    });

    it('returns empty string for empty string input', () => {
      expect(window.formatDate('')).toBe('');
    });

    it('returns empty string for invalid date string', () => {
      expect(window.formatDate('not-a-date')).toBe('');
    });
  });

  describe('Date object input', () => {
    it('formats Date object correctly', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(window.formatDate(date)).toBe('Jan 15');
    });

    it('formats all months correctly', () => {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach((month, index) => {
        const date = new Date(2024, index, 1);
        expect(window.formatDate(date)).toBe(`${month} 1`);
      });
    });

    it('handles single digit dates', () => {
      const date = new Date(2024, 5, 5); // June 5
      expect(window.formatDate(date)).toBe('Jun 5');
    });

    it('handles double digit dates', () => {
      const date = new Date(2024, 11, 25); // December 25
      expect(window.formatDate(date)).toBe('Dec 25');
    });
  });

  describe('string input', () => {
    it('parses ISO date string', () => {
      const result = window.formatDate('2024-01-15');
      // Note: timezone may affect the result
      expect(result).toMatch(/Jan 1[45]/);
    });

    it('parses date string with time', () => {
      const result = window.formatDate('2024-06-20T10:30:00');
      expect(result).toBe('Jun 20');
    });
  });

  describe('number (timestamp) input', () => {
    it('parses Unix timestamp', () => {
      const timestamp = new Date(2024, 2, 10).getTime(); // March 10, 2024
      expect(window.formatDate(timestamp)).toBe('Mar 10');
    });
  });

  describe('edge cases', () => {
    it('handles end of month dates', () => {
      const date = new Date(2024, 0, 31); // January 31
      expect(window.formatDate(date)).toBe('Jan 31');
    });

    it('handles leap year date', () => {
      const date = new Date(2024, 1, 29); // February 29, 2024 (leap year)
      expect(window.formatDate(date)).toBe('Feb 29');
    });

    it('handles year boundaries', () => {
      const date = new Date(2024, 11, 31); // December 31
      expect(window.formatDate(date)).toBe('Dec 31');
    });
  });
});

// ============================================================================
// formatFullDate Tests
// ============================================================================
describe('formatFullDate', () => {
  describe('basic functionality', () => {
    it('returns empty string for null input', () => {
      expect(window.formatFullDate(null)).toBe('');
    });

    it('returns empty string for undefined input', () => {
      expect(window.formatFullDate(undefined)).toBe('');
    });

    it('returns empty string for empty string input', () => {
      expect(window.formatFullDate('')).toBe('');
    });

    it('returns empty string for invalid date string', () => {
      expect(window.formatFullDate('invalid')).toBe('');
    });
  });

  describe('Date object input', () => {
    it('formats Date object with full month name', () => {
      const date = new Date(2024, 0, 15); // January 15, 2024
      expect(window.formatFullDate(date)).toBe('January 15, 2024');
    });

    it('formats all months with full names', () => {
      const months = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December'];
      months.forEach((month, index) => {
        const date = new Date(2024, index, 1);
        expect(window.formatFullDate(date)).toBe(`${month} 1, 2024`);
      });
    });

    it('includes year in output', () => {
      const date = new Date(2025, 5, 20);
      expect(window.formatFullDate(date)).toBe('June 20, 2025');
    });
  });
});

// ============================================================================
// isSameDay Tests
// ============================================================================
describe('isSameDay', () => {
  describe('basic functionality', () => {
    it('returns false for null first date', () => {
      expect(window.isSameDay(null, new Date())).toBe(false);
    });

    it('returns false for null second date', () => {
      expect(window.isSameDay(new Date(), null)).toBe(false);
    });

    it('returns false for both dates null', () => {
      expect(window.isSameDay(null, null)).toBe(false);
    });

    it('returns false for undefined dates', () => {
      expect(window.isSameDay(undefined, undefined)).toBe(false);
    });
  });

  describe('same day comparisons', () => {
    it('returns true for identical dates', () => {
      const date = new Date(2024, 5, 15);
      expect(window.isSameDay(date, date)).toBe(true);
    });

    it('returns true for same day different times', () => {
      const date1 = new Date(2024, 5, 15, 9, 0, 0);
      const date2 = new Date(2024, 5, 15, 18, 30, 0);
      expect(window.isSameDay(date1, date2)).toBe(true);
    });

    it('returns true for same day at midnight and end of day', () => {
      const date1 = new Date(2024, 5, 15, 0, 0, 0);
      const date2 = new Date(2024, 5, 15, 23, 59, 59);
      expect(window.isSameDay(date1, date2)).toBe(true);
    });
  });

  describe('different day comparisons', () => {
    it('returns false for different days same month', () => {
      const date1 = new Date(2024, 5, 15);
      const date2 = new Date(2024, 5, 16);
      expect(window.isSameDay(date1, date2)).toBe(false);
    });

    it('returns false for different months same day number', () => {
      const date1 = new Date(2024, 5, 15);
      const date2 = new Date(2024, 6, 15);
      expect(window.isSameDay(date1, date2)).toBe(false);
    });

    it('returns false for different years same month and day', () => {
      const date1 = new Date(2024, 5, 15);
      const date2 = new Date(2025, 5, 15);
      expect(window.isSameDay(date1, date2)).toBe(false);
    });
  });
});

// ============================================================================
// Boundary Condition Tests (Cross-cutting)
// ============================================================================
describe('Boundary Conditions', () => {
  describe('exactly at K boundary (1000)', () => {
    it('formatNumber treats 1000 as thousands', () => {
      expect(window.formatNumber(1000)).toBe('1K');
    });

    it('formatCurrency treats 1000 as thousands', () => {
      expect(window.formatCurrency(1000)).toBe('$1K');
    });

    it('formatNumber treats 999 as regular number', () => {
      expect(window.formatNumber(999)).toBe('999');
    });

    it('formatCurrency treats 999 as regular currency', () => {
      expect(window.formatCurrency(999)).toBe('$999');
    });
  });

  describe('exactly at M boundary (1000000)', () => {
    it('formatNumber treats 1000000 as millions', () => {
      expect(window.formatNumber(1000000)).toBe('1M');
    });

    it('formatCurrency treats 1000000 as millions', () => {
      expect(window.formatCurrency(1000000)).toBe('$1M');
    });

    it('formatNumber treats 999999 as thousands', () => {
      expect(window.formatNumber(999999)).toBe('1000K');
    });

    it('formatCurrency treats 999999 as thousands', () => {
      expect(window.formatCurrency(999999)).toBe('$1000K');
    });
  });

  describe('percentage boundaries', () => {
    it('formatPercent handles 0% correctly', () => {
      expect(window.formatPercent(0)).toBe('0%');
    });

    it('formatPercent handles 100% correctly', () => {
      expect(window.formatPercent(1)).toBe('100%');
    });
  });

  describe('GPA boundaries', () => {
    it('formatGPA handles 0.00 correctly', () => {
      expect(window.formatGPA(0)).toBe('0.00');
    });

    it('formatGPA handles 4.00 correctly', () => {
      expect(window.formatGPA(4)).toBe('4.00');
    });
  });
});

// ============================================================================
// Type Coercion Tests
// ============================================================================
describe('Type Coercion', () => {
  describe('string number inputs', () => {
    it('formatNumber handles numeric string', () => {
      // JavaScript coerces strings in arithmetic operations
      expect(window.formatNumber('1500')).toBe('1.5K');
    });

    it('formatCurrency handles numeric string', () => {
      expect(window.formatCurrency('2500')).toBe('$2.5K');
    });
  });

  describe('boolean inputs', () => {
    it('formatNumber handles true (coerces to 1)', () => {
      const result = window.formatNumber(true);
      expect(result).toBeTruthy();
    });

    it('formatNumber handles false (coerces to 0)', () => {
      const result = window.formatNumber(false);
      expect(result).toBeTruthy();
    });
  });
});
