import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Combines class names with Tailwind CSS conflict resolution
 *
 * Merges multiple class name inputs using clsx for conditional classes,
 * then uses tailwind-merge to intelligently resolve conflicting Tailwind
 * utility classes (e.g., 'px-2 px-4' becomes 'px-4').
 *
 * @param inputs - Any number of class value inputs (strings, objects, arrays)
 * @returns Merged and de-duplicated class string
 * @example
 * cn('px-2 py-1', 'px-4') // 'py-1 px-4' (px-4 wins)
 * cn('text-red-500', { 'text-blue-500': isBlue }) // conditional classes
 * cn('p-4', className) // merge with external className prop
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
