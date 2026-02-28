import { createClient } from '@/lib/supabase/client';
import type { DealStatus, UserRole } from '@/types';

// ═══════════════════════════════════════════════════════════════════════════
// ADMIN SERVICE - Platform Administration Functions
// ═══════════════════════════════════════════════════════════════════════════

// Service result type for consistent error handling
export interface ServiceResult<T = null> {
  data: T | null;
  error: { message: string; code?: string } | null;
}

// ─── Platform Statistics ───
export interface PlatformStats {
  totalUsers: number;
  totalAthletes: number;
  totalBrands: number;
  totalDirectors: number;
  activeUsers: number;
  totalDeals: number;
  activeDeals: number;
  completedDeals: number;
  totalRevenue: number;
  pendingRevenue: number;
}

// ─── User Management Types ───
export interface AdminUser {
  id: string;
  email: string;
  role: UserRole;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_suspended: boolean;
  suspension_reason: string | null;
  suspended_at: string | null;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserFilters {
  role?: UserRole[];
  status?: ('active' | 'suspended' | 'inactive')[];
  search?: string;
  page?: number;
  page_size?: number;
}

// ─── Deal Monitoring Types ───
export interface AdminDeal {
  id: string;
  title: string;
  status: DealStatus;
  deal_type: string;
  compensation_amount: number;
  is_flagged: boolean;
  flag_reason: string | null;
  flagged_at: string | null;
  created_at: string;
  updated_at: string;
  athlete?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  brand?: {
    id: string;
    company_name: string;
  };
}

export interface DealFilters {
  status?: DealStatus[];
  is_flagged?: boolean;
  search?: string;
  page?: number;
  page_size?: number;
}

// ─── Audit Log Types ───
export interface AuditLogEntry {
  id: string;
  admin_id: string;
  admin_email: string;
  action: string;
  entity_type: 'user' | 'deal' | 'system';
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  action?: string[];
  entity_type?: ('user' | 'deal' | 'system')[];
  admin_id?: string;
  start_date?: string;
  end_date?: string;
  page?: number;
  page_size?: number;
}

// ─── System Health Types ───
export interface SystemHealth {
  api_status: 'healthy' | 'degraded' | 'down';
  database_status: 'healthy' | 'degraded' | 'down';
  storage_status: 'healthy' | 'degraded' | 'down';
  last_checked: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// PLATFORM STATISTICS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get platform-wide statistics for admin dashboard
 */
export async function getPlatformStats(): Promise<ServiceResult<PlatformStats>> {
  const supabase = createClient();

  try {
    // Get user counts by role
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      return { data: null, error: { message: usersError.message, code: usersError.code } };
    }

    const { count: totalAthletes } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'athlete');

    const { count: totalBrands } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'brand');

    const { count: totalDirectors } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'athletic_director');

    // Get active users (logged in within last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: activeUsers } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_login_at', thirtyDaysAgo.toISOString());

    // Get deal statistics
    const { count: totalDeals } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true });

    const { count: activeDeals } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .in('status', ['active', 'accepted', 'pending', 'negotiating']);

    const { count: completedDeals } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed');

    // Get revenue statistics
    const { data: completedDealsData } = await supabase
      .from('deals')
      .select('compensation_amount')
      .eq('status', 'completed');

    const totalRevenue = completedDealsData?.reduce(
      (sum, deal) => sum + (deal.compensation_amount || 0),
      0
    ) || 0;

    const { data: pendingDealsData } = await supabase
      .from('deals')
      .select('compensation_amount')
      .in('status', ['active', 'accepted']);

    const pendingRevenue = pendingDealsData?.reduce(
      (sum, deal) => sum + (deal.compensation_amount || 0),
      0
    ) || 0;

    return {
      data: {
        totalUsers: totalUsers || 0,
        totalAthletes: totalAthletes || 0,
        totalBrands: totalBrands || 0,
        totalDirectors: totalDirectors || 0,
        activeUsers: activeUsers || 0,
        totalDeals: totalDeals || 0,
        activeDeals: activeDeals || 0,
        completedDeals: completedDeals || 0,
        totalRevenue,
        pendingRevenue,
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Failed to fetch platform stats' },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// USER MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get paginated list of users with filters
 */
export async function getUsers(filters?: UserFilters): Promise<ServiceResult<{
  users: AdminUser[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}>> {
  const supabase = createClient();
  const page = filters?.page ?? 1;
  const pageSize = filters?.page_size ?? 20;
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Apply role filter
    if (filters?.role && filters.role.length > 0) {
      query = query.in('role', filters.role);
    }

    // Apply search filter
    if (filters?.search) {
      query = query.or(`email.ilike.%${filters.search}%,first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    // Transform to AdminUser type with defaults for missing fields
    const users: AdminUser[] = (data || []).map((profile) => ({
      id: profile.id,
      email: profile.email,
      role: profile.role as UserRole,
      first_name: profile.first_name,
      last_name: profile.last_name,
      avatar_url: profile.avatar_url,
      is_active: profile.is_active ?? true,
      is_suspended: profile.is_suspended ?? false,
      suspension_reason: profile.suspension_reason ?? null,
      suspended_at: profile.suspended_at ?? null,
      last_login_at: profile.last_login_at,
      created_at: profile.created_at,
      updated_at: profile.updated_at,
    }));

    return {
      data: {
        users,
        total: count ?? 0,
        page,
        page_size: pageSize,
        total_pages: Math.ceil((count ?? 0) / pageSize),
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Failed to fetch users' },
    };
  }
}

/**
 * Get a single user by ID with full details
 */
export async function getUserById(userId: string): Promise<ServiceResult<AdminUser>> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    const user: AdminUser = {
      id: data.id,
      email: data.email,
      role: data.role as UserRole,
      first_name: data.first_name,
      last_name: data.last_name,
      avatar_url: data.avatar_url,
      is_active: data.is_active ?? true,
      is_suspended: data.is_suspended ?? false,
      suspension_reason: data.suspension_reason ?? null,
      suspended_at: data.suspended_at ?? null,
      last_login_at: data.last_login_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return { data: user, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Failed to fetch user' },
    };
  }
}

/**
 * Suspend a user account
 */
export async function suspendUser(
  userId: string,
  reason: string,
  adminId: string
): Promise<ServiceResult<AdminUser>> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        is_suspended: true,
        suspension_reason: reason,
        suspended_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    // Log the action
    await logAdminAction(adminId, 'suspend_user', 'user', userId, { reason });

    const user: AdminUser = {
      id: data.id,
      email: data.email,
      role: data.role as UserRole,
      first_name: data.first_name,
      last_name: data.last_name,
      avatar_url: data.avatar_url,
      is_active: data.is_active ?? true,
      is_suspended: true,
      suspension_reason: reason,
      suspended_at: data.suspended_at,
      last_login_at: data.last_login_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return { data: user, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Failed to suspend user' },
    };
  }
}

/**
 * Unsuspend a user account
 */
export async function unsuspendUser(
  userId: string,
  adminId: string
): Promise<ServiceResult<AdminUser>> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        is_suspended: false,
        suspension_reason: null,
        suspended_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    // Log the action
    await logAdminAction(adminId, 'unsuspend_user', 'user', userId, {});

    const user: AdminUser = {
      id: data.id,
      email: data.email,
      role: data.role as UserRole,
      first_name: data.first_name,
      last_name: data.last_name,
      avatar_url: data.avatar_url,
      is_active: data.is_active ?? true,
      is_suspended: false,
      suspension_reason: null,
      suspended_at: null,
      last_login_at: data.last_login_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return { data: user, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Failed to unsuspend user' },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEAL MONITORING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all deals with admin-level details
 */
export async function getDealsForAdmin(filters?: DealFilters): Promise<ServiceResult<{
  deals: AdminDeal[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}>> {
  const supabase = createClient();
  const page = filters?.page ?? 1;
  const pageSize = filters?.page_size ?? 20;
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from('deals')
      .select(`
        *,
        athlete:athletes(id, first_name, last_name, email),
        brand:brands(id, company_name)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Apply status filter
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status);
    }

    // Apply flagged filter
    if (filters?.is_flagged !== undefined) {
      query = query.eq('is_flagged', filters.is_flagged);
    }

    // Apply search filter
    if (filters?.search) {
      query = query.ilike('title', `%${filters.search}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    const deals: AdminDeal[] = (data || []).map((deal) => ({
      id: deal.id,
      title: deal.title,
      status: deal.status as DealStatus,
      deal_type: deal.deal_type,
      compensation_amount: deal.compensation_amount,
      is_flagged: deal.is_flagged ?? false,
      flag_reason: deal.flag_reason ?? null,
      flagged_at: deal.flagged_at ?? null,
      created_at: deal.created_at,
      updated_at: deal.updated_at,
      athlete: deal.athlete,
      brand: deal.brand,
    }));

    return {
      data: {
        deals,
        total: count ?? 0,
        page,
        page_size: pageSize,
        total_pages: Math.ceil((count ?? 0) / pageSize),
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Failed to fetch deals' },
    };
  }
}

/**
 * Flag a deal for review
 */
export async function flagDeal(
  dealId: string,
  reason: string,
  adminId: string
): Promise<ServiceResult<AdminDeal>> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('deals')
      .update({
        is_flagged: true,
        flag_reason: reason,
        flagged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)
      .select(`
        *,
        athlete:athletes(id, first_name, last_name, email),
        brand:brands(id, company_name)
      `)
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    // Log the action
    await logAdminAction(adminId, 'flag_deal', 'deal', dealId, { reason });

    const deal: AdminDeal = {
      id: data.id,
      title: data.title,
      status: data.status as DealStatus,
      deal_type: data.deal_type,
      compensation_amount: data.compensation_amount,
      is_flagged: true,
      flag_reason: reason,
      flagged_at: data.flagged_at,
      created_at: data.created_at,
      updated_at: data.updated_at,
      athlete: data.athlete,
      brand: data.brand,
    };

    return { data: deal, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Failed to flag deal' },
    };
  }
}

/**
 * Unflag a deal
 */
export async function unflagDeal(
  dealId: string,
  adminId: string
): Promise<ServiceResult<AdminDeal>> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('deals')
      .update({
        is_flagged: false,
        flag_reason: null,
        flagged_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', dealId)
      .select(`
        *,
        athlete:athletes(id, first_name, last_name, email),
        brand:brands(id, company_name)
      `)
      .single();

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    // Log the action
    await logAdminAction(adminId, 'unflag_deal', 'deal', dealId, {});

    const deal: AdminDeal = {
      id: data.id,
      title: data.title,
      status: data.status as DealStatus,
      deal_type: data.deal_type,
      compensation_amount: data.compensation_amount,
      is_flagged: false,
      flag_reason: null,
      flagged_at: null,
      created_at: data.created_at,
      updated_at: data.updated_at,
      athlete: data.athlete,
      brand: data.brand,
    };

    return { data: deal, error: null };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Failed to unflag deal' },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOG
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Log an admin action for audit trail
 */
export async function logAdminAction(
  adminId: string,
  action: string,
  entityType: 'user' | 'deal' | 'system',
  entityId: string | null,
  details: Record<string, unknown>
): Promise<ServiceResult> {
  const supabase = createClient();

  try {
    // Get admin email for the log
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', adminId)
      .single();

    const { error } = await supabase.from('admin_audit_log').insert({
      admin_id: adminId,
      admin_email: adminProfile?.email || 'unknown',
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
      created_at: new Date().toISOString(),
    });

    if (error) {
      // Log error but don't fail the main operation
      console.error('Failed to log admin action:', error);
    }

    return { data: null, error: null };
  } catch (error) {
    console.error('Failed to log admin action:', error);
    return { data: null, error: null }; // Don't fail main operation
  }
}

/**
 * Get audit log entries with filters
 */
export async function getAuditLog(filters?: AuditLogFilters): Promise<ServiceResult<{
  entries: AuditLogEntry[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}>> {
  const supabase = createClient();
  const page = filters?.page ?? 1;
  const pageSize = filters?.page_size ?? 50;
  const offset = (page - 1) * pageSize;

  try {
    let query = supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1);

    // Apply filters
    if (filters?.action && filters.action.length > 0) {
      query = query.in('action', filters.action);
    }

    if (filters?.entity_type && filters.entity_type.length > 0) {
      query = query.in('entity_type', filters.entity_type);
    }

    if (filters?.admin_id) {
      query = query.eq('admin_id', filters.admin_id);
    }

    if (filters?.start_date) {
      query = query.gte('created_at', filters.start_date);
    }

    if (filters?.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    const { data, error, count } = await query;

    if (error) {
      return { data: null, error: { message: error.message, code: error.code } };
    }

    const entries: AuditLogEntry[] = (data || []).map((entry) => ({
      id: entry.id,
      admin_id: entry.admin_id,
      admin_email: entry.admin_email,
      action: entry.action,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      details: entry.details || {},
      ip_address: entry.ip_address,
      created_at: entry.created_at,
    }));

    return {
      data: {
        entries,
        total: count ?? 0,
        page,
        page_size: pageSize,
        total_pages: Math.ceil((count ?? 0) / pageSize),
      },
      error: null,
    };
  } catch (error) {
    return {
      data: null,
      error: { message: error instanceof Error ? error.message : 'Failed to fetch audit log' },
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SYSTEM HEALTH
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check system health status
 */
export async function getSystemHealth(): Promise<ServiceResult<SystemHealth>> {
  const supabase = createClient();

  try {
    // Check database by running a simple query
    let dbStatus: 'healthy' | 'degraded' | 'down' = 'down';
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1);
      dbStatus = error ? 'degraded' : 'healthy';
    } catch {
      dbStatus = 'down';
    }

    // Check storage by listing buckets
    let storageStatus: 'healthy' | 'degraded' | 'down' = 'down';
    try {
      const { error } = await supabase.storage.listBuckets();
      storageStatus = error ? 'degraded' : 'healthy';
    } catch {
      storageStatus = 'down';
    }

    // API is healthy if we got this far
    const apiStatus: 'healthy' | 'degraded' | 'down' =
      dbStatus === 'healthy' && storageStatus === 'healthy' ? 'healthy' :
      dbStatus === 'down' || storageStatus === 'down' ? 'down' : 'degraded';

    return {
      data: {
        api_status: apiStatus,
        database_status: dbStatus,
        storage_status: storageStatus,
        last_checked: new Date().toISOString(),
      },
      error: null,
    };
  } catch (error) {
    return {
      data: {
        api_status: 'down',
        database_status: 'down',
        storage_status: 'down',
        last_checked: new Date().toISOString(),
      },
      error: { message: error instanceof Error ? error.message : 'Health check failed' },
    };
  }
}
