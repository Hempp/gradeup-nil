/**
 * /api/hs/mentors/profile
 *
 * GET   — returns the caller's mentor profile (or 404 if none).
 * POST  — creates the caller's mentor profile. Eligibility enforced by
 *         service + DB trigger (transition must be verified).
 * PATCH — updates the caller's mentor profile.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import {
  createMentorProfile,
  updateMentorProfile,
  getMentorProfileByUserId,
  type NcaaDivision,
  type MentorAvailability,
} from '@/lib/hs-nil/mentors';

const profileFieldsShape = {
  collegeName: z.string().trim().min(2).max(200),
  collegeState: z
    .string()
    .length(2)
    .regex(/^[A-Za-z]{2}$/),
  ncaaDivision: z.enum(['D1', 'D2', 'D3', 'NAIA', 'JUCO', 'other']),
  currentSport: z.string().trim().min(1).max(80),
  bio: z.string().trim().min(1).max(2000),
  availability: z.enum(['weekly', 'biweekly', 'monthly', 'paused']),
  specialties: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  acceptsMessageOnly: z.boolean(),
  acceptsVideoCall: z.boolean(),
  hourlyRateCents: z.number().int().min(0).nullable(),
  visibleToHs: z.boolean().optional(),
};

const createSchema = z.object(profileFieldsShape).strict();

// PATCH uses the same shape but every field is optional.
const updateSchema = z
  .object({
    collegeName: profileFieldsShape.collegeName.optional(),
    collegeState: profileFieldsShape.collegeState.optional(),
    ncaaDivision: profileFieldsShape.ncaaDivision.optional(),
    currentSport: profileFieldsShape.currentSport.optional(),
    bio: profileFieldsShape.bio.optional(),
    availability: profileFieldsShape.availability.optional(),
    specialties: profileFieldsShape.specialties.optional(),
    acceptsMessageOnly: profileFieldsShape.acceptsMessageOnly.optional(),
    acceptsVideoCall: profileFieldsShape.acceptsVideoCall.optional(),
    hourlyRateCents: profileFieldsShape.hourlyRateCents.optional(),
    visibleToHs: z.boolean().optional(),
  })
  .strict();

function mapCodeToStatus(
  code: 'not_eligible' | 'conflict' | 'invalid_state' | 'db_error' | 'not_found' | 'forbidden' | 'internal'
): number {
  switch (code) {
    case 'not_eligible':
      return 403;
    case 'forbidden':
      return 403;
    case 'conflict':
      return 409;
    case 'not_found':
      return 404;
    case 'invalid_state':
      return 400;
    default:
      return 500;
  }
}

export async function GET() {
  if (!isFeatureEnabled('HS_NIL')) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const profile = await getMentorProfileByUserId(user.id);
  if (!profile) {
    return NextResponse.json({ profile: null }, { status: 200 });
  }
  return NextResponse.json({ profile }, { status: 200 });
}

export async function POST(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const v = validateInput(createSchema, body);
    if (!v.success) {
      return NextResponse.json(
        { error: formatValidationError(v.errors), code: 'invalid_body' },
        { status: 400 }
      );
    }

    const result = await createMentorProfile({
      userId: user.id,
      fields: {
        collegeName: v.data.collegeName,
        collegeState: v.data.collegeState,
        ncaaDivision: v.data.ncaaDivision as NcaaDivision,
        currentSport: v.data.currentSport,
        bio: v.data.bio,
        availability: v.data.availability as MentorAvailability,
        specialties: v.data.specialties ?? [],
        acceptsMessageOnly: v.data.acceptsMessageOnly,
        acceptsVideoCall: v.data.acceptsVideoCall,
        hourlyRateCents: v.data.hourlyRateCents,
        visibleToHs: v.data.visibleToHs,
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: mapCodeToStatus(result.code) }
      );
    }
    return NextResponse.json({ ok: true, profile: result.data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs/mentors/profile POST]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!isFeatureEnabled('HS_NIL')) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rateLimited = await enforceRateLimit(request, 'mutation', user.id);
    if (rateLimited) return rateLimited;

    const body = await request.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    const v = validateInput(updateSchema, body);
    if (!v.success) {
      return NextResponse.json(
        { error: formatValidationError(v.errors), code: 'invalid_body' },
        { status: 400 }
      );
    }

    const result = await updateMentorProfile(user.id, {
      collegeName: v.data.collegeName,
      collegeState: v.data.collegeState,
      ncaaDivision: v.data.ncaaDivision as NcaaDivision | undefined,
      currentSport: v.data.currentSport,
      bio: v.data.bio,
      availability: v.data.availability as MentorAvailability | undefined,
      specialties: v.data.specialties,
      acceptsMessageOnly: v.data.acceptsMessageOnly,
      acceptsVideoCall: v.data.acceptsVideoCall,
      hourlyRateCents: v.data.hourlyRateCents,
      visibleToHs: v.data.visibleToHs,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        { status: mapCodeToStatus(result.code) }
      );
    }
    return NextResponse.json({ ok: true, profile: result.data }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs/mentors/profile PATCH]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
