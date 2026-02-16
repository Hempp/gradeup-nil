/**
 * Tests for the opportunities service
 * @module __tests__/services/opportunities.test
 */

import {
  applyToOpportunity,
  getMyApplications,
  withdrawApplication,
  getOpportunityApplications,
  acceptApplication,
  rejectApplication,
  getApplicationById,
  hasApplied,
  type Application,
  type ApplicationStatus,
} from '@/lib/services/opportunities';

// Mock the Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(),
}));

import { createClient } from '@/lib/supabase/client';

const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

// Helper to create a chainable mock query builder that properly tracks all calls
function createChainableQuery(finalResult: { data: unknown; error: unknown; count?: number | null }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockQuery: any = {};

  // All methods return the same mockQuery object for chaining
  const chainableMethods = ['select', 'eq', 'in', 'neq', 'order', 'update', 'insert', 'range'];
  chainableMethods.forEach((method) => {
    mockQuery[method] = jest.fn().mockReturnValue(mockQuery);
  });

  // single() is terminal and returns a promise
  mockQuery.single = jest.fn().mockResolvedValue(finalResult);

  // Make the query thenable (awaitable) to return the final result when awaited
  mockQuery.then = (onFulfilled: (value: unknown) => unknown) => {
    return Promise.resolve(finalResult).then(onFulfilled);
  };

  return mockQuery;
}

// Sample test data
const mockApplication: Application = {
  id: 'app-123',
  athlete_id: 'athlete-123',
  opportunity_id: 'opp-123',
  status: 'pending',
  cover_letter: 'I am excited to apply for this opportunity.',
  portfolio_url: 'https://example.com/portfolio',
  additional_info: 'Available immediately.',
  submitted_at: '2024-01-15T10:00:00Z',
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  opportunity: {
    id: 'opp-123',
    title: 'Summer Campaign',
    description: 'Looking for athletes for summer campaign',
    compensation_amount: 3000,
    deal_type: 'social_post',
    status: 'active',
    brand: {
      id: 'brand-123',
      company_name: 'Nike',
      logo_url: 'https://example.com/nike-logo.png',
    },
  },
};

const mockApplicationWithAthlete: Application = {
  ...mockApplication,
  athlete: {
    id: 'athlete-123',
    first_name: 'John',
    last_name: 'Doe',
    avatar_url: 'https://example.com/avatar.png',
    sport: {
      name: 'Basketball',
    },
    school: {
      name: 'University of State',
    },
  },
};

describe('opportunities service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('applyToOpportunity', () => {
    it('creates a new application successfully', async () => {
      // First query checks for existing application (returns nothing - PGRST116)
      const checkQuery = createChainableQuery({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' }
      });

      // Second query creates the new application
      const insertQuery = createChainableQuery({ data: mockApplication, error: null });

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return checkQuery;
          }
          return insertQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await applyToOpportunity('athlete-123', 'opp-123', {
        cover_letter: 'I am excited to apply for this opportunity.',
        portfolio_url: 'https://example.com/portfolio',
        additional_info: 'Available immediately.',
      });

      expect(result.data).toEqual(mockApplication);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('opportunity_applications');
    });

    it('returns error when athlete has already applied', async () => {
      const existingApplication = { id: 'app-existing', status: 'pending' };
      const checkQuery = createChainableQuery({ data: existingApplication, error: null });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(checkQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await applyToOpportunity('athlete-123', 'opp-123');

      expect(result.data).toBeNull();
      expect(result.error).toBeInstanceOf(Error);
      expect(result.error?.message).toBe('You have already applied to this opportunity');
    });

    it('resubmits application if previously withdrawn', async () => {
      const withdrawnApplication = { id: 'app-withdrawn', status: 'withdrawn' };
      const checkQuery = createChainableQuery({ data: withdrawnApplication, error: null });

      const resubmittedApplication = { ...mockApplication, id: 'app-withdrawn', status: 'pending' };
      const updateQuery = createChainableQuery({ data: resubmittedApplication, error: null });

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return checkQuery;
          }
          return updateQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await applyToOpportunity('athlete-123', 'opp-123', {
        cover_letter: 'Reapplying for this opportunity.',
      });

      expect(result.data).toEqual(resubmittedApplication);
      expect(result.error).toBeNull();
      expect(updateQuery.update).toHaveBeenCalled();
    });

    it('returns error on database failure during check', async () => {
      const checkQuery = createChainableQuery({
        data: null,
        error: { code: 'OTHER_ERROR', message: 'Database connection failed' }
      });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(checkQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await applyToOpportunity('athlete-123', 'opp-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to check existing application');
    });

    it('returns error on insert failure', async () => {
      const checkQuery = createChainableQuery({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' }
      });

      const insertQuery = createChainableQuery({
        data: null,
        error: { message: 'Insert failed' }
      });

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return checkQuery;
          }
          return insertQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await applyToOpportunity('athlete-123', 'opp-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to submit application');
    });

    it('returns error on resubmit failure', async () => {
      const withdrawnApplication = { id: 'app-withdrawn', status: 'withdrawn' };
      const checkQuery = createChainableQuery({ data: withdrawnApplication, error: null });

      const updateQuery = createChainableQuery({
        data: null,
        error: { message: 'Update failed' }
      });

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return checkQuery;
          }
          return updateQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await applyToOpportunity('athlete-123', 'opp-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to resubmit application');
    });
  });

  describe('getMyApplications', () => {
    it('returns all applications for an athlete', async () => {
      const applications = [mockApplication, { ...mockApplication, id: 'app-456' }];
      const mockQuery = createChainableQuery({ data: applications, error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMyApplications('athlete-123');

      expect(result.data).toEqual(applications);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('opportunity_applications');
      expect(mockQuery.eq).toHaveBeenCalledWith('athlete_id', 'athlete-123');
      expect(mockQuery.order).toHaveBeenCalledWith('submitted_at', { ascending: false });
    });

    it('returns empty array when no applications found', async () => {
      const mockQuery = createChainableQuery({ data: [], error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMyApplications('athlete-123');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('returns error on database failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Database error' } });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getMyApplications('athlete-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch applications');
    });
  });

  describe('withdrawApplication', () => {
    it('withdraws an application successfully', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      // Override 'in' to chain properly and return the final result
      mockQuery.in = jest.fn().mockResolvedValue({ error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await withdrawApplication('app-123');

      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('opportunity_applications');
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'withdrawn',
        })
      );
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'app-123');
      expect(mockQuery.in).toHaveBeenCalledWith('status', ['pending', 'under_review']);
    });

    it('returns error on database failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      mockQuery.in = jest.fn().mockResolvedValue({ error: { message: 'Update failed' } });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await withdrawApplication('app-123');

      expect(result.error?.message).toContain('Failed to withdraw application');
    });
  });

  describe('getOpportunityApplications', () => {
    it('returns all non-withdrawn applications for an opportunity', async () => {
      const applications = [mockApplicationWithAthlete];
      const mockQuery = createChainableQuery({ data: applications, error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getOpportunityApplications('opp-123');

      expect(result.data).toEqual(applications);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('opportunity_applications');
      expect(mockQuery.eq).toHaveBeenCalledWith('opportunity_id', 'opp-123');
      expect(mockQuery.neq).toHaveBeenCalledWith('status', 'withdrawn');
      expect(mockQuery.order).toHaveBeenCalledWith('submitted_at', { ascending: true });
    });

    it('returns empty array when no applications found', async () => {
      const mockQuery = createChainableQuery({ data: [], error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getOpportunityApplications('opp-123');

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });

    it('returns error on database failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Database error' } });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getOpportunityApplications('opp-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch applications');
    });
  });

  describe('acceptApplication', () => {
    it('accepts an application and creates a deal', async () => {
      const applicationWithOpp = {
        ...mockApplication,
        opportunity: {
          id: 'opp-123',
          brand_id: 'brand-123',
          title: 'Summer Campaign',
          description: 'Campaign description',
          deal_type: 'social_post',
          compensation_amount: 3000,
          compensation_type: 'fixed',
        },
      };

      // First query fetches the application
      const fetchQuery = createChainableQuery({ data: applicationWithOpp, error: null });

      // Second query updates the application status
      const updateQuery = createChainableQuery({ data: null, error: null });
      updateQuery.eq = jest.fn().mockResolvedValue({ error: null });

      // Third query creates the deal
      const dealQuery = createChainableQuery({ data: { id: 'deal-new' }, error: null });

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (callCount === 1) {
            return fetchQuery;
          }
          if (callCount === 2) {
            return updateQuery;
          }
          if (table === 'deals' || callCount === 3) {
            return dealQuery;
          }
          return fetchQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await acceptApplication('app-123', 'brand-user-123');

      expect(result.data).not.toBeNull();
      expect(result.data?.dealId).toBe('deal-new');
      expect(result.error).toBeNull();
    });

    it('returns error when fetching application fails', async () => {
      const fetchQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });

      const mockSupabase = {
        from: jest.fn().mockReturnValue(fetchQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await acceptApplication('app-123', 'brand-user-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch application');
    });

    it('returns error when updating application fails', async () => {
      const applicationWithOpp = {
        ...mockApplication,
        opportunity: {
          id: 'opp-123',
          brand_id: 'brand-123',
          title: 'Summer Campaign',
          description: 'Campaign description',
          deal_type: 'social_post',
          compensation_amount: 3000,
          compensation_type: 'fixed',
        },
      };

      const fetchQuery = createChainableQuery({ data: applicationWithOpp, error: null });

      const updateQuery = createChainableQuery({ data: null, error: null });
      updateQuery.eq = jest.fn().mockResolvedValue({ error: { message: 'Update failed' } });

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return fetchQuery;
          }
          return updateQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await acceptApplication('app-123', 'brand-user-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to accept application');
    });

    it('returns error when creating deal fails', async () => {
      const applicationWithOpp = {
        ...mockApplication,
        opportunity: {
          id: 'opp-123',
          brand_id: 'brand-123',
          title: 'Summer Campaign',
          description: 'Campaign description',
          deal_type: 'social_post',
          compensation_amount: 3000,
          compensation_type: 'fixed',
        },
      };

      const fetchQuery = createChainableQuery({ data: applicationWithOpp, error: null });

      const updateQuery = createChainableQuery({ data: null, error: null });
      updateQuery.eq = jest.fn().mockResolvedValue({ error: null });

      const dealQuery = createChainableQuery({ data: null, error: { message: 'Deal creation failed' } });

      let callCount = 0;
      const mockSupabase = {
        from: jest.fn().mockImplementation((table: string) => {
          callCount++;
          if (callCount === 1) {
            return fetchQuery;
          }
          if (callCount === 2) {
            return updateQuery;
          }
          if (table === 'deals' || callCount === 3) {
            return dealQuery;
          }
          return fetchQuery;
        }),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await acceptApplication('app-123', 'brand-user-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to create deal from application');
    });
  });

  describe('rejectApplication', () => {
    it('rejects an application without reason', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      mockQuery.eq = jest.fn().mockResolvedValue({ error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await rejectApplication('app-123', 'brand-user-123');

      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('opportunity_applications');
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'rejected',
          reviewed_by: 'brand-user-123',
        })
      );
    });

    it('rejects an application with reason', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      mockQuery.eq = jest.fn().mockResolvedValue({ error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await rejectApplication('app-123', 'brand-user-123', 'Not a good fit for this campaign');

      expect(result.error).toBeNull();
      expect(mockQuery.update).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'rejected',
          reviewed_by: 'brand-user-123',
          rejection_reason: 'Not a good fit for this campaign',
        })
      );
    });

    it('returns error on database failure', async () => {
      const mockQuery = createChainableQuery({ data: null, error: null });
      mockQuery.eq = jest.fn().mockResolvedValue({ error: { message: 'Update failed' } });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await rejectApplication('app-123', 'brand-user-123');

      expect(result.error?.message).toContain('Failed to reject application');
    });
  });

  describe('getApplicationById', () => {
    it('returns an application by ID', async () => {
      const mockQuery = createChainableQuery({ data: mockApplicationWithAthlete, error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getApplicationById('app-123');

      expect(result.data).toEqual(mockApplicationWithAthlete);
      expect(result.error).toBeNull();
      expect(mockSupabase.from).toHaveBeenCalledWith('opportunity_applications');
      expect(mockQuery.eq).toHaveBeenCalledWith('id', 'app-123');
    });

    it('returns error when application not found', async () => {
      const mockQuery = createChainableQuery({ data: null, error: { message: 'Not found' } });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await getApplicationById('nonexistent');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch application');
    });
  });

  describe('hasApplied', () => {
    it('returns applied true when athlete has an active application', async () => {
      const mockQuery = createChainableQuery({ data: { status: 'pending' }, error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await hasApplied('athlete-123', 'opp-123');

      expect(result.data?.applied).toBe(true);
      expect(result.data?.status).toBe('pending');
      expect(result.error).toBeNull();
      expect(mockQuery.eq).toHaveBeenCalledWith('athlete_id', 'athlete-123');
      expect(mockQuery.eq).toHaveBeenCalledWith('opportunity_id', 'opp-123');
    });

    it('returns applied false when application is withdrawn', async () => {
      const mockQuery = createChainableQuery({ data: { status: 'withdrawn' }, error: null });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await hasApplied('athlete-123', 'opp-123');

      expect(result.data?.applied).toBe(false);
      expect(result.data?.status).toBe('withdrawn');
      expect(result.error).toBeNull();
    });

    it('returns applied false when no application exists', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { code: 'PGRST116', message: 'Row not found' }
      });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await hasApplied('athlete-123', 'opp-123');

      expect(result.data?.applied).toBe(false);
      expect(result.data?.status).toBeUndefined();
      expect(result.error).toBeNull();
    });

    it('returns applied true for different statuses', async () => {
      const statuses: ApplicationStatus[] = ['pending', 'under_review', 'accepted', 'rejected'];

      for (const status of statuses) {
        const mockQuery = createChainableQuery({ data: { status }, error: null });
        const mockSupabase = {
          from: jest.fn().mockReturnValue(mockQuery),
        };
        mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

        const result = await hasApplied('athlete-123', 'opp-123');

        expect(result.data?.applied).toBe(true);
        expect(result.data?.status).toBe(status);
      }
    });

    it('returns error on database failure', async () => {
      const mockQuery = createChainableQuery({
        data: null,
        error: { code: 'OTHER_ERROR', message: 'Database error' }
      });
      const mockSupabase = {
        from: jest.fn().mockReturnValue(mockQuery),
      };
      mockCreateClient.mockReturnValue(mockSupabase as unknown as ReturnType<typeof createClient>);

      const result = await hasApplied('athlete-123', 'opp-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to check application status');
    });
  });
});
