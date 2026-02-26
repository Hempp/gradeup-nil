'use client';

import { createClient } from '@/lib/supabase/client';
import type { ServiceResult } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// Notification Service Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get total unread message count across all conversations for the current user
 *
 * Counts all unread messages (from other users) in conversations
 * where the current user is a participant.
 *
 * @returns Promise resolving to ServiceResult with the unread count number
 * @example
 * const { data: count } = await getUnreadCount();
 * if (count && count > 0) {
 *   showBadge(count);
 * }
 */
export async function getUnreadCount(): Promise<ServiceResult<number>> {
  const supabase = createClient();

  try {
    // Get current user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { data: null, error: userError || new Error('Not authenticated') };
    }

    // Get conversations where the user is a participant
    const { data: participantData, error: participantError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('user_id', user.id);

    if (participantError) {
      return { data: null, error: participantError };
    }

    if (!participantData || participantData.length === 0) {
      return { data: 0, error: null };
    }

    const conversationIds = participantData.map((p) => p.conversation_id);

    // Count unread messages
    const { count, error: countError } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', conversationIds)
      .neq('sender_id', user.id)
      .is('read_at', null);

    if (countError) {
      return { data: null, error: countError };
    }

    return { data: count || 0, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}
