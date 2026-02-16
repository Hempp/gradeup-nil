'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
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
      aria-label="Main navigation"
      className={cn(
        'fixed top-0 left-0 h-screen flex flex-col',
        'bg-black border-r border-white/10 transition-all duration-300 ease-in-out z-20',
        collapsed ? 'w-20' : 'w-64',
        className
      )}
    >
      {/* Logo */}
      <div className="h-[72px] flex items-center justify-between px-4 border-b border-white/10">
        <Link href="/" className="flex items-center gap-3">
          {/* Shield + Arrow Logo */}
          <svg
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-8 w-8"
          >
            <defs>
              <linearGradient id="sidebar-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#00f0ff" />
                <stop offset="100%" stopColor="#adff2f" />
              </linearGradient>
            </defs>
            {/* Shield outline */}
            <path
              d="M16 2L28 6V15C28 22.5 22.5 28.5 16 30C9.5 28.5 4 22.5 4 15V6L16 2Z"
              fill="#0a0a0a"
              stroke="url(#sidebar-grad)"
              strokeWidth="1.5"
            />
            {/* Upward arrow */}
            <path
              d="M16 8L22 15H19V24H13V15H10L16 8Z"
              fill="url(#sidebar-grad)"
            />
          </svg>
          {!collapsed && (
            <span className="font-bold text-lg bg-gradient-to-r from-[#00f0ff] to-[#adff2f] bg-clip-text text-transparent tracking-tight">
              GradeUp
            </span>
          )}
        </Link>
        <button
          onClick={toggleCollapsed}
          className={cn(
            // Touch-friendly sizing (44px minimum)
            'h-11 w-11 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg',
            'text-white/60 hover:text-white hover:bg-white/5 active:bg-white/10',
            'transition-colors touch-manipulation',
            collapsed && 'rotate-180'
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav aria-label="Main menu" className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1" role="list">
          {navItems.map((item) => {
            const Icon = iconMap[item.icon] || LayoutDashboard;
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            return (
              <li key={item.href} className="relative">
                <Link
                  href={item.href}
                  className={cn(
                    // Base layout
                    'flex items-center gap-3 rounded-lg',
                    // Touch-friendly sizing (44px min height)
                    'min-h-[44px] py-2.5 px-3',
                    // Typography
                    'text-sm transition-all duration-200',
                    // Active state
                    isActive
                      ? 'bg-[var(--marketing-cyan)]/10 text-[var(--marketing-cyan)] font-medium border-l-2 border-[var(--marketing-cyan)]'
                      : 'text-white/60 hover:text-white hover:bg-white/5 active:bg-white/10',
                    // Collapsed state
                    collapsed && 'justify-center px-0',
                    // Touch optimization
                    'touch-manipulation'
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1">{item.label}</span>
                      {item.badge && item.badge > 0 && (
                        <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-[var(--marketing-cyan)] text-black text-xs font-semibold">
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
          <div className="relative h-8 w-8">
            {displayUser.avatar ? (
              <Image
                src={displayUser.avatar}
                alt={displayUser.name}
                fill
                sizes="32px"
                className="rounded-full object-cover"
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
