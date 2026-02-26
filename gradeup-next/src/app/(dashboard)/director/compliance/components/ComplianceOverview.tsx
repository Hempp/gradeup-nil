'use client';

import {
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/ui/stat-card';
import type { ComplianceScoreData, ComplianceMetrics, FlaggedDeal } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// COMPLIANCE SCORE CARD
// ═══════════════════════════════════════════════════════════════════════════

interface ComplianceScoreCardProps {
  scoreData: ComplianceScoreData;
  metrics: ComplianceMetrics;
}

export function ComplianceScoreCard({ scoreData, metrics }: ComplianceScoreCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-[var(--color-success)]';
    if (score >= 70) return 'text-[var(--color-warning)]';
    return 'text-[var(--color-error)]';
  };

  const getScoreBg = (score: number) => {
    if (score >= 90) return 'bg-[var(--color-success)]';
    if (score >= 70) return 'bg-[var(--color-warning)]';
    return 'bg-[var(--color-error)]';
  };

  const scoreDiff = scoreData.overall - scoreData.previousMonth;

  const trendLabels: Record<string, string> = {
    documentation: 'Documentation',
    dealCompliance: 'Deal Compliance',
    disclosureAdherence: 'FTC Disclosure',
    academicStanding: 'Academic Standing',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-[var(--color-primary)]" />
            <CardTitle>Compliance Score</CardTitle>
          </div>
          <Badge variant={scoreData.overall >= 90 ? 'success' : 'warning'} size="sm">
            {scoreData.overall >= 95 ? 'Excellent' : scoreData.overall >= 90 ? 'Good' : 'Needs Work'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Main Score Circle */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <svg className="w-32 h-32 transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="var(--bg-tertiary)"
                strokeWidth="12"
                fill="none"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke={scoreData.overall >= 90 ? 'var(--color-success)' : scoreData.overall >= 70 ? 'var(--color-warning)' : 'var(--color-error)'}
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${(scoreData.overall / 100) * 351.86} 351.86`}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${getScoreColor(scoreData.overall)}`}>
                {scoreData.overall}
              </span>
              <span className="text-xs text-[var(--text-muted)]">out of 100</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            {scoreDiff > 0 ? (
              <TrendingUp className="h-4 w-4 text-[var(--color-success)]" />
            ) : scoreDiff < 0 ? (
              <TrendingDown className="h-4 w-4 text-[var(--color-error)]" />
            ) : (
              <Activity className="h-4 w-4 text-[var(--text-muted)]" />
            )}
            <span className={`text-sm font-medium ${scoreDiff > 0 ? 'text-[var(--color-success)]' : scoreDiff < 0 ? 'text-[var(--color-error)]' : 'text-[var(--text-muted)]'}`}>
              {scoreDiff > 0 ? '+' : ''}{scoreDiff}% from last month
            </span>
          </div>
        </div>

        {/* Score Breakdown */}
        <div className="space-y-3">
          {Object.entries(scoreData.trends).map(([key, data]) => (
            <div key={key}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-[var(--text-secondary)]">
                  {trendLabels[key] || key}
                </span>
                <div className="flex items-center gap-2">
                  {data.trend === 'up' && <TrendingUp className="h-3 w-3 text-[var(--color-success)]" />}
                  {data.trend === 'down' && <TrendingDown className="h-3 w-3 text-[var(--color-error)]" />}
                  <span className={`text-sm font-semibold ${getScoreColor(data.current)}`}>
                    {data.current}%
                  </span>
                </div>
              </div>
              <div className="h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getScoreBg(data.current)}`}
                  style={{ width: `${data.current}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-6 pt-4 border-t border-[var(--border-color)]">
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center p-2 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              <p className="text-lg font-bold text-[var(--text-primary)]">{metrics.totalDealsReviewed}</p>
              <p className="text-xs text-[var(--text-muted)]">Deals Reviewed</p>
            </div>
            <div className="text-center p-2 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              <p className="text-lg font-bold text-[var(--color-success)]">{metrics.complianceRate}%</p>
              <p className="text-xs text-[var(--text-muted)]">Pass Rate</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPLIANCE STATS ROW
// ═══════════════════════════════════════════════════════════════════════════

interface ComplianceStatsRowProps {
  flaggedDeals: FlaggedDeal[];
  metrics: ComplianceMetrics;
}

export function ComplianceStatsRow({ flaggedDeals, metrics }: ComplianceStatsRowProps) {
  const pendingCount = flaggedDeals.filter((d) => d.status === 'pending').length;
  const highSeverityCount = flaggedDeals.filter(
    (d) => d.severity === 'high' && d.status === 'pending'
  ).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Pending Reviews"
        value={pendingCount.toString()}
        icon={<Clock className="h-5 w-5" />}
        subtitle={highSeverityCount > 0 ? `${highSeverityCount} high severity` : 'No urgent items'}
      />
      <StatCard
        title="High Severity Flags"
        value={highSeverityCount.toString()}
        icon={<AlertTriangle className="h-5 w-5" />}
        trend={-2}
        trendDirection="down"
        subtitle="vs. last week"
      />
      <StatCard
        title="Resolved This Month"
        value={metrics.dealsThisMonth.toString()}
        icon={<CheckCircle className="h-5 w-5" />}
        trend={18}
        trendDirection="up"
        subtitle={`${metrics.complianceRate}% compliance rate`}
      />
      <StatCard
        title="Avg Resolution Time"
        value={`${metrics.avgResolutionHours}h`}
        icon={<Activity className="h-5 w-5" />}
        trend={12}
        trendDirection="down"
        subtitle="Faster than target (24h)"
      />
    </div>
  );
}
