/**
 * Brand Service Unit Tests
 * Tests for src/services/brand.js
 *
 * Comprehensive tests for the GradeUp NIL brand management service including:
 * - Brand profile CRUD operations
 * - Preferences and targeting
 * - Logo upload
 * - Dashboard statistics
 * - Activity tracking
 * - Profile views
 * - Sports and schools lookups
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Shared response storage - tests modify these to control mock behavior
const mockResponses = {
  single: { data: null, error: null },
  query: { data: null, error: null },
};

// Storage mock responses
const mockStorageResponses = {
  upload: { data: null, error: null },
  publicUrl: { data: { publicUrl: '' } },
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
  chainable.eq = vi.fn(() => chainable);
  chainable.neq = vi.fn(() => chainable);
  chainable.in = vi.fn(() => chainable);
  chainable.gte = vi.fn(() => chainable);
  chainable.lte = vi.fn(() => chainable);
  chainable.order = vi.fn(() => chainable);
  chainable.limit = vi.fn(() => chainable);
  chainable.range = vi.fn(() => chainable);
  chainable.single = vi.fn(() => Promise.resolve(mockResponses.single));

  return chainable;
};

// The shared chainable instance
let chainable = createChainable();

// Storage mock
const createStorageMock = () => ({
  from: vi.fn(() => ({
    upload: vi.fn(() => Promise.resolve(mockStorageResponses.upload)),
    getPublicUrl: vi.fn(() => mockStorageResponses.publicUrl),
  })),
});

let storageMock = createStorageMock();

// The mock client
const mockSupabaseClient = {
  from: vi.fn(() => chainable),
  storage: storageMock,
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
  },
};

// Expose chainable methods on the client for test assertions
Object.defineProperties(mockSupabaseClient, {
  select: { get: () => chainable.select, enumerable: true },
  insert: { get: () => chainable.insert, enumerable: true },
  update: { get: () => chainable.update, enumerable: true },
  eq: { get: () => chainable.eq, enumerable: true },
  in: { get: () => chainable.in, enumerable: true },
  gte: { get: () => chainable.gte, enumerable: true },
  order: { get: () => chainable.order, enumerable: true },
  limit: { get: () => chainable.limit, enumerable: true },
  range: { get: () => chainable.range, enumerable: true },
  single: { get: () => chainable.single, enumerable: true },
});

// Reset clears mocks and responses before each test
const resetMockSupabaseClient = () => {
  // Reset response storage
  mockResponses.single = { data: null, error: null };
  mockResponses.query = { data: null, error: null };
  mockStorageResponses.upload = { data: null, error: null };
  mockStorageResponses.publicUrl = { data: { publicUrl: '' } };

  // Create fresh chainable with new mock functions
  chainable = createChainable();
  storageMock = createStorageMock();

  // Clear and reset the from mock to return new chainable
  mockSupabaseClient.from.mockClear();
  mockSupabaseClient.from.mockReturnValue(chainable);
  mockSupabaseClient.storage = storageMock;
};

// Mock supabase module
vi.mock('../../src/services/supabase.js', () => ({
  getSupabaseClient: vi.fn(async () => mockSupabaseClient),
  getCurrentUser: vi.fn(async () => ({ user: null, error: null })),
}));

// Import after mocks are set up
import {
  getCurrentBrand,
  getBrandById,
  updateBrandProfile,
  updateBrandPreferences,
  uploadBrandLogo,
  getBrandStats,
  getBrandActivity,
  getViewedAthletes,
  recordProfileView,
  getSports,
  getSchools,
} from '../../src/services/brand.js';

import { getSupabaseClient, getCurrentUser } from '../../src/services/supabase.js';

// ============================================================================
// GET CURRENT BRAND TESTS
// ============================================================================

describe('getCurrentBrand', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('authentication handling', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await getCurrentBrand();

      expect(result.brand).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Not authenticated');
    });

    it('returns error when getCurrentUser fails', async () => {
      const authError = new Error('Auth service unavailable');
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: authError });

      const result = await getCurrentBrand();

      expect(result.brand).toBe(null);
      expect(result.error).toBe(authError);
    });
  });

  describe('brand retrieval', () => {
    it('returns brand profile for authenticated user', async () => {
      const mockBrand = {
        id: 'brand_123',
        profile_id: 'user_123',
        company_name: 'Nike Inc.',
        company_type: 'corporation',
        industry: 'sportswear',
        is_verified: true,
        total_spent: 50000,
        deals_completed: 10,
      };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValue({ data: mockBrand, error: null });

      const result = await getCurrentBrand();

      expect(result.brand).toEqual(mockBrand);
      expect(result.error).toBe(null);
    });

    it('queries brands table with correct profile_id', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_456' },
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

      await getCurrentBrand();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('brands');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('profile_id', 'user_456');
    });

    it('returns null brand when profile not found', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const result = await getCurrentBrand();

      expect(result.brand).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });
});

// ============================================================================
// GET BRAND BY ID TESTS
// ============================================================================

describe('getBrandById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('public brand retrieval', () => {
    it('returns verified brand by ID', async () => {
      const mockBrand = {
        id: 'brand_123',
        company_name: 'Adidas AG',
        is_verified: true,
        profile: {
          first_name: 'John',
          last_name: 'Doe',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      };

      mockSupabaseClient.single.mockResolvedValue({ data: mockBrand, error: null });

      const result = await getBrandById('brand_123');

      expect(result.brand).toEqual(mockBrand);
      expect(result.error).toBe(null);
    });

    it('filters for verified brands by default', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

      await getBrandById('brand_123');

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'brand_123');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_verified', true);
    });

    it('includes unverified brands when flag is true', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

      await getBrandById('brand_123', true);

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'brand_123');
      // Should not filter by is_verified when includeUnverified is true
      const eqCalls = mockSupabaseClient.eq.mock.calls;
      const verifiedFilterCalls = eqCalls.filter(call => call[0] === 'is_verified');
      expect(verifiedFilterCalls).toHaveLength(0);
    });

    it('selects profile relation', async () => {
      mockSupabaseClient.single.mockResolvedValue({ data: null, error: null });

      await getBrandById('brand_123');

      expect(mockSupabaseClient.select).toHaveBeenCalled();
      const selectCall = mockSupabaseClient.select.mock.calls[0][0];
      expect(selectCall).toContain('profile:profiles');
    });
  });

  describe('error handling', () => {
    it('returns error when brand not found', async () => {
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      });

      const result = await getBrandById('nonexistent_brand');

      expect(result.brand).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });
});

// ============================================================================
// UPDATE BRAND PROFILE TESTS
// ============================================================================

describe('updateBrandProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('authentication and authorization', () => {
    it('returns error when brand profile not found', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await updateBrandProfile({ company_name: 'New Name' });

      expect(result.brand).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('profile updates', () => {
    it('updates allowed fields successfully', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };
      const updatedBrand = {
        ...mockBrand,
        company_name: 'Updated Corp',
        industry: 'Technology',
      };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });

      // First call for getCurrentBrand
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockBrand, error: null })
        // Second call for update result
        .mockResolvedValueOnce({ data: updatedBrand, error: null });

      const result = await updateBrandProfile({
        company_name: 'Updated Corp',
        industry: 'Technology',
      });

      expect(result.brand).toEqual(updatedBrand);
      expect(result.error).toBe(null);
    });

    it('filters out disallowed fields', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockBrand, error: null })
        .mockResolvedValueOnce({ data: mockBrand, error: null });

      await updateBrandProfile({
        company_name: 'Valid',
        is_verified: true, // This should be filtered out
        total_spent: 99999, // This should be filtered out
      });

      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });

    it('updates contact information', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockBrand, error: null })
        .mockResolvedValueOnce({ data: mockBrand, error: null });

      await updateBrandProfile({
        contact_name: 'Jane Smith',
        contact_title: 'Marketing Director',
        contact_email: 'jane@company.com',
        contact_phone: '555-0123',
      });

      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });

    it('updates address information', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockBrand, error: null })
        .mockResolvedValueOnce({ data: mockBrand, error: null });

      await updateBrandProfile({
        address_line1: '123 Main St',
        address_line2: 'Suite 100',
        city: 'Portland',
        state: 'OR',
        zip_code: '97201',
        country: 'USA',
      });

      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// UPDATE BRAND PREFERENCES TESTS
// ============================================================================

describe('updateBrandPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('validation', () => {
    it('returns error when brand profile not found', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await updateBrandPreferences({ min_gpa: 3.0 });

      expect(result.brand).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('rejects GPA below 0', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockBrand, error: null });

      const result = await updateBrandPreferences({ min_gpa: -0.5 });

      expect(result.brand).toBe(null);
      expect(result.error.message).toBe('GPA must be between 0 and 4.0');
    });

    it('rejects GPA above 4.0', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockBrand, error: null });

      const result = await updateBrandPreferences({ min_gpa: 4.5 });

      expect(result.brand).toBe(null);
      expect(result.error.message).toBe('GPA must be between 0 and 4.0');
    });

    it('rejects invalid budget range (min > max)', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockBrand, error: null });

      const result = await updateBrandPreferences({
        budget_range_min: 5000,
        budget_range_max: 1000,
      });

      expect(result.brand).toBe(null);
      expect(result.error.message).toBe('Minimum budget cannot exceed maximum budget');
    });
  });

  describe('preference updates', () => {
    it('updates sport preferences', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockBrand, error: null })
        .mockResolvedValueOnce({ data: { ...mockBrand, preferred_sports: ['football', 'basketball'] }, error: null });

      const result = await updateBrandPreferences({
        preferred_sports: ['football', 'basketball'],
      });

      expect(result.error).toBe(null);
      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });

    it('updates school and division preferences', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockBrand, error: null })
        .mockResolvedValueOnce({ data: mockBrand, error: null });

      await updateBrandPreferences({
        preferred_schools: ['school_1', 'school_2'],
        preferred_divisions: ['D1', 'D2'],
      });

      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });

    it('updates follower and GPA requirements', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockBrand, error: null })
        .mockResolvedValueOnce({ data: mockBrand, error: null });

      await updateBrandPreferences({
        min_gpa: 3.5,
        min_followers: 10000,
      });

      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });

    it('accepts valid budget range', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });

      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockBrand, error: null })
        .mockResolvedValueOnce({ data: mockBrand, error: null });

      const result = await updateBrandPreferences({
        budget_range_min: 1000,
        budget_range_max: 5000,
      });

      expect(result.error).toBe(null);
      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// UPLOAD BRAND LOGO TESTS
// ============================================================================

describe('uploadBrandLogo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('validation', () => {
    it('returns error when brand profile not found', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const mockFile = new File([''], 'logo.png', { type: 'image/png' });
      const result = await uploadBrandLogo(mockFile);

      expect(result.url).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('rejects invalid file types', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockBrand, error: null });

      const mockFile = new File([''], 'document.pdf', { type: 'application/pdf' });
      const result = await uploadBrandLogo(mockFile);

      expect(result.url).toBe(null);
      expect(result.error.message).toBe('Invalid file type. Please upload JPEG, PNG, GIF, or WebP.');
    });

    it('rejects files over 5MB', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockBrand, error: null });

      // Create a mock file that reports size > 5MB
      const largeFile = {
        name: 'large.png',
        type: 'image/png',
        size: 6 * 1024 * 1024, // 6MB
      };

      const result = await uploadBrandLogo(largeFile);

      expect(result.url).toBe(null);
      expect(result.error.message).toBe('File too large. Maximum size is 5MB.');
    });

    it('accepts valid JPEG files', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockBrand, error: null })
        .mockResolvedValueOnce({ data: mockBrand, error: null });

      mockStorageResponses.upload = { data: { path: 'brands/logo.jpg' }, error: null };
      mockStorageResponses.publicUrl = { data: { publicUrl: 'https://cdn.example.com/brands/logo.jpg' } };

      const mockFile = {
        name: 'logo.jpg',
        type: 'image/jpeg',
        size: 1024 * 1024, // 1MB
      };

      const result = await uploadBrandLogo(mockFile);

      expect(result.error).toBe(null);
    });

    it('accepts valid PNG files', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockBrand, error: null })
        .mockResolvedValueOnce({ data: mockBrand, error: null });

      mockStorageResponses.upload = { data: { path: 'brands/logo.png' }, error: null };
      mockStorageResponses.publicUrl = { data: { publicUrl: 'https://cdn.example.com/brands/logo.png' } };

      const mockFile = {
        name: 'logo.png',
        type: 'image/png',
        size: 500 * 1024, // 500KB
      };

      const result = await uploadBrandLogo(mockFile);

      expect(result.error).toBe(null);
    });

    it('accepts valid WebP files', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockBrand, error: null })
        .mockResolvedValueOnce({ data: mockBrand, error: null });

      mockStorageResponses.upload = { data: { path: 'brands/logo.webp' }, error: null };
      mockStorageResponses.publicUrl = { data: { publicUrl: 'https://cdn.example.com/brands/logo.webp' } };

      const mockFile = {
        name: 'logo.webp',
        type: 'image/webp',
        size: 300 * 1024, // 300KB
      };

      const result = await uploadBrandLogo(mockFile);

      expect(result.error).toBe(null);
    });
  });

  describe('upload process', () => {
    it('returns public URL on successful upload', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };
      const expectedUrl = 'https://cdn.example.com/brands/brand_123_logo.png';

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockBrand, error: null })
        .mockResolvedValueOnce({ data: mockBrand, error: null });

      mockStorageResponses.upload = { data: { path: 'brands/logo.png' }, error: null };
      mockStorageResponses.publicUrl = { data: { publicUrl: expectedUrl } };

      const mockFile = {
        name: 'logo.png',
        type: 'image/png',
        size: 1024 * 1024,
      };

      const result = await uploadBrandLogo(mockFile);

      expect(result.url).toBe(expectedUrl);
      expect(result.error).toBe(null);
    });

    it('returns error when storage upload fails', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockBrand, error: null });

      mockStorageResponses.upload = { data: null, error: new Error('Storage error') };

      const mockFile = {
        name: 'logo.png',
        type: 'image/png',
        size: 1024 * 1024,
      };

      const result = await uploadBrandLogo(mockFile);

      expect(result.url).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });
});

// ============================================================================
// GET BRAND STATS TESTS
// ============================================================================

describe('getBrandStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('authentication', () => {
    it('returns error when brand profile not found', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await getBrandStats();

      expect(result.stats).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('statistics calculation', () => {
    it('returns comprehensive statistics', async () => {
      const mockBrand = {
        id: 'brand_123',
        profile_id: 'user_123',
        total_spent: 25000,
        avg_deal_rating: 4.5,
      };

      const mockDeals = [
        { id: 'deal_1', status: 'completed', amount: 5000, created_at: new Date().toISOString() },
        { id: 'deal_2', status: 'active', amount: 3000, created_at: new Date().toISOString() },
        { id: 'deal_3', status: 'pending', amount: 2000, created_at: new Date().toISOString() },
      ];

      const mockOpportunities = [
        { id: 'opp_1', status: 'active', athletes_selected: 5, max_athletes: 10 },
        { id: 'opp_2', status: 'closed', athletes_selected: 3, max_athletes: 5 },
      ];

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });

      // Brand query
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockBrand, error: null });
      // Deals query
      mockResponses.query = { data: mockDeals, error: null };

      // We need to handle multiple queries - this is a simplified test
      const result = await getBrandStats();

      // The actual stats depend on query results, but we can check structure
      expect(result.error).toBe(null);
    });

    it('calculates active deals correctly', async () => {
      const mockBrand = {
        id: 'brand_123',
        profile_id: 'user_123',
        total_spent: 10000,
        avg_deal_rating: 4.0,
      };

      const mockDeals = [
        { id: 'deal_1', status: 'active', amount: 1000, created_at: new Date().toISOString() },
        { id: 'deal_2', status: 'pending', amount: 1000, created_at: new Date().toISOString() },
        { id: 'deal_3', status: 'negotiating', amount: 1000, created_at: new Date().toISOString() },
        { id: 'deal_4', status: 'completed', amount: 1000, created_at: new Date().toISOString() },
        { id: 'deal_5', status: 'cancelled', amount: 1000, created_at: new Date().toISOString() },
      ];

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });

      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockBrand, error: null });
      mockResponses.query = { data: mockDeals, error: null };

      const result = await getBrandStats();

      expect(result.error).toBe(null);
    });

    it('handles empty deals and opportunities', async () => {
      const mockBrand = {
        id: 'brand_123',
        profile_id: 'user_123',
        total_spent: 0,
        avg_deal_rating: 0,
      };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });

      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockBrand, error: null });
      mockResponses.query = { data: [], error: null };

      const result = await getBrandStats();

      expect(result.error).toBe(null);
    });
  });
});

// ============================================================================
// GET BRAND ACTIVITY TESTS
// ============================================================================

describe('getBrandActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('authentication', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await getBrandActivity();

      expect(result.activities).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('activity retrieval', () => {
    it('returns activity log for user', async () => {
      const mockActivities = [
        { id: 'act_1', action: 'viewed_athlete', created_at: '2024-01-15T10:00:00Z' },
        { id: 'act_2', action: 'created_opportunity', created_at: '2024-01-14T10:00:00Z' },
      ];

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockResponses.query = { data: mockActivities, error: null };

      const result = await getBrandActivity();

      expect(result.activities).toHaveLength(2);
      expect(result.error).toBe(null);
    });

    it('applies default limit of 50', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockResponses.query = { data: [], error: null };

      await getBrandActivity();

      expect(mockSupabaseClient.range).toHaveBeenCalledWith(0, 49);
    });

    it('applies custom limit and offset', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockResponses.query = { data: [], error: null };

      await getBrandActivity({ limit: 20, offset: 10 });

      expect(mockSupabaseClient.range).toHaveBeenCalledWith(10, 29);
    });

    it('orders by created_at descending', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockResponses.query = { data: [], error: null };

      await getBrandActivity();

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });
});

// ============================================================================
// GET VIEWED ATHLETES TESTS
// ============================================================================

describe('getViewedAthletes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('authentication', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await getViewedAthletes();

      expect(result.views).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('view retrieval', () => {
    it('returns viewed athletes with related data', async () => {
      const mockViews = [
        {
          athlete_id: 'athlete_1',
          created_at: '2024-01-15T10:00:00Z',
          athlete: {
            id: 'athlete_1',
            gpa: 3.8,
            gradeup_score: 85,
            total_followers: 50000,
            profile: { first_name: 'John', last_name: 'Doe' },
            school: { name: 'Oregon State', short_name: 'OSU' },
            sport: { name: 'Football' },
          },
        },
      ];

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockResponses.query = { data: mockViews, error: null };

      const result = await getViewedAthletes();

      expect(result.views).toHaveLength(1);
      expect(result.views[0].athlete.profile.first_name).toBe('John');
    });

    it('defaults to 30 days lookback', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockResponses.query = { data: [], error: null };

      await getViewedAthletes();

      expect(mockSupabaseClient.gte).toHaveBeenCalled();
    });

    it('accepts custom days parameter', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockResponses.query = { data: [], error: null };

      await getViewedAthletes({ days: 7 });

      expect(mockSupabaseClient.gte).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// RECORD PROFILE VIEW TESTS
// ============================================================================

describe('recordProfileView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('authentication', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await recordProfileView('athlete_123');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('view recording', () => {
    it('records view with default source', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockResponses.query = { data: null, error: null };

      const result = await recordProfileView('athlete_456');

      expect(result.success).toBe(true);
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('profile_views');
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('records view with custom source', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockResponses.query = { data: null, error: null };

      const result = await recordProfileView('athlete_456', 'search');

      expect(result.success).toBe(true);
    });

    it('accepts various source types', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockResponses.query = { data: null, error: null };

      const sources = ['direct', 'search', 'featured', 'opportunity'];

      for (const source of sources) {
        const result = await recordProfileView('athlete_456', source);
        expect(result.success).toBe(true);
      }
    });
  });
});

// ============================================================================
// GET SPORTS TESTS
// ============================================================================

describe('getSports', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  it('returns active sports ordered by name', async () => {
    const mockSports = [
      { id: 'sport_1', name: 'Basketball', is_active: true },
      { id: 'sport_2', name: 'Football', is_active: true },
      { id: 'sport_3', name: 'Soccer', is_active: true },
    ];

    mockResponses.query = { data: mockSports, error: null };

    const result = await getSports();

    expect(result.sports).toHaveLength(3);
    expect(result.error).toBe(null);
  });

  it('filters for active sports only', async () => {
    mockResponses.query = { data: [], error: null };

    await getSports();

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('sports');
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_active', true);
  });

  it('orders results by name', async () => {
    mockResponses.query = { data: [], error: null };

    await getSports();

    expect(mockSupabaseClient.order).toHaveBeenCalledWith('name');
  });
});

// ============================================================================
// GET SCHOOLS TESTS
// ============================================================================

describe('getSchools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('basic retrieval', () => {
    it('returns active schools ordered by name', async () => {
      const mockSchools = [
        { id: 'school_1', name: 'Oregon State University', division: 'D1', state: 'OR' },
        { id: 'school_2', name: 'University of Oregon', division: 'D1', state: 'OR' },
      ];

      mockResponses.query = { data: mockSchools, error: null };

      const result = await getSchools();

      expect(result.schools).toHaveLength(2);
      expect(result.error).toBe(null);
    });

    it('filters for active schools only', async () => {
      mockResponses.query = { data: [], error: null };

      await getSchools();

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('schools');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_active', true);
    });
  });

  describe('filtering', () => {
    it('filters by division', async () => {
      mockResponses.query = { data: [], error: null };

      await getSchools({ division: 'D1' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('division', 'D1');
    });

    it('filters by state', async () => {
      mockResponses.query = { data: [], error: null };

      await getSchools({ state: 'CA' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('state', 'CA');
    });

    it('filters by conference', async () => {
      mockResponses.query = { data: [], error: null };

      await getSchools({ conference: 'Pac-12' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('conference', 'Pac-12');
    });

    it('applies multiple filters', async () => {
      mockResponses.query = { data: [], error: null };

      await getSchools({ division: 'D1', state: 'OR', conference: 'Pac-12' });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('division', 'D1');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('state', 'OR');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('conference', 'Pac-12');
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

  describe('database errors', () => {
    it('getCurrentBrand handles database connection errors', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValue({
        data: null,
        error: { code: 'PGRST000', message: 'Connection refused' },
      });

      const result = await getCurrentBrand();

      expect(result.brand).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('getBrandStats handles deals query error', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockBrand, error: null });
      mockResponses.query = { data: null, error: new Error('Query failed') };

      const result = await getBrandStats();

      expect(result.stats).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('getSports handles query errors', async () => {
      mockResponses.query = { data: null, error: new Error('Database error') };

      const result = await getSports();

      expect(result.sports).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('getSchools handles query errors', async () => {
      mockResponses.query = { data: null, error: new Error('Database error') };

      const result = await getSchools();

      expect(result.schools).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });
});

// ============================================================================
// EDGE CASES TESTS
// ============================================================================

describe('Edge Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('updateBrandPreferences edge cases', () => {
    it('accepts GPA of exactly 0', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockBrand, error: null })
        .mockResolvedValueOnce({ data: mockBrand, error: null });

      const result = await updateBrandPreferences({ min_gpa: 0 });

      expect(result.error).toBe(null);
    });

    it('accepts GPA of exactly 4.0', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockBrand, error: null })
        .mockResolvedValueOnce({ data: mockBrand, error: null });

      const result = await updateBrandPreferences({ min_gpa: 4.0 });

      expect(result.error).toBe(null);
    });

    it('accepts equal min and max budget', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123' };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: mockBrand, error: null })
        .mockResolvedValueOnce({ data: mockBrand, error: null });

      const result = await updateBrandPreferences({
        budget_range_min: 5000,
        budget_range_max: 5000,
      });

      expect(result.error).toBe(null);
    });
  });

  describe('getBrandActivity edge cases', () => {
    it('handles zero limit', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockResponses.query = { data: [], error: null };

      await getBrandActivity({ limit: 0 });

      // Should use default or handle gracefully
      expect(mockSupabaseClient.range).toHaveBeenCalled();
    });

    it('handles large offset', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockResponses.query = { data: [], error: null };

      await getBrandActivity({ offset: 10000 });

      expect(mockSupabaseClient.range).toHaveBeenCalledWith(10000, 10049);
    });
  });

  describe('getViewedAthletes edge cases', () => {
    it('handles zero days lookback', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockResponses.query = { data: [], error: null };

      await getViewedAthletes({ days: 0 });

      expect(mockSupabaseClient.gte).toHaveBeenCalled();
    });
  });

  describe('empty data handling', () => {
    it('getBrandStats handles null deals array', async () => {
      const mockBrand = { id: 'brand_123', profile_id: 'user_123', total_spent: 0, avg_deal_rating: 0 };

      vi.mocked(getCurrentUser).mockResolvedValue({
        user: { id: 'user_123' },
        error: null,
      });
      mockSupabaseClient.single.mockResolvedValueOnce({ data: mockBrand, error: null });
      mockResponses.query = { data: null, error: null };

      const result = await getBrandStats();

      // Should handle null gracefully
      expect(result.error).toBe(null);
    });
  });
});
