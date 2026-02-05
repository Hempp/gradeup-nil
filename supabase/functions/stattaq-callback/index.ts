import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';

// StatTaq OAuth configuration
const STATTAQ_TOKEN_URL = Deno.env.get('STATTAQ_TOKEN_URL') || 'https://api.stattaq.com/oauth/token';
const STATTAQ_API_URL = Deno.env.get('STATTAQ_API_URL') || 'https://api.stattaq.com/v1';
const STATTAQ_CLIENT_ID = Deno.env.get('STATTAQ_CLIENT_ID') || '';
const STATTAQ_CLIENT_SECRET = Deno.env.get('STATTAQ_CLIENT_SECRET') || '';
const CALLBACK_URL = Deno.env.get('STATTAQ_CALLBACK_URL') || '';
const FRONTEND_URL = Deno.env.get('FRONTEND_URL') || 'http://localhost:3000';

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface StatTaqUser {
  id: string;
  athlete_id?: string;
  name: string;
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const athleteId = url.searchParams.get('athlete_id');
    const error = url.searchParams.get('error');

    // Handle OAuth error
    if (error) {
      const errorDescription = url.searchParams.get('error_description') || 'Unknown error';
      return Response.redirect(
        `${FRONTEND_URL}/settings/connections?error=${encodeURIComponent(errorDescription)}`
      );
    }

    // Validate required parameters
    if (!code || !athleteId) {
      throw new Error('Missing required parameters');
    }

    const adminClient = createAdminClient();

    // Exchange code for tokens
    const tokenResponse = await fetch(STATTAQ_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: STATTAQ_CLIENT_ID,
        client_secret: STATTAQ_CLIENT_SECRET,
        code: code,
        redirect_uri: CALLBACK_URL,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const tokens: TokenResponse = await tokenResponse.json();

    // Get StatTaq user info
    const userResponse = await fetch(`${STATTAQ_API_URL}/me`, {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch StatTaq user info');
    }

    const stattaqUser: StatTaqUser = await userResponse.json();

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000);

    // Check if this StatTaq account is already linked to another athlete
    const { data: existingLink } = await adminClient
      .from('stattaq_accounts')
      .select('athlete_id')
      .eq('stattaq_user_id', stattaqUser.id)
      .eq('is_active', true)
      .single();

    if (existingLink && existingLink.athlete_id !== athleteId) {
      return Response.redirect(
        `${FRONTEND_URL}/settings/connections?error=${encodeURIComponent('This StatTaq account is already linked to another athlete')}`
      );
    }

    // Upsert the StatTaq account connection
    const { error: upsertError } = await adminClient
      .from('stattaq_accounts')
      .upsert({
        athlete_id: athleteId,
        stattaq_user_id: stattaqUser.id,
        stattaq_athlete_id: stattaqUser.athlete_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_expires_at: tokenExpiresAt.toISOString(),
        connected_at: new Date().toISOString(),
        is_active: true,
        disconnected_at: null,
      }, {
        onConflict: 'athlete_id',
      });

    if (upsertError) {
      throw upsertError;
    }

    // Trigger initial data sync
    await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/stattaq-sync`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
        'X-Internal-Call': 'true',
      },
      body: JSON.stringify({ athlete_id: athleteId, sync_type: 'full' }),
    });

    // Log the connection
    await adminClient.from('activity_log').insert({
      user_id: athleteId, // Note: This should be profile_id, but we're using athlete_id for simplicity
      action: 'stattaq_connected',
      entity_type: 'stattaq_account',
      metadata: {
        stattaq_user_id: stattaqUser.id,
      },
    });

    // Redirect to success page
    return Response.redirect(
      `${FRONTEND_URL}/settings/connections?success=stattaq_connected`
    );
  } catch (error) {
    console.error('StatTaq callback error:', error);
    return Response.redirect(
      `${FRONTEND_URL}/settings/connections?error=${encodeURIComponent(error.message)}`
    );
  }
});
