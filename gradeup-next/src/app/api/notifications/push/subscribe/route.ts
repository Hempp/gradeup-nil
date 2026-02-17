import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { saveSubscription } from '@/lib/services/push-notifications';
import type { PushSubscription } from '@/lib/services/push-notifications';

/**
 * POST /api/notifications/push/subscribe
 * Subscribe a user to push notifications
 *
 * Body:
 * - endpoint: string - The push subscription endpoint
 * - keys: { p256dh: string, auth: string } - The subscription keys
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { endpoint, keys } = body as PushSubscription;

    // Validate subscription data
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Subscription endpoint is required' },
        { status: 400 }
      );
    }

    if (!keys?.p256dh || !keys?.auth) {
      return NextResponse.json(
        { error: 'Subscription keys (p256dh and auth) are required' },
        { status: 400 }
      );
    }

    // Validate endpoint URL format
    try {
      new URL(endpoint);
    } catch {
      return NextResponse.json(
        { error: 'Invalid subscription endpoint URL' },
        { status: 400 }
      );
    }

    // Save subscription to database
    const result = await saveSubscription(user.id, {
      endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to save subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully subscribed to push notifications',
    });
  } catch (error) {
    console.error('[API] Subscribe error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
