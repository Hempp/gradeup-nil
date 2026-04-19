/**
 * POST /api/hs/athlete/transition/initiate
 *
 * Athlete-facing. Creates a pending `athlete_bracket_transitions` row.
 * Sends a best-effort confirmation email to the athlete and a queue
 * notification to ops. Neither email blocks the DB write.
 *
 * Eligibility checks live in the service layer (transitions.ts). The
 * route is the thin, auth-gated shell.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { enforceRateLimit } from '@/lib/rate-limit';
import { validateInput, formatValidationError } from '@/lib/validations';
import {
  initiateTransition,
  getTransitionById,
  type NcaaDivision,
} from '@/lib/hs-nil/transitions';
import {
  sendTransitionConfirmationToAthlete,
  sendTransitionToAdmin,
} from '@/lib/services/hs-nil/transition-emails';

const schema = z
  .object({
    collegeName: z.string().trim().min(2).max(200),
    collegeState: z
      .string()
      .length(2)
      .regex(/^[A-Za-z]{2}$/),
    ncaaDivision: z.enum(['D1', 'D2', 'D3', 'NAIA', 'JUCO', 'other']),
    matriculationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    sportContinued: z.boolean(),
  })
  .strict();

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
      return NextResponse.json(
        { error: 'Invalid JSON body' },
        { status: 400 }
      );
    }
    const v = validateInput(schema, body);
    if (!v.success) {
      return NextResponse.json(
        { error: formatValidationError(v.errors), code: 'invalid_body' },
        { status: 400 }
      );
    }

    const result = await initiateTransition({
      athleteUserId: user.id,
      collegeName: v.data.collegeName,
      collegeState: v.data.collegeState.toUpperCase(),
      ncaaDivision: v.data.ncaaDivision as NcaaDivision,
      matriculationDate: v.data.matriculationDate,
      sportContinued: v.data.sportContinued,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, code: result.code },
        {
          status:
            result.code === 'already_active'
              ? 409
              : result.code === 'not_eligible'
                ? 403
                : result.code === 'not_found'
                  ? 404
                  : 400,
        }
      );
    }

    // Fire-and-forget emails. We don't await in Promise.all to keep the
    // response fast, but we do need `user` metadata for the athlete copy.
    const athleteName = (user.user_metadata?.first_name as string) || undefined;
    const athleteEmail = user.email;
    if (athleteEmail) {
      void sendTransitionConfirmationToAthlete({
        athleteEmail,
        athleteName,
        collegeName: v.data.collegeName,
        matriculationDate: v.data.matriculationDate,
        needsProof: true,
      });
    }
    const row = await getTransitionById(result.data.transitionId);
    if (row) {
      void sendTransitionToAdmin({
        transitionId: row.id,
        athleteName,
        athleteEmail: athleteEmail ?? '',
        collegeName: row.college_name,
        collegeState: row.college_state,
        ncaaDivision: row.ncaa_division,
        matriculationDate: row.matriculation_date,
        sportContinued: row.sport_continued,
        proofSubmitted: Boolean(row.enrollment_proof_storage_path),
      });
    }

    return NextResponse.json(
      {
        ok: true,
        transitionId: result.data.transitionId,
        status: result.data.status,
      },
      { status: 201 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    // eslint-disable-next-line no-console
    console.error('[hs-athlete/transition/initiate]', message);
    return NextResponse.json(
      { error: message, code: 'internal' },
      { status: 500 }
    );
  }
}
