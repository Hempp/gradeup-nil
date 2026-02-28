'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { ErrorState } from '@/components/ui/error-state';
import { UserTable } from '@/components/admin';
import {
  getUsers,
  getUserById,
  suspendUser,
  unsuspendUser,
  type AdminUser,
  type UserFilters,
} from '@/lib/services/admin';
import { useRequireAuth } from '@/context';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import type { UserRole } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT PAGE
// List, search, and manage platform users
// ═══════════════════════════════════════════════════════════════════════════

const roleOptions: { value: UserRole; label: string }[] = [
  { value: 'athlete', label: 'Athletes' },
  { value: 'brand', label: 'Brands' },
  { value: 'athletic_director', label: 'Directors' },
  { value: 'admin', label: 'Admins' },
];

export default function AdminUsersPage() {
  const _router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useRequireAuth({ allowedRoles: ['admin'] });

  // State
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [selectedRoles, setSelectedRoles] = useState<UserRole[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [showFilters, setShowFilters] = useState(false);

  // User detail modal
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [loadingUser, setLoadingUser] = useState(false);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);

    const filters: UserFilters = {
      page: currentPage,
      page_size: 20,
    };

    if (searchQuery.trim()) {
      filters.search = searchQuery.trim();
    }

    if (selectedRoles.length > 0) {
      filters.role = selectedRoles;
    }

    try {
      const result = await getUsers(filters);

      if (result.error) {
        throw new Error(result.error.message);
      }

      setUsers(result.data?.users || []);
      setTotal(result.data?.total || 0);
      setTotalPages(result.data?.total_pages || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, selectedRoles]);

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Handle search
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  }, [fetchUsers]);

  // Handle role filter toggle
  const toggleRole = useCallback((role: UserRole) => {
    setSelectedRoles((prev) =>
      prev.includes(role)
        ? prev.filter((r) => r !== role)
        : [...prev, role]
    );
    setCurrentPage(1);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedRoles([]);
    setCurrentPage(1);
  }, []);

  // View user details
  const handleViewUser = useCallback(async (viewUser: AdminUser) => {
    setLoadingUser(true);
    setShowUserModal(true);

    try {
      const result = await getUserById(viewUser.id);
      if (result.data) {
        setSelectedUser(result.data);
      } else {
        setSelectedUser(viewUser);
      }
    } catch {
      setSelectedUser(viewUser);
    } finally {
      setLoadingUser(false);
    }
  }, []);

  // Suspend user handler
  const handleSuspendUser = useCallback(async (userId: string, reason: string) => {
    if (!user?.id) return;

    const result = await suspendUser(userId, reason, user.id);
    if (result.error) {
      throw new Error(result.error.message);
    }

    // Refresh the list
    await fetchUsers();
  }, [user?.id, fetchUsers]);

  // Unsuspend user handler
  const handleUnsuspendUser = useCallback(async (userId: string) => {
    if (!user?.id) return;

    const result = await unsuspendUser(userId, user.id);
    if (result.error) {
      throw new Error(result.error.message);
    }

    // Refresh the list
    await fetchUsers();
  }, [user?.id, fetchUsers]);

  // Error state
  if (error && !loading) {
    return (
      <Card className="animate-fade-in">
        <ErrorState
          errorType="data"
          title="Failed to load users"
          description={error}
          onRetry={fetchUsers}
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            User Management
          </h1>
          <p className="text-[var(--text-muted)]">
            {total} users registered on the platform
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Form */}
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-muted)]" />
                <Input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </form>

            {/* Filter Button */}
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="md:w-auto w-full"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filters
              {selectedRoles.length > 0 && (
                <Badge variant="primary" size="sm" className="ml-2">
                  {selectedRoles.length}
                </Badge>
              )}
            </Button>
          </div>

          {/* Filter Panel */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  Filter by Role
                </span>
                {selectedRoles.length > 0 && (
                  <button
                    onClick={clearFilters}
                    className="text-sm text-[var(--color-primary)] hover:underline"
                  >
                    Clear all
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {roleOptions.map((role) => (
                  <button
                    key={role.value}
                    onClick={() => toggleRole(role.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      selectedRoles.includes(role.value)
                        ? 'bg-[var(--color-primary)] text-white'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)]'
                    }`}
                  >
                    {role.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <UserTable
        users={users}
        loading={loading}
        onViewUser={handleViewUser}
        onSuspendUser={handleSuspendUser}
        onUnsuspendUser={handleUnsuspendUser}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-[var(--text-muted)]">
            Showing {(currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, total)} of {total} users
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-[var(--text-primary)]">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || loading}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* User Detail Modal */}
      <Modal
        isOpen={showUserModal}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
        title="User Details"
        size="lg"
      >
        {loadingUser ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-primary)]" />
          </div>
        ) : selectedUser ? (
          <div className="space-y-6">
            {/* User Header */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-full bg-[var(--color-primary-muted)] flex items-center justify-center text-[var(--color-primary)] text-xl font-bold">
                {selectedUser.first_name?.[0] || selectedUser.email[0].toUpperCase()}
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                  {[selectedUser.first_name, selectedUser.last_name].filter(Boolean).join(' ') || 'Unknown User'}
                </h3>
                <p className="text-[var(--text-muted)]">{selectedUser.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge
                    variant={
                      selectedUser.role === 'admin' ? 'error' :
                      selectedUser.role === 'athletic_director' ? 'warning' :
                      selectedUser.role === 'brand' ? 'primary' : 'success'
                    }
                    size="sm"
                  >
                    {selectedUser.role.replace('_', ' ')}
                  </Badge>
                  {selectedUser.is_suspended && (
                    <Badge variant="error" size="sm">Suspended</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Suspension Notice */}
            {selectedUser.is_suspended && selectedUser.suspension_reason && (
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--color-error)]/10 border border-[var(--color-error)]/20">
                <p className="text-sm font-medium text-[var(--color-error)] mb-1">
                  Account Suspended
                </p>
                <p className="text-sm text-[var(--text-secondary)]">
                  {selectedUser.suspension_reason}
                </p>
                {selectedUser.suspended_at && (
                  <p className="text-xs text-[var(--text-muted)] mt-2">
                    Suspended {formatRelativeTime(selectedUser.suspended_at)}
                  </p>
                )}
              </div>
            )}

            {/* User Info Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
                  Account Status
                </p>
                <p className="font-medium text-[var(--text-primary)]">
                  {selectedUser.is_suspended ? 'Suspended' : selectedUser.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
                  Last Login
                </p>
                <p className="font-medium text-[var(--text-primary)]">
                  {selectedUser.last_login_at ? formatRelativeTime(selectedUser.last_login_at) : 'Never'}
                </p>
              </div>
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
                  Joined
                </p>
                <p className="font-medium text-[var(--text-primary)]">
                  {formatDateTime(selectedUser.created_at)}
                </p>
              </div>
              <div className="p-4 rounded-[var(--radius-md)] bg-[var(--bg-tertiary)]">
                <p className="text-xs text-[var(--text-muted)] uppercase tracking-wide mb-1">
                  User ID
                </p>
                <p className="font-mono text-sm text-[var(--text-primary)] truncate">
                  {selectedUser.id}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-[var(--text-muted)] py-8">
            User data not available
          </p>
        )}
      </Modal>
    </div>
  );
}
