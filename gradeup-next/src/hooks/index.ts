/**
 * GradeUp NIL - Hooks Index
 * Export all custom hooks from the src/hooks directory
 */

// CSRF protection hook
export { useCsrf, getCsrfToken, getCsrfHeaders } from './useCsrf';

// Real-time notifications hook
export {
  useRealtimeNotifications,
  type UseRealtimeNotificationsOptions,
  type UseRealtimeNotificationsResult,
  type Notification,
  type NotificationType,
} from './useRealtimeNotifications';
