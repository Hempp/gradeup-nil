'use client';

import Link from 'next/link';
import { Home, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1', className)}>
      {/* Home icon */}
      <Link
        href="/"
        className="flex items-center justify-center h-6 w-6 text-neutral-500 hover:text-primary-500 transition-colors"
        aria-label="Home"
      >
        <Home className="h-4 w-4" />
      </Link>

      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <div key={index} className="flex items-center gap-1">
            {/* Separator */}
            <ChevronRight className="h-4 w-4 text-neutral-400 flex-shrink-0" />

            {/* Item */}
            {isLast || !item.href ? (
              <span
                className={cn(
                  'text-sm',
                  isLast ? 'text-neutral-900 font-medium' : 'text-neutral-600'
                )}
              >
                {item.label}
              </span>
            ) : (
              <Link
                href={item.href}
                className="text-sm text-neutral-600 hover:text-primary-500 transition-colors"
              >
                {item.label}
              </Link>
            )}
          </div>
        );
      })}
    </nav>
  );
}
