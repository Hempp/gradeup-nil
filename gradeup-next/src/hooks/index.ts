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

// Athlete search hook with debounce, filters, pagination, and URL sync
export {
  useAthleteSearch,
  type AthleteSearchFilters,
  type AthleteSearchPagination,
  type AthleteSearchResult,
  type UseAthleteSearchOptions,
  type UseAthleteSearchResult,
  type FilterTag,
} from './useAthleteSearch';
