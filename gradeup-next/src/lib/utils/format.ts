import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Format a number as US currency (USD)
 *
 * Formats the amount with dollar sign, thousands separators,
 * and no decimal places.
 *
 * @param amount - The numeric amount to format
 * @returns Formatted currency string (e.g., '$1,234')
 * @example
 * formatCurrency(1234.56) // '$1,235'
 * formatCurrency(1000000) // '$1,000,000'
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format a large number in compact notation
 *
 * Converts large numbers to abbreviated format with K (thousands)
 * or M (millions) suffix.
 *
 * @param num - The number to format
 * @returns Compact string representation (e.g., '1.5K', '2.3M')
 * @example
 * formatCompactNumber(1500) // '1.5K'
 * formatCompactNumber(2300000) // '2.3M'
 * formatCompactNumber(500) // '500'
 */
export function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * Format a date as a readable string (e.g., 'Jan 15, 2024')
 *
 * @param date - Date object or ISO date string
 * @returns Formatted date string
 * @example
 * formatDate('2024-01-15') // 'Jan 15, 2024'
 * formatDate(new Date()) // 'Feb 16, 2026'
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy');
}

/**
 * Format a date with time (e.g., 'Jan 15, 2024 3:30 PM')
 *
 * @param date - Date object or ISO date string
 * @returns Formatted date and time string
 * @example
 * formatDateTime('2024-01-15T15:30:00Z') // 'Jan 15, 2024 3:30 PM'
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'MMM d, yyyy h:mm a');
}

/**
 * Format a date as relative time (e.g., '2 hours ago', 'in 3 days')
 *
 * Uses date-fns formatDistanceToNow for natural language relative times.
 *
 * @param date - Date object or ISO date string
 * @returns Relative time string with suffix
 * @example
 * formatRelativeTime(new Date(Date.now() - 3600000)) // 'about 1 hour ago'
 */
export function formatRelativeTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(d, { addSuffix: true });
}

/**
 * Format a GPA value to 2 decimal places
 *
 * @param gpa - The GPA value (0.00 - 4.00)
 * @returns Formatted GPA string (e.g., '3.75')
 * @example
 * formatGPA(3.7) // '3.70'
 * formatGPA(4) // '4.00'
 */
export function formatGPA(gpa: number): string {
  return gpa.toFixed(2);
}

/**
 * Format a number as a percentage string
 *
 * @param value - The percentage value (e.g., 75.5 for 75.5%)
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted percentage string with % symbol
 * @example
 * formatPercentage(75.5) // '75.5%'
 * formatPercentage(100, 0) // '100%'
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}
