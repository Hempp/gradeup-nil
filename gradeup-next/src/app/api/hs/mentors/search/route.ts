/**
 * GET /api/hs/mentors/search
 *
 * Athlete-facing browse endpoint. Default filters (sport + state) are
 * derived from the caller's hs_athlete_profile if the query params are
 * absent. Passing sport= or state= as empty strings widens the filter
 * for that dimension.
 *
 * Query params:
 *   sport         string  optional — empty string to clear
 *   state         2-letter optional — empty string to clear
 *   specialties   comma-separated optional
 *   page          int     default 1
 *   pageSize      int     default 12, max 50
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isFeatureEnabled } from '@/lib/feature-flags';
import { listMentorsForAthlete } from '@/lib/hs-nil/mentors';

export async function GET(request: NextRequest) {
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

  const { searchParams } = new URL(request.url);
  // An absent param = undefined (apply athlete-default). An empty-string
  // param = null (explicitly clear that filter).
  const sportRaw = searchParams.get('sport');
  const stateRaw = searchParams.get('state');
  const specialtiesRaw = searchParams.get('specialties');
  const pageRaw = searchParams.get('page');
  const pageSizeRaw = searchParams.get('pageSize');

  const sport =
    sportRaw === null ? undefined : sportRaw.trim().length === 0 ? null : sportRaw.trim();
  const state =
    stateRaw === null
      ? undefined
      : stateRaw.trim().length === 0
        ? null
        : stateRaw.trim().toUpperCase();
  const specialties = specialtiesRaw
    ? specialtiesRaw
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s.length > 0)
        .slice(0, 8)
    : undefined;

  const page = pageRaw ? Math.max(1, parseInt(pageRaw, 10) || 1) : 1;
  const pageSize = pageSizeRaw
    ? Math.min(50, Math.max(1, parseInt(pageSizeRaw, 10) || 12))
    : 12;

  const result = await listMentorsForAthlete({
    athleteUserId: user.id,
    filters: { sport, state, specialties: specialties ?? null },
    page,
    pageSize,
  });

  return NextResponse.json(result, { status: 200 });
}
