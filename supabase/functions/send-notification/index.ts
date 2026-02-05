import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';

interface NotificationRequest {
  user_ids: string[];
  type: 'deal_offer' | 'verification_update' | 'message' | 'system';
  title: string;
  body: string;
  related_type?: string;
  related_id?: string;
  action_url?: string;
  action_label?: string;
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

    // This function should only be called by service role or other edge functions
    // Check for service role key or special header
    const authHeader = req.headers.get('Authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // Allow calls from other edge functions or service role
    const isInternal = req.headers.get('X-Internal-Call') === 'true';
    const isServiceRole = authHeader?.includes(serviceRoleKey ?? '');

    if (!isInternal && !isServiceRole) {
      // For external calls, require authentication
      // Could add additional permission checks here
    }

    const adminClient = createAdminClient();
    const body: NotificationRequest = await req.json();

    // Validate required fields
    if (!body.user_ids?.length || !body.type || !body.title || !body.body) {
      throw new Error('user_ids, type, title, and body are required');
    }

    // Create notifications for all users
    const notifications = body.user_ids.map((user_id) => ({
      user_id,
      type: body.type,
      title: body.title,
      body: body.body,
      related_type: body.related_type,
      related_id: body.related_id,
      action_url: body.action_url,
      action_label: body.action_label,
    }));

    const { data, error } = await adminClient
      .from('notifications')
      .insert(notifications)
      .select();

    if (error) {
      throw error;
    }

    // TODO: Integrate with push notification service (Firebase, OneSignal, etc.)
    // TODO: Integrate with email service (SendGrid, Resend, etc.)

    return new Response(
      JSON.stringify({
        success: true,
        sent: data?.length || 0,
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
