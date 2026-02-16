/**
 * Tests for specialized action hooks in use-action.ts
 * @module __tests__/lib/hooks/use-action-hooks.test
 */

import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { ToastProvider } from '@/components/ui/toast';
import {
  useAcceptDeal,
  useRejectDeal,
  useUpdateDealStatus,
  useUpdateProfile,
  useUploadAvatar,
  useSendMessage,
  useMarkAsRead,
  useRequestPayout,
  useApproveDeliverable,
  useRejectDeliverable,
  useSubmitDeliverable,
  useRequestDeliverableRevision,
} from '@/lib/hooks/use-action';

// Mock wrapper for ToastProvider
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <ToastProvider>{children}</ToastProvider>
);

// Mock the deals service
jest.mock('@/lib/services/deals', () => ({
  acceptDeal: jest.fn(),
  rejectDeal: jest.fn(),
  updateDealStatus: jest.fn(),
  updateDeliverableStatus: jest.fn(),
  submitDeliverable: jest.fn(),
  requestDeliverableRevision: jest.fn(),
}));

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => ({
    from: jest.fn(() => ({
      update: jest.fn(() => ({
        eq: jest.fn(() => ({
          select: jest.fn(() => ({
            single: jest.fn().mockResolvedValue({ data: { id: 'test' }, error: null }),
          })),
        })),
        neq: jest.fn(() => ({
          is: jest.fn().mockResolvedValue({ error: null }),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: { id: 'test' }, error: null }),
        })),
      })),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn().mockResolvedValue({ error: null }),
        getPublicUrl: jest.fn(() => ({
          data: { publicUrl: 'https://example.com/avatar.jpg' },
        })),
      })),
    },
  })),
}));

describe('useAcceptDeal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns initial state correctly', () => {
    const { result } = renderHook(() => useAcceptDeal(), { wrapper });

    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
    expect(typeof result.current.execute).toBe('function');
  });

  it('calls acceptDeal and returns data on success', async () => {
    const { acceptDeal } = require('@/lib/services/deals');
    const mockDeal = { id: 'deal-123', status: 'accepted' };
    acceptDeal.mockResolvedValue(mockDeal);

    const { result } = renderHook(() => useAcceptDeal(), { wrapper });

    await act(async () => {
      await result.current.execute('deal-123');
    });

    expect(acceptDeal).toHaveBeenCalledWith('deal-123');
    expect(result.current.data).toEqual(mockDeal);
    expect(result.current.error).toBeNull();
  });

  it('handles error from acceptDeal', async () => {
    const { acceptDeal } = require('@/lib/services/deals');
    acceptDeal.mockRejectedValue(new Error('Deal not found'));

    const { result } = renderHook(() => useAcceptDeal(), { wrapper });

    await act(async () => {
      await result.current.execute('deal-123');
    });

    expect(result.current.data).toBeNull();
    expect(result.current.error?.message).toBe('Deal not found');
  });
});

describe('useRejectDeal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls rejectDeal with dealId and reason', async () => {
    const { rejectDeal } = require('@/lib/services/deals');
    const mockDeal = { id: 'deal-123', status: 'cancelled' };
    rejectDeal.mockResolvedValue(mockDeal);

    const { result } = renderHook(() => useRejectDeal(), { wrapper });

    await act(async () => {
      await result.current.execute('deal-123', 'Not interested');
    });

    expect(rejectDeal).toHaveBeenCalledWith('deal-123', 'Not interested');
    expect(result.current.data).toEqual(mockDeal);
  });

  it('handles rejection without reason', async () => {
    const { rejectDeal } = require('@/lib/services/deals');
    rejectDeal.mockResolvedValue({ id: 'deal-123' });

    const { result } = renderHook(() => useRejectDeal(), { wrapper });

    await act(async () => {
      await result.current.execute('deal-123');
    });

    expect(rejectDeal).toHaveBeenCalledWith('deal-123', undefined);
  });

  it('handles error from rejectDeal', async () => {
    const { rejectDeal } = require('@/lib/services/deals');
    rejectDeal.mockRejectedValue(new Error('Rejection failed'));

    const { result } = renderHook(() => useRejectDeal(), { wrapper });

    await act(async () => {
      await result.current.execute('deal-123');
    });

    expect(result.current.error?.message).toBe('Rejection failed');
  });
});

describe('useUpdateDealStatus', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls updateDealStatus with status', async () => {
    const { updateDealStatus } = require('@/lib/services/deals');
    const mockDeal = { id: 'deal-123', status: 'active' };
    updateDealStatus.mockResolvedValue(mockDeal);

    const { result } = renderHook(() => useUpdateDealStatus(), { wrapper });

    await act(async () => {
      await result.current.execute('deal-123', 'active');
    });

    expect(updateDealStatus).toHaveBeenCalledWith('deal-123', 'active');
    expect(result.current.data).toEqual(mockDeal);
  });

  it('handles error from updateDealStatus', async () => {
    const { updateDealStatus } = require('@/lib/services/deals');
    updateDealStatus.mockRejectedValue(new Error('Update failed'));

    const { result } = renderHook(() => useUpdateDealStatus(), { wrapper });

    await act(async () => {
      await result.current.execute('deal-123', 'completed');
    });

    expect(result.current.error?.message).toBe('Update failed');
  });
});

describe('useUpdateProfile', () => {
  it('updates profile successfully', async () => {
    const { result } = renderHook(() => useUpdateProfile(), { wrapper });

    await act(async () => {
      await result.current.execute('profile-123', {
        first_name: 'John',
        last_name: 'Doe',
      });
    });

    expect(result.current.data).not.toBeNull();
  });
});

describe('useUploadAvatar', () => {
  it('uploads avatar successfully', async () => {
    const { result } = renderHook(() => useUploadAvatar(), { wrapper });

    const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' });

    await act(async () => {
      await result.current.execute('user-123', mockFile);
    });

    expect(result.current.data).not.toBeNull();
  });
});

describe('useSendMessage', () => {
  it('sends message successfully', async () => {
    const { result } = renderHook(() => useSendMessage(), { wrapper });

    await act(async () => {
      await result.current.execute({
        conversationId: 'conv-123',
        content: 'Hello!',
        senderId: 'user-123',
      });
    });

    expect(result.current.data).not.toBeNull();
  });
});

describe('useMarkAsRead', () => {
  it('marks messages as read', async () => {
    const { result } = renderHook(() => useMarkAsRead(), { wrapper });

    await act(async () => {
      await result.current.execute('conv-123', 'user-123');
    });

    // Silent operation - just verify no errors
    expect(result.current.loading).toBe(false);
  });
});

describe('useRequestPayout', () => {
  it('requests payout successfully', async () => {
    const { result } = renderHook(() => useRequestPayout(), { wrapper });

    await act(async () => {
      await result.current.execute({
        athleteId: 'athlete-123',
        amount: 5000,
        paymentMethod: 'bank_transfer',
      });
    });

    expect(result.current.data).not.toBeNull();
  });
});

describe('useApproveDeliverable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('approves deliverable successfully', async () => {
    const { updateDeliverableStatus } = require('@/lib/services/deals');
    updateDeliverableStatus.mockResolvedValue({ data: { id: 'del-123', status: 'approved' }, error: null });

    const { result } = renderHook(() => useApproveDeliverable(), { wrapper });

    await act(async () => {
      await result.current.execute('deal-123', 'del-123', 'Looks great!');
    });

    expect(updateDeliverableStatus).toHaveBeenCalledWith('deal-123', 'del-123', 'approved', 'Looks great!');
    expect(result.current.data).toEqual({ id: 'del-123', status: 'approved' });
  });

  it('handles error from updateDeliverableStatus', async () => {
    const { updateDeliverableStatus } = require('@/lib/services/deals');
    updateDeliverableStatus.mockResolvedValue({ data: null, error: { message: 'Approval failed' } });

    const { result } = renderHook(() => useApproveDeliverable(), { wrapper });

    await act(async () => {
      await result.current.execute('deal-123', 'del-123');
    });

    expect(result.current.error?.message).toBe('Approval failed');
  });
});

describe('useRejectDeliverable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects deliverable with feedback', async () => {
    const { updateDeliverableStatus } = require('@/lib/services/deals');
    updateDeliverableStatus.mockResolvedValue({ data: { id: 'del-123', status: 'rejected' }, error: null });

    const { result } = renderHook(() => useRejectDeliverable(), { wrapper });

    await act(async () => {
      await result.current.execute('deal-123', 'del-123', 'Does not meet guidelines');
    });

    expect(updateDeliverableStatus).toHaveBeenCalledWith('deal-123', 'del-123', 'rejected', 'Does not meet guidelines');
    expect(result.current.data).toEqual({ id: 'del-123', status: 'rejected' });
  });

  it('handles rejection error', async () => {
    const { updateDeliverableStatus } = require('@/lib/services/deals');
    updateDeliverableStatus.mockResolvedValue({ data: null, error: { message: 'Rejection failed' } });

    const { result } = renderHook(() => useRejectDeliverable(), { wrapper });

    await act(async () => {
      await result.current.execute('deal-123', 'del-123', 'Not acceptable');
    });

    expect(result.current.error?.message).toBe('Rejection failed');
  });
});

describe('useSubmitDeliverable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits deliverable with content URL', async () => {
    const { submitDeliverable } = require('@/lib/services/deals');
    submitDeliverable.mockResolvedValue({ data: { id: 'del-123', status: 'submitted' }, error: null });

    const { result } = renderHook(() => useSubmitDeliverable(), { wrapper });

    await act(async () => {
      await result.current.execute('del-123', 'https://instagram.com/p/123');
    });

    expect(submitDeliverable).toHaveBeenCalledWith('del-123', 'https://instagram.com/p/123', undefined);
    expect(result.current.data).toEqual({ id: 'del-123', status: 'submitted' });
  });

  it('submits deliverable with content and draft URLs', async () => {
    const { submitDeliverable } = require('@/lib/services/deals');
    submitDeliverable.mockResolvedValue({ data: { id: 'del-123' }, error: null });

    const { result } = renderHook(() => useSubmitDeliverable(), { wrapper });

    await act(async () => {
      await result.current.execute('del-123', 'https://instagram.com/p/123', 'https://drive.google.com/draft');
    });

    expect(submitDeliverable).toHaveBeenCalledWith('del-123', 'https://instagram.com/p/123', 'https://drive.google.com/draft');
  });

  it('handles submission error', async () => {
    const { submitDeliverable } = require('@/lib/services/deals');
    submitDeliverable.mockResolvedValue({ data: null, error: { message: 'Submission failed' } });

    const { result } = renderHook(() => useSubmitDeliverable(), { wrapper });

    await act(async () => {
      await result.current.execute('del-123', 'https://example.com');
    });

    expect(result.current.error?.message).toBe('Submission failed');
  });
});

describe('useRequestDeliverableRevision', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('requests revision with feedback', async () => {
    const { requestDeliverableRevision } = require('@/lib/services/deals');
    requestDeliverableRevision.mockResolvedValue({ data: { id: 'del-123', status: 'revision' }, error: null });

    const { result } = renderHook(() => useRequestDeliverableRevision(), { wrapper });

    await act(async () => {
      await result.current.execute('del-123', 'Please update the hashtag placement');
    });

    expect(requestDeliverableRevision).toHaveBeenCalledWith('del-123', 'Please update the hashtag placement');
    expect(result.current.data).toEqual({ id: 'del-123', status: 'revision' });
  });

  it('handles revision request error', async () => {
    const { requestDeliverableRevision } = require('@/lib/services/deals');
    requestDeliverableRevision.mockResolvedValue({ data: null, error: { message: 'Request failed' } });

    const { result } = renderHook(() => useRequestDeliverableRevision(), { wrapper });

    await act(async () => {
      await result.current.execute('del-123', 'Feedback');
    });

    expect(result.current.error?.message).toBe('Request failed');
  });
});
