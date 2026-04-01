'use client';

import { usePathname } from 'next/navigation';
import { DashboardShell, type BreadcrumbItem } from '@/components/layout';
import { LazyOnboardingTourProvider } from '@/components/ui/lazy-components';
import { athleteOnboardingConfig } from '@/components/ui/onboarding-tour';
import { useAuth } from '@/context';
import type { NavItem } from '@/types';

const athleteNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/athlete/dashboard', icon: 'LayoutDashboard' },
  { label: 'Profile', href: '/athlete/profile', icon: 'User' },
  { label: 'Deals', href: '/athlete/deals', icon: 'FileText' },
  { label: 'Earnings', href: '/athlete/earnings', icon: 'DollarSign' },
  { label: 'Messages', href: '/athlete/messages', icon: 'MessageSquare' },
  { label: 'Settings', href: '/athlete/settings', icon: 'Settings' },
];

// Map paths to breadcrumb labels
const pathToBreadcrumb: Record<string, string> = {
  '/athlete/dashboard': 'Dashboard',
  '/athlete/profile': 'Profile',
  '/athlete/deals': 'Deals',
  '/athlete/earnings': 'Earnings',
  '/athlete/messages': 'Messages',
  '/athlete/settings': 'Settings',
};

function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];

  let currentPath = '';
  for (const segment of segments) {
    currentPath += `/${segment}`;
    const label = pathToBreadcrumb[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
    items.push({
      label,
      href: currentPath === pathname ? undefined : currentPath,
    });
  }

  return items;
}

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);
  const { user: authUser, profile } = useAuth();

  // In demo mode (no real auth session), use demo names instead of "Loading..."
  const isDemoMode = typeof document !== 'undefined' && document.cookie.includes('demo_role');
  const user = {
    name: profile
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Athlete'
      : isDemoMode ? 'Marcus Johnson' : 'Loading...',
    role: 'Student Athlete',
    avatar: profile?.avatar_url || undefined,
  };

  return (
    <LazyOnboardingTourProvider config={athleteOnboardingConfig}>
      <DashboardShell
        navItems={athleteNavItems}
        variant="athlete"
        breadcrumbs={breadcrumbs}
        user={user}
      >
        <div className="max-w-[var(--container-max)] mx-auto">
          {children}
        </div>
      </DashboardShell>
    </LazyOnboardingTourProvider>
  );
}
