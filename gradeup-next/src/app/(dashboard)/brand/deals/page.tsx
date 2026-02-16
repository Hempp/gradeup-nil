'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Send, FileText, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { useToastActions } from '@/components/ui/toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import type { DealStatus } from '@/types';

// Mock deals data
const mockDeals = [
  {
    id: '1',
    title: 'Instagram Post Campaign',
    athlete: { name: 'Marcus Johnson', school: 'Duke University', sport: 'Basketball' },
    amount: 5000,
    status: 'active' as DealStatus,
    createdAt: '2024-02-10T10:00:00Z',
  },
  {
    id: '2',
    title: 'Social Media Partnership',
    athlete: { name: 'Sarah Williams', school: 'Stanford University', sport: 'Soccer' },
    amount: 7500,
    status: 'pending' as DealStatus,
    createdAt: '2024-02-09T14:30:00Z',
  },
  {
    id: '3',
    title: 'Store Appearance',
    athlete: { name: 'Jordan Davis', school: 'Ohio State', sport: 'Football' },
    amount: 3500,
    status: 'negotiating' as DealStatus,
    createdAt: '2024-02-08T09:00:00Z',
  },
  {
    id: '4',
    title: 'Brand Ambassador',
    athlete: { name: 'Emma Chen', school: 'UCLA', sport: 'Gymnastics' },
    amount: 15000,
    status: 'completed' as DealStatus,
    createdAt: '2024-01-15T11:00:00Z',
  },
  {
    id: '5',
    title: 'Video Content Creation',
    athlete: { name: 'Tyler Brooks', school: 'Michigan', sport: 'Basketball' },
    amount: 2500,
    status: 'rejected' as DealStatus,
    createdAt: '2024-01-10T16:00:00Z',
  },
];

const statusFilters: { label: string; value: DealStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Negotiating', value: 'negotiating' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
];

function DealRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] last:border-0 animate-pulse">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="h-4 w-48 mb-2" />
        <Skeleton className="h-3 w-32" />
      </div>
      <div className="text-right">
        <Skeleton className="h-4 w-20 mb-1" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

interface DealRowProps {
  deal: (typeof mockDeals)[0];
  onEditOffer: (deal: (typeof mockDeals)[0]) => void;
  onViewContract: (deal: (typeof mockDeals)[0]) => void;
  onMoreMenu: (deal: (typeof mockDeals)[0]) => void;
}

function DealRow({ deal, onEditOffer, onViewContract, onMoreMenu }: DealRowProps) {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors">
      <Avatar fallback={deal.athlete.name.charAt(0)} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-[var(--text-primary)] truncate">
            {deal.title}
          </p>
          <StatusBadge status={deal.status} size="sm" />
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          {deal.athlete.name} • {deal.athlete.school}
        </p>
      </div>
      <div className="text-right">
        <p className="font-semibold text-[var(--text-primary)]">
          {formatCurrency(deal.amount)}
        </p>
        <p className="text-xs text-[var(--text-muted)]">
          {formatDate(deal.createdAt)}
        </p>
      </div>
      <div className="flex items-center gap-2">
        {(deal.status === 'pending' || deal.status === 'negotiating') && (
          <Button variant="outline" size="sm" onClick={() => onEditOffer(deal)}>
            Edit Offer
          </Button>
        )}
        {deal.status === 'active' && (
          <Button variant="outline" size="sm" onClick={() => onViewContract(deal)}>
            <FileText className="h-4 w-4 mr-1" />
            Contract
          </Button>
        )}
        <div className="relative" ref={menuRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowMoreMenu(!showMoreMenu)}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          {showMoreMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-md)] shadow-lg z-10">
              <button
                className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                onClick={() => {
                  onMoreMenu(deal);
                  setShowMoreMenu(false);
                }}
              >
                <Eye className="h-4 w-4" />
                View Details
              </button>
              {(deal.status === 'pending' || deal.status === 'negotiating') && (
                <button
                  className="w-full px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                  onClick={() => {
                    onEditOffer(deal);
                    setShowMoreMenu(false);
                  }}
                >
                  <Edit className="h-4 w-4" />
                  Edit Offer
                </button>
              )}
              <button
                className="w-full px-3 py-2 text-left text-sm text-[var(--color-error)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2"
                onClick={() => {
                  setShowMoreMenu(false);
                }}
              >
                <Trash2 className="h-4 w-4" />
                Cancel Deal
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BrandDealsPage() {
  const toast = useToastActions();
  const [filter, setFilter] = useState<DealStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showNewOfferModal, setShowNewOfferModal] = useState(false);
  const [showEditOfferModal, setShowEditOfferModal] = useState(false);
  const [showContractModal, setShowContractModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<(typeof mockDeals)[0] | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    amount: '',
    description: '',
  });

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Handlers
  const handleNewOffer = () => {
    setShowNewOfferModal(true);
  };

  const handleEditOffer = (deal: (typeof mockDeals)[0]) => {
    setSelectedDeal(deal);
    setEditFormData({
      title: deal.title,
      amount: deal.amount.toString(),
      description: '',
    });
    setShowEditOfferModal(true);
  };

  const handleViewContract = (deal: (typeof mockDeals)[0]) => {
    setSelectedDeal(deal);
    setShowContractModal(true);
  };

  const handleMoreMenu = (deal: (typeof mockDeals)[0]) => {
    setSelectedDeal(deal);
    setShowDetailModal(true);
  };

  const handleSaveEditOffer = () => {
    toast.success('Offer Updated', 'Your offer has been updated successfully.');
    setShowEditOfferModal(false);
    setSelectedDeal(null);
  };

  const handleCreateOffer = () => {
    toast.success('Offer Created', 'Your new offer has been sent to the athlete.');
    setShowNewOfferModal(false);
  };

  const filteredDeals = mockDeals.filter((deal) => {
    const matchesFilter = filter === 'all' || deal.status === filter;
    const matchesSearch =
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.athlete.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Deals</h1>
          <p className="text-[var(--text-muted)]">
            Manage your offers and partnerships with athletes
          </p>
        </div>
        <Button variant="primary" onClick={handleNewOffer}>
          <Send className="h-4 w-4 mr-2" />
          New Offer
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search deals or athletes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={<Search className="h-4 w-4" />}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {statusFilters.map((status) => (
                <Button
                  key={status.value}
                  variant={filter === status.value ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setFilter(status.value)}
                >
                  {status.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Deals Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Deals ({filteredDeals.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <DealRowSkeleton key={i} />
              ))}
            </>
          ) : filteredDeals.length > 0 ? (
            filteredDeals.map((deal) => (
              <DealRow
                key={deal.id}
                deal={deal}
                onEditOffer={handleEditOffer}
                onViewContract={handleViewContract}
                onMoreMenu={handleMoreMenu}
              />
            ))
          ) : (
            <div className="p-12 text-center">
              <p className="text-[var(--text-muted)]">No deals found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Offer Modal */}
      <Modal
        isOpen={showNewOfferModal}
        onClose={() => setShowNewOfferModal(false)}
        title="Create New Offer"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowNewOfferModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateOffer}>
              <Send className="h-4 w-4 mr-2" />
              Send Offer
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Athlete
            </label>
            <Input placeholder="Search for an athlete..." />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Campaign Title
            </label>
            <Input placeholder="e.g., Instagram Post Campaign" />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Offer Amount
            </label>
            <Input type="number" placeholder="5000" />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Description
            </label>
            <textarea
              placeholder="Describe the campaign details, deliverables, and expectations..."
              rows={4}
              className="w-full rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
            />
          </div>
        </div>
      </Modal>

      {/* Edit Offer Modal */}
      <Modal
        isOpen={showEditOfferModal}
        onClose={() => setShowEditOfferModal(false)}
        title="Edit Offer"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowEditOfferModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEditOffer}>
              Save Changes
            </Button>
          </>
        }
      >
        {selectedDeal && (
          <div className="space-y-4">
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              <p className="text-sm text-[var(--text-muted)]">Athlete</p>
              <p className="font-medium text-[var(--text-primary)]">
                {selectedDeal.athlete.name} - {selectedDeal.athlete.school}
              </p>
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                Campaign Title
              </label>
              <Input
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                Offer Amount
              </label>
              <Input
                type="number"
                value={editFormData.amount}
                onChange={(e) => setEditFormData({ ...editFormData, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-[var(--text-muted)] mb-1.5">
                Additional Notes
              </label>
              <textarea
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Add any additional notes or changes..."
                rows={3}
                className="w-full rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] transition-colors"
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Contract Viewer Modal */}
      <Modal
        isOpen={showContractModal}
        onClose={() => setShowContractModal(false)}
        title="Contract Details"
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowContractModal(false)}>
              Close
            </Button>
            <Button variant="primary">
              <FileText className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </>
        }
      >
        {selectedDeal && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                <p className="text-sm text-[var(--text-muted)] mb-1">Campaign</p>
                <p className="font-medium text-[var(--text-primary)]">{selectedDeal.title}</p>
              </div>
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                <p className="text-sm text-[var(--text-muted)] mb-1">Amount</p>
                <p className="font-medium text-[var(--text-primary)]">{formatCurrency(selectedDeal.amount)}</p>
              </div>
            </div>

            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              <p className="text-sm text-[var(--text-muted)] mb-1">Athlete</p>
              <div className="flex items-center gap-3 mt-2">
                <Avatar fallback={selectedDeal.athlete.name.charAt(0)} size="md" />
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{selectedDeal.athlete.name}</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    {selectedDeal.athlete.sport} - {selectedDeal.athlete.school}
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-[var(--border-color)] rounded-[var(--radius-md)] p-4">
              <h4 className="font-medium text-[var(--text-primary)] mb-3">Contract Terms</h4>
              <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                <p>1. The athlete agrees to create and post content as specified in the campaign brief.</p>
                <p>2. Payment will be processed within 30 days of content delivery approval.</p>
                <p>3. The brand retains rights to use the content for 12 months.</p>
                <p>4. Either party may terminate with 14 days written notice.</p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--color-success)]/10 border border-[var(--color-success)]/20">
              <div>
                <p className="font-medium text-[var(--color-success)]">Contract Active</p>
                <p className="text-sm text-[var(--text-muted)]">
                  Signed on {formatDate(selectedDeal.createdAt)}
                </p>
              </div>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
        )}
      </Modal>

      {/* Deal Details Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => setShowDetailModal(false)}
        title="Deal Details"
        size="md"
        footer={
          <Button variant="outline" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
        }
      >
        {selectedDeal && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar fallback={selectedDeal.athlete.name.charAt(0)} size="lg" />
              <div>
                <p className="font-medium text-lg text-[var(--text-primary)]">
                  {selectedDeal.athlete.name}
                </p>
                <p className="text-[var(--text-muted)]">
                  {selectedDeal.athlete.sport} - {selectedDeal.athlete.school}
                </p>
              </div>
            </div>

            <div className="border-t border-[var(--border-color)] pt-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Campaign</span>
                <span className="font-medium text-[var(--text-primary)]">{selectedDeal.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Amount</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {formatCurrency(selectedDeal.amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Status</span>
                <StatusBadge status={selectedDeal.status} />
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Created</span>
                <span className="font-medium text-[var(--text-primary)]">
                  {formatDate(selectedDeal.createdAt)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
