import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { sendPushNotification, sendBulkNotifications, broadcastNotification } from '@/lib/services/push-notifications';
import type { NotificationPayload } from '@/lib/services/push-notifications';

/**
 * POST /api/notifications/push
 * Send push notifications to one or more users
 *
 * Body:
 * - user_ids: string[] - Array of user IDs to notify (optional if broadcast is true)
 * - notification: NotificationPayload - The notification content
 * - broadcast: boolean - If true, send to all subscribed users (admin only)
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
    const { user_ids, notification, broadcast } = body as {
      user_ids?: string[];
      notification: NotificationPayload;
      broadcast?: boolean;
    };

    // Validate notification payload
    if (!notification || !notification.title || !notification.body) {
      return NextResponse.json(
        { error: 'Notification title and body are required' },
        { status: 400 }
      );
    }

    // Handle broadcast (admin only)
    if (broadcast) {
      // Check if user is admin (you may want to implement proper admin check)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Only administrators can broadcast notifications' },
          { status: 403 }
        );
      }

      const result = await broadcastNotification(notification);

      if (result.error) {
        return NextResponse.json({ error: result.error.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Broadcast sent',
        ...result.data,
      });
    }

    // Validate user_ids for targeted notifications
    if (!user_ids || user_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one user_id is required' },
        { status: 400 }
      );
    }

    // Send to single user
    if (user_ids.length === 1) {
      const result = await sendPushNotification(user_ids[0], {
        title: notification.title,
        body: notification.body,
        url: notification.url,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || 'Failed to send notification' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        sent: result.sent,
      });
    }

    // Send to multiple users
    const result = await sendBulkNotifications(user_ids, notification);

    if (result.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      ...result.data,
    });
  } catch (error) {
    console.error('[API] Push notification error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/notifications/push
 * Get push notification configuration (VAPID public key)
 */
export async function GET() {
  const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) {
    return NextResponse.json(
      { error: 'Push notifications not configured' },
      { status: 503 }
    );
  }

  return NextResponse.json({
    vapidPublicKey,
    supported: true,
  });
}
