import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * GET /api/auth/sessions/[sessionId]
 *
 * Returns details for a specific session.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch the specific session
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (sessionError) {
      if (sessionError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      console.error('Error fetching session:', sessionError);
      return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
    }

    return NextResponse.json({
      session: {
        id: session.id,
        device: session.device_name || 'Unknown Device',
        browser: session.browser || 'Unknown Browser',
        browserVersion: session.browser_version,
        operatingSystem: session.operating_system,
        location: session.location_display || 'Unknown Location',
        city: session.city,
        region: session.region,
        country: session.country,
        ipAddress: session.ip_address,
        lastActive: session.last_active_at,
        createdAt: session.created_at,
        expiresAt: session.expires_at,
        revoked: session.revoked_at !== null,
        revokedAt: session.revoked_at,
      },
    });
  } catch (error) {
    console.error('Error in GET /api/auth/sessions/[sessionId]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/auth/sessions/[sessionId]
 *
 * Revokes a specific session by ID.
 * Users can only revoke their own sessions.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate session ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID format' }, { status: 400 });
    }

    // Check if the session exists and belongs to the user
    const { data: existingSession, error: fetchError } = await supabase
      .from('user_sessions')
      .select('id, user_id, revoked_at')
      .eq('id', sessionId)
      .single();

    if (fetchError) {
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      console.error('Error fetching session:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch session' }, { status: 500 });
    }

    // Verify ownership
    if (existingSession.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to revoke this session' },
        { status: 403 }
      );
    }

    // Check if already revoked
    if (existingSession.revoked_at !== null) {
      return NextResponse.json({ error: 'Session already revoked' }, { status: 400 });
    }

    // Revoke the session
    const { error: revokeError } = await supabase
      .from('user_sessions')
      .update({
        revoked_at: new Date().toISOString(),
        revoked_by: user.id,
      })
      .eq('id', sessionId)
      .eq('user_id', user.id);

    if (revokeError) {
      console.error('Error revoking session:', revokeError);
      return NextResponse.json({ error: 'Failed to revoke session' }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Session revoked successfully',
      sessionId,
    });
  } catch (error) {
    console.error('Error in DELETE /api/auth/sessions/[sessionId]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/auth/sessions/[sessionId]
 *
 * Updates session metadata (e.g., refresh last_active_at).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate session ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(sessionId)) {
      return NextResponse.json({ error: 'Invalid session ID format' }, { status: 400 });
    }

    // Parse request body
    let updates: { last_active_at?: string; location_display?: string } = {};
    try {
      const body = await request.json();
      if (body.refreshActivity) {
        updates.last_active_at = new Date().toISOString();
      }
      if (body.location) {
        updates.location_display = body.location;
      }
    } catch {
      // Default to refreshing activity if no body provided
      updates.last_active_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    // Update the session
    const { data: updatedSession, error: updateError } = await supabase
      .from('user_sessions')
      .update(updates)
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .is('revoked_at', null)
      .select()
      .single();

    if (updateError) {
      if (updateError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Session not found or already revoked' }, { status: 404 });
      }
      console.error('Error updating session:', updateError);
      return NextResponse.json({ error: 'Failed to update session' }, { status: 500 });
    }

    return NextResponse.json({
      session: {
        id: updatedSession.id,
        device: updatedSession.device_name || 'Unknown Device',
        browser: updatedSession.browser || 'Unknown Browser',
        location: updatedSession.location_display || 'Unknown Location',
        lastActive: updatedSession.last_active_at,
      },
    });
  } catch (error) {
    console.error('Error in PATCH /api/auth/sessions/[sessionId]:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
