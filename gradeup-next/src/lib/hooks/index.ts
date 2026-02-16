/**
 * GradeUp NIL - Hooks Index
 * Export all custom hooks for easy importing
 */

// Demo mode utilities
export * from './use-demo-mode';

// Data fetching hooks
export * from './use-data';

// Action hooks with toast notifications
export * from './use-action';

// Real-time hooks (messaging, notifications, presence)
export {
  useRealtimeMessages,
  useRealtimeNotifications,
  usePresence,
  type UseRealtimeMessagesOptions,
  type UseRealtimeMessagesResult,
  type TypingIndicator,
  type Notification as RealtimeNotification,
  type UseRealtimeNotificationsResult,
  type PresenceUser,
  type UsePresenceResult,
} from './use-realtime';

// Search and filter hooks
export * from './use-search';

// Error handling hooks
export * from './use-error-handler';

// Landing page data hooks (with mock fallbacks)
export * from './use-landing-data';

// Notification management hooks
export {
  useNotifications,
  getNotificationTypeLabel,
  getNotificationTypeIcon,
  type Notification,
  type NotificationType,
  type UseNotificationsResult
} from './use-notifications';

// Verification workflow hooks
export * from './use-verification-requests';
export * from './use-director-verifications';
