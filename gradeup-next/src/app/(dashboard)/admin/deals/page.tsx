'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  Filter,
  Loader2,
  Flag,
  Eye,
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ErrorState } from '@/components/ui/error-state';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import {
  getDealsForAdmin,
  flagDeal,
  unflagDeal,
  type AdminDeal,
  type DealFilters,
} from '@/lib/services/admin';
import { useRequireAuth } from '@/context';
import { formatCurrency, formatDateTime, formatRelativeTime } from '@/lib/utils';
import type { DealStatus } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// DEAL MONITORING PAGE
// Monitor all platform deals, flag suspicious activity
// ═══════════════════════════════════════════════════════════════════════════

const statusOptions: { value: DealStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'negotiating', label: 'Negotiating' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'rejected', label: 'Rejected' },
];

const statusBadgeVariant: Record<DealStatus, 'primary' | 'success' | 'warning' | 'error' | 'default'> = {
  draft: 'default',
  pending: 'warning',
  negotiating: 'primary',
  accepted: 'success',
  active: 'success',
  completed: 'success',
  cancelled: 'error',
  expired: 'default',
  rejected: 'error',
  paused: 'warning',
};

export default function AdminDealsPage() {
  const { user } = useRequireAuth({ allowedRoles: ['admin'] });

  // State
  const [deals, setDeals] = useState<AdminDeal[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<DealStatus[]>([]);
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Flag modal
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<AdminDeal | null>(null);
  const [flagReason, setFlagReason] = useState('');

  // Detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Fetch deals
  const fetchDeals = useCallback(async () => {
    setLoading(true);
    setError(null);

    const filters: DealFilters = {
      page: currentPage,
      page_size: 20,
    };

    if (searchQuery.trim()) {
      filters.search = searchQuery.trim();
    }

    if (selectedStatuses.length > 0) {
      filters.status = selectedStatuses;
    }

    if (showFlaggedOnly) {
      filters.is_flagged = true;
    }

    try {
      const result = await getDealsForAdmin(filters);

      if (result.error) {
        throw new Error(result.error.message);
      }

      setDeals(result.data?.deals || []);
      setTotal(result.data?.total || 0);
      setTotalPages(result.data?.total_pages || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load deals');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, selectedStatuses, showFlaggedOnly]);

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchDeals();
  }, [fetchDeals]);

  // Handle search
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchDeals();
  }, [fetchDeals]);

  // Handle status filter toggle
  const toggleStatus = useCallback((status: DealStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
    setCurrentPage(1);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedStatuses([]);
    setShowFlaggedOnly(false);
    setCurrentPage(1);
  }, []);

  // Open flag modal
  const openFlagModal = useCallback((deal: AdminDeal) => {
    setSelectedDeal(deal);
    setFlagModalOpen(true);
    setOpenDropdown(null);
  }, []);

  // Handle flag deal
  const handleFlagDeal = useCallback(async () => {
    if (!selectedDeal || !user?.id || !flagReason.trim()) return;

    setActionLoading(selectedDeal.id);
    try {
      const result = await flagDeal(selectedDeal.id, flagReason.trim(), user.id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      setFlagModalOpen(false);
      setSelectedDeal(null);
      setFlagReason('');
      await fetchDeals();
    } catch (err) {
      console.error('Failed to flag deal:', err);
    } finally {
      setActionLoading(null);
    }
  }, [selectedDeal, user?.id, flagReason, fetchDeals]);

  // Handle unflag deal
  const handleUnflagDeal = useCallback(async (deal: AdminDeal) => {
    if (!user?.id) return;

    setActionLoading(deal.id);
    setOpenDropdown(null);
    try {
      const result = await unflagDeal(deal.id, user.id);
      if (result.error) {
        throw new Error(result.error.message);
      }
      await fetchDeals();
    } catch (err) {
      console.error('Failed to unflag deal:', err);
    } finally {
      setActionLoading(null);
    }
  }, [user?.id, fetchDeals]);

  // View deal details
  const handleViewDeal = useCallback((deal: AdminDeal) => {
    setSelectedDeal(deal);
    setShowDetailModal(true);
    setOpenDropdown(null);
  }, []);

  // Table columns
  const columns: DataTableColumn<AdminDeal>[] = [
    {
      key: 'deal',
      header: 'Deal',
      mobilePriority: 1,
      render: (_, row) => (
        <div className="flex items-center gap-3">
          {row.is_flagged && (
            <div className="h-8 w-8 rounded-full bg-[var(--color-error)]/10 flex items-center justify-center flex-shrink-0">
              <Flag className="h-4 w-4 text-[var(--color-error)]" />
            </div>
          )}
          <div>
            <p className="font-medium text-[var(--text-primary)]">{row.title}</p>
            <p className="text-xs text-[var(--text-muted)]">
              {row.brand?.company_name || 'Unknown Brand'}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: 'athlete',
      header: 'Athlete',
      mobilePriority: 2,
      render: (_, row) => (
        <span className="text-sm text-[var(--text-primary)]">
          {row.athlete ? `${row.athlete.first_name} ${row.athlete.last_name}` : 'Unknown'}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      mobilePriority: 3,
      render: (_, row) => (
        <Badge variant={statusBadgeVariant[row.status]} size="sm">
          {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'compensation_amount',
      header: 'Value',
      hideOnMobile: true,
      render: (_, row) => (
        <span className="font-medium text-[var(--text-primary)]">
          {formatCurrency(row.compensation_amount)}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Created',
      hideOnMobile: true,
      render: (_, row) => (
        <span className="text-sm text-[var(--text-muted)]">
          {formatRelativeTime(row.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-12',
      render: (_, row) => (
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdown(openDropdown === row.id ? null : row.id);
            }}
            className="h-8 w-8 p-0"
            aria-label="Deal actions"
            disabled={actionLoading === row.id}
          >
            {actionLoading === row.id ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <MoreHorizontal className="h-4 w-4" />
            )}
          </Button>

          {/* Dropdown menu */}
          {openDropdown === row.id && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenDropdown(null)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-md)] shadow-lg z-20 overflow-hidden">
                <button
                  className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors"
                  onClick={() => handleViewDeal(row)}
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </button>
                <div className="border-t border-[var(--border-color)]" />
                {row.is_flagged ? (
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-[var(--color-success)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors"
                    onClick={() => handleUnflagDeal(row)}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Remove Flag
                  </button>
                ) : (
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-[var(--color-error)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors"
                    onClick={() => openFlagModal(row)}
                  >
                    <Flag className="h-4 w-4" />
                    Flag Deal
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  // Error state
  if (error && !loading) {
    return (
      <Card className="animate-fade-in">
        <ErrorState
          errorType="data"
          title="Failed to load deals"
          description={error}
          onRetry={fetchDeals}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Deal Monitoring
          </h1>
          <p className="text-[var(--text-muted)]">
            {total} deals on the platform
          </p>
        </div>
        {deals.some(d => d.is_flagged) && (
          <Badge variant="error" className="flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {deals.filter(d => d.is_flagged).length} Flagged
          </Badge>
        )}
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Form */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <Input
                  type="text"
                  placeholder="Search deals by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>

            {/* Filter Buttons */}
            <div className="flex gap-2">
              <Button
                variant={showFlaggedOnly ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setShowFlaggedOnly(!showFlaggedOnly);
                  setCurrentPage(1);
                }}
                className="whitespace-nowrap"
              >
                <Flag className="h-4 w-4 mr-2" />
                Flagged Only
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {selectedStatuses.length > 0 && (
                  <Badge variant="primary" size="sm" className="ml-2">
                    {selectedStatuses.length}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Filter by Status
                </span>
                {selectedStatuses.length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-[var(--color-primary)] hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((status) => (
                  <button
                    key={status.value}
                    onClick={() => toggleStatus(status.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedStatuses.includes(status.value)
                        ? 'bg-[var(--color-primary)] text-black'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    {status.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Deals Table */}
      <DataTable
        columns={columns as unknown as DataTableColumn<Record<string, unknown>>[]}
        data={deals as unknown as Record<string, unknown>[]}
        loading={loading}
        onRowClick={handleViewDeal as unknown as (row: Record<string, unknown>) => void}
        mobileCardView
        caption="Platform deals"
        rowActionDescription="View deal details"
        emptyState={
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)]">No deals found</p>
          </div>
        }
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {(currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, total)} of {total} deals
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-[var(--text-primary)]">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Flag Deal Modal */}
      <Modal
        isOpen={flagModalOpen}
        onClose={() => {
          setFlagModalOpen(false);
          setSelectedDeal(null);
          setFlagReason('');
        }}
        title="Flag Deal for Review"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setFlagModalOpen(false);
                setSelectedDeal(null);
                setFlagReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleFlagDeal}
              disabled={actionLoading === selectedDeal?.id || !flagReason.trim()}
              className="bg-[var(--color-error)] hover:bg-[var(--color-error)]/90"
            >
              {actionLoading === selectedDeal?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Flagging...
                </>
              ) : (
                <>
                  <Flag className="h-4 w-4 mr-2" />
                  Flag Deal
                </>
              )}
            </Button>
          </>
        }
      >
        {selectedDeal && (
          <div className="space-y-4">
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              <p className="text-sm text-[var(--text-muted)] mb-1">Deal</p>
              <p className="font-medium text-[var(--text-primary)]">{selectedDeal.title}</p>
              <p className="text-sm text-[var(--text-muted)]">
                {selectedDeal.brand?.company_name} - {formatCurrency(selectedDeal.compensation_amount)}
              </p>
            </div>

            <div>
              <label htmlFor="flag-reason" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Reason for Flagging <span className="text-[var(--color-error)]">*</span>
              </label>
              <textarea
                id="flag-reason"
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
                placeholder="Enter the reason for flagging this deal..."
                className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                rows={3}
              />
            </div>

            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20">
              <p className="text-sm text-[var(--text-secondary)]">
                <strong>Note:</strong> Flagging a deal marks it for administrative review. The deal will remain active but will be highlighted for investigation.
              </p>
            </div>
          </div>
        )}
      </Modal>

      {/* Deal Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedDeal(null);
        }}
        title="Deal Details"
        size="lg"
      >
        {selectedDeal && (
          <div className="space-y-6">
            {/* Deal Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {selectedDeal.title}
                </h3>
                <p className="text-[var(--text-muted)]">
                  {selectedDeal.deal_type.replace(/_/g, ' ')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={statusBadgeVariant[selectedDeal.status]}>
                  {selectedDeal.status}
                </Badge>
                {selectedDeal.is_flagged && (
                  <Badge variant="error">
                    <Flag className="h-3 w-3 mr-1" />
                    Flagged
                  </Badge>
                )}
              </div>
            </div>

            {/* Flag Notice */}
            {selectedDeal.is_flagged && selectedDeal.flag_reason && (
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20">
                <p className="text-sm font-medium text-[var(--color-error)] mb-1">
                  Flagged for Review
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {selectedDeal.flag_reason}
                </p>
                {selectedDeal.flagged_at && (
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Flagged {formatRelativeTime(selectedDeal.flagged_at)}
                  </p>
                )}
              </div>
            )}

            {/* Deal Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
                  Brand
                </p>
                <p className="font-medium text-[var(--text-primary)]">
                  {selectedDeal.brand?.company_name || 'Unknown'}
                </p>
              </div>
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
                  Athlete
                </p>
                <p className="font-medium text-[var(--text-primary)]">
                  {selectedDeal.athlete ? `${selectedDeal.athlete.first_name} ${selectedDeal.athlete.last_name}` : 'Unknown'}
                </p>
              </div>
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
                  Compensation
                </p>
                <p className="font-medium text-[var(--text-primary)]">
                  {formatCurrency(selectedDeal.compensation_amount)}
                </p>
              </div>
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
                  Created
                </p>
                <p className="font-medium text-[var(--text-primary)]">
                  {formatDateTime(selectedDeal.created_at)}
                </p>
              </div>
            </div>

            {/* Deal ID */}
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
                Deal ID
              </p>
              <p className="font-mono text-sm text-[var(--text-primary)]">
                {selectedDeal.id}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
