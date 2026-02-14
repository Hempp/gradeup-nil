'use client';

import { useState, useCallback } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  Download,
  FileText,
  Loader2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { ErrorState } from '@/components/ui/error-state';
import { useToastActions } from '@/components/ui/toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import {
  ChartWrapper,
  TimePeriodSelector,
  type TimePeriod,
  chartColors,
  tooltipStyle,
  axisStyle,
  formatCurrencyValue,
  formatAxisValue,
} from '@/components/ui/chart';
import {
  useEarningsStats,
  usePayoutHistory,
  useMonthlyEarnings,
  type Payout,
} from '@/lib/hooks/use-earnings-data';

function StatCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down';
  trendLabel?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[var(--text-muted)] mb-1">{title}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
            {trendLabel && (
              <p
                className={`text-sm mt-1 ${
                  trend === 'up' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                }`}
              >
                {trend === 'up' ? '↑' : '↓'} {trendLabel}
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-[var(--radius-lg)] bg-[var(--color-primary-muted)] flex items-center justify-center">
            <Icon className="h-6 w-6 text-[var(--color-primary)]" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EarningsChart() {
  const [period, setPeriod] = useState<TimePeriod>('6M');
  const { data: monthlyData, isLoading } = useMonthlyEarnings();

  // Filter data based on selected period
  const getFilteredData = () => {
    switch (period) {
      case '3M':
        return monthlyData.slice(-3);
      case '6M':
        return monthlyData.slice(-6);
      case '1Y':
        return monthlyData;
      case 'All':
        return monthlyData;
      default:
        return monthlyData.slice(-6);
    }
  };

  const chartData = getFilteredData();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-[var(--bg-tertiary)] rounded" />
        </CardHeader>
        <CardContent>
          <div className="h-[300px] bg-[var(--bg-tertiary)] rounded" />
        </CardContent>
      </Card>
    );
  }

  return (
    <ChartWrapper
      title="Earnings Trend"
      description="Track your earnings growth over time"
      height={300}
      headerAction={
        <TimePeriodSelector value={period} onChange={setPeriod} />
      }
    >
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-200)" vertical={false} />
        <XAxis
          dataKey="month"
          tick={axisStyle.tick}
          axisLine={axisStyle.axisLine}
          tickLine={axisStyle.tickLine}
        />
        <YAxis
          tick={axisStyle.tick}
          axisLine={false}
          tickLine={axisStyle.tickLine}
          tickFormatter={formatAxisValue}
        />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          formatter={(value) => [formatCurrencyValue(value as number), 'Earnings']}
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke={chartColors.primary}
          strokeWidth={2}
          fill="url(#earningsGradient)"
        />
      </AreaChart>
    </ChartWrapper>
  );
}

function PayoutHistory({ onExport }: { onExport: () => void }) {
  const { data: payouts, isLoading } = usePayoutHistory();

  if (isLoading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-48 bg-[var(--bg-tertiary)] rounded" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-[var(--bg-tertiary)] rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Payout History</CardTitle>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {payouts.map((payout: Payout) => (
            <div
              key={payout.id}
              className="flex items-center gap-4 p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]"
            >
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  payout.status === 'completed'
                    ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
                    : 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]'
                }`}
              >
                {payout.status === 'completed' ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Clock className="h-5 w-5" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--text-primary)] truncate">
                  {payout.dealTitle}
                </p>
                <p className="text-sm text-[var(--text-muted)]">{payout.brandName}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[var(--text-primary)]">
                  {formatCurrency(payout.amount)}
                </p>
                <Badge
                  variant={payout.status === 'completed' ? 'success' : 'warning'}
                  size="sm"
                >
                  {payout.status === 'completed'
                    ? `Paid ${formatDate(payout.paidAt!)}`
                    : 'Pending'}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AthleteEarningsPage() {
  const toast = useToastActions();
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useEarningsStats();
  const { error: payoutsError, refetch: refetchPayouts } = usePayoutHistory();
  const { error: monthlyError, refetch: refetchMonthly } = useMonthlyEarnings();

  // Modal states
  const [taxReportModalOpen, setTaxReportModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTaxYear, setSelectedTaxYear] = useState('2024');
  const [isRetrying, setIsRetrying] = useState(false);

  // Aggregate errors
  const hasError = statsError || payoutsError || monthlyError;
  const errorMessage = statsError?.message || payoutsError?.message || monthlyError?.message;

  // Handle retry
  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    console.error('Earnings data fetch error:', { statsError, payoutsError, monthlyError });
    try {
      await Promise.all([
        refetchStats(),
        refetchPayouts(),
        refetchMonthly(),
      ]);
    } catch (err) {
      console.error('Error during retry:', err);
    } finally {
      setIsRetrying(false);
    }
  }, [statsError, payoutsError, monthlyError, refetchStats, refetchPayouts, refetchMonthly]);

  // Calculate trend percentage
  const getTrendInfo = () => {
    if (stats.lastMonth === 0) return { trend: 'up' as const, label: 'New earnings!' };
    const percentChange = Math.round(
      ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100
    );
    return {
      trend: percentChange >= 0 ? 'up' as const : 'down' as const,
      label: `${Math.abs(percentChange)}% from last month`,
    };
  };

  const trendInfo = getTrendInfo();

  // Show error state if data fetch failed
  if (hasError && !statsLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">Earnings</h1>
            <p className="text-[var(--text-muted)]">
              Track your NIL income and payouts
            </p>
          </div>
        </div>
        <Card>
          <ErrorState
            errorType="data"
            title="Failed to load earnings"
            description={errorMessage || 'We could not load your earnings data. Please try again.'}
            onRetry={handleRetry}
            isRetrying={isRetrying}
          />
        </Card>
      </div>
    );
  }

  // Handlers
  const handleDownloadTaxReport = async () => {
    setIsGenerating(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsGenerating(false);
    toast.success('Tax Report Downloaded', `Your ${selectedTaxYear} tax report has been downloaded.`);
    setTaxReportModalOpen(false);
  };

  const handleExportPayoutHistory = async () => {
    setIsGenerating(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsGenerating(false);
    toast.success('Export Complete', 'Your payout history has been exported to CSV.');
    setExportModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Earnings</h1>
          <p className="text-[var(--text-muted)]">
            Track your NIL income and payouts
          </p>
        </div>
        <Button variant="outline" onClick={() => setTaxReportModalOpen(true)}>
          <Download className="h-4 w-4 mr-2" />
          Download Tax Report
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsLoading ? (
          <>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="pt-6">
                  <div className="h-4 w-24 bg-[var(--bg-tertiary)] rounded mb-2" />
                  <div className="h-8 w-32 bg-[var(--bg-tertiary)] rounded" />
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <StatCard
              title="Total Earnings"
              value={formatCurrency(stats.totalEarnings)}
              icon={DollarSign}
            />
            <StatCard
              title="Pending Payouts"
              value={formatCurrency(stats.pendingPayouts)}
              icon={Clock}
            />
            <StatCard
              title="This Month"
              value={formatCurrency(stats.thisMonth)}
              icon={TrendingUp}
              trend={trendInfo.trend}
              trendLabel={trendInfo.label}
            />
            <StatCard
              title="Last Month"
              value={formatCurrency(stats.lastMonth)}
              icon={CheckCircle}
            />
          </>
        )}
      </div>

      {/* Chart */}
      <EarningsChart />

      {/* Payout History */}
      <PayoutHistory onExport={() => setExportModalOpen(true)} />

      {/* Tax Report Modal */}
      <Modal
        isOpen={taxReportModalOpen}
        onClose={() => setTaxReportModalOpen(false)}
        title="Download Tax Report"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setTaxReportModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleDownloadTaxReport} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Download Report
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[var(--text-secondary)]">
            Generate a tax report for your NIL earnings. This report includes all payments
            received during the selected tax year.
          </p>
          <div>
            <label className="block text-sm text-[var(--text-muted)] mb-1.5">
              Select Tax Year
            </label>
            <select
              value={selectedTaxYear}
              onChange={(e) => setSelectedTaxYear(e.target.value)}
              className="w-full rounded-[var(--radius-md)] bg-[var(--bg-secondary)] border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              <option value="2024">2024</option>
              <option value="2023">2023</option>
              <option value="2022">2022</option>
            </select>
          </div>
          <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
            <p className="text-sm text-[var(--text-muted)]">
              <strong>Note:</strong> This report is for informational purposes only.
              Please consult with a tax professional for official tax filing.
            </p>
          </div>
        </div>
      </Modal>

      {/* Export Payout History Modal */}
      <Modal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Export Payout History"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setExportModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleExportPayoutHistory} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[var(--text-secondary)]">
            Export your complete payout history as a CSV file. This includes:
          </p>
          <ul className="space-y-2 text-sm text-[var(--text-muted)]">
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              Deal titles and brand names
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              Payment amounts and dates
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              Payment status (completed/pending)
            </li>
            <li className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]" />
              Transaction IDs
            </li>
          </ul>
        </div>
      </Modal>
    </div>
  );
}
