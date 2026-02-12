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

export interface SidebarProps {
  navItems: NavItem[];
  variant?: 'athlete' | 'brand' | 'director';
  className?: string;
  user?: {
    name: string;
    role: string;
    avatar?: string;
  };
}

export function Sidebar({ navItems, variant = 'athlete', className, user }: SidebarProps) {
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

  // Default user for display
  const displayUser = user || {
    name: 'John Doe',
    role: variant === 'athlete' ? 'Athlete' : variant === 'brand' ? 'Brand' : 'Director',
  };

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-screen flex flex-col',
        'bg-primary-900 transition-all duration-300 ease-in-out z-20',
        collapsed ? 'w-20' : 'w-64',
        className
      )}
    >
      {/* Logo */}
      <div className="h-[72px] flex items-center justify-between px-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          <div className="h-6 w-6 flex items-center justify-center">
            <svg
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
            >
              <rect width="32" height="32" rx="6" fill="url(#gradient)" />
              <text
                x="16"
                y="22"
                textAnchor="middle"
                fill="white"
                fontSize="16"
                fontWeight="bold"
                fontFamily="system-ui"
              >
                G
              </text>
              <defs>
                <linearGradient id="gradient" x1="0" y1="0" x2="32" y2="32">
                  <stop stopColor="#00D4FF" />
                  <stop offset="1" stopColor="#7C3AED" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          {!collapsed && (
            <span className="font-bold text-lg text-white tracking-tight">
              GradeUp
            </span>
          )}
        </Link>
        <button
          onClick={toggleCollapsed}
          className={cn(
            'h-8 w-8 flex items-center justify-center rounded-lg',
            'text-white/60 hover:text-white hover:bg-white/5',
            'transition-colors',
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
              <li key={item.href} className="relative">
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 py-2.5 px-3 rounded-lg',
                    'text-sm transition-all duration-200',
                    isActive
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-white/60 hover:text-white hover:bg-white/5',
                    collapsed && 'justify-center px-0'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-white text-primary-900 text-xs font-semibold">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
                {collapsed && item.badge && item.badge > 0 && (
                  <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-white" />
                )}
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User Section */}
      <div className="p-3 border-t border-white/10">
        <div
          className={cn(
            'flex items-center gap-3 py-2.5 px-3 rounded-lg',
            'hover:bg-white/5 transition-colors cursor-pointer',
            collapsed && 'justify-center px-0'
          )}
        >
          {/* Avatar */}
          <div className="relative">
            {displayUser.avatar ? (
              <img
                src={displayUser.avatar}
                alt={displayUser.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm font-medium">
                {displayUser.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {displayUser.name}
                </p>
                <p className="text-xs text-white/60 truncate">
                  {displayUser.role}
                </p>
              </div>
              <Link
                href={`/${variant}/settings`}
                className="h-8 w-8 flex items-center justify-center rounded-lg text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}
