'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bell, ChevronDown, Menu, Settings, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Breadcrumb, type BreadcrumbItem } from './breadcrumb';

export interface TopbarUser {
  name: string;
  role: string;
  avatar?: string;
}

export interface TopbarProps {
  breadcrumbs?: BreadcrumbItem[];
  user?: TopbarUser;
  notificationCount?: number;
  onMenuClick?: () => void;
  className?: string;
}

export function Topbar({
  breadcrumbs = [],
  user,
  notificationCount = 0,
  onMenuClick,
  className,
}: TopbarProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Default user for display
  const displayUser = user || {
    name: 'John Doe',
    role: 'Athlete',
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    }

    if (isDropdownOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isDropdownOpen]);

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 h-16 z-30',
        'bg-white border-b border-surface-200',
        'flex items-center justify-between px-4 lg:px-6',
        'lg:left-64',
        className
      )}
    >
      {/* Left side: Hamburger (mobile) + Breadcrumbs */}
      <div className="flex items-center gap-4">
        {/* Mobile hamburger menu */}
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            className="lg:hidden h-10 w-10 flex items-center justify-center rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            aria-label="Toggle menu"
          >
            <Menu className="h-6 w-6" />
          </button>
        )}

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <Breadcrumb items={breadcrumbs} className="hidden sm:flex" />
        )}
      </div>

      {/* Right side: Notifications + User dropdown */}
      <div className="flex items-center gap-2">
        {/* Notification bell */}
        <button
          className="relative h-10 w-10 flex items-center justify-center rounded-lg text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
          aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {notificationCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-4 min-w-4 px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-semibold">
              {notificationCount > 99 ? '99+' : notificationCount}
            </span>
          )}
        </button>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className={cn(
              'flex items-center gap-2 py-1.5 px-2 rounded-lg',
              'hover:bg-neutral-100 transition-colors',
              isDropdownOpen && 'bg-neutral-100'
            )}
            aria-expanded={isDropdownOpen}
            aria-haspopup="menu"
            aria-label={`User menu for ${displayUser.name}`}
          >
            {/* Avatar */}
            {displayUser.avatar ? (
              <img
                src={displayUser.avatar}
                alt={displayUser.name}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-medium">
                {displayUser.name.charAt(0).toUpperCase()}
              </div>
            )}

            {/* Chevron */}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-neutral-500 transition-transform duration-200',
                isDropdownOpen && 'rotate-180'
              )}
            />
          </button>

          {/* Dropdown menu */}
          {isDropdownOpen && (
            <div
              className={cn(
                'absolute right-0 top-full mt-2 w-56',
                'bg-white rounded-lg shadow-lg border border-surface-200',
                'py-2 animate-in fade-in-0 zoom-in-95 duration-200'
              )}
              role="menu"
            >
              {/* User info */}
              <div className="px-4 py-3 border-b border-surface-200">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {displayUser.name}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  {displayUser.role}
                </p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/athlete/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors"
                  role="menuitem"
                  onClick={() => setIsDropdownOpen(false)}
                >
                  <Settings className="h-4 w-4" />
                  Settings
                </Link>
              </div>

              {/* Logout */}
              <div className="py-1 border-t border-surface-200">
                <button
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  role="menuitem"
                  onClick={() => {
                    setIsDropdownOpen(false);
                    // Handle logout logic here
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
