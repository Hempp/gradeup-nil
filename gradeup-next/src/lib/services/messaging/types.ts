'use client';

// ═══════════════════════════════════════════════════════════════════════════
// Messaging Service Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generic service result wrapper for all messaging operations
 * Provides consistent error handling across the messaging module
 */
export interface ServiceResult<T = null> {
  data: T | null;
  error: Error | null;
}

/**
 * Represents a conversation between participants
 * Includes metadata like participants, last message, and unread count
 */
export interface Conversation {
  id: string;
  deal_id: string | null;
  created_at: string;
  updated_at: string;
  participants: ConversationParticipant[];
  last_message?: Message;
  unread_count: number;
}

/**
 * Represents a participant in a conversation
 * Can be either an athlete or brand with their respective profile data
 */
export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'athlete' | 'brand';
  profile?: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
  brand?: {
    company_name: string;
    logo_url: string | null;
  };
}

/**
 * Represents a single message in a conversation
 * Includes content, timestamps, and optional attachments
 */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  attachments?: MessageAttachment[];
}

/**
 * Represents a file attachment on a message
 * Stores file metadata and storage URL
 */
export interface MessageAttachment {
  id: string;
  message_id: string;
  file_url: string;
  file_name: string;
  file_type: string;
  file_size: number;
}

/**
 * Options for paginated message retrieval
 */
export interface GetMessagesOptions {
  /** Maximum messages to return (default: 50) */
  limit?: number;
  /** Fetch messages before this timestamp (for infinite scroll) */
  before?: string;
}
