import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createUserClient, createAdminClient } from '../_shared/supabase.ts';

interface ScoreComponents {
  gpa_score: number;        // 0-25 points
  social_score: number;     // 0-25 points
  experience_score: number; // 0-20 points
  rating_score: number;     // 0-15 points
  verification_bonus: number; // 0-15 points
  total_score: number;      // 0-100 points
}

// Calculate GradeUp Score (mirrors the database function)
function calculateGradeUpScore(
  gpa: number | null,
  totalFollowers: number,
  dealsCompleted: number,
  avgRating: number | null,
  enrollmentVerified: boolean,
  sportVerified: boolean,
  gradesVerified: boolean
): ScoreComponents {
  let gpaScore = 0;
  let socialScore = 0;
  let experienceScore = 0;
  let ratingScore = 0;
  let verificationBonus = 0;

  // GPA component (0-25 points)
  if (gpa !== null) {
    gpaScore = (gpa / 4.0) * 25;
  }

  // Social following component (0-25 points, logarithmic scale)
  if (totalFollowers > 0) {
    socialScore = Math.min(Math.log10(totalFollowers) / Math.log10(1000000) * 25, 25);
  }

  // Experience component (0-20 points)
  experienceScore = Math.min(dealsCompleted * 2, 20);

  // Rating component (0-15 points)
  if (avgRating !== null) {
    ratingScore = (avgRating / 5.0) * 15;
  }

  // Verification bonus (0-15 points)
  if (enrollmentVerified) verificationBonus += 5;
  if (sportVerified) verificationBonus += 5;
  if (gradesVerified) verificationBonus += 5;

  const totalScore = Math.round((gpaScore + socialScore + experienceScore + ratingScore + verificationBonus) * 100) / 100;

  return {
    gpa_score: Math.round(gpaScore * 100) / 100,
    social_score: Math.round(socialScore * 100) / 100,
    experience_score: Math.round(experienceScore * 100) / 100,
    rating_score: Math.round(ratingScore * 100) / 100,
    verification_bonus: Math.round(verificationBonus * 100) / 100,
    total_score: totalScore,
  };
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
    let athleteId = url.searchParams.get('athlete_id');

    if (req.method === 'POST') {
      const body = await req.json();
      athleteId = body.athlete_id;
    }

    // If no athlete_id provided, calculate for current user (if athlete)
    if (!athleteId) {
      const { data: athlete } = await adminClient
        .from('athletes')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (!athlete) {
        throw new Error('athlete_id required or user must be an athlete');
      }
      athleteId = athlete.id;
    }

    // Get athlete data
    const { data: athlete, error: athleteError } = await adminClient
      .from('athletes')
      .select(`
        id,
        gpa,
        total_followers,
        deals_completed,
        avg_deal_rating,
        enrollment_verified,
        sport_verified,
        grades_verified,
        gradeup_score
      `)
      .eq('id', athleteId)
      .single();

    if (athleteError || !athlete) {
      throw new Error('Athlete not found');
    }

    // Calculate score
    const scoreBreakdown = calculateGradeUpScore(
      athlete.gpa,
      athlete.total_followers || 0,
      athlete.deals_completed || 0,
      athlete.avg_deal_rating,
      athlete.enrollment_verified,
      athlete.sport_verified,
      athlete.grades_verified
    );

    // Update score in database if different
    if (Math.abs(scoreBreakdown.total_score - (athlete.gradeup_score || 0)) > 0.01) {
      await adminClient
        .from('athletes')
        .update({ gradeup_score: scoreBreakdown.total_score })
        .eq('id', athleteId);
    }

    return new Response(
      JSON.stringify({
        success: true,
        athlete_id: athleteId,
        score: scoreBreakdown.total_score,
        breakdown: scoreBreakdown,
        explanation: {
          gpa: `GPA (${athlete.gpa || 0}/4.0) = ${scoreBreakdown.gpa_score}/25 points`,
          social: `Social (${(athlete.total_followers || 0).toLocaleString()} followers) = ${scoreBreakdown.social_score}/25 points`,
          experience: `Experience (${athlete.deals_completed || 0} deals) = ${scoreBreakdown.experience_score}/20 points`,
          rating: `Rating (${athlete.avg_deal_rating || 0}/5.0) = ${scoreBreakdown.rating_score}/15 points`,
          verification: `Verification bonus = ${scoreBreakdown.verification_bonus}/15 points`,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
