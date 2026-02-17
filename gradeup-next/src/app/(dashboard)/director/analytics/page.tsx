'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import {
  LazyLineChart as LineChart,
  LazyBarChart as BarChart,
  LazyAreaChart as AreaChart,
  LazyPieChart as PieChart,
} from '@/components/ui/lazy-chart';
import {
  Line,
  Bar,
  Area,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal } from '@/components/ui/modal';
import { useToastActions } from '@/components/ui/toast';
import {
  DollarSign,
  Users,
  TrendingUp,
  Download,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Table,
  Calendar,
  CheckCircle,
  Shield,
  Activity,
  ChevronDown,
} from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { exportToCSV, exportToPDF } from '@/lib/utils/export';
import { ExportButton } from '@/components/ui/export-button';
import {
  ChartWrapper,
  ChartLegend,
  chartColors,
  tooltipStyle,
  axisStyle,
} from '@/components/ui/chart';

// Date range options
type DateRange = '7d' | '30d' | '90d' | '6m' | '1y' | 'all';

const dateRangeOptions: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '1y', label: 'Last Year' },
  { value: 'all', label: 'All Time' },
];

// Mock analytics data with more detail
const mockStats = {
  totalRevenue: 1247500,
  previousRevenue: 892500,
  revenueGrowth: 39.8,
  avgDealSize: 7850,
  previousAvgDealSize: 5720,
  avgDealGrowth: 37.2,
  athleteParticipation: 84.5,
  previousParticipation: 80.2,
  participationGrowth: 5.4,
  activeDeals: 189,
  previousDeals: 156,
  dealGrowth: 21.2,
  totalAthletes: 247,
  verifiedAthletes: 198,
  complianceRate: 96.2,
};

// Extended monthly revenue data with more metrics
const mockMonthlyRevenue = [
  { month: 'Jul', amount: 52000, deals: 12, athletes: 165 },
  { month: 'Aug', amount: 78000, deals: 18, athletes: 172 },
  { month: 'Sep', amount: 95000, deals: 24, athletes: 180 },
  { month: 'Oct', amount: 128000, deals: 32, athletes: 195 },
  { month: 'Nov', amount: 165000, deals: 38, athletes: 210 },
  { month: 'Dec', amount: 198000, deals: 42, athletes: 225 },
  { month: 'Jan', amount: 245000, deals: 48, athletes: 238 },
  { month: 'Feb', amount: 286500, deals: 52, athletes: 247 },
];

// Weekly data for shorter date ranges
const mockWeeklyRevenue = [
  { week: 'W1', amount: 42000, deals: 8 },
  { week: 'W2', amount: 58000, deals: 11 },
  { week: 'W3', amount: 71500, deals: 14 },
  { week: 'W4', amount: 65000, deals: 12 },
  { week: 'W5', amount: 78000, deals: 16 },
  { week: 'W6', amount: 82500, deals: 18 },
  { week: 'W7', amount: 91000, deals: 19 },
];

const mockSportBreakdown = [
  { sport: 'Football', athletes: 85, revenue: 412000, deals: 58, avgDeal: 7103, color: '#3B82F6' },
  { sport: 'Basketball', athletes: 45, revenue: 385000, deals: 52, avgDeal: 7404, color: '#10B981' },
  { sport: 'Soccer', athletes: 32, revenue: 165000, deals: 32, avgDeal: 5156, color: '#F59E0B' },
  { sport: 'Volleyball', athletes: 24, revenue: 95000, deals: 22, avgDeal: 4318, color: '#8B5CF6' },
  { sport: 'Swimming', athletes: 18, revenue: 72000, deals: 15, avgDeal: 4800, color: '#EC4899' },
  { sport: 'Track & Field', athletes: 22, revenue: 58500, deals: 14, avgDeal: 4178, color: '#06B6D4' },
  { sport: 'Tennis', athletes: 12, revenue: 45000, deals: 10, avgDeal: 4500, color: '#84CC16' },
  { sport: 'Other', athletes: 9, revenue: 15000, deals: 6, avgDeal: 2500, color: '#6B7280' },
];

// User growth data (athletes + brands over time)
const mockUserGrowthData = [
  { month: 'Jul', athletes: 165, brands: 22, verified: 128 },
  { month: 'Aug', athletes: 172, brands: 25, verified: 138 },
  { month: 'Sep', athletes: 180, brands: 28, verified: 148 },
  { month: 'Oct', athletes: 195, brands: 32, verified: 162 },
  { month: 'Nov', athletes: 210, brands: 36, verified: 175 },
  { month: 'Dec', athletes: 225, brands: 40, verified: 185 },
  { month: 'Jan', athletes: 238, brands: 42, verified: 192 },
  { month: 'Feb', athletes: 247, brands: 45, verified: 198 },
];

// Revenue breakdown for donut chart
const mockRevenueBreakdown = [
  { name: 'Social Media', value: 485000, percent: 38.9, color: chartColors.primary },
  { name: 'Appearances', value: 312000, percent: 25.0, color: chartColors.secondary },
  { name: 'Endorsements', value: 285000, percent: 22.8, color: chartColors.success },
  { name: 'Merchandise', value: 98500, percent: 7.9, color: chartColors.warning },
  { name: 'Other', value: 67000, percent: 5.4, color: chartColors.info },
];

// Deal status breakdown
const _mockDealStatus = [
  { status: 'Active', count: 89, color: '#10B981' },
  { status: 'Completed', count: 156, color: '#3B82F6' },
  { status: 'Pending Review', count: 12, color: '#F59E0B' },
  { status: 'Negotiating', count: 23, color: '#8B5CF6' },
];

// Skeleton Components
function MetricCardSkeleton() {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-12 w-12 rounded-[var(--radius-lg)]" />
        </div>
      </CardContent>
    </Card>
  );
}

function ChartSkeleton({ title, description }: { title: string; description?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-[var(--text-muted)]">{description}</p>}
      </CardHeader>
      <CardContent>
        <div className="h-[280px] flex items-center justify-center">
          <div className="w-full space-y-4">
            <div className="flex justify-between items-end h-48">
              {[65, 85, 45, 75, 55, 90].map((height, i) => (
                <Skeleton
                  key={i}
                  className="w-12"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
            <div className="flex justify-between">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-3 w-8" />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TableSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-40" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-4 border-b border-[var(--border-color)] pb-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16 ml-auto" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-20" />
          </div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-2">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-12 ml-auto" />
              <Skeleton className="h-4 w-12" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Date Range Selector Component
function DateRangeSelector({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (value: DateRange) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = dateRangeOptions.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="min-w-[140px] justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <span>{selectedOption?.label}</span>
        </div>
        <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
      </Button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-md)] shadow-lg z-50 py-1 animate-fade-in">
          {dateRangeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-tertiary)] transition-colors',
                value === option.value
                  ? 'text-[var(--color-primary)] font-medium bg-[var(--color-primary)]/5'
                  : 'text-[var(--text-primary)]'
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  value,
  trend,
  trendDirection = 'up',
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  trend?: number;
  trendDirection?: 'up' | 'down';
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  const isPositive = trendDirection === 'up';
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight;

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[var(--text-muted)] mb-1">{title}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
            {trend !== undefined && (
              <div className={cn(
                'flex items-center gap-1 mt-2',
                isPositive ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
              )}>
                <TrendIcon className="h-4 w-4" />
                <span className="text-sm font-medium">{isPositive ? '+' : ''}{trend}%</span>
                {subtitle && (
                  <span className="text-xs text-[var(--text-muted)] ml-1">{subtitle}</span>
                )}
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-[var(--radius-lg)] bg-[var(--color-accent)]/10 flex items-center justify-center text-[var(--color-accent)]">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RevenueChart({ dateRange }: { dateRange: DateRange }) {
  // Select data based on date range
  const data = useMemo(() => {
    if (dateRange === '7d' || dateRange === '30d') {
      return mockWeeklyRevenue;
    }
    return mockMonthlyRevenue;
  }, [dateRange]);

  const dataKey = dateRange === '7d' || dateRange === '30d' ? 'week' : 'month';

  return (
    <ChartWrapper
      title="Revenue Over Time"
      description={`NIL revenue ${dateRange === '7d' ? 'weekly' : 'monthly'} breakdown`}
      height={300}
      headerAction={
        <ChartLegend
          items={[
            { name: 'Revenue', color: chartColors.primary },
            { name: 'Deals', color: chartColors.secondary },
          ]}
        />
      }
    >
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-200)" vertical={false} />
        <XAxis
          dataKey={dataKey}
          tick={axisStyle.tick}
          axisLine={axisStyle.axisLine}
          tickLine={axisStyle.tickLine}
        />
        <YAxis
          yAxisId="left"
          tick={axisStyle.tick}
          axisLine={false}
          tickLine={axisStyle.tickLine}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <YAxis
          yAxisId="right"
          orientation="right"
          tick={axisStyle.tick}
          axisLine={false}
          tickLine={axisStyle.tickLine}
        />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          formatter={(value, name) => {
            if (name === 'amount') return [formatCurrency(value as number), 'Revenue'];
            return [value, 'Deals'];
          }}
        />
        <Area
          yAxisId="left"
          type="monotone"
          dataKey="amount"
          name="amount"
          stroke={chartColors.primary}
          strokeWidth={2}
          fill="url(#revenueGradient)"
        />
        <Line
          yAxisId="right"
          type="monotone"
          dataKey="deals"
          name="Deals"
          stroke={chartColors.secondary}
          strokeWidth={2}
          dot={{ fill: chartColors.secondary, strokeWidth: 2, r: 4 }}
        />
      </AreaChart>
    </ChartWrapper>
  );
}

function UserGrowthChart() {
  return (
    <ChartWrapper
      title="Platform Growth"
      description="Athletes, brands, and verified athletes over time"
      height={300}
      headerAction={
        <ChartLegend
          items={[
            { name: 'Total Athletes', color: chartColors.primary },
            { name: 'Verified', color: chartColors.success },
            { name: 'Brands', color: chartColors.secondary },
          ]}
        />
      }
    >
      <LineChart data={mockUserGrowthData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
        />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
        />
        <Line
          type="monotone"
          dataKey="athletes"
          name="Total Athletes"
          stroke={chartColors.primary}
          strokeWidth={2}
          dot={{ fill: chartColors.primary, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="verified"
          name="Verified"
          stroke={chartColors.success}
          strokeWidth={2}
          dot={{ fill: chartColors.success, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
        <Line
          type="monotone"
          dataKey="brands"
          name="Brands"
          stroke={chartColors.secondary}
          strokeWidth={2}
          dot={{ fill: chartColors.secondary, strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ChartWrapper>
  );
}

function RevenueBreakdownChart() {
  const _total = mockRevenueBreakdown.reduce((sum, item) => sum + item.value, 0);

  return (
    <ChartWrapper
      title="Revenue by Deal Type"
      description="Distribution of NIL revenue sources"
      height={300}
    >
      <PieChart>
        <Pie
          data={mockRevenueBreakdown}
          cx="50%"
          cy="50%"
          innerRadius={65}
          outerRadius={95}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {mockRevenueBreakdown.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          formatter={(value, name) => [formatCurrency(value as number), name]}
        />
        <Legend
          verticalAlign="middle"
          align="right"
          layout="vertical"
          wrapperStyle={{ paddingLeft: '20px' }}
          formatter={(value) => {
            const item = mockRevenueBreakdown.find((d) => d.name === value);
            return (
              <span style={{ color: 'var(--text-primary)', fontSize: '12px' }}>
                {value} ({item?.percent || 0}%)
              </span>
            );
          }}
        />
      </PieChart>
    </ChartWrapper>
  );
}

function SportPerformanceChart() {
  return (
    <ChartWrapper
      title="Revenue by Sport"
      description="NIL earnings distribution across sports programs"
      height={320}
    >
      <BarChart
        data={mockSportBreakdown}
        layout="vertical"
        margin={{ top: 10, right: 30, left: 80, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-200)" horizontal={true} vertical={false} />
        <XAxis
          type="number"
          tick={axisStyle.tick}
          axisLine={axisStyle.axisLine}
          tickLine={axisStyle.tickLine}
          tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
        />
        <YAxis
          type="category"
          dataKey="sport"
          tick={axisStyle.tick}
          axisLine={false}
          tickLine={axisStyle.tickLine}
          width={75}
        />
        <Tooltip
          contentStyle={tooltipStyle.contentStyle}
          labelStyle={tooltipStyle.labelStyle}
          formatter={(value, name) => {
            if (name === 'revenue') return [formatCurrency(value as number), 'Revenue'];
            return [value, name];
          }}
        />
        <Bar
          dataKey="revenue"
          name="revenue"
          radius={[0, 4, 4, 0]}
        >
          {mockSportBreakdown.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ChartWrapper>
  );
}

// Prepare sport breakdown data for CSV export (without color field)
const sportBreakdownExportData = mockSportBreakdown.map(({ sport, athletes, deals, revenue, avgDeal }) => ({
  sport,
  athletes,
  deals,
  revenue,
  avgDeal,
}));

const sportBreakdownColumns = [
  { key: 'sport' as const, label: 'Sport' },
  { key: 'athletes' as const, label: 'Athletes' },
  { key: 'deals' as const, label: 'Active Deals' },
  { key: 'revenue' as const, label: 'Total Revenue' },
  { key: 'avgDeal' as const, label: 'Avg Deal' },
];

function SportBreakdownTable() {
  const totalAthletes = mockSportBreakdown.reduce((sum, s) => sum + s.athletes, 0);
  const totalDeals = mockSportBreakdown.reduce((sum, s) => sum + s.deals, 0);
  const totalRevenue = mockSportBreakdown.reduce((sum, s) => sum + s.revenue, 0);
  const avgDealSize = totalDeals > 0 ? totalRevenue / totalDeals : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Detailed Sport Breakdown</CardTitle>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Complete NIL performance metrics by athletic program
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ExportButton
              data={sportBreakdownExportData}
              filename="sport-breakdown"
              columns={sportBreakdownColumns}
              variant="both"
              tableId="sport-breakdown-table"
            />
            <Badge variant="outline">{mockSportBreakdown.length} Programs</Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div id="sport-breakdown-table" className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-color)]">
                <th className="text-left py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Sport
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Athletes
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Active Deals
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Total Revenue
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Avg Deal
                </th>
                <th className="text-right py-3 px-4 text-sm font-medium text-[var(--text-muted)]">
                  Share
                </th>
              </tr>
            </thead>
            <tbody>
              {mockSportBreakdown.map((sport) => {
                const share = ((sport.revenue / totalRevenue) * 100).toFixed(1);
                return (
                  <tr
                    key={sport.sport}
                    className="border-b border-[var(--border-color)] last:border-0 hover:bg-[var(--bg-tertiary)] transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: sport.color }}
                        />
                        <span className="font-medium text-[var(--text-primary)]">{sport.sport}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                      {sport.athletes}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                      {sport.deals}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-[var(--color-success)]">
                      {formatCurrency(sport.revenue)}
                    </td>
                    <td className="py-3 px-4 text-right text-[var(--text-secondary)]">
                      {formatCurrency(sport.avgDeal)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-2 bg-[var(--bg-tertiary)] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${share}%`,
                              backgroundColor: sport.color,
                            }}
                          />
                        </div>
                        <span className="text-sm text-[var(--text-muted)] w-12 text-right">{share}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-[var(--bg-tertiary)]">
                <td className="py-3 px-4 font-semibold text-[var(--text-primary)]">
                  Total
                </td>
                <td className="py-3 px-4 text-right font-semibold text-[var(--text-primary)]">
                  {totalAthletes}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-[var(--text-primary)]">
                  {totalDeals}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-[var(--color-success)]">
                  {formatCurrency(totalRevenue)}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-[var(--text-primary)]">
                  {formatCurrency(avgDealSize)}
                </td>
                <td className="py-3 px-4 text-right font-semibold text-[var(--text-primary)]">
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DirectorAnalyticsPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange>('6m');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');
  const toast = useToastActions();

  // Simulate initial loading
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  const handleExportReport = async () => {
    setExportLoading(true);
    try {
      // Simulate export processing
      await new Promise((resolve) => setTimeout(resolve, 500));

      const filename = `nil-analytics-report-${new Date().toISOString().split('T')[0]}`;

      if (exportFormat === 'csv') {
        // Use the new exportToCSV utility for comprehensive analytics export
        const analyticsData = [
          { metric: 'Total Revenue', value: formatCurrency(mockStats.totalRevenue), change: `+${mockStats.revenueGrowth}%` },
          { metric: 'Average Deal Size', value: formatCurrency(mockStats.avgDealSize), change: `+${mockStats.avgDealGrowth}%` },
          { metric: 'Active Deals', value: mockStats.activeDeals.toString(), change: `+${mockStats.dealGrowth}%` },
          { metric: 'Total Athletes', value: mockStats.totalAthletes.toString(), change: '' },
          { metric: 'Verified Athletes', value: mockStats.verifiedAthletes.toString(), change: '' },
          { metric: 'Compliance Rate', value: `${mockStats.complianceRate}%`, change: '' },
        ];
        exportToCSV(analyticsData, filename, [
          { key: 'metric', label: 'Metric' },
          { key: 'value', label: 'Value' },
          { key: 'change', label: 'Change' },
        ]);
      } else {
        // Use exportToPDF for the analytics summary
        exportToPDF('sport-breakdown-table', filename);
      }

      toast.success(
        'Report Exported',
        `Your ${exportFormat.toUpperCase()} report has been downloaded.`
      );
      setShowExportModal(false);
    } catch {
      toast.error('Export Failed', 'Unable to export report. Please try again.');
    } finally {
      setExportLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Program Analytics
            </h1>
            <p className="text-[var(--text-muted)]">
              Track your program&apos;s NIL performance
            </p>
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Overview Stats Skeletons */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <MetricCardSkeleton key={i} />
          ))}
        </div>

        {/* Chart Skeletons */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ChartSkeleton title="User Growth" description="Athletes and brands over the last 6 months" />
          <ChartSkeleton title="Revenue Breakdown" description="Revenue by deal type" />
        </div>

        {/* Table Skeleton */}
        <TableSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Program Analytics
          </h1>
          <p className="text-[var(--text-muted)]">
            Track your program&apos;s NIL performance and growth
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
          <Button variant="primary" aria-label="Download analytics report" onClick={() => setShowExportModal(true)}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(mockStats.totalRevenue)}
          trend={mockStats.revenueGrowth}
          trendDirection="up"
          subtitle="vs. last period"
          icon={DollarSign}
        />
        <MetricCard
          title="Active Deals"
          value={mockStats.activeDeals.toString()}
          trend={mockStats.dealGrowth}
          trendDirection="up"
          subtitle="vs. last period"
          icon={Activity}
        />
        <MetricCard
          title="Avg Deal Size"
          value={formatCurrency(mockStats.avgDealSize)}
          trend={mockStats.avgDealGrowth}
          trendDirection="up"
          subtitle="vs. last period"
          icon={TrendingUp}
        />
        <MetricCard
          title="Compliance Rate"
          value={`${mockStats.complianceRate}%`}
          trend={2.1}
          trendDirection="up"
          subtitle="NCAA compliant"
          icon={Shield}
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-3 lg:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Total Athletes</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">{mockStats.totalAthletes}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-[var(--color-primary)]" />
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">{mockStats.athleteParticipation}% participation rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Verified Athletes</p>
                <p className="text-2xl font-bold text-[var(--color-success)]">{mockStats.verifiedAthletes}</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[var(--color-success)]/10 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-[var(--color-success)]" />
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">{((mockStats.verifiedAthletes / mockStats.totalAthletes) * 100).toFixed(1)}% verified</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-muted)]">Active Brands</p>
                <p className="text-2xl font-bold text-[var(--text-primary)]">45</p>
              </div>
              <div className="h-10 w-10 rounded-full bg-[var(--color-accent)]/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-[var(--color-accent)]" />
              </div>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-2">+8 new this month</p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart - Full Width */}
      <RevenueChart dateRange={dateRange} />

      {/* Charts Row */}
      <div className="grid lg:grid-cols-2 gap-6">
        <UserGrowthChart />
        <RevenueBreakdownChart />
      </div>

      {/* Sport Performance Chart */}
      <SportPerformanceChart />

      {/* Sport Breakdown Table */}
      <SportBreakdownTable />

      {/* Export Report Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Analytics Report"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowExportModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleExportReport} isLoading={exportLoading}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-[var(--text-muted)]">
            Choose your preferred format to export the analytics report.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setExportFormat('pdf')}
              className={`flex flex-col items-center gap-3 p-4 rounded-[var(--radius-lg)] border-2 transition-all ${
                exportFormat === 'pdf'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[var(--border-color)] hover:border-[var(--color-primary)]/50'
              }`}
            >
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                exportFormat === 'pdf' ? 'bg-[var(--color-primary)]' : 'bg-[var(--bg-tertiary)]'
              }`}>
                <FileText className={`h-6 w-6 ${
                  exportFormat === 'pdf' ? 'text-white' : 'text-[var(--text-muted)]'
                }`} />
              </div>
              <div className="text-center">
                <p className="font-medium text-[var(--text-primary)]">PDF Report</p>
                <p className="text-xs text-[var(--text-muted)]">Formatted document with charts</p>
              </div>
            </button>

            <button
              onClick={() => setExportFormat('csv')}
              className={`flex flex-col items-center gap-3 p-4 rounded-[var(--radius-lg)] border-2 transition-all ${
                exportFormat === 'csv'
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                  : 'border-[var(--border-color)] hover:border-[var(--color-primary)]/50'
              }`}
            >
              <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                exportFormat === 'csv' ? 'bg-[var(--color-primary)]' : 'bg-[var(--bg-tertiary)]'
              }`}>
                <Table className={`h-6 w-6 ${
                  exportFormat === 'csv' ? 'text-white' : 'text-[var(--text-muted)]'
                }`} />
              </div>
              <div className="text-center">
                <p className="font-medium text-[var(--text-primary)]">CSV Data</p>
                <p className="text-xs text-[var(--text-muted)]">Raw data for spreadsheets</p>
              </div>
            </button>
          </div>

          <div className="p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
            <p className="text-sm text-[var(--text-secondary)]">
              <strong>Report includes:</strong> Revenue breakdown, sport performance, user growth, deal analytics, and compliance summary.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
