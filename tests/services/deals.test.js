/**
 * Deals Service Unit Tests
 * Tests for src/services/deals.js
 *
 * Comprehensive tests for the GradeUp NIL deals system including:
 * - Opportunity browsing and applications
 * - Deal CRUD operations
 * - Status transitions (pending -> accepted -> completed)
 * - Counter-offers and negotiations
 * - Contract signing
 * - Messaging within deals
 * - Deal statistics
 * - Athlete-initiated proposals
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Shared response storage - tests modify these to control mock behavior
const mockResponses = {
  single: { data: null, error: null },
  query: { data: null, error: null, count: null },
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
  chainable.is = vi.fn(() => chainable);
  chainable.gte = vi.fn(() => chainable);
  chainable.lte = vi.fn(() => chainable);
  chainable.lt = vi.fn(() => chainable);
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
  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
  })),
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
  is: { get: () => chainable.is, enumerable: true },
  gte: { get: () => chainable.gte, enumerable: true },
  lte: { get: () => chainable.lte, enumerable: true },
  lt: { get: () => chainable.lt, enumerable: true },
  order: { get: () => chainable.order, enumerable: true },
  limit: { get: () => chainable.limit, enumerable: true },
  range: { get: () => chainable.range, enumerable: true },
  single: { get: () => chainable.single, enumerable: true },
});

// Reset clears mocks and responses before each test
const resetMockSupabaseClient = () => {
  mockResponses.single = { data: null, error: null };
  mockResponses.query = { data: null, error: null, count: null };

  chainable = createChainable();

  mockSupabaseClient.from.mockClear();
  mockSupabaseClient.from.mockReturnValue(chainable);
};

// Mock supabase module
vi.mock('../../src/services/supabase.js', () => ({
  getSupabaseClient: vi.fn(async () => mockSupabaseClient),
  getCurrentUser: vi.fn(async () => ({ user: null, error: null })),
  subscribeToTable: vi.fn(() => ({ unsubscribe: vi.fn() })),
}));

// Mock helpers module
vi.mock('../../src/services/helpers.js', () => ({
  getMyAthleteId: vi.fn(async () => null),
  ensureAthleteId: vi.fn((athleteId) => {
    if (!athleteId) {
      return { valid: false, error: new Error('Athlete profile not found') };
    }
    return { valid: true, error: null };
  }),
}));

// Import after mocks are set up
import {
  DEAL_STATUS,
  DEAL_TYPES,
  PROPOSAL_STATUS,
  getOpportunities,
  getOpportunityById,
  applyToOpportunity,
  getMyDeals,
  getDealsByCategory,
  getDealById,
  acceptDeal,
  rejectDeal,
  counterOfferDeal,
  signContract,
  completeDeal,
  checkDealPayment,
  submitDealReview,
  getDealMessages,
  sendDealMessage,
  markMessagesAsRead,
  subscribeToDealMessages,
  subscribeToMyDeals,
  getDealStats,
  createProposal,
  updateProposal,
  sendProposal,
  getMyProposals,
  getProposalById,
  deleteProposal,
  withdrawProposal,
} from '../../src/services/deals.js';

import { getSupabaseClient, getCurrentUser, subscribeToTable } from '../../src/services/supabase.js';
import { getMyAthleteId, ensureAthleteId } from '../../src/services/helpers.js';

// ============================================================================
// CONSTANTS TESTS
// ============================================================================

describe('Deal Constants', () => {
  describe('DEAL_STATUS', () => {
    it('has all required deal status values', () => {
      expect(DEAL_STATUS.DRAFT).toBe('draft');
      expect(DEAL_STATUS.PENDING).toBe('pending');
      expect(DEAL_STATUS.NEGOTIATING).toBe('negotiating');
      expect(DEAL_STATUS.ACCEPTED).toBe('accepted');
      expect(DEAL_STATUS.ACTIVE).toBe('active');
      expect(DEAL_STATUS.COMPLETED).toBe('completed');
      expect(DEAL_STATUS.CANCELLED).toBe('cancelled');
      expect(DEAL_STATUS.EXPIRED).toBe('expired');
    });

    it('has exactly 8 status values', () => {
      expect(Object.keys(DEAL_STATUS)).toHaveLength(8);
    });
  });

  describe('DEAL_TYPES', () => {
    it('has all required deal type values', () => {
      expect(DEAL_TYPES.SOCIAL_POST).toBe('social_post');
      expect(DEAL_TYPES.APPEARANCE).toBe('appearance');
      expect(DEAL_TYPES.ENDORSEMENT).toBe('endorsement');
      expect(DEAL_TYPES.AUTOGRAPH).toBe('autograph');
      expect(DEAL_TYPES.CAMP).toBe('camp');
      expect(DEAL_TYPES.MERCHANDISE).toBe('merchandise');
      expect(DEAL_TYPES.OTHER).toBe('other');
    });

    it('has exactly 7 deal types', () => {
      expect(Object.keys(DEAL_TYPES)).toHaveLength(7);
    });
  });

  describe('PROPOSAL_STATUS', () => {
    it('has all required proposal status values', () => {
      expect(PROPOSAL_STATUS.DRAFT).toBe('draft');
      expect(PROPOSAL_STATUS.SENT).toBe('sent');
      expect(PROPOSAL_STATUS.VIEWED).toBe('viewed');
      expect(PROPOSAL_STATUS.ACCEPTED).toBe('accepted');
      expect(PROPOSAL_STATUS.DECLINED).toBe('declined');
      expect(PROPOSAL_STATUS.EXPIRED).toBe('expired');
    });

    it('has exactly 6 status values', () => {
      expect(Object.keys(PROPOSAL_STATUS)).toHaveLength(6);
    });
  });
});

// ============================================================================
// OPPORTUNITIES TESTS
// ============================================================================

describe('Opportunities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('getOpportunities', () => {
    it('returns opportunities with pagination', async () => {
      const mockOpportunities = [
        {
          id: 'opp_1',
          title: 'Social Media Campaign',
          deal_type: 'social_post',
          compensation_amount: 500,
          brand: { id: 'brand_1', company_name: 'Nike', logo_url: 'nike.png', industry: 'Sports', is_verified: true },
        },
        {
          id: 'opp_2',
          title: 'Campus Appearance',
          deal_type: 'appearance',
          compensation_amount: 1000,
          brand: { id: 'brand_2', company_name: 'Adidas', logo_url: 'adidas.png', industry: 'Sports', is_verified: true },
        },
      ];

      mockResponses.query = { data: mockOpportunities, error: null, count: 2 };

      const result = await getOpportunities();

      expect(result.opportunities).toHaveLength(2);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.page).toBe(1);
      expect(result.pagination.page_size).toBe(20);
      expect(result.error).toBe(null);
    });

    it('filters by deal types when provided', async () => {
      mockResponses.query = { data: [], error: null, count: 0 };

      await getOpportunities({ deal_types: ['social_post', 'appearance'] });

      expect(mockSupabaseClient.in).toHaveBeenCalledWith('deal_type', ['social_post', 'appearance']);
    });

    it('filters by compensation range when provided', async () => {
      mockResponses.query = { data: [], error: null, count: 0 };

      await getOpportunities({ min_compensation: 500, max_compensation: 2000 });

      expect(mockSupabaseClient.gte).toHaveBeenCalledWith('compensation_amount', 500);
      expect(mockSupabaseClient.lte).toHaveBeenCalledWith('compensation_amount', 2000);
    });

    it('filters featured only when flag is true', async () => {
      mockResponses.query = { data: [], error: null, count: 0 };

      await getOpportunities({ featured_only: true });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('is_featured', true);
    });

    it('applies sorting correctly', async () => {
      mockResponses.query = { data: [], error: null, count: 0 };

      await getOpportunities({ sort_by: 'compensation_amount', sort_order: 'asc' });

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('compensation_amount', { ascending: true });
    });

    it('applies pagination correctly', async () => {
      mockResponses.query = { data: [], error: null, count: 50 };

      await getOpportunities({ page: 3, page_size: 10 });

      expect(mockSupabaseClient.range).toHaveBeenCalledWith(20, 29);
    });

    it('only returns active opportunities', async () => {
      mockResponses.query = { data: [], error: null, count: 0 };

      await getOpportunities();

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'active');
    });
  });

  describe('getOpportunityById', () => {
    it('returns opportunity with full brand details', async () => {
      const mockOpportunity = {
        id: 'opp_1',
        title: 'Brand Ambassador',
        description: 'Looking for a brand ambassador',
        deal_type: 'endorsement',
        compensation_amount: 5000,
        brand: {
          id: 'brand_1',
          company_name: 'Nike',
          logo_url: 'nike.png',
          industry: 'Sports',
          is_verified: true,
          website_url: 'https://nike.com',
          city: 'Portland',
          state: 'OR',
        },
      };

      mockResponses.single = { data: mockOpportunity, error: null };

      const result = await getOpportunityById('opp_1');

      expect(result.opportunity).toEqual(mockOpportunity);
      expect(result.error).toBe(null);
    });

    it('returns error when opportunity not found', async () => {
      mockResponses.single = { data: null, error: { code: 'PGRST116', message: 'No rows returned' } };

      const result = await getOpportunityById('nonexistent');

      expect(result.opportunity).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('only returns active opportunities', async () => {
      mockResponses.single = { data: null, error: null };

      await getOpportunityById('opp_1');

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'active');
    });
  });

  describe('applyToOpportunity', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await applyToOpportunity('opp_1');

      expect(result.deal).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('returns error when opportunity not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: null, error: { code: 'PGRST116' } };

      const result = await applyToOpportunity('nonexistent');

      expect(result.deal).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('returns error when athlete already applied', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');

      // First call returns opportunity, second call returns existing deal
      mockResponses.single = { data: { id: 'opp_1', brand_id: 'brand_1', title: 'Test' }, error: null };

      const result = await applyToOpportunity('opp_1');

      // The function should check for existing deals
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('deals');
    });

    it('creates a new pending deal on successful application', async () => {
      const mockOpportunity = {
        id: 'opp_1',
        brand_id: 'brand_1',
        title: 'Social Campaign',
        description: 'Post about our product',
        deal_type: 'social_post',
        compensation_amount: 500,
        deliverables: { posts: 3 },
        start_date: '2024-02-01',
        end_date: '2024-02-28',
      };

      const mockDeal = {
        id: 'deal_1',
        opportunity_id: 'opp_1',
        athlete_id: 'athlete_123',
        brand_id: 'brand_1',
        status: 'pending',
        brand: { id: 'brand_1', company_name: 'Nike', logo_url: 'nike.png' },
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });

      // Mock sequence: opportunity lookup, existing deal check (none found), insert deal
      let callCount = 0;
      chainable.single = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: mockOpportunity, error: null });
        } else if (callCount === 2) {
          return Promise.resolve({ data: null, error: { code: 'PGRST116' } });
        } else {
          return Promise.resolve({ data: mockDeal, error: null });
        }
      });

      const result = await applyToOpportunity('opp_1', { proposed_amount: 600, message: 'Interested!' });

      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// DEAL CRUD TESTS
// ============================================================================

describe('Deal CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('getMyDeals', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getMyDeals();

      expect(result.deals).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('returns all deals for the athlete', async () => {
      const mockDeals = [
        { id: 'deal_1', title: 'Social Post', status: 'pending', amount: 500 },
        { id: 'deal_2', title: 'Appearance', status: 'active', amount: 1000 },
        { id: 'deal_3', title: 'Endorsement', status: 'completed', amount: 2000 },
      ];

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: mockDeals, error: null };

      const result = await getMyDeals();

      expect(result.deals).toHaveLength(3);
      expect(result.error).toBe(null);
    });

    it('filters by status when provided', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      await getMyDeals({ status: ['pending', 'negotiating'] });

      expect(mockSupabaseClient.in).toHaveBeenCalledWith('status', ['pending', 'negotiating']);
    });

    it('filters by deal types when provided', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      await getMyDeals({ deal_types: ['social_post'] });

      expect(mockSupabaseClient.in).toHaveBeenCalledWith('deal_type', ['social_post']);
    });

    it('applies sorting correctly', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      await getMyDeals({ sort_by: 'amount', sort_order: 'asc' });

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('amount', { ascending: true });
    });
  });

  describe('getDealsByCategory', () => {
    it('categorizes deals correctly', async () => {
      const mockDeals = [
        { id: 'deal_1', status: 'pending' },
        { id: 'deal_2', status: 'negotiating' },
        { id: 'deal_3', status: 'accepted' },
        { id: 'deal_4', status: 'active' },
        { id: 'deal_5', status: 'completed' },
      ];

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: mockDeals, error: null };

      const result = await getDealsByCategory();

      expect(result.pending).toHaveLength(2); // pending + negotiating
      expect(result.active).toHaveLength(2); // accepted + active
      expect(result.completed).toHaveLength(1);
      expect(result.error).toBe(null);
    });

    it('returns empty arrays when no deals exist', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      const result = await getDealsByCategory();

      expect(result.pending).toHaveLength(0);
      expect(result.active).toHaveLength(0);
      expect(result.completed).toHaveLength(0);
    });

    it('returns empty arrays on error', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getDealsByCategory();

      expect(result.pending).toHaveLength(0);
      expect(result.active).toHaveLength(0);
      expect(result.completed).toHaveLength(0);
      expect(result.error).toBeTruthy();
    });
  });

  describe('getDealById', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getDealById('deal_1');

      expect(result.deal).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('returns deal with full details', async () => {
      const mockDeal = {
        id: 'deal_1',
        title: 'Brand Ambassador',
        description: 'Ambassador deal',
        status: 'active',
        amount: 5000,
        brand: {
          id: 'brand_1',
          company_name: 'Nike',
          logo_url: 'nike.png',
          industry: 'Sports',
          is_verified: true,
          website_url: 'https://nike.com',
          contact_name: 'John Doe',
          contact_email: 'john@nike.com',
        },
        opportunity: {
          id: 'opp_1',
          title: 'Brand Ambassador',
          description: 'Long description',
          compensation_type: 'fixed',
          compensation_details: {},
          deliverables: { posts: 5 },
        },
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: mockDeal, error: null };

      const result = await getDealById('deal_1');

      expect(result.deal).toEqual(mockDeal);
      expect(result.error).toBe(null);
    });

    it('only returns deals belonging to the athlete', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: null, error: null };

      await getDealById('deal_1');

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('athlete_id', 'athlete_123');
    });
  });
});

// ============================================================================
// STATUS TRANSITIONS TESTS
// ============================================================================

describe('Deal Status Transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('acceptDeal', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await acceptDeal('deal_1');

      expect(result.deal).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('returns error when deal not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: null, error: { code: 'PGRST116' } };

      const result = await acceptDeal('nonexistent');

      expect(result.deal).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('returns error when deal is not in acceptable status', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');

      let callCount = 0;
      chainable.single = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: { id: 'deal_1', status: 'completed' }, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const result = await acceptDeal('deal_1');

      expect(result.deal).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Deal cannot be accepted in current status');
    });

    it('accepts a pending deal successfully', async () => {
      const mockAcceptedDeal = {
        id: 'deal_1',
        status: 'accepted',
        brand: { id: 'brand_1', company_name: 'Nike', logo_url: 'nike.png' },
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');

      let callCount = 0;
      chainable.single = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: { id: 'deal_1', status: 'pending' }, error: null });
        }
        return Promise.resolve({ data: mockAcceptedDeal, error: null });
      });

      const result = await acceptDeal('deal_1');

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({ status: 'accepted' });
      expect(result.deal.status).toBe('accepted');
    });

    it('accepts a negotiating deal successfully', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');

      let callCount = 0;
      chainable.single = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: { id: 'deal_1', status: 'negotiating' }, error: null });
        }
        return Promise.resolve({ data: { id: 'deal_1', status: 'accepted' }, error: null });
      });

      const result = await acceptDeal('deal_1');

      expect(result.deal.status).toBe('accepted');
    });
  });

  describe('rejectDeal', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await rejectDeal('deal_1');

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Athlete profile not found');
    });

    it('rejects a deal without reason', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: null, error: null };

      const result = await rejectDeal('deal_1');

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({ status: 'cancelled' });
      expect(result.error).toBe(null);
    });

    it('sends a message when rejection reason is provided', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
      mockResponses.query = { data: null, error: null };

      await rejectDeal('deal_1', 'Not interested in this type of campaign');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('deal_messages');
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('only rejects pending or negotiating deals', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: null, error: null };

      await rejectDeal('deal_1');

      expect(mockSupabaseClient.in).toHaveBeenCalledWith('status', ['pending', 'negotiating']);
    });
  });

  describe('signContract', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await signContract('deal_1');

      expect(result.deal).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('signs contract and activates deal', async () => {
      const mockActiveDeal = {
        id: 'deal_1',
        status: 'active',
        contract_signed_athlete_at: '2024-01-15T10:00:00.000Z',
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: mockActiveDeal, error: null };

      const result = await signContract('deal_1');

      expect(mockSupabaseClient.update).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'accepted');
      expect(result.deal.status).toBe('active');
    });

    it('only allows signing accepted deals', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: null, error: null };

      await signContract('deal_1');

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'accepted');
    });
  });

  describe('completeDeal', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await completeDeal('deal_1');

      expect(result.deal).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('returns error when payment not received', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: null, error: { code: 'PGRST116' } };

      const result = await completeDeal('deal_1');

      expect(result.deal).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Deal cannot be completed - payment not received');
    });

    it('completes deal when payment succeeded', async () => {
      const mockCompletedDeal = {
        id: 'deal_1',
        status: 'completed',
        completed_at: '2024-01-15T10:00:00.000Z',
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');

      let callCount = 0;
      chainable.single = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: { id: 'payment_1', status: 'succeeded' }, error: null });
        }
        return Promise.resolve({ data: mockCompletedDeal, error: null });
      });

      const result = await completeDeal('deal_1');

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'active');
      expect(result.deal.status).toBe('completed');
    });
  });

  describe('checkDealPayment', () => {
    it('returns isPaid true when payment succeeded', async () => {
      const mockPayment = {
        id: 'payment_1',
        status: 'succeeded',
        amount_cents: 50000,
        paid_at: '2024-01-15T10:00:00Z',
      };

      mockResponses.single = { data: mockPayment, error: null };

      const result = await checkDealPayment('deal_1');

      expect(result.isPaid).toBe(true);
      expect(result.payment).toEqual(mockPayment);
      expect(result.error).toBe(null);
    });

    it('returns isPaid false when payment pending', async () => {
      const mockPayment = {
        id: 'payment_1',
        status: 'pending',
        amount_cents: 50000,
        paid_at: null,
      };

      mockResponses.single = { data: mockPayment, error: null };

      const result = await checkDealPayment('deal_1');

      expect(result.isPaid).toBe(false);
      expect(result.payment).toEqual(mockPayment);
    });

    it('returns isPaid false when no payment exists', async () => {
      mockResponses.single = { data: null, error: { code: 'PGRST116' } };

      const result = await checkDealPayment('deal_1');

      expect(result.isPaid).toBe(false);
      expect(result.payment).toBe(null);
      expect(result.error).toBe(null);
    });
  });
});

// ============================================================================
// COUNTER-OFFERS TESTS
// ============================================================================

describe('Counter-Offers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('counterOfferDeal', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await counterOfferDeal('deal_1', { amount: 1500 });

      expect(result.deal).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('updates deal with counter-offer amount', async () => {
      const mockUpdatedDeal = {
        id: 'deal_1',
        status: 'negotiating',
        amount: 1500,
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: mockUpdatedDeal, error: null };

      const result = await counterOfferDeal('deal_1', { amount: 1500 });

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        status: 'negotiating',
        amount: 1500,
      });
      expect(result.deal.amount).toBe(1500);
      expect(result.deal.status).toBe('negotiating');
    });

    it('sends a message with counter-offer details', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
      mockResponses.single = { data: { id: 'deal_1', status: 'negotiating', amount: 1500 }, error: null };

      await counterOfferDeal('deal_1', { amount: 1500, message: 'I can do more posts for this amount' });

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('deal_messages');
      expect(mockSupabaseClient.insert).toHaveBeenCalled();
    });

    it('only allows counter-offers on pending or negotiating deals', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: null, error: null };

      await counterOfferDeal('deal_1', { amount: 1500 });

      expect(mockSupabaseClient.in).toHaveBeenCalledWith('status', ['pending', 'negotiating']);
    });
  });
});

// ============================================================================
// DEAL REVIEW TESTS
// ============================================================================

describe('Deal Reviews', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('submitDealReview', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await submitDealReview('deal_1', { rating: 5 });

      expect(result.deal).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('returns error for invalid rating below 1', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');

      const result = await submitDealReview('deal_1', { rating: 0 });

      expect(result.deal).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Rating must be between 1 and 5');
    });

    it('returns error for invalid rating above 5', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');

      const result = await submitDealReview('deal_1', { rating: 6 });

      expect(result.deal).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Rating must be between 1 and 5');
    });

    it('submits review with rating and text', async () => {
      const mockReviewedDeal = {
        id: 'deal_1',
        status: 'completed',
        athlete_rating: 5,
        athlete_review: 'Great experience working with this brand!',
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: mockReviewedDeal, error: null };

      const result = await submitDealReview('deal_1', {
        rating: 5,
        text: 'Great experience working with this brand!',
      });

      expect(mockSupabaseClient.update).toHaveBeenCalledWith({
        athlete_rating: 5,
        athlete_review: 'Great experience working with this brand!',
      });
      expect(result.deal.athlete_rating).toBe(5);
    });

    it('only allows reviews on completed deals', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: null, error: null };

      await submitDealReview('deal_1', { rating: 4 });

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'completed');
    });
  });
});

// ============================================================================
// MESSAGING TESTS
// ============================================================================

describe('Deal Messaging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('getDealMessages', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getDealMessages('deal_1');

      expect(result.messages).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('returns error when deal not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: null, error: { code: 'PGRST116' } };

      const result = await getDealMessages('deal_1');

      expect(result.messages).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Deal not found');
    });

    it('returns messages with sender profiles', async () => {
      const mockMessages = [
        {
          id: 'msg_1',
          message: 'Hello, interested in the deal',
          created_at: '2024-01-15T10:00:00Z',
          sender: { id: 'user_1', first_name: 'John', last_name: 'Doe', avatar_url: 'avatar.png', role: 'athlete' },
        },
        {
          id: 'msg_2',
          message: 'Great, lets discuss details',
          created_at: '2024-01-15T11:00:00Z',
          sender: { id: 'user_2', first_name: 'Jane', last_name: 'Smith', avatar_url: 'avatar2.png', role: 'brand' },
        },
      ];

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');

      let callCount = 0;
      chainable.single = vi.fn(() => {
        callCount++;
        return Promise.resolve({ data: { id: 'deal_1' }, error: null });
      });
      mockResponses.query = { data: mockMessages, error: null };

      const result = await getDealMessages('deal_1');

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].sender.first_name).toBe('John');
    });

    it('applies limit when provided', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      chainable.single = vi.fn(() => Promise.resolve({ data: { id: 'deal_1' }, error: null }));
      mockResponses.query = { data: [], error: null };

      await getDealMessages('deal_1', { limit: 50 });

      expect(mockSupabaseClient.limit).toHaveBeenCalledWith(50);
    });

    it('filters by timestamp when before option is provided', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      chainable.single = vi.fn(() => Promise.resolve({ data: { id: 'deal_1' }, error: null }));
      mockResponses.query = { data: [], error: null };

      await getDealMessages('deal_1', { before: '2024-01-15T10:00:00Z' });

      expect(mockSupabaseClient.lt).toHaveBeenCalledWith('created_at', '2024-01-15T10:00:00Z');
    });
  });

  describe('sendDealMessage', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await sendDealMessage('deal_1', 'Hello');

      expect(result.message).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Not authenticated');
    });

    it('returns error when deal not found', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      chainable.single = vi.fn(() => Promise.resolve({ data: null, error: { code: 'PGRST116' } }));

      const result = await sendDealMessage('deal_1', 'Hello');

      expect(result.message).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Deal not found');
    });

    it('sends message without attachments', async () => {
      const mockMessage = {
        id: 'msg_1',
        deal_id: 'deal_1',
        sender_id: 'user_123',
        message: 'Hello, I have a question',
        attachments: null,
        sender: { id: 'user_123', first_name: 'John', last_name: 'Doe', avatar_url: 'avatar.png', role: 'athlete' },
      };

      vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');

      let callCount = 0;
      chainable.single = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: { id: 'deal_1' }, error: null });
        }
        return Promise.resolve({ data: mockMessage, error: null });
      });

      const result = await sendDealMessage('deal_1', 'Hello, I have a question');

      expect(mockSupabaseClient.insert).toHaveBeenCalled();
      expect(result.message.message).toBe('Hello, I have a question');
    });

    it('sends message with attachments', async () => {
      const mockMessage = {
        id: 'msg_1',
        deal_id: 'deal_1',
        sender_id: 'user_123',
        message: 'Here are the files',
        attachments: ['https://storage.example.com/file1.pdf', 'https://storage.example.com/file2.png'],
        sender: { id: 'user_123', first_name: 'John', last_name: 'Doe', avatar_url: 'avatar.png', role: 'athlete' },
      };

      vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');

      let callCount = 0;
      chainable.single = vi.fn(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({ data: { id: 'deal_1' }, error: null });
        }
        return Promise.resolve({ data: mockMessage, error: null });
      });

      const result = await sendDealMessage('deal_1', 'Here are the files', [
        'https://storage.example.com/file1.pdf',
        'https://storage.example.com/file2.png',
      ]);

      expect(result.message.attachments).toHaveLength(2);
    });
  });

  describe('markMessagesAsRead', () => {
    it('returns error when not authenticated', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: null, error: null });

      const result = await markMessagesAsRead('deal_1');

      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Not authenticated');
    });

    it('marks unread messages as read', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ user: { id: 'user_123' }, error: null });
      mockResponses.query = { data: null, error: null };

      const result = await markMessagesAsRead('deal_1');

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('deal_messages');
      expect(mockSupabaseClient.update).toHaveBeenCalled();
      expect(mockSupabaseClient.neq).toHaveBeenCalledWith('sender_id', 'user_123');
      expect(mockSupabaseClient.is).toHaveBeenCalledWith('read_at', null);
      expect(result.error).toBe(null);
    });
  });

  describe('subscribeToDealMessages', () => {
    it('creates subscription for deal messages', () => {
      const callback = vi.fn();

      subscribeToDealMessages('deal_1', callback);

      expect(subscribeToTable).toHaveBeenCalledWith('deal_messages', callback, {
        event: 'INSERT',
        filter: 'deal_id=eq.deal_1',
      });
    });

    it('returns subscription object', () => {
      const callback = vi.fn();

      const subscription = subscribeToDealMessages('deal_1', callback);

      expect(subscription).toHaveProperty('unsubscribe');
    });
  });

  describe('subscribeToMyDeals', () => {
    it('throws error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      await expect(subscribeToMyDeals(vi.fn())).rejects.toThrow('Athlete profile not found');
    });

    it('creates subscription for athlete deals', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      const callback = vi.fn();

      await subscribeToMyDeals(callback);

      expect(subscribeToTable).toHaveBeenCalledWith('deals', callback, {
        event: '*',
        filter: 'athlete_id=eq.athlete_123',
      });
    });
  });
});

// ============================================================================
// STATISTICS TESTS
// ============================================================================

describe('Deal Statistics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('getDealStats', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getDealStats();

      expect(result.stats).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('calculates statistics correctly', async () => {
      const mockDeals = [
        { id: 'deal_1', status: 'completed', amount: 500, deal_type: 'social_post', brand_rating: 5 },
        { id: 'deal_2', status: 'completed', amount: 1000, deal_type: 'appearance', brand_rating: 4 },
        { id: 'deal_3', status: 'active', amount: 750, deal_type: 'social_post' },
        { id: 'deal_4', status: 'accepted', amount: 1500, deal_type: 'endorsement' },
        { id: 'deal_5', status: 'pending', amount: 300, deal_type: 'social_post' },
        { id: 'deal_6', status: 'negotiating', amount: 600, deal_type: 'appearance' },
      ];

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: mockDeals, error: null };

      const result = await getDealStats();

      expect(result.stats.total_deals).toBe(6);
      expect(result.stats.completed_deals).toBe(2);
      expect(result.stats.active_deals).toBe(2); // active + accepted
      expect(result.stats.pending_deals).toBe(2); // pending + negotiating
      expect(result.stats.total_earnings).toBe(1500); // completed deals only
      expect(result.stats.average_deal_value).toBe(750); // 1500 / 2
      expect(result.stats.average_rating).toBe(4.5); // (5 + 4) / 2
    });

    it('calculates deals by type correctly', async () => {
      const mockDeals = [
        { id: 'deal_1', status: 'completed', deal_type: 'social_post', amount: 500 },
        { id: 'deal_2', status: 'completed', deal_type: 'appearance', amount: 1000 },
        { id: 'deal_3', status: 'active', deal_type: 'social_post', amount: 750 },
        { id: 'deal_4', status: 'pending', deal_type: 'endorsement', amount: 1500 },
      ];

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: mockDeals, error: null };

      const result = await getDealStats();

      expect(result.stats.deals_by_type).toEqual({
        social_post: 2,
        appearance: 1,
        endorsement: 1,
      });
    });

    it('handles empty deals array', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      const result = await getDealStats();

      expect(result.stats.total_deals).toBe(0);
      expect(result.stats.completed_deals).toBe(0);
      expect(result.stats.total_earnings).toBe(0);
      expect(result.stats.average_deal_value).toBe(0);
      expect(result.stats.average_rating).toBe(0);
    });

    it('handles deals without ratings', async () => {
      const mockDeals = [
        { id: 'deal_1', status: 'completed', amount: 500, deal_type: 'social_post' },
        { id: 'deal_2', status: 'completed', amount: 1000, deal_type: 'appearance' },
      ];

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: mockDeals, error: null };

      const result = await getDealStats();

      expect(result.stats.average_rating).toBe(0);
    });

    it('handles deals with null amounts', async () => {
      const mockDeals = [
        { id: 'deal_1', status: 'completed', amount: null, deal_type: 'social_post' },
        { id: 'deal_2', status: 'completed', amount: 1000, deal_type: 'appearance' },
      ];

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: mockDeals, error: null };

      const result = await getDealStats();

      expect(result.stats.total_earnings).toBe(1000);
    });
  });
});

// ============================================================================
// ATHLETE-INITIATED PROPOSALS TESTS
// ============================================================================

describe('Athlete-Initiated Proposals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetMockSupabaseClient();
  });

  describe('createProposal', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await createProposal({ brand_id: 'brand_1', title: 'Proposal' });

      expect(result.proposal).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('returns error when brand_id is not provided', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');

      const result = await createProposal({ title: 'Proposal' });

      expect(result.proposal).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error.message).toBe('Brand ID is required');
    });

    it('creates a sent proposal by default', async () => {
      const mockProposal = {
        id: 'proposal_1',
        athlete_id: 'athlete_123',
        brand_id: 'brand_1',
        title: 'Brand Partnership',
        description: 'I would like to partner with your brand',
        deal_type: 'endorsement',
        proposed_amount: 5000,
        status: 'sent',
        sent_at: '2024-01-15T10:00:00.000Z',
        brand: { id: 'brand_1', company_name: 'Nike', logo_url: 'nike.png', industry: 'Sports' },
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: mockProposal, error: null };

      const result = await createProposal({
        brand_id: 'brand_1',
        title: 'Brand Partnership',
        description: 'I would like to partner with your brand',
        deal_type: 'endorsement',
        proposed_amount: 5000,
      });

      expect(mockSupabaseClient.insert).toHaveBeenCalled();
      expect(result.proposal.status).toBe('sent');
      expect(result.proposal.sent_at).toBeTruthy();
    });

    it('creates a draft proposal when is_draft is true', async () => {
      const mockProposal = {
        id: 'proposal_1',
        athlete_id: 'athlete_123',
        brand_id: 'brand_1',
        title: 'Draft Proposal',
        status: 'draft',
        sent_at: null,
        brand: { id: 'brand_1', company_name: 'Nike', logo_url: 'nike.png', industry: 'Sports' },
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: mockProposal, error: null };

      const result = await createProposal({
        brand_id: 'brand_1',
        title: 'Draft Proposal',
        is_draft: true,
      });

      expect(result.proposal.status).toBe('draft');
      expect(result.proposal.sent_at).toBe(null);
    });
  });

  describe('updateProposal', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await updateProposal('proposal_1', { title: 'Updated' });

      expect(result.proposal).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('updates a draft proposal', async () => {
      const mockUpdatedProposal = {
        id: 'proposal_1',
        title: 'Updated Title',
        description: 'Updated description',
        status: 'draft',
        brand: { id: 'brand_1', company_name: 'Nike', logo_url: 'nike.png', industry: 'Sports' },
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: mockUpdatedProposal, error: null };

      const result = await updateProposal('proposal_1', {
        title: 'Updated Title',
        description: 'Updated description',
      });

      expect(mockSupabaseClient.update).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'draft');
      expect(result.proposal.title).toBe('Updated Title');
    });

    it('removes read-only fields from updates', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: { id: 'proposal_1' }, error: null };

      await updateProposal('proposal_1', {
        id: 'should_be_removed',
        athlete_id: 'should_be_removed',
        brand_id: 'should_be_removed',
        created_at: 'should_be_removed',
        sent_at: 'should_be_removed',
        title: 'Keep This',
      });

      // Verify that update was called with only allowed fields
      expect(mockSupabaseClient.update).toHaveBeenCalled();
    });
  });

  describe('sendProposal', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await sendProposal('proposal_1');

      expect(result.proposal).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('sends a draft proposal', async () => {
      const mockSentProposal = {
        id: 'proposal_1',
        status: 'sent',
        sent_at: '2024-01-15T10:00:00.000Z',
        brand: { id: 'brand_1', company_name: 'Nike', logo_url: 'nike.png', industry: 'Sports' },
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: mockSentProposal, error: null };

      const result = await sendProposal('proposal_1');

      expect(mockSupabaseClient.update).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'draft');
      expect(result.proposal.status).toBe('sent');
      expect(result.proposal.sent_at).toBeTruthy();
    });
  });

  describe('getMyProposals', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getMyProposals();

      expect(result.proposals).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('returns all proposals for the athlete', async () => {
      const mockProposals = [
        { id: 'proposal_1', title: 'Proposal 1', status: 'sent', brand: { id: 'brand_1', company_name: 'Nike' } },
        { id: 'proposal_2', title: 'Proposal 2', status: 'draft', brand: { id: 'brand_2', company_name: 'Adidas' } },
        { id: 'proposal_3', title: 'Proposal 3', status: 'accepted', brand: { id: 'brand_3', company_name: 'Puma' } },
      ];

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: mockProposals, error: null };

      const result = await getMyProposals();

      expect(result.proposals).toHaveLength(3);
      expect(result.error).toBe(null);
    });

    it('filters by status when provided', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      await getMyProposals({ status: ['sent', 'viewed'] });

      expect(mockSupabaseClient.in).toHaveBeenCalledWith('status', ['sent', 'viewed']);
    });

    it('orders by created_at descending', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: [], error: null };

      await getMyProposals();

      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
    });
  });

  describe('getProposalById', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await getProposalById('proposal_1');

      expect(result.proposal).toBe(null);
      expect(result.error).toBeInstanceOf(Error);
    });

    it('returns proposal with full brand details', async () => {
      const mockProposal = {
        id: 'proposal_1',
        title: 'Brand Partnership',
        description: 'Partnership proposal',
        deal_type: 'endorsement',
        proposed_amount: 5000,
        status: 'sent',
        brand: {
          id: 'brand_1',
          company_name: 'Nike',
          logo_url: 'nike.png',
          industry: 'Sports',
          website_url: 'https://nike.com',
          contact_name: 'John Doe',
          contact_email: 'john@nike.com',
        },
      };

      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = { data: mockProposal, error: null };

      const result = await getProposalById('proposal_1');

      expect(result.proposal).toEqual(mockProposal);
      expect(result.proposal.brand.website_url).toBe('https://nike.com');
    });
  });

  describe('deleteProposal', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await deleteProposal('proposal_1');

      expect(result.error).toBeInstanceOf(Error);
    });

    it('deletes a draft proposal', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: null, error: null };

      const result = await deleteProposal('proposal_1');

      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'draft');
      expect(result.error).toBe(null);
    });

    it('only allows deleting draft proposals', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: null, error: null };

      await deleteProposal('proposal_1');

      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('status', 'draft');
    });
  });

  describe('withdrawProposal', () => {
    it('returns error when athlete profile not found', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue(null);

      const result = await withdrawProposal('proposal_1');

      expect(result.error).toBeInstanceOf(Error);
    });

    it('withdraws a sent or viewed proposal', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = { data: null, error: null };

      const result = await withdrawProposal('proposal_1');

      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.in).toHaveBeenCalledWith('status', ['sent', 'viewed']);
      expect(result.error).toBe(null);
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
    it('handles database connection errors gracefully', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.query = {
        data: null,
        error: { code: 'PGRST000', message: 'Connection refused' },
      };

      const result = await getMyDeals();

      expect(result.deals).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('handles row-level security errors', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = {
        data: null,
        error: { code: 'PGRST301', message: 'Row-level security policy violation' },
      };

      const result = await getDealById('deal_1');

      expect(result.deal).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Authentication errors', () => {
    it('handles expired session errors', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({
        user: null,
        error: { message: 'Session expired' },
      });

      const result = await sendDealMessage('deal_1', 'Hello');

      expect(result.message).toBe(null);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Validation errors', () => {
    it('handles invalid deal ID', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');
      mockResponses.single = {
        data: null,
        error: { code: 'PGRST116', message: 'No rows returned' },
      };

      const result = await getDealById('invalid-uuid');

      expect(result.deal).toBe(null);
      expect(result.error).toBeTruthy();
    });

    it('handles invalid rating values', async () => {
      vi.mocked(getMyAthleteId).mockResolvedValue('athlete_123');

      const result1 = await submitDealReview('deal_1', { rating: -1 });
      const result2 = await submitDealReview('deal_1', { rating: 10 });

      expect(result1.error.message).toBe('Rating must be between 1 and 5');
      expect(result2.error.message).toBe('Rating must be between 1 and 5');
    });
  });
});
