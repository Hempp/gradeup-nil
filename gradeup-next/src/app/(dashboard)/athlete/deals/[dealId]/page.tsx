'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, FileText, CheckCircle2, MessageSquare } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToastActions } from '@/components/ui/toast';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import {
  getDealById,
  acceptDeal,
  rejectDeal,
  submitCounterOffer,
  type CounterOfferInput,
} from '@/lib/services/deals';
import type { DealStatus, CompensationType } from '@/types';

// Import extracted components
import {
  DealHeader,
  DealTimeline,
  ContractSection,
  MessagesPanel,
  DeliverablesList,
  CounterOfferModal,
  LoadingState,
  ErrorState,
  NotFoundState,
  DealStatusBanner,
  type DealDetail,
  type Tab,
  isDealExpired,
  getDaysUntilExpiration,
} from '@/components/deals';

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

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'deliverables', label: 'Deliverables', icon: CheckCircle2 },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'contract', label: 'Contract', icon: FileText },
];

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
      <DealHeader deal={deal} />

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
        {activeTab === 'overview' && <DealTimeline deal={deal} />}
        {activeTab === 'deliverables' && <DeliverablesList deal={deal} />}
        {activeTab === 'messages' && <MessagesPanel deal={deal} />}
        {activeTab === 'contract' && <ContractSection deal={deal} />}
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
