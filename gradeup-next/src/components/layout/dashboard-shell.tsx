'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Sidebar, type SidebarProps } from './sidebar';
import { Topbar, type TopbarUser } from './topbar';
import { type BreadcrumbItem } from './breadcrumb';
import type { NavItem } from '@/types';

// Mobile sidebar overlay component
interface MobileSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  navItems: NavItem[];
  variant: 'athlete' | 'brand' | 'director';
  user?: SidebarProps['user'];
}

function MobileSidebar({ isOpen, onClose, navItems, variant, user }: MobileSidebarProps) {
  const pathname = usePathname();

  // Close on route change
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden animate-in fade-in-0 duration-200"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full w-64 z-40 lg:hidden',
          'transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <Sidebar navItems={navItems} variant={variant} user={user} className="relative" />
      </aside>
    </>
  );
}

export interface DashboardShellProps {
  children: React.ReactNode;
  navItems: NavItem[];
  variant?: 'athlete' | 'brand' | 'director';
  breadcrumbs?: BreadcrumbItem[];
  user?: TopbarUser;
  notificationCount?: number;
  className?: string;
}

export function DashboardShell({
  children,
  navItems,
  variant = 'athlete',
  breadcrumbs = [],
  user,
  notificationCount = 0,
  className,
}: DashboardShellProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  return (
    <div className="dashboard-dark min-h-screen">
      {/* Skip Link for Accessibility - WCAG 2.4.1 */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:bg-[var(--marketing-cyan)] focus:text-black focus:px-4 focus:py-2 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--marketing-cyan)]"
      >
        Skip to main content
      </a>

      {/* Desktop Sidebar - fixed left, full height, z-20 */}
      <Sidebar
        navItems={navItems}
        variant={variant}
        user={user}
        className="hidden lg:flex"
      />

      {/* Mobile Sidebar */}
      <MobileSidebar
        isOpen={isMobileSidebarOpen}
        onClose={() => setIsMobileSidebarOpen(false)}
        navItems={navItems}
        variant={variant}
        user={user}
      />

      {/* Topbar - fixed top, full width, z-30 */}
      <Topbar
        breadcrumbs={breadcrumbs}
        user={user}
        notificationCount={notificationCount}
        onMenuClick={() => setIsMobileSidebarOpen(true)}
      />

      {/* Main Content Area */}
      {/* ml-64 on desktop (sidebar width), mt-16 always (topbar height), p-6 padding */}
      <main
        id="main-content"
        tabIndex={-1}
        className={cn(
          'lg:ml-64 mt-16 p-6',
          'min-h-[calc(100vh-4rem)]',
          'focus:outline-none',
          className
        )}
      >
        {children}
      </main>
    </div>
  );
}
