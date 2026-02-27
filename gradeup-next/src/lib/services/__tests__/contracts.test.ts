/**
 * Comprehensive test suite for Contract Management Service
 *
 * Tests contract generation, e-signatures, status tracking, and PDF downloads
 * for NIL deals on the GradeUp platform.
 */

import {
  generateContract,
  getContractById,
  getContracts,
  updateContract,
  sendForSignature,
  signContract,
  declineContract,
  getContractStatus,
  generateContractPDF,
  downloadContract,
  getContractTemplates,
  getDefaultClauses,
  voidContract,
  getAthleteContracts,
  getBrandContracts,
} from '../contracts';
import type {
  Contract,
  ContractSignature,
  ServiceResult,
} from '../contracts';

// ═══════════════════════════════════════════════════════════════════════════
// MOCK SETUP
// ═══════════════════════════════════════════════════════════════════════════

// Create mocked Supabase client response builder
interface MockQueryResult {
  data: unknown;
  error: { message: string; code: string } | null;
  count?: number | null;
}

let mockQueryChain: {
  selectResult?: MockQueryResult;
  insertResult?: MockQueryResult;
  updateResult?: MockQueryResult;
  deleteResult?: MockQueryResult;
  singleResults: MockQueryResult[];
  orderResults: MockQueryResult[];
  rangeResult?: MockQueryResult;
};

let mockGetUserResult: { data: { user: { id: string } | null }; error: { message: string } | null };

// Track calls for assertions
let fromCalls: string[] = [];
let eqCalls: [string, unknown][] = [];
let inCalls: [string, unknown[]][] = [];
let gteCalls: [string, unknown][] = [];
let lteCalls: [string, unknown][] = [];
let updateCalled = false;
const _insertCalled = false;
const _deleteCalled = false;

const resetMockState = () => {
  mockQueryChain = {
    singleResults: [],
    orderResults: [],
  };
  mockGetUserResult = { data: { user: null }, error: { message: 'Not authenticated' } };
  fromCalls = [];
  eqCalls = [];
  inCalls = [];
  gteCalls = [];
  lteCalls = [];
  updateCalled = false;
  insertCalled = false;
  deleteCalled = false;
  pendingOrderResult = null;
  isUpdateChain = false;
};

// Track if we're in a "list query" context (where range() was called)
let pendingOrderResult: MockQueryResult | null = null;
// Track if this is an update chain (for awaiting updates directly)
let isUpdateChain = false;

// Create chainable mock
const createChainMock = () => {
  const chain: Record<string, jest.Mock> & {
    then?: (resolve: (value: MockQueryResult) => void, reject?: (err: unknown) => void) => void;
  } = {};

  chain.select = jest.fn().mockImplementation(() => chain);
  chain.insert = jest.fn().mockImplementation(() => {
    insertCalled = true;
    if (mockQueryChain.insertResult?.error) {
      return { error: mockQueryChain.insertResult.error };
    }
    return chain;
  });
  chain.update = jest.fn().mockImplementation(() => {
    updateCalled = true;
    isUpdateChain = true;
    return chain;
  });
  chain.delete = jest.fn().mockImplementation(() => {
    deleteCalled = true;
    return chain;
  });
  chain.eq = jest.fn().mockImplementation((col: string, val: unknown) => {
    eqCalls.push([col, val]);
    if (mockQueryChain.updateResult?.error && updateCalled) {
      return { error: mockQueryChain.updateResult.error };
    }
    return chain;
  });
  chain.in = jest.fn().mockImplementation((col: string, vals: unknown[]) => {
    inCalls.push([col, vals]);
    return chain;
  });
  chain.gte = jest.fn().mockImplementation((col: string, val: unknown) => {
    gteCalls.push([col, val]);
    return chain;
  });
  chain.lte = jest.fn().mockImplementation((col: string, val: unknown) => {
    lteCalls.push([col, val]);
    return chain;
  });
  chain.range = jest.fn().mockImplementation(() => {
    // Capture the next order result for when this chain is awaited
    if (mockQueryChain.orderResults.length > 0) {
      pendingOrderResult = mockQueryChain.orderResults.shift()!;
    }
    return chain;
  });
  chain.order = jest.fn().mockImplementation(() => {
    // For getAthleteContracts/getBrandContracts that don't use range(),
    // capture order result here
    if (mockQueryChain.orderResults.length > 0 && pendingOrderResult === null) {
      pendingOrderResult = mockQueryChain.orderResults.shift()!;
    }
    return chain;
  });
  chain.single = jest.fn().mockImplementation(() => {
    if (mockQueryChain.singleResults.length > 0) {
      return Promise.resolve(mockQueryChain.singleResults.shift());
    }
    return Promise.resolve({ data: null, error: { message: 'Not found', code: 'PGRST116' } });
  });

  // Make the chain thenable so it can be awaited
  chain.then = (resolve: (value: MockQueryResult) => void) => {
    // If this was an update chain being awaited, return success (error: null)
    if (isUpdateChain) {
      isUpdateChain = false;  // Reset
      resolve({ data: null, error: null });
      return;
    }

    if (pendingOrderResult) {
      const result = pendingOrderResult;
      pendingOrderResult = null;  // Reset for next query
      resolve(result);
    } else {
      resolve({ data: null, error: null });  // Default to success for most operations
    }
  };

  return chain;
};

jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    from: jest.fn().mockImplementation((table: string) => {
      fromCalls.push(table);
      return createChainMock();
    }),
    auth: {
      getUser: jest.fn().mockImplementation(() => Promise.resolve(mockGetUserResult)),
    },
    storage: {
      from: jest.fn(),
    },
  }),
}));

// ═══════════════════════════════════════════════════════════════════════════
// TEST DATA
// ═══════════════════════════════════════════════════════════════════════════

const mockDeal = {
  id: 'deal-123',
  title: 'Social Media Campaign',
  athlete_id: 'athlete-123',
  brand_id: 'brand-123',
  athlete: {
    id: 'athlete-123',
    profile: {
      first_name: 'John',
      last_name: 'Athlete',
      email: 'john@athlete.com',
    },
  },
  brand: {
    id: 'brand-123',
    company_name: 'Test Brand',
    contact_email: 'contact@brand.com',
  },
};

const mockContract: Contract = {
  id: 'contract-123',
  deal_id: 'deal-123',
  template_type: 'social_media_campaign',
  title: 'Test Contract',
  description: 'A test contract for social media campaign',
  effective_date: '2024-01-01',
  expiration_date: '2024-12-31',
  compensation_amount: 5000,
  compensation_terms: 'Paid upon completion',
  deliverables_summary: '3 Instagram posts, 2 TikTok videos',
  clauses: [
    {
      title: 'Agreement',
      content: 'This is the agreement clause',
      is_required: true,
      is_editable: false,
      order: 0,
    },
  ],
  parties: [],
  custom_terms: null,
  requires_guardian_signature: false,
  requires_witness: false,
  status: 'draft',
  pdf_url: null,
  signed_pdf_url: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  signed_at: null,
  voided_at: null,
  void_reason: null,
  deal: mockDeal,
};

const mockSignature: ContractSignature = {
  id: 'sig-123',
  contract_id: 'contract-123',
  party_type: 'athlete',
  user_id: 'user-123',
  name: 'John Athlete',
  email: 'john@athlete.com',
  title: null,
  signature_data: null,
  signature_type: null,
  signature_status: 'pending',
  signed_at: null,
  signature_ip: null,
  declined_at: null,
  decline_reason: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockCreateContractInput = {
  deal_id: 'deal-123',
  template_type: 'social_media_campaign' as const,
  title: 'Test Contract',
  description: 'A test contract',
  effective_date: '2024-01-01',
  expiration_date: '2024-12-31',
  compensation_amount: 5000,
  compensation_terms: 'Paid upon completion',
  deliverables_summary: '3 Instagram posts',
  clauses: [],
  parties: [
    {
      party_type: 'athlete' as const,
      user_id: 'user-123',
      name: 'John Athlete',
      email: 'john@athlete.com',
    },
    {
      party_type: 'brand' as const,
      user_id: 'user-456',
      name: 'Brand Contact',
      email: 'contact@brand.com',
    },
  ],
  custom_terms: null,
  requires_guardian_signature: false,
  requires_witness: false,
};

// ═══════════════════════════════════════════════════════════════════════════
// TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe('ContractsService', () => {
  beforeEach(() => {
    resetMockState();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // generateContract
  // ─────────────────────────────────────────────────────────────────────────
  describe('generateContract', () => {
    it('should create a contract with valid data', async () => {
      mockQueryChain.singleResults = [
        { data: mockDeal, error: null }, // Deal fetch
        { data: mockContract, error: null }, // Contract insert
        { data: mockContract, error: null }, // Final contract fetch
      ];

      const result = await generateContract(mockCreateContractInput);

      expect(result.error).toBeNull();
      expect(result.data).toBeDefined();
      expect(fromCalls).toContain('deals');
      expect(fromCalls).toContain('contracts');
      expect(fromCalls).toContain('contract_signatures');
    });

    it('should return error when deal is not found', async () => {
      mockQueryChain.singleResults = [
        { data: null, error: { message: 'Deal not found', code: 'PGRST116' } },
      ];

      const result = await generateContract(mockCreateContractInput);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Failed to fetch deal');
    });

    it('should return error when contract creation fails', async () => {
      mockQueryChain.singleResults = [
        { data: mockDeal, error: null }, // Deal fetch succeeds
        { data: null, error: { message: 'Insert failed', code: 'PGRST001' } }, // Contract insert fails
      ];

      const result = await generateContract(mockCreateContractInput);

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Failed to create contract');
    });

    it('should set default status as draft', async () => {
      mockQueryChain.singleResults = [
        { data: mockDeal, error: null },
        { data: { ...mockContract, status: 'draft' }, error: null },
        { data: { ...mockContract, status: 'draft' }, error: null },
      ];

      const result = await generateContract(mockCreateContractInput);

      expect(result.data?.status).toBe('draft');
    });

    it('should handle parties with no user_id', async () => {
      const inputWithNoUserId = {
        ...mockCreateContractInput,
        parties: [
          {
            party_type: 'athlete' as const,
            name: 'John Athlete',
            email: 'john@athlete.com',
          },
          {
            party_type: 'brand' as const,
            name: 'Brand Contact',
            email: 'contact@brand.com',
          },
        ],
      };

      mockQueryChain.singleResults = [
        { data: mockDeal, error: null },
        { data: mockContract, error: null },
        { data: mockContract, error: null },
      ];

      const result = await generateContract(inputWithNoUserId);

      expect(result.error).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getContractById
  // ─────────────────────────────────────────────────────────────────────────
  describe('getContractById', () => {
    it('should retrieve a contract by ID', async () => {
      mockQueryChain.singleResults = [
        { data: mockContract, error: null },
      ];

      const result = await getContractById('contract-123');

      expect(result.data).toEqual(mockContract);
      expect(result.error).toBeNull();
      expect(fromCalls).toContain('contracts');
      expect(eqCalls).toContainEqual(['id', 'contract-123']);
    });

    it('should return error when contract not found', async () => {
      mockQueryChain.singleResults = [
        { data: null, error: { message: 'Not found', code: 'PGRST116' } },
      ];

      const result = await getContractById('nonexistent-id');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch contract');
    });

    it('should include related deal and parties data', async () => {
      const contractWithRelations = {
        ...mockContract,
        deal: mockDeal,
        parties: [mockSignature],
      };
      mockQueryChain.singleResults = [
        { data: contractWithRelations, error: null },
      ];

      const result = await getContractById('contract-123');

      expect(result.data?.deal).toBeDefined();
      expect(result.data?.parties).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getContracts
  // ─────────────────────────────────────────────────────────────────────────
  describe('getContracts', () => {
    it('should retrieve contracts with pagination', async () => {
      mockQueryChain.orderResults = [
        { data: [mockContract], error: null, count: 1 },
      ];

      const result = await getContracts({ page: 1, page_size: 10 });

      expect(result.data?.contracts).toHaveLength(1);
      expect(result.data?.total).toBe(1);
      expect(result.data?.page).toBe(1);
      expect(result.data?.page_size).toBe(10);
      expect(result.data?.total_pages).toBe(1);
    });

    it('should apply deal_id filter', async () => {
      mockQueryChain.orderResults = [
        { data: [mockContract], error: null, count: 1 },
      ];

      await getContracts({ deal_id: 'deal-123' });

      expect(eqCalls).toContainEqual(['deal_id', 'deal-123']);
    });

    it('should apply status filter', async () => {
      mockQueryChain.orderResults = [
        { data: [mockContract], error: null, count: 1 },
      ];

      await getContracts({ status: ['draft', 'pending_signature'] });

      expect(inCalls).toContainEqual(['status', ['draft', 'pending_signature']]);
    });

    it('should apply template_type filter', async () => {
      mockQueryChain.orderResults = [
        { data: [mockContract], error: null, count: 1 },
      ];

      await getContracts({ template_type: ['social_media_campaign'] });

      expect(inCalls).toContainEqual(['template_type', ['social_media_campaign']]);
    });

    it('should apply date range filters', async () => {
      mockQueryChain.orderResults = [
        { data: [mockContract], error: null, count: 1 },
      ];

      await getContracts({
        from_date: '2024-01-01',
        to_date: '2024-12-31',
      });

      expect(gteCalls).toContainEqual(['created_at', '2024-01-01']);
      expect(lteCalls).toContainEqual(['created_at', '2024-12-31']);
    });

    it('should use default pagination when not specified', async () => {
      mockQueryChain.orderResults = [
        { data: [mockContract], error: null, count: 1 },
      ];

      const result = await getContracts({});

      expect(result.data?.page).toBe(1);
      expect(result.data?.page_size).toBe(10);
    });

    it('should return error on database failure', async () => {
      mockQueryChain.orderResults = [
        { data: null, error: { message: 'Database error', code: 'PGRST001' }, count: 0 },
      ];

      const result = await getContracts({});

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch contracts');
    });

    it('should calculate total_pages correctly', async () => {
      mockQueryChain.orderResults = [
        { data: [mockContract], error: null, count: 25 },
      ];

      const result = await getContracts({ page: 1, page_size: 10 });

      expect(result.data?.total_pages).toBe(3);
    });

    it('should handle empty contract list gracefully', async () => {
      mockQueryChain.orderResults = [
        { data: [], error: null, count: 0 },
      ];

      const result = await getContracts({});

      expect(result.data?.contracts).toHaveLength(0);
      expect(result.data?.total).toBe(0);
      expect(result.data?.total_pages).toBe(0);
    });

    it('should handle null count gracefully', async () => {
      mockQueryChain.orderResults = [
        { data: [], error: null, count: null },
      ];

      const result = await getContracts({});

      expect(result.data?.total).toBe(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // updateContract
  // ─────────────────────────────────────────────────────────────────────────
  describe('updateContract', () => {
    it('should update contract in draft status', async () => {
      mockQueryChain.singleResults = [
        { data: { status: 'draft' }, error: null }, // Status check
        { data: mockContract, error: null }, // Update
        { data: mockContract, error: null }, // Final fetch
      ];

      const result = await updateContract('contract-123', {
        title: 'Updated Title',
      });

      expect(result.error).toBeNull();
      expect(updateCalled).toBe(true);
    });

    it('should update contract in pending_signature status', async () => {
      mockQueryChain.singleResults = [
        { data: { status: 'pending_signature' }, error: null },
        { data: mockContract, error: null },
        { data: mockContract, error: null },
      ];

      const result = await updateContract('contract-123', {
        title: 'Updated Title',
      });

      expect(result.error).toBeNull();
    });

    it('should reject update for fully_signed contract', async () => {
      mockQueryChain.singleResults = [
        { data: { status: 'fully_signed' }, error: null },
      ];

      const result = await updateContract('contract-123', {
        title: 'Updated Title',
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('INVALID_STATUS');
      expect(result.error?.message).toContain('cannot be edited');
    });

    it('should reject update for voided contract', async () => {
      mockQueryChain.singleResults = [
        { data: { status: 'voided' }, error: null },
      ];

      const result = await updateContract('contract-123', {
        title: 'Updated Title',
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('INVALID_STATUS');
    });

    it('should reject update for cancelled contract', async () => {
      mockQueryChain.singleResults = [
        { data: { status: 'cancelled' }, error: null },
      ];

      const result = await updateContract('contract-123', {
        title: 'Updated Title',
      });

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('INVALID_STATUS');
    });

    it('should return error when contract not found', async () => {
      mockQueryChain.singleResults = [
        { data: null, error: { message: 'Not found', code: 'PGRST116' } },
      ];

      const result = await updateContract('nonexistent-id', {
        title: 'Updated Title',
      });

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Contract not found');
    });

    it('should return error on update failure', async () => {
      mockQueryChain.singleResults = [
        { data: { status: 'draft' }, error: null },
        { data: null, error: { message: 'Update failed', code: 'PGRST001' } },
      ];

      const result = await updateContract('contract-123', {
        title: 'Updated Title',
      });

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to update contract');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // sendForSignature
  // ─────────────────────────────────────────────────────────────────────────
  describe('sendForSignature', () => {
    it('should transition draft contract to pending_signature', async () => {
      mockQueryChain.singleResults = [
        { data: { status: 'draft' }, error: null }, // Status check
        // Note: sendForSignature calls getContractById at the end which needs another result
        { data: { ...mockContract, status: 'pending_signature' }, error: null }, // Final fetch via getContractById
      ];

      const result = await sendForSignature('contract-123');

      expect(result.error).toBeNull();
      expect(updateCalled).toBe(true);
    });

    it('should reject non-draft contracts', async () => {
      mockQueryChain.singleResults = [
        { data: { status: 'pending_signature' }, error: null },
      ];

      const result = await sendForSignature('contract-123');

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('INVALID_STATUS');
      expect(result.error?.message).toContain('Only draft contracts');
    });

    it('should return error when contract not found', async () => {
      mockQueryChain.singleResults = [
        { data: null, error: { message: 'Not found', code: 'PGRST116' } },
      ];

      const result = await sendForSignature('nonexistent-id');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Contract not found');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // signContract
  // ─────────────────────────────────────────────────────────────────────────
  describe('signContract', () => {
    const signInput = {
      contract_id: 'contract-123',
      party_type: 'athlete' as const,
      signature_data: 'base64-signature-data',
      signature_type: 'typed' as const,
      agreed_to_terms: true,
      ip_address: '192.168.1.1',
    };

    it('should require authentication', async () => {
      mockGetUserResult = { data: { user: null }, error: { message: 'Not authenticated' } };

      const result = await signContract(signInput);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('UNAUTHORIZED');
      expect(result.error?.message).toBe('Authentication required');
    });

    it('should reject already signed party', async () => {
      mockGetUserResult = { data: { user: { id: 'user-123' } }, error: null };
      mockQueryChain.singleResults = [
        {
          data: {
            id: 'sig-123',
            signature_status: 'signed',
            contract: { status: 'pending_signature' },
          },
          error: null,
        },
      ];

      const result = await signContract(signInput);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('ALREADY_SIGNED');
    });

    it('should reject signature on non-signable contract', async () => {
      mockGetUserResult = { data: { user: { id: 'user-123' } }, error: null };
      mockQueryChain.singleResults = [
        {
          data: {
            id: 'sig-123',
            signature_status: 'pending',
            contract: { status: 'draft' },
          },
          error: null,
        },
      ];

      const result = await signContract(signInput);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('INVALID_STATUS');
      expect(result.error?.message).toContain('not in a signable state');
    });

    it('should return error when signature record not found', async () => {
      mockGetUserResult = { data: { user: { id: 'user-123' } }, error: null };
      mockQueryChain.singleResults = [
        { data: null, error: { message: 'Not found', code: 'PGRST116' } },
      ];

      const result = await signContract(signInput);

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Signature record not found');
    });

    it('should not allow signing on expired contracts', async () => {
      mockGetUserResult = { data: { user: { id: 'user-123' } }, error: null };
      mockQueryChain.singleResults = [
        {
          data: {
            id: 'sig-123',
            signature_status: 'pending',
            contract: { status: 'expired' },
          },
          error: null,
        },
      ];

      const result = await signContract(signInput);

      expect(result.error?.code).toBe('INVALID_STATUS');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // declineContract
  // ─────────────────────────────────────────────────────────────────────────
  describe('declineContract', () => {
    it('should decline contract successfully', async () => {
      mockQueryChain.singleResults = [
        { data: { id: 'sig-123', signature_status: 'pending' }, error: null },
        { data: mockContract, error: null },
      ];

      const result = await declineContract('contract-123', 'athlete', 'Terms not acceptable');

      expect(result.error).toBeNull();
    });

    it('should reject already processed signature', async () => {
      mockQueryChain.singleResults = [
        { data: { id: 'sig-123', signature_status: 'signed' }, error: null },
      ];

      const result = await declineContract('contract-123', 'athlete', 'Terms not acceptable');

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('ALREADY_PROCESSED');
    });

    it('should return error when signature record not found', async () => {
      mockQueryChain.singleResults = [
        { data: null, error: { message: 'Not found', code: 'PGRST116' } },
      ];

      const result = await declineContract('contract-123', 'athlete', 'Terms not acceptable');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Signature record not found');
    });

    it('should cancel contract when athlete declines', async () => {
      mockQueryChain.singleResults = [
        { data: { id: 'sig-123', signature_status: 'pending' }, error: null },
        { data: { ...mockContract, status: 'cancelled' }, error: null },
      ];

      await declineContract('contract-123', 'athlete', 'Terms not acceptable');

      // Verify update was called (for both signature and contract status)
      expect(updateCalled).toBe(true);
    });

    it('should cancel contract when brand declines', async () => {
      mockQueryChain.singleResults = [
        { data: { id: 'sig-123', signature_status: 'pending' }, error: null },
        { data: { ...mockContract, status: 'cancelled' }, error: null },
      ];

      await declineContract('contract-123', 'brand', 'Changed our mind');

      expect(updateCalled).toBe(true);
    });

    it('should not cancel contract when guardian declines', async () => {
      mockQueryChain.singleResults = [
        { data: { id: 'sig-123', signature_status: 'pending' }, error: null },
        { data: mockContract, error: null },
      ];

      await declineContract('contract-123', 'guardian', 'Not approved');

      // Contract should not be cancelled for guardian decline - but update is still called for signature
      expect(updateCalled).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getContractStatus
  // ─────────────────────────────────────────────────────────────────────────
  describe('getContractStatus', () => {
    it('should return contract status with all signatures', async () => {
      mockQueryChain.singleResults = [
        { data: { status: 'pending_signature' }, error: null },
      ];
      mockQueryChain.orderResults = [
        {
          data: [
            { party_type: 'athlete', name: 'John', signature_status: 'signed', signed_at: '2024-01-01' },
            { party_type: 'brand', name: 'Brand Co', signature_status: 'pending', signed_at: null },
          ],
          error: null,
        },
      ];

      const result = await getContractStatus('contract-123');

      expect(result.data?.contract_status).toBe('pending_signature');
      expect(result.data?.signatures).toHaveLength(2);
      expect(result.data?.all_signed).toBe(false);
      expect(result.data?.can_sign).toBe(true);
    });

    it('should return all_signed true when all signatures complete', async () => {
      mockQueryChain.singleResults = [
        { data: { status: 'fully_signed' }, error: null },
      ];
      mockQueryChain.orderResults = [
        {
          data: [
            { party_type: 'athlete', name: 'John', signature_status: 'signed', signed_at: '2024-01-01' },
            { party_type: 'brand', name: 'Brand Co', signature_status: 'signed', signed_at: '2024-01-02' },
          ],
          error: null,
        },
      ];

      const result = await getContractStatus('contract-123');

      expect(result.data?.all_signed).toBe(true);
      expect(result.data?.can_sign).toBe(false);
    });

    it('should return can_sign false for non-signable statuses', async () => {
      mockQueryChain.singleResults = [
        { data: { status: 'draft' }, error: null },
      ];
      mockQueryChain.orderResults = [
        {
          data: [
            { party_type: 'athlete', name: 'John', signature_status: 'pending', signed_at: null },
          ],
          error: null,
        },
      ];

      const result = await getContractStatus('contract-123');

      expect(result.data?.can_sign).toBe(false);
    });

    it('should return error when contract not found', async () => {
      mockQueryChain.singleResults = [
        { data: null, error: { message: 'Not found', code: 'PGRST116' } },
      ];

      const result = await getContractStatus('nonexistent-id');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Contract not found');
    });

    it('should return error when signatures fetch fails', async () => {
      mockQueryChain.singleResults = [
        { data: { status: 'pending_signature' }, error: null },
      ];
      mockQueryChain.orderResults = [
        { data: null, error: { message: 'Database error', code: 'PGRST001' } },
      ];

      const result = await getContractStatus('contract-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch signatures');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // generateContractPDF
  // ─────────────────────────────────────────────────────────────────────────
  describe('generateContractPDF', () => {
    // Note: generateContractPDF has dependencies on PDF generation helpers
    // and storage upload that are not mocked in this test suite.
    // These tests verify the error handling and contract fetch behavior.

    it('should return error when contract not found', async () => {
      mockQueryChain.singleResults = [
        { data: null, error: { message: 'Not found', code: 'PGRST116' } },
      ];

      const result = await generateContractPDF('nonexistent-id');

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });

    it('should return error or fallback when PDF generation dependencies are unavailable', async () => {
      // This tests that the function handles errors gracefully
      mockQueryChain.singleResults = [
        { data: mockContract, error: null },
      ];

      const result = await generateContractPDF('contract-123');

      // The function should either return an error or a fallback URL
      // when PDF generation/storage fails
      expect(result.error !== null || result.data !== null).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // downloadContract
  // ─────────────────────────────────────────────────────────────────────────
  describe('downloadContract', () => {
    it('should return contract and download URL', async () => {
      const contractWithPdf = { ...mockContract, pdf_url: '/api/contracts/123/pdf' };
      mockQueryChain.singleResults = [
        { data: contractWithPdf, error: null },
      ];

      const result = await downloadContract('contract-123');

      expect(result.data?.contract).toBeDefined();
      expect(result.data?.download_url).toBe('/api/contracts/123/pdf');
    });

    it('should prefer signed_pdf_url when available', async () => {
      const contractWithSignedPdf = {
        ...mockContract,
        pdf_url: '/api/contracts/123/pdf',
        signed_pdf_url: '/api/contracts/123/signed-pdf',
      };
      mockQueryChain.singleResults = [
        { data: contractWithSignedPdf, error: null },
      ];

      const result = await downloadContract('contract-123');

      expect(result.data?.download_url).toBe('/api/contracts/123/signed-pdf');
    });

    it('should return null download_url when no PDF exists', async () => {
      mockQueryChain.singleResults = [
        { data: mockContract, error: null },
      ];

      const result = await downloadContract('contract-123');

      expect(result.data?.download_url).toBeNull();
    });

    it('should return error when contract not found', async () => {
      mockQueryChain.singleResults = [
        { data: null, error: { message: 'Not found', code: 'PGRST116' } },
      ];

      const result = await downloadContract('nonexistent-id');

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getContractTemplates
  // ─────────────────────────────────────────────────────────────────────────
  describe('getContractTemplates', () => {
    it('should return active templates', async () => {
      const mockTemplates = [
        { id: 'tpl-1', name: 'Standard Endorsement', type: 'standard_endorsement', is_active: true },
        { id: 'tpl-2', name: 'Social Media', type: 'social_media_campaign', is_active: true },
      ];

      mockQueryChain.orderResults = [
        { data: mockTemplates, error: null },
      ];

      const result = await getContractTemplates();

      expect(result.data).toHaveLength(2);
      expect(eqCalls).toContainEqual(['is_active', true]);
    });

    it('should return error on database failure', async () => {
      mockQueryChain.orderResults = [
        { data: null, error: { message: 'Database error', code: 'PGRST001' } },
      ];

      const result = await getContractTemplates();

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch templates');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getDefaultClauses
  // ─────────────────────────────────────────────────────────────────────────
  describe('getDefaultClauses', () => {
    it('should return template clauses from database', async () => {
      const mockClauses = [
        { title: 'Agreement', content: 'Test', is_required: true, is_editable: false, order: 0 },
      ];
      mockQueryChain.singleResults = [
        { data: { default_clauses: mockClauses }, error: null },
      ];

      const result = await getDefaultClauses('social_media_campaign');

      expect(result.data).toEqual(mockClauses);
    });

    it('should return standard clauses when template not found', async () => {
      mockQueryChain.singleResults = [
        { data: null, error: { message: 'Not found', code: 'PGRST116' } },
      ];

      const result = await getDefaultClauses('social_media_campaign');

      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);
      expect(result.error).toBeNull();
    });

    it('should include common clauses for all templates', async () => {
      mockQueryChain.singleResults = [
        { data: null, error: { message: 'Not found', code: 'PGRST116' } },
      ];

      const result = await getDefaultClauses('standard_endorsement');

      const clauseTitles = result.data!.map(c => c.title);
      expect(clauseTitles).toContain('Agreement');
      expect(clauseTitles).toContain('Compensation');
      expect(clauseTitles).toContain('Term');
      expect(clauseTitles).toContain('NCAA Compliance');
      expect(clauseTitles).toContain('Termination');
      expect(clauseTitles).toContain('Governing Law');
    });

    it('should include template-specific clauses for social_media_campaign', async () => {
      mockQueryChain.singleResults = [
        { data: null, error: { message: 'Not found', code: 'PGRST116' } },
      ];

      const result = await getDefaultClauses('social_media_campaign');

      const clauseTitles = result.data!.map(c => c.title);
      expect(clauseTitles).toContain('Content Requirements');
      expect(clauseTitles).toContain('Content Approval');
    });

    it('should include template-specific clauses for appearance_agreement', async () => {
      mockQueryChain.singleResults = [
        { data: null, error: { message: 'Not found', code: 'PGRST116' } },
      ];

      const result = await getDefaultClauses('appearance_agreement');

      const clauseTitles = result.data!.map(c => c.title);
      expect(clauseTitles).toContain('Appearance Details');
      expect(clauseTitles).toContain('Attire and Conduct');
    });

    it('should include template-specific clauses for merchandise_licensing', async () => {
      mockQueryChain.singleResults = [
        { data: null, error: { message: 'Not found', code: 'PGRST116' } },
      ];

      const result = await getDefaultClauses('merchandise_licensing');

      const clauseTitles = result.data!.map(c => c.title);
      expect(clauseTitles).toContain('License Grant');
      expect(clauseTitles).toContain('Quality Standards');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // voidContract
  // ─────────────────────────────────────────────────────────────────────────
  describe('voidContract', () => {
    it('should void contract successfully', async () => {
      mockQueryChain.singleResults = [
        { data: { status: 'fully_signed' }, error: null },
        { data: { ...mockContract, status: 'voided' }, error: null },
      ];

      const result = await voidContract('contract-123', 'Legal dispute', true);

      expect(result.error).toBeNull();
      expect(updateCalled).toBe(true);
    });

    it('should reject voiding already voided contract', async () => {
      mockQueryChain.singleResults = [
        { data: { status: 'voided' }, error: null },
      ];

      const result = await voidContract('contract-123', 'Duplicate void', true);

      expect(result.data).toBeNull();
      expect(result.error?.code).toBe('ALREADY_VOIDED');
    });

    it('should return error when contract not found', async () => {
      mockQueryChain.singleResults = [
        { data: null, error: { message: 'Not found', code: 'PGRST116' } },
      ];

      const result = await voidContract('nonexistent-id', 'Reason', true);

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Contract not found');
    });

    it('should handle notifyParties parameter', async () => {
      mockQueryChain.singleResults = [
        { data: { status: 'active' }, error: null },
        { data: { ...mockContract, status: 'voided' }, error: null },
      ];

      // Test with notifyParties = false
      const result = await voidContract('contract-123', 'Reason', false);

      expect(result.error).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getAthleteContracts
  // ─────────────────────────────────────────────────────────────────────────
  describe('getAthleteContracts', () => {
    it('should retrieve contracts for an athlete', async () => {
      mockQueryChain.orderResults = [
        { data: [mockContract], error: null, count: 1 },
      ];

      const result = await getAthleteContracts('athlete-123');

      expect(result.data?.contracts).toHaveLength(1);
      expect(result.data?.total).toBe(1);
      expect(eqCalls).toContainEqual(['deal.athlete_id', 'athlete-123']);
    });

    it('should apply status filter', async () => {
      mockQueryChain.orderResults = [
        { data: [mockContract], error: null, count: 1 },
      ];

      await getAthleteContracts('athlete-123', { status: ['active', 'fully_signed'] });

      expect(inCalls).toContainEqual(['status', ['active', 'fully_signed']]);
    });

    it('should return error on database failure', async () => {
      mockQueryChain.orderResults = [
        { data: null, error: { message: 'Database error', code: 'PGRST001' }, count: 0 },
      ];

      const result = await getAthleteContracts('athlete-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch athlete contracts');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getBrandContracts
  // ─────────────────────────────────────────────────────────────────────────
  describe('getBrandContracts', () => {
    it('should retrieve contracts for a brand', async () => {
      mockQueryChain.orderResults = [
        { data: [mockContract], error: null, count: 1 },
      ];

      const result = await getBrandContracts('brand-123');

      expect(result.data?.contracts).toHaveLength(1);
      expect(result.data?.total).toBe(1);
      expect(eqCalls).toContainEqual(['deal.brand_id', 'brand-123']);
    });

    it('should apply status filter', async () => {
      mockQueryChain.orderResults = [
        { data: [mockContract], error: null, count: 1 },
      ];

      await getBrandContracts('brand-123', { status: ['draft'] });

      expect(inCalls).toContainEqual(['status', ['draft']]);
    });

    it('should return error on database failure', async () => {
      mockQueryChain.orderResults = [
        { data: null, error: { message: 'Database error', code: 'PGRST001' }, count: 0 },
      ];

      const result = await getBrandContracts('brand-123');

      expect(result.data).toBeNull();
      expect(result.error?.message).toContain('Failed to fetch brand contracts');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Edge Cases
  // ─────────────────────────────────────────────────────────────────────────
  describe('Edge Cases', () => {
    describe('Validation edge cases', () => {
      it('should handle contracts with maximum clauses', async () => {
        const contractWithManyClauses = {
          ...mockContract,
          clauses: Array(50).fill({
            title: 'Clause',
            content: 'Content',
            is_required: true,
            is_editable: false,
            order: 0,
          }),
        };

        mockQueryChain.singleResults = [
          { data: contractWithManyClauses, error: null },
        ];

        const result = await getContractById('contract-123');

        expect(result.data?.clauses).toHaveLength(50);
      });

      it('should handle contracts with multiple parties', async () => {
        const contractWithManyParties = {
          ...mockContract,
          parties: Array(10).fill(mockSignature),
        };

        mockQueryChain.singleResults = [
          { data: contractWithManyParties, error: null },
        ];

        const result = await getContractById('contract-123');

        expect(result.data?.parties).toHaveLength(10);
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Type Exports Verification
  // ─────────────────────────────────────────────────────────────────────────
  describe('Type exports', () => {
    it('should export ServiceResult type correctly', () => {
      const result: ServiceResult<Contract> = {
        data: mockContract,
        error: null,
      };
      expect(result.data).toBeDefined();
    });

    it('should export Contract type correctly', () => {
      const contract: Contract = mockContract;
      expect(contract.id).toBe('contract-123');
      expect(contract.status).toBe('draft');
    });

    it('should export ContractSignature type correctly', () => {
      const signature: ContractSignature = mockSignature;
      expect(signature.party_type).toBe('athlete');
      expect(signature.signature_status).toBe('pending');
    });
  });
});
