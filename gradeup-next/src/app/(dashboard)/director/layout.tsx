'use client';

import { usePathname } from 'next/navigation';
import { DashboardShell, type BreadcrumbItem } from '@/components/layout';
import { useAuth } from '@/context';
import type { NavItem } from '@/types';

const directorNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/director/dashboard', icon: 'LayoutDashboard' },
  { label: 'Athletes', href: '/director/athletes', icon: 'Users' },
  { label: 'Verifications', href: '/director/verifications', icon: 'BadgeCheck' },
  { label: 'Brands', href: '/director/brands', icon: 'Target' },
  { label: 'Deals', href: '/director/deals', icon: 'FileText' },
  { label: 'Compliance', href: '/director/compliance', icon: 'Shield', badge: 2 },
  { label: 'Analytics', href: '/director/analytics', icon: 'BarChart3' },
  { label: 'Settings', href: '/director/settings', icon: 'Settings' },
];

// Map paths to breadcrumb labels
const pathToBreadcrumb: Record<string, string> = {
  '/director/dashboard': 'Dashboard',
  '/director/athletes': 'Athletes',
  '/director/verifications': 'Verifications',
  '/director/brands': 'Brands',
  '/director/deals': 'Deals',
  '/director/compliance': 'Compliance',
  '/director/analytics': 'Analytics',
  '/director/settings': 'Settings',
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

export default function DirectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);
  const { profile } = useAuth();

  const user = {
    name: profile
      ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Director'
      : 'Loading...',
    role: 'Athletic Director',
    avatar: profile?.avatar_url || undefined,
  };

  return (
    <DashboardShell
      navItems={directorNavItems}
      variant="director"
      breadcrumbs={breadcrumbs}
      user={user}
    >
      <div className="max-w-[var(--container-max)] mx-auto">
        {children}
      </div>
    </DashboardShell>
  );
}
