// Core UI Components
export { Button, type ButtonProps } from './button';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, type CardProps } from './card';
export { Badge, type BadgeProps } from './badge';
export { StatusBadge, type StatusBadgeProps } from './status-badge';
export { Avatar, type AvatarProps } from './avatar';
export { Input, type InputProps } from './input';

// Data Display Components
export { Skeleton, SkeletonAvatar, SkeletonText, SkeletonCard, SkeletonStats, SkeletonTable } from './skeleton';
export { DataTable, LoadingRow, EmptyState, type DataTableColumn, type DataTableProps } from './data-table';
export { StatCard, type StatCardProps } from './stat-card';

// Form Components
export {
  FormField,
  TextAreaField,
  PasswordField,
  type FormFieldProps,
  type TextAreaFieldProps,
  type PasswordFieldProps,
} from './form-field';
export {
  ValidatedInput,
  PasswordInput,
  PasswordStrengthIndicator,
  type ValidatedInputProps,
  type PasswordInputProps,
  type PasswordStrengthIndicatorProps,
  type ValidationState,
} from './validated-input';
export { Select, MultiSelect, type SelectOption, type SelectProps, type MultiSelectProps } from './select';
export { Switch, type SwitchProps } from './switch';
export { AvatarUpload, DocumentUpload, type AvatarUploadProps, type DocumentUploadProps, type AvatarUploadVariant } from './avatar-upload';

// Navigation & Filtering
export { FilterBar, type FilterBarProps, type FilterOption, type Filter } from './filter-bar';
export { Pagination, type PaginationProps } from './pagination';

// Overlay Components
export { Modal, type ModalProps, type ModalSize } from './modal';
export {
  useConfirm,
  ConfirmProvider,
  type ConfirmOptions,
  type ConfirmContextValue,
  type ConfirmVariant,
} from './confirm-dialog';
export {
  useToast,
  useToastActions,
  ToastProvider,
  type Toast,
  type ToastVariant,
} from './toast';

// Error Handling
export { ErrorBoundary, ErrorFallback, InlineError, PageError } from './error-boundary';
export { NoDeals, NoMessages, NoEarnings, NoAthletes, type EmptyStateProps } from './empty-state';

// Chart Components
export {
  ChartWrapper,
  TimePeriodSelector,
  chartColors,
  tooltipStyle,
  axisStyle,
  formatCurrencyValue,
  formatAxisValue,
  type TimePeriod,
} from './chart';
export {
  LazyLineChart,
  LazyBarChart,
  LazyAreaChart,
  LazyPieChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from './lazy-chart';

// Keyboard Shortcuts
export {
  KeyboardShortcutsProvider,
  KeyboardShortcutsDialog,
  KeyCombo,
  useKeyboardShortcuts,
  useRegisterShortcut,
  type Shortcut,
  type ShortcutCategory,
  type ShortcutCategoryInfo,
  type KeyboardShortcutsContextValue,
} from './keyboard-shortcuts';

// Onboarding Tour
export {
  OnboardingTourProvider,
  useOnboardingTour,
  athleteOnboardingSteps,
  athleteOnboardingConfig,
  type TourStep,
  type OnboardingTourConfig,
  type OnboardingTourProviderProps,
} from './onboarding-tour';
