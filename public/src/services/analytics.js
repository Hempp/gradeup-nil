/**
 * GradeUp NIL Platform - Analytics Service
 * Handles athlete analytics, metrics, and reporting.
 *
 * @module services/analytics
 */

import { getSupabaseClient, getCurrentUser } from './supabase.js';
import { getMyAthleteId, getDateRange, TIME_PERIODS } from './helpers.js';

export { TIME_PERIODS };

export const VIEW_SOURCES = {
  SEARCH: 'search',
  FEATURED: 'featured',
  OPPORTUNITY: 'opportunity',
  DIRECT: 'direct',
};

function groupBy(items, keyFn) {
  return items.reduce((acc, item) => {
    const key = keyFn(item);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
}

function sumBy(items, valueFn) {
  return items.reduce((acc, item) => {
    const key = valueFn.key(item);
    acc[key] = (acc[key] || 0) + (valueFn.value(item) || 0);
    return acc;
  }, {});
}

export async function getProfileViews(options = {}) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { views: null, error: new Error('Athlete profile not found') };
  }

  const { period = TIME_PERIODS.MONTH } = options;
  const { start } = getDateRange(period);

  const { data: views, error } = await supabase
    .from('profile_views')
    .select('*')
    .eq('athlete_id', athleteId)
    .gte('created_at', start.toISOString());

  if (error) return { views: null, error };

  const uniqueViewers = new Set(views.filter(v => v.viewer_id).map(v => v.viewer_id)).size;

  return {
    views: {
      total: views.length,
      unique_viewers: uniqueViewers,
      brand_views: views.filter(v => v.viewer_type === 'brand').length,
      athletic_director_views: views.filter(v => v.viewer_type === 'athletic_director').length,
      anonymous_views: views.filter(v => !v.viewer_id).length,
      by_source: groupBy(views, v => v.source || 'unknown'),
      by_date: groupBy(views, v => v.created_at.split('T')[0]),
      period,
    },
    error: null,
  };
}

export async function getRecentViewers(options = {}) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { viewers: null, error: new Error('Athlete profile not found') };
  }

  const { limit = 10 } = options;

  const { data, error } = await supabase
    .from('profile_views')
    .select(`
      viewer_id, viewer_type, source, created_at,
      viewer:profiles!viewer_id(id, first_name, last_name, avatar_url, role)
    `)
    .eq('athlete_id', athleteId)
    .not('viewer_id', 'is', null)
    .eq('viewer_type', 'brand')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return { viewers: null, error };

  const viewerIds = [...new Set(data.map(v => v.viewer_id))];

  if (viewerIds.length === 0) {
    return { viewers: data, error: null };
  }

  const { data: brands } = await supabase
    .from('brands')
    .select('profile_id, company_name, logo_url, industry')
    .in('profile_id', viewerIds);

  const brandMap = (brands || []).reduce((acc, b) => {
    acc[b.profile_id] = b;
    return acc;
  }, {});

  const enrichedViewers = data.map(v => ({ ...v, brand: brandMap[v.viewer_id] || null }));

  return { viewers: enrichedViewers, error: null };
}

export async function getEarningsStats(options = {}) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { earnings: null, error: new Error('Athlete profile not found') };
  }

  const { period = TIME_PERIODS.ALL_TIME } = options;
  const { start } = getDateRange(period);

  let query = supabase
    .from('deals')
    .select('amount, deal_type, completed_at, brand:brands(company_name, industry)')
    .eq('athlete_id', athleteId)
    .eq('status', 'completed');

  if (period !== TIME_PERIODS.ALL_TIME) {
    query = query.gte('completed_at', start.toISOString());
  }

  const { data: deals, error } = await query;

  if (error) return { earnings: null, error };

  const totalEarnings = deals.reduce((sum, d) => sum + (d.amount || 0), 0);

  return {
    earnings: {
      total: totalEarnings,
      deal_count: deals.length,
      average_deal_value: deals.length > 0 ? totalEarnings / deals.length : 0,
      by_deal_type: sumBy(deals, { key: d => d.deal_type, value: d => d.amount }),
      by_industry: sumBy(deals, { key: d => d.brand?.industry || 'Other', value: d => d.amount }),
      by_month: sumBy(deals.filter(d => d.completed_at), {
        key: d => d.completed_at.substring(0, 7),
        value: d => d.amount,
      }),
      period,
    },
    error: null,
  };
}

export async function getEarningsTrend(period = TIME_PERIODS.MONTH) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { trend: null, error: new Error('Athlete profile not found') };
  }

  const { start: currentStart, end: currentEnd } = getDateRange(period);
  const periodDays = Math.round((currentEnd - currentStart) / (1000 * 60 * 60 * 24));

  const previousStart = new Date(currentStart);
  previousStart.setDate(previousStart.getDate() - periodDays);
  const previousEnd = new Date(currentStart);
  previousEnd.setDate(previousEnd.getDate() - 1);

  const [{ data: currentDeals }, { data: previousDeals }] = await Promise.all([
    supabase
      .from('deals')
      .select('amount')
      .eq('athlete_id', athleteId)
      .eq('status', 'completed')
      .gte('completed_at', currentStart.toISOString())
      .lte('completed_at', currentEnd.toISOString()),
    supabase
      .from('deals')
      .select('amount')
      .eq('athlete_id', athleteId)
      .eq('status', 'completed')
      .gte('completed_at', previousStart.toISOString())
      .lte('completed_at', previousEnd.toISOString()),
  ]);

  const currentTotal = (currentDeals || []).reduce((sum, d) => sum + (d.amount || 0), 0);
  const previousTotal = (previousDeals || []).reduce((sum, d) => sum + (d.amount || 0), 0);

  let changePercent = 0;
  if (previousTotal > 0) {
    changePercent = ((currentTotal - previousTotal) / previousTotal) * 100;
  } else if (currentTotal > 0) {
    changePercent = 100;
  }

  let trendDirection = 'flat';
  if (currentTotal > previousTotal) trendDirection = 'up';
  else if (currentTotal < previousTotal) trendDirection = 'down';

  return {
    trend: {
      current_period: {
        total: currentTotal,
        deal_count: (currentDeals || []).length,
        start: currentStart.toISOString(),
        end: currentEnd.toISOString(),
      },
      previous_period: {
        total: previousTotal,
        deal_count: (previousDeals || []).length,
        start: previousStart.toISOString(),
        end: previousEnd.toISOString(),
      },
      change_amount: currentTotal - previousTotal,
      change_percent: Math.round(changePercent * 100) / 100,
      trend_direction: trendDirection,
    },
    error: null,
  };
}

export async function getAthleteStats() {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { stats: null, error: new Error('Athlete profile not found') };
  }

  const { data, error } = await supabase
    .from('athletes')
    .select(`
      gradeup_score, gpa, total_followers,
      instagram_followers, twitter_followers, tiktok_followers,
      nil_valuation, total_earnings, deals_completed, avg_deal_rating,
      enrollment_verified, sport_verified, grades_verified, identity_verified
    `)
    .eq('id', athleteId)
    .single();

  if (error) return { stats: null, error };

  return {
    stats: {
      gradeup_score: data.gradeup_score,
      gpa: data.gpa,
      social: {
        total_followers: data.total_followers,
        instagram: data.instagram_followers,
        twitter: data.twitter_followers,
        tiktok: data.tiktok_followers,
      },
      nil: {
        valuation: data.nil_valuation,
        total_earnings: data.total_earnings,
        deals_completed: data.deals_completed,
        avg_rating: data.avg_deal_rating,
      },
      verification: {
        enrollment: data.enrollment_verified,
        sport: data.sport_verified,
        grades: data.grades_verified,
        identity: data.identity_verified,
        complete: data.enrollment_verified && data.sport_verified && data.grades_verified,
      },
    },
    error: null,
  };
}

export async function getDashboardMetrics(period = TIME_PERIODS.MONTH) {
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { dashboard: null, error: new Error('Athlete profile not found') };
  }

  const [viewsResult, earningsResult, trendResult, athleteResult] = await Promise.all([
    getProfileViews({ period }),
    getEarningsStats({ period }),
    getEarningsTrend(period),
    getAthleteStats(),
  ]);

  const firstError = [viewsResult, earningsResult, trendResult, athleteResult]
    .map(r => r.error)
    .find(Boolean);

  if (firstError) {
    return { dashboard: null, error: firstError };
  }

  return {
    dashboard: {
      profile_views: viewsResult.views,
      earnings: earningsResult.earnings,
      earnings_trend: trendResult.trend,
      athlete_stats: athleteResult.stats,
      period,
      generated_at: new Date().toISOString(),
    },
    error: null,
  };
}

export async function getGradeUpScoreHistory(period = TIME_PERIODS.QUARTER) {
  const supabase = await getSupabaseClient();
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { history: null, error: new Error('Athlete profile not found') };
  }

  const { start } = getDateRange(period);

  const { data, error } = await supabase
    .from('activity_log')
    .select('metadata, created_at')
    .eq('entity_type', 'athlete')
    .eq('entity_id', athleteId)
    .eq('action', 'gradeup_score_updated')
    .gte('created_at', start.toISOString())
    .order('created_at', { ascending: true });

  if (error) return { history: null, error };

  const history = (data || []).map(entry => ({
    score: entry.metadata?.score,
    date: entry.created_at,
  }));

  return { history, error: null };
}

function calculatePercentile(value, dataset) {
  if (!dataset || dataset.length === 0) return 50;
  const sorted = [...dataset].sort((a, b) => a - b);
  const below = sorted.filter(v => v < value).length;
  return Math.round((below / sorted.length) * 100);
}

export async function getAthleteComparison() {
  const supabase = await getSupabaseClient();
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { comparison: null, error: userError || new Error('Not authenticated') };
  }

  const { data: athlete, error: athleteError } = await supabase
    .from('athletes')
    .select('id, school_id, sport_id, gradeup_score, total_followers, total_earnings, deals_completed')
    .eq('profile_id', user.id)
    .single();

  if (athleteError || !athlete) {
    return { comparison: null, error: athleteError };
  }

  const fields = 'gradeup_score, total_followers, total_earnings, deals_completed';

  const [{ data: sportAthletes }, { data: schoolAthletes }] = await Promise.all([
    supabase.from('athletes').select(fields).eq('sport_id', athlete.sport_id).neq('id', athlete.id),
    supabase.from('athletes').select(fields).eq('school_id', athlete.school_id).neq('id', athlete.id),
  ]);

  const calculateAvg = (arr, field) => {
    if (!arr || arr.length === 0) return 0;
    const values = arr.filter(a => a[field] != null).map(a => a[field]);
    return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  };

  const avgFields = ['gradeup_score', 'total_followers', 'total_earnings', 'deals_completed'];

  const sportAvg = {};
  const schoolAvg = {};
  avgFields.forEach(field => {
    sportAvg[field] = calculateAvg(sportAthletes, field);
    schoolAvg[field] = calculateAvg(schoolAthletes, field);
  });

  return {
    comparison: {
      you: {
        gradeup_score: athlete.gradeup_score,
        total_followers: athlete.total_followers,
        total_earnings: athlete.total_earnings,
        deals_completed: athlete.deals_completed,
      },
      sport_average: sportAvg,
      school_average: schoolAvg,
      sport_count: (sportAthletes || []).length,
      school_count: (schoolAthletes || []).length,
      percentile: {
        sport: calculatePercentile(athlete.gradeup_score, (sportAthletes || []).map(a => a.gradeup_score)),
        school: calculatePercentile(athlete.gradeup_score, (schoolAthletes || []).map(a => a.gradeup_score)),
      },
    },
    error: null,
  };
}

export async function exportAnalyticsData(period = TIME_PERIODS.ALL_TIME) {
  const athleteId = await getMyAthleteId();

  if (!athleteId) {
    return { data: null, error: new Error('Athlete profile not found') };
  }

  const [dashboardResult, comparisonResult] = await Promise.all([
    getDashboardMetrics(period),
    getAthleteComparison(),
  ]);

  if (dashboardResult.error || comparisonResult.error) {
    return { data: null, error: dashboardResult.error || comparisonResult.error };
  }

  return {
    data: {
      export_date: new Date().toISOString(),
      period,
      dashboard: dashboardResult.dashboard,
      comparison: comparisonResult.comparison,
    },
    error: null,
  };
}

export async function getActivityFeed(options = {}) {
  const supabase = await getSupabaseClient();
  const { user, error: userError } = await getCurrentUser();

  if (userError || !user) {
    return { activities: null, error: userError };
  }

  const { limit = 20 } = options;

  const { data, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit);

  return { activities: data, error };
}

export default {
  getProfileViews,
  getRecentViewers,
  getEarningsStats,
  getEarningsTrend,
  getDashboardMetrics,
  getAthleteStats,
  getGradeUpScoreHistory,
  getAthleteComparison,
  exportAnalyticsData,
  getActivityFeed,
  TIME_PERIODS,
  VIEW_SOURCES,
};
