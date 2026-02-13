'use client';

import React, { useState, useCallback, useMemo, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CheckCircle, XCircle, Eye, GraduationCap, Trophy, UserCheck, Filter } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { formatCurrency } from '@/lib/utils';
import { useDirectorAthletes, type DirectorAthlete } from '@/lib/hooks/use-director-athletes';

const statusFilters = ['All', 'Verified', 'Pending', 'Issues'];
const verificationFilters = ['All Verifications', 'Enrollment Pending', 'Grades Pending', 'Stats Pending'];

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
const AthleteRow = memo(function AthleteRow({ athlete, onView }: { athlete: DirectorAthlete; onView: (id: string) => void }) {
  return (
    <div className="flex items-center gap-4 p-4 border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors">
      <Avatar fallback={athlete.name.charAt(0)} size="md" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium text-[var(--text-primary)]">{athlete.name}</p>
          {athlete.verified && (
            <CheckCircle className="h-4 w-4 text-[var(--color-success)]" />
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
        <p className="text-sm font-semibold text-[var(--gpa-gold)]">
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
  const { athletes, stats, isLoading } = useDirectorAthletes();
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [verificationFilter, setVerificationFilter] = useState('All Verifications');
  const [showVerificationFilters, setShowVerificationFilters] = useState(false);

  // Memoize callback to prevent AthleteRow re-renders
  const handleViewAthlete = useCallback((athleteId: string) => {
    router.push(`/director/athletes/${athleteId}`);
  }, [router]);

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
      return matchesSearch && matchesFilter && matchesVerificationFilter;
    });
  }, [athletes, searchQuery, filter, verificationFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Athletes</h1>
        <p className="text-[var(--text-muted)]">
          Manage and monitor your program&apos;s athletes
        </p>
      </div>

      {/* Stats */}
      {isLoading ? (
        <StatsSkeleton />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-[var(--text-muted)]">Total Athletes</p>
              <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-[var(--text-muted)]">Verified</p>
              <p className="text-2xl font-bold text-[var(--color-success)]">{stats.verified}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-[var(--text-muted)]">Pending</p>
              <p className="text-2xl font-bold text-[var(--color-warning)]">{stats.pending}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <p className="text-sm text-[var(--text-muted)]">Issues</p>
              <p className="text-2xl font-bold text-[var(--color-error)]">{stats.issues}</p>
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
                  placeholder="Search athletes..."
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
                  </Button>
                ))}
                <Button
                  variant={showVerificationFilters ? 'secondary' : 'ghost'}
                  size="sm"
                  onClick={() => setShowVerificationFilters(!showVerificationFilters)}
                  className="ml-2"
                >
                  <Filter className="h-4 w-4 mr-1" />
                  Verifications
                </Button>
              </div>
            </div>
            {/* Verification Type Filters */}
            {showVerificationFilters && (
              <div className="flex flex-wrap gap-2 pt-2 border-t border-[var(--border-color)]">
                <span className="text-sm text-[var(--text-muted)] flex items-center mr-2">
                  Filter by verification:
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
            )}
          </div>
        </CardContent>
      </Card>

      {/* Athletes Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {isLoading ? 'Athlete Roster' : `Athlete Roster (${filteredAthletes.length})`}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <>
              {[1, 2, 3, 4, 5].map((i) => (
                <AthleteRowSkeleton key={i} />
              ))}
            </>
          ) : filteredAthletes.length > 0 ? (
            filteredAthletes.map((athlete) => (
              <AthleteRow key={athlete.id} athlete={athlete} onView={handleViewAthlete} />
            ))
          ) : (
            <div className="p-12 text-center">
              <p className="text-[var(--text-muted)]">No athletes found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
