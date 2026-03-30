'use client';

import { usePathname } from 'next/navigation';
import { DashboardShell, type BreadcrumbItem } from '@/components/layout';
import { useAuth } from '@/context';
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
  const { profile, roleData } = useAuth();

  const brandData = roleData as { company_name?: string; logo_url?: string } | null;
  const user = {
    name: brandData?.company_name || profile?.first_name
      ? `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim()
      : 'Brand Partner',
    role: 'Brand Partner',
    avatar: brandData?.logo_url || profile?.avatar_url || undefined,
  };

  return (
    <DashboardShell
      navItems={brandNavItems}
      variant="brand"
      breadcrumbs={breadcrumbs}
      user={user}
    >
      <div className="max-w-[var(--container-max)] mx-auto">
        {children}
      </div>
    </DashboardShell>
  );
}
