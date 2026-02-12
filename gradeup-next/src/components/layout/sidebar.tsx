'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  User,
  FileText,
  DollarSign,
  MessageSquare,
  Settings,
  Search,
  BarChart3,
  Users,
  Target,
  Shield,
  ChevronLeft,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard,
  User,
  FileText,
  DollarSign,
  MessageSquare,
  Settings,
  Search,
  BarChart3,
  Users,
  Target,
  Shield,
};

interface SidebarProps {
  navItems: NavItem[];
  variant?: 'athlete' | 'brand' | 'director';
  className?: string;
}

export function Sidebar({ navItems, variant = 'athlete', className }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') setCollapsed(true);
  }, []);

  const toggleCollapsed = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  };

  const variantColors = {
    athlete: 'from-[var(--color-primary)] to-[var(--color-secondary)]',
    brand: 'from-[var(--color-secondary)] to-[var(--color-magenta)]',
    director: 'from-[var(--color-accent)] to-[var(--color-secondary)]',
  };

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-screen flex flex-col',
        'bg-[var(--bg-sidebar)] border-r border-[var(--border-color)]',
        'transition-all duration-300 ease-in-out z-40',
        collapsed ? 'w-20' : 'w-[280px]',
        className
      )}
    >
      {/* Logo */}
      <div className="h-[72px] flex items-center justify-between px-4 border-b border-[var(--border-color)]">
        <Link href="/" className="flex items-center gap-3">
          <div
            className={cn(
              'h-10 w-10 rounded-[var(--radius-md)] flex items-center justify-center',
              'bg-gradient-to-br font-bold text-lg text-white',
              variantColors[variant]
            )}
          >
            G
          </div>
          {!collapsed && (
            <span className="font-bold text-lg text-[var(--text-primary)] tracking-tight">
              GRADEUP
            </span>
          )}
        </Link>
        <button
          onClick={toggleCollapsed}
          className={cn(
            'h-8 w-8 flex items-center justify-center rounded-[var(--radius-sm)]',
            'text-[var(--text-muted)] hover:text-[var(--text-primary)]',
            'hover:bg-[var(--bg-tertiary)] transition-colors',
            collapsed && 'rotate-180'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)]',
                    'text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]',
                    collapsed && 'justify-center px-0'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--text-inverse)] text-xs font-semibold">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </>
                  )}
                  {collapsed && item.badge && item.badge > 0 && (
                    <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-[var(--color-primary)]" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-[var(--border-color)]">
        <button
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)]',
            'text-sm font-medium text-[var(--text-muted)]',
            'hover:text-[var(--color-error)] hover:bg-[var(--color-error-muted)]',
            'transition-all duration-200',
            collapsed && 'justify-center px-0'
          )}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
