/**
 * Tests for the cn (classNames) utility function
 * @module __tests__/lib/utils/cn.test
 */

import { cn } from '@/lib/utils/cn';

describe('cn utility', () => {
  it('merges class names correctly', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    const isDisabled = false;

    expect(cn('base', isActive && 'active', isDisabled && 'disabled')).toBe('base active');
  });

  it('merges Tailwind classes and deduplicates', () => {
    // twMerge should keep the last conflicting class
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('handles arrays of classes', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
    expect(cn(['a', 'b'], ['c', 'd'])).toBe('a b c d');
  });

  it('handles objects for conditional classes', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('handles mixed inputs', () => {
    expect(cn('base', ['array-class'], { conditional: true })).toBe('base array-class conditional');
  });

  it('handles undefined and null values', () => {
    expect(cn('base', undefined, null, 'other')).toBe('base other');
  });

  it('handles empty strings', () => {
    expect(cn('base', '', 'other')).toBe('base other');
  });

  it('returns empty string for no inputs', () => {
    expect(cn()).toBe('');
  });

  it('merges complex Tailwind classes correctly', () => {
    expect(cn(
      'flex items-center',
      'px-4 py-2',
      'bg-blue-500 hover:bg-blue-600',
      'text-white font-medium'
    )).toBe('flex items-center px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium');
  });

  it('handles responsive modifiers correctly', () => {
    expect(cn('sm:p-4', 'md:p-6', 'lg:p-8')).toBe('sm:p-4 md:p-6 lg:p-8');
  });
});
