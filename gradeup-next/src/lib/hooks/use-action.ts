'use client';

import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/components/ui/toast';

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES & INTERFACES
   ═══════════════════════════════════════════════════════════════════════════ */

interface ActionOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  loadingMessage?: string;
}

interface UseActionResult<T, A extends unknown[]> {
  execute: (...args: A) => Promise<T | null>;
  loading: boolean;
  error: Error | null;
  data: T | null;
}

/* ═══════════════════════════════════════════════════════════════════════════
   CORE ACTION HOOK
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Generic hook for wrapping async actions with toast notifications.
 *
 * @param action - Async function that returns { data, error }
 * @param options - Configuration for success/error messages and callbacks
 * @returns { execute, loading, error, data }
 *
 * @example
 * const { execute, loading, error, data } = useAction(
 *   async (dealId: string) => {
 *     const result = await acceptDeal(dealId);
 *     return { data: result, error: null };
 *   },
 *   { successMessage: 'Deal accepted!' }
 * );
 */
export function useAction<T, A extends unknown[] = []>(
  action: (...args: A) => Promise<{ data: T | null; error: Error | null }>,
  options?: ActionOptions<T>
): UseActionResult<T, A> {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  const { addToast } = useToast();

  // Track if component is mounted to prevent state updates after unmount
  const isMountedRef = useRef(true);
  // Track current execution to handle race conditions
  const executionIdRef = useRef(0);

  const execute = useCallback(
    async (...args: A): Promise<T | null> => {
      const currentExecutionId = ++executionIdRef.current;

      setLoading(true);
      setError(null);

      // Show loading toast for long-running operations if specified
      if (options?.loadingMessage) {
        addToast({
          title: options.loadingMessage,
          variant: 'info',
          duration: 10000,
        });
      }

      try {
        const result = await action(...args);

        // Only update state if this is the latest execution and component is mounted
        if (!isMountedRef.current || currentExecutionId !== executionIdRef.current) {
          return null;
        }

        if (result.error) {
          setError(result.error);
          setData(null);

          // Show error toast
          const errorMsg = options?.errorMessage || result.error.message || 'An error occurred';
          addToast({
            title: errorMsg,
            variant: 'error',
          });

          // Call error callback
          options?.onError?.(result.error);

          return null;
        }

        // Success case
        setData(result.data);
        setError(null);

        // Show success toast if message provided
        if (options?.successMessage) {
          addToast({
            title: options.successMessage,
            variant: 'success',
          });
        }

        // Call success callback
        if (result.data) {
          options?.onSuccess?.(result.data);
        }

        return result.data;
      } catch (err) {
        if (!isMountedRef.current || currentExecutionId !== executionIdRef.current) {
          return null;
        }

        const errorObj = err instanceof Error ? err : new Error('An unknown error occurred');
        setError(errorObj);
        setData(null);

        // Show error toast
        const errorMsg = options?.errorMessage || errorObj.message;
        addToast({
          title: errorMsg,
          variant: 'error',
        });

        // Call error callback
        options?.onError?.(errorObj);

        return null;
      } finally {
        if (isMountedRef.current && currentExecutionId === executionIdRef.current) {
          setLoading(false);
        }
      }
    },
    [action, options, addToast]
  );

  return { execute, loading, error, data };
}

/* ═══════════════════════════════════════════════════════════════════════════
   DEAL ACTION HOOKS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook for accepting a deal with toast notification.
 * Shows "Deal accepted!" on success.
 */
export function useAcceptDeal() {
  return useAction(
    async (dealId: string) => {
      try {
        const { acceptDeal } = await import('@/lib/services/deals');
        const data = await acceptDeal(dealId);
        return { data, error: null };
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err : new Error('Failed to accept deal'),
        };
      }
    },
    {
      successMessage: 'Deal accepted!',
      errorMessage: 'Failed to accept deal',
    }
  );
}

/**
 * Hook for rejecting a deal with toast notification.
 * Shows "Deal declined" on success.
 */
export function useRejectDeal() {
  return useAction(
    async (dealId: string, reason?: string) => {
      try {
        const { rejectDeal } = await import('@/lib/services/deals');
        const data = await rejectDeal(dealId, reason);
        return { data, error: null };
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err : new Error('Failed to decline deal'),
        };
      }
    },
    {
      successMessage: 'Deal declined',
      errorMessage: 'Failed to decline deal',
    }
  );
}

/**
 * Hook for updating deal status with toast notification.
 * Shows "Status updated" on success.
 */
export function useUpdateDealStatus() {
  return useAction(
    async (dealId: string, status: import('@/lib/services/deals').DealStatus) => {
      try {
        const { updateDealStatus } = await import('@/lib/services/deals');
        const data = await updateDealStatus(dealId, status);
        return { data, error: null };
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err : new Error('Failed to update status'),
        };
      }
    },
    {
      successMessage: 'Status updated',
      errorMessage: 'Failed to update status',
    }
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PROFILE ACTION HOOKS
   ═══════════════════════════════════════════════════════════════════════════ */

interface ProfileUpdateData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  bio?: string;
}

/**
 * Hook for updating user profile with toast notification.
 * Shows "Profile updated!" on success.
 */
export function useUpdateProfile() {
  return useAction(
    async (profileId: string, data: ProfileUpdateData) => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const { data: profile, error } = await supabase
          .from('profiles')
          .update(data)
          .eq('id', profileId)
          .select()
          .single();

        if (error) {
          throw error;
        }

        return { data: profile, error: null };
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err : new Error('Failed to update profile'),
        };
      }
    },
    {
      successMessage: 'Profile updated!',
      errorMessage: 'Failed to update profile',
    }
  );
}

/**
 * Hook for uploading avatar with toast notification.
 * Shows "Photo uploaded!" on success.
 */
export function useUploadAvatar() {
  return useAction(
    async (userId: string, file: File) => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        // Generate unique file name
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}-${Date.now()}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // Upload file to storage
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, file, { upsert: true });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        // Update profile with avatar URL
        const { data: profile, error: updateError } = await supabase
          .from('profiles')
          .update({ avatar_url: urlData.publicUrl })
          .eq('id', userId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        return { data: profile, error: null };
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err : new Error('Failed to upload photo'),
        };
      }
    },
    {
      successMessage: 'Photo uploaded!',
      errorMessage: 'Failed to upload photo',
    }
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MESSAGE ACTION HOOKS
   ═══════════════════════════════════════════════════════════════════════════ */

interface SendMessageData {
  conversationId: string;
  content: string;
  senderId: string;
}

/**
 * Hook for sending a message.
 * Silent on success (no toast), shows error only on failure.
 */
export function useSendMessage() {
  return useAction(
    async (data: SendMessageData) => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const { data: message, error } = await supabase
          .from('messages')
          .insert({
            conversation_id: data.conversationId,
            content: data.content,
            sender_id: data.senderId,
            created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        // Update conversation's last message timestamp
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', data.conversationId);

        return { data: message, error: null };
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err : new Error('Failed to send message'),
        };
      }
    },
    {
      // Silent on success - no successMessage
      errorMessage: 'Failed to send message',
    }
  );
}

/**
 * Hook for marking messages as read.
 * Silent operation - no toast on success or error.
 */
export function useMarkAsRead() {
  return useAction(
    async (conversationId: string, userId: string) => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const { error } = await supabase
          .from('messages')
          .update({ read_at: new Date().toISOString() })
          .eq('conversation_id', conversationId)
          .neq('sender_id', userId)
          .is('read_at', null);

        if (error) {
          throw error;
        }

        return { data: true, error: null };
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err : new Error('Failed to mark as read'),
        };
      }
    },
    {
      // Silent operation - no messages
    }
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   PAYMENT ACTION HOOKS
   ═══════════════════════════════════════════════════════════════════════════ */

interface PayoutRequestData {
  athleteId: string;
  amount: number;
  paymentMethod: 'bank_transfer' | 'paypal' | 'venmo';
}

/**
 * Hook for requesting a payout with toast notification.
 * Shows "Payout requested!" on success.
 */
export function useRequestPayout() {
  return useAction(
    async (data: PayoutRequestData) => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        const supabase = createClient();

        const { data: payout, error } = await supabase
          .from('payouts')
          .insert({
            athlete_id: data.athleteId,
            amount: data.amount,
            payment_method: data.paymentMethod,
            status: 'pending',
            requested_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (error) {
          throw error;
        }

        return { data: payout, error: null };
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err : new Error('Failed to request payout'),
        };
      }
    },
    {
      successMessage: 'Payout requested!',
      errorMessage: 'Failed to request payout',
      loadingMessage: 'Processing payout request...',
    }
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DELIVERABLE ACTION HOOKS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Hook for approving a deliverable with toast notification.
 * Shows "Deliverable approved!" on success.
 */
export function useApproveDeliverable() {
  return useAction(
    async (dealId: string, deliverableId: string, feedback?: string) => {
      const { updateDeliverableStatus } = await import('@/lib/services/deals');
      const result = await updateDeliverableStatus(dealId, deliverableId, 'approved', feedback);

      if (result.error) {
        return { data: null, error: new Error(result.error.message) };
      }

      return { data: result.data, error: null };
    },
    {
      successMessage: 'Deliverable approved!',
      errorMessage: 'Failed to approve deliverable',
    }
  );
}

/**
 * Hook for rejecting a deliverable with toast notification.
 * Shows "Deliverable rejected" on success.
 */
export function useRejectDeliverable() {
  return useAction(
    async (dealId: string, deliverableId: string, feedback?: string) => {
      const { updateDeliverableStatus } = await import('@/lib/services/deals');
      const result = await updateDeliverableStatus(dealId, deliverableId, 'rejected', feedback);

      if (result.error) {
        return { data: null, error: new Error(result.error.message) };
      }

      return { data: result.data, error: null };
    },
    {
      successMessage: 'Deliverable rejected',
      errorMessage: 'Failed to reject deliverable',
    }
  );
}

/**
 * Hook for submitting a deliverable (athlete submission).
 * Shows "Deliverable submitted!" on success.
 */
export function useSubmitDeliverable() {
  return useAction(
    async (deliverableId: string, contentUrl: string, draftUrl?: string) => {
      const { submitDeliverable } = await import('@/lib/services/deals');
      const result = await submitDeliverable(deliverableId, contentUrl, draftUrl);

      if (result.error) {
        return { data: null, error: new Error(result.error.message) };
      }

      return { data: result.data, error: null };
    },
    {
      successMessage: 'Deliverable submitted!',
      errorMessage: 'Failed to submit deliverable',
    }
  );
}

/**
 * Hook for requesting revision on a deliverable.
 * Shows "Revision requested" on success.
 */
export function useRequestDeliverableRevision() {
  return useAction(
    async (deliverableId: string, feedback: string) => {
      const { requestDeliverableRevision } = await import('@/lib/services/deals');
      const result = await requestDeliverableRevision(deliverableId, feedback);

      if (result.error) {
        return { data: null, error: new Error(result.error.message) };
      }

      return { data: result.data, error: null };
    },
    {
      successMessage: 'Revision requested',
      errorMessage: 'Failed to request revision',
    }
  );
}
