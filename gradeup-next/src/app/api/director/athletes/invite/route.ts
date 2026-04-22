/**
 * Single Athlete Invite API Endpoint
 *
 * POST /api/director/athletes/invite
 *
 * Allows athletic directors to invite a single athlete by email.
 * Supabase sends a confirmation email automatically via signUp.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';
import { academicYearEnum } from '@/lib/validations';

const inviteAthleteSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  sport: z.string().max(100).optional(),
  academicYear: academicYearEnum.optional(),
  gpa: z.number().min(0).max(4.0).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  let newProfileId: string | null = null;

  try {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { success: false, error: 'User profile not found.' },
        { status: 404 }
      );
    }

    if (profile.role !== 'athletic_director' && profile.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Only athletic directors can invite athletes.' },
        { status: 403 }
      );
    }

    const { data: director, error: directorError } = await supabase
      .from('athletic_directors')
      .select('school_id')
      .eq('profile_id', user.id)
      .single();

    if (directorError || !director) {
      return NextResponse.json(
        { success: false, error: 'Athletic director profile not found.' },
        { status: 404 }
      );
    }

    const schoolId = director.school_id;

    const body = await request.json();
    const validation = inviteAthleteSchema.safeParse(body);

    if (!validation.success) {
      const errors = validation.error.issues.map(i => i.message).join(', ');
      return NextResponse.json(
        { success: false, error: `Validation failed: ${errors}` },
        { status: 400 }
      );
    }

    const { email, firstName, lastName, sport, academicYear, gpa } = validation.data;

    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existingProfile) {
      return NextResponse.json(
        { success: false, error: 'An account with this email already exists.' },
        { status: 409 }
      );
    }

    let sportId: string | null = null;
    if (sport) {
      const { data: sportRecord } = await supabase
        .from('sports')
        .select('id')
        .ilike('name', sport)
        .maybeSingle();

      if (!sportRecord) {
        return NextResponse.json(
          { success: false, error: `Sport not found: "${sport}".` },
          { status: 400 }
        );
      }
      sportId = sportRecord.id;
    }

    const tempPassword = crypto.randomUUID() + crypto.randomUUID();

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: email.toLowerCase(),
      password: tempPassword,
      options: {
        data: {
          role: 'athlete',
          invited_by_director: true,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
        },
      },
    });

    if (signUpError || !signUpData.user) {
      return NextResponse.json(
        { success: false, error: signUpError?.message ?? 'Failed to create auth user.' },
        { status: 500 }
      );
    }

    const authUserId = signUpData.user.id;

    const { data: newProfile, error: profileCreateError } = await supabase
      .from('profiles')
      .insert({
        id: authUserId,
        email: email.toLowerCase(),
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        role: 'athlete',
        is_active: true,
      })
      .select('id')
      .single();

    if (profileCreateError) {
      return NextResponse.json(
        { success: false, error: 'Failed to create athlete profile.' },
        { status: 500 }
      );
    }

    newProfileId = newProfile.id;

    const athleteInsertData: Record<string, unknown> = {
      profile_id: newProfileId,
      school_id: schoolId,
      is_searchable: true,
      enrollment_verified: false,
      sport_verified: false,
      grades_verified: false,
    };

    if (sportId) athleteInsertData.sport_id = sportId;
    if (academicYear) athleteInsertData.academic_year = academicYear;
    if (gpa !== undefined) athleteInsertData.gpa = gpa;

    const { data: newAthlete, error: athleteCreateError } = await supabase
      .from('athletes')
      .insert(athleteInsertData)
      .select('id')
      .single();

    if (athleteCreateError) {
      await supabase.from('profiles').delete().eq('id', newProfileId);
      return NextResponse.json(
        { success: false, error: 'Failed to create athlete record.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, athleteId: newAthlete.id },
      { status: 201 }
    );

  } catch (error) {
    console.error('Invite athlete error:', error);
    if (newProfileId) {
      try {
        const supabase = await createClient();
        await supabase.from('profiles').delete().eq('id', newProfileId);
      } catch {
        // Ignore rollback errors
      }
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Internal server error.' },
      { status: 500 }
    );
  }
}
