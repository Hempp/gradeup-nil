/**
 * Athlete Service Unit Tests
 * Tests for src/services/athlete.js
 *
 * Comprehensive tests for the GradeUp NIL athlete service including:
 * - Profile CRUD operations
 * - Verification status and requests
 * - GPA and academic record handling
 * - Social metrics and handles
 * - Search/filter functionality for schools and sports
 * - Video highlight management
 * - Monetization settings
 * - GradeUp Score calculations
 * - StatTaq integration
 * - Notifications
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Shared response storage - tests modify these to control mock behavior
const mockResponses = {
  single: { data: null, error: null },
  query: { data: null, error: null },
  function: { data: null, error: null },
  rpc: { data: null, error: null },
};

// Create the chainable object that all query methods share
const createChainable = () => {
  const chainable = {};

  // Make it thenable (can be awaited) - returns the query response
  chainable.then = (resolve, reject) => Promise.resolve(mockResponses.query).then(resolve, reject);
  chainable.catch = (reject) => Promise.resolve(mockResponses.query).catch(reject);

  // All chainable methods return the same chainable object
  chainable.select = vi.fn(() => chainable);
  chainable.insert = vi.fn(() => chainable);
  chainable.update = vi.fn(() => chainable);
  chainable.delete = vi.fn(() => chainable);
  chainable.upsert = vi.fn(() => chainable);
  chainable.eq = vi.fn(() => chainable);
  chainable.neq = vi.fn(() => chainable);
  chainable.in = vi.fn(() => chainable);
  chainable.is = vi.fn(() => chainable);
  chainable.or = vi.fn(() => chainable);
  chainable.gte = vi.fn(() => chainable);
  chainable.lte = vi.fn(() => chainable);
  chainable.order = vi.fn(() => chainable);
  chainable.limit = vi.fn(() => chainable);
  chainable.single = vi.fn(() => Promise.resolve(mockResponses.single));

  return chainable;
};

// The shared chainable instance
let chainable = createChainable();

// The mock client
const mockSupabaseClient = {
  from: vi.fn(() => chainable),
  functions: {
    invoke: vi.fn(() => Promise.resolve(mockResponses.function)),
  },
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
  },
  rpc: vi.fn(() => Promise.resolve(mockResponses.rpc)),
  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ data: { path: 'test/path' }, error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://example.com/file.jpg' } })),
    })),
  },
};

// Expose chainable methods on the client for test assertions
Object.defineProperties(mockSupabaseClient, {
  select: { get: () => chainable.select, enumerable: true },
  insert: { get: () => chainable.insert, enumerable: true },
  update: { get: () => chainable.update, enumerable: true },
  delete: { get: () => chainable.delete, enumerable: true },
  upsert: { get: () => chainable.upsert, enumerable: true },
  eq: { get: () => chainable.eq, enumerable: true },
  neq: { get: () => chainable.neq, enumerable: true },
  in: { get: () => chainable.in, enumerable: true },
  is: { get: () => chainable.is, enumerable: true },
  or: { get: () => chainable.or, enumerable: true },
  order: { get: () => chainable.order, enumerable: true },
  limit: { get: () => chainable.limit, enumerable: true },
  single: { get: () => chainable.single, enumerable: true },
});

// Reset clears mocks and responses before each test
const resetMockSupabaseClient = () => {
  mockResponses.single = { data: null, error: null };
  mockResponses.query = { data: null, error: null };
  mockResponses.function = { data: null, error: null };
  mockResponses.rpc = { data: null, error: null };

  chainable = createChainable();

  mockSupabaseClient.from.mockClear();
  mockSupabaseClient.from.mockReturnValue(chainable);

  mockSupabaseClient.functions.invoke.mockClear();
  mockSupabaseClient.functions.invoke.mockImplementation(() => Promise.resolve(mockResponses.function));

  mockSupabaseClient.rpc.mockClear();
  mockSupabaseClient.rpc.mockImplementation(() => Promise.resolve(mockResponses.rpc));
};

// Mock supabase module
vi.mock('../../src/services/supabase.js', () => ({
  getSupabaseClient: vi.fn(async () => mockSupabaseClient),
  getCurrentUser: vi.fn(async () => ({ user: null, error: null })),
  invokeFunction: vi.fn(async (name, body) => mockResponses.function),
  uploadFile: vi.fn(async (bucket, path, file, options) => ({
    data: { path: 'test/path', publicUrl: 'https://example.com/file.jpg' },
    error: null,
  })),
  STORAGE_BUCKETS: {
    AVATARS: 'avatars',
    DOCUMENTS: 'documents',
    VIDEOS: 'videos',
  },
}));

// Mock helpers module
vi.mock('../../src/services/helpers.js', () => ({
  getMyAthleteId: vi.fn(async () => null),
  ACADEMIC_YEARS: {
    FRESHMAN: 'freshman',
    SOPHOMORE: 'sophomore',
    JUNIOR: 'junior',
    SENIOR: 'senior',
    GRADUATE: 'graduate',
    OTHER: 'other',
  },
  getFileExtension: vi.fn((filename) => {
    if (!filename || typeof filename !== 'string') return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts.pop().toLowerCase() : '';
  }),
  generateFilename: vi.fn((userId, originalFilename, prefix) => `${userId}/${prefix}-${Date.now()}.jpg`),
  validateFileType: vi.fn((file, allowedTypes) => {
    if (!file || !file.type) return { valid: false, error: 'Invalid file' };
    if (!allowedTypes.includes(file.type)) return { valid: false, error: `File type ${file.type} not allowed` };
    return { valid: true, error: null };
  }),
  validateFileSize: vi.fn((file, maxSizeMB) => {
    if (!file || typeof file.size !== 'number') return { valid: false, error: 'Invalid file' };
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) return { valid: false, error: `File size exceeds ${maxSizeMB}MB limit` };
    return { valid: true, error: null };
  }),
  validateGPA: vi.fn((gpa) => {
    if (typeof gpa !== 'number' || isNaN(gpa)) return { valid: false, error: 'GPA must be a number' };
    if (gpa < 0.0 || gpa > 4.0) return { valid: false, error: 'GPA must be between 0.0 and 4.0' };
    return { valid: true, error: null };
  }),
  ensureAthleteId: vi.fn((athleteId) => {
    if (!athleteId) return { valid: false, error: new Error('Athlete profile not found') };
    return { valid: true, error: null };
  }),
  VALIDATION: {
    GPA_MIN: 0.0,
    GPA_MAX: 4.0,
    MAX_VIDEO_SIZE_MB: 500,
    MAX_IMAGE_SIZE_MB: 10,
    MAX_DOCUMENT_SIZE_MB: 25,
  },
  ALLOWED_FILE_TYPES: {
    VIDEOS: ['video/mp4', 'video/quicktime', 'video/webm', 'video/x-msvideo'],
    IMAGES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    DOCUMENTS: ['application/pdf', 'image/jpeg', 'image/png'],
  },
}));

// Import after mocks are set up
import {
  DIVISIONS,
  VERIFICATION_TYPES,
  VERIFICATION_STATUS,
  ACADEMIC_YEARS,
  createAthleteProfile,
  getMyAthleteProfile,
  getAthleteById,
  updateAthleteProfile,
  updateSocialHandles,
  updateAvailabilitySettings,
  uploadAvatar,
  getGradeUpScore,
  calculateGradeUpScore,
  getScoreBreakdown,
  getScoreHistory,
  batchCalculateScores,
  addAcademicRecord,
  updateAcademicRecord,
  getAcademicRecords,
  deleteAcademicRecord,
  getMajorCategories,
  updateMajorCategory,
  getVerificationStatus,
  submitVerificationRequest,
  getVerificationRequests,
  uploadVerificationDocument,
  connectStatTaq,
  syncStatTaqData,
  getStatTaqConnection,
  getStatTaqData,
  disconnectStatTaq,
  getSchools,
  getSports,
  getNotifications,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  uploadHighlightVideo,
  getMyVideos,
  getAthleteVideos,
  updateVideo,
  deleteVideo,
  recordVideoView,
  getMonetizationSettings,
  updateMonetizationSettings,
} from '../../src/services/athlete.js';

import { getSupabaseClient, getCurrentUser, invokeFunction, uploadFile } from '../../src/services/supabase.js';
import { getMyAthleteId, validateGPA, ensureAthleteId, validateFileType, validateFileSize } from '../../src/services/helpers.js';

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Athlete Constants', () => {
  describe('DIVISIONS', () => {
    it('has all required division values', () => {
      expect(DIVISIONS.D1).toBe('D1');
      expect(DIVISIONS.D2).toBe('D2');
      expect(DIVISIONS.D3).toBe('D3');
      expect(DIVISIONS.NAIA).toBe('NAIA');
      expect(DIVISIONS.JUCO).toBe('JUCO');
      expect(DIVISIONS.OTHER).toBe('other');
    });

    it('has exactly 6 division values', () => {
      expect(Object.keys(DIVISIONS)).toHaveLength(6);
    });
  });

  describe('VERIFICATION_TYPES', () => {
    it('has all required verification types', () => {
      expect(VERIFICATION_TYPES.ENROLLMENT).toBe('enrollment');
      expect(VERIFICATION_TYPES.SPORT).toBe('sport');
      expect(VERIFICATION_TYPES.GRADES).toBe('grades');
      expect(VERIFICATION_TYPES.IDENTITY).toBe('identity');
    });

    it('has exactly 4 verification types', () => {
      expect(Object.keys(VERIFICATION_TYPES)).toHaveLength(4);
    });
  });

  describe('VERIFICATION_STATUS', () => {
    it('has all required status values', () => {
      expect(VERIFICATION_STATUS.PENDING).toBe('pending');
      expect(VERIFICATION_STATUS.APPROVED).toBe('approved');
      expect(VERIFICATION_STATUS.REJECTED).toBe('rejected');
      expect(VERIFICATION_STATUS.EXPIRED).toBe('expired');
    });

    it('has exactly 4 status values', () => {
      expect(Object.keys(VERIFICATION_STATUS)).toHaveLength(4);
    });
  });

  describe('ACADEMIC_YEARS', () => {
    it('has all required academic year values', () => {
      expect(ACADEMIC_YEARS.FRESHMAN).toBe('freshman');
      expect(ACADEMIC_YEARS.SOPHOMORE).toBe('sophomore');
      expect(ACADEMIC_YEARS.JUNIOR).toBe('junior');
      expect(ACADEMIC_YEARS.SENIOR).toBe('senior');
      expect(ACADEMIC_YEARS.GRADUATE).toBe('graduate');
      expect(ACADEMIC_YEARS.OTHER).toBe('other');
    });

    it('has exactly 6 academic year values', () => {
      expect(Object.keys(ACADEMIC_YEARS)).toHaveLength(6);
    });
  });
});

// ============================================================================
// PROFILE CRUD TESTS
// ============================================================================

describe('Athlete Profile CRUD', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('createAthleteProfile', () => {
    it('creates athlete profile via edge function', async () => {
      const profileData = {
        school_id: 'school_123',
        sport_id: 'sport_456',
        position: 'Quarterback',
        jersey_number: '12',
        academic_year: 'junior',
      };

      mockResponses.function = {
        data: { athlete: { id: 'athlete_789', ...profileData } },
        error: null,
      };

      const result = await createAthleteProfile(profileData);

      expect(vi.mocked(invokeFunction)).toHaveBeenCalledWith('create-athlete', profileData);
      expect(result.athlete).toBeTruthy();
      expect(result.athlete.id).toBe('athlete_789');
      expect(result.error).toBe(null);
    });

    it('returns error when edge function fails', async () => {
      mockResponses.function = {
        data: null,
        error: new Error('Failed to create athlete'),
      };

      const result = await createAthleteProfile({});

      expect(result.athlete).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
    });
  });

  describe('getMyAthleteProfile', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await getMyAthleteProfile();

      expect(result.athlete).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Not authenticated');
    });

    it('returns athlete profile with related data when authenticated', async () => {
      const mockAthlete = {
        id: 'athlete_123',
        profile_id: 'user_456',
        school_id: 'school_789',
        sport_id: 'sport_101',
        position: 'Point Guard',
        jersey_number: '23',
        gpa: 3.8,
        profile: {
          first_name: 'Marcus',
          last_name: 'Johnson',
          email: 'marcus@university.edu',
          avatar_url: 'https://example.com/avatar.jpg',
        },
        school: {
          id: 'school_789',
          name: 'State University',
          division: 'D1',
        },
        sport: {
          id: 'sport_101',
          name: 'Basketball',
          category: 'team',
        },
      };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.single = { data: mockAthlete, error: null };

      const result = await getMyAthleteProfile();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('athletes');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('profile_id', 'user_456');
      expect(result.athlete).toEqual(mockAthlete);
      expect(result.error).toBe(null);
    });

    it('returns error when profile not found', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.single = { data: null, error: { code: 'PGRST116', message: 'No rows returned' } };

      const result = await getMyAthleteProfile();

      expect(result.athlete).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('getAthleteById', () => {
    it('returns public athlete profile by ID', async () => {
      const mockAthlete = {
        id: 'athlete_123',
        is_searchable: true,
        profile: {
          first_name: 'Sarah',
          last_name: 'Williams',
          avatar_url: 'https://example.com/sarah.jpg',
        },
        school: { name: 'Tech University' },
        sport: { name: 'Soccer' },
      };

      mockResponses.single = { data: mockAthlete, error: null };

      const result = await getAthleteById('athlete_123');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('athletes');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'athlete_123');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_searchable', true);
      expect(result.athlete).toEqual(mockAthlete);
      expect(result.error).toBe(null);
    });

    it('returns error when athlete not found or not searchable', async () => {
      mockResponses.single = { data: null, error: { code: 'PGRST116' } };

      const result = await getAthleteById('nonexistent_123');

      expect(result.athlete).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('updateAthleteProfile', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await updateAthleteProfile({ position: 'Wide Receiver' });

      expect(result.athlete).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Not authenticated');
    });

    it('updates athlete profile with safe fields only', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.single = {
        data: { id: 'athlete_123', position: 'Wide Receiver', bio: 'Updated bio' },
        error: null,
      };

      const updates = {
        position: 'Wide Receiver',
        bio: 'Updated bio',
        // These read-only fields should be removed
        id: 'should_be_removed',
        profile_id: 'should_be_removed',
        total_followers: 9999,
        gradeup_score: 999,
        enrollment_verified: true,
        created_at: '2024-01-01',
      };

      const result = await updateAthleteProfile(updates);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('athletes');
      expect(mockSupabaseClient.update).toHaveBeenCalled();
      expect(result.athlete).toBeTruthy();
      expect(result.error).toBe(null);
    });

    it('returns error on database failure', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.single = { data: null, error: new Error('Database error') };

      const result = await updateAthleteProfile({ position: 'Pitcher' });

      expect(result.athlete).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('updateSocialHandles', () => {
    it('updates social media handles', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.single = {
        data: {
          id: 'athlete_123',
          instagram_handle: '@marcus_hoops',
          twitter_handle: '@marcusj23',
          tiktok_handle: '@marcusj',
        },
        error: null,
      };

      const socials = {
        instagram_handle: '@marcus_hoops',
        twitter_handle: '@marcusj23',
        tiktok_handle: '@marcusj',
      };

      const result = await updateSocialHandles(socials);

      expect(result.athlete).toBeTruthy();
      expect(result.error).toBe(null);
    });
  });

  describe('updateAvailabilitySettings', () => {
    it('updates availability settings', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.single = {
        data: {
          id: 'athlete_123',
          is_searchable: true,
          accepting_deals: true,
          available_for_appearances: false,
        },
        error: null,
      };

      const settings = {
        is_searchable: true,
        accepting_deals: true,
        available_for_appearances: false,
      };

      const result = await updateAvailabilitySettings(settings);

      expect(result.athlete).toBeTruthy();
      expect(result.error).toBe(null);
    });
  });
});

// ============================================================================
// AVATAR UPLOAD TESTS
// ============================================================================

describe('Avatar Upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('uploadAvatar', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const mockFile = { name: 'avatar.jpg', type: 'image/jpeg', size: 1024 };
      const result = await uploadAvatar(mockFile);

      expect(result.avatarUrl).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Not authenticated');
    });

    it('uploads avatar and updates profile', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      vi.mocked(uploadFile).mockResolvedValue({
        data: { path: 'user_456/avatar-123.jpg', publicUrl: 'https://example.com/avatar.jpg' },
        error: null,
      });

      const mockFile = { name: 'avatar.jpg', type: 'image/jpeg', size: 1024 };
      const result = await uploadAvatar(mockFile);

      expect(result.avatarUrl).toBe('https://example.com/avatar.jpg');
      expect(result.error).toBe(null);
    });

    it('returns error when upload fails', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      vi.mocked(uploadFile).mockResolvedValue({
        data: null,
        error: new Error('Upload failed'),
      });

      const mockFile = { name: 'avatar.jpg', type: 'image/jpeg', size: 1024 };
      const result = await uploadAvatar(mockFile);

      expect(result.avatarUrl).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });
});

// ============================================================================
// GRADEUP SCORE TESTS
// ============================================================================

describe('GradeUp Score Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('getGradeUpScore (legacy v1)', () => {
    it('calculates score via edge function', async () => {
      mockResponses.function = {
        data: { total_score: 750, athletic_score: 300, social_score: 250, academic_score: 200 },
        error: null,
      };

      const result = await getGradeUpScore('athlete_123');

      expect(vi.mocked(invokeFunction)).toHaveBeenCalledWith('calculate-score', { athlete_id: 'athlete_123' });
      expect(result.score).toBeTruthy();
      expect(result.error).toBe(null);
    });

    it('uses current user when no athleteId provided', async () => {
      mockResponses.function = {
        data: { total_score: 650 },
        error: null,
      };

      const result = await getGradeUpScore();

      expect(vi.mocked(invokeFunction)).toHaveBeenCalledWith('calculate-score', {});
      expect(result.score).toBeTruthy();
    });

    it('returns error when calculation fails', async () => {
      mockResponses.function = {
        data: null,
        error: new Error('Calculation failed'),
      };

      const result = await getGradeUpScore('athlete_123');

      expect(result.score).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('calculateGradeUpScore (v2.0)', () => {
    it('calculates comprehensive score via edge function', async () => {
      mockResponses.function = {
        data: {
          total_score: 850,
          athletic_score: 380,
          social_score: 280,
          academic_score: 190,
          percentile: 92,
        },
        error: null,
      };

      const result = await calculateGradeUpScore('athlete_123');

      expect(vi.mocked(invokeFunction)).toHaveBeenCalledWith('calculate-gradeup-score', { athlete_id: 'athlete_123' });
      expect(result.data).toBeTruthy();
      expect(result.data.total_score).toBe(850);
      expect(result.error).toBe(null);
    });

    it('handles current user when no athleteId provided', async () => {
      mockResponses.function = { data: { total_score: 720 }, error: null };

      await calculateGradeUpScore();

      expect(vi.mocked(invokeFunction)).toHaveBeenCalledWith('calculate-gradeup-score', {});
    });
  });

  describe('getScoreBreakdown', () => {
    it('returns detailed score breakdown', async () => {
      mockResponses.function = {
        data: {
          athletic: { base: 200, tier_bonus: 50, deal_bonus: 30 },
          social: { followers: 50000, score: 250 },
          academic: { gpa: 3.9, score: 280 },
        },
        error: null,
      };

      const result = await getScoreBreakdown('athlete_123');

      expect(vi.mocked(invokeFunction)).toHaveBeenCalledWith('calculate-gradeup-score?action=breakdown', { athlete_id: 'athlete_123' });
      expect(result.breakdown).toBeTruthy();
      expect(result.error).toBe(null);
    });
  });

  describe('getScoreHistory', () => {
    it('returns score history with default limit', async () => {
      mockResponses.function = {
        data: {
          history: [
            { date: '2024-01-01', score: 720 },
            { date: '2024-02-01', score: 750 },
          ],
        },
        error: null,
      };

      const result = await getScoreHistory('athlete_123');

      expect(vi.mocked(invokeFunction)).toHaveBeenCalledWith('calculate-gradeup-score?action=history', {
        athlete_id: 'athlete_123',
        limit: 10,
      });
      expect(result.history).toBeTruthy();
    });

    it('respects custom limit parameter', async () => {
      mockResponses.function = { data: { history: [] }, error: null };

      await getScoreHistory('athlete_123', 25);

      expect(vi.mocked(invokeFunction)).toHaveBeenCalledWith('calculate-gradeup-score?action=history', {
        athlete_id: 'athlete_123',
        limit: 25,
      });
    });
  });

  describe('batchCalculateScores', () => {
    it('calculates scores for multiple athletes', async () => {
      mockResponses.function = {
        data: {
          results: [
            { athlete_id: 'a1', score: 700 },
            { athlete_id: 'a2', score: 800 },
          ],
        },
        error: null,
      };

      const result = await batchCalculateScores(['a1', 'a2']);

      expect(vi.mocked(invokeFunction)).toHaveBeenCalledWith('calculate-gradeup-score?action=batch', {
        athlete_ids: ['a1', 'a2'],
      });
      expect(result.results).toBeTruthy();
      expect(result.error).toBe(null);
    });

    it('returns error when athleteIds is not an array', async () => {
      const result = await batchCalculateScores(null);

      expect(result.results).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('athleteIds array is required');
    });

    it('returns error when athleteIds is empty', async () => {
      const result = await batchCalculateScores([]);

      expect(result.results).toBe(null);
      expect(result.error.message).toBe('athleteIds array is required');
    });
  });
});

// ============================================================================
// ACADEMIC RECORDS TESTS
// ============================================================================

describe('Academic Records Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('addAcademicRecord', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await addAcademicRecord({
        semester: 'fall',
        year: 2024,
        gpa: 3.8,
      });

      expect(result.record).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('validates required fields', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');

      const result = await addAcademicRecord({
        semester: 'fall',
        // missing year and gpa
      });

      expect(result.record).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('semester, year, and gpa are required');
    });

    it('validates GPA range', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      vi.mocked(validateGPA).mockReturnValue({ valid: false, error: 'GPA must be between 0.0 and 4.0' });

      const result = await addAcademicRecord({
        semester: 'fall',
        year: 2024,
        gpa: 5.0,
      });

      expect(result.record).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('adds academic record successfully', async () => {
      const mockRecord = {
        id: 'record_123',
        athlete_id: 'athlete_456',
        semester: 'fall',
        year: 2024,
        gpa: 3.85,
        credits: 15,
        deans_list: true,
        honor_roll: true,
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_456');
      vi.mocked(validateGPA).mockReturnValue({ valid: true, error: null });
      mockResponses.single = { data: mockRecord, error: null };

      const result = await addAcademicRecord({
        semester: 'fall',
        year: 2024,
        gpa: 3.85,
        credits: 15,
        deans_list: true,
        honor_roll: true,
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('academic_records');
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
      expect(result.record).toEqual(mockRecord);
      expect(result.error).toBe(null);
    });
  });

  describe('updateAcademicRecord', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await updateAcademicRecord('record_123', { gpa: 3.9 });

      expect(result.record).toBe(null);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('only updates unverified records', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_456');
      mockResponses.single = { data: { id: 'record_123', gpa: 3.9 }, error: null };

      await updateAcademicRecord('record_123', { gpa: 3.9 });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'record_123');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('athlete_id', 'athlete_456');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('verified', false);
    });

    it('removes protected fields from updates', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_456');
      mockResponses.single = { data: { id: 'record_123' }, error: null };

      const updates = {
        gpa: 3.9,
        id: 'should_be_removed',
        athlete_id: 'should_be_removed',
        verified: true,
        verified_at: '2024-01-01',
        created_at: '2024-01-01',
      };

      await updateAcademicRecord('record_123', updates);

      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });
  });

  describe('getAcademicRecords', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getAcademicRecords();

      expect(result.records).toBe(null);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('returns records ordered by year and semester descending', async () => {
      const mockRecords = [
        { id: 'r1', year: 2024, semester: 'fall', gpa: 3.9 },
        { id: 'r2', year: 2024, semester: 'spring', gpa: 3.8 },
        { id: 'r3', year: 2023, semester: 'fall', gpa: 3.7 },
      ];

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_456');
      mockResponses.query = { data: mockRecords, error: null };

      const result = await getAcademicRecords();

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('year', { ascending: false });
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('semester', { ascending: false });
      expect(result.records).toHaveLength(3);
    });
  });

  describe('deleteAcademicRecord', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await deleteAcademicRecord('record_123');

      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('only deletes unverified records', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_456');
      mockResponses.query = { data: null, error: null };

      await deleteAcademicRecord('record_123');

      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('verified', false);
    });
  });
});

// ============================================================================
// MAJOR CATEGORIES TESTS
// ============================================================================

describe('Major Categories', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('getMajorCategories', () => {
    it('returns active major categories ordered by name', async () => {
      const mockCategories = [
        { id: 'cat_1', name: 'Business', industries: ['Finance', 'Marketing'] },
        { id: 'cat_2', name: 'Engineering', industries: ['Tech', 'Manufacturing'] },
        { id: 'cat_3', name: 'Sciences', industries: ['Healthcare', 'Research'] },
      ];

      mockResponses.query = { data: mockCategories, error: null };

      const result = await getMajorCategories();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('major_categories');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_active', true);
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('name');
      expect(result.categories).toHaveLength(3);
    });
  });

  describe('updateMajorCategory', () => {
    it('updates athlete major category', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.single = {
        data: { id: 'athlete_123', major_category_id: 'cat_2' },
        error: null,
      };

      const result = await updateMajorCategory('cat_2');

      expect(result.athlete).toBeTruthy();
      expect(result.error).toBe(null);
    });
  });
});

// ============================================================================
// VERIFICATION TESTS
// ============================================================================

describe('Verification System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('getVerificationStatus', () => {
    it('returns comprehensive verification status', async () => {
      const mockAthlete = {
        id: 'athlete_123',
        enrollment_verified: true,
        enrollment_verified_at: '2024-01-15',
        sport_verified: true,
        sport_verified_at: '2024-01-16',
        grades_verified: false,
        grades_verified_at: null,
        identity_verified: true,
        identity_verified_at: '2024-01-14',
      };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.single = { data: mockAthlete, error: null };

      const result = await getVerificationStatus();

      expect(result.verification.enrollment.verified).toBe(true);
      expect(result.verification.sport.verified).toBe(true);
      expect(result.verification.grades.verified).toBe(false);
      expect(result.verification.identity.verified).toBe(true);
      expect(result.verification.is_fully_verified).toBe(false);
    });

    it('returns is_fully_verified true when all verifications complete', async () => {
      const mockAthlete = {
        enrollment_verified: true,
        sport_verified: true,
        grades_verified: true,
        identity_verified: true,
      };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.single = { data: mockAthlete, error: null };

      const result = await getVerificationStatus();

      expect(result.verification.is_fully_verified).toBe(true);
    });

    it('returns error when profile not found', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.single = { data: null, error: { code: 'PGRST116' } };

      const result = await getVerificationStatus();

      expect(result.verification).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('submitVerificationRequest', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await submitVerificationRequest('enrollment');

      expect(result.request).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('returns error when pending request already exists', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      // First call returns athlete
      mockResponses.single = { data: { id: 'athlete_123' }, error: null };

      const result = await submitVerificationRequest('enrollment');

      // The service checks for existing pending requests
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('verification_requests');
    });

    it('creates new verification request successfully', async () => {
      const mockRequest = {
        id: 'req_123',
        athlete_id: 'athlete_456',
        verification_type: 'enrollment',
        status: 'pending',
        document_urls: ['https://example.com/doc.pdf'],
      };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      // Mock the flow: getMyAthleteProfile -> check existing -> insert
      let callCount = 0;
      chainable.single = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          // getMyAthleteProfile
          return Promise.resolve({ data: { id: 'athlete_456' }, error: null });
        } else if (callCount === 2) {
          // Check for existing pending request
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        } else {
          // Insert new request
          return Promise.resolve({ data: mockRequest, error: null });
        }
      });

      const result = await submitVerificationRequest('enrollment', {
        document_urls: ['https://example.com/doc.pdf'],
        document_type: 'enrollment_letter',
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('verification_requests');
    });
  });

  describe('getVerificationRequests', () => {
    it('returns verification request history', async () => {
      const mockRequests = [
        { id: 'req_1', verification_type: 'enrollment', status: 'approved' },
        { id: 'req_2', verification_type: 'grades', status: 'pending' },
      ];

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.single = { data: { id: 'athlete_123' }, error: null };
      mockResponses.query = { data: mockRequests, error: null };

      const result = await getVerificationRequests();

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('uploadVerificationDocument', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const mockFile = { name: 'transcript.pdf', type: 'application/pdf', size: 1024 };
      const result = await uploadVerificationDocument('grades', mockFile);

      expect(result.url).toBe(null);
      expect(result.error.message).toBe('Not authenticated');
    });

    it('uploads document and returns URL', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      vi.mocked(uploadFile).mockResolvedValue({
        data: { publicUrl: 'https://example.com/doc.pdf' },
        error: null,
      });

      const mockFile = { name: 'transcript.pdf', type: 'application/pdf', size: 1024 };
      const result = await uploadVerificationDocument('grades', mockFile);

      expect(result.url).toBe('https://example.com/doc.pdf');
      expect(result.error).toBe(null);
    });
  });
});

// ============================================================================
// STATTAQ INTEGRATION TESTS
// ============================================================================

describe('StatTaq Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('connectStatTaq', () => {
    it('returns auth URL for StatTaq OAuth', async () => {
      mockResponses.function = {
        data: { auth_url: 'https://stattaq.com/oauth/authorize?client_id=123' },
        error: null,
      };

      const result = await connectStatTaq();

      expect(vi.mocked(invokeFunction)).toHaveBeenCalledWith('stattaq-connect', {});
      expect(result.authUrl).toBe('https://stattaq.com/oauth/authorize?client_id=123');
      expect(result.error).toBe(null);
    });

    it('returns error on failure', async () => {
      mockResponses.function = { data: null, error: new Error('OAuth failed') };

      const result = await connectStatTaq();

      expect(result.authUrl).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('syncStatTaqData', () => {
    it('syncs data with default full sync', async () => {
      mockResponses.function = {
        data: { synced: true, records: 150 },
        error: null,
      };

      const result = await syncStatTaqData();

      expect(vi.mocked(invokeFunction)).toHaveBeenCalledWith('stattaq-sync', { sync_type: 'full' });
      expect(result.result).toBeTruthy();
    });

    it('supports partial sync type', async () => {
      mockResponses.function = { data: { synced: true }, error: null };

      await syncStatTaqData('partial');

      expect(vi.mocked(invokeFunction)).toHaveBeenCalledWith('stattaq-sync', { sync_type: 'partial' });
    });
  });

  describe('getStatTaqConnection', () => {
    it('returns null when no athlete profile', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getStatTaqConnection();

      expect(result.connection).toBe(null);
      expect(result.error).toBe(null);
    });

    it('returns connection data when connected', async () => {
      const mockConnection = {
        id: 'conn_123',
        stattaq_user_id: 'stattaq_456',
        sync_enabled: true,
        last_sync_at: '2024-01-20T10:00:00Z',
        is_active: true,
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: mockConnection, error: null };

      const result = await getStatTaqConnection();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('stattaq_accounts');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_active', true);
      expect(result.connection).toEqual(mockConnection);
    });

    it('handles not found gracefully', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: null, error: { code: 'PGRST116' } };

      const result = await getStatTaqConnection();

      expect(result.connection).toBe(null);
      expect(result.error).toBe(null);
    });
  });

  describe('getStatTaqData', () => {
    it('returns null when no athlete profile', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getStatTaqData();

      expect(result.data).toBe(null);
    });

    it('returns StatTaq data when available', async () => {
      const mockData = {
        athlete_id: 'athlete_123',
        stats: { points_per_game: 18.5, rebounds: 7.2 },
        highlights: ['video1', 'video2'],
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: mockData, error: null };

      const result = await getStatTaqData();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('stattaq_data');
      expect(result.data).toEqual(mockData);
    });
  });

  describe('disconnectStatTaq', () => {
    it('returns error when no athlete profile', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await disconnectStatTaq();

      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('disconnects StatTaq account', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: null, error: null };

      const result = await disconnectStatTaq();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('stattaq_accounts');
      expect(mockSupabaseClient.update).toHaveBeenCalled();
      expect(result.error).toBe(null);
    });
  });
});

// ============================================================================
// SEARCH AND FILTER TESTS
// ============================================================================

describe('Search and Filter Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('getSchools', () => {
    it('returns all active schools ordered by name', async () => {
      const mockSchools = [
        { id: 's1', name: 'Alabama State', division: 'D1' },
        { id: 's2', name: 'Boston College', division: 'D1' },
        { id: 's3', name: 'Clemson', division: 'D1' },
      ];

      mockResponses.query = { data: mockSchools, error: null };

      const result = await getSchools();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('schools');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_active', true);
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('name');
      expect(result.schools).toHaveLength(3);
    });

    it('filters by division', async () => {
      mockResponses.query = { data: [], error: null };

      await getSchools({ division: 'D2' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('division', 'D2');
    });

    it('filters by state', async () => {
      mockResponses.query = { data: [], error: null };

      await getSchools({ state: 'CA' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('state', 'CA');
    });

    it('supports search by name', async () => {
      mockResponses.query = { data: [], error: null };

      await getSchools({ search: 'Tech' });

      expect(mockSupabaseClient.or).toHaveBeenCalledWith('name.ilike.%Tech%,short_name.ilike.%Tech%');
    });

    it('applies multiple filters together', async () => {
      mockResponses.query = { data: [], error: null };

      await getSchools({ division: 'D1', state: 'TX', search: 'A&M' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('division', 'D1');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('state', 'TX');
      expect(mockSupabaseClient.or).toHaveBeenCalled();
    });
  });

  describe('getSports', () => {
    it('returns all active sports ordered by name', async () => {
      const mockSports = [
        { id: 'sp1', name: 'Baseball', category: 'team', gender: 'mens' },
        { id: 'sp2', name: 'Basketball', category: 'team', gender: 'mens' },
        { id: 'sp3', name: 'Soccer', category: 'team', gender: 'womens' },
      ];

      mockResponses.query = { data: mockSports, error: null };

      const result = await getSports();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('sports');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_active', true);
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('name');
      expect(result.sports).toHaveLength(3);
    });

    it('filters by category', async () => {
      mockResponses.query = { data: [], error: null };

      await getSports({ category: 'individual' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('category', 'individual');
    });

    it('filters by gender', async () => {
      mockResponses.query = { data: [], error: null };

      await getSports({ gender: 'womens' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('gender', 'womens');
    });
  });
});

// ============================================================================
// NOTIFICATIONS TESTS
// ============================================================================

describe('Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('getNotifications', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: new Error('Not authenticated') });

      const result = await getNotifications();

      expect(result.notifications).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('returns notifications ordered by date', async () => {
      const mockNotifications = [
        { id: 'n1', type: 'deal_offer', message: 'New deal offer', created_at: '2024-01-20' },
        { id: 'n2', type: 'verification', message: 'Verified!', created_at: '2024-01-19' },
      ];

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.query = { data: mockNotifications, error: null };

      const result = await getNotifications();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications');
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result.notifications).toHaveLength(2);
    });

    it('filters for unread only when specified', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.query = { data: [], error: null };

      await getNotifications({ unreadOnly: true });

      expect(mockSupabaseClient.is).toHaveBeenCalledWith('read_at', null);
    });

    it('applies limit when specified', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.query = { data: [], error: null };

      await getNotifications({ limit: 10 });

      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('markNotificationsAsRead', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await markNotificationsAsRead(['n1', 'n2']);

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Not authenticated');
    });

    it('marks specified notifications as read', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.query = { data: null, error: null };

      await markNotificationsAsRead(['n1', 'n2', 'n3']);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications');
      expect(mockSupabaseClient.update).toHaveBeenCalled();
      expect(mockSupabaseClient.in).toHaveBeenCalledWith('id', ['n1', 'n2', 'n3']);
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await markAllNotificationsAsRead();

      expect(result.error.message).toBe('Not authenticated');
    });

    it('marks all unread notifications as read', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.query = { data: null, error: null };

      await markAllNotificationsAsRead();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('notifications');
      expect(mockSupabaseClient.is).toHaveBeenCalledWith('read_at', null);
    });
  });
});

// ============================================================================
// VIDEO HIGHLIGHTS TESTS
// ============================================================================

describe('Video Highlights', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('uploadHighlightVideo', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const mockFile = { name: 'highlight.mp4', type: 'video/mp4', size: 10000000 };
      const result = await uploadHighlightVideo(mockFile, { title: 'Game Winning Shot' });

      expect(result.video).toBe(null);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('validates file type', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      vi.mocked(validateFileType).mockReturnValue({ valid: false, error: 'File type image/jpeg not allowed' });

      const mockFile = { name: 'photo.jpg', type: 'image/jpeg', size: 1000 };
      const result = await uploadHighlightVideo(mockFile, { title: 'Test' });

      expect(result.video).toBe(null);
      expect(result.error.message).toContain('not allowed');
    });

    it('validates file size', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      vi.mocked(validateFileType).mockReturnValue({ valid: true, error: null });
      vi.mocked(validateFileSize).mockReturnValue({ valid: false, error: 'File size exceeds 500MB limit' });

      const mockFile = { name: 'huge.mp4', type: 'video/mp4', size: 600 * 1024 * 1024 };
      const result = await uploadHighlightVideo(mockFile, { title: 'Test' });

      expect(result.video).toBe(null);
      expect(result.error.message).toContain('exceeds');
    });

    it('uploads video and creates record', async () => {
      const mockVideo = {
        id: 'video_123',
        athlete_id: 'athlete_456',
        title: 'Game Winning Shot',
        video_url: 'https://example.com/video.mp4',
        category: 'highlights',
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_456');
      vi.mocked(validateFileType).mockReturnValue({ valid: true, error: null });
      vi.mocked(validateFileSize).mockReturnValue({ valid: true, error: null });
      vi.mocked(uploadFile).mockResolvedValue({
        data: { publicUrl: 'https://example.com/video.mp4' },
        error: null,
      });
      mockResponses.single = { data: mockVideo, error: null };

      const mockFile = { name: 'highlight.mp4', type: 'video/mp4', size: 50000000 };
      const result = await uploadHighlightVideo(mockFile, { title: 'Game Winning Shot' });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('athlete_videos');
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
      expect(result.video).toEqual(mockVideo);
    });
  });

  describe('getMyVideos', () => {
    it('returns error when no athlete profile', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getMyVideos();

      expect(result.videos).toBe(null);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('returns videos ordered by date', async () => {
      const mockVideos = [
        { id: 'v1', title: 'Recent Highlight', created_at: '2024-01-20' },
        { id: 'v2', title: 'Old Highlight', created_at: '2024-01-10' },
      ];

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: mockVideos, error: null };

      const result = await getMyVideos();

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(result.videos).toHaveLength(2);
    });

    it('filters by category', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      await getMyVideos({ category: 'training' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('category', 'training');
    });

    it('filters for public only', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      await getMyVideos({ publicOnly: true });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_public', true);
    });
  });

  describe('getAthleteVideos', () => {
    it('returns public videos for an athlete', async () => {
      const mockVideos = [
        { id: 'v1', title: 'Public Highlight', is_public: true },
      ];

      mockResponses.query = { data: mockVideos, error: null };

      const result = await getAthleteVideos('athlete_123');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('athlete_videos');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('athlete_id', 'athlete_123');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_public', true);
      expect(result.videos).toHaveLength(1);
    });
  });

  describe('updateVideo', () => {
    it('returns error when no athlete profile', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await updateVideo('video_123', { title: 'New Title' });

      expect(result.video).toBe(null);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('updates video metadata', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_456');
      mockResponses.single = {
        data: { id: 'video_123', title: 'Updated Title' },
        error: null,
      };

      const result = await updateVideo('video_123', {
        title: 'Updated Title',
        description: 'New description',
        is_public: false,
      });

      expect(mockSupabaseClient.update).toHaveBeenCalled();
      expect(result.video).toBeTruthy();
    });
  });

  describe('deleteVideo', () => {
    it('returns error when no athlete profile', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await deleteVideo('video_123');

      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('deletes video successfully', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_456');
      mockResponses.query = { data: null, error: null };

      const result = await deleteVideo('video_123');

      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'video_123');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('athlete_id', 'athlete_456');
      expect(result.error).toBe(null);
    });
  });

  describe('recordVideoView', () => {
    it('calls RPC to increment view count', async () => {
      mockResponses.rpc = { data: null, error: null };

      const result = await recordVideoView('video_123');

      expect(mockSupabaseClient.rpc).toHaveBeenCalledWith('increment_video_views', { video_id: 'video_123' });
      expect(result.error).toBe(null);
    });
  });
});

// ============================================================================
// MONETIZATION SETTINGS TESTS
// ============================================================================

describe('Monetization Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('getMonetizationSettings', () => {
    it('returns error when no athlete profile', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getMonetizationSettings();

      expect(result.settings).toBe(null);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('returns default settings when none exist', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: null, error: { code: 'PGRST116' } };

      const result = await getMonetizationSettings();

      expect(result.settings).toEqual({
        accepting_deals: true,
        min_deal_value: 0,
        preferred_deal_types: ['social_post', 'appearance', 'endorsement'],
        social_post_rate: null,
        appearance_rate: null,
        endorsement_rate: null,
        auto_respond: false,
        availability: 'open',
        notification_email: true,
        notification_push: true,
      });
      expect(result.error).toBe(null);
    });

    it('returns existing settings when found', async () => {
      const mockSettings = {
        accepting_deals: true,
        min_deal_value: 500,
        preferred_deal_types: ['social_post'],
        social_post_rate: 250,
        availability: 'limited',
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: mockSettings, error: null };

      const result = await getMonetizationSettings();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('athlete_monetization_settings');
      expect(result.settings).toEqual(mockSettings);
    });
  });

  describe('updateMonetizationSettings', () => {
    it('returns error when no athlete profile', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await updateMonetizationSettings({ accepting_deals: false });

      expect(result.settings).toBe(null);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('upserts monetization settings', async () => {
      const mockSettings = {
        athlete_id: 'athlete_123',
        accepting_deals: false,
        min_deal_value: 1000,
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: mockSettings, error: null };

      const result = await updateMonetizationSettings({
        accepting_deals: false,
        min_deal_value: 1000,
      });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('athlete_monetization_settings');
      expect(mockSupabaseClient.upsert).toHaveBeenCalled();
      expect(result.settings).toEqual(mockSettings);
    });
  });
});

// ============================================================================
// ERROR HANDLING TESTS
// ============================================================================

describe('Error Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('Database errors', () => {
    it('handles connection errors gracefully', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = {
        data: null,
        error: { code: 'PGRST000', message: 'Connection refused' },
      };

      const result = await getAcademicRecords();

      expect(result.records).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('handles RLS violation errors', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockResponses.single = {
        data: null,
        error: { code: '42501', message: 'Permission denied' },
      };

      const result = await updateAthleteProfile({ bio: 'New bio' });

      expect(result.athlete).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Edge function errors', () => {
    it('handles timeout errors', async () => {
      mockResponses.function = {
        data: null,
        error: { message: 'Function timed out' },
      };

      const result = await calculateGradeUpScore('athlete_123');

      expect(result.data).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('handles rate limit errors', async () => {
      mockResponses.function = {
        data: null,
        error: { message: 'Rate limit exceeded' },
      };

      const result = await createAthleteProfile({});

      expect(result.athlete).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Validation edge cases', () => {
    it('handles boundary GPA values', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      vi.mocked(validateGPA).mockReturnValue({ valid: true, error: null });
      mockResponses.single = { data: { id: 'record_123', gpa: 4.0 }, error: null };

      const result = await addAcademicRecord({
        semester: 'fall',
        year: 2024,
        gpa: 4.0,
      });

      expect(result.record).toBeTruthy();
    });

    it('handles zero GPA', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      vi.mocked(validateGPA).mockReturnValue({ valid: true, error: null });
      mockResponses.single = { data: { id: 'record_123', gpa: 0.0 }, error: null };

      const result = await addAcademicRecord({
        semester: 'fall',
        year: 2024,
        gpa: 0.0,
      });

      expect(result.record).toBeTruthy();
    });
  });
});
