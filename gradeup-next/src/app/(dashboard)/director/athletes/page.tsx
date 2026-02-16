'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  CheckCircle,
  XCircle,
  Eye,
  GraduationCap,
  Trophy,
  UserCheck,
  Filter,
  ChevronDown,
  Download,
  Mail,
  CheckSquare,
  Square,
  MinusSquare,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Modal } from '@/components/ui/modal';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToastActions } from '@/components/ui/toast';
import { formatCurrency, cn } from '@/lib/utils';
import { useDirectorAthletes, type DirectorAthlete } from '@/lib/hooks/use-director-athletes';

const statusFilters = ['All', 'Verified', 'Pending', 'Issues'];
const verificationFilters = ['All Verifications', 'Enrollment Pending', 'Grades Pending', 'Stats Pending'];
const sportFilters = ['All Sports', 'Basketball', 'Football', 'Soccer', 'Volleyball', 'Swimming', 'Track & Field', 'Tennis', 'Baseball', 'Softball', 'Other'];
const yearFilters = ['All Years', 'Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate'];

// Small verification badge indicator
function VerificationBadge({
  verified,
  icon: Icon,
  label
}: {
  verified: boolean;
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div
      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
        verified
          ? 'bg-[var(--color-success)]/10 text-[var(--color-success)]'
          : 'bg-[var(--color-warning)]/10 text-[var(--color-warning)]'
      }`}
      title={`${label}: ${verified ? 'Verified' : 'Pending'}`}
    >
      <Icon className="h-3 w-3" />
      {verified ? <CheckCircle className="h-2.5 w-2.5" /> : <XCircle className="h-2.5 w-2.5" />}
    </div>
  );
}

// Memoized to prevent re-renders when filter/search state changes
const AthleteRow = memo(function AthleteRow({
  athlete,
  onView,
  isSelected,
  onSelect,
  showCheckbox,
}: {
  athlete: DirectorAthlete;
  onView: (id: string) => void;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  showCheckbox: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors',
        isSelected && 'bg-[var(--color-primary)]/5'
      )}
    >
      {showCheckbox && (
        <button
          onClick={() => onSelect(athlete.id, !isSelected)}
          className="flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors"
          aria-label={isSelected ? 'Deselect athlete' : 'Select athlete'}
        >
          {isSelected ? (
            <CheckSquare className="h-5 w-5 text-[var(--color-primary)]" />
          ) : (
            <Square className="h-5 w-5" />
          )}
        </button>
      )}
      <Avatar fallback={athlete.name.charAt(0)} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-[var(--text-primary)]">{athlete.name}</p>
          {athlete.verified && (
            <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
          )}
          {athlete.complianceStatus === 'issue' && (
            <AlertTriangle className="h-4 w-4 text-[var(--color-error)]" />
          )}
        </div>
        <p className="text-sm text-[var(--text-muted)]">
          {athlete.sport} • {athlete.year}
        </p>
      </div>
      {/* Verification Status Badges */}
      <div className="hidden md:flex items-center gap-1">
        <VerificationBadge
          verified={athlete.enrollmentVerified}
          icon={UserCheck}
          label="Enrollment"
        />
        <VerificationBadge
          verified={athlete.gradesVerified}
          icon={GraduationCap}
          label="Grades"
        />
        <VerificationBadge
          verified={athlete.sportVerified}
          icon={Trophy}
          label="Stats"
        />
      </div>
      <div className="text-center">
        <p className={cn(
          'text-sm font-semibold',
          athlete.gpa >= 3.5 ? 'text-[var(--gpa-gold)]' :
          athlete.gpa >= 2.5 ? 'text-[var(--text-primary)]' :
          'text-[var(--color-error)]'
        )}>
          {athlete.gpa.toFixed(2)}
        </p>
        <p className="text-xs text-[var(--text-muted)]">GPA</p>
      </div>
      <div className="text-center hidden sm:block">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {athlete.deals}
        </p>
        <p className="text-xs text-[var(--text-muted)]">Deals</p>
      </div>
      <div className="text-center hidden lg:block">
        <p className="text-sm font-semibold text-[var(--color-success)]">
          {formatCurrency(athlete.earnings)}
        </p>
        <p className="text-xs text-[var(--text-muted)]">Earnings</p>
      </div>
      <div>
        {athlete.complianceStatus === 'clear' && (
          <Badge variant="success" size="sm">Clear</Badge>
        )}
        {athlete.complianceStatus === 'pending' && (
          <Badge variant="warning" size="sm">Pending</Badge>
        )}
        {athlete.complianceStatus === 'issue' && (
          <Badge variant="error" size="sm">Issue</Badge>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={() => onView(athlete.id)}>
        <Eye className="h-4 w-4" />
      </Button>
    </div>
  );
});

function StatsSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="pt-4 pb-4">
            <div className="h-4 w-24 bg-[var(--bg-tertiary)] rounded mb-2" />
            <div className="h-8 w-16 bg-[var(--bg-tertiary)] rounded" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function AthleteRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] last:border-0 animate-pulse">
      <div className="h-10 w-10 rounded-full bg-[var(--bg-tertiary)]" />
      <div className="flex-1">
        <div className="h-4 w-32 bg-[var(--bg-tertiary)] rounded mb-2" />
        <div className="h-3 w-24 bg-[var(--bg-tertiary)] rounded" />
      </div>
      <div className="h-6 w-12 bg-[var(--bg-tertiary)] rounded" />
      <div className="h-6 w-12 bg-[var(--bg-tertiary)] rounded" />
      <div className="h-6 w-16 bg-[var(--bg-tertiary)] rounded" />
      <div className="h-6 w-16 bg-[var(--bg-tertiary)] rounded" />
    </div>
  );
}

export default function DirectorAthletesPage() {
  const router = useRouter();
  const { athletes, stats, isLoading, refetch } = useDirectorAthletes();
  const toast = useToastActions();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [verificationFilter, setVerificationFilter] = useState('All Verifications');
  const [sportFilter, setSportFilter] = useState('All Sports');
  const [yearFilter, setYearFilter] = useState('All Years');
  const [_showVerificationFilters, _setShowVerificationFilters] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Bulk selection state
  const [selectedAthletes, setSelectedAthletes] = useState<Set<string>>(new Set());
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkVerifyConfirm, setShowBulkVerifyConfirm] = useState(false);
  const [showBulkEmailModal, setShowBulkEmailModal] = useState(false);

  // Memoize callback to prevent AthleteRow re-renders
  const handleViewAthlete = useCallback((athleteId: string) => {
    router.push(`/director/athletes/${athleteId}`);
  }, [router]);

  // Handle athlete selection
  const handleSelectAthlete = useCallback((athleteId: string, selected: boolean) => {
    setSelectedAthletes((prev) => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(athleteId);
      } else {
        newSet.delete(athleteId);
      }
      return newSet;
    });
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelectedAthletes(new Set());
  }, []);

  // Bulk verify athletes
  const handleBulkVerify = async () => {
    setBulkActionLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      toast.success(
        'Athletes Verified',
        `Successfully verified ${selectedAthletes.size} athlete${selectedAthletes.size > 1 ? 's' : ''}.`
      );
      clearSelection();
      setShowBulkVerifyConfirm(false);
    } catch {
      toast.error('Verification Failed', 'Unable to verify athletes. Please try again.');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Export selected athletes
  const handleExportSelected = () => {
    const selectedData = athletes.filter((a) => selectedAthletes.has(a.id));
    const csv = [
      ['Name', 'Sport', 'Year', 'GPA', 'Deals', 'Earnings', 'Verified', 'Compliance Status'].join(','),
      ...selectedData.map((a) =>
        [
          a.name,
          a.sport,
          a.year,
          a.gpa.toFixed(2),
          a.deals,
          a.earnings,
          a.verified ? 'Yes' : 'No',
          a.complianceStatus,
        ].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `athletes-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success('Export Complete', `Exported ${selectedData.length} athlete records.`);
  };

  // Memoize filtered results to avoid recalculation on every render
  const filteredAthletes = useMemo(() => {
    const searchLower = searchQuery.toLowerCase();
    return athletes.filter((athlete) => {
      const matchesSearch = athlete.name.toLowerCase().includes(searchLower) ||
        athlete.sport.toLowerCase().includes(searchLower);
      const matchesFilter =
        filter === 'All' ||
        (filter === 'Verified' && athlete.verified) ||
        (filter === 'Pending' && athlete.complianceStatus === 'pending') ||
        (filter === 'Issues' && athlete.complianceStatus === 'issue');
      const matchesVerificationFilter =
        verificationFilter === 'All Verifications' ||
        (verificationFilter === 'Enrollment Pending' && !athlete.enrollmentVerified) ||
        (verificationFilter === 'Grades Pending' && !athlete.gradesVerified) ||
        (verificationFilter === 'Stats Pending' && !athlete.sportVerified);
      const matchesSportFilter =
        sportFilter === 'All Sports' ||
        athlete.sport.toLowerCase() === sportFilter.toLowerCase();
      const matchesYearFilter =
        yearFilter === 'All Years' ||
        athlete.year.toLowerCase() === yearFilter.toLowerCase();
      return matchesSearch && matchesFilter && matchesVerificationFilter && matchesSportFilter && matchesYearFilter;
    });
  }, [athletes, searchQuery, filter, verificationFilter, sportFilter, yearFilter]);

  // Select all visible athletes
  const handleSelectAll = useCallback(() => {
    const allIds = filteredAthletes.map((a) => a.id);
    const allSelected = allIds.every((id) => selectedAthletes.has(id));
    if (allSelected) {
      setSelectedAthletes(new Set());
    } else {
      setSelectedAthletes(new Set(allIds));
    }
  }, [filteredAthletes, selectedAthletes]);

  // Check if all filtered athletes are selected
  const allSelected = filteredAthletes.length > 0 && filteredAthletes.every((a) => selectedAthletes.has(a.id));
  const someSelected = filteredAthletes.some((a) => selectedAthletes.has(a.id));
  const selectedCount = selectedAthletes.size;

  // Get selected athletes that can be verified (not already verified)
  const verifiableCount = Array.from(selectedAthletes).filter(
    (id) => !athletes.find((a) => a.id === id)?.verified
  ).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Athletes</h1>
          <p className="text-[var(--text-muted)]">
            Manage and monitor your program&apos;s athletes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => refetch()} aria-label="Refresh data">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setShowBulkActions(!showBulkActions)}>
            {showBulkActions ? 'Cancel Selection' : 'Bulk Actions'}
          </Button>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {showBulkActions && selectedCount > 0 && (
        <Card className="border-[var(--color-primary)] bg-[var(--color-primary)]/5">
          <CardContent className="py-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <Badge variant="primary" size="sm">{selectedCount} selected</Badge>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
                  Clear selection
                </Button>
              </div>
              <div className="flex items-center gap-2">
                {verifiableCount > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowBulkVerifyConfirm(true)}
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Verify ({verifiableCount})
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBulkEmailModal(true)}
                >
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportSelected}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="hover:border-[var(--color-primary)]/50 transition-colors cursor-pointer" onClick={() => setFilter('All')}>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-[var(--text-muted)]">Total Athletes</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {((stats.verified / stats.total) * 100).toFixed(0)}% verified
              </p>
            </CardContent>
          </Card>
          <Card className="hover:border-[var(--color-success)]/50 transition-colors cursor-pointer" onClick={() => setFilter('Verified')}>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-[var(--text-muted)]">Verified</p>
              <p className="text-2xl font-bold text-[var(--color-success)]">{stats.verified}</p>
              <div className="flex items-center gap-1 mt-1">
                <CheckCircle className="h-3 w-3 text-[var(--color-success)]" />
                <p className="text-xs text-[var(--color-success)]">Compliance cleared</p>
              </div>
            </CardContent>
          </Card>
          <Card className="hover:border-[var(--color-warning)]/50 transition-colors cursor-pointer" onClick={() => setFilter('Pending')}>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-[var(--text-muted)]">Pending Review</p>
              <p className="text-2xl font-bold text-[var(--color-warning)]">{stats.pending}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">Awaiting verification</p>
            </CardContent>
          </Card>
          <Card className="hover:border-[var(--color-error)]/50 transition-colors cursor-pointer" onClick={() => setFilter('Issues')}>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-[var(--text-muted)]">Issues</p>
              <p className="text-2xl font-bold text-[var(--color-error)]">{stats.issues}</p>
              <div className="flex items-center gap-1 mt-1">
                <AlertTriangle className="h-3 w-3 text-[var(--color-error)]" />
                <p className="text-xs text-[var(--color-error)]">Requires attention</p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search by name or sport..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  icon={<Search className="h-4 w-4" />}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {statusFilters.map((status) => (
                  <Button
                    key={status}
                    variant={filter === status ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(status)}
                  >
                    {status}
                    {status === 'Verified' && <Badge variant="success" size="sm" className="ml-1">{stats.verified}</Badge>}
                    {status === 'Pending' && <Badge variant="warning" size="sm" className="ml-1">{stats.pending}</Badge>}
                    {status === 'Issues' && stats.issues > 0 && <Badge variant="error" size="sm" className="ml-1">{stats.issues}</Badge>}
                  </Button>
                ))}
                <Button
                  variant={showAdvancedFilters ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="ml-2"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  More Filters
                  <ChevronDown className={cn('h-4 w-4 ml-1 transition-transform', showAdvancedFilters && 'rotate-180')} />
                </Button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="space-y-4 pt-4 border-t border-[var(--border-color)]">
                {/* Sport and Year Filters */}
                <div className="flex flex-wrap gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-muted)]">Sport:</span>
                    <select
                      value={sportFilter}
                      onChange={(e) => setSportFilter(e.target.value)}
                      className="h-9 px-3 text-sm rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      {sportFilters.map((sport) => (
                        <option key={sport} value={sport}>{sport}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-[var(--text-muted)]">Year:</span>
                    <select
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                      className="h-9 px-3 text-sm rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                    >
                      {yearFilters.map((year) => (
                        <option key={year} value={year}>{year}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Verification Type Filters */}
                <div className="flex flex-wrap gap-2">
                  <span className="text-sm text-[var(--text-muted)] flex items-center mr-2">
                    Verification status:
                  </span>
                  {verificationFilters.map((vFilter) => (
                    <Button
                      key={vFilter}
                      variant={verificationFilter === vFilter ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => setVerificationFilter(vFilter)}
                      className={verificationFilter === vFilter ? '' : 'text-[var(--text-muted)]'}
                    >
                      {vFilter === 'Enrollment Pending' && <UserCheck className="h-3 w-3 mr-1" />}
                      {vFilter === 'Grades Pending' && <GraduationCap className="h-3 w-3 mr-1" />}
                      {vFilter === 'Stats Pending' && <Trophy className="h-3 w-3 mr-1" />}
                      {vFilter}
                    </Button>
                  ))}
                </div>

                {/* Active Filters Summary */}
                {(sportFilter !== 'All Sports' || yearFilter !== 'All Years' || verificationFilter !== 'All Verifications') && (
                  <div className="flex items-center gap-2 pt-2">
                    <span className="text-xs text-[var(--text-muted)]">Active filters:</span>
                    {sportFilter !== 'All Sports' && (
                      <Badge variant="outline" size="sm" className="gap-1">
                        {sportFilter}
                        <button onClick={() => setSportFilter('All Sports')} className="hover:text-[var(--color-error)]">
                          <XCircle className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {yearFilter !== 'All Years' && (
                      <Badge variant="outline" size="sm" className="gap-1">
                        {yearFilter}
                        <button onClick={() => setYearFilter('All Years')} className="hover:text-[var(--color-error)]">
                          <XCircle className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {verificationFilter !== 'All Verifications' && (
                      <Badge variant="outline" size="sm" className="gap-1">
                        {verificationFilter}
                        <button onClick={() => setVerificationFilter('All Verifications')} className="hover:text-[var(--color-error)]">
                          <XCircle className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSportFilter('All Sports');
                        setYearFilter('All Years');
                        setVerificationFilter('All Verifications');
                      }}
                      className="text-xs"
                    >
                      Clear all
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Athletes Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {isLoading ? 'Athlete Roster' : `Athlete Roster (${filteredAthletes.length})`}
            </CardTitle>
            {filteredAthletes.length > 0 && !isLoading && (
              <p className="text-sm text-[var(--text-muted)]">
                Showing {filteredAthletes.length} of {athletes.length} athletes
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* Select All Header (when bulk actions enabled) */}
          {showBulkActions && filteredAthletes.length > 0 && !isLoading && (
            <div className="flex items-center gap-4 p-3 border-b border-[var(--border-color)] bg-[var(--bg-tertiary)]">
              <button
                onClick={handleSelectAll}
                className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--color-primary)] transition-colors"
              >
                {allSelected ? (
                  <CheckSquare className="h-5 w-5 text-[var(--color-primary)]" />
                ) : someSelected ? (
                  <MinusSquare className="h-5 w-5 text-[var(--color-primary)]" />
                ) : (
                  <Square className="h-5 w-5" />
                )}
                <span>{allSelected ? 'Deselect all' : 'Select all'}</span>
              </button>
              {someSelected && (
                <span className="text-sm text-[var(--text-muted)]">
                  {selectedCount} of {filteredAthletes.length} selected
                </span>
              )}
            </div>
          )}

          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <AthleteRowSkeleton key={i} />
              ))}
            </>
          ) : filteredAthletes.length > 0 ? (
            filteredAthletes.map((athlete) => (
              <AthleteRow
                key={athlete.id}
                athlete={athlete}
                onView={handleViewAthlete}
                isSelected={selectedAthletes.has(athlete.id)}
                onSelect={handleSelectAthlete}
                showCheckbox={showBulkActions}
              />
            ))
          ) : (
            <div className="p-12 text-center">
              <Search className="h-12 w-12 mx-auto text-[var(--text-muted)] mb-4" />
              <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">No athletes found</h3>
              <p className="text-[var(--text-muted)] max-w-md mx-auto">
                {searchQuery || filter !== 'All' || sportFilter !== 'All Sports' || yearFilter !== 'All Years'
                  ? 'Try adjusting your search or filters to find what you\'re looking for.'
                  : 'No athletes have been added to your program yet.'}
              </p>
              {(searchQuery || filter !== 'All' || sportFilter !== 'All Sports' || yearFilter !== 'All Years') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => {
                    setSearchQuery('');
                    setFilter('All');
                    setSportFilter('All Sports');
                    setYearFilter('All Years');
                    setVerificationFilter('All Verifications');
                  }}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Verify Confirmation */}
      <ConfirmDialog
        isOpen={showBulkVerifyConfirm}
        onClose={() => setShowBulkVerifyConfirm(false)}
        onConfirm={handleBulkVerify}
        variant="info"
        title="Verify Selected Athletes"
        description={`You are about to verify ${verifiableCount} athlete${verifiableCount > 1 ? 's' : ''}. This will mark their enrollment, grades, and sport eligibility as verified.`}
        confirmLabel={bulkActionLoading ? 'Verifying...' : 'Verify Athletes'}
        isLoading={bulkActionLoading}
      />

      {/* Bulk Email Modal */}
      <Modal
        isOpen={showBulkEmailModal}
        onClose={() => setShowBulkEmailModal(false)}
        title="Send Email to Athletes"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowBulkEmailModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                toast.success('Emails Queued', `Email will be sent to ${selectedCount} athletes.`);
                setShowBulkEmailModal(false);
              }}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Email
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-muted)]">
            Send a message to {selectedCount} selected athlete{selectedCount > 1 ? 's' : ''}.
          </p>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Subject
            </label>
            <input
              type="text"
              placeholder="Enter email subject..."
              className="w-full h-10 px-3 text-sm rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-primary)] mb-1.5">
              Message
            </label>
            <textarea
              placeholder="Enter your message..."
              rows={5}
              className="w-full px-3 py-2 text-sm rounded-[var(--radius-md)] border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
