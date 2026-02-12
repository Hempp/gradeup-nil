'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
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

export default function BrandLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <Sidebar
        navItems={brandNavItems}
        variant="brand"
        className="hidden lg:flex"
      />

      {/* Mobile Navigation */}
      <MobileNav
        navItems={brandNavItems}
        variant="brand"
        className="lg:hidden"
      />

      {/* Main Content */}
      <main className="flex-1 lg:ml-[280px] pt-16 lg:pt-0">
        <div className="p-6 lg:p-8 max-w-[var(--container-max)] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
