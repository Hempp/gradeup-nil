import { Suspense } from 'react';
import {
  Users,
  Building,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/status-badge';
import { Avatar } from '@/components/ui/avatar';
import { SkeletonStats, SkeletonCard } from '@/components/ui/skeleton';
import { formatCurrency, formatCompactNumber, formatRelativeTime } from '@/lib/utils';

// Mock data
const mockStats = {
  totalAthletes: 247,
  verifiedAthletes: 198,
  activeBrands: 45,
  totalDeals: 156,
  totalRevenue: 892500,
  complianceIssues: 3,
};

const mockRecentActivity = [
  {
    id: '1',
    type: 'deal_completed',
    athlete: 'Marcus Johnson',
    brand: 'Nike',
    amount: 5000,
    createdAt: '2024-02-11T10:30:00Z',
  },
  {
    id: '2',
    type: 'athlete_verified',
    athlete: 'Sarah Williams',
    createdAt: '2024-02-11T09:15:00Z',
  },
  {
    id: '3',
    type: 'compliance_flag',
    athlete: 'Jordan Davis',
    reason: 'Contract review required',
    createdAt: '2024-02-10T16:45:00Z',
  },
  {
    id: '4',
    type: 'brand_joined',
    brand: 'Gatorade',
    createdAt: '2024-02-10T14:00:00Z',
  },
];

const mockTopAthletes = [
  { name: 'Marcus Johnson', sport: 'Basketball', earnings: 45250, deals: 8 },
  { name: 'Sarah Williams', sport: 'Soccer', earnings: 38900, deals: 6 },
  { name: 'Jordan Davis', sport: 'Football', earnings: 52100, deals: 7 },
];

function StatsCard({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = 'primary',
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down';
  trendValue?: string;
  color?: 'primary' | 'secondary' | 'success' | 'warning';
}) {
  const colors = {
    primary: 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]',
    secondary: 'bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]',
    success: 'bg-[var(--color-success-muted)] text-[var(--color-success)]',
    warning: 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]',
  };

  return (
    <Card hover>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-[var(--text-muted)] mb-1">{title}</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{value}</p>
            {trend && trendValue && (
              <div className="flex items-center gap-1 mt-2 text-[var(--color-success)]">
                <ArrowUpRight className="h-4 w-4" />
                <span className="text-sm">{trendValue}</span>
              </div>
            )}
          </div>
          <div className={`h-12 w-12 rounded-[var(--radius-lg)] flex items-center justify-center ${colors[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentActivityCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockRecentActivity.map((activity) => (
            <div
              key={activity.id}
              className="flex items-start gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]"
            >
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center ${
                  activity.type === 'deal_completed'
                    ? 'bg-[var(--color-success-muted)] text-[var(--color-success)]'
                    : activity.type === 'compliance_flag'
                    ? 'bg-[var(--color-warning-muted)] text-[var(--color-warning)]'
                    : activity.type === 'athlete_verified'
                    ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
                    : 'bg-[var(--color-secondary)]/10 text-[var(--color-secondary)]'
                }`}
              >
                {activity.type === 'deal_completed' && <DollarSign className="h-4 w-4" />}
                {activity.type === 'compliance_flag' && <AlertTriangle className="h-4 w-4" />}
                {activity.type === 'athlete_verified' && <CheckCircle className="h-4 w-4" />}
                {activity.type === 'brand_joined' && <Building className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                {activity.type === 'deal_completed' && (
                  <p className="text-sm text-[var(--text-primary)]">
                    <span className="font-medium">{activity.athlete}</span> completed a{' '}
                    <span className="text-[var(--color-success)]">
                      {formatCurrency(activity.amount!)}
                    </span>{' '}
                    deal with <span className="font-medium">{activity.brand}</span>
                  </p>
                )}
                {activity.type === 'athlete_verified' && (
                  <p className="text-sm text-[var(--text-primary)]">
                    <span className="font-medium">{activity.athlete}</span> was verified
                  </p>
                )}
                {activity.type === 'compliance_flag' && (
                  <p className="text-sm text-[var(--text-primary)]">
                    <span className="font-medium">{activity.athlete}</span>:{' '}
                    <span className="text-[var(--color-warning)]">{activity.reason}</span>
                  </p>
                )}
                {activity.type === 'brand_joined' && (
                  <p className="text-sm text-[var(--text-primary)]">
                    <span className="font-medium">{activity.brand}</span> joined the platform
                  </p>
                )}
                <p className="text-xs text-[var(--text-muted)] mt-1">
                  {formatRelativeTime(activity.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TopAthletesCard() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Top Earning Athletes</CardTitle>
          <a
            href="/director/athletes"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            View all
          </a>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {mockTopAthletes.map((athlete, index) => (
            <div
              key={athlete.name}
              className="flex items-center gap-4 p-3 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]"
            >
              <span className="text-lg font-bold text-[var(--color-accent)]">
                #{index + 1}
              </span>
              <Avatar fallback={athlete.name.charAt(0)} size="md" />
              <div className="flex-1">
                <p className="font-medium text-[var(--text-primary)]">{athlete.name}</p>
                <p className="text-sm text-[var(--text-muted)]">{athlete.sport}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-[var(--color-success)]">
                  {formatCurrency(athlete.earnings)}
                </p>
                <p className="text-xs text-[var(--text-muted)]">{athlete.deals} deals</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ComplianceAlertCard() {
  return (
    <Card className="border-[var(--color-warning)]/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[var(--color-warning)]" />
            <CardTitle>Compliance Alerts</CardTitle>
          </div>
          <Badge variant="warning">{mockStats.complianceIssues} Issues</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-warning-muted)]">
            <div>
              <p className="font-medium text-[var(--text-primary)]">Jordan Davis</p>
              <p className="text-sm text-[var(--text-muted)]">Contract terms under review</p>
            </div>
            <a
              href="/director/compliance"
              className="text-sm text-[var(--color-warning)] hover:underline"
            >
              Review
            </a>
          </div>
          <div className="flex items-center justify-between p-3 rounded-[var(--radius-md)] bg-[var(--color-warning-muted)]">
            <div>
              <p className="font-medium text-[var(--text-primary)]">Emma Chen</p>
              <p className="text-sm text-[var(--text-muted)]">Missing documentation</p>
            </div>
            <a
              href="/director/compliance"
              className="text-sm text-[var(--color-warning)] hover:underline"
            >
              Review
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DirectorDashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            Program Overview
          </h1>
          <p className="text-[var(--text-muted)]">
            Duke University Athletics NIL Program
          </p>
        </div>
        <Badge variant="primary">Athletic Director</Badge>
      </div>

      {/* Stats Grid */}
      <Suspense fallback={<SkeletonStats />}>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatsCard
            title="Total Athletes"
            value={mockStats.totalAthletes.toString()}
            icon={Users}
            color="primary"
          />
          <StatsCard
            title="Verified"
            value={mockStats.verifiedAthletes.toString()}
            icon={CheckCircle}
            color="success"
          />
          <StatsCard
            title="Active Brands"
            value={mockStats.activeBrands.toString()}
            icon={Building}
            color="secondary"
          />
          <StatsCard
            title="Total Deals"
            value={mockStats.totalDeals.toString()}
            icon={TrendingUp}
            trend="up"
            trendValue="+12"
            color="primary"
          />
          <StatsCard
            title="Total Revenue"
            value={formatCurrency(mockStats.totalRevenue)}
            icon={DollarSign}
            trend="up"
            trendValue="+18%"
            color="success"
          />
          <StatsCard
            title="Compliance"
            value={mockStats.complianceIssues.toString()}
            icon={AlertTriangle}
            color="warning"
          />
        </div>
      </Suspense>

      {/* Main Content */}
      <div className="grid lg:grid-cols-2 gap-6">
        <Suspense fallback={<SkeletonCard />}>
          <RecentActivityCard />
        </Suspense>
        <div className="space-y-6">
          <TopAthletesCard />
          <ComplianceAlertCard />
        </div>
      </div>
    </div>
  );
}
