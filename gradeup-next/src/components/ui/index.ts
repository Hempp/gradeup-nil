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
export {
  ErrorBoundary,
  ErrorFallback,
  InlineError,
  PageError,
  NotFoundError,
  ServerErrorPage,
  OfflineError,
  PermissionDeniedError,
  type ErrorBoundaryProps,
  type ErrorFallbackProps,
  type InlineErrorProps,
  type PageErrorProps,
} from './error-boundary';
export {
  ErrorState,
  NetworkError,
  ServerError,
  TimeoutError,
  DataLoadError,
  PermissionError,
  AuthError,
  PaymentError,
  UploadError,
  SearchError,
  NotFoundError as NotFoundStateError,
  GenericError,
  ErrorFromException,
  type ErrorStateProps,
  type ErrorType,
} from './error-state';
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
// Lazy-loaded chart containers (import recharts sub-components directly)
export {
  LazyLineChart,
  LazyBarChart,
  LazyAreaChart,
  LazyPieChart,
  ChartLoadingPlaceholder,
} from './lazy-chart';

// Keyboard Shortcuts
export {
  KeyboardShortcutsProvider,
  KeyboardShortcutsDialog,
  KeyboardShortcutsHint,
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

// Theme Toggle
export { ThemeToggle } from './theme-toggle';

// Interactive Components
export { CommandPalette, CommandPaletteTrigger, type CommandItem } from './command-palette';
export { ConnectivityIndicator, useConnectivity, type ConnectionQuality } from './connectivity-indicator';
export { DateRangePicker, CompactDateSelector, type DateRange, type DatePreset } from './date-range-picker';
export { FileUploadDropzone, formatFileSize, type FileUploadDropzoneProps, type UploadedFile, type FileUploadStatus, type FileValidation } from './file-upload-dropzone';
export { GPARing, GPABadge, GPAStat } from './gpa-ring';
export { InfiniteScroll, useInfiniteScroll, type InfiniteScrollProps, type UseInfiniteScrollOptions } from './infinite-scroll';
export { LiveRegionProvider, useLiveRegion, type Announcement, type LiveRegionPoliteness } from './live-region';
export { ProgressStepper, ProgressBar, StepIndicator, type Step } from './progress-stepper';
export { SectionHeader, PageHeader, StatsGrid, ContentGrid, GridColumn } from './section-header';
export { VirtualizedList, VirtualizedGrid, useScrollToItem, type VirtualizedListProps, type VirtualizedGridProps } from './virtualized-list';
export { NavigationProgress, NavigationProgressBar } from './navigation-progress';
export { LazyModal } from './lazy-modal';
export { LoadingState, type LoadingStateProps } from './loading-state';
export { ExportButton } from './export-button';
export { VerifiedBadge } from './verified-badge';
export { InstagramIcon, TikTokIcon, TwitterIcon, YoutubeIcon, SOCIAL_BRAND_COLORS } from './social-icons';
export { FormInput, FormSelect, FormCheckbox } from './form-input';
export { LazyFilterPanel, LazyConfirmDialog, LazyOnboardingTourProvider } from './lazy-components';
