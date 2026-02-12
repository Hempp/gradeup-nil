'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToastActions } from '@/components/ui/toast';
import { formatCurrency, formatDate, formatRelativeTime } from '@/lib/utils';
import type { DealStatus } from '@/types';

// Mock deal data - will be replaced with real data fetch
const mockDeal = {
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
  status: 'pending' as DealStatus,
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
      status: 'pending' as const,
      dueDate: '2024-02-14T23:59:00Z',
      submittedAt: null,
      approvedAt: null,
    },
    {
      id: 'd2',
      title: 'Instagram Post #2',
      description: 'Action/workout shot with Nike gear',
      status: 'pending' as const,
      dueDate: '2024-02-18T23:59:00Z',
      submittedAt: null,
      approvedAt: null,
    },
    {
      id: 'd3',
      title: 'Instagram Post #3',
      description: 'Final campaign post - creative freedom',
      status: 'pending' as const,
      dueDate: '2024-02-22T23:59:00Z',
      submittedAt: null,
      approvedAt: null,
    },
    {
      id: 'd4',
      title: 'Instagram Stories (2x)',
      description: 'Behind-the-scenes or casual content',
      status: 'pending' as const,
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

type Tab = 'overview' | 'deliverables' | 'messages' | 'contract';

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'deliverables', label: 'Deliverables', icon: CheckCircle2 },
  { id: 'messages', label: 'Messages', icon: MessageSquare },
  { id: 'contract', label: 'Contract', icon: FileText },
];

function OverviewTab({ deal }: { deal: typeof mockDeal }) {
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

function DeliverablesTab({ deal }: { deal: typeof mockDeal }) {
  const getStatusIcon = (status: 'pending' | 'submitted' | 'approved') => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />;
      case 'submitted':
        return <Clock className="h-5 w-5 text-[var(--color-warning)]" />;
      default:
        return <Circle className="h-5 w-5 text-[var(--text-muted)]" />;
    }
  };

  const getStatusLabel = (status: 'pending' | 'submitted' | 'approved') => {
    switch (status) {
      case 'approved':
        return { text: 'Approved', variant: 'success' as const };
      case 'submitted':
        return { text: 'Awaiting Approval', variant: 'warning' as const };
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

function MessagesTab({ deal }: { deal: typeof mockDeal }) {
  const [newMessage, setNewMessage] = useState('');

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
            placeholder="Type a message..."
            className="flex-1 h-10 px-4 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
          <Button variant="primary" size="md" disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}

function ContractTab({ deal }: { deal: typeof mockDeal }) {
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
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
            <Button variant="ghost">
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

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-full" />
        <Skeleton className="h-6 w-48" />
      </div>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-16 w-full" />
          <div className="flex gap-4">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-24" />
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function DealDetailPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToastActions();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // In a real app, we would fetch the deal based on params.dealId
  const deal = mockDeal;

  const handleAcceptDeal = async () => {
    setIsProcessing(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Deal Accepted', 'You have successfully accepted this deal. The brand will be notified.');
      router.push('/athlete/deals');
    } catch (error) {
      toast.error('Failed to Accept Deal', 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeclineDeal = async () => {
    setIsProcessing(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success('Deal Declined', 'You have declined this deal. The brand will be notified.');
      router.push('/athlete/deals');
    } catch (error) {
      toast.error('Failed to Decline Deal', 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCounterOffer = () => {
    // TODO: Implement counter offer logic
    toast.info('Counter Offer', 'Opening counter offer form...');
    console.log('Counter offer:', params.dealId);
  };

  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <LoadingState />
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
                    Expires {formatDate(deal.expiresAt)}
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

      {/* Action Bar - Fixed at bottom for pending/negotiating deals */}
      {(deal.status === 'pending' || deal.status === 'negotiating') && (
        <Card className="sticky bottom-4 shadow-[var(--shadow-lg)]">
          <CardContent className="py-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-center sm:text-left">
                <p className="text-sm text-[var(--text-muted)]">Ready to proceed?</p>
                <p className="font-medium text-[var(--text-primary)]">
                  This offer expires {formatRelativeTime(deal.expiresAt)}
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
    </div>
  );
}
