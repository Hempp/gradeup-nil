/**
 * Service Helpers Tests
 * Comprehensive tests for src/services/helpers.js
 *
 * Tests cover:
 * - User ID retrieval (athlete, brand, director)
 * - Date range calculations
 * - File validation utilities
 * - GPA validation
 * - Currency formatting
 * - Timestamp generation
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the supabase module before importing helpers
vi.mock('../../src/services/supabase.js', () => ({
  getSupabaseClient: vi.fn(),
  getCurrentUser: vi.fn(),
}));

// Import mocked modules
import { getSupabaseClient, getCurrentUser } from '../../src/services/supabase.js';

// Import helpers service after mocks are set up
import {
  getMyAthleteId,
  getMyBrandId,
  getMyDirectorInfo,
  TIME_PERIODS,
  getDateRange,
  ACADEMIC_YEARS,
  VALIDATION,
  ALLOWED_FILE_TYPES,
  getFileExtension,
  generateFilename,
  validateFileType,
  validateFileSize,
  validateGPA,
  ensureAthleteId,
  ensureBrandId,
  formatCurrency,
  getCurrentTimestamp,
} from '../../src/services/helpers.js';

// Helper to create mock Supabase client
function createMockSupabase() {
  return {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  };
}

describe('HelpersService', () => {
  let mockSupabase;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();
    getSupabaseClient.mockResolvedValue(mockSupabase);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ─── Constants Tests ───

  describe('Constants', () => {
    describe('TIME_PERIODS', () => {
      it('should export TIME_PERIODS with correct values', () => {
        expect(TIME_PERIODS).toEqual({
          WEEK: '7d',
          MONTH: '30d',
          QUARTER: '90d',
          YEAR: '365d',
          ALL_TIME: 'all',
        });
      });
    });

    describe('ACADEMIC_YEARS', () => {
      it('should export ACADEMIC_YEARS with correct values', () => {
        expect(ACADEMIC_YEARS).toEqual({
          FRESHMAN: 'freshman',
          SOPHOMORE: 'sophomore',
          JUNIOR: 'junior',
          SENIOR: 'senior',
          GRADUATE: 'graduate',
          OTHER: 'other',
        });
      });
    });

    describe('VALIDATION', () => {
      it('should export VALIDATION constants', () => {
        expect(VALIDATION.GPA_MIN).toBe(0.0);
        expect(VALIDATION.GPA_MAX).toBe(4.0);
        expect(VALIDATION.MAX_VIDEO_SIZE_MB).toBe(500);
        expect(VALIDATION.MAX_IMAGE_SIZE_MB).toBe(10);
        expect(VALIDATION.MAX_DOCUMENT_SIZE_MB).toBe(25);
      });
    });

    describe('ALLOWED_FILE_TYPES', () => {
      it('should export video file types', () => {
        expect(ALLOWED_FILE_TYPES.VIDEOS).toContain('video/mp4');
        expect(ALLOWED_FILE_TYPES.VIDEOS).toContain('video/quicktime');
        expect(ALLOWED_FILE_TYPES.VIDEOS).toContain('video/webm');
        expect(ALLOWED_FILE_TYPES.VIDEOS).toContain('video/x-msvideo');
      });

      it('should export image file types', () => {
        expect(ALLOWED_FILE_TYPES.IMAGES).toContain('image/jpeg');
        expect(ALLOWED_FILE_TYPES.IMAGES).toContain('image/png');
        expect(ALLOWED_FILE_TYPES.IMAGES).toContain('image/gif');
        expect(ALLOWED_FILE_TYPES.IMAGES).toContain('image/webp');
      });

      it('should export document file types', () => {
        expect(ALLOWED_FILE_TYPES.DOCUMENTS).toContain('application/pdf');
        expect(ALLOWED_FILE_TYPES.DOCUMENTS).toContain('image/jpeg');
        expect(ALLOWED_FILE_TYPES.DOCUMENTS).toContain('image/png');
      });
    });
  });

  // ─── User ID Retrieval Tests ───

  describe('getMyAthleteId', () => {
    it('should return athlete ID for authenticated user', async () => {
      const mockUser = { id: 'user-123' };
      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'athlete-456' },
            error: null,
          }),
        }),
      });
      mockSupabase.from = vi.fn().mockReturnValue({ select: mockSelect });

      const result = await getMyAthleteId();

      expect(result).toBe('athlete-456');
      expect(mockSupabase.from).toHaveBeenCalledWith('athletes');
    });

    it('should return null when user is not authenticated', async () => {
      getCurrentUser.mockResolvedValue({ user: null, error: new Error('Not authenticated') });

      const result = await getMyAthleteId();

      expect(result).toBeNull();
    });

    it('should return null when user has no athlete record', async () => {
      const mockUser = { id: 'user-123' };
      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: 'PGRST116' },
          }),
        }),
      });
      mockSupabase.from = vi.fn().mockReturnValue({ select: mockSelect });

      const result = await getMyAthleteId();

      expect(result).toBeNull();
    });

    it('should return null on getCurrentUser error', async () => {
      getCurrentUser.mockResolvedValue({ user: null, error: null });

      const result = await getMyAthleteId();

      expect(result).toBeNull();
    });
  });

  describe('getMyBrandId', () => {
    it('should return brand ID for authenticated user', async () => {
      const mockUser = { id: 'user-123' };
      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'brand-789' },
            error: null,
          }),
        }),
      });
      mockSupabase.from = vi.fn().mockReturnValue({ select: mockSelect });

      const result = await getMyBrandId();

      expect(result).toBe('brand-789');
      expect(mockSupabase.from).toHaveBeenCalledWith('brands');
    });

    it('should return null when user is not authenticated', async () => {
      getCurrentUser.mockResolvedValue({ user: null, error: new Error('Auth error') });

      const result = await getMyBrandId();

      expect(result).toBeNull();
    });

    it('should return null when user has no brand record', async () => {
      const mockUser = { id: 'user-123' };
      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });
      mockSupabase.from = vi.fn().mockReturnValue({ select: mockSelect });

      const result = await getMyBrandId();

      expect(result).toBeNull();
    });
  });

  describe('getMyDirectorInfo', () => {
    it('should return director info for authenticated user', async () => {
      const mockUser = { id: 'user-123' };
      const mockDirectorInfo = { id: 'director-1', school_id: 'school-abc' };
      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockDirectorInfo,
            error: null,
          }),
        }),
      });
      mockSupabase.from = vi.fn().mockReturnValue({ select: mockSelect });

      const result = await getMyDirectorInfo();

      expect(result).toEqual(mockDirectorInfo);
      expect(mockSupabase.from).toHaveBeenCalledWith('athletic_directors');
    });

    it('should return null when user is not authenticated', async () => {
      getCurrentUser.mockResolvedValue({ user: null, error: new Error('Not auth') });

      const result = await getMyDirectorInfo();

      expect(result).toBeNull();
    });

    it('should return null when user has no director record', async () => {
      const mockUser = { id: 'user-123' };
      getCurrentUser.mockResolvedValue({ user: mockUser, error: null });

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      });
      mockSupabase.from = vi.fn().mockReturnValue({ select: mockSelect });

      const result = await getMyDirectorInfo();

      expect(result).toBeNull();
    });
  });

  // ─── Date Range Tests ───

  describe('getDateRange', () => {
    // Use fake timers to control Date
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should calculate week range (7 days)', () => {
      const { start, end } = getDateRange(TIME_PERIODS.WEEK);

      expect(end.toISOString()).toBe('2024-06-15T12:00:00.000Z');
      expect(start.toISOString()).toBe('2024-06-08T12:00:00.000Z');
    });

    it('should calculate month range (30 days)', () => {
      const { start, end } = getDateRange(TIME_PERIODS.MONTH);

      expect(end.toISOString()).toBe('2024-06-15T12:00:00.000Z');
      expect(start.toISOString()).toBe('2024-05-16T12:00:00.000Z');
    });

    it('should calculate quarter range (90 days)', () => {
      const { start, end } = getDateRange(TIME_PERIODS.QUARTER);

      expect(end.toISOString()).toBe('2024-06-15T12:00:00.000Z');
      expect(start.toISOString()).toBe('2024-03-17T12:00:00.000Z');
    });

    it('should calculate year range (365 days)', () => {
      const { start, end } = getDateRange(TIME_PERIODS.YEAR);

      expect(end.toISOString()).toBe('2024-06-15T12:00:00.000Z');
      expect(start.toISOString()).toBe('2023-06-16T12:00:00.000Z');
    });

    it('should use 2020-01-01 for all-time range', () => {
      const { start, end } = getDateRange(TIME_PERIODS.ALL_TIME);

      expect(end.toISOString()).toBe('2024-06-15T12:00:00.000Z');
      expect(start.toISOString()).toBe('2020-01-01T00:00:00.000Z');
    });

    it('should use all-time for unknown period (default case)', () => {
      const { start, end } = getDateRange('unknown');

      expect(start.toISOString()).toBe('2020-01-01T00:00:00.000Z');
    });
  });

  // ─── File Extension Tests ───

  describe('getFileExtension', () => {
    it('should extract extension from filename', () => {
      expect(getFileExtension('photo.jpg')).toBe('jpg');
      expect(getFileExtension('document.pdf')).toBe('pdf');
      expect(getFileExtension('video.mp4')).toBe('mp4');
    });

    it('should return lowercase extension', () => {
      expect(getFileExtension('Photo.JPG')).toBe('jpg');
      expect(getFileExtension('Document.PDF')).toBe('pdf');
    });

    it('should handle multiple dots in filename', () => {
      expect(getFileExtension('file.name.with.dots.png')).toBe('png');
      expect(getFileExtension('archive.tar.gz')).toBe('gz');
    });

    it('should return empty string for files without extension', () => {
      expect(getFileExtension('filename')).toBe('');
      expect(getFileExtension('noextension')).toBe('');
    });

    it('should return empty string for invalid input', () => {
      expect(getFileExtension('')).toBe('');
      expect(getFileExtension(null)).toBe('');
      expect(getFileExtension(undefined)).toBe('');
      expect(getFileExtension(123)).toBe('');
    });
  });

  // ─── Filename Generation Tests ───

  describe('generateFilename', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:00:00.000Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should generate filename with user ID and timestamp', () => {
      const result = generateFilename('user-123', 'photo.jpg');
      const timestamp = Date.now();

      expect(result).toBe(`user-123/${timestamp}.jpg`);
    });

    it('should include prefix when provided', () => {
      const result = generateFilename('user-123', 'photo.jpg', 'avatar');
      const timestamp = Date.now();

      expect(result).toBe(`user-123/avatar-${timestamp}.jpg`);
    });

    it('should handle files without extension', () => {
      const result = generateFilename('user-123', 'filename', 'document');
      const timestamp = Date.now();

      expect(result).toBe(`user-123/document-${timestamp}.`);
    });

    it('should preserve file extension', () => {
      const result = generateFilename('user-456', 'video.mp4', 'highlight');
      expect(result).toContain('.mp4');
    });

    it('should work without prefix', () => {
      const result = generateFilename('user-789', 'doc.pdf');
      expect(result).toMatch(/^user-789\/\d+\.pdf$/);
    });
  });

  // ─── File Type Validation Tests ───

  describe('validateFileType', () => {
    it('should validate allowed file type', () => {
      const file = { type: 'image/jpeg', name: 'photo.jpg' };
      const result = validateFileType(file, ALLOWED_FILE_TYPES.IMAGES);

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject disallowed file type', () => {
      const file = { type: 'application/exe', name: 'virus.exe' };
      const result = validateFileType(file, ALLOWED_FILE_TYPES.IMAGES);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File type application/exe not allowed');
    });

    it('should reject file without type', () => {
      const file = { name: 'file.txt' };
      const result = validateFileType(file, ALLOWED_FILE_TYPES.IMAGES);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file');
    });

    it('should reject null file', () => {
      const result = validateFileType(null, ALLOWED_FILE_TYPES.IMAGES);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file');
    });

    it('should reject undefined file', () => {
      const result = validateFileType(undefined, ALLOWED_FILE_TYPES.IMAGES);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file');
    });

    it('should validate video file types', () => {
      const file = { type: 'video/mp4', name: 'highlight.mp4' };
      const result = validateFileType(file, ALLOWED_FILE_TYPES.VIDEOS);

      expect(result.valid).toBe(true);
    });

    it('should validate document file types', () => {
      const file = { type: 'application/pdf', name: 'transcript.pdf' };
      const result = validateFileType(file, ALLOWED_FILE_TYPES.DOCUMENTS);

      expect(result.valid).toBe(true);
    });
  });

  // ─── File Size Validation Tests ───

  describe('validateFileSize', () => {
    it('should validate file within size limit', () => {
      const file = { size: 5 * 1024 * 1024 }; // 5MB
      const result = validateFileSize(file, 10);

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should reject file exceeding size limit', () => {
      const file = { size: 15 * 1024 * 1024 }; // 15MB
      const result = validateFileSize(file, 10);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('File size exceeds 10MB limit');
    });

    it('should reject file exactly at the limit', () => {
      const file = { size: 10 * 1024 * 1024 + 1 }; // Just over 10MB
      const result = validateFileSize(file, 10);

      expect(result.valid).toBe(false);
    });

    it('should accept file exactly at the limit', () => {
      const file = { size: 10 * 1024 * 1024 }; // Exactly 10MB
      const result = validateFileSize(file, 10);

      expect(result.valid).toBe(true);
    });

    it('should reject null file', () => {
      const result = validateFileSize(null, 10);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file');
    });

    it('should reject file without size property', () => {
      const result = validateFileSize({ name: 'test.txt' }, 10);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid file');
    });

    it('should validate video files with correct limit', () => {
      const file = { size: 400 * 1024 * 1024 }; // 400MB video
      const result = validateFileSize(file, VALIDATION.MAX_VIDEO_SIZE_MB);

      expect(result.valid).toBe(true);
    });

    it('should validate image files with correct limit', () => {
      const file = { size: 8 * 1024 * 1024 }; // 8MB image
      const result = validateFileSize(file, VALIDATION.MAX_IMAGE_SIZE_MB);

      expect(result.valid).toBe(true);
    });
  });

  // ─── GPA Validation Tests ───

  describe('validateGPA', () => {
    it('should validate GPA within valid range', () => {
      expect(validateGPA(3.5).valid).toBe(true);
      expect(validateGPA(3.5).error).toBeNull();
    });

    it('should validate GPA at minimum (0.0)', () => {
      expect(validateGPA(0.0).valid).toBe(true);
    });

    it('should validate GPA at maximum (4.0)', () => {
      expect(validateGPA(4.0).valid).toBe(true);
    });

    it('should reject GPA below minimum', () => {
      const result = validateGPA(-0.5);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('GPA must be between 0 and 4');
    });

    it('should reject GPA above maximum', () => {
      const result = validateGPA(4.5);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('GPA must be between 0 and 4');
    });

    it('should reject non-number values', () => {
      expect(validateGPA('3.5').valid).toBe(false);
      expect(validateGPA('3.5').error).toBe('GPA must be a number');
    });

    it('should reject null', () => {
      const result = validateGPA(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('GPA must be a number');
    });

    it('should reject undefined', () => {
      const result = validateGPA(undefined);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('GPA must be a number');
    });

    it('should reject NaN', () => {
      const result = validateGPA(NaN);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('GPA must be a number');
    });

    it('should validate decimal GPAs', () => {
      expect(validateGPA(3.67).valid).toBe(true);
      expect(validateGPA(2.333).valid).toBe(true);
      expect(validateGPA(1.0).valid).toBe(true);
    });
  });

  // ─── Ensure ID Tests ───

  describe('ensureAthleteId', () => {
    it('should return valid true for valid athlete ID', () => {
      const result = ensureAthleteId('athlete-123');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should return error for null athlete ID', () => {
      const result = ensureAthleteId(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('should return error for undefined athlete ID', () => {
      const result = ensureAthleteId(undefined);

      expect(result.valid).toBe(false);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('should return error for empty string', () => {
      const result = ensureAthleteId('');

      expect(result.valid).toBe(false);
      expect(result.error.message).toBe('Athlete profile not found');
    });
  });

  describe('ensureBrandId', () => {
    it('should return valid true for valid brand ID', () => {
      const result = ensureBrandId('brand-456');

      expect(result.valid).toBe(true);
      expect(result.error).toBeNull();
    });

    it('should return error for null brand ID', () => {
      const result = ensureBrandId(null);

      expect(result.valid).toBe(false);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Brand profile not found');
    });

    it('should return error for undefined brand ID', () => {
      const result = ensureBrandId(undefined);

      expect(result.valid).toBe(false);
    });

    it('should return error for empty string', () => {
      const result = ensureBrandId('');

      expect(result.valid).toBe(false);
      expect(result.error.message).toBe('Brand profile not found');
    });
  });

  // ─── Currency Formatting Tests ───

  describe('formatCurrency', () => {
    it('should format dollars correctly', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00');
      expect(formatCurrency(25.50)).toBe('$25.50');
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should format cents when inCents is true', () => {
      expect(formatCurrency(10000, true)).toBe('$100.00');
      expect(formatCurrency(2550, true)).toBe('$25.50');
      expect(formatCurrency(99, true)).toBe('$0.99');
    });

    it('should handle large amounts', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89');
    });

    it('should handle small decimal amounts', () => {
      expect(formatCurrency(0.01)).toBe('$0.01');
      expect(formatCurrency(0.001)).toBe('$0.00'); // Rounds down
    });

    it('should handle negative amounts', () => {
      expect(formatCurrency(-100)).toBe('-$100.00');
    });
  });

  // ─── Timestamp Tests ───

  describe('getCurrentTimestamp', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2024-06-15T12:30:45.123Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should return ISO formatted timestamp', () => {
      const result = getCurrentTimestamp();

      expect(result).toBe('2024-06-15T12:30:45.123Z');
    });

    it('should return string type', () => {
      const result = getCurrentTimestamp();

      expect(typeof result).toBe('string');
    });

    it('should be valid ISO date string', () => {
      const result = getCurrentTimestamp();
      const parsed = new Date(result);

      expect(parsed.toISOString()).toBe(result);
    });
  });

  // ─── Integration-style Tests ───

  describe('File Validation Integration', () => {
    it('should validate image upload correctly', () => {
      const file = {
        name: 'profile.jpg',
        type: 'image/jpeg',
        size: 5 * 1024 * 1024, // 5MB
      };

      const typeResult = validateFileType(file, ALLOWED_FILE_TYPES.IMAGES);
      const sizeResult = validateFileSize(file, VALIDATION.MAX_IMAGE_SIZE_MB);

      expect(typeResult.valid).toBe(true);
      expect(sizeResult.valid).toBe(true);
    });

    it('should reject oversized video', () => {
      const file = {
        name: 'highlight.mp4',
        type: 'video/mp4',
        size: 600 * 1024 * 1024, // 600MB - over 500MB limit
      };

      const typeResult = validateFileType(file, ALLOWED_FILE_TYPES.VIDEOS);
      const sizeResult = validateFileSize(file, VALIDATION.MAX_VIDEO_SIZE_MB);

      expect(typeResult.valid).toBe(true);
      expect(sizeResult.valid).toBe(false);
    });

    it('should reject wrong document type', () => {
      const file = {
        name: 'malware.exe',
        type: 'application/x-msdownload',
        size: 1 * 1024 * 1024,
      };

      const result = validateFileType(file, ALLOWED_FILE_TYPES.DOCUMENTS);

      expect(result.valid).toBe(false);
    });
  });

  describe('GPA and Academic Year Integration', () => {
    it('should work with all academic years', () => {
      const academicYears = Object.values(ACADEMIC_YEARS);
      const validGPAs = [0.0, 2.0, 3.5, 4.0];

      academicYears.forEach((year) => {
        expect(typeof year).toBe('string');
      });

      validGPAs.forEach((gpa) => {
        expect(validateGPA(gpa).valid).toBe(true);
      });
    });
  });

  describe('Time Period Date Range Accuracy', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('should handle month boundary correctly', () => {
      vi.setSystemTime(new Date('2024-03-05T12:00:00Z'));
      const { start } = getDateRange(TIME_PERIODS.WEEK);

      // 7 days before March 5 = February 27 (leap year)
      expect(start.getMonth()).toBe(1); // February
      expect(start.getDate()).toBe(27);
    });

    it('should handle year boundary correctly', () => {
      vi.setSystemTime(new Date('2024-01-03T12:00:00Z'));
      const { start } = getDateRange(TIME_PERIODS.WEEK);

      // 7 days before January 3 = December 27, 2023
      expect(start.getFullYear()).toBe(2023);
      expect(start.getMonth()).toBe(11); // December
    });
  });
});
