import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createUserClient, createAdminClient } from '../_shared/supabase.ts';

interface VerifyAthleteRequest {
  athlete_id: string;
  verification_type: 'enrollment' | 'sport' | 'grades' | 'identity';
  status: 'approved' | 'rejected';
  notes?: string;
  rejection_reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

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

    // Get request body
    const body: VerifyAthleteRequest = await req.json();

    // Validate required fields
    if (!body.athlete_id || !body.verification_type || !body.status) {
      throw new Error('athlete_id, verification_type, and status are required');
    }

    // Check if user is an athletic director
    const { data: ad, error: adError } = await adminClient
      .from('athletic_directors')
      .select('id, school_id, can_verify_enrollment, can_verify_sport, can_verify_grades')
      .eq('profile_id', user.id)
      .single();

    if (adError || !ad) {
      throw new Error('User is not an athletic director');
    }

    // Check permissions
    const permissionMap = {
      enrollment: ad.can_verify_enrollment,
      sport: ad.can_verify_sport,
      grades: ad.can_verify_grades,
      identity: false, // Identity verification requires admin
    };

    if (!permissionMap[body.verification_type]) {
      throw new Error(`You don't have permission to verify ${body.verification_type}`);
    }

    // Get athlete and verify they're at the AD's school
    const { data: athlete, error: athleteError } = await adminClient
      .from('athletes')
      .select('id, profile_id, school_id')
      .eq('id', body.athlete_id)
      .single();

    if (athleteError || !athlete) {
      throw new Error('Athlete not found');
    }

    if (athlete.school_id !== ad.school_id) {
      throw new Error('Athlete is not at your school');
    }

    // Update verification status
    const verificationField = `${body.verification_type}_verified`;
    const verificationTimeField = `${body.verification_type}_verified_at`;

    const updateData: Record<string, unknown> = {};

    if (body.status === 'approved') {
      updateData[verificationField] = true;
      updateData[verificationTimeField] = new Date().toISOString();
    } else {
      updateData[verificationField] = false;
      updateData[verificationTimeField] = null;
    }

    const { error: updateError } = await adminClient
      .from('athletes')
      .update(updateData)
      .eq('id', body.athlete_id);

    if (updateError) {
      throw updateError;
    }

    // Find and update any pending verification request
    const { data: verificationRequest } = await adminClient
      .from('verification_requests')
      .select('id')
      .eq('athlete_id', body.athlete_id)
      .eq('verification_type', body.verification_type)
      .eq('status', 'pending')
      .single();

    if (verificationRequest) {
      await adminClient
        .from('verification_requests')
        .update({
          status: body.status,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          review_notes: body.notes,
          rejection_reason: body.rejection_reason,
        })
        .eq('id', verificationRequest.id);
    }

    // Send notification to athlete
    const statusText = body.status === 'approved' ? 'approved' : 'needs attention';
    await adminClient.from('notifications').insert({
      user_id: athlete.profile_id,
      type: 'verification_update',
      title: `${body.verification_type.charAt(0).toUpperCase() + body.verification_type.slice(1)} Verification ${body.status === 'approved' ? 'Approved' : 'Update'}`,
      body: body.status === 'approved'
        ? `Your ${body.verification_type} has been verified!`
        : `Your ${body.verification_type} verification ${statusText}. ${body.rejection_reason || ''}`,
      related_type: 'athlete',
      related_id: athlete.id,
    });

    // Log activity
    await adminClient.from('activity_log').insert({
      user_id: user.id,
      action: `athlete_${body.verification_type}_${body.status}`,
      entity_type: 'athlete',
      entity_id: body.athlete_id,
      metadata: {
        verification_type: body.verification_type,
        status: body.status,
        notes: body.notes,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Athlete ${body.verification_type} verification ${body.status}`,
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
