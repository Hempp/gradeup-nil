'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Activity,
  Loader2,
  ArrowRight,
  Users,
  Handshake,
  FileText,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/ui/error-state';
import { AdminStats } from '@/components/admin';
import {
  getPlatformStats,
  getSystemHealth,
  getAuditLog,
  type PlatformStats,
  type SystemHealth,
  type AuditLogEntry,
} from '@/lib/services/admin';
import { formatRelativeTime } from '@/lib/utils';

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD OVERVIEW
// Central hub for platform administration
// ═══════════════════════════════════════════════════════════════════════════

// System status indicator component
function StatusIndicator({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const statusConfig = {
    healthy: {
      icon: <CheckCircle className="h-4 w-4" />,
      color: 'text-[var(--color-success)]',
      bg: 'bg-[var(--color-success)]/10',
      label: 'Healthy',
    },
    degraded: {
      icon: <AlertTriangle className="h-4 w-4" />,
      color: 'text-[var(--color-warning)]',
      bg: 'bg-[var(--color-warning)]/10',
      label: 'Degraded',
    },
    down: {
      icon: <XCircle className="h-4 w-4" />,
      color: 'text-[var(--color-error)]',
      bg: 'bg-[var(--color-error)]/10',
      label: 'Down',
    },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${config.bg} ${config.color}`}>
      {config.icon}
      <span className="text-sm font-medium">{config.label}</span>
    </div>
  );
}

// Quick action card component
function QuickActionCard({
  title,
  description,
  href,
  icon,
  count,
}: {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  count?: number;
}) {
  return (
    <Link href={href}>
      <Card hover className="h-full">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="h-10 w-10 rounded-[var(--radius-md)] bg-[var(--color-primary-muted)] flex items-center justify-center text-[var(--color-primary)]">
              {icon}
            </div>
            {count !== undefined && (
              <Badge variant="primary" size="sm">
                {count}
              </Badge>
            )}
          </div>
          <h3 className="font-semibold text-[var(--text-primary)] mb-1">{title}</h3>
          <p className="text-sm text-[var(--text-muted)]">{description}</p>
          <div className="mt-3 flex items-center text-sm text-[var(--color-primary)] font-medium">
            View <ArrowRight className="h-4 w-4 ml-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function AdminOverviewPage() {
  // State
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all dashboard data
  const fetchData = useCallback(async () => {
    try {
      const [statsResult, healthResult, activityResult] = await Promise.all([
        getPlatformStats(),
        getSystemHealth(),
        getAuditLog({ page_size: 5 }),
      ]);

      if (statsResult.error) {
        throw new Error(statsResult.error.message);
      }

      setStats(statsResult.data);
      setHealth(healthResult.data);
      setRecentActivity(activityResult.data?.entries || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData();
  }, [fetchData]);

  // Error state
  if (error && !loading) {
    return (
      <Card className="animate-fade-in">
        <ErrorState
          errorType="data"
          title="Failed to load dashboard"
          description={error}
          onRetry={handleRefresh}
          isRetrying={isRefreshing}
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
            Admin Dashboard
          </h1>
          <p className="text-[var(--text-muted)]">
            Platform overview and system administration
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="error" className="uppercase tracking-wide">
            Admin
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Refresh
          </Button>
        </div>
      </div>

      {/* Platform Stats */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Platform Metrics
        </h2>
        <AdminStats stats={stats} loading={loading} />
      </section>

      {/* System Health */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          System Health
        </h2>
        <Card>
          <CardContent className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
              </div>
            ) : health ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-[var(--text-muted)]" />
                    <span className="font-medium text-[var(--text-primary)]">API Status</span>
                  </div>
                  <StatusIndicator status={health.api_status} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-[var(--text-muted)]" />
                    <span className="font-medium text-[var(--text-primary)]">Database</span>
                  </div>
                  <StatusIndicator status={health.database_status} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-[var(--text-muted)]" />
                    <span className="font-medium text-[var(--text-primary)]">Storage</span>
                  </div>
                  <StatusIndicator status={health.storage_status} />
                </div>
              </div>
            ) : (
              <p className="text-center text-[var(--text-muted)] py-4">
                Unable to fetch system health status
              </p>
            )}
            {health?.last_checked && (
              <p className="text-xs text-[var(--text-muted)] text-center mt-4">
                Last checked: {formatRelativeTime(health.last_checked)}
              </p>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <QuickActionCard
            title="User Management"
            description="View and manage platform users"
            href="/admin/users"
            icon={<Users className="h-5 w-5" />}
            count={stats?.totalUsers}
          />
          <QuickActionCard
            title="Deal Monitoring"
            description="Monitor and flag suspicious deals"
            href="/admin/deals"
            icon={<Handshake className="h-5 w-5" />}
            count={stats?.activeDeals}
          />
          <QuickActionCard
            title="Audit Log"
            description="View admin actions and security events"
            href="/admin/audit"
            icon={<FileText className="h-5 w-5" />}
          />
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Recent Admin Activity
          </h2>
          <Link
            href="/admin/audit"
            className="text-sm text-[var(--color-primary)] hover:underline flex items-center"
          >
            View all <ArrowRight className="h-4 w-4 ml-1" />
          </Link>
        </div>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-[var(--text-muted)]">No recent activity</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-color)]">
                {recentActivity.map((entry) => (
                  <div key={entry.id} className="p-4 hover:bg-[var(--bg-tertiary)] transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="font-medium text-[var(--text-primary)]">
                          {entry.action.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </p>
                        <p className="text-sm text-[var(--text-muted)]">
                          by {entry.admin_email}
                          {entry.entity_id && (
                            <span> on {entry.entity_type} {entry.entity_id.slice(0, 8)}...</span>
                          )}
                        </p>
                      </div>
                      <span className="text-xs text-[var(--text-muted)] flex-shrink-0">
                        {formatRelativeTime(entry.created_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
