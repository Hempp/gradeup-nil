import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createAdminClient, createUserClient } from '../_shared/supabase.ts';

const STATTAQ_API_URL = Deno.env.get('STATTAQ_API_URL') || 'https://api.stattaq.com/v1';
const STATTAQ_CLIENT_ID = Deno.env.get('STATTAQ_CLIENT_ID') || '';
const STATTAQ_CLIENT_SECRET = Deno.env.get('STATTAQ_CLIENT_SECRET') || '';

interface SyncRequest {
  athlete_id?: string;
  sync_type?: 'full' | 'social' | 'stats';
}

interface StatTaqSocialData {
  instagram: { followers: number; engagement_rate: number };
  twitter: { followers: number; engagement_rate: number };
  tiktok: { followers: number; engagement_rate: number };
  youtube?: { subscribers: number };
  total_reach: number;
}

interface StatTaqStatsData {
  games_played: number;
  games_started: number;
  season_stats: Record<string, unknown>;
  career_stats: Record<string, unknown>;
  awards: Array<{ name: string; year: number }>;
}

interface StatTaqNILData {
  estimated_value: number;
  ranking_national: number;
  ranking_sport: number;
  ranking_conference: number;
  media_mentions: number;
  content_engagement_score: number;
  brand_affinity_score: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    const adminClient = createAdminClient();

    // Check if internal call or authenticated user
    const isInternal = req.headers.get('X-Internal-Call') === 'true';
    let athleteId: string | undefined;

    if (isInternal) {
      const body: SyncRequest = await req.json();
      athleteId = body.athlete_id;
    } else {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('Missing authorization header');
      }

      const supabase = createUserClient(authHeader);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        throw new Error('Unauthorized');
      }

      // Get athlete ID for current user
      const { data: athlete } = await adminClient
        .from('athletes')
        .select('id')
        .eq('profile_id', user.id)
        .single();

      if (!athlete) {
        throw new Error('Athlete not found');
      }

      athleteId = athlete.id;
    }

    if (!athleteId) {
      throw new Error('athlete_id required');
    }

    // Get StatTaq connection
    const { data: stattaqAccount, error: accountError } = await adminClient
      .from('stattaq_accounts')
      .select('*')
      .eq('athlete_id', athleteId)
      .eq('is_active', true)
      .single();

    if (accountError || !stattaqAccount) {
      throw new Error('No active StatTaq connection found');
    }

    // Check if token needs refresh
    let accessToken = stattaqAccount.access_token;
    if (stattaqAccount.token_expires_at && new Date(stattaqAccount.token_expires_at) < new Date()) {
      // Refresh token
      const refreshResponse = await fetch(`${STATTAQ_API_URL}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: STATTAQ_CLIENT_ID,
          client_secret: STATTAQ_CLIENT_SECRET,
          refresh_token: stattaqAccount.refresh_token,
        }),
      });

      if (refreshResponse.ok) {
        const tokens = await refreshResponse.json();
        accessToken = tokens.access_token;

        // Update stored tokens
        await adminClient
          .from('stattaq_accounts')
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token || stattaqAccount.refresh_token,
            token_expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          })
          .eq('id', stattaqAccount.id);
      } else {
        throw new Error('Token refresh failed');
      }
    }

    // Create sync log entry
    const { data: syncLog } = await adminClient
      .from('stattaq_sync_log')
      .insert({
        athlete_id: athleteId,
        stattaq_account_id: stattaqAccount.id,
        sync_type: 'full',
        status: 'started',
      })
      .select()
      .single();

    let recordsFetched = 0;
    let recordsUpdated = 0;
    const syncData: Record<string, unknown> = {};

    try {
      // Fetch social metrics
      if (stattaqAccount.sync_social_metrics) {
        const socialResponse = await fetch(`${STATTAQ_API_URL}/athletes/${stattaqAccount.stattaq_athlete_id}/social`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (socialResponse.ok) {
          const social: StatTaqSocialData = await socialResponse.json();
          syncData.instagram_followers = social.instagram?.followers;
          syncData.instagram_engagement_rate = social.instagram?.engagement_rate;
          syncData.twitter_followers = social.twitter?.followers;
          syncData.twitter_engagement_rate = social.twitter?.engagement_rate;
          syncData.tiktok_followers = social.tiktok?.followers;
          syncData.tiktok_engagement_rate = social.tiktok?.engagement_rate;
          syncData.youtube_subscribers = social.youtube?.subscribers;
          syncData.total_social_reach = social.total_reach;
          recordsFetched++;
        }
      }

      // Fetch performance stats
      if (stattaqAccount.sync_performance_stats) {
        const statsResponse = await fetch(`${STATTAQ_API_URL}/athletes/${stattaqAccount.stattaq_athlete_id}/stats`, {
          headers: { 'Authorization': `Bearer ${accessToken}` },
        });

        if (statsResponse.ok) {
          const stats: StatTaqStatsData = await statsResponse.json();
          syncData.games_played = stats.games_played;
          syncData.games_started = stats.games_started;
          syncData.season_stats = stats.season_stats;
          syncData.career_stats = stats.career_stats;
          syncData.awards = stats.awards;
          recordsFetched++;
        }
      }

      // Fetch NIL metrics
      const nilResponse = await fetch(`${STATTAQ_API_URL}/athletes/${stattaqAccount.stattaq_athlete_id}/nil`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (nilResponse.ok) {
        const nil: StatTaqNILData = await nilResponse.json();
        syncData.estimated_nil_value = nil.estimated_value;
        syncData.nil_ranking_national = nil.ranking_national;
        syncData.nil_ranking_sport = nil.ranking_sport;
        syncData.nil_ranking_conference = nil.ranking_conference;
        syncData.media_mentions = nil.media_mentions;
        syncData.content_engagement_score = nil.content_engagement_score;
        syncData.brand_affinity_score = nil.brand_affinity_score;
        recordsFetched++;
      }

      // Upsert StatTaq data
      const { error: dataError } = await adminClient
        .from('stattaq_data')
        .upsert({
          athlete_id: athleteId,
          stattaq_account_id: stattaqAccount.id,
          ...syncData,
          data_timestamp: new Date().toISOString(),
          synced_at: new Date().toISOString(),
        }, {
          onConflict: 'athlete_id',
        });

      if (!dataError) {
        recordsUpdated++;
      }

      // Update last sync timestamp
      await adminClient
        .from('stattaq_accounts')
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_status: 'success',
          last_sync_error: null,
        })
        .eq('id', stattaqAccount.id);

      // Update sync log
      const duration = Date.now() - startTime;
      await adminClient
        .from('stattaq_sync_log')
        .update({
          status: 'success',
          records_fetched: recordsFetched,
          records_updated: recordsUpdated,
          duration_ms: duration,
        })
        .eq('id', syncLog?.id);

      return new Response(
        JSON.stringify({
          success: true,
          records_fetched: recordsFetched,
          records_updated: recordsUpdated,
          duration_ms: duration,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } catch (syncError) {
      // Update sync log with error
      await adminClient
        .from('stattaq_sync_log')
        .update({
          status: 'failed',
          error_message: syncError.message,
          duration_ms: Date.now() - startTime,
        })
        .eq('id', syncLog?.id);

      // Update account with error
      await adminClient
        .from('stattaq_accounts')
        .update({
          last_sync_status: 'failed',
          last_sync_error: syncError.message,
        })
        .eq('id', stattaqAccount.id);

      throw syncError;
    }
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
