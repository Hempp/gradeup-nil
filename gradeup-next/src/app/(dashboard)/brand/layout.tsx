'use client';

import { usePathname } from 'next/navigation';
import { DashboardShell, type BreadcrumbItem } from '@/components/layout';
import type { NavItem } from '@/types';

const brandNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/brand/dashboard', icon: 'LayoutDashboard' },
  { label: 'Discover', href: '/brand/discover', icon: 'Search' },
  { label: 'Campaigns', href: '/brand/campaigns', icon: 'Target', badge: 2 },
  { label: 'Deals', href: '/brand/deals', icon: 'FileText' },
  { label: 'Analytics', href: '/brand/analytics', icon: 'BarChart3' },
  { label: 'Messages', href: '/brand/messages', icon: 'MessageSquare', badge: 3 },
  { label: 'Settings', href: '/brand/settings', icon: 'Settings' },
];

// Map paths to breadcrumb labels
const pathToBreadcrumb: Record<string, string> = {
  '/brand/dashboard': 'Dashboard',
  '/brand/discover': 'Discover Athletes',
  '/brand/campaigns': 'Campaigns',
  '/brand/deals': 'Deals',
  '/brand/analytics': 'Analytics',
  '/brand/messages': 'Messages',
  '/brand/settings': 'Settings',
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

export default function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const breadcrumbs = getBreadcrumbs(pathname);

  // Mock user data - in production, this would come from auth context
  const user = {
    name: 'Nike Marketing',
    role: 'Brand Partner',
    avatar: undefined,
  };

  return (
    <DashboardShell
      navItems={brandNavItems}
      variant="brand"
      breadcrumbs={breadcrumbs}
      user={user}
      notificationCount={5}
    >
      <div className="max-w-[var(--container-max)] mx-auto">
        {children}
      </div>
    </DashboardShell>
  );
}
