import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createUserClient, createAdminClient } from '../_shared/supabase.ts';

/**
 * GradeUp Score Engine Edge Function (v2.0)
 *
 * Calculates the comprehensive GradeUp Score (0-1000) for athletes with:
 * - Athletic Score (0-400): Based on sport tier, athletic rating, deals, and ratings
 * - Social Score (0-300): Based on follower count with logarithmic scaling
 * - Academic Score (0-300): GPA-weighted with multipliers for excellence and consistency
 *
 * Supports:
 * - Single athlete calculation
 * - Batch calculations for multiple athletes
 * - Score breakdown retrieval
 * - Score history retrieval
 */

interface ScoreComponents {
  score: number;
  athletic_score: number;
  social_score: number;
  academic_score: number;
  gpa_multiplier: number;
  major_multiplier: number;
  consistency_bonus: number;
  breakdown: Record<string, unknown>;
}

interface BatchResult {
  athlete_id: string;
  score: number;
  success: boolean;
  error_message: string | null;
}

interface ScoreHistoryEntry {
  score: number;
  athletic_score: number;
  social_score: number;
  academic_score: number;
  calculated_at: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabase = createUserClient(authHeader);
    const adminClient = createAdminClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Parse request
    const url = new URL(req.url);
    const action = url.searchParams.get('action') || 'calculate';

    let body: Record<string, unknown> = {};
    if (req.method === 'POST') {
      body = await req.json();
    }

    // Route to appropriate handler
    switch (action) {
      case 'calculate':
        return await handleCalculate(adminClient, user.id, body);

      case 'batch':
        return await handleBatchCalculate(adminClient, body);

      case 'breakdown':
        return await handleGetBreakdown(adminClient, user.id, body);

      case 'history':
        return await handleGetHistory(adminClient, user.id, body);

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

/**
 * Calculate GradeUp Score for a single athlete
 */
async function handleCalculate(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  body: Record<string, unknown>
): Promise<Response> {
  let athleteId = body.athlete_id as string | undefined;

  // If no athlete_id provided, get current user's athlete profile
  if (!athleteId) {
    const { data: athlete } = await adminClient
      .from('athletes')
      .select('id')
      .eq('profile_id', userId)
      .single();

    if (!athlete) {
      throw new Error('athlete_id required or user must be an athlete');
    }
    athleteId = athlete.id;
  }

  // Call the database function to calculate score
  const { data: scoreResult, error: scoreError } = await adminClient
    .rpc('calculate_gradeup_score', { p_athlete_id: athleteId });

  if (scoreError) {
    throw new Error(`Score calculation failed: ${scoreError.message}`);
  }

  const result = scoreResult?.[0] as ScoreComponents;

  if (!result) {
    throw new Error('Score calculation returned no results');
  }

  // Get athlete info for response
  const { data: athlete } = await adminClient
    .from('athletes')
    .select(`
      id,
      gpa,
      cumulative_gpa,
      total_followers,
      deals_completed,
      avg_deal_rating,
      athletic_rating,
      grades_verified,
      enrollment_verified,
      sport_verified,
      profile:profiles!inner(first_name, last_name),
      school:schools(name, short_name),
      sport:sports(name),
      major_category:major_categories(name)
    `)
    .eq('id', athleteId)
    .single();

  return new Response(
    JSON.stringify({
      success: true,
      athlete_id: athleteId,
      athlete_name: athlete ? `${athlete.profile.first_name} ${athlete.profile.last_name}` : null,
      score: result.score,
      components: {
        athletic: {
          score: result.athletic_score,
          max: 400,
          percentage: Math.round((result.athletic_score / 400) * 100),
        },
        social: {
          score: result.social_score,
          max: 300,
          percentage: Math.round((result.social_score / 300) * 100),
        },
        academic: {
          score: result.academic_score,
          max: 300,
          percentage: Math.round((result.academic_score / 300) * 100),
        },
      },
      multipliers: {
        gpa: result.gpa_multiplier,
        major: result.major_multiplier,
        consistency: result.consistency_bonus,
      },
      breakdown: result.breakdown,
      athlete_info: athlete ? {
        school: athlete.school?.short_name || athlete.school?.name,
        sport: athlete.sport?.name,
        major_category: athlete.major_category?.name || 'General Studies',
        gpa: athlete.cumulative_gpa || athlete.gpa,
        total_followers: athlete.total_followers,
        deals_completed: athlete.deals_completed,
        verified: {
          grades: athlete.grades_verified,
          enrollment: athlete.enrollment_verified,
          sport: athlete.sport_verified,
        },
      } : null,
      grade: getScoreGrade(result.score),
      calculated_at: new Date().toISOString(),
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

/**
 * Batch calculate scores for multiple athletes
 */
async function handleBatchCalculate(
  adminClient: ReturnType<typeof createAdminClient>,
  body: Record<string, unknown>
): Promise<Response> {
  const athleteIds = body.athlete_ids as string[] | undefined;

  if (!athleteIds || !Array.isArray(athleteIds) || athleteIds.length === 0) {
    throw new Error('athlete_ids array is required');
  }

  if (athleteIds.length > 100) {
    throw new Error('Maximum 100 athletes per batch');
  }

  // Call batch calculation function
  const { data: results, error: batchError } = await adminClient
    .rpc('batch_calculate_gradeup_scores', { p_athlete_ids: athleteIds });

  if (batchError) {
    throw new Error(`Batch calculation failed: ${batchError.message}`);
  }

  const batchResults = results as BatchResult[];

  const successful = batchResults.filter(r => r.success);
  const failed = batchResults.filter(r => !r.success);

  return new Response(
    JSON.stringify({
      success: true,
      total: athleteIds.length,
      successful: successful.length,
      failed: failed.length,
      results: batchResults.map(r => ({
        athlete_id: r.athlete_id,
        score: r.score,
        success: r.success,
        error: r.error_message,
        grade: r.success ? getScoreGrade(r.score) : null,
      })),
      calculated_at: new Date().toISOString(),
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

/**
 * Get detailed score breakdown for an athlete
 */
async function handleGetBreakdown(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  body: Record<string, unknown>
): Promise<Response> {
  let athleteId = body.athlete_id as string | undefined;

  // If no athlete_id provided, get current user's athlete profile
  if (!athleteId) {
    const { data: athlete } = await adminClient
      .from('athletes')
      .select('id')
      .eq('profile_id', userId)
      .single();

    if (!athlete) {
      throw new Error('athlete_id required or user must be an athlete');
    }
    athleteId = athlete.id;
  }

  // Get the breakdown from database function
  const { data: breakdown, error: breakdownError } = await adminClient
    .rpc('get_score_breakdown', { p_athlete_id: athleteId });

  if (breakdownError) {
    throw new Error(`Failed to get breakdown: ${breakdownError.message}`);
  }

  // Get current score
  const { data: athlete } = await adminClient
    .from('athletes')
    .select('gradeup_score')
    .eq('id', athleteId)
    .single();

  return new Response(
    JSON.stringify({
      success: true,
      athlete_id: athleteId,
      current_score: athlete?.gradeup_score || 0,
      breakdown: breakdown || {},
      grade: getScoreGrade(athlete?.gradeup_score || 0),
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

/**
 * Get score history for an athlete
 */
async function handleGetHistory(
  adminClient: ReturnType<typeof createAdminClient>,
  userId: string,
  body: Record<string, unknown>
): Promise<Response> {
  let athleteId = body.athlete_id as string | undefined;
  const limit = Math.min(body.limit as number || 10, 50);

  // If no athlete_id provided, get current user's athlete profile
  if (!athleteId) {
    const { data: athlete } = await adminClient
      .from('athletes')
      .select('id')
      .eq('profile_id', userId)
      .single();

    if (!athlete) {
      throw new Error('athlete_id required or user must be an athlete');
    }
    athleteId = athlete.id;
  }

  // Get history from database function
  const { data: history, error: historyError } = await adminClient
    .rpc('get_score_history', { p_athlete_id: athleteId, p_limit: limit });

  if (historyError) {
    throw new Error(`Failed to get history: ${historyError.message}`);
  }

  const historyEntries = history as ScoreHistoryEntry[];

  // Calculate trend
  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (historyEntries.length >= 2) {
    const diff = historyEntries[0].score - historyEntries[1].score;
    if (diff > 10) trend = 'up';
    else if (diff < -10) trend = 'down';
  }

  // Calculate statistics
  const scores = historyEntries.map(h => h.score);
  const stats = scores.length > 0 ? {
    current: scores[0],
    highest: Math.max(...scores),
    lowest: Math.min(...scores),
    average: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  } : null;

  return new Response(
    JSON.stringify({
      success: true,
      athlete_id: athleteId,
      history: historyEntries.map(entry => ({
        ...entry,
        grade: getScoreGrade(entry.score),
      })),
      trend,
      statistics: stats,
      count: historyEntries.length,
    }),
    {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    }
  );
}

/**
 * Convert numeric score to letter grade
 */
function getScoreGrade(score: number): { letter: string; label: string; color: string } {
  if (score >= 900) return { letter: 'S', label: 'Elite', color: '#FFD700' };
  if (score >= 800) return { letter: 'A+', label: 'Exceptional', color: '#00C853' };
  if (score >= 700) return { letter: 'A', label: 'Excellent', color: '#00E676' };
  if (score >= 600) return { letter: 'B+', label: 'Very Good', color: '#76FF03' };
  if (score >= 500) return { letter: 'B', label: 'Good', color: '#C6FF00' };
  if (score >= 400) return { letter: 'C+', label: 'Above Average', color: '#FFEB3B' };
  if (score >= 300) return { letter: 'C', label: 'Average', color: '#FFC107' };
  if (score >= 200) return { letter: 'D', label: 'Below Average', color: '#FF9800' };
  return { letter: 'F', label: 'Needs Improvement', color: '#FF5722' };
}
