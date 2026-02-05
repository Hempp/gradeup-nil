/**
 * GradeUp NIL Platform - Messaging Service
 *
 * Handles direct messaging between brands and athletes,
 * including deal-related conversations and notifications.
 *
 * @module services/messaging
 * @version 1.0.0
 */

import { getSupabaseClient, getCurrentUser, invokeFunction } from './supabase.js';

/**
 * @typedef {object} Message
 * @property {string} id - Message UUID
 * @property {string} deal_id - Associated deal UUID
 * @property {string} sender_id - Sender profile UUID
 * @property {string} message - Message content
 * @property {string[]} [attachments] - Attachment URLs
 * @property {string} [read_at] - When message was read
 * @property {string} created_at - Creation timestamp
 */

/**
 * @typedef {object} Conversation
 * @property {string} deal_id - Deal UUID
 * @property {object} deal - Deal info (title, status)
 * @property {object} athlete - Athlete info
 * @property {object} brand - Brand info
 * @property {Message} last_message - Most recent message
 * @property {number} unread_count - Number of unread messages
 * @property {string} updated_at - Last activity timestamp
 */

/**
 * @typedef {object} MessageData
 * @property {string} deal_id - Deal UUID
 * @property {string} message - Message content
 * @property {string[]} [attachments] - Attachment URLs
 */

/**
 * Get current brand's ID (helper)
 *
 * @returns {Promise<{brandId: string | null, userId: string | null, error: Error | null}>}
 */
async function getCurrentBrandAndUser() {
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { brandId: null, userId: null, error: userError || new Error('Not authenticated') };
  }

  const supabase = await getSupabaseClient();
  const { data: brand, error } = await supabase
    .from('brands')
    .select('id')
    .eq('profile_id', user.id)
    .single();

  return { brandId: brand?.id || null, userId: user.id, error };
}

/**
 * Send a message in a deal conversation
 *
 * @param {MessageData} data - Message data
 * @returns {Promise<{message: Message | null, error: Error | null}>}
 */
export async function sendMessage(data) {
  const { brandId, userId, error: userError } = await getCurrentBrandAndUser();

  if (userError || !userId) {
    return { message: null, error: userError || new Error('Not authenticated') };
  }

  if (!data.deal_id || !data.message?.trim()) {
    return { message: null, error: new Error('deal_id and message are required') };
  }

  const supabase = await getSupabaseClient();
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('id, athlete_id, brand_id')
    .eq('id', data.deal_id)
    .single();

  if (dealError || !deal) {
    return { message: null, error: dealError || new Error('Deal not found') };
  }

  // Check authorization (brand must own the deal)
  if (brandId && deal.brand_id !== brandId) {
    return { message: null, error: new Error('Not authorized to message in this deal') };
  }

  // Create message
  const { data: message, error } = await supabase
    .from('deal_messages')
    .insert({
      deal_id: data.deal_id,
      sender_id: userId,
      message: data.message.trim(),
      attachments: data.attachments || null,
    })
    .select()
    .single();

  if (error) {
    return { message: null, error };
  }

  // Send notification to recipient
  try {
    // Get athlete's profile_id for notification
    const { data: athlete } = await supabase
      .from('athletes')
      .select('profile_id')
      .eq('id', deal.athlete_id)
      .single();

    if (athlete?.profile_id) {
      await invokeFunction('send-notification', {
        user_ids: [athlete.profile_id],
        type: 'message',
        title: 'New Message',
        body: data.message.substring(0, 100) + (data.message.length > 100 ? '...' : ''),
        related_type: 'deal',
        related_id: data.deal_id,
        action_url: `/deals/${data.deal_id}/messages`,
        action_label: 'View Message',
      });
    }
  } catch (notifyError) {
    // Don't fail the message send if notification fails
    console.error('Failed to send notification:', notifyError);
  }

  return { message, error: null };
}

/**
 * Get messages for a deal conversation
 *
 * @param {string} dealId - Deal UUID
 * @param {object} [options] - Query options
 * @param {number} [options.limit=50] - Maximum messages to return
 * @param {number} [options.offset=0] - Offset for pagination
 * @param {string} [options.before] - Get messages before this timestamp
 * @param {string} [options.after] - Get messages after this timestamp
 * @returns {Promise<{messages: Message[] | null, error: Error | null}>}
 */
export async function getMessages(dealId, options = {}) {
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { messages: null, error: userError || new Error('Not authenticated') };
  }

  const supabase = await getSupabaseClient();
  const { limit = 50, offset = 0, before, after } = options;

  let query = supabase
    .from('deal_messages')
    .select(`
      *,
      sender:profiles!sender_id(id, first_name, last_name, avatar_url, role)
    `)
    .eq('deal_id', dealId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (before) {
    query = query.lt('created_at', before);
  }

  if (after) {
    query = query.gt('created_at', after);
  }

  const { data, error } = await query;

  if (error) {
    return { messages: null, error };
  }

  // Reverse to get chronological order (oldest first)
  return { messages: data?.reverse() || [], error: null };
}

/**
 * Mark messages as read
 *
 * @param {string} dealId - Deal UUID
 * @param {string[]} [messageIds] - Specific message IDs (optional, marks all if not provided)
 * @returns {Promise<{count: number, error: Error | null}>}
 */
export async function markMessagesAsRead(dealId, messageIds = null) {
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { count: 0, error: userError || new Error('Not authenticated') };
  }

  const supabase = await getSupabaseClient();
  const userId = user.id;

  let query = supabase
    .from('deal_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('deal_id', dealId)
    .neq('sender_id', userId) // Don't mark own messages
    .is('read_at', null); // Only unread messages

  if (messageIds?.length) {
    query = query.in('id', messageIds);
  }

  const { data, error } = await query.select();

  return { count: data?.length || 0, error };
}

/**
 * Get all conversations for current brand
 *
 * @param {object} [options] - Query options
 * @param {number} [options.limit=20] - Maximum conversations
 * @param {number} [options.offset=0] - Offset for pagination
 * @param {boolean} [options.unreadOnly=false] - Only return conversations with unread messages
 * @returns {Promise<{conversations: Conversation[] | null, error: Error | null}>}
 */
export async function getConversations(options = {}) {
  const { brandId, userId, error: brandError } = await getCurrentBrandAndUser();

  if (brandError || !brandId) {
    return { conversations: null, error: brandError || new Error('Brand profile not found') };
  }

  const supabase = await getSupabaseClient();
  const { limit = 20, offset = 0, unreadOnly = false } = options;

  // Get all deals for this brand with messages
  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select(`
      id,
      title,
      status,
      athlete_id,
      athlete:athletes(
        id,
        profile:profiles(first_name, last_name, avatar_url),
        school:schools(short_name),
        sport:sports(name)
      )
    `)
    .eq('brand_id', brandId)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (dealsError) {
    return { conversations: null, error: dealsError };
  }

  // Get message counts and last message for each deal
  const conversations = [];

  for (const deal of deals || []) {
    // Get last message
    const { data: lastMessage } = await supabase
      .from('deal_messages')
      .select('*')
      .eq('deal_id', deal.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Get unread count
    const { count: unreadCount } = await supabase
      .from('deal_messages')
      .select('id', { count: 'exact', head: true })
      .eq('deal_id', deal.id)
      .neq('sender_id', userId)
      .is('read_at', null);

    // Skip if filtering for unread only
    if (unreadOnly && (!unreadCount || unreadCount === 0)) {
      continue;
    }

    conversations.push({
      deal_id: deal.id,
      deal: {
        title: deal.title,
        status: deal.status,
      },
      athlete: deal.athlete,
      last_message: lastMessage,
      unread_count: unreadCount || 0,
      updated_at: lastMessage?.created_at || deal.updated_at,
    });
  }

  // Sort by last message time
  conversations.sort((a, b) => {
    const aTime = a.updated_at ? new Date(a.updated_at).getTime() : 0;
    const bTime = b.updated_at ? new Date(b.updated_at).getTime() : 0;
    return bTime - aTime;
  });

  return { conversations, error: null };
}

/**
 * Get total unread message count for brand
 *
 * @returns {Promise<{count: number, error: Error | null}>}
 */
export async function getUnreadCount() {
  const { brandId, userId, error: brandError } = await getCurrentBrandAndUser();

  if (brandError || !brandId) {
    return { count: 0, error: brandError };
  }

  const supabase = await getSupabaseClient();

  // Get all deal IDs for this brand
  const { data: deals, error: dealsError } = await supabase
    .from('deals')
    .select('id')
    .eq('brand_id', brandId);

  if (dealsError || !deals?.length) {
    return { count: 0, error: dealsError };
  }

  const dealIds = deals.map((d) => d.id);

  // Count unread messages
  const { count, error } = await supabase
    .from('deal_messages')
    .select('id', { count: 'exact', head: true })
    .in('deal_id', dealIds)
    .neq('sender_id', userId)
    .is('read_at', null);

  return { count: count || 0, error };
}

/**
 * Delete a message (sender only)
 *
 * @param {string} messageId - Message UUID
 * @returns {Promise<{success: boolean, error: Error | null}>}
 */
export async function deleteMessage(messageId) {
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { success: false, error: userError || new Error('Not authenticated') };
  }

  const supabase = await getSupabaseClient();
  const userId = user.id;

  // Only allow deleting own messages
  const { error } = await supabase
    .from('deal_messages')
    .delete()
    .eq('id', messageId)
    .eq('sender_id', userId);

  return { success: !error, error };
}

/**
 * Upload an attachment for a message
 *
 * @param {File} file - File to upload
 * @param {string} dealId - Deal UUID for organization
 * @returns {Promise<{url: string | null, error: Error | null}>}
 */
export async function uploadAttachment(file, dealId) {
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { url: null, error: userError || new Error('Not authenticated') };
  }

  const supabase = await getSupabaseClient();
  const userId = user.id;

  // Validate file type
  const allowedTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (!allowedTypes.includes(file.type)) {
    return {
      url: null,
      error: new Error('Invalid file type. Allowed: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX'),
    };
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024;
  if (file.size > maxSize) {
    return { url: null, error: new Error('File too large. Maximum size is 10MB.') };
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop();
  const fileName = `${dealId}/${userId}_${Date.now()}.${fileExt}`;
  const filePath = `messages/${fileName}`;

  // Upload to storage
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (uploadError) {
    return { url: null, error: uploadError };
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(filePath);

  return { url: publicUrl, error: null };
}

/**
 * Subscribe to new messages in a deal (realtime)
 *
 * @param {string} dealId - Deal UUID
 * @param {function} callback - Callback function (payload)
 * @returns {Promise<{subscription: object, unsubscribe: function}>}
 */
export async function subscribeToMessages(dealId, callback) {
  const supabase = await getSupabaseClient();

  const channel = supabase
    .channel(`deal_messages:${dealId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'deal_messages',
        filter: `deal_id=eq.${dealId}`,
      },
      async (payload) => {
        // Enrich with sender info
        if (payload.new) {
          const { data: sender } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, avatar_url, role')
            .eq('id', payload.new.sender_id)
            .single();

          payload.new.sender = sender;
        }
        callback(payload);
      }
    )
    .subscribe();

  return {
    subscription: channel,
    unsubscribe: () => supabase.removeChannel(channel),
  };
}

/**
 * Subscribe to all brand conversations (for unread badge updates)
 *
 * @param {function} callback - Callback function
 * @returns {Promise<{subscription: object, unsubscribe: function}>}
 */
export async function subscribeToConversations(callback) {
  const { brandId, error: brandError } = await getCurrentBrandAndUser();

  if (brandError || !brandId) {
    throw brandError || new Error('Brand profile not found');
  }

  const supabase = await getSupabaseClient();

  // Get all deal IDs for this brand
  const { data: deals } = await supabase
    .from('deals')
    .select('id')
    .eq('brand_id', brandId);

  const dealIds = deals?.map((d) => d.id) || [];

  if (dealIds.length === 0) {
    return {
      subscription: null,
      unsubscribe: () => {},
    };
  }

  const channel = supabase
    .channel(`brand_messages:${brandId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'deal_messages',
      },
      (payload) => {
        if (dealIds.includes(payload.new?.deal_id)) {
          callback(payload);
        }
      }
    )
    .subscribe();

  return {
    subscription: channel,
    unsubscribe: () => supabase.removeChannel(channel),
  };
}

/**
 * Start a new conversation (creates initial message for a deal)
 *
 * @param {string} dealId - Deal UUID
 * @param {string} message - Initial message
 * @returns {Promise<{message: Message | null, error: Error | null}>}
 */
export async function startConversation(dealId, message) {
  return sendMessage({ deal_id: dealId, message });
}

export default {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  getConversations,
  getUnreadCount,
  deleteMessage,
  uploadAttachment,
  subscribeToMessages,
  subscribeToConversations,
  startConversation,
};
