/**
 * GradeUp NIL Platform - Shared Service Helpers
 * Common utilities used across multiple services.
 *
 * @module services/helpers
 */

import { getSupabaseClient, getCurrentUser } from './supabase.js';

/**
 * Get athlete ID for the current user
 * @returns {Promise<string | null>}
 */
export async function getMyAthleteId() {
  const supabase = await getSupabaseClient();
  const { user, error } = await getCurrentUser();

  if (error || !user) return null;

  const { data } = await supabase
    .from('athletes')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  return data?.id || null;
}

/**
 * Time period options for analytics
 * @readonly
 */
export const TIME_PERIODS = {
  WEEK: '7d',
  MONTH: '30d',
  QUARTER: '90d',
  YEAR: '365d',
  ALL_TIME: 'all',
};

/**
 * Parse time period to date range
 * @param {string} period - Time period
 * @returns {{start: Date, end: Date}}
 */
export function getDateRange(period) {
  const end = new Date();
  let start = new Date();

  switch (period) {
    case TIME_PERIODS.WEEK:
      start.setDate(end.getDate() - 7);
      break;
    case TIME_PERIODS.MONTH:
      start.setDate(end.getDate() - 30);
      break;
    case TIME_PERIODS.QUARTER:
      start.setDate(end.getDate() - 90);
      break;
    case TIME_PERIODS.YEAR:
      start.setDate(end.getDate() - 365);
      break;
    case TIME_PERIODS.ALL_TIME:
    default:
      start = new Date('2020-01-01');
      break;
  }

  return { start, end };
}

/**
 * Academic year options
 * @readonly
 */
export const ACADEMIC_YEARS = {
  FRESHMAN: 'freshman',
  SOPHOMORE: 'sophomore',
  JUNIOR: 'junior',
  SENIOR: 'senior',
  GRADUATE: 'graduate',
  OTHER: 'other',
};
