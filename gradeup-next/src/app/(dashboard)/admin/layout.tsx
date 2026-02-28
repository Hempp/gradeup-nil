'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardShell, type BreadcrumbItem } from '@/components/layout';
import { useRequireAuth } from '@/context';
import { Loader2 } from 'lucide-react';
import type { NavItem } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN LAYOUT - Central Admin Panel
// Requires admin role for access
// ═══════════════════════════════════════════════════════════════════════════

const adminNavItems: NavItem[] = [
  { label: 'Overview', href: '/admin', icon: 'LayoutDashboard' },
  { label: 'Performance', href: '/admin/performance', icon: 'Activity' },
  { label: 'Users', href: '/admin/users', icon: 'Users' },
  { label: 'Deals', href: '/admin/deals', icon: 'Handshake' },
  { label: 'System', href: '/admin/system', icon: 'Server' },
  { label: 'Audit Log', href: '/admin/audit', icon: 'FileText' },
  { label: 'Settings', href: '/admin/settings', icon: 'Settings' },
];

// Map paths to breadcrumb labels
const pathToBreadcrumb: Record<string, string> = {
  '/admin': 'Overview',
  '/admin/performance': 'Performance Monitoring',
  '/admin/users': 'User Management',
  '/admin/deals': 'Deal Monitoring',
  '/admin/system': 'System Health',
  '/admin/audit': 'Audit Log',
  '/admin/settings': 'Settings',
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

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const breadcrumbs = getBreadcrumbs(pathname);

  // Require admin role for access
  const { user, isLoading, isAuthenticated, isAdmin } = useRequireAuth({
    allowedRoles: ['admin'],
    redirectTo: '/login'
  });

  // Check admin access
  useEffect(() => {
    if (!isLoading && isAuthenticated && !isAdmin()) {
      // Redirect non-admin users to their appropriate dashboard
      router.push('/');
    }
  }, [isLoading, isAuthenticated, isAdmin, router]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--color-primary)] mx-auto mb-4" />
          <p className="text-[var(--text-muted)]">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <div className="w-16 h-16 rounded-full bg-[var(--color-error)]/10 flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-[var(--color-error)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">Access Denied</h1>
          <p className="text-[var(--text-muted)] mb-6">
            You do not have permission to access the admin dashboard. This area is restricted to platform administrators only.
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            Return to Home
          </button>
        </div>
      </div>
    );
  }

  // Admin user info for sidebar
  const adminUser = {
    name: user?.email?.split('@')[0] || 'Admin',
    role: 'Platform Administrator',
    avatar: undefined,
  };

  return (
    <DashboardShell
      navItems={adminNavItems}
      variant="director" // Using director variant for similar dark styling
      breadcrumbs={breadcrumbs}
      user={adminUser}
      notificationCount={0}
    >
      <div className="max-w-[var(--container-max)] mx-auto">
        {children}
      </div>
    </DashboardShell>
  );
}
