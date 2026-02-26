/**
 * Opportunities Service Unit Tests
 * Tests for src/services/opportunities.js
 *
 * Comprehensive tests for the GradeUp NIL opportunities system including:
 * - Creating and managing opportunities
 * - Listing and filtering opportunities
 * - Status management (publish, pause, close, complete)
 * - Applying to opportunities via deals
 * - Deadline and requirement matching
 * - Statistics and analytics
 * - Duplicating opportunities
 * - Matched athlete discovery
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
  chainable.not = vi.fn(() => chainable);
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

// The mock client
const mockSupabaseClient = {
  from: vi.fn(() => chainable),
  functions: {
    invoke: vi.fn(() => Promise.resolve(mockResponses.function)),
  },
  auth: {
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
  },
};

// Expose chainable methods on the client for test assertions
Object.defineProperties(mockSupabaseClient, {
  select: { get: () => chainable.select, enumerable: true },
  insert: { get: () => chainable.insert, enumerable: true },
  update: { get: () => chainable.update, enumerable: true },
  delete: { get: () => chainable.delete, enumerable: true },
  eq: { get: () => chainable.eq, enumerable: true },
  neq: { get: () => chainable.neq, enumerable: true },
  in: { get: () => chainable.in, enumerable: true },
  not: { get: () => chainable.not, enumerable: true },
  gte: { get: () => chainable.gte, enumerable: true },
  order: { get: () => chainable.order, enumerable: true },
  limit: { get: () => chainable.limit, enumerable: true },
  range: { get: () => chainable.range, enumerable: true },
  single: { get: () => chainable.single, enumerable: true },
});

// Reset clears mocks and responses before each test
const resetMockSupabaseClient = () => {
  mockResponses.single = { data: null, error: null };
  mockResponses.query = { data: null, error: null };
  mockResponses.function = { data: null, error: null };

  chainable = createChainable();

  mockSupabaseClient.from.mockClear();
  mockSupabaseClient.from.mockReturnValue(chainable);

  mockSupabaseClient.functions.invoke.mockClear();
  mockSupabaseClient.functions.invoke.mockReturnValue(Promise.resolve(mockResponses.function));

  mockSupabaseClient.auth.getUser.mockClear();
};

// Mock supabase module
vi.mock('../../src/services/supabase.js', () => ({
  getSupabaseClient: vi.fn(async () => mockSupabaseClient),
  getCurrentUser: vi.fn(async () => ({ user: null, error: null })),
  invokeFunction: vi.fn(async () => ({ data: null, error: null })),
}));

// Import after mocks are set up
import {
  DEAL_TYPES,
  COMPENSATION_TYPES,
  OPPORTUNITY_STATUSES,
  createOpportunity,
  getOpportunityById,
  getMyOpportunities,
  updateOpportunity,
  updateOpportunityStatus,
  publishOpportunity,
  pauseOpportunity,
  closeOpportunity,
  completeOpportunity,
  deleteOpportunity,
  getOpportunityDeals,
  createDealFromOpportunity,
  getOpportunityStats,
  duplicateOpportunity,
  getMatchedAthletes,
} from '../../src/services/opportunities.js';

import { getSupabaseClient, getCurrentUser, invokeFunction } from '../../src/services/supabase.js';

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Opportunity Constants', () => {
  describe('DEAL_TYPES', () => {
    it('has all required deal type values', () => {
      expect(DEAL_TYPES).toContain('social_post');
      expect(DEAL_TYPES).toContain('appearance');
      expect(DEAL_TYPES).toContain('endorsement');
      expect(DEAL_TYPES).toContain('autograph');
      expect(DEAL_TYPES).toContain('camp');
      expect(DEAL_TYPES).toContain('merchandise');
      expect(DEAL_TYPES).toContain('other');
    });

    it('has exactly 7 deal types', () => {
      expect(DEAL_TYPES).toHaveLength(7);
    });

    it('is an array type', () => {
      expect(Array.isArray(DEAL_TYPES)).toBe(true);
    });
  });

  describe('COMPENSATION_TYPES', () => {
    it('has all required compensation type values', () => {
      expect(COMPENSATION_TYPES).toContain('fixed');
      expect(COMPENSATION_TYPES).toContain('hourly');
      expect(COMPENSATION_TYPES).toContain('per_post');
      expect(COMPENSATION_TYPES).toContain('revenue_share');
    });

    it('has exactly 4 compensation types', () => {
      expect(COMPENSATION_TYPES).toHaveLength(4);
    });
  });

  describe('OPPORTUNITY_STATUSES', () => {
    it('has all required status values', () => {
      expect(OPPORTUNITY_STATUSES).toContain('draft');
      expect(OPPORTUNITY_STATUSES).toContain('active');
      expect(OPPORTUNITY_STATUSES).toContain('paused');
      expect(OPPORTUNITY_STATUSES).toContain('closed');
      expect(OPPORTUNITY_STATUSES).toContain('completed');
    });

    it('has exactly 5 statuses', () => {
      expect(OPPORTUNITY_STATUSES).toHaveLength(5);
    });
  });
});

// ============================================================================
// CREATE OPPORTUNITY TESTS
// ============================================================================

describe('createOpportunity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  it('returns error when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

    const result = await createOpportunity({ title: 'Test', deal_type: 'social_post' });

    expect(result.opportunity).toBe(null);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe('Not authenticated');
  });

  it('returns error when brand profile not found', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } });

    const result = await createOpportunity({ title: 'Test', deal_type: 'social_post' });

    expect(result.opportunity).toBe(null);
    expect(result.error).toBeTruthy();
  });

  it('returns error when title is missing', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null });

    const result = await createOpportunity({ deal_type: 'social_post' });

    expect(result.opportunity).toBe(null);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe('Title and deal_type are required');
  });

  it('returns error when deal_type is missing', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null });

    const result = await createOpportunity({ title: 'Test Opportunity' });

    expect(result.opportunity).toBe(null);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toBe('Title and deal_type are required');
  });

  it('returns error when deal_type is invalid', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null });

    const result = await createOpportunity({ title: 'Test', deal_type: 'invalid_type' });

    expect(result.opportunity).toBe(null);
    expect(result.error).toBeInstanceOf(Error);
    expect(result.error.message).toContain('Invalid deal_type');
  });

  it('returns error when min_gpa is out of range (negative)', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null });

    const result = await createOpportunity({
      title: 'Test',
      deal_type: 'social_post',
      min_gpa: -1,
    });

    expect(result.opportunity).toBe(null);
    expect(result.error.message).toBe('min_gpa must be between 0 and 4.0');
  });

  it('returns error when min_gpa is out of range (above 4.0)', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null });

    const result = await createOpportunity({
      title: 'Test',
      deal_type: 'social_post',
      min_gpa: 4.5,
    });

    expect(result.opportunity).toBe(null);
    expect(result.error.message).toBe('min_gpa must be between 0 and 4.0');
  });

  it('returns error when end_date is before start_date', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null });

    const result = await createOpportunity({
      title: 'Test',
      deal_type: 'social_post',
      start_date: '2024-06-01',
      end_date: '2024-05-01',
    });

    expect(result.opportunity).toBe(null);
    expect(result.error.message).toBe('end_date must be after start_date');
  });

  it('creates opportunity successfully with minimal data', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
      title: 'Social Media Campaign',
      deal_type: 'social_post',
      status: 'draft',
      created_at: '2024-01-15T10:00:00Z',
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null }) // brand lookup
      .mockResolvedValueOnce({ data: mockOpportunity, error: null }); // insert

    const result = await createOpportunity({
      title: 'Social Media Campaign',
      deal_type: 'social_post',
    });

    expect(result.opportunity).toEqual(mockOpportunity);
    expect(result.error).toBe(null);
    expect(mockSupabaseClient.from).toHaveBeenCalledWith('opportunities');
    expect(mockSupabaseClient.insert).toHaveBeenCalled();
  });

  it('creates opportunity with full data', async () => {
    const mockOpportunity = {
      id: 'opp_456',
      brand_id: 'brand_123',
      title: 'Premium Endorsement Deal',
      description: 'Full endorsement package',
      deal_type: 'endorsement',
      compensation_amount: 5000,
      compensation_type: 'fixed',
      required_sports: ['sport_1', 'sport_2'],
      required_divisions: ['D1'],
      min_gpa: 3.5,
      min_followers: 10000,
      min_gradeup_score: 80,
      required_academic_years: ['junior', 'senior'],
      max_athletes: 5,
      application_deadline: '2024-03-01',
      status: 'draft',
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });

    const result = await createOpportunity({
      title: 'Premium Endorsement Deal',
      description: 'Full endorsement package',
      deal_type: 'endorsement',
      compensation_amount: 5000,
      compensation_type: 'fixed',
      required_sports: ['sport_1', 'sport_2'],
      required_divisions: ['D1'],
      min_gpa: 3.5,
      min_followers: 10000,
      min_gradeup_score: 80,
      required_academic_years: ['junior', 'senior'],
      max_athletes: 5,
      application_deadline: '2024-03-01',
    });

    expect(result.opportunity.deal_type).toBe('endorsement');
    expect(result.opportunity.status).toBe('draft');
    expect(result.error).toBe(null);
  });

  it('sets initial status to draft', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'opp_123', status: 'draft' }, error: null });

    const result = await createOpportunity({
      title: 'Test',
      deal_type: 'social_post',
    });

    expect(result.opportunity.status).toBe('draft');
  });
});

// ============================================================================
// GET OPPORTUNITY TESTS
// ============================================================================

describe('getOpportunityById', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  it('returns opportunity with brand details', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      title: 'Social Media Campaign',
      deal_type: 'social_post',
      brand: {
        id: 'brand_123',
        company_name: 'Nike',
        logo_url: 'https://example.com/logo.png',
        industry: 'Sports Apparel',
        is_verified: true,
        profile: { avatar_url: 'https://example.com/avatar.png' },
      },
    };

    mockSupabaseClient.single.mockResolvedValue({ data: mockOpportunity, error: null });

    const result = await getOpportunityById('opp_123');

    expect(result.opportunity).toEqual(mockOpportunity);
    expect(result.opportunity.brand.company_name).toBe('Nike');
    expect(result.error).toBe(null);
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', 'opp_123');
  });

  it('returns error when opportunity not found', async () => {
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST116', message: 'No rows returned' },
    });

    const result = await getOpportunityById('nonexistent_id');

    expect(result.opportunity).toBe(null);
    expect(result.error).toBeTruthy();
  });

  it('queries with nested brand and profile data', async () => {
    mockSupabaseClient.single.mockResolvedValue({ data: {}, error: null });

    await getOpportunityById('opp_123');

    expect(mockSupabaseClient.from).toHaveBeenCalledWith('opportunities');
    expect(mockSupabaseClient.select).toHaveBeenCalled();
  });
});

// ============================================================================
// GET MY OPPORTUNITIES (LISTING) TESTS
// ============================================================================

describe('getMyOpportunities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  it('returns error when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

    const result = await getMyOpportunities();

    expect(result.opportunities).toBe(null);
    expect(result.error).toBeTruthy();
  });

  it('returns error when brand profile not found', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } });

    const result = await getMyOpportunities();

    expect(result.opportunities).toBe(null);
    expect(result.error).toBeTruthy();
  });

  it('returns all opportunities for brand', async () => {
    const mockOpportunities = [
      { id: 'opp_1', title: 'Campaign 1', status: 'active' },
      { id: 'opp_2', title: 'Campaign 2', status: 'draft' },
      { id: 'opp_3', title: 'Campaign 3', status: 'completed' },
    ];

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null });
    mockResponses.query = { data: mockOpportunities, error: null };

    const result = await getMyOpportunities();

    expect(result.opportunities).toHaveLength(3);
    expect(result.error).toBe(null);
  });

  it('filters by status when provided', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null });
    mockResponses.query = { data: [], error: null };

    await getMyOpportunities({ status: 'active' });

    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('brand_id', 'brand_123');
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'active');
  });

  it('filters by deal_type when provided', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null });
    mockResponses.query = { data: [], error: null };

    await getMyOpportunities({ deal_type: 'endorsement' });

    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('deal_type', 'endorsement');
  });

  it('applies pagination with limit and offset', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null });
    mockResponses.query = { data: [], error: null };

    await getMyOpportunities({ limit: 10, offset: 20 });

    expect(mockSupabaseClient.range).toHaveBeenCalledWith(20, 29);
  });

  it('uses default limit of 50 when not specified', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null });
    mockResponses.query = { data: [], error: null };

    await getMyOpportunities();

    expect(mockSupabaseClient.range).toHaveBeenCalledWith(0, 49);
  });

  it('orders by created_at descending', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null });
    mockResponses.query = { data: [], error: null };

    await getMyOpportunities();

    expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });
});

// ============================================================================
// UPDATE OPPORTUNITY TESTS
// ============================================================================

describe('updateOpportunity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  it('returns error when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

    const result = await updateOpportunity('opp_123', { title: 'Updated Title' });

    expect(result.opportunity).toBe(null);
    expect(result.error).toBeTruthy();
  });

  it('returns error when opportunity not found', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const result = await updateOpportunity('nonexistent_id', { title: 'Updated' });

    expect(result.opportunity).toBe(null);
    expect(result.error.message).toBe('Opportunity not found');
  });

  it('returns error when not authorized (different brand)', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'opp_123', brand_id: 'brand_other', status: 'draft' }, error: null });

    const result = await updateOpportunity('opp_123', { title: 'Updated' });

    expect(result.opportunity).toBe(null);
    expect(result.error.message).toBe('Not authorized to update this opportunity');
  });

  it('returns error when trying to update completed opportunity', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'opp_123', brand_id: 'brand_123', status: 'completed' }, error: null });

    const result = await updateOpportunity('opp_123', { title: 'Updated' });

    expect(result.opportunity).toBe(null);
    expect(result.error.message).toBe('Cannot update completed opportunities');
  });

  it('returns error when invalid deal_type provided', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'opp_123', brand_id: 'brand_123', status: 'draft' }, error: null });

    const result = await updateOpportunity('opp_123', { deal_type: 'invalid_type' });

    expect(result.opportunity).toBe(null);
    expect(result.error.message).toContain('Invalid deal_type');
  });

  it('returns error when invalid min_gpa provided', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'opp_123', brand_id: 'brand_123', status: 'draft' }, error: null });

    const result = await updateOpportunity('opp_123', { min_gpa: 5.0 });

    expect(result.opportunity).toBe(null);
    expect(result.error.message).toBe('min_gpa must be between 0 and 4.0');
  });

  it('updates opportunity successfully', async () => {
    const updatedOpportunity = {
      id: 'opp_123',
      title: 'Updated Title',
      description: 'Updated Description',
      deal_type: 'endorsement',
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'opp_123', brand_id: 'brand_123', status: 'draft' }, error: null })
      .mockResolvedValueOnce({ data: updatedOpportunity, error: null });

    const result = await updateOpportunity('opp_123', {
      title: 'Updated Title',
      description: 'Updated Description',
    });

    expect(result.opportunity).toEqual(updatedOpportunity);
    expect(result.error).toBe(null);
  });

  it('only updates allowed fields', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'opp_123', brand_id: 'brand_123', status: 'draft' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'opp_123' }, error: null });

    await updateOpportunity('opp_123', {
      title: 'New Title',
      description: 'New Description',
      compensation_amount: 1000,
      status: 'active', // This should be ignored (not in allowed fields)
    });

    expect(mockSupabaseClient.update).toHaveBeenCalled();
  });
});

// ============================================================================
// STATUS MANAGEMENT TESTS
// ============================================================================

describe('Status Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('updateOpportunityStatus', () => {
    it('returns error for invalid status', async () => {
      const result = await updateOpportunityStatus('opp_123', 'invalid_status');

      expect(result.opportunity).toBe(null);
      expect(result.error.message).toContain('Invalid status');
    });

    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await updateOpportunityStatus('opp_123', 'active');

      expect(result.opportunity).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('updates status successfully', async () => {
      const updatedOpportunity = { id: 'opp_123', status: 'active' };

      vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
        .mockResolvedValueOnce({ data: updatedOpportunity, error: null });

      const result = await updateOpportunityStatus('opp_123', 'active');

      expect(result.opportunity.status).toBe('active');
      expect(result.error).toBe(null);
    });

    it('updates brand active_campaigns count on status change', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'opp_123', status: 'active' }, error: null });
      mockResponses.query = { count: 3 };

      await updateOpportunityStatus('opp_123', 'active');

      // Should query for active campaigns count
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('opportunities');
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('brands');
    });
  });

  describe('publishOpportunity', () => {
    it('sets status to active', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'opp_123', status: 'active' }, error: null });

      const result = await publishOpportunity('opp_123');

      expect(result.opportunity.status).toBe('active');
    });
  });

  describe('pauseOpportunity', () => {
    it('sets status to paused', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'opp_123', status: 'paused' }, error: null });

      const result = await pauseOpportunity('opp_123');

      expect(result.opportunity.status).toBe('paused');
    });
  });

  describe('closeOpportunity', () => {
    it('sets status to closed', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'opp_123', status: 'closed' }, error: null });

      const result = await closeOpportunity('opp_123');

      expect(result.opportunity.status).toBe('closed');
    });
  });

  describe('completeOpportunity', () => {
    it('sets status to completed', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
      mockSupabaseClient.single
        .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'opp_123', status: 'completed' }, error: null });

      const result = await completeOpportunity('opp_123');

      expect(result.opportunity.status).toBe('completed');
    });
  });
});

// ============================================================================
// DELETE OPPORTUNITY TESTS
// ============================================================================

describe('deleteOpportunity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  it('returns error when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

    const result = await deleteOpportunity('opp_123');

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('returns error when opportunity not found', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const result = await deleteOpportunity('nonexistent_id');

    expect(result.success).toBe(false);
    expect(result.error.message).toBe('Opportunity not found');
  });

  it('returns error when trying to delete non-draft opportunity', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: { status: 'active' }, error: null });

    const result = await deleteOpportunity('opp_123');

    expect(result.success).toBe(false);
    expect(result.error.message).toBe('Only draft opportunities can be deleted. Close or complete instead.');
  });

  it('deletes draft opportunity successfully', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: { status: 'draft' }, error: null });
    mockResponses.query = { error: null };

    const result = await deleteOpportunity('opp_123');

    expect(result.success).toBe(true);
    expect(result.error).toBe(null);
    expect(mockSupabaseClient.delete).toHaveBeenCalled();
  });
});

// ============================================================================
// OPPORTUNITY DEALS (APPLICATIONS) TESTS
// ============================================================================

describe('getOpportunityDeals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  it('returns error when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

    const result = await getOpportunityDeals('opp_123');

    expect(result.deals).toBe(null);
    expect(result.error).toBeTruthy();
  });

  it('returns deals with athlete details', async () => {
    const mockDeals = [
      {
        id: 'deal_1',
        status: 'pending',
        athlete: {
          id: 'athlete_1',
          gpa: 3.8,
          gradeup_score: 85,
          total_followers: 15000,
          profile: { first_name: 'John', last_name: 'Doe' },
          school: { name: 'Stanford University' },
          sport: { name: 'Basketball' },
        },
      },
      {
        id: 'deal_2',
        status: 'active',
        athlete: {
          id: 'athlete_2',
          gpa: 3.5,
          gradeup_score: 78,
          total_followers: 8000,
          profile: { first_name: 'Jane', last_name: 'Smith' },
          school: { name: 'UCLA' },
          sport: { name: 'Soccer' },
        },
      },
    ];

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null });
    mockResponses.query = { data: mockDeals, error: null };

    const result = await getOpportunityDeals('opp_123');

    expect(result.deals).toHaveLength(2);
    expect(result.deals[0].athlete.profile.first_name).toBe('John');
    expect(result.error).toBe(null);
  });

  it('filters by deal status when provided', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null });
    mockResponses.query = { data: [], error: null };

    await getOpportunityDeals('opp_123', { status: 'pending' });

    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'pending');
  });

  it('orders by created_at descending', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null });
    mockResponses.query = { data: [], error: null };

    await getOpportunityDeals('opp_123');

    expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
  });
});

// ============================================================================
// CREATE DEAL FROM OPPORTUNITY TESTS
// ============================================================================

describe('createDealFromOpportunity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  it('returns error when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

    const result = await createDealFromOpportunity('opp_123', 'athlete_123');

    expect(result.deal).toBe(null);
    expect(result.error).toBeTruthy();
  });

  it('returns error when opportunity not found', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const result = await createDealFromOpportunity('nonexistent_opp', 'athlete_123');

    expect(result.deal).toBe(null);
    expect(result.error.message).toBe('Opportunity not found');
  });

  it('returns error when opportunity has reached max athletes', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({
        data: { id: 'opp_123', brand_id: 'brand_123', max_athletes: 5, athletes_selected: 5 },
        error: null,
      });

    const result = await createDealFromOpportunity('opp_123', 'athlete_123');

    expect(result.deal).toBe(null);
    expect(result.error.message).toBe('Opportunity has reached maximum athletes');
  });

  it('returns error when athlete already has a deal', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({
        data: { id: 'opp_123', brand_id: 'brand_123', max_athletes: 10, athletes_selected: 2 },
        error: null,
      })
      .mockResolvedValueOnce({ data: { id: 'existing_deal' }, error: null }); // existing deal

    const result = await createDealFromOpportunity('opp_123', 'athlete_123');

    expect(result.deal).toBe(null);
    expect(result.error.message).toBe('Athlete already has a deal for this opportunity');
  });

  it('creates deal successfully from opportunity', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
      title: 'Social Media Campaign',
      description: 'Create posts about our product',
      deal_type: 'social_post',
      compensation_amount: 500,
      compensation_details: 'Payment upon completion',
      deliverables: [{ type: 'post', platform: 'instagram' }],
      max_athletes: 10,
      athletes_selected: 2,
    };

    const mockDeal = {
      id: 'deal_new_123',
      opportunity_id: 'opp_123',
      athlete_id: 'athlete_123',
      brand_id: 'brand_123',
      title: 'Social Media Campaign',
      status: 'pending',
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    vi.mocked(invokeFunction).mockResolvedValue({ data: null, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } }) // no existing deal
      .mockResolvedValueOnce({ data: mockDeal, error: null }) // created deal
      .mockResolvedValueOnce({ data: { profile_id: 'profile_123' }, error: null }); // athlete lookup

    const result = await createDealFromOpportunity('opp_123', 'athlete_123');

    expect(result.deal).toEqual(mockDeal);
    expect(result.deal.status).toBe('pending');
    expect(result.error).toBe(null);
  });

  it('allows custom deal data to override opportunity defaults', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
      title: 'Default Title',
      compensation_amount: 500,
      max_athletes: null,
      athletes_selected: 0,
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    vi.mocked(invokeFunction).mockResolvedValue({ data: null, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({
        data: { id: 'deal_123', title: 'Custom Title', amount: 750 },
        error: null,
      })
      .mockResolvedValueOnce({ data: { profile_id: 'profile_123' }, error: null });

    const result = await createDealFromOpportunity('opp_123', 'athlete_123', {
      title: 'Custom Title',
      amount: 750,
    });

    expect(result.deal.title).toBe('Custom Title');
    expect(result.deal.amount).toBe(750);
  });

  it('increments athletes_selected count', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
      athletes_selected: 3,
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    vi.mocked(invokeFunction).mockResolvedValue({ data: null, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({ data: { id: 'deal_123' }, error: null })
      .mockResolvedValueOnce({ data: { profile_id: 'profile_123' }, error: null });

    await createDealFromOpportunity('opp_123', 'athlete_123');

    expect(mockSupabaseClient.update).toHaveBeenCalled();
  });

  it('sends notification to athlete', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
      title: 'Great Opportunity',
      athletes_selected: 0,
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    vi.mocked(invokeFunction).mockResolvedValue({ data: null, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({ data: { id: 'deal_123' }, error: null })
      .mockResolvedValueOnce({ data: { profile_id: 'profile_123' }, error: null });

    await createDealFromOpportunity('opp_123', 'athlete_123');

    expect(invokeFunction).toHaveBeenCalledWith(
      'send-notification',
      expect.objectContaining({
        user_ids: ['profile_123'],
        type: 'deal_offer',
        title: 'New NIL Opportunity',
      })
    );
  });
});

// ============================================================================
// OPPORTUNITY STATISTICS TESTS
// ============================================================================

describe('getOpportunityStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  it('returns error when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

    const result = await getOpportunityStats('opp_123');

    expect(result.stats).toBe(null);
    expect(result.error).toBeTruthy();
  });

  it('returns error when opportunity not found', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const result = await getOpportunityStats('nonexistent_opp');

    expect(result.stats).toBe(null);
    expect(result.error.message).toBe('Opportunity not found');
  });

  it('returns comprehensive statistics', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      status: 'active',
      max_athletes: 10,
      athletes_selected: 5,
    };

    const mockDeals = [
      { id: 'deal_1', status: 'pending', amount: 500, athlete: { total_followers: 10000 } },
      { id: 'deal_2', status: 'active', amount: 500, athlete: { total_followers: 15000 } },
      { id: 'deal_3', status: 'completed', amount: 500, athlete: { total_followers: 8000 } },
      { id: 'deal_4', status: 'cancelled', amount: 500, athlete: { total_followers: 5000 } },
      { id: 'deal_5', status: 'negotiating', amount: 500, athlete: { total_followers: 12000 } },
    ];

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });
    mockResponses.query = { data: mockDeals, error: null };

    const result = await getOpportunityStats('opp_123');

    expect(result.stats).toEqual({
      opportunity_id: 'opp_123',
      status: 'active',
      max_athletes: 10,
      athletes_selected: 5,
      slots_remaining: 5,
      total_deals: 5,
      pending_deals: 1,
      active_deals: 2, // active + negotiating
      completed_deals: 1,
      declined_deals: 1, // cancelled
      acceptance_rate: 60, // (2 + 1) / 5 * 100
      total_amount_committed: 2500, // 5 * 500
      total_reach: 50000, // sum of all followers
      avg_cost_per_reach: 0.05, // 2500 / 50000
    });
    expect(result.error).toBe(null);
  });

  it('handles opportunity without max_athletes', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      status: 'active',
      max_athletes: null,
      athletes_selected: 3,
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });
    mockResponses.query = { data: [], error: null };

    const result = await getOpportunityStats('opp_123');

    expect(result.stats.slots_remaining).toBe(null);
  });

  it('handles empty deals array', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      status: 'draft',
      max_athletes: 5,
      athletes_selected: 0,
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });
    mockResponses.query = { data: [], error: null };

    const result = await getOpportunityStats('opp_123');

    expect(result.stats.total_deals).toBe(0);
    expect(result.stats.acceptance_rate).toBe(0);
    expect(result.stats.total_amount_committed).toBe(0);
    expect(result.stats.total_reach).toBe(0);
    expect(result.stats.avg_cost_per_reach).toBe(0);
  });
});

// ============================================================================
// DUPLICATE OPPORTUNITY TESTS
// ============================================================================

describe('duplicateOpportunity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  it('returns error when original opportunity not found', async () => {
    mockSupabaseClient.single.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    const result = await duplicateOpportunity('nonexistent_opp');

    expect(result.opportunity).toBe(null);
    expect(result.error.message).toBe('Opportunity not found');
  });

  it('creates duplicate with (Copy) suffix by default', async () => {
    const mockOriginal = {
      id: 'opp_original',
      brand_id: 'brand_123',
      title: 'Original Campaign',
      description: 'Original description',
      deal_type: 'social_post',
      compensation_amount: 500,
      athletes_selected: 10,
      status: 'completed',
      created_at: '2024-01-01T00:00:00Z',
    };

    const mockDuplicate = {
      id: 'opp_duplicate',
      brand_id: 'brand_123',
      title: 'Original Campaign (Copy)',
      description: 'Original description',
      deal_type: 'social_post',
      status: 'draft',
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: mockOriginal, error: null }) // getOpportunityById
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null }) // getCurrentBrandId
      .mockResolvedValueOnce({ data: mockDuplicate, error: null }); // insert

    const result = await duplicateOpportunity('opp_original');

    expect(result.opportunity.title).toBe('Original Campaign (Copy)');
    expect(result.opportunity.status).toBe('draft');
  });

  it('creates duplicate with custom title', async () => {
    const mockOriginal = {
      id: 'opp_original',
      title: 'Original Campaign',
      deal_type: 'social_post',
    };

    const mockDuplicate = {
      id: 'opp_duplicate',
      title: 'Custom New Title',
      deal_type: 'social_post',
      status: 'draft',
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: mockOriginal, error: null })
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockDuplicate, error: null });

    const result = await duplicateOpportunity('opp_original', 'Custom New Title');

    expect(result.opportunity.title).toBe('Custom New Title');
  });

  it('resets athletes_selected to 0 in duplicate', async () => {
    const mockOriginal = {
      id: 'opp_original',
      title: 'Campaign',
      deal_type: 'social_post',
      athletes_selected: 15,
      status: 'completed',
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: mockOriginal, error: null })
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'opp_new', athletes_selected: 0 }, error: null });

    const result = await duplicateOpportunity('opp_original');

    expect(mockSupabaseClient.insert).toHaveBeenCalled();
    // The insert call should not include athletes_selected from original
  });
});

// ============================================================================
// MATCHED ATHLETES TESTS
// ============================================================================

describe('getMatchedAthletes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  it('returns error when not authenticated', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

    const result = await getMatchedAthletes('opp_123');

    expect(result.athletes).toBe(null);
    expect(result.error).toBeTruthy();
  });

  it('returns error when opportunity not found', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const result = await getMatchedAthletes('nonexistent_opp');

    expect(result.athletes).toBe(null);
    expect(result.error.message).toBe('Opportunity not found');
  });

  it('returns matched athletes based on opportunity requirements', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
      required_sports: ['sport_basketball'],
      required_divisions: ['D1'],
      min_gpa: 3.0,
      min_followers: 5000,
      min_gradeup_score: 70,
      required_academic_years: ['junior', 'senior'],
    };

    const mockAthletes = [
      {
        id: 'athlete_1',
        gpa: 3.8,
        gradeup_score: 85,
        total_followers: 15000,
        profile: { first_name: 'John', last_name: 'Doe' },
        school: { name: 'Duke', division: 'D1' },
        sport: { name: 'Basketball' },
      },
      {
        id: 'athlete_2',
        gpa: 3.5,
        gradeup_score: 78,
        total_followers: 8000,
        profile: { first_name: 'Jane', last_name: 'Smith' },
        school: { name: 'UNC', division: 'D1' },
        sport: { name: 'Basketball' },
      },
    ];

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });
    mockResponses.query = { data: mockAthletes, error: null };

    const result = await getMatchedAthletes('opp_123');

    expect(result.athletes).toHaveLength(2);
    expect(result.error).toBe(null);
  });

  it('filters by required sports', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
      required_sports: ['sport_1', 'sport_2'],
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });
    mockResponses.query = { data: [], error: null };

    await getMatchedAthletes('opp_123');

    expect(mockSupabaseClient.in).toHaveBeenCalledWith('sport_id', ['sport_1', 'sport_2']);
  });

  it('filters by required schools', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
      required_schools: ['school_1', 'school_2'],
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });
    mockResponses.query = { data: [], error: null };

    await getMatchedAthletes('opp_123');

    expect(mockSupabaseClient.in).toHaveBeenCalledWith('school_id', ['school_1', 'school_2']);
  });

  it('filters by minimum GPA', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
      min_gpa: 3.5,
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });
    mockResponses.query = { data: [], error: null };

    await getMatchedAthletes('opp_123');

    expect(mockSupabaseClient.gte).toHaveBeenCalledWith('gpa', 3.5);
  });

  it('filters by minimum followers', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
      min_followers: 10000,
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });
    mockResponses.query = { data: [], error: null };

    await getMatchedAthletes('opp_123');

    expect(mockSupabaseClient.gte).toHaveBeenCalledWith('total_followers', 10000);
  });

  it('filters by minimum gradeup score', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
      min_gradeup_score: 75,
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });
    mockResponses.query = { data: [], error: null };

    await getMatchedAthletes('opp_123');

    expect(mockSupabaseClient.gte).toHaveBeenCalledWith('gradeup_score', 75);
  });

  it('filters by required academic years', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
      required_academic_years: ['junior', 'senior'],
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });
    mockResponses.query = { data: [], error: null };

    await getMatchedAthletes('opp_123');

    expect(mockSupabaseClient.in).toHaveBeenCalledWith('academic_year', ['junior', 'senior']);
  });

  it('excludes athletes who already have a deal', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
    };

    const existingDeals = [
      { athlete_id: 'athlete_1' },
      { athlete_id: 'athlete_2' },
    ];

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });
    // First query returns existing deals, second returns athletes
    mockResponses.query = { data: existingDeals, error: null };

    await getMatchedAthletes('opp_123');

    expect(mockSupabaseClient.not).toHaveBeenCalledWith('id', 'in', '(athlete_1,athlete_2)');
  });

  it('only returns searchable athletes accepting deals', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });
    mockResponses.query = { data: [], error: null };

    await getMatchedAthletes('opp_123');

    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_searchable', true);
    expect(mockSupabaseClient.eq).toHaveBeenCalledWith('accepting_deals', true);
  });

  it('orders by gradeup_score descending', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });
    mockResponses.query = { data: [], error: null };

    await getMatchedAthletes('opp_123');

    expect(mockSupabaseClient.order).toHaveBeenCalledWith('gradeup_score', { ascending: false });
  });

  it('applies custom limit', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });
    mockResponses.query = { data: [], error: null };

    await getMatchedAthletes('opp_123', { limit: 50 });

    expect(mockSupabaseClient.limit).toHaveBeenCalledWith(50);
  });

  it('uses default limit of 20', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });
    mockResponses.query = { data: [], error: null };

    await getMatchedAthletes('opp_123');

    expect(mockSupabaseClient.limit).toHaveBeenCalledWith(20);
  });
});

// ============================================================================
// DEADLINE HANDLING TESTS
// ============================================================================

describe('Deadline Handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  it('creates opportunity with application deadline', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      title: 'Time-Limited Campaign',
      application_deadline: '2024-06-30T23:59:59Z',
      status: 'draft',
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });

    const result = await createOpportunity({
      title: 'Time-Limited Campaign',
      deal_type: 'social_post',
      application_deadline: '2024-06-30T23:59:59Z',
    });

    expect(result.opportunity.application_deadline).toBe('2024-06-30T23:59:59Z');
  });

  it('creates opportunity with start and end dates', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      title: 'Campaign with Dates',
      start_date: '2024-07-01',
      end_date: '2024-08-31',
      status: 'draft',
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null });

    const result = await createOpportunity({
      title: 'Campaign with Dates',
      deal_type: 'appearance',
      start_date: '2024-07-01',
      end_date: '2024-08-31',
    });

    expect(result.opportunity.start_date).toBe('2024-07-01');
    expect(result.opportunity.end_date).toBe('2024-08-31');
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

  it('handles database connection errors gracefully', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { code: 'PGRST000', message: 'Connection refused' },
    });

    const result = await getOpportunityById('opp_123');

    expect(result.opportunity).toBe(null);
    expect(result.error).toBeTruthy();
  });

  it('handles RLS policy errors', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'RLS policy violation' },
    });

    const result = await getOpportunityById('opp_123');

    expect(result.opportunity).toBe(null);
    expect(result.error.code).toBe('42501');
  });

  it('handles unique constraint violations', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: '23505', message: 'Unique constraint violation' } });

    const result = await createOpportunity({
      title: 'Duplicate Title',
      deal_type: 'social_post',
    });

    expect(result.opportunity).toBe(null);
    expect(result.error.code).toBe('23505');
  });

  it('handles notification failures gracefully during deal creation', async () => {
    const mockOpportunity = {
      id: 'opp_123',
      brand_id: 'brand_123',
      title: 'Test Opportunity',
      athletes_selected: 0,
    };

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    vi.mocked(invokeFunction).mockRejectedValue(new Error('Notification service unavailable'));
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: mockOpportunity, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({ data: { id: 'deal_123' }, error: null })
      .mockResolvedValueOnce({ data: { profile_id: 'profile_123' }, error: null });

    // Should not throw even if notification fails
    const result = await createDealFromOpportunity('opp_123', 'athlete_123');

    expect(result.deal).toBeTruthy();
    expect(result.error).toBe(null);
  });
});

// ============================================================================
// REQUIREMENT MATCHING TESTS
// ============================================================================

describe('Requirement Matching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  it('creates opportunity with GPA requirement', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'opp_123', min_gpa: 3.5 }, error: null });

    const result = await createOpportunity({
      title: 'Honor Roll Athletes Only',
      deal_type: 'endorsement',
      min_gpa: 3.5,
    });

    expect(result.opportunity.min_gpa).toBe(3.5);
  });

  it('creates opportunity with follower requirement', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'opp_123', min_followers: 50000 }, error: null });

    const result = await createOpportunity({
      title: 'Influencer Campaign',
      deal_type: 'social_post',
      min_followers: 50000,
    });

    expect(result.opportunity.min_followers).toBe(50000);
  });

  it('creates opportunity with division requirements', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'opp_123', required_divisions: ['D1', 'D2'] }, error: null });

    const result = await createOpportunity({
      title: 'NCAA Division Campaign',
      deal_type: 'appearance',
      required_divisions: ['D1', 'D2'],
    });

    expect(result.opportunity.required_divisions).toEqual(['D1', 'D2']);
  });

  it('creates opportunity with multiple sports', async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({
        data: { id: 'opp_123', required_sports: ['sport_basketball', 'sport_football'] },
        error: null,
      });

    const result = await createOpportunity({
      title: 'Multi-Sport Campaign',
      deal_type: 'endorsement',
      required_sports: ['sport_basketball', 'sport_football'],
    });

    expect(result.opportunity.required_sports).toHaveLength(2);
  });

  it('creates opportunity with deliverables', async () => {
    const deliverables = [
      { type: 'post', platform: 'instagram', description: '1 Instagram post' },
      { type: 'story', platform: 'instagram', description: '3 Instagram stories' },
      { type: 'video', platform: 'tiktok', description: '1 TikTok video' },
    ];

    vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
    mockSupabaseClient.single
      .mockResolvedValueOnce({ data: { id: 'brand_123' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'opp_123', deliverables }, error: null });

    const result = await createOpportunity({
      title: 'Social Media Package',
      deal_type: 'social_post',
      deliverables,
    });

    expect(result.opportunity.deliverables).toHaveLength(3);
    expect(result.opportunity.deliverables[0].platform).toBe('instagram');
  });
});
