import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateAthleteSchema, validateInput, formatValidationError } from '@/lib/validations';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Authenticated users get full athlete data
      const { data: athlete, error } = await supabase
        .from('athletes')
        .select(`
          *,
          profile:profiles(first_name, last_name, avatar_url, bio, email),
          school:schools(*),
          sport:sports(*)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json(athlete);
    } else {
      // Unauthenticated users get limited public fields only
      const { data: athlete, error } = await supabase
        .from('athletes')
        .select(`
          id,
          position,
          academic_year,
          is_searchable,
          nil_valuation,
          social_followers,
          profile:profiles(first_name, last_name, avatar_url),
          school:schools(id, name, logo_url, division),
          sport:sports(id, name, icon)
        `)
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      // Only return athletes who have enabled public visibility
      if (!athlete.is_searchable) {
        return NextResponse.json({ error: 'Athlete not found' }, { status: 404 });
      }

      return NextResponse.json(athlete);
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    const { id: _id, profile_id: _profileId, profile: _profile, school: _school, sport: _sport, ...rawUpdates } = body;

    // Validate input with Zod schema
    const validation = validateInput(updateAthleteSchema, rawUpdates);
    if (!validation.success) {
      return NextResponse.json(
        { error: formatValidationError(validation.errors) },
        { status: 400 }
      );
    }

    const updates = validation.data;

    const { data: athlete, error } = await supabase
      .from('athletes')
      .update(updates)
      .eq('id', id)
      .eq('profile_id', user.id)
      .select(`
        *,
        profile:profiles(first_name, last_name, avatar_url, bio),
        school:schools(*),
        sport:sports(*)
      `)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Athlete not found or not authorized' }, { status: 404 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(athlete);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('athletes')
      .delete()
      .eq('id', id)
      .eq('profile_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
