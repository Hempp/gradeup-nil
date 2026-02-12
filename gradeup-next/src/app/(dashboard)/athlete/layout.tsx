'use client';

import { usePathname } from 'next/navigation';
import { DashboardShell, type BreadcrumbItem } from '@/components/layout';
import type { NavItem } from '@/types';

const athleteNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/athlete/dashboard', icon: 'LayoutDashboard' },
  { label: 'Profile', href: '/athlete/profile', icon: 'User' },
  { label: 'Deals', href: '/athlete/deals', icon: 'FileText', badge: 3 },
  { label: 'Earnings', href: '/athlete/earnings', icon: 'DollarSign' },
  { label: 'Messages', href: '/athlete/messages', icon: 'MessageSquare', badge: 5 },
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

  // Mock user data - in production, this would come from auth context
  const user = {
    name: 'Marcus Johnson',
    role: 'Student Athlete',
    avatar: undefined,
  };

  return (
    <DashboardShell
      navItems={athleteNavItems}
      variant="athlete"
      breadcrumbs={breadcrumbs}
      user={user}
      notificationCount={3}
    >
      <div className="max-w-[var(--container-max)] mx-auto">
        {children}
      </div>
    </DashboardShell>
  );
}
