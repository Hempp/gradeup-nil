'use client';

// ═══════════════════════════════════════════════════════════════════════════
// Messaging Module - Public API
// ═══════════════════════════════════════════════════════════════════════════
//
// This module provides a unified API for the messaging service.
// All exports from this file maintain backward compatibility with
// the original messaging.ts file.
//
// Module Structure:
// - types.ts       - Type definitions (ServiceResult, Conversation, Message, etc.)
// - conversations.ts - Conversation CRUD operations
// - messages.ts    - Message sending, reading, and marking as read
// - notifications.ts - Unread count tracking
// - realtime.ts    - Real-time message subscriptions
//
// ═══════════════════════════════════════════════════════════════════════════

// Re-export all types
export type {
  ServiceResult,
  Conversation,
  ConversationParticipant,
  Message,
  MessageAttachment,
  GetMessagesOptions,
} from './types';

// Re-export conversation functions
export {
  getConversations,
  getConversationById,
  createConversation,
  getOrCreateConversationByDealId,
} from './conversations';

// Re-export message functions
export {
  getMessages,
  sendMessage,
  markAsRead,
} from './messages';

// Re-export notification functions
export { getUnreadCount } from './notifications';

// Re-export realtime functions
export { subscribeToMessages } from './realtime';
