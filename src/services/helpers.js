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
 * Get brand ID for the current user
 * @returns {Promise<string | null>}
 */
export async function getMyBrandId() {
  const supabase = await getSupabaseClient();
  const { user, error } = await getCurrentUser();

  if (error || !user) return null;

  const { data } = await supabase
    .from('brands')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  return data?.id || null;
}

/**
 * Get athletic director info for the current user
 * @returns {Promise<{id: string, school_id: string} | null>}
 */
export async function getMyDirectorInfo() {
  const supabase = await getSupabaseClient();
  const { user, error } = await getCurrentUser();

  if (error || !user) return null;

  const { data } = await supabase
    .from('athletic_directors')
    .select('id, school_id')
    .eq('profile_id', user.id)
    .single();

  return data || null;
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

// ─── Validation Constants ───

export const VALIDATION = {
  GPA_MIN: 0.0,
  GPA_MAX: 4.0,
  MAX_VIDEO_SIZE_MB: 500,
  MAX_IMAGE_SIZE_MB: 10,
  MAX_DOCUMENT_SIZE_MB: 25,
};

export const ALLOWED_FILE_TYPES = {
  VIDEOS: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'],
  IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  DOCUMENTS: ['application/pdf', 'image/jpeg', 'image/png'],
};

// ─── Utility Functions ───

/**
 * Extract file extension from filename
 * @param {string} filename - File name
 * @returns {string} File extension (lowercase, without dot)
 */
export function getFileExtension(filename) {
  if (!filename || typeof filename !== 'string') return '';
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
}

/**
 * Generate a unique filename with timestamp
 * @param {string} userId - User ID
 * @param {string} originalFilename - Original file name
 * @param {string} prefix - Optional prefix (e.g., 'avatar', 'document')
 * @returns {string} Generated filename path
 */
export function generateFilename(userId, originalFilename, prefix = '') {
  const ext = getFileExtension(originalFilename);
  const timestamp = Date.now();
  const prefixPart = prefix ? `${prefix}-` : '';
  return `${userId}/${prefixPart}${timestamp}.${ext}`;
}

/**
 * Validate file type against allowed types
 * @param {File} file - File to validate
 * @param {string[]} allowedTypes - Array of allowed MIME types
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateFileType(file, allowedTypes) {
  if (!file || !file.type) {
    return { valid: false, error: 'Invalid file' };
  }
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not allowed` };
  }
  return { valid: true, error: null };
}

/**
 * Validate file size
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum size in megabytes
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateFileSize(file, maxSizeMB) {
  if (!file || typeof file.size !== 'number') {
    return { valid: false, error: 'Invalid file' };
  }
  const maxBytes = maxSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
  }
  return { valid: true, error: null };
}

/**
 * Validate GPA value
 * @param {number} gpa - GPA value
 * @returns {{valid: boolean, error: string|null}}
 */
export function validateGPA(gpa) {
  if (typeof gpa !== 'number' || isNaN(gpa)) {
    return { valid: false, error: 'GPA must be a number' };
  }
  if (gpa < VALIDATION.GPA_MIN || gpa > VALIDATION.GPA_MAX) {
    return { valid: false, error: `GPA must be between ${VALIDATION.GPA_MIN} and ${VALIDATION.GPA_MAX}` };
  }
  return { valid: true, error: null };
}

/**
 * Ensure athlete ID exists, return error object if not
 * @param {string|null} athleteId - Athlete ID to validate
 * @returns {{valid: boolean, error: Error|null}}
 */
export function ensureAthleteId(athleteId) {
  if (!athleteId) {
    return { valid: false, error: new Error('Athlete profile not found') };
  }
  return { valid: true, error: null };
}

/**
 * Ensure brand ID exists, return error object if not
 * @param {string|null} brandId - Brand ID to validate
 * @returns {{valid: boolean, error: Error|null}}
 */
export function ensureBrandId(brandId) {
  if (!brandId) {
    return { valid: false, error: new Error('Brand profile not found') };
  }
  return { valid: true, error: null };
}

/**
 * Format currency value
 * @param {number} amount - Amount in cents or dollars
 * @param {boolean} inCents - Whether amount is in cents
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount, inCents = false) {
  const dollars = inCents ? amount / 100 : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(dollars);
}

/**
 * Get current ISO timestamp
 * @returns {string} ISO formatted timestamp
 */
export function getCurrentTimestamp() {
  return new Date().toISOString();
}
