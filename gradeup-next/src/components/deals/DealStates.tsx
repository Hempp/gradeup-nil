'use client';

import {
  ArrowLeft,
  Clock,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Ban,
  XCircle,
} from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/utils';
import type { DealDetail } from './types';
import { isDealExpired } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// LOADING STATE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function LoadingState() {
  return (
    <div className="space-y-6">
      {/* Back button skeleton */}
      <Skeleton className="h-5 w-32" />

      {/* Header card skeleton */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            <div className="flex items-start gap-4 flex-1">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-64" />
                <div className="flex items-center gap-4 mt-4">
                  <Skeleton className="h-6 w-20" />
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-5 w-24" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab navigation skeleton */}
      <div className="flex items-center gap-4 border-b border-[var(--border-color)] pb-3">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-20" />
      </div>

      {/* Content skeleton */}
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-start gap-3">
                <Skeleton className="h-2 w-2 rounded-full mt-1.5" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-4">
                  <Skeleton className="h-6 w-6 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ERROR STATE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface ErrorStateProps {
  error: Error;
  onRetry: () => void;
  onBack: () => void;
}

export function ErrorState({ error, onRetry, onBack }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--color-error)]/10 flex items-center justify-center mb-4">
        <AlertTriangle className="h-8 w-8 text-[var(--color-error)]" />
      </div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
        Failed to Load Deal
      </h2>
      <p className="text-[var(--text-secondary)] mb-2 max-w-md">
        We encountered an error while loading this deal. Please try again.
      </p>
      <p className="text-sm text-[var(--text-muted)] mb-6 max-w-md">
        {error.message || 'An unexpected error occurred'}
      </p>
      <div className="flex items-center gap-3">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Deals
        </Button>
        <Button variant="primary" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try Again
        </Button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NOT FOUND STATE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface NotFoundStateProps {
  onBack: () => void;
}

export function NotFoundState({ onBack }: NotFoundStateProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
        <AlertCircle className="h-8 w-8 text-[var(--text-muted)]" />
      </div>
      <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">Deal Not Found</h2>
      <p className="text-[var(--text-secondary)] mb-6 max-w-md">
        This deal doesn&apos;t exist or may have been removed. Please check the URL or go back to
        your deals.
      </p>
      <Button variant="primary" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Deals
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DEAL STATUS BANNER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface DealStatusBannerProps {
  deal: DealDetail;
  daysUntilExpiration: number;
}

export function DealStatusBanner({ deal, daysUntilExpiration }: DealStatusBannerProps) {
  const isExpired = deal.status === 'expired' || isDealExpired(deal.expiresAt);
  const isWithdrawn = deal.status === 'cancelled' && deal.withdrawnAt;
  const isRejected = deal.status === 'rejected';
  const isExpiringSoon = daysUntilExpiration > 0 && daysUntilExpiration <= 3;

  if (isExpired) {
    return (
      <Card className="border-[var(--color-error)]/30 bg-[var(--color-error)]/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[var(--color-error)]/10">
              <Clock className="h-5 w-5 text-[var(--color-error)]" />
            </div>
            <div>
              <p className="font-medium text-[var(--color-error)]">This Deal Has Expired</p>
              <p className="text-sm text-[var(--text-secondary)]">
                This offer expired on {formatDate(deal.expiresAt)}. You can no longer accept or
                negotiate this deal.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isWithdrawn) {
    return (
      <Card className="border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[var(--color-warning)]/10">
              <Ban className="h-5 w-5 text-[var(--color-warning)]" />
            </div>
            <div>
              <p className="font-medium text-[var(--color-warning)]">This Offer Was Withdrawn</p>
              <p className="text-sm text-[var(--text-secondary)]">
                The brand withdrew this offer on {formatDate(deal.withdrawnAt!)}.
                {deal.withdrawnReason && (
                  <span className="block mt-1">Reason: {deal.withdrawnReason}</span>
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isRejected) {
    return (
      <Card className="border-[var(--text-muted)]/30 bg-[var(--bg-tertiary)]">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[var(--text-muted)]/10">
              <XCircle className="h-5 w-5 text-[var(--text-muted)]" />
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">You Declined This Offer</p>
              <p className="text-sm text-[var(--text-secondary)]">
                This deal was declined. You can view the details but cannot take any actions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isExpiringSoon) {
    return (
      <Card className="border-[var(--color-warning)]/30 bg-[var(--color-warning)]/5">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center h-10 w-10 rounded-full bg-[var(--color-warning)]/10">
              <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" />
            </div>
            <div>
              <p className="font-medium text-[var(--color-warning)]">Offer Expiring Soon</p>
              <p className="text-sm text-[var(--text-secondary)]">
                This offer expires in {daysUntilExpiration} day{daysUntilExpiration !== 1 ? 's' : ''}
                . Make sure to review and respond before {formatDate(deal.expiresAt)}.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}

const DealStates = {
  LoadingState,
  ErrorState,
  NotFoundState,
  DealStatusBanner,
};

export default DealStates;
