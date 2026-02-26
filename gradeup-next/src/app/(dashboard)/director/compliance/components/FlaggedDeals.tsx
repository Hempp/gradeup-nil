'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Search,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { FilterBar, type Filter as FilterType } from '@/components/ui/filter-bar';
import { Modal } from '@/components/ui/modal';
import { useToastActions } from '@/components/ui/toast';
import { formatCurrency } from '@/lib/utils';
import type { FlaggedDeal } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// TABLE COLUMNS
// ═══════════════════════════════════════════════════════════════════════════

const flaggedDealColumns: DataTableColumn<FlaggedDeal>[] = [
  {
    key: 'athleteName',
    header: 'Athlete',
    render: (_, row) => (
      <div className="flex items-center gap-2">
        <Avatar fallback={row.athleteName.charAt(0)} size="sm" />
        <div>
          <p className="font-medium text-[var(--text-primary)]">{row.athleteName}</p>
          <p className="text-xs text-[var(--text-muted)]">{row.brandName}</p>
        </div>
      </div>
    ),
  },
  {
    key: 'dealAmount',
    header: 'Deal Value',
    render: (_, row) => (
      <span className="font-semibold text-[var(--text-primary)]">
        {formatCurrency(row.dealAmount)}
      </span>
    ),
  },
  {
    key: 'flagReason',
    header: 'Flag Reason',
    render: (_, row) => (
      <p className="text-sm text-[var(--text-secondary)] max-w-xs truncate" title={row.flagReason}>
        {row.flagReason}
      </p>
    ),
  },
  {
    key: 'severity',
    header: 'Severity',
    render: (_, row) => {
      const variants: Record<FlaggedDeal['severity'], 'error' | 'warning' | 'primary'> = {
        high: 'error',
        medium: 'warning',
        low: 'primary',
      };
      return (
        <Badge variant={variants[row.severity]} size="sm">
          {row.severity.charAt(0).toUpperCase() + row.severity.slice(1)}
        </Badge>
      );
    },
  },
  {
    key: 'assignedReviewer',
    header: 'Reviewer',
    render: (_, row) => (
      <span className="text-[var(--text-muted)] text-sm">
        {row.assignedReviewer || 'Unassigned'}
      </span>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    render: (_, row) => {
      const statusConfig: Record<FlaggedDeal['status'], { variant: 'warning' | 'success' | 'error' | 'primary'; label: string }> = {
        pending: { variant: 'warning', label: 'Pending' },
        approved: { variant: 'success', label: 'Approved' },
        rejected: { variant: 'error', label: 'Rejected' },
        investigating: { variant: 'primary', label: 'Investigating' },
      };
      const config = statusConfig[row.status];
      return <Badge variant={config.variant} size="sm">{config.label}</Badge>;
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
// EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════

function EmptyDealsState({ hasFilters }: { hasFilters: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] flex items-center justify-center mb-4">
        {hasFilters ? (
          <Search className="h-8 w-8 text-[var(--text-muted)]" />
        ) : (
          <CheckCircle className="h-8 w-8 text-[var(--color-success)]" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
        {hasFilters ? 'No matching deals found' : 'All clear!'}
      </h3>
      <p className="text-[var(--text-muted)] max-w-sm mb-4">
        {hasFilters
          ? 'Try adjusting your filters or search terms to find what you\'re looking for.'
          : 'There are no flagged deals requiring review. Great job maintaining compliance!'}
      </p>
      {hasFilters && (
        <Badge variant="outline" className="cursor-pointer hover:bg-[var(--bg-tertiary)]">
          Clear filters to see all deals
        </Badge>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DEAL ACTIONS
// ═══════════════════════════════════════════════════════════════════════════

function FlaggedDealsActions({ deal }: { deal: FlaggedDeal }) {
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showInvestigateModal, setShowInvestigateModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [investigationNotes, setInvestigationNotes] = useState('');
  const toast = useToastActions();

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(
        'Deal Approved',
        `The deal between ${deal.athleteName} and ${deal.brandName} has been approved.`
      );
      setShowApproveModal(false);
    } catch {
      toast.error('Approval Failed', 'Unable to approve deal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(
        'Deal Rejected',
        `The deal between ${deal.athleteName} and ${deal.brandName} has been rejected.`
      );
      setShowRejectModal(false);
    } catch {
      toast.error('Rejection Failed', 'Unable to reject deal. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvestigate = async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      toast.success(
        'Investigation Started',
        `An investigation has been opened for the deal between ${deal.athleteName} and ${deal.brandName}.`
      );
      setShowInvestigateModal(false);
      setInvestigationNotes('');
    } catch {
      toast.error('Action Failed', 'Unable to start investigation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (deal.status !== 'pending' && deal.status !== 'investigating') {
    return null;
  }

  return (
    <>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" onClick={() => setShowApproveModal(true)}>
          <CheckCircle className="h-3 w-3 mr-1" />
          Approve
        </Button>
        <Button variant="danger" size="sm" onClick={() => setShowRejectModal(true)}>
          <XCircle className="h-3 w-3 mr-1" />
          Reject
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowInvestigateModal(true)}>
          <Eye className="h-3 w-3 mr-1" />
          Investigate
        </Button>
      </div>

      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Deal"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowApproveModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApprove} isLoading={isLoading}>
              Approve
            </Button>
          </>
        }
      >
        <p className="text-[var(--text-secondary)]">
          Are you sure you want to approve the deal between{' '}
          <strong>{deal.athleteName}</strong> and <strong>{deal.brandName}</strong> for{' '}
          <strong>{formatCurrency(deal.dealAmount)}</strong>?
        </p>
      </Modal>

      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Deal"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleReject} isLoading={isLoading}>
              Reject
            </Button>
          </>
        }
      >
        <p className="text-[var(--text-secondary)]">
          Are you sure you want to reject this deal? The athlete and brand will be
          notified of the rejection.
        </p>
      </Modal>

      <Modal
        isOpen={showInvestigateModal}
        onClose={() => { setShowInvestigateModal(false); setInvestigationNotes(''); }}
        title="Open Investigation"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => { setShowInvestigateModal(false); setInvestigationNotes(''); }}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleInvestigate} isLoading={isLoading}>
              <Eye className="h-4 w-4 mr-2" />
              Start Investigation
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-[var(--text-muted)]">Athlete</p>
                <p className="font-medium text-[var(--text-primary)]">{deal.athleteName}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Brand</p>
                <p className="font-medium text-[var(--text-primary)]">{deal.brandName}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Deal Value</p>
                <p className="font-semibold text-[var(--color-success)]">{formatCurrency(deal.dealAmount)}</p>
              </div>
              <div>
                <p className="text-[var(--text-muted)]">Deal Type</p>
                <p className="font-medium text-[var(--text-primary)]">{deal.dealType}</p>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
            <p className="text-sm font-medium text-[var(--color-warning)] mb-1">Flag Reason:</p>
            <p className="text-sm text-[var(--text-secondary)]">{deal.flagReason}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Investigation Notes
            </label>
            <textarea
              value={investigationNotes}
              onChange={(e) => setInvestigationNotes(e.target.value)}
              placeholder="Add notes about this investigation..."
              className="w-full h-24 px-3 py-2 text-sm rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            />
          </div>

          <p className="text-sm text-[var(--text-muted)]">
            Starting an investigation will change the deal status to &quot;Investigating&quot; and notify the compliance team.
          </p>
        </div>
      </Modal>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface FlaggedDealsQueueProps {
  deals: FlaggedDeal[];
}

export function FlaggedDealsQueue({ deals }: FlaggedDealsQueueProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Filter flagged deals
  const filteredDeals = deals.filter((deal) => {
    const matchesSearch =
      deal.athleteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.brandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.flagReason.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = !severityFilter || deal.severity === severityFilter;
    const matchesStatus = !statusFilter || deal.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const pendingCount = deals.filter((d) => d.status === 'pending').length;

  // Filter configurations
  const dealFilters: FilterType[] = [
    {
      id: 'severity',
      label: 'Severity',
      options: [
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' },
      ],
      value: severityFilter,
      onChange: setSeverityFilter,
    },
    {
      id: 'status',
      label: 'Status',
      options: [
        { value: 'pending', label: 'Pending' },
        { value: 'investigating', label: 'Investigating' },
        { value: 'approved', label: 'Approved' },
        { value: 'rejected', label: 'Rejected' },
      ],
      value: statusFilter,
      onChange: setStatusFilter,
    },
  ];

  // Extended columns with actions
  const extendedDealColumns: DataTableColumn<FlaggedDeal>[] = [
    ...flaggedDealColumns,
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => <FlaggedDealsActions deal={row} />,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" />
            <CardTitle>Flagged Deals Queue</CardTitle>
            <Badge variant="warning">{pendingCount} Pending</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <FilterBar
          filters={dealFilters}
          searchValue={searchQuery}
          searchPlaceholder="Search deals..."
          onSearchChange={setSearchQuery}
          className="mb-4"
        />
        {filteredDeals.length === 0 ? (
          <EmptyDealsState hasFilters={!!(searchQuery || severityFilter || statusFilter)} />
        ) : (
          <div className="overflow-x-auto -mx-6">
            <div className="min-w-[800px] px-6">
              <DataTable
                columns={extendedDealColumns}
                data={filteredDeals}
                keyExtractor={(row) => row.id}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
