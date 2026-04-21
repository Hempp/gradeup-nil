'use client';

import { memo, useState, useCallback } from 'react';
import {
  MoreHorizontal,
  Eye,
  UserX,
  UserCheck,
  Mail,
  Loader2,
} from 'lucide-react';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import type { AdminUser } from '@/lib/services/admin';
import type { UserRole } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// USER TABLE COMPONENT
// Displays users with search, filters, and actions
// ═══════════════════════════════════════════════════════════════════════════

export interface UserTableProps {
  users: AdminUser[];
  loading?: boolean;
  onViewUser?: (user: AdminUser) => void;
  onSuspendUser?: (userId: string, reason: string) => Promise<void>;
  onUnsuspendUser?: (userId: string) => Promise<void>;
}

// Role badge color mapping
const roleBadgeVariant: Record<UserRole, 'primary' | 'success' | 'warning' | 'error' | 'default'> = {
  athlete: 'success',
  brand: 'primary',
  athletic_director: 'warning',
  state_ad: 'default',
  hs_parent: 'default',
  admin: 'error',
};

const roleDisplayName: Record<UserRole, string> = {
  athlete: 'Athlete',
  brand: 'Brand',
  athletic_director: 'Director',
  state_ad: 'State AD',
  hs_parent: 'Parent',
  admin: 'Admin',
};

const UserTable = memo(function UserTable({
  users,
  loading = false,
  onViewUser,
  onSuspendUser,
  onUnsuspendUser,
}: UserTableProps) {
  // Suspension modal state
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Action dropdown state
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Handle suspension
  const handleSuspend = useCallback(async () => {
    if (!selectedUser || !onSuspendUser || !suspendReason.trim()) return;

    setActionLoading(true);
    try {
      await onSuspendUser(selectedUser.id, suspendReason.trim());
      setSuspendModalOpen(false);
      setSelectedUser(null);
      setSuspendReason('');
    } finally {
      setActionLoading(false);
    }
  }, [selectedUser, onSuspendUser, suspendReason]);

  // Handle unsuspend
  const handleUnsuspend = useCallback(async (user: AdminUser) => {
    if (!onUnsuspendUser) return;

    setActionLoading(true);
    try {
      await onUnsuspendUser(user.id);
    } finally {
      setActionLoading(false);
      setOpenDropdown(null);
    }
  }, [onUnsuspendUser]);

  // Open suspend modal
  const openSuspendModal = useCallback((user: AdminUser) => {
    setSelectedUser(user);
    setSuspendModalOpen(true);
    setOpenDropdown(null);
  }, []);

  // Table columns
  const columns: DataTableColumn<AdminUser>[] = [
    {
      key: 'user',
      header: 'User',
      mobilePriority: 1,
      render: (_, row) => {
        const fullName = [row.first_name, row.last_name].filter(Boolean).join(' ');
        return (
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[var(--color-primary-muted)] flex items-center justify-center text-[var(--color-primary)] text-sm font-medium">
              {row.first_name?.[0] || row.email[0].toUpperCase()}
            </div>
            <div>
              <p className="font-medium text-[var(--text-primary)]">
                {fullName || 'Unknown'}
              </p>
              <p className="text-xs text-[var(--text-muted)]">{row.email}</p>
            </div>
          </div>
        );
      },
    },
    {
      key: 'role',
      header: 'Role',
      mobilePriority: 2,
      render: (_, row) => (
        <Badge variant={roleBadgeVariant[row.role]} size="sm">
          {roleDisplayName[row.role]}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      mobilePriority: 3,
      render: (_, row) => {
        if (row.is_suspended) {
          return (
            <Badge variant="error" size="sm">
              Suspended
            </Badge>
          );
        }
        if (!row.is_active) {
          return (
            <Badge variant="default" size="sm">
              Inactive
            </Badge>
          );
        }
        return (
          <Badge variant="success" size="sm">
            Active
          </Badge>
        );
      },
    },
    {
      key: 'last_login_at',
      header: 'Last Login',
      hideOnMobile: true,
      render: (_, row) => (
        <span className="text-sm text-[var(--text-muted)]">
          {row.last_login_at ? formatRelativeTime(row.last_login_at) : 'Never'}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      hideOnMobile: true,
      render: (_, row) => (
        <span className="text-sm text-[var(--text-muted)]">
          {formatDateTime(row.created_at)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: 'w-12',
      render: (_, row) => (
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setOpenDropdown(openDropdown === row.id ? null : row.id);
            }}
            className="h-8 w-8 p-0"
            aria-label="User actions"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>

          {/* Dropdown menu */}
          {openDropdown === row.id && (
            <>
              {/* Backdrop to close dropdown */}
              <div
                className="fixed inset-0 z-10"
                onClick={() => setOpenDropdown(null)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[var(--radius-md)] shadow-lg z-20 overflow-hidden">
                <button
                  className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors"
                  onClick={() => {
                    onViewUser?.(row);
                    setOpenDropdown(null);
                  }}
                >
                  <Eye className="h-4 w-4" />
                  View Details
                </button>
                <button
                  className="w-full px-4 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors"
                  onClick={() => {
                    window.location.href = `mailto:${row.email}`;
                    setOpenDropdown(null);
                  }}
                >
                  <Mail className="h-4 w-4" />
                  Send Email
                </button>
                <div className="border-t border-[var(--border-color)]" />
                {row.is_suspended ? (
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-[var(--color-success)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors"
                    onClick={() => handleUnsuspend(row)}
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserCheck className="h-4 w-4" />
                    )}
                    Unsuspend User
                  </button>
                ) : (
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-[var(--color-error)] hover:bg-[var(--bg-tertiary)] flex items-center gap-2 transition-colors"
                    onClick={() => openSuspendModal(row)}
                  >
                    <UserX className="h-4 w-4" />
                    Suspend User
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <DataTable
        columns={columns as unknown as DataTableColumn<Record<string, unknown>>[]}
        data={users as unknown as Record<string, unknown>[]}
        loading={loading}
        onRowClick={onViewUser as unknown as ((row: Record<string, unknown>) => void) | undefined}
        mobileCardView
        caption="Platform users"
        rowActionDescription="View user details"
        emptyState={
          <div className="text-center py-12">
            <p className="text-[var(--text-muted)]">No users found</p>
          </div>
        }
      />

      {/* Suspend User Modal */}
      <Modal
        isOpen={suspendModalOpen}
        onClose={() => {
          setSuspendModalOpen(false);
          setSelectedUser(null);
          setSuspendReason('');
        }}
        title="Suspend User"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => {
                setSuspendModalOpen(false);
                setSelectedUser(null);
                setSuspendReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSuspend}
              disabled={actionLoading || !suspendReason.trim()}
              className="bg-[var(--color-error)] hover:bg-[var(--color-error)]/90"
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suspending...
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4 mr-2" />
                  Suspend User
                </>
              )}
            </Button>
          </>
        }
      >
        {selectedUser && (
          <div className="space-y-4">
            <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
              <p className="text-sm text-[var(--text-muted)] mb-1">Suspending</p>
              <p className="font-medium text-[var(--text-primary)]">
                {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ') || selectedUser.email}
              </p>
              <p className="text-sm text-[var(--text-muted)]">{selectedUser.email}</p>
            </div>

            <div>
              <label htmlFor="suspend-reason" className="block text-sm font-medium text-[var(--text-primary)] mb-2">
                Reason for Suspension <span className="text-[var(--color-error)]">*</span>
              </label>
              <textarea
                id="suspend-reason"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="Enter the reason for suspending this user..."
                className="w-full px-4 py-3 rounded-[var(--radius-md)] bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] resize-none"
                rows={3}
              />
            </div>

            <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20">
              <p className="text-sm text-[var(--text-secondary)]">
                <strong>Warning:</strong> Suspending this user will immediately revoke their access to the platform. They will be unable to log in until unsuspended.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
});

UserTable.displayName = 'UserTable';

export { UserTable };
