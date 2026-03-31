'use client';

import { createClient } from '@/lib/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════
// REFERRAL SYSTEM — Athlete-to-Athlete Viral Growth Engine
// Each athlete gets a unique referral code. When a referred athlete
// completes their first deal, both referrer and referee get a bonus.
// ═══════════════════════════════════════════════════════════════════════════

/** Referral bonus amount in cents for the referrer */
export const REFERRER_BONUS_CENTS = 2500; // $25.00

/** Referral bonus amount in cents for the referred athlete */
export const REFEREE_BONUS_CENTS = 1000; // $10.00

/** Maximum referrals per athlete that earn bonuses */
export const MAX_REFERRAL_BONUSES = 50;

export interface Referral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: 'pending' | 'signed_up' | 'first_deal' | 'bonus_paid';
  referrer_bonus_cents: number;
  referee_bonus_cents: number;
  created_at: string;
  converted_at?: string;
  bonus_paid_at?: string;
}

export interface ReferralStats {
  totalReferrals: number;
  signedUp: number;
  completedFirstDeal: number;
  totalEarned: number;
  referralCode: string;
  referralUrl: string;
}

/**
 * Generate a unique referral code for an athlete
 * Format: GU-{first3letters}{random4digits} (e.g., GU-MAR7291)
 */
export function generateReferralCode(firstName: string): string {
  const prefix = firstName.substring(0, 3).toUpperCase();
  const random = Math.floor(1000 + Math.random() * 9000);
  return `GU-${prefix}${random}`;
}

/**
 * Get or create a referral code for the current athlete
 */
export async function getMyReferralCode(
  athleteId: string,
  firstName: string
): Promise<{ code: string; url: string }> {
  const supabase = createClient();

  try {
    // Check if code already exists
    const { data: existing } = await supabase
      .from('referrals')
      .select('referral_code')
      .eq('referrer_id', athleteId)
      .limit(1)
      .single();

    if (existing?.referral_code) {
      return {
        code: existing.referral_code,
        url: `${window.location.origin}/signup/athlete?ref=${existing.referral_code}`,
      };
    }
  } catch {
    // No existing code, generate one
  }

  const code = generateReferralCode(firstName);
  return {
    code,
    url: `${typeof window !== 'undefined' ? window.location.origin : ''}/signup/athlete?ref=${code}`,
  };
}

/**
 * Track a referral signup
 */
export async function trackReferralSignup(
  referralCode: string,
  newAthleteId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();

  try {
    // Find the referrer
    const { data: referral } = await supabase
      .from('referrals')
      .select('referrer_id')
      .eq('referral_code', referralCode)
      .limit(1)
      .single();

    if (!referral) {
      return { success: false, error: 'Invalid referral code' };
    }

    // Record the referral
    const { error } = await supabase
      .from('referrals')
      .insert({
        referrer_id: referral.referrer_id,
        referred_id: newAthleteId,
        referral_code: referralCode,
        status: 'signed_up',
        referrer_bonus_cents: REFERRER_BONUS_CENTS,
        referee_bonus_cents: REFEREE_BONUS_CENTS,
      });

    if (error) throw error;
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to track referral',
    };
  }
}

/**
 * Get referral stats for an athlete's dashboard
 */
export async function getReferralStats(
  athleteId: string,
  firstName: string
): Promise<ReferralStats> {
  const supabase = createClient();
  const { code, url } = await getMyReferralCode(athleteId, firstName);

  try {
    const { data: referrals } = await supabase
      .from('referrals')
      .select('status, referrer_bonus_cents')
      .eq('referrer_id', athleteId);

    if (!referrals) {
      return {
        totalReferrals: 0,
        signedUp: 0,
        completedFirstDeal: 0,
        totalEarned: 0,
        referralCode: code,
        referralUrl: url,
      };
    }

    return {
      totalReferrals: referrals.length,
      signedUp: referrals.filter(r => r.status !== 'pending').length,
      completedFirstDeal: referrals.filter(r =>
        r.status === 'first_deal' || r.status === 'bonus_paid'
      ).length,
      totalEarned: referrals
        .filter(r => r.status === 'bonus_paid')
        .reduce((sum, r) => sum + (r.referrer_bonus_cents || 0), 0),
      referralCode: code,
      referralUrl: url,
    };
  } catch {
    return {
      totalReferrals: 0,
      signedUp: 0,
      completedFirstDeal: 0,
      totalEarned: 0,
      referralCode: code,
      referralUrl: url,
    };
  }
}
