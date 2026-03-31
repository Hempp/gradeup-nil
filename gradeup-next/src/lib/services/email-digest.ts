import { createClient } from '@/lib/supabase/client';

// ═══════════════════════════════════════════════════════════════════════════
// EMAIL DIGEST SERVICE — Re-engagement & Retention
// Generates weekly digest content for athletes and brands.
// Called by a cron job (Vercel Cron or external scheduler).
// ═══════════════════════════════════════════════════════════════════════════

export interface AthleteDigest {
  athleteId: string;
  athleteName: string;
  email: string;
  weekSummary: {
    newDealOffers: number;
    profileViews: number;
    messagesReceived: number;
    earningsThisWeek: number;
    gradeUpScoreChange: number;
    leaderboardRank?: number;
  };
  topOpportunities: Array<{
    title: string;
    brandName: string;
    value: number;
    deadline?: string;
  }>;
  referralStats: {
    totalReferrals: number;
    pendingBonuses: number;
  };
}

export interface BrandDigest {
  brandId: string;
  brandName: string;
  email: string;
  weekSummary: {
    newAthleteMatches: number;
    campaignImpressions: number;
    activeDealProgress: number;
    responseRate: number;
  };
  featuredAthletes: Array<{
    name: string;
    school: string;
    sport: string;
    gpa: number;
    gradeUpScore: number;
    followers: number;
  }>;
}

/**
 * Generate digest data for an athlete (called by cron)
 */
export async function generateAthleteDigest(
  athleteId: string
): Promise<AthleteDigest | null> {
  const supabase = createClient();
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Get athlete profile
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id, first_name, last_name, email, profile_id')
      .eq('id', athleteId)
      .single();

    if (!athlete) return null;

    // Count new deal offers this week
    const { count: newDeals } = await supabase
      .from('deals')
      .select('*', { count: 'exact', head: true })
      .eq('athlete_id', athleteId)
      .gte('created_at', oneWeekAgo);

    // Count profile views (from analytics)
    const { count: profileViews } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('entity_id', athleteId)
      .eq('event_type', 'profile_view')
      .gte('created_at', oneWeekAgo);

    // Count messages
    const { count: messages } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('recipient_id', athlete.profile_id)
      .gte('created_at', oneWeekAgo);

    // Sum earnings
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('athlete_id', athleteId)
      .eq('status', 'completed')
      .gte('created_at', oneWeekAgo);

    const earningsThisWeek = payments?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;

    // Get matching opportunities
    const { data: opportunities } = await supabase
      .from('deals')
      .select('title, brand:brands(company_name), compensation_amount, deadline')
      .eq('status', 'pending')
      .order('compensation_amount', { ascending: false })
      .limit(3);

    return {
      athleteId,
      athleteName: `${athlete.first_name} ${athlete.last_name}`,
      email: athlete.email,
      weekSummary: {
        newDealOffers: newDeals || 0,
        profileViews: profileViews || 0,
        messagesReceived: messages || 0,
        earningsThisWeek,
        gradeUpScoreChange: 0, // Would need historical comparison
      },
      topOpportunities: (opportunities || []).map(o => ({
        title: o.title || 'New Opportunity',
        brandName: (o.brand as { company_name?: string })?.company_name || 'Brand',
        value: o.compensation_amount || 0,
        deadline: o.deadline,
      })),
      referralStats: {
        totalReferrals: 0,
        pendingBonuses: 0,
      },
    };
  } catch (err) {
    console.error('Failed to generate athlete digest:', err);
    return null;
  }
}

/**
 * Generate digest data for a brand
 */
export async function generateBrandDigest(
  brandId: string
): Promise<BrandDigest | null> {
  const supabase = createClient();

  try {
    const { data: brand } = await supabase
      .from('brands')
      .select('id, company_name, contact_email, preferred_sports, min_gpa')
      .eq('id', brandId)
      .single();

    if (!brand) return null;

    // Get top matching athletes by GPA (our differentiator)
    const { data: athletes } = await supabase
      .from('athletes')
      .select('first_name, last_name, gpa, total_followers, school:schools(name), sport:sports(name)')
      .gte('gpa', brand.min_gpa || 3.0)
      .eq('enrollment_verified', true)
      .order('gpa', { ascending: false })
      .limit(5);

    return {
      brandId,
      brandName: brand.company_name,
      email: brand.contact_email,
      weekSummary: {
        newAthleteMatches: athletes?.length || 0,
        campaignImpressions: 0,
        activeDealProgress: 0,
        responseRate: 0,
      },
      featuredAthletes: (athletes || []).map(a => ({
        name: `${a.first_name} ${a.last_name}`,
        school: (a.school as { name?: string })?.name || 'University',
        sport: (a.sport as { name?: string })?.name || 'Sport',
        gpa: a.gpa,
        gradeUpScore: 0,
        followers: a.total_followers || 0,
      })),
    };
  } catch (err) {
    console.error('Failed to generate brand digest:', err);
    return null;
  }
}

/**
 * Build the email HTML for an athlete digest
 */
export function buildAthleteDigestEmail(digest: AthleteDigest): {
  subject: string;
  html: string;
} {
  const { weekSummary, topOpportunities, athleteName } = digest;
  const hasActivity = weekSummary.newDealOffers > 0 || weekSummary.profileViews > 0 || weekSummary.earningsThisWeek > 0;

  const subject = hasActivity
    ? `${athleteName}, you had ${weekSummary.newDealOffers} new deal offers this week!`
    : `${athleteName}, brands are looking for athletes like you`;

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #0a0a0a; color: #fafafa; border-radius: 12px; overflow: hidden;">
      <div style="padding: 32px; text-align: center; background: linear-gradient(135deg, #00f0ff20, #a0ff0020);">
        <h1 style="margin: 0; font-size: 24px; color: #00f0ff;">Your Weekly GradeUp Digest</h1>
        <p style="margin: 8px 0 0; color: #888;">Here's what happened this week</p>
      </div>

      <div style="padding: 24px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 24px;">
          <div style="background: #1a1a1a; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #00f0ff;">${weekSummary.newDealOffers}</div>
            <div style="font-size: 12px; color: #888; text-transform: uppercase;">New Offers</div>
          </div>
          <div style="background: #1a1a1a; padding: 16px; border-radius: 8px; text-align: center;">
            <div style="font-size: 28px; font-weight: bold; color: #a0ff00;">${weekSummary.profileViews}</div>
            <div style="font-size: 12px; color: #888; text-transform: uppercase;">Profile Views</div>
          </div>
        </div>

        ${weekSummary.earningsThisWeek > 0 ? `
          <div style="background: #1a1a1a; padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: center;">
            <div style="font-size: 32px; font-weight: bold; color: #ffd700;">$${(weekSummary.earningsThisWeek / 100).toFixed(2)}</div>
            <div style="font-size: 12px; color: #888; text-transform: uppercase;">Earned This Week</div>
          </div>
        ` : ''}

        ${topOpportunities.length > 0 ? `
          <h2 style="font-size: 16px; margin: 0 0 12px; color: #fafafa;">Top Opportunities For You</h2>
          ${topOpportunities.map(o => `
            <div style="background: #1a1a1a; padding: 12px 16px; border-radius: 8px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600; color: #fafafa;">${o.title}</div>
                <div style="font-size: 12px; color: #888;">${o.brandName}</div>
              </div>
              <div style="font-weight: bold; color: #00f0ff;">$${o.value.toLocaleString()}</div>
            </div>
          `).join('')}
        ` : ''}

        <div style="text-align: center; margin-top: 32px;">
          <a href="https://gradeupnil.com/athlete/dashboard" style="display: inline-block; background: #00f0ff; color: #000; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px;">
            View Your Dashboard
          </a>
        </div>
      </div>

      <div style="padding: 16px 24px; border-top: 1px solid #222; text-align: center;">
        <p style="margin: 0; font-size: 12px; color: #666;">
          GradeUp NIL · Your GPA Is Worth Money
        </p>
      </div>
    </div>
  `;

  return { subject, html };
}
