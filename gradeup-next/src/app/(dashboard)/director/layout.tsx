'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import type { NavItem } from '@/types';

const directorNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/director/dashboard', icon: 'LayoutDashboard' },
  { label: 'Athletes', href: '/director/athletes', icon: 'Users' },
  { label: 'Brands', href: '/director/brands', icon: 'Building' },
  { label: 'Deals', href: '/director/deals', icon: 'FileText' },
  { label: 'Compliance', href: '/director/compliance', icon: 'Shield', badge: 2 },
  { label: 'Analytics', href: '/director/analytics', icon: 'BarChart3' },
  { label: 'Settings', href: '/director/settings', icon: 'Settings' },
];

export default function DirectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <Sidebar
        navItems={directorNavItems}
        variant="director"
        className="hidden lg:flex"
      />

      {/* Mobile Navigation */}
      <MobileNav
        navItems={directorNavItems}
        variant="director"
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
