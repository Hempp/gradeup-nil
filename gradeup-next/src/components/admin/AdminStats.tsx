'use client';

import { memo } from 'react';
import {
  Users,
  DollarSign,
  Handshake,
  TrendingUp,
  UserCheck,
  Building2,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { formatCurrency } from '@/lib/utils';
import type { PlatformStats } from '@/lib/services/admin';

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN STATS COMPONENT
// Displays platform-wide metrics in a grid of stat cards
// ═══════════════════════════════════════════════════════════════════════════

export interface AdminStatsProps {
  stats: PlatformStats | null;
  loading?: boolean;
}

const AdminStats = memo(function AdminStats({ stats, loading = false }: AdminStatsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, index) => (
          <div
            key={index}
            className="bg-[var(--bg-card)] rounded-[var(--radius-xl)] p-6 border border-[var(--border-color)] animate-pulse"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="h-10 w-10 rounded-[var(--radius-lg)] bg-[var(--bg-tertiary)]" />
            </div>
            <div className="h-8 bg-[var(--bg-tertiary)] rounded mb-2 w-24" />
            <div className="h-4 bg-[var(--bg-tertiary)] rounded w-20" />
          </div>
        ))}
      </div>
    );
  }

  const statsData = [
    {
      title: 'Total Users',
      value: stats?.totalUsers?.toLocaleString() || '0',
      icon: <Users className="h-5 w-5" />,
      description: 'All registered accounts',
    },
    {
      title: 'Active Users',
      value: stats?.activeUsers?.toLocaleString() || '0',
      icon: <UserCheck className="h-5 w-5" />,
      description: 'Active in last 30 days',
    },
    {
      title: 'Athletes',
      value: stats?.totalAthletes?.toLocaleString() || '0',
      icon: <GraduationCap className="h-5 w-5" />,
      description: 'Registered athletes',
    },
    {
      title: 'Brands',
      value: stats?.totalBrands?.toLocaleString() || '0',
      icon: <Building2 className="h-5 w-5" />,
      description: 'Partner brands',
    },
    {
      title: 'Total Deals',
      value: stats?.totalDeals?.toLocaleString() || '0',
      icon: <Handshake className="h-5 w-5" />,
      description: 'All-time deals',
    },
    {
      title: 'Active Deals',
      value: stats?.activeDeals?.toLocaleString() || '0',
      icon: <TrendingUp className="h-5 w-5" />,
      description: 'Currently in progress',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(stats?.totalRevenue || 0),
      icon: <DollarSign className="h-5 w-5" />,
      description: 'Completed deal value',
      premium: true,
    },
    {
      title: 'Pending Revenue',
      value: formatCurrency(stats?.pendingRevenue || 0),
      icon: <ShieldCheck className="h-5 w-5" />,
      description: 'Active deal value',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {statsData.map((stat, index) => (
        <StatCard
          key={index}
          title={stat.title}
          value={stat.value}
          icon={stat.icon}
          subtitle={
            <span className="text-xs text-[var(--text-muted)]">
              {stat.description}
            </span>
          }
          premium={stat.premium}
        />
      ))}
    </div>
  );
});

AdminStats.displayName = 'AdminStats';

export { AdminStats };
