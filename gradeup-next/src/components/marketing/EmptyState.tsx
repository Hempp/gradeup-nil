'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Search,
  Inbox,
  Filter,
  RefreshCw,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type EmptyStateVariant = 'no-results' | 'no-opportunities' | 'error' | 'loading-failed';

interface EmptyStateProps {
  variant?: EmptyStateVariant;
  title?: string;
  description?: string;
  searchQuery?: string;
  onClearFilters?: () => void;
  onRetry?: () => void;
  showSignupCTA?: boolean;
  className?: string;
}

// ============================================================================
// ILLUSTRATION COMPONENT
// ============================================================================

function EmptyIllustration({ variant }: { variant: EmptyStateVariant }) {
  const iconMap = {
    'no-results': Search,
    'no-opportunities': Inbox,
    'error': Filter,
    'loading-failed': RefreshCw,
  };

  const Icon = iconMap[variant];

  return (
    <div className="relative mb-6">
      {/* Glow effect */}
      <div
        className="absolute inset-0 rounded-full blur-2xl opacity-30"
        style={{
          background: 'radial-gradient(circle, var(--marketing-cyan) 0%, transparent 70%)',
          transform: 'scale(1.5)',
        }}
        aria-hidden="true"
      />

      {/* Icon container */}
      <div className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-[var(--marketing-gray-800)] to-[var(--marketing-gray-900)] border border-[var(--marketing-gray-700)] flex items-center justify-center shadow-xl">
        <Icon
          className="h-10 w-10 text-[var(--marketing-gray-500)]"
          strokeWidth={1.5}
          aria-hidden="true"
        />

        {/* Decorative dots */}
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[var(--marketing-cyan)]/30" aria-hidden="true" />
        <div className="absolute -bottom-2 -left-2 w-2 h-2 rounded-full bg-[var(--marketing-magenta)]/30" aria-hidden="true" />
      </div>
    </div>
  );
}

// ============================================================================
// DEFAULT CONTENT BY VARIANT
// ============================================================================

const defaultContent: Record<EmptyStateVariant, { title: string; description: string }> = {
  'no-results': {
    title: 'No matching opportunities',
    description: 'We couldn\'t find opportunities matching your search. Try adjusting your filters or search terms.',
  },
  'no-opportunities': {
    title: 'No opportunities available',
    description: 'New opportunities are added regularly. Check back soon or sign up to get notified when new deals are posted.',
  },
  'error': {
    title: 'Something went wrong',
    description: 'We had trouble loading opportunities. Please try again or check back later.',
  },
  'loading-failed': {
    title: 'Failed to load',
    description: 'We couldn\'t load the opportunities. Please check your connection and try again.',
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function MarketingEmptyState({
  variant = 'no-results',
  title,
  description,
  searchQuery,
  onClearFilters,
  onRetry,
  showSignupCTA = true,
  className = '',
}: EmptyStateProps) {
  const content = defaultContent[variant];
  const displayTitle = title || content.title;
  const displayDescription = searchQuery
    ? `No opportunities found for "${searchQuery}". ${content.description}`
    : description || content.description;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center py-16 px-4 text-center ${className}`}
    >
      <EmptyIllustration variant={variant} />

      {/* Title */}
      <h3 className="text-xl font-semibold text-white mb-3">
        {displayTitle}
      </h3>

      {/* Description */}
      <p className="text-[var(--marketing-gray-400)] max-w-md mb-8 leading-relaxed">
        {displayDescription}
      </p>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {onClearFilters && (
          <Button
            onClick={onClearFilters}
            variant="outline"
            className="border-[var(--marketing-cyan)] text-[var(--marketing-cyan)] hover:bg-[var(--marketing-cyan)]/10"
          >
            <Filter className="h-4 w-4 mr-2" />
            Clear Filters
          </Button>
        )}

        {onRetry && (
          <Button
            onClick={onRetry}
            variant="outline"
            className="border-[var(--marketing-gray-600)] text-white hover:bg-white/10"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        )}

        {showSignupCTA && (
          <Link href="/signup/athlete">
            <Button className="btn-marketing-primary">
              <Sparkles className="h-4 w-4 mr-2" />
              Get Notified of New Deals
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        )}
      </div>

      {/* Helpful tips */}
      {variant === 'no-results' && (
        <div className="mt-10 p-4 rounded-xl bg-[var(--marketing-gray-900)]/50 border border-[var(--marketing-gray-800)] max-w-md">
          <p className="text-sm text-[var(--marketing-gray-500)] mb-2 font-medium">
            Tips for finding opportunities:
          </p>
          <ul className="text-sm text-[var(--marketing-gray-400)] text-left space-y-1">
            <li className="flex items-start gap-2">
              <span className="text-[var(--marketing-cyan)]">•</span>
              Try broader search terms
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--marketing-cyan)]">•</span>
              Remove some filters to see more results
            </li>
            <li className="flex items-start gap-2">
              <span className="text-[var(--marketing-cyan)]">•</span>
              Check back regularly for new opportunities
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}

export default MarketingEmptyState;
