/**
 * Tests for the format utility functions
 * @module __tests__/lib/utils/format.test
 */

import {
  formatCurrency,
  formatCompactNumber,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  formatGPA,
  formatPercentage,
} from '@/lib/utils/format';

describe('format utilities', () => {
  describe('formatCurrency', () => {
    it('formats positive amounts correctly', () => {
      expect(formatCurrency(1000)).toBe('$1,000');
      expect(formatCurrency(5000)).toBe('$5,000');
      expect(formatCurrency(100000)).toBe('$100,000');
    });

    it('formats zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0');
    });

    it('formats large amounts correctly', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000');
      expect(formatCurrency(50000000)).toBe('$50,000,000');
    });

    it('formats small amounts without decimals', () => {
      expect(formatCurrency(99)).toBe('$99');
      expect(formatCurrency(1)).toBe('$1');
    });

    it('rounds decimal amounts', () => {
      expect(formatCurrency(1000.50)).toBe('$1,001');
      expect(formatCurrency(1000.49)).toBe('$1,000');
    });
  });

  describe('formatCompactNumber', () => {
    it('returns the number as string for small values', () => {
      expect(formatCompactNumber(0)).toBe('0');
      expect(formatCompactNumber(100)).toBe('100');
      expect(formatCompactNumber(999)).toBe('999');
    });

    it('formats thousands with K suffix', () => {
      expect(formatCompactNumber(1000)).toBe('1.0K');
      expect(formatCompactNumber(5500)).toBe('5.5K');
      expect(formatCompactNumber(10000)).toBe('10.0K');
      expect(formatCompactNumber(999999)).toBe('1000.0K');
    });

    it('formats millions with M suffix', () => {
      expect(formatCompactNumber(1000000)).toBe('1.0M');
      expect(formatCompactNumber(2500000)).toBe('2.5M');
      expect(formatCompactNumber(100000000)).toBe('100.0M');
    });
  });

  describe('formatDate', () => {
    it('formats ISO date string correctly', () => {
      const result = formatDate('2024-03-15');
      expect(result).toBe('Mar 15, 2024');
    });

    it('formats Date object correctly', () => {
      const date = new Date(2024, 2, 15); // March 15, 2024
      const result = formatDate(date);
      expect(result).toBe('Mar 15, 2024');
    });

    it('formats ISO datetime string correctly', () => {
      const result = formatDate('2024-12-25T10:30:00Z');
      expect(result).toMatch(/Dec 25, 2024/);
    });
  });

  describe('formatDateTime', () => {
    it('formats ISO datetime string with time', () => {
      const result = formatDateTime('2024-03-15T14:30:00');
      expect(result).toMatch(/Mar 15, 2024/);
      expect(result).toMatch(/\d+:\d+ [AP]M/);
    });

    it('formats Date object with time', () => {
      const date = new Date(2024, 2, 15, 14, 30); // March 15, 2024 2:30 PM
      const result = formatDateTime(date);
      expect(result).toMatch(/Mar 15, 2024/);
      expect(result).toMatch(/2:30 PM/);
    });
  });

  describe('formatRelativeTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-03-15T12:00:00Z'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('formats recent times', () => {
      const oneHourAgo = '2024-03-15T11:00:00Z';
      const result = formatRelativeTime(oneHourAgo);
      expect(result).toMatch(/hour ago|1 hour ago|about 1 hour ago/i);
    });

    it('formats past dates', () => {
      const oneWeekAgo = '2024-03-08T12:00:00Z';
      const result = formatRelativeTime(oneWeekAgo);
      expect(result).toMatch(/7 days ago/i);
    });

    it('handles Date objects', () => {
      const date = new Date('2024-03-14T12:00:00Z');
      const result = formatRelativeTime(date);
      expect(result).toMatch(/day ago|1 day ago/i);
    });
  });

  describe('formatGPA', () => {
    it('formats GPA with two decimal places', () => {
      expect(formatGPA(3.8)).toBe('3.80');
      expect(formatGPA(4.0)).toBe('4.00');
      expect(formatGPA(3.5)).toBe('3.50');
    });

    it('handles integer GPA values', () => {
      expect(formatGPA(3)).toBe('3.00');
      expect(formatGPA(4)).toBe('4.00');
    });

    it('handles low GPA values', () => {
      expect(formatGPA(2.5)).toBe('2.50');
      expect(formatGPA(2.0)).toBe('2.00');
      expect(formatGPA(0)).toBe('0.00');
    });
  });

  describe('formatPercentage', () => {
    it('formats percentage with default decimal places', () => {
      expect(formatPercentage(50)).toBe('50.0%');
      expect(formatPercentage(75.5)).toBe('75.5%');
      expect(formatPercentage(100)).toBe('100.0%');
    });

    it('formats percentage with custom decimal places', () => {
      expect(formatPercentage(50, 0)).toBe('50%');
      expect(formatPercentage(75.555, 2)).toBe('75.56%');
      expect(formatPercentage(33.333333, 3)).toBe('33.333%');
    });

    it('handles zero and small values', () => {
      expect(formatPercentage(0)).toBe('0.0%');
      expect(formatPercentage(0.5)).toBe('0.5%');
    });
  });
});
