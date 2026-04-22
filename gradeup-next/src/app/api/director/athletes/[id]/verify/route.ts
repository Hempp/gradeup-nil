/**
 * Athlete Verification Flag API
 * PATCH /api/director/athletes/[id]/verify
 *
 * Allows an athletic director to flip the enrollment / sport / grades / identity
 * verified flags on an athlete they are responsible for (scoped by school_id).
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const verifyBodySchema = z.object({
  flag: z.enum(['enrollment', 'sport', 'grades', 'identity']),
  value: z.boolean(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized. Please log in.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles').select('role').eq('id', user.id).single();
    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }
    if (profile.role !== 'athletic_director' && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only athletic directors can update verification flags' }, { status: 403 });
    }

    const { data: director, error: directorError } = await supabase
      .from('athletic_directors').select('school_id').eq('profile_id', user.id).single();
    if (directorError || !director) {
      return NextResponse.json({ error: 'Athletic director profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = verifyBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      );
    }

    const { flag, value } = validation.data;
    const { id: athleteId } = await params;
    const columnName = `${flag}_verified`;

    const { data: updated, error: updateError } = await supabase
      .from('athletes')
      .update({ [columnName]: value })
      .eq('id', athleteId)
      .eq('school_id', director.school_id)
      .select(columnName)
      .single();

    if (updateError) {
      console.error('Verify update error:', updateError);
      return NextResponse.json({ error: 'Failed to update verification flag' }, { status: 500 });
    }
    if (!updated) {
      return NextResponse.json({ error: 'Athlete not found or not associated with your school' }, { status: 404 });
    }

    return NextResponse.json({ success: true, updated: { [columnName]: value } });
  } catch (error) {
    console.error('Verify route error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
