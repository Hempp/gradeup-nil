'use client';

// ═══════════════════════════════════════════════════════════════════════════
// DEPRECATED: This file is maintained for backward compatibility only.
// Please import directly from '@/lib/services/messaging' (the directory).
//
// This file re-exports all functionality from the modular messaging service.
// The messaging service has been split into focused modules:
//
// - messaging/types.ts        - Type definitions
// - messaging/conversations.ts - Conversation CRUD operations
// - messaging/messages.ts      - Message operations
// - messaging/notifications.ts - Unread count tracking
// - messaging/realtime.ts      - Real-time subscriptions
// - messaging/index.ts         - Unified exports
//
// ═══════════════════════════════════════════════════════════════════════════

// Re-export everything from the modular structure
export * from './messaging/index';
