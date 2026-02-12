import { Suspense } from 'react';
import {
  DollarSign,
  FileText,
  Eye,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { SkeletonStats, SkeletonCard } from '@/components/ui/skeleton';
import { formatCurrency, formatCompactNumber, formatRelativeTime } from '@/lib/utils';

// Mock data - will be replaced with real data from Supabase
const mockStats = {
  totalEarnings: 45250,
  pendingEarnings: 12500,
  activeDeals: 4,
  profileViews: 1847,
  nilValuation: 125000,
  gradeUpScore: 92,
};

const mockRecentDeals = [
  {
    id: '1',
    title: 'Instagram Post Campaign',
    brand: { name: 'Nike', logo: null },
    amount: 5000,
    status: 'active' as const,
    createdAt: '2024-02-10T10:00:00Z',
  },
  {
    id: '2',
    title: 'Appearance at Store Opening',
    brand: { name: 'Foot Locker', logo: null },
    amount: 2500,
    status: 'pending' as const,
    createdAt: '2024-02-09T14:30:00Z',
  },
  {
    id: '3',
    title: 'Social Media Endorsement',
    brand: { name: 'Gatorade', logo: null },
    amount: 7500,
    status: 'negotiating' as const,
    createdAt: '2024-02-08T09:00:00Z',
  },
];

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down';
  trendValue?: string;
}) {
  return (
    <Card hover>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[var(--text-muted)] mb-1">{title}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-2">
                {trend === 'up' ? (
                  <ArrowUpRight className="h-4 w-4 text-[var(--color-success)]" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-[var(--color-error)]" />
                )}
                <span
                  className={`text-sm ${
                    trend === 'up' ? 'text-[var(--color-success)]' : 'text-[var(--color-error)]'
                  }`}
                >
                  {trendValue}
                </span>
              </div>
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

function GradeUpScoreCard({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card variant="glow">
      <CardContent className="pt-6">
        <div className="flex items-center gap-6">
          <div className="relative">
            <svg className="w-28 h-28 -rotate-90">
              <circle
                cx="56"
                cy="56"
                r="45"
                stroke="var(--border-color)"
                strokeWidth="8"
                fill="none"
              />
              <circle
                cx="56"
                cy="56"
                r="45"
                stroke="var(--color-primary)"
                strokeWidth="8"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-3xl font-bold text-[var(--color-primary)]">{score}</span>
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-1">
              GradeUp Score
            </h3>
            <p className="text-sm text-[var(--text-muted)] mb-3">
              Your overall NIL performance rating
            </p>
            <Badge variant="success">Top 5%</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentDealsCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Deals</CardTitle>
          <a
            href="/athlete/deals"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            View all
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockRecentDeals.map((deal) => (
            <div
              key={deal.id}
              className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              <Avatar fallback={deal.brand.name.charAt(0)} size="md" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                  {deal.title}
                </p>
                <p className="text-xs text-[var(--text-muted)]">
                  {deal.brand.name} • {formatRelativeTime(deal.createdAt)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-[var(--text-primary)]">
                  {formatCurrency(deal.amount)}
                </p>
                <StatusBadge status={deal.status} size="sm" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionsCard() {
  const actions = [
    { label: 'Update Profile', href: '/athlete/profile', icon: '👤' },
    { label: 'View Offers', href: '/athlete/deals', icon: '📄' },
    { label: 'Check Messages', href: '/athlete/messages', icon: '💬' },
    { label: 'See Earnings', href: '/athlete/earnings', icon: '💰' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action) => (
            <a
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)] hover:bg-[var(--bg-card-hover)] transition-colors"
            >
              <span className="text-2xl">{action.icon}</span>
              <span className="text-sm font-medium text-[var(--text-primary)]">
                {action.label}
              </span>
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function AthleteDashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Welcome back, Marcus! 👋
          </h1>
          <p className="text-[var(--text-muted)]">
            Here's what's happening with your NIL deals
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="success">Verified Athlete</Badge>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--gpa-gold)]/10 border border-[var(--gpa-gold)]">
            <span className="text-sm font-semibold text-[var(--gpa-gold)]">
              GPA: 3.87
            </span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <Suspense fallback={<SkeletonStats />}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total Earnings"
            value={formatCurrency(mockStats.totalEarnings)}
            icon={DollarSign}
            trend="up"
            trendValue="+12.5%"
          />
          <StatsCard
            title="Active Deals"
            value={mockStats.activeDeals.toString()}
            icon={FileText}
            trend="up"
            trendValue="+2"
          />
          <StatsCard
            title="Profile Views"
            value={formatCompactNumber(mockStats.profileViews)}
            icon={Eye}
            trend="up"
            trendValue="+18%"
          />
          <StatsCard
            title="NIL Valuation"
            value={formatCurrency(mockStats.nilValuation)}
            icon={TrendingUp}
            trend="up"
            trendValue="+8.3%"
          />
        </div>
      </Suspense>

      {/* GradeUp Score + Recent Deals */}
      <div className="grid lg:grid-cols-2 gap-6">
        <GradeUpScoreCard score={mockStats.gradeUpScore} />
        <QuickActionsCard />
      </div>

      {/* Recent Deals */}
      <Suspense fallback={<SkeletonCard />}>
        <RecentDealsCard />
      </Suspense>
    </div>
  );
}
