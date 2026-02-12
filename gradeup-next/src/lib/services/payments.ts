import { createClient } from '@/lib/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════
// Type Definitions
// ═══════════════════════════════════════════════════════════════════════════

export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';
export type PaymentMethod = 'bank_transfer' | 'paypal' | 'venmo' | 'check';

export interface Payment {
  id: string;
  deal_id: string;
  amount: number;
  status: PaymentStatus;
  payment_method: PaymentMethod | null;
  scheduled_date: string | null;
  paid_at: string | null;
  created_at: string;
  deal?: {
    title: string;
    brand?: { company_name: string; logo_url: string | null };
  };
}

export interface EarningsSummary {
  total_earned: number;
  pending_amount: number;
  this_month: number;
  last_month: number;
  monthly_breakdown: { month: string; amount: number }[];
}

export interface PaymentAccount {
  id: string;
  user_id: string;
  account_type: PaymentMethod;
  account_details: Record<string, string>;
  is_primary: boolean;
  is_verified: boolean;
}

export interface ServiceResult<T = null> {
  data: T | null;
  error: Error | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Helper Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get the current user's ID from the authenticated session
 */
async function getCurrentUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/**
 * Get the athlete ID for the current user
 */
async function getAthleteIdForCurrentUser(): Promise<string | null> {
  const supabase = createClient();
  const userId = await getCurrentUserId();

  if (!userId) return null;

  const { data: athlete } = await supabase
    .from('athletes')
    .select('id')
    .eq('profile_id', userId)
    .single();

  return athlete?.id ?? null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Payment Service Functions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all payments for an athlete
 * If athleteId is not provided, uses the current authenticated user's athlete ID
 */
export async function getAthletePayments(
  athleteId?: string
): Promise<ServiceResult<Payment[]>> {
  const supabase = createClient();

  try {
    const targetAthleteId = athleteId ?? await getAthleteIdForCurrentUser();

    if (!targetAthleteId) {
      return { data: null, error: new Error('Athlete not found or not authenticated') };
    }

    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        deal:deals(
          title,
          brand:brands(company_name, logo_url)
        )
      `)
      .eq('athlete_id', targetAthleteId)
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(`Failed to fetch payments: ${error.message}`) };
    }

    return { data: data as Payment[], error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Get a single payment by ID
 */
export async function getPaymentById(
  paymentId: string
): Promise<ServiceResult<Payment>> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('payments')
      .select(`
        *,
        deal:deals(
          title,
          brand:brands(company_name, logo_url)
        )
      `)
      .eq('id', paymentId)
      .single();

    if (error) {
      return { data: null, error: new Error(`Failed to fetch payment: ${error.message}`) };
    }

    return { data: data as Payment, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Get earnings summary for an athlete
 * If athleteId is not provided, uses the current authenticated user's athlete ID
 */
export async function getEarningsSummary(
  athleteId?: string
): Promise<ServiceResult<EarningsSummary>> {
  const supabase = createClient();

  try {
    const targetAthleteId = athleteId ?? await getAthleteIdForCurrentUser();

    if (!targetAthleteId) {
      return { data: null, error: new Error('Athlete not found or not authenticated') };
    }

    // Fetch all payments for the athlete
    const { data: payments, error } = await supabase
      .from('payments')
      .select('amount, status, paid_at, created_at')
      .eq('athlete_id', targetAthleteId);

    if (error) {
      return { data: null, error: new Error(`Failed to fetch earnings: ${error.message}`) };
    }

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Calculate totals
    let totalEarned = 0;
    let pendingAmount = 0;
    let thisMonth = 0;
    let lastMonth = 0;
    const monthlyAmounts: Record<string, number> = {};

    for (const payment of payments || []) {
      const amount = payment.amount ?? 0;
      const paidAt = payment.paid_at ? new Date(payment.paid_at) : null;
      const createdAt = new Date(payment.created_at);

      if (payment.status === 'completed' && paidAt) {
        totalEarned += amount;

        // Calculate this month's earnings
        if (paidAt >= thisMonthStart) {
          thisMonth += amount;
        }

        // Calculate last month's earnings
        if (paidAt >= lastMonthStart && paidAt <= lastMonthEnd) {
          lastMonth += amount;
        }

        // Add to monthly breakdown
        const monthKey = `${paidAt.getFullYear()}-${String(paidAt.getMonth() + 1).padStart(2, '0')}`;
        monthlyAmounts[monthKey] = (monthlyAmounts[monthKey] ?? 0) + amount;
      } else if (payment.status === 'pending' || payment.status === 'processing') {
        pendingAmount += amount;
      }
    }

    // Convert monthly breakdown to sorted array
    const monthlyBreakdown = Object.entries(monthlyAmounts)
      .map(([month, amount]) => ({ month, amount }))
      .sort((a, b) => b.month.localeCompare(a.month));

    const summary: EarningsSummary = {
      total_earned: totalEarned,
      pending_amount: pendingAmount,
      this_month: thisMonth,
      last_month: lastMonth,
      monthly_breakdown: monthlyBreakdown,
    };

    return { data: summary, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Get all payment accounts for the current user
 */
export async function getPaymentAccounts(): Promise<ServiceResult<PaymentAccount[]>> {
  const supabase = createClient();

  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { data, error } = await supabase
      .from('payment_accounts')
      .select('*')
      .eq('user_id', userId)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: new Error(`Failed to fetch payment accounts: ${error.message}`) };
    }

    return { data: data as PaymentAccount[], error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Add a new payment account
 */
export async function addPaymentAccount(
  data: Omit<PaymentAccount, 'id' | 'user_id' | 'is_verified'>
): Promise<ServiceResult<PaymentAccount>> {
  const supabase = createClient();

  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { data: null, error: new Error('Not authenticated') };
    }

    // If this is being set as primary, unset other primary accounts first
    if (data.is_primary) {
      await supabase
        .from('payment_accounts')
        .update({ is_primary: false })
        .eq('user_id', userId);
    }

    const { data: newAccount, error } = await supabase
      .from('payment_accounts')
      .insert({
        user_id: userId,
        account_type: data.account_type,
        account_details: data.account_details,
        is_primary: data.is_primary,
        is_verified: false,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(`Failed to add payment account: ${error.message}`) };
    }

    return { data: newAccount as PaymentAccount, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Update an existing payment account
 */
export async function updatePaymentAccount(
  accountId: string,
  updates: Partial<PaymentAccount>
): Promise<ServiceResult<PaymentAccount>> {
  const supabase = createClient();

  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { data: null, error: new Error('Not authenticated') };
    }

    // If setting as primary, unset other primary accounts first
    if (updates.is_primary) {
      await supabase
        .from('payment_accounts')
        .update({ is_primary: false })
        .eq('user_id', userId)
        .neq('id', accountId);
    }

    // Remove fields that shouldn't be updated directly
    const { id, user_id, is_verified, ...safeUpdates } = updates;

    const { data: updatedAccount, error } = await supabase
      .from('payment_accounts')
      .update(safeUpdates)
      .eq('id', accountId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      return { data: null, error: new Error(`Failed to update payment account: ${error.message}`) };
    }

    return { data: updatedAccount as PaymentAccount, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Delete a payment account
 */
export async function deletePaymentAccount(
  accountId: string
): Promise<ServiceResult> {
  const supabase = createClient();

  try {
    const userId = await getCurrentUserId();

    if (!userId) {
      return { data: null, error: new Error('Not authenticated') };
    }

    const { error } = await supabase
      .from('payment_accounts')
      .delete()
      .eq('id', accountId)
      .eq('user_id', userId);

    if (error) {
      return { data: null, error: new Error(`Failed to delete payment account: ${error.message}`) };
    }

    return { data: null, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}

/**
 * Request a payout for a specific deal
 */
export async function requestPayout(dealId: string): Promise<ServiceResult<Payment>> {
  const supabase = createClient();

  try {
    const athleteId = await getAthleteIdForCurrentUser();

    if (!athleteId) {
      return { data: null, error: new Error('Athlete not found or not authenticated') };
    }

    // Verify the deal belongs to this athlete and is eligible for payout
    const { data: deal, error: dealError } = await supabase
      .from('deals')
      .select('id, compensation_amount, status, athlete_id')
      .eq('id', dealId)
      .single();

    if (dealError || !deal) {
      return { data: null, error: new Error('Deal not found') };
    }

    if (deal.athlete_id !== athleteId) {
      return { data: null, error: new Error('You do not have permission to request payout for this deal') };
    }

    if (deal.status !== 'completed') {
      return { data: null, error: new Error('Deal must be completed before requesting payout') };
    }

    // Check if a payout request already exists for this deal
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id, status')
      .eq('deal_id', dealId)
      .in('status', ['pending', 'processing', 'completed'])
      .single();

    if (existingPayment) {
      return { data: null, error: new Error('A payout request already exists for this deal') };
    }

    // Create the payout request
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        deal_id: dealId,
        athlete_id: athleteId,
        amount: deal.compensation_amount,
        status: 'pending' as PaymentStatus,
        payment_method: null,
        scheduled_date: null,
        paid_at: null,
      })
      .select(`
        *,
        deal:deals(
          title,
          brand:brands(company_name, logo_url)
        )
      `)
      .single();

    if (paymentError) {
      return { data: null, error: new Error(`Failed to create payout request: ${paymentError.message}`) };
    }

    return { data: payment as Payment, error: null };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('An unexpected error occurred'),
    };
  }
}
