import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { headers } from 'next/headers';
import * as crypto from 'crypto';

/**
 * Session type for API responses
 */
export interface UserSession {
  id: string;
  device: string;
  browser: string;
  location: string;
  lastActive: string;
  current: boolean;
}

/**
 * Parse user agent string to extract device and browser information
 */
function parseUserAgent(userAgent: string | null): { device: string; browser: string; os: string } {
  if (!userAgent) {
    return { device: 'Unknown Device', browser: 'Unknown', os: 'Unknown' };
  }

  // Detect browser
  let browser = 'Unknown';
  let browserVersion = '';

  if (userAgent.includes('Firefox/')) {
    browser = 'Firefox';
    browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || '';
  } else if (userAgent.includes('Edg/')) {
    browser = 'Edge';
    browserVersion = userAgent.match(/Edg\/(\d+)/)?.[1] || '';
  } else if (userAgent.includes('Chrome/')) {
    browser = 'Chrome';
    browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || '';
  } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
    browser = 'Safari';
    browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || '';
  } else if (userAgent.includes('Opera') || userAgent.includes('OPR/')) {
    browser = 'Opera';
    browserVersion = userAgent.match(/(?:Opera|OPR)\/(\d+)/)?.[1] || '';
  }

  if (browserVersion) {
    browser = `${browser} ${browserVersion}`;
  }

  // Detect OS and device
  let device = 'Unknown Device';
  let os = 'Unknown';

  if (userAgent.includes('iPhone')) {
    device = 'iPhone';
    os = 'iOS';
  } else if (userAgent.includes('iPad')) {
    device = 'iPad';
    os = 'iPadOS';
  } else if (userAgent.includes('Android')) {
    // Try to extract device model
    const androidDevice = userAgent.match(/Android[^;]*;\s*([^)]+)\)/)?.[1];
    device = androidDevice ? androidDevice.split(' Build')[0].trim() : 'Android Device';
    os = 'Android';
  } else if (userAgent.includes('Macintosh') || userAgent.includes('Mac OS X')) {
    device = 'Mac';
    os = 'macOS';
  } else if (userAgent.includes('Windows')) {
    device = 'Windows PC';
    os = 'Windows';
  } else if (userAgent.includes('Linux')) {
    device = 'Linux PC';
    os = 'Linux';
  }

  return { device, browser, os };
}

/**
 * Hash a refresh token for storage/comparison
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * GET /api/auth/sessions
 *
 * Returns a list of active sessions for the current user.
 * The current session is identified by matching the refresh token hash.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current session to identify which one is "current"
    const { data: { session } } = await supabase.auth.getSession();
    const currentTokenHash = session?.refresh_token
      ? hashToken(session.refresh_token)
      : null;

    // Fetch user's active sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .order('last_active_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching sessions:', sessionsError);
      return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
    }

    // Transform to API response format
    const formattedSessions: UserSession[] = (sessions || []).map((s) => ({
      id: s.id,
      device: s.device_name || 'Unknown Device',
      browser: s.browser || 'Unknown Browser',
      location: s.location_display || 'Unknown Location',
      lastActive: s.last_active_at,
      current: currentTokenHash ? s.refresh_token_hash === currentTokenHash : false,
    }));

    return NextResponse.json({ sessions: formattedSessions });
  } catch (error) {
    console.error('Error in GET /api/auth/sessions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/auth/sessions
 *
 * Creates or updates a session record for the current user.
 * Called after login to track the new session.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get request headers for device info
    const headersList = await headers();
    const userAgent = headersList.get('user-agent');
    const forwardedFor = headersList.get('x-forwarded-for');
    const realIp = headersList.get('x-real-ip');

    // Parse user agent
    const { device, browser, os } = parseUserAgent(userAgent);

    // Get IP address
    const ipAddress = forwardedFor?.split(',')[0]?.trim() || realIp || null;

    // Get current session for refresh token hash
    const { data: { session } } = await supabase.auth.getSession();
    const tokenHash = session?.refresh_token
      ? hashToken(session.refresh_token)
      : null;

    // Get location info from request body if provided (frontend can call a geolocation API)
    let locationInfo: { city: string | null; region: string | null; country: string | null } = {
      city: null,
      region: null,
      country: null,
    };
    try {
      const body = await request.json();
      locationInfo = {
        city: body.city || null,
        region: body.region || null,
        country: body.country || null,
      };
    } catch {
      // No body provided, that's fine
    }

    // Build location display
    let locationDisplay: string | null = null;
    if (locationInfo.city) {
      locationDisplay = locationInfo.city;
      if (locationInfo.country) {
        locationDisplay += `, ${locationInfo.country}`;
      }
    } else if (locationInfo.country) {
      locationDisplay = locationInfo.country;
    }

    // Insert new session
    const { data: newSession, error: insertError } = await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        device_name: device,
        browser: browser,
        operating_system: os,
        ip_address: ipAddress,
        city: locationInfo.city,
        region: locationInfo.region,
        country: locationInfo.country,
        location_display: locationDisplay,
        user_agent: userAgent,
        refresh_token_hash: tokenHash,
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating session:', insertError);
      return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
    }

    return NextResponse.json({
      session: {
        id: newSession.id,
        device: newSession.device_name,
        browser: newSession.browser,
        location: newSession.location_display || 'Unknown Location',
        lastActive: newSession.last_active_at,
        current: true,
      },
    }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/auth/sessions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/sessions
 *
 * Revokes all sessions except the current one.
 * Used for "Sign out all other devices" functionality.
 */
export async function DELETE() {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current session to exclude it from revocation
    const { data: { session } } = await supabase.auth.getSession();
    const currentTokenHash = session?.refresh_token
      ? hashToken(session.refresh_token)
      : null;

    // Revoke all sessions except current
    const { error: revokeError, count } = await supabase
      .from('user_sessions')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
      })
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .neq('refresh_token_hash', currentTokenHash || '');

    if (revokeError) {
      console.error('Error revoking sessions:', revokeError);
      return NextResponse.json({ error: 'Failed to revoke sessions' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'All other sessions revoked',
      revokedCount: count || 0,
    });
  } catch (error) {
    console.error('Error in DELETE /api/auth/sessions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
