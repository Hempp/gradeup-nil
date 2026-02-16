/**
 * Tests for sport theme utilities
 * @module __tests__/lib/utils/sport-theme.test
 */

import {
  getSportGradient,
  getSportGradientClass,
  SUPPORTED_SPORTS,
} from '@/lib/utils/sport-theme';

describe('sport-theme utilities', () => {
  describe('getSportGradient', () => {
    it('returns correct gradient for Basketball', () => {
      const gradient = getSportGradient('Basketball');
      expect(gradient).toBe('from-orange-500 via-red-500 to-rose-600');
    });

    it('returns correct gradient for Football', () => {
      const gradient = getSportGradient('Football');
      expect(gradient).toBe('from-emerald-500 via-teal-500 to-cyan-600');
    });

    it('returns correct gradient for Soccer', () => {
      const gradient = getSportGradient('Soccer');
      expect(gradient).toBe('from-green-500 via-emerald-500 to-teal-500');
    });

    it('returns correct gradient for Volleyball', () => {
      const gradient = getSportGradient('Volleyball');
      expect(gradient).toBe('from-purple-500 via-violet-500 to-indigo-600');
    });

    it('returns correct gradient for Swimming', () => {
      const gradient = getSportGradient('Swimming');
      expect(gradient).toBe('from-blue-400 via-cyan-500 to-teal-500');
    });

    it('returns correct gradient for Tennis', () => {
      const gradient = getSportGradient('Tennis');
      expect(gradient).toBe('from-lime-500 via-green-500 to-emerald-500');
    });

    it('returns correct gradient for Baseball', () => {
      const gradient = getSportGradient('Baseball');
      expect(gradient).toBe('from-red-500 via-rose-500 to-pink-500');
    });

    it('returns correct gradient for Hockey', () => {
      const gradient = getSportGradient('Hockey');
      expect(gradient).toBe('from-slate-500 via-zinc-500 to-neutral-600');
    });

    it('returns default gradient for unknown sport', () => {
      const gradient = getSportGradient('Unknown Sport');
      expect(gradient).toContain('from-[var(--color-secondary)]');
    });

    it('returns default gradient for empty string', () => {
      const gradient = getSportGradient('');
      expect(gradient).toContain('from-[var(--color-secondary)]');
    });

    it('is case-sensitive', () => {
      const gradient = getSportGradient('basketball');
      // Should return default since it doesn't match 'Basketball'
      expect(gradient).toContain('from-[var(--color-secondary)]');
    });
  });

  describe('getSportGradientClass', () => {
    it('includes bg-gradient-to-br prefix', () => {
      const classString = getSportGradientClass('Basketball');
      expect(classString).toContain('bg-gradient-to-br');
    });

    it('includes sport gradient', () => {
      const classString = getSportGradientClass('Basketball');
      expect(classString).toContain('from-orange-500');
      expect(classString).toContain('via-red-500');
      expect(classString).toContain('to-rose-600');
    });

    it('combines prefix with gradient correctly', () => {
      const classString = getSportGradientClass('Football');
      expect(classString).toBe('bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-600');
    });

    it('handles unknown sports with default gradient', () => {
      const classString = getSportGradientClass('Curling');
      expect(classString).toContain('bg-gradient-to-br');
      expect(classString).toContain('from-[var(--color-secondary)]');
    });
  });

  describe('SUPPORTED_SPORTS', () => {
    it('is an array of strings', () => {
      expect(Array.isArray(SUPPORTED_SPORTS)).toBe(true);
      SUPPORTED_SPORTS.forEach((sport) => {
        expect(typeof sport).toBe('string');
      });
    });

    it('contains common sports', () => {
      expect(SUPPORTED_SPORTS).toContain('Basketball');
      expect(SUPPORTED_SPORTS).toContain('Football');
      expect(SUPPORTED_SPORTS).toContain('Soccer');
      expect(SUPPORTED_SPORTS).toContain('Volleyball');
      expect(SUPPORTED_SPORTS).toContain('Swimming');
    });

    it('has at least 10 sports', () => {
      expect(SUPPORTED_SPORTS.length).toBeGreaterThanOrEqual(10);
    });

    it('contains all expected sports', () => {
      const expectedSports = [
        'Basketball',
        'Football',
        'Soccer',
        'Volleyball',
        'Gymnastics',
        'Swimming',
        'Tennis',
        'Track & Field',
        'Baseball',
        'Softball',
        'Lacrosse',
        'Hockey',
        'Golf',
        'Wrestling',
        'Cross Country',
      ];

      expectedSports.forEach((sport) => {
        expect(SUPPORTED_SPORTS).toContain(sport);
      });
    });

    it('has unique values', () => {
      const uniqueSports = [...new Set(SUPPORTED_SPORTS)];
      expect(uniqueSports.length).toBe(SUPPORTED_SPORTS.length);
    });
  });
});
