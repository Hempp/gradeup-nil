/**
 * Sport-specific gradient colors for visual identification
 *
 * Note: Tailwind color classes are intentionally used here (not CSS variables)
 * to provide distinct visual identification for each sport. These are carefully
 * chosen to be visually distinguishable while maintaining accessibility contrast.
 */

const SPORT_GRADIENTS: Record<string, string> = {
  'Basketball': 'from-orange-500 via-red-500 to-rose-600',
  'Football': 'from-emerald-500 via-teal-500 to-cyan-600',
  'Soccer': 'from-green-500 via-emerald-500 to-teal-500',
  'Volleyball': 'from-purple-500 via-violet-500 to-indigo-600',
  'Gymnastics': 'from-pink-500 via-rose-500 to-red-500',
  'Swimming': 'from-blue-400 via-cyan-500 to-teal-500',
  'Tennis': 'from-lime-500 via-green-500 to-emerald-500',
  'Track & Field': 'from-amber-500 via-orange-500 to-red-500',
  'Baseball': 'from-red-500 via-rose-500 to-pink-500',
  'Softball': 'from-yellow-500 via-amber-500 to-orange-500',
  'Lacrosse': 'from-blue-500 via-indigo-500 to-purple-500',
  'Hockey': 'from-slate-500 via-zinc-500 to-neutral-600',
  'Golf': 'from-green-400 via-emerald-400 to-teal-400',
  'Wrestling': 'from-red-600 via-rose-600 to-pink-600',
  'Cross Country': 'from-amber-400 via-yellow-500 to-orange-400',
} as const;

const DEFAULT_GRADIENT = 'from-[var(--color-secondary)] via-[var(--color-magenta)] to-[var(--color-primary)]';

/**
 * Get the gradient classes for a specific sport
 * @param sport - The sport name
 * @returns Tailwind gradient classes (e.g., "from-orange-500 via-red-500 to-rose-600")
 */
export function getSportGradient(sport: string): string {
  return SPORT_GRADIENTS[sport] ?? DEFAULT_GRADIENT;
}

/**
 * Get the full gradient class string including bg-gradient-to-br
 * @param sport - The sport name
 * @returns Full Tailwind class string (e.g., "bg-gradient-to-br from-orange-500 via-red-500 to-rose-600")
 */
export function getSportGradientClass(sport: string): string {
  return `bg-gradient-to-br ${getSportGradient(sport)}`;
}

/**
 * All supported sports with their gradients
 */
export const SUPPORTED_SPORTS = Object.keys(SPORT_GRADIENTS);
