import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { removeSubscription } from '@/lib/services/push-notifications';

/**
 * POST /api/notifications/push/unsubscribe
 * Unsubscribe a user from push notifications
 *
 * Body:
 * - endpoint: string - The push subscription endpoint to remove
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
    const { endpoint } = body as { endpoint: string };

    // Validate endpoint
    if (!endpoint) {
      return NextResponse.json(
        { error: 'Subscription endpoint is required' },
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

    // Remove subscription from database
    const result = await removeSubscription(user.id, endpoint);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to remove subscription' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully unsubscribed from push notifications',
    });
  } catch (error) {
    console.error('[API] Unsubscribe error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
