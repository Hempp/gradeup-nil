/**
 * Athlete GPA Update API
 * PATCH /api/director/athletes/[id]/grades
 *
 * Allows an athletic director to update an athlete's GPA. The act of the
 * director updating grades implies verification, so grades_verified is set
 * to true on every successful update.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

const gradesBodySchema = z.object({
  gpa: z.number({ invalid_type_error: 'gpa must be a number' }).min(0.0).max(4.0),
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
      return NextResponse.json({ error: 'Only athletic directors can update athlete grades' }, { status: 403 });
    }

    const { data: director, error: directorError } = await supabase
      .from('athletic_directors').select('school_id').eq('profile_id', user.id).single();
    if (directorError || !director) {
      return NextResponse.json({ error: 'Athletic director profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const validation = gradesBodySchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validation.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })) },
        { status: 400 }
      );
    }

    const { gpa } = validation.data;
    const { id: athleteId } = await params;

    const { data: updated, error: updateError } = await supabase
      .from('athletes')
      .update({ gpa, grades_verified: true })
      .eq('id', athleteId)
      .eq('school_id', director.school_id)
      .select('gpa, grades_verified')
      .single();

    if (updateError) {
      console.error('Grades update error:', updateError);
      return NextResponse.json({ error: 'Failed to update GPA' }, { status: 500 });
    }
    if (!updated) {
      return NextResponse.json({ error: 'Athlete not found or not associated with your school' }, { status: 404 });
    }

    return NextResponse.json({ success: true, updated: { gpa: updated.gpa, grades_verified: updated.grades_verified } });
  } catch (error) {
    console.error('Grades route error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
