import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createUserClient, createAdminClient } from '../_shared/supabase.ts';

interface CreateAthleteRequest {
  school_id: string;
  sport_id: string;
  major?: string;
  gpa?: number;
  academic_year?: string;
  expected_graduation?: string;
  position?: string;
  jersey_number?: string;
  height_inches?: number;
  weight_lbs?: number;
  hometown?: string;
  instagram_handle?: string;
  twitter_handle?: string;
  tiktok_handle?: string;
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

    // Check if user already has an athlete profile
    const { data: existingAthlete } = await adminClient
      .from('athletes')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (existingAthlete) {
      throw new Error('Athlete profile already exists');
    }

    // Get request body
    const body: CreateAthleteRequest = await req.json();

    // Validate required fields
    if (!body.school_id || !body.sport_id) {
      throw new Error('school_id and sport_id are required');
    }

    // Ensure profile exists and is athlete role
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      // Create profile if it doesn't exist
      await adminClient.from('profiles').insert({
        id: user.id,
        email: user.email,
        role: 'athlete',
        first_name: user.user_metadata?.first_name,
        last_name: user.user_metadata?.last_name,
      });
    } else if (profile.role !== 'athlete') {
      throw new Error('User is not registered as an athlete');
    }

    // Create athlete profile
    const { data: athlete, error: athleteError } = await adminClient
      .from('athletes')
      .insert({
        profile_id: user.id,
        school_id: body.school_id,
        sport_id: body.sport_id,
        major: body.major,
        gpa: body.gpa,
        academic_year: body.academic_year,
        expected_graduation: body.expected_graduation,
        position: body.position,
        jersey_number: body.jersey_number,
        height_inches: body.height_inches,
        weight_lbs: body.weight_lbs,
        hometown: body.hometown,
        instagram_handle: body.instagram_handle,
        twitter_handle: body.twitter_handle,
        tiktok_handle: body.tiktok_handle,
      })
      .select()
      .single();

    if (athleteError) {
      throw athleteError;
    }

    // Log activity
    await adminClient.from('activity_log').insert({
      user_id: user.id,
      action: 'athlete_profile_created',
      entity_type: 'athlete',
      entity_id: athlete.id,
    });

    return new Response(
      JSON.stringify({ success: true, athlete }),
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
