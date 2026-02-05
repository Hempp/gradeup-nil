import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createUserClient } from '../_shared/supabase.ts';

// StatTaq OAuth configuration
const STATTAQ_AUTH_URL = Deno.env.get('STATTAQ_AUTH_URL') || 'https://api.stattaq.com/oauth/authorize';
const STATTAQ_CLIENT_ID = Deno.env.get('STATTAQ_CLIENT_ID') || '';
const CALLBACK_URL = Deno.env.get('STATTAQ_CALLBACK_URL') || '';

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

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // Verify user is an athlete
    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id')
      .eq('profile_id', user.id)
      .single();

    if (athleteError || !athlete) {
      throw new Error('Only athletes can connect StatTaq accounts');
    }

    // Check if already connected
    const { data: existingConnection } = await supabase
      .from('stattaq_accounts')
      .select('id, is_active')
      .eq('athlete_id', athlete.id)
      .single();

    if (existingConnection?.is_active) {
      throw new Error('StatTaq account already connected. Disconnect first to reconnect.');
    }

    // Generate state parameter for CSRF protection
    const state = crypto.randomUUID();

    // Store state in session for verification (using Supabase realtime or cache)
    // In production, store in Redis or similar with TTL

    // Build OAuth authorization URL
    const scopes = [
      'profile.read',
      'social.read',
      'stats.read',
      'nil.read',
    ].join(' ');

    const authUrl = new URL(STATTAQ_AUTH_URL);
    authUrl.searchParams.set('client_id', STATTAQ_CLIENT_ID);
    authUrl.searchParams.set('redirect_uri', CALLBACK_URL);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes);
    authUrl.searchParams.set('state', state);
    // Pass athlete ID so callback knows who to link
    authUrl.searchParams.set('athlete_id', athlete.id);

    return new Response(
      JSON.stringify({
        success: true,
        auth_url: authUrl.toString(),
        state: state, // Frontend stores this to verify callback
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
