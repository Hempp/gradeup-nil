'use client';

import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import {
  LucideIcon,
  Inbox,
  MessageSquare,
  DollarSign,
  Users,
  Megaphone,
  Search,
  Bell,
  FileX,
  Briefcase,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
   EMPTY STATE TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/* ═══════════════════════════════════════════════════════════════════════════
   BASE EMPTY STATE COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  ({ className, icon: Icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        className={cn(
          'flex flex-col items-center justify-center py-12 px-4 sm:py-16',
          className
        )}
        {...props}
      >
        {/* Icon - decorative, hidden from screen readers */}
        {Icon && (
          <div className="mb-4 rounded-full bg-[var(--bg-card)] p-4" aria-hidden="true">
            <Icon
              className="h-10 w-10 sm:h-12 sm:w-12 text-[var(--text-muted)]"
              strokeWidth={1.5}
            />
          </div>
        )}

        {/* Title */}
        <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2 text-center">
          {title}
        </h3>

        {/* Description with guidance on what to do */}
        {description && (
          <p className="text-sm text-[var(--text-secondary)] max-w-sm text-center mb-6">
            {description}
          </p>
        )}

        {/* Action button */}
        {action && (
          <Button variant="primary" onClick={action.onClick}>
            {action.label}
          </Button>
        )}
      </div>
    );
  }
);

EmptyState.displayName = 'EmptyState';

/* ═══════════════════════════════════════════════════════════════════════════
   PRE-BUILT EMPTY STATES FOR COMMON SCENARIOS
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * Empty state for when there are no deals
 */
export function NoDeals({ onExplore }: { onExplore?: () => void }) {
  return (
    <EmptyState
      icon={Briefcase}
      title="No deals yet"
      description="Explore opportunities and start building your NIL portfolio. Great deals are waiting for you!"
      action={
        onExplore
          ? {
              label: 'Explore Opportunities',
              onClick: onExplore,
            }
          : undefined
      }
    />
  );
}

/**
 * Empty state for when there are no messages
 */
export function NoMessages({
  onStartConversation,
}: {
  onStartConversation?: () => void;
}) {
  return (
    <EmptyState
      icon={MessageSquare}
      title="No messages"
      description="Your inbox is empty. Start a conversation with brands or athletes to get the ball rolling."
      action={
        onStartConversation
          ? {
              label: 'Start a Conversation',
              onClick: onStartConversation,
            }
          : undefined
      }
    />
  );
}

/**
 * Empty state for when there are no earnings
 */
export function NoEarnings() {
  return (
    <EmptyState
      icon={DollarSign}
      title="No earnings yet"
      description="Complete deals to start earning. Your earnings history and analytics will appear here."
    />
  );
}

/**
 * Empty state for when there are no athletes (for brands/directors)
 */
export function NoAthletes({ onInvite }: { onInvite?: () => void }) {
  return (
    <EmptyState
      icon={Users}
      title="No athletes found"
      description="Invite athletes to join your roster or adjust your search filters to find the perfect match."
      action={
        onInvite
          ? {
              label: 'Invite Athletes',
              onClick: onInvite,
            }
          : undefined
      }
    />
  );
}

/**
 * Empty state for when there are no campaigns
 */
export function NoCampaigns({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      icon={Megaphone}
      title="No campaigns yet"
      description="Create your first campaign to start connecting with talented student-athletes."
      action={
        onCreate
          ? {
              label: 'Create Campaign',
              onClick: onCreate,
            }
          : undefined
      }
    />
  );
}

/**
 * Empty state for when there are no opportunities
 */
export function NoOpportunities() {
  return (
    <EmptyState
      icon={Inbox}
      title="No opportunities available"
      description="Check back later for new opportunities. We're constantly adding new brands and campaigns."
    />
  );
}

/**
 * Empty state for search results with no matches
 */
export function NoResults({ query }: { query?: string }) {
  return (
    <EmptyState
      icon={Search}
      title="No results found"
      description={
        query
          ? `We couldn't find anything matching "${query}". Try adjusting your search terms or filters.`
          : "We couldn't find any results. Try adjusting your search terms or filters."
      }
    />
  );
}

/**
 * Empty state for when there are no notifications
 */
export function NoNotifications() {
  return (
    <EmptyState
      icon={Bell}
      title="No notifications"
      description="You're all caught up! New notifications about deals, messages, and updates will appear here."
    />
  );
}

/**
 * Generic empty state for when content fails to load
 */
export function NoContent({ title = 'Nothing here', description }: { title?: string; description?: string }) {
  return (
    <EmptyState
      icon={FileX}
      title={title}
      description={description || 'This section is empty. Content will appear here when available.'}
    />
  );
}

export { EmptyState };
