'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Menu,
  X,
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

interface MobileNavProps {
  navItems: NavItem[];
  variant?: 'athlete' | 'brand' | 'director';
  className?: string;
}

export function MobileNav({ navItems, variant = 'athlete', className }: MobileNavProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const variantColors = {
    athlete: 'from-[var(--color-primary)] to-[var(--color-secondary)]',
    brand: 'from-[var(--color-secondary)] to-[var(--color-magenta)]',
    director: 'from-[var(--color-accent)] to-[var(--color-secondary)]',
  };

  return (
    <>
      {/* Top Bar */}
      <header
        className={cn(
          'fixed top-0 left-0 right-0 h-16 flex items-center justify-between px-4',
          'bg-[var(--bg-primary)] border-b border-[var(--border-color)]',
          'z-50',
          className
        )}
      >
        <Link href="/" className="flex items-center gap-3">
          <div
            className={cn(
              'h-9 w-9 rounded-[var(--radius-md)] flex items-center justify-center',
              'bg-gradient-to-br font-bold text-white',
              variantColors[variant]
            )}
          >
            G
          </div>
          <span className="font-bold text-lg text-[var(--text-primary)]">GRADEUP</span>
        </Link>

        <button
          onClick={() => setIsOpen(true)}
          className="h-10 w-10 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
          aria-label="Open menu"
        >
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 animate-fade-in"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal={isOpen}
        aria-label="Mobile navigation menu"
        aria-hidden={!isOpen}
        className={cn(
          'fixed top-0 right-0 h-full w-[280px] bg-[var(--bg-sidebar)]',
          'border-l border-[var(--border-color)] z-50',
          'transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        {/* Drawer Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-[var(--border-color)]">
          <span className="font-semibold text-[var(--text-primary)]">Menu</span>
          <button
            onClick={() => setIsOpen(false)}
            className="h-10 w-10 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]"
            aria-label="Close menu"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Mobile menu" className="flex-1 py-4 px-3 overflow-y-auto">
          <ul className="space-y-1" role="list">
            {navItems.map((item) => {
              const Icon = iconMap[item.icon] || LayoutDashboard;
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 rounded-[var(--radius-md)]',
                      'text-base font-medium transition-all duration-200',
                      isActive
                        ? 'bg-[var(--color-primary-muted)] text-[var(--color-primary)]'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && item.badge > 0 && (
                      <span className="h-5 min-w-5 px-1.5 flex items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--text-inverse)] text-xs font-semibold">
                        {item.badge > 99 ? '99+' : item.badge}
                      </span>
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
              'w-full flex items-center gap-3 px-3 py-3 rounded-[var(--radius-md)]',
              'text-base font-medium text-[var(--text-muted)]',
              'hover:text-[var(--color-error)] hover:bg-[var(--color-error-muted)]',
              'transition-all duration-200'
            )}
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
