'use client';

import { cn } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// GRADEUP NIL - Skeleton Components
// Reusable skeleton loading states with shimmer animation
// ═══════════════════════════════════════════════════════════════════════════

// ─── Base Skeleton ───
// The core skeleton element with shimmer animation
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'animate-shimmer rounded-[var(--radius-md)]',
        className
      )}
      {...props}
    />
  );
}

// ─── Skeleton Avatar ───
// Circle skeleton for avatar placeholders
export function SkeletonAvatar({
  size = 'md',
}: {
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  return (
    <Skeleton className={cn('rounded-full flex-shrink-0', sizes[size])} />
  );
}

// ─── Skeleton Text ───
// Multiple lines of text placeholders
export function SkeletonText({
  lines = 3,
}: {
  lines?: number;
}) {
  return (
    <div className="space-y-2">
      {[...Array(lines)].map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 ? 'w-3/4' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

// ─── Skeleton Card ───
// Card with avatar, title, description, and stats
export function SkeletonCard() {
  return (
    <div className="bg-[var(--surface-white)] rounded-[var(--radius-xl)] p-6 border border-[var(--surface-200)] shadow-sm">
      <div className="flex items-center gap-4 mb-4">
        <SkeletonAvatar size="lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
      <div className="flex items-center gap-3 pt-4 border-t border-[var(--surface-100)]">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-14 rounded-full" />
      </div>
    </div>
  );
}

// ─── Skeleton Stats ───
// Grid of stat cards
export function SkeletonStats({
  count = 4,
}: {
  count?: number;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[...Array(count)].map((_, i) => (
        <div
          key={i}
          className="bg-[var(--surface-white)] rounded-[var(--radius-xl)] p-6 border border-[var(--surface-200)] shadow-sm"
        >
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-10 w-10 rounded-[var(--radius-lg)]" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-3 w-20" />
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton Table ───
// Table with header and rows
export function SkeletonTable({
  rows = 5,
}: {
  rows?: number;
}) {
  return (
    <div className="bg-[var(--surface-white)] rounded-[var(--radius-xl)] border border-[var(--surface-200)] shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 bg-[var(--surface-50)] border-b border-[var(--surface-100)]">
        <div className="flex items-center gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-16 ml-auto" />
        </div>
      </div>
      {/* Rows */}
      {[...Array(rows)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 px-6 py-4 border-b border-[var(--surface-100)] last:border-0"
        >
          <SkeletonAvatar size="md" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-4 w-24 hidden sm:block" />
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton Chart ───
// Chart placeholder with bars
export function SkeletonChart() {
  return (
    <div className="bg-[var(--surface-white)] rounded-[var(--radius-xl)] p-6 border border-[var(--surface-200)] shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
        <Skeleton className="h-8 w-24 rounded-[var(--radius-md)]" />
      </div>
      {/* Chart area */}
      <div className="h-64 flex items-end gap-3 pt-4">
        {[65, 45, 80, 35, 55, 70, 40, 60].map((height, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-[var(--radius-sm)]"
          >
            <Skeleton
              className="w-full rounded-t-[var(--radius-sm)]"
              style={{ height: `${height}%` }}
            />
          </div>
        ))}
      </div>
      {/* X-axis labels */}
      <div className="flex justify-between mt-4 px-2">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="h-3 w-8" />
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton List ───
// Simple list of items
export function SkeletonList({
  items = 5,
}: {
  items?: number;
}) {
  return (
    <div className="space-y-3">
      {[...Array(items)].map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-4 bg-[var(--surface-white)] rounded-[var(--radius-lg)] border border-[var(--surface-200)]"
        >
          <Skeleton className="h-6 w-6 rounded-[var(--radius-sm)]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-4 w-12" />
        </div>
      ))}
    </div>
  );
}

// ─── Skeleton Deal Card ───
// Deal/opportunity card skeleton
export function SkeletonDealCard() {
  return (
    <div className="bg-[var(--surface-white)] rounded-[var(--radius-xl)] border border-[var(--surface-200)] shadow-sm overflow-hidden">
      {/* Header with brand info */}
      <div className="p-4 border-b border-[var(--surface-100)]">
        <div className="flex items-center gap-3">
          <SkeletonAvatar size="lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>

      {/* Deal content */}
      <div className="p-4 space-y-4">
        {/* Title and description */}
        <div className="space-y-2">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>

        {/* Deal stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-20" />
          </div>
        </div>

        {/* Requirements tags */}
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>

      {/* Footer actions */}
      <div className="p-4 pt-0 flex items-center gap-3">
        <Skeleton className="h-10 flex-1 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-10 rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}

// ─── Skeleton Message Thread ───
// Message thread loading state
export function SkeletonMessageThread() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-16 px-4 flex items-center gap-3 border-b border-[var(--surface-200)] bg-[var(--surface-white)]">
        <SkeletonAvatar size="md" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 p-4 space-y-4 overflow-hidden">
        {/* Date divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[var(--surface-200)]" />
          <Skeleton className="h-3 w-16" />
          <div className="flex-1 h-px bg-[var(--surface-200)]" />
        </div>

        {/* Received messages */}
        <div className="flex gap-2">
          <SkeletonAvatar size="sm" />
          <Skeleton className="h-16 w-48 rounded-[var(--radius-lg)]" />
        </div>
        <div className="flex gap-2">
          <div className="w-8" />
          <Skeleton className="h-10 w-32 rounded-[var(--radius-lg)]" />
        </div>

        {/* Sent messages */}
        <div className="flex justify-end">
          <Skeleton className="h-12 w-40 rounded-[var(--radius-lg)]" />
        </div>
        <div className="flex justify-end">
          <Skeleton className="h-20 w-56 rounded-[var(--radius-lg)]" />
        </div>

        {/* More received */}
        <div className="flex gap-2">
          <SkeletonAvatar size="sm" />
          <Skeleton className="h-14 w-44 rounded-[var(--radius-lg)]" />
        </div>
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-[var(--surface-200)] bg-[var(--surface-white)]">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded-[var(--radius-md)]" />
          <Skeleton className="h-10 flex-1 rounded-[var(--radius-md)]" />
          <Skeleton className="h-8 w-8 rounded-[var(--radius-md)]" />
        </div>
      </div>
    </div>
  );
}

// ─── Skeleton Conversation List ───
// Conversation list loading state
export function SkeletonConversationList() {
  return (
    <div className="flex flex-col h-full bg-[var(--surface-white)]">
      {/* Search bar */}
      <div className="p-4 border-b border-[var(--surface-200)]">
        <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
      </div>

      {/* Conversation items */}
      <div className="flex-1 overflow-hidden">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="p-4 border-b border-[var(--surface-100)] last:border-0"
          >
            <div className="flex items-start gap-3">
              <SkeletonAvatar size="md" />
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-full" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Skeleton Form ───
// Form fields loading state
export function SkeletonForm({
  fields = 4,
}: {
  fields?: number;
}) {
  return (
    <div className="space-y-6">
      {[...Array(fields)].map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full rounded-[var(--radius-md)]" />
        </div>
      ))}
      <div className="flex items-center gap-3 pt-4">
        <Skeleton className="h-10 w-24 rounded-[var(--radius-md)]" />
        <Skeleton className="h-10 w-20 rounded-[var(--radius-md)]" />
      </div>
    </div>
  );
}

// ─── Skeleton Profile Header ───
// Profile/athlete header loading state
export function SkeletonProfileHeader() {
  return (
    <div className="bg-[var(--surface-white)] rounded-[var(--radius-xl)] border border-[var(--surface-200)] shadow-sm overflow-hidden">
      {/* Cover image */}
      <Skeleton className="h-32 w-full rounded-none" />

      {/* Profile content */}
      <div className="px-6 pb-6">
        {/* Avatar overlapping cover */}
        <div className="-mt-12 mb-4">
          <Skeleton className="h-24 w-24 rounded-full border-4 border-[var(--surface-white)]" />
        </div>

        {/* Name and info */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-[var(--surface-100)]">
          <div className="text-center">
            <Skeleton className="h-6 w-12 mx-auto mb-1" />
            <Skeleton className="h-3 w-16" />
          </div>
          <div className="text-center">
            <Skeleton className="h-6 w-16 mx-auto mb-1" />
            <Skeleton className="h-3 w-14" />
          </div>
          <div className="text-center">
            <Skeleton className="h-6 w-10 mx-auto mb-1" />
            <Skeleton className="h-3 w-12" />
          </div>
        </div>
      </div>
    </div>
  );
}

