'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Clock,
  DollarSign,
  FileText,
  MessageSquare,
  CheckCircle2,
  Circle,
  Upload,
  Download,
  Send,
  AlertCircle,
  ExternalLink,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Ban,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { FormField, TextAreaField } from '@/components/ui/form-field';
import { useToastActions } from '@/components/ui/toast';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';
import {
  getDealById,
  acceptDeal,
  rejectDeal,
  submitCounterOffer,
  type CounterOfferInput,
} from '@/lib/services/deals';
import type { DealStatus, DealType, CompensationType } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

interface BrandInfo {
  name: string;
  logo: string | null;
  contactName: string;
  contactEmail: string;
}

interface TimelineItem {
  date: string;
  event: string;
}

type DeliverableStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

interface Deliverable {
  id: string;
  title: string;
  description: string;
  status: DeliverableStatus;
  dueDate: string;
  submittedAt: string | null;
  approvedAt: string | null;
}

interface DealMessage {
  id: string;
  senderId: 'brand' | 'athlete';
  senderName: string;
  senderAvatar: string | null;
  message: string;
  timestamp: string;
}

interface DealDetail {
  id: string;
  title: string;
  description: string;
  brand: BrandInfo;
  amount: number;
  status: DealStatus;
  dealType: DealType;
  compensationType: CompensationType;
  createdAt: string;
  expiresAt: string;
  acceptedAt: string | null;
  withdrawnAt?: string | null;
  withdrawnReason?: string | null;
  keyTerms: string[];
  timeline: TimelineItem[];
  deliverables: Deliverable[];
  messages: DealMessage[];
  contractUrl: string | null;
}

interface CounterOfferFormData {
  amount: string;
  notes: string;
}

interface CounterOfferFormErrors {
  amount?: string;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOCK DATA (Will be replaced with API calls)
// ═══════════════════════════════════════════════════════════════════════════

const mockDeal: DealDetail = {
  id: '1',
  title: 'Instagram Post Campaign',
  description:
    'Create 3 Instagram posts featuring Nike products over 2 weeks. Posts should showcase the new Air Max collection in an authentic, lifestyle-focused way that resonates with your audience.',
  brand: {
    name: 'Nike',
    logo: null,
    contactName: 'Sarah Johnson',
    contactEmail: 'sarah.johnson@nike.com',
  },
  amount: 5000,
  status: 'pending',
  dealType: 'social_post',
  compensationType: 'fixed',
  createdAt: '2024-02-10T10:00:00Z',
  expiresAt: '2024-02-24T10:00:00Z',
  acceptedAt: null,
  keyTerms: [
    'Exclusive partnership for 2 weeks - no competitor content',
    'Posts must be approved by Nike before publishing',
    'Minimum 24-hour post visibility',
    'Usage rights for Nike social channels',
  ],
  timeline: [
    { date: '2024-02-12', event: 'Contract signing deadline' },
    { date: '2024-02-14', event: 'First post due' },
    { date: '2024-02-18', event: 'Second post due' },
    { date: '2024-02-22', event: 'Third post due' },
    { date: '2024-02-24', event: 'Campaign ends' },
  ],
  deliverables: [
    {
      id: 'd1',
      title: 'Instagram Post #1',
      description: 'Lifestyle shot with Air Max collection',
      status: 'pending',
      dueDate: '2024-02-14T23:59:00Z',
      submittedAt: null,
      approvedAt: null,
    },
    {
      id: 'd2',
      title: 'Instagram Post #2',
      description: 'Action/workout shot with Nike gear',
      status: 'pending',
      dueDate: '2024-02-18T23:59:00Z',
      submittedAt: null,
      approvedAt: null,
    },
    {
      id: 'd3',
      title: 'Instagram Post #3',
      description: 'Final campaign post - creative freedom',
      status: 'pending',
      dueDate: '2024-02-22T23:59:00Z',
      submittedAt: null,
      approvedAt: null,
    },
    {
      id: 'd4',
      title: 'Instagram Stories (2x)',
      description: 'Behind-the-scenes or casual content',
      status: 'pending',
      dueDate: '2024-02-24T23:59:00Z',
      submittedAt: null,
      approvedAt: null,
    },
  ],
  messages: [
    {
      id: 'm1',
      senderId: 'brand',
      senderName: 'Sarah Johnson',
      senderAvatar: null,
      message:
        'Hi Marcus! We are excited to work with you on this campaign. Let us know if you have any questions about the deliverables.',
      timestamp: '2024-02-10T10:30:00Z',
    },
    {
      id: 'm2',
      senderId: 'athlete',
      senderName: 'Marcus Thompson',
      senderAvatar: null,
      message:
        'Thanks Sarah! I am excited about this opportunity. Quick question - do you have specific hashtags you want me to use?',
      timestamp: '2024-02-10T14:15:00Z',
    },
    {
      id: 'm3',
      senderId: 'brand',
      senderName: 'Sarah Johnson',
      senderAvatar: null,
      message:
        'Great question! Please use #JustDoIt #AirMax and #NikeAthlete. I will send over the brand guidelines document shortly.',
      timestamp: '2024-02-10T14:45:00Z',
    },
  ],
  contractUrl: '/contracts/nike-campaign-feb2024.pdf',
};

// ═══════════════════════════════════════════════════════════════════════════
// TAB CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

type Tab = 'overview' | 'deliverables' | 'messages' | 'contract';

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'deliverables', label: 'Deliverables', icon: CheckCircle2 },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'contract', label: 'Contract', icon: FileText },
];

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if a deal has expired based on its expiration date
 */
function isDealExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

/**
 * Get the number of days until expiration (negative if expired)
 */
function getDaysUntilExpiration(expiresAt: string): number {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffTime = expiry.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Validate counter offer form
 */
function validateCounterOffer(formData: CounterOfferFormData): CounterOfferFormErrors {
  const errors: CounterOfferFormErrors = {};

  const amount = parseFloat(formData.amount);
  if (!formData.amount.trim()) {
    errors.amount = 'Amount is required';
  } else if (isNaN(amount) || amount <= 0) {
    errors.amount = 'Please enter a valid amount greater than 0';
  } else if (amount > 1000000) {
    errors.amount = 'Amount cannot exceed $1,000,000';
  }

  if (formData.notes && formData.notes.length > 1000) {
    errors.notes = 'Notes cannot exceed 1000 characters';
  }

  return errors;
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function OverviewTab({ deal }: { deal: DealDetail }) {
  return (
    <div className="space-y-6">
      {/* Description */}
      <Card>
        <CardHeader>
          <CardTitle>Deal Description</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-[var(--text-secondary)] leading-relaxed">{deal.description}</p>
        </CardContent>
      </Card>

      {/* Key Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Key Terms</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {deal.keyTerms.map((term, index) => (
              <li key={index} className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-[var(--color-primary)] flex-shrink-0" />
                <span className="text-[var(--text-secondary)]">{term}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-[var(--border-color)]" />

            <div className="space-y-4">
              {deal.timeline.map((item, index) => (
                <div key={index} className="flex items-start gap-4 relative">
                  <div className="h-6 w-6 rounded-full bg-[var(--bg-tertiary)] border-2 border-[var(--border-color)] flex items-center justify-center z-10">
                    <Calendar className="h-3 w-3 text-[var(--text-muted)]" />
                  </div>
                  <div className="flex-1 pb-4">
                    <p className="text-sm font-medium text-[var(--text-primary)]">{item.event}</p>
                    <p className="text-xs text-[var(--text-muted)]">{formatDate(item.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DeliverablesTab({ deal }: { deal: DealDetail }) {
  const getStatusIcon = (status: DeliverableStatus) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />;
      case 'submitted':
        return <Clock className="h-5 w-5 text-[var(--color-warning)]" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-[var(--color-error)]" />;
      default:
        return <Circle className="h-5 w-5 text-[var(--text-muted)]" />;
    }
  };

  const getStatusLabel = (status: DeliverableStatus) => {
    switch (status) {
      case 'approved':
        return { text: 'Approved', variant: 'success' as const };
      case 'submitted':
        return { text: 'Awaiting Approval', variant: 'warning' as const };
      case 'rejected':
        return { text: 'Rejected', variant: 'error' as const };
      default:
        return { text: 'Pending', variant: 'default' as const };
    }
  };

  return (
    <div className="space-y-4">
      {deal.deliverables.map((deliverable) => {
        const statusLabel = getStatusLabel(deliverable.status);
        return (
          <Card key={deliverable.id}>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="mt-0.5">{getStatusIcon(deliverable.status)}</div>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <h4 className="font-medium text-[var(--text-primary)]">
                        {deliverable.title}
                      </h4>
                      <p className="text-sm text-[var(--text-muted)]">{deliverable.description}</p>
                    </div>
                    <Badge variant={statusLabel.variant}>{statusLabel.text}</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-[var(--text-muted)]">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Due {formatDate(deliverable.dueDate)}
                    </span>
                    {deliverable.submittedAt && (
                      <span>Submitted {formatRelativeTime(deliverable.submittedAt)}</span>
                    )}
                  </div>
                </div>
              </div>
              {deliverable.status === 'pending' && (
                <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Deliverable
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function MessagesTab({ deal }: { deal: DealDetail }) {
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    // TODO: Implement actual message sending via API
    // For now, just clear the input - message sending not yet implemented
    setNewMessage('');
  };

  return (
    <Card className="h-[500px] flex flex-col">
      <CardHeader className="border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <Avatar fallback={deal.brand.contactName.charAt(0)} size="md" />
          <div>
            <CardTitle className="text-base">{deal.brand.contactName}</CardTitle>
            <p className="text-sm text-[var(--text-muted)]">{deal.brand.name}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto py-4">
        <div className="space-y-4">
          {deal.messages.map((message) => {
            const isAthlete = message.senderId === 'athlete';
            return (
              <div
                key={message.id}
                className={`flex ${isAthlete ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] ${
                    isAthlete
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)]'
                  } rounded-[var(--radius-lg)] px-4 py-3`}
                >
                  <p className="text-sm">{message.message}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isAthlete ? 'text-white/70' : 'text-[var(--text-muted)]'
                    }`}
                  >
                    {formatRelativeTime(message.timestamp)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
      <CardFooter className="border-t border-[var(--border-color)]">
        <div className="flex items-center gap-2 w-full">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Type a message..."
            className="flex-1 h-10 px-4 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
          <Button variant="primary" size="md" disabled={!newMessage.trim()} onClick={handleSendMessage}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function ContractTab({ deal }: { deal: DealDetail }) {
  const handleDownload = () => {
    if (deal.contractUrl) {
      window.open(deal.contractUrl, '_blank');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contract Document</CardTitle>
      </CardHeader>
      <CardContent>
        {/* PDF Viewer Placeholder */}
        <div className="bg-[var(--bg-tertiary)] rounded-[var(--radius-lg)] border border-[var(--border-color)] h-[500px] flex flex-col items-center justify-center">
          <FileText className="h-16 w-16 text-[var(--text-muted)] mb-4" />
          <p className="text-[var(--text-primary)] font-medium mb-2">Contract Preview</p>
          <p className="text-sm text-[var(--text-muted)] mb-6 text-center max-w-md">
            The full contract document will be displayed here once the PDF viewer is integrated.
          </p>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="ghost" onClick={handleDownload}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in New Tab
            </Button>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <div className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            Please review the contract carefully before accepting. Contact our support team if you
            have any questions.
          </p>
        </div>
      </CardFooter>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LOADING STATE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

function LoadingState() {
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

function ErrorState({
  error,
  onRetry,
  onBack,
}: {
  error: Error;
  onRetry: () => void;
  onBack: () => void;
}) {
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

function NotFoundState({ onBack }: { onBack: () => void }) {
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
// EXPIRED/WITHDRAWN DEAL BANNER
// ═══════════════════════════════════════════════════════════════════════════

function DealStatusBanner({
  deal,
  daysUntilExpiration,
}: {
  deal: DealDetail;
  daysUntilExpiration: number;
}) {
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

// ═══════════════════════════════════════════════════════════════════════════
// COUNTER OFFER MODAL
// ═══════════════════════════════════════════════════════════════════════════

function CounterOfferModalContent({
  deal,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  deal: DealDetail;
  onClose: () => void;
  onSubmit: (data: CounterOfferInput) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState<CounterOfferFormData>({
    amount: deal.amount.toString(),
    notes: '',
  });
  const [errors, setErrors] = useState<CounterOfferFormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const handleChange = (field: keyof CounterOfferFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof CounterOfferFormData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
    // Validate on blur
    const validationErrors = validateCounterOffer(formData);
    if (validationErrors[field]) {
      setErrors((prev) => ({ ...prev, [field]: validationErrors[field] }));
    }
  };

  const handleSubmit = async () => {
    // Mark all fields as touched
    setTouched({ amount: true, notes: true });

    // Validate
    const validationErrors = validateCounterOffer(formData);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      return;
    }

    // Submit
    await onSubmit({
      compensation_amount: parseFloat(formData.amount),
      counter_notes: formData.notes || undefined,
    });
  };

  const proposedAmount = parseFloat(formData.amount) || 0;
  const difference = proposedAmount - deal.amount;
  const percentChange = deal.amount > 0 ? ((difference / deal.amount) * 100).toFixed(1) : '0';

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Make a Counter Offer"
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? 'Submitting...' : 'Submit Counter Offer'}
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        {/* Current Offer Summary */}
        <div className="p-4 bg-[var(--bg-tertiary)] rounded-[var(--radius-lg)]">
          <p className="text-sm text-[var(--text-muted)] mb-1">Current Offer</p>
          <p className="text-2xl font-bold text-[var(--text-primary)]">
            {formatCurrency(deal.amount)}
          </p>
          <p className="text-sm text-[var(--text-secondary)] mt-1">
            {deal.brand.name} - {deal.title}
          </p>
        </div>

        {/* Counter Offer Form */}
        <FormField
          label="Your Proposed Amount"
          name="amount"
          type="number"
          value={formData.amount}
          onChange={(e) => handleChange('amount', e.target.value)}
          onBlur={() => handleBlur('amount')}
          error={touched.amount ? errors.amount : undefined}
          icon={<DollarSign className="h-4 w-4" />}
          placeholder="Enter your proposed amount"
          min={1}
          step={100}
          required
        />

        {/* Difference Indicator */}
        {proposedAmount > 0 && proposedAmount !== deal.amount && (
          <div
            className={`p-3 rounded-[var(--radius-md)] ${
              difference > 0
                ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
                : 'bg-[var(--color-error)]/10 text-[var(--color-error)]'
            }`}
          >
            <p className="text-sm font-medium">
              {difference > 0 ? '+' : ''}
              {formatCurrency(difference)} ({difference > 0 ? '+' : ''}
              {percentChange}%)
            </p>
            <p className="text-xs opacity-80">
              {difference > 0
                ? 'Your counter offer is higher than the original'
                : 'Your counter offer is lower than the original'}
            </p>
          </div>
        )}

        {/* Notes */}
        <TextAreaField
          label="Additional Notes (Optional)"
          name="notes"
          value={formData.notes}
          onChange={(e) => handleChange('notes', e.target.value)}
          onBlur={() => handleBlur('notes')}
          error={touched.notes ? errors.notes : undefined}
          placeholder="Explain your reasoning or add any additional terms you'd like to discuss..."
          maxLength={1000}
          showCount
        />

        {/* Info Notice */}
        <div className="flex items-start gap-2 text-sm text-[var(--text-muted)]">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <p>
            Counter offers are typically responded to within 24-48 hours. The brand may accept,
            reject, or make a new counter offer.
          </p>
        </div>
      </div>
    </Modal>
  );
}

/**
 * Wrapper component that handles modal open/close and uses key-based reset
 * to properly reset form state when the modal reopens
 */
function CounterOfferModal({
  isOpen,
  onClose,
  deal,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean;
  onClose: () => void;
  deal: DealDetail;
  onSubmit: (data: CounterOfferInput) => Promise<void>;
  isSubmitting: boolean;
}) {
  // Use a key that changes when modal opens to reset the form state
  const [modalKey, setModalKey] = useState(0);

  // Increment key when modal opens to reset internal state
  const handleClose = () => {
    onClose();
    // Reset key after modal closes so next open gets fresh state
    setTimeout(() => setModalKey((k) => k + 1), 300);
  };

  if (!isOpen) return null;

  return (
    <CounterOfferModalContent
      key={modalKey}
      deal={deal}
      onClose={handleClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToastActions();

  // State
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [deal, setDeal] = useState<DealDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCounterOfferModalOpen, setIsCounterOfferModalOpen] = useState(false);
  const [isSubmittingCounterOffer, setIsSubmittingCounterOffer] = useState(false);

  const dealId = params.dealId as string;

  // Fetch deal data
  const fetchDeal = useCallback(async () => {
    if (!dealId || dealId === 'undefined') {
      setIsLoading(false);
      setError(null);
      setDeal(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // In demo mode or for valid mock IDs, use mock data
      // In production, this would call the actual API
      const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

      if (isDemoMode || dealId === '1' || dealId === 'demo-deal-1') {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));
        setDeal({ ...mockDeal, id: dealId });
      } else {
        // Attempt to fetch from API
        const result = await getDealById(dealId);

        if (!result) {
          setDeal(null);
        } else {
          // Transform API response to DealDetail format
          const dealDetail: DealDetail = {
            id: result.id,
            title: result.title,
            description: result.description || '',
            brand: {
              name: result.brand?.company_name || 'Unknown Brand',
              logo: result.brand?.logo_url || null,
              contactName: 'Brand Contact',
              contactEmail: 'contact@brand.com',
            },
            amount: result.compensation_amount,
            status: result.status,
            dealType: result.deal_type,
            compensationType: result.compensation_type as CompensationType,
            createdAt: result.created_at,
            expiresAt: result.end_date || result.created_at,
            acceptedAt: null,
            keyTerms: [],
            timeline: [],
            deliverables: [],
            messages: [],
            contractUrl: null,
          };
          setDeal(dealDetail);
        }
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to fetch deal:', err);
      }
      setError(err instanceof Error ? err : new Error('Failed to load deal'));
      setDeal(null);
    } finally {
      setIsLoading(false);
    }
  }, [dealId]);

  useEffect(() => {
    fetchDeal();
  }, [fetchDeal]);

  // Computed values
  const daysUntilExpiration = useMemo(() => {
    if (!deal) return 0;
    return getDaysUntilExpiration(deal.expiresAt);
  }, [deal]);

  const canTakeAction = useMemo(() => {
    if (!deal) return false;
    const isExpired = isDealExpired(deal.expiresAt);
    const actionableStatuses: DealStatus[] = ['pending', 'negotiating'];
    return actionableStatuses.includes(deal.status) && !isExpired;
  }, [deal]);

  // Handlers
  const handleAcceptDeal = async () => {
    if (!deal) return;

    setIsProcessing(true);
    try {
      await acceptDeal(deal.id);
      toast.success(
        'Deal Accepted',
        'You have successfully accepted this deal. The brand will be notified.'
      );
      router.push('/athlete/deals');
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to accept deal:', err);
      }
      toast.error(
        'Failed to Accept Deal',
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineDeal = async () => {
    if (!deal) return;

    setIsProcessing(true);
    try {
      await rejectDeal(deal.id, 'Declined by athlete');
      toast.success('Deal Declined', 'You have declined this deal. The brand will be notified.');
      router.push('/athlete/deals');
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to decline deal:', err);
      }
      toast.error(
        'Failed to Decline Deal',
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCounterOffer = () => {
    setIsCounterOfferModalOpen(true);
  };

  const handleSubmitCounterOffer = async (data: CounterOfferInput) => {
    if (!deal) return;

    setIsSubmittingCounterOffer(true);
    try {
      const result = await submitCounterOffer(deal.id, data);

      if (result.error) {
        throw result.error;
      }

      toast.success(
        'Counter Offer Submitted',
        `Your counter offer of ${formatCurrency(data.compensation_amount || 0)} has been sent to the brand.`
      );
      setIsCounterOfferModalOpen(false);

      // Update local deal state
      if (result.data) {
        setDeal((prev) =>
          prev
            ? {
                ...prev,
                status: 'negotiating',
                amount: data.compensation_amount || prev.amount,
              }
            : null
        );
      }
    } catch (err) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to submit counter offer:', err);
      }
      toast.error(
        'Failed to Submit Counter Offer',
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      );
    } finally {
      setIsSubmittingCounterOffer(false);
    }
  };

  const handleBack = () => {
    router.push('/athlete/deals');
  };

  const handleRetry = () => {
    fetchDeal();
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <LoadingState />
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="animate-fade-in">
        <ErrorState error={error} onRetry={handleRetry} onBack={handleBack} />
      </div>
    );
  }

  // Render not found state
  if (!deal) {
    return (
      <div className="animate-fade-in">
        <NotFoundState onBack={handleBack} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Deals
      </button>

      {/* Status Banner (for expired, withdrawn, or expiring soon deals) */}
      <DealStatusBanner deal={deal} daysUntilExpiration={daysUntilExpiration} />

      {/* Deal Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row md:items-start gap-6">
            {/* Brand Info */}
            <div className="flex items-start gap-4 flex-1">
              <Avatar fallback={deal.brand.name.charAt(0)} size="xl" />
              <div className="flex-1">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="text-sm text-[var(--text-muted)]">{deal.brand.name}</p>
                    <h1 className="text-xl font-bold text-[var(--text-primary)] mt-1">
                      {deal.title}
                    </h1>
                  </div>
                  <StatusBadge status={deal.status} />
                </div>
                <div className="flex flex-wrap items-center gap-4 mt-4 text-sm">
                  <span className="flex items-center gap-1.5 text-[var(--color-primary)] font-semibold text-lg">
                    <DollarSign className="h-5 w-5" />
                    {formatCurrency(deal.amount)}
                  </span>
                  <span className="text-[var(--text-muted)] flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {isDealExpired(deal.expiresAt)
                      ? `Expired ${formatDate(deal.expiresAt)}`
                      : `Expires ${formatDate(deal.expiresAt)}`}
                  </span>
                  <Badge variant="outline">{deal.dealType.replace('_', ' ')}</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 border-b border-[var(--border-color)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]'
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.id === 'messages' && deal.messages.length > 0 && (
              <span className="h-5 w-5 rounded-full bg-[var(--color-primary)] text-white text-xs flex items-center justify-center">
                {deal.messages.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <OverviewTab deal={deal} />}
        {activeTab === 'deliverables' && <DeliverablesTab deal={deal} />}
        {activeTab === 'messages' && <MessagesTab deal={deal} />}
        {activeTab === 'contract' && <ContractTab deal={deal} />}
      </div>

      {/* Action Bar - Fixed at bottom for actionable deals */}
      {canTakeAction && (
        <Card className="sticky bottom-4 shadow-[var(--shadow-lg)]">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-sm text-[var(--text-muted)]">Ready to proceed?</p>
                <p className="font-medium text-[var(--text-primary)]">
                  {daysUntilExpiration > 0
                    ? `This offer expires ${formatRelativeTime(deal.expiresAt)}`
                    : 'Make your decision now'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="danger" onClick={handleDeclineDeal} disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : 'Decline'}
                </Button>
                <Button variant="outline" onClick={handleCounterOffer} disabled={isProcessing}>
                  Counter Offer
                </Button>
                <Button variant="primary" onClick={handleAcceptDeal} disabled={isProcessing}>
                  {isProcessing ? 'Processing...' : 'Accept Deal'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Counter Offer Modal */}
      <CounterOfferModal
        isOpen={isCounterOfferModalOpen}
        onClose={() => setIsCounterOfferModalOpen(false)}
        deal={deal}
        onSubmit={handleSubmitCounterOffer}
        isSubmitting={isSubmittingCounterOffer}
      />
    </div>
  );
}
