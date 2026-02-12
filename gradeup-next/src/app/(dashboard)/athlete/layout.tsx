'use client';

import { Sidebar } from '@/components/layout/sidebar';
import { MobileNav } from '@/components/layout/mobile-nav';
import type { NavItem } from '@/types';

const athleteNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/athlete/dashboard', icon: 'LayoutDashboard' },
  { label: 'Profile', href: '/athlete/profile', icon: 'User' },
  { label: 'Deals', href: '/athlete/deals', icon: 'FileText', badge: 3 },
  { label: 'Earnings', href: '/athlete/earnings', icon: 'DollarSign' },
  { label: 'Messages', href: '/athlete/messages', icon: 'MessageSquare', badge: 5 },
  { label: 'Settings', href: '/athlete/settings', icon: 'Settings' },
];

export default function AthleteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <Sidebar
        navItems={athleteNavItems}
        variant="athlete"
        className="hidden lg:flex"
      />

      {/* Mobile Navigation */}
      <MobileNav
        navItems={athleteNavItems}
        variant="athlete"
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
