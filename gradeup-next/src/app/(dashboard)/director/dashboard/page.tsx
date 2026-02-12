'use client';

import {
  Users,
  DollarSign,
  TrendingUp,
  Bell,
  Handshake,
  Shield,
  Eye,
  Loader2,
  GraduationCap,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency, formatRelativeTime } from '@/lib/utils';
import { useRequireAuth } from '@/context';
import { useDirectorStats, useSchoolAthletes, useComplianceAlerts } from '@/lib/hooks/use-data';
import type { ComplianceAlert } from '@/lib/services/director';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface AthleticDirectorData {
  id: string;
  school_id: string | null;
  school?: { name: string; short_name: string };
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

interface AlertsPanelCardProps {
  alerts: ComplianceAlert[] | null;
  loading: boolean;
}

function AlertsPanelCard({ alerts, loading }: AlertsPanelCardProps) {
  const severityColors = {
    high: {
      bg: 'bg-[var(--color-error-muted)]',
      border: 'border-[var(--color-error)]',
      badge: 'error' as const,
    },
    medium: {
      bg: 'bg-[var(--color-warning-muted)]',
      border: 'border-[var(--color-warning)]',
      badge: 'warning' as const,
    },
    low: {
      bg: 'bg-[var(--color-primary-muted)]',
      border: 'border-[var(--color-primary)]',
      badge: 'primary' as const,
    },
  };

  if (loading) {
    return (
      <Card className="border-l-4 border-l-[var(--color-warning)]">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[var(--color-warning)]" />
            <CardTitle>Compliance Alerts</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayAlerts = alerts || [];

  return (
    <Card className="border-l-4 border-l-[var(--color-warning)]">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-[var(--color-warning)]" />
            <CardTitle>Compliance Alerts</CardTitle>
          </div>
          {displayAlerts.length > 0 && (
            <Badge variant="warning">{displayAlerts.length} Active</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {displayAlerts.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] text-center py-4">
            No compliance alerts
          </p>
        ) : (
          <div className="space-y-3">
            {displayAlerts.map((alert) => {
              const colors = severityColors[alert.severity as keyof typeof severityColors] || severityColors.low;
              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-[var(--radius-md)] ${colors.bg} border ${colors.border}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-[var(--text-primary)]">
                          {alert.athlete_name}
                        </span>
                        <Badge variant={colors.badge} size="sm">
                          {alert.severity.charAt(0).toUpperCase() + alert.severity.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--text-secondary)]">{alert.message}</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">
                        {formatRelativeTime(alert.created_at)}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════

export default function DirectorDashboardPage() {
  // Require auth and get director data
  const { roleData, isLoading: authLoading } = useRequireAuth({ allowedRoles: ['athletic_director'] });
  const directorData = roleData as AthleticDirectorData | null;

  // Fetch dashboard data
  const { data: stats, loading: statsLoading } = useDirectorStats();
  const { data: athletesData, loading: athletesLoading } = useSchoolAthletes();
  const { data: alerts, loading: alertsLoading } = useComplianceAlerts();

  // Show loading state while auth is checking
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  const schoolName = directorData?.school?.name || 'Your School';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Program Overview
          </h1>
          <p className="text-[var(--text-muted)]">
            {schoolName} Athletics NIL Program
          </p>
        </div>
        <Badge variant="primary">Athletic Director</Badge>
      </div>

      {/* Stats Grid - 2x3 layout */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Athletes"
          value={statsLoading ? '...' : (stats?.total_athletes || 0).toString()}
          icon={<Users className="h-5 w-5" />}
        />
        <StatCard
          title="Active Deals"
          value={statsLoading ? '...' : (stats?.active_deals || 0).toString()}
          icon={<Handshake className="h-5 w-5" />}
        />
        <StatCard
          title="Total Earnings"
          value={statsLoading ? '...' : formatCurrency(stats?.total_earnings || 0)}
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          title="Average GPA"
          value={statsLoading ? '...' : (stats?.avg_gpa || 0).toFixed(2)}
          icon={<GraduationCap className="h-5 w-5" />}
        />
        <StatCard
          title="Verified Athletes"
          value={statsLoading ? '...' : (stats?.verified_athletes || 0).toString()}
          icon={<Shield className="h-5 w-5" />}
        />
        <StatCard
          title="Pending Verifications"
          value={statsLoading ? '...' : (stats?.pending_verifications || 0).toString()}
          icon={<TrendingUp className="h-5 w-5" />}
        />
      </div>

      {/* Athletes Overview Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>School Athletes</CardTitle>
            <a
              href="/director/athletes"
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              View all
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {athletesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : athletesData?.athletes.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)] text-center py-4">
              No athletes registered yet
            </p>
          ) : (
            <div className="space-y-3">
              {athletesData?.athletes.slice(0, 5).map((athlete) => {
                const name = `${athlete.first_name || ''} ${athlete.last_name || ''}`.trim() || 'Unknown Athlete';
                return (
                  <div
                    key={athlete.id}
                    className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-card-hover)] transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-[var(--text-primary)]">{name}</p>
                      <p className="text-sm text-[var(--text-muted)]">
                        {athlete.sport?.name || 'Sport'} • {athlete.position || 'Position'}
                      </p>
                    </div>
                    {athlete.gpa && (
                      <Badge variant="success" size="sm">
                        {athlete.gpa.toFixed(2)} GPA
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Compliance Alerts Panel */}
      <AlertsPanelCard alerts={alerts} loading={alertsLoading} />
    </div>
  );
}
