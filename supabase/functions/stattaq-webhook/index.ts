import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders } from '../_shared/cors.ts';
import { createAdminClient } from '../_shared/supabase.ts';

const STATTAQ_WEBHOOK_SECRET = Deno.env.get('STATTAQ_WEBHOOK_SECRET') || '';

interface WebhookPayload {
  id: string;
  event_type: string;
  created_at: string;
  data: {
    stattaq_user_id: string;
    stattaq_athlete_id?: string;
    changes?: Record<string, unknown>;
  };
}

// Verify webhook signature (HMAC-SHA256)
async function verifySignature(payload: string, signature: string): Promise<boolean> {
  if (!STATTAQ_WEBHOOK_SECRET) {
    console.warn('STATTAQ_WEBHOOK_SECRET not configured');
    return true; // Skip verification in development
  }

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(STATTAQ_WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signatureBuffer = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
  const payloadBuffer = encoder.encode(payload);

  return await crypto.subtle.verify('HMAC', key, signatureBuffer, payloadBuffer);
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

    const rawPayload = await req.text();
    const signature = req.headers.get('X-StatTaq-Signature') || '';

    // Verify webhook signature
    const isValid = await verifySignature(rawPayload, signature);
    if (!isValid) {
      throw new Error('Invalid webhook signature');
    }

    const payload: WebhookPayload = JSON.parse(rawPayload);
    const adminClient = createAdminClient();

    // Store webhook for processing
    const { data: webhook, error: webhookError } = await adminClient
      .from('stattaq_webhooks')
      .insert({
        webhook_id: payload.id,
        event_type: payload.event_type,
        payload: payload,
        signature: signature,
        stattaq_user_id: payload.data.stattaq_user_id,
      })
      .select()
      .single();

    if (webhookError) {
      throw webhookError;
    }

    // Find linked athlete
    const { data: stattaqAccount } = await adminClient
      .from('stattaq_accounts')
      .select('id, athlete_id')
      .eq('stattaq_user_id', payload.data.stattaq_user_id)
      .eq('is_active', true)
      .single();

    if (stattaqAccount) {
      // Update webhook with athlete reference
      await adminClient
        .from('stattaq_webhooks')
        .update({ athlete_id: stattaqAccount.athlete_id })
        .eq('id', webhook.id);

      // Process based on event type
      switch (payload.event_type) {
        case 'social.updated':
        case 'stats.updated':
        case 'nil.changed':
          // Trigger sync for this athlete
          await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/stattaq-sync`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
              'Content-Type': 'application/json',
              'X-Internal-Call': 'true',
            },
            body: JSON.stringify({
              athlete_id: stattaqAccount.athlete_id,
              sync_type: payload.event_type.split('.')[0], // 'social', 'stats', 'nil'
            }),
          });
          break;

        case 'account.disconnected':
          // User disconnected from StatTaq side
          await adminClient
            .from('stattaq_accounts')
            .update({
              is_active: false,
              sync_enabled: false,
              disconnected_at: new Date().toISOString(),
            })
            .eq('id', stattaqAccount.id);

          // Notify athlete
          const { data: athlete } = await adminClient
            .from('athletes')
            .select('profile_id')
            .eq('id', stattaqAccount.athlete_id)
            .single();

          if (athlete) {
            await adminClient.from('notifications').insert({
              user_id: athlete.profile_id,
              type: 'system',
              title: 'StatTaq Disconnected',
              body: 'Your StatTaq account has been disconnected. Reconnect to continue syncing your data.',
              action_url: '/settings/connections',
              action_label: 'Reconnect',
            });
          }
          break;

        default:
          console.log(`Unhandled event type: ${payload.event_type}`);
      }

      // Mark as processed
      await adminClient
        .from('stattaq_webhooks')
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq('id', webhook.id);
    }

    // Return success to StatTaq
    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);

    // Still return 200 to prevent retries for invalid webhooks
    // Log the error for investigation
    return new Response(
      JSON.stringify({ received: true, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  }
});
